import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "./env.js";
import { hashToken, newToken, verifyPin } from "./security.js";
import { pool, query } from "./db.js";
import type { Employee, Service } from "./types.js";

export const sessionCookieName = "etna_session";

export type SessionUser = Employee;

declare module "fastify" {
  interface FastifyRequest {
    user?: SessionUser;
  }
}

export function cookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
    domain: env.cookieDomain
  };
}

export async function audit(
  request: FastifyRequest,
  action: string,
  actorEmployeeId?: string,
  entityType?: string,
  entityId?: string,
  after?: unknown
): Promise<void> {
  await query(
    `
      INSERT INTO audit_log (
        actor_employee_id,
        action,
        entity_type,
        entity_id,
        after_json,
        ip_address,
        user_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `,
    [
      actorEmployeeId || null,
      action,
      entityType || null,
      entityId || null,
      after ? JSON.stringify(after) : null,
      request.ip,
      request.headers["user-agent"] || null
    ]
  );
}

export async function getServices(employeeId: string): Promise<Service[]> {
  const result = await query<Service>(
    `
      SELECT
        s.id,
        s.code,
        s.title,
        s.url,
        s.is_active,
        esa.can_view,
        esa.can_edit
      FROM services s
      JOIN employee_service_access esa ON esa.service_id = s.id
      WHERE esa.employee_id = $1
        AND esa.can_view = true
        AND s.is_active = true
      ORDER BY
        CASE s.code
          WHEN 'schedule' THEN 1
          WHEN 'shift_close' THEN 2
          WHEN 'tasks' THEN 3
          WHEN 'training' THEN 4
          WHEN 'requisition' THEN 5
          WHEN 'payroll' THEN 6
          WHEN 'admin' THEN 7
          ELSE 99
        END,
        s.title
    `,
    [employeeId]
  );
  const rows = result.rows;
  // Эти разделы доступны всем должностям: если сервис не выдан явно — добавляем его как просматриваемый.
  // training — база знаний; requisition — заявка (в т.ч. хозтовары всем).
  for (const code of ["training", "requisition"]) {
    if (rows.some((service) => service.code === code)) continue;
    const svc = await query<Service>(
      `SELECT id, code, title, url, is_active, true AS can_view, false AS can_edit
       FROM services WHERE code = $1 AND is_active = true LIMIT 1`,
      [code]
    );
    if (svc.rows[0]) {
      const idx = rows.findIndex((service) => ["payroll", "admin"].includes(service.code));
      if (idx === -1) rows.push(svc.rows[0]);
      else rows.splice(idx, 0, svc.rows[0]);
    }
  }

  // Руководителю: «Закрытие смены» не нужно (это для смены), вместо него — раздел «Финансы».
  const emp = await query<{ role: string }>("SELECT role FROM employees WHERE id = $1", [employeeId]);
  const role = emp.rows[0]?.role;
  if (role === "owner" || role === "manager") {
    const sc = rows.findIndex((service) => service.code === "shift_close");
    if (sc !== -1) rows.splice(sc, 1);
    if (!rows.some((service) => service.code === "finance")) {
      const finance: Service = {
        id: "finance",
        code: "finance",
        title: "Финансы",
        url: "/finance",
        is_active: true,
        can_view: true,
        can_edit: true
      };
      const idx = rows.findIndex((service) => ["requisition", "payroll", "admin"].includes(service.code));
      if (idx === -1) rows.push(finance);
      else rows.splice(idx, 0, finance);
    }
  }

  // Касса — планировщик cash-flow, строго для собственника.
  if (role === "owner" && !rows.some((service) => service.code === "treasury")) {
    const treasury: Service = {
      id: "treasury",
      code: "treasury",
      title: "Касса",
      url: "/treasury",
      is_active: true,
      can_view: true,
      can_edit: true
    };
    const idx = rows.findIndex((service) => ["payroll", "admin"].includes(service.code));
    if (idx === -1) rows.push(treasury);
    else rows.splice(idx, 0, treasury);
  }
  return rows;
}

export async function authenticateRequest(request: FastifyRequest): Promise<SessionUser | undefined> {
  const token = request.cookies[sessionCookieName];
  if (!token) return undefined;

  const tokenHash = hashToken(token);
  const result = await query<SessionUser>(
    `
      SELECT e.id, e.display_name, e.role, e.is_active
      FROM sessions s
      JOIN employees e ON e.id = s.employee_id
      WHERE s.token_hash = $1
        AND s.expires_at > now()
        AND e.is_active = true
      LIMIT 1
    `,
    [tokenHash]
  );

  const user = result.rows[0];
  if (!user) return undefined;

  await query("UPDATE sessions SET last_seen_at = now() WHERE token_hash = $1", [tokenHash]);
  request.user = user;
  return user;
}

export async function requireUser(request: FastifyRequest, reply: FastifyReply): Promise<SessionUser | undefined> {
  const user = await authenticateRequest(request);
  if (!user) {
    await reply.code(401).send({ error: "unauthorized" });
    return undefined;
  }
  return user;
}

export async function createSession(
  request: FastifyRequest,
  reply: FastifyReply,
  employeeId: string
): Promise<void> {
  const token = newToken();
  const tokenHash = hashToken(token);
  const maxAgeSeconds = 60 * 60 * 24 * 30;

  await query(
    `
      INSERT INTO sessions (employee_id, token_hash, expires_at, ip_address, user_agent)
      VALUES ($1, $2, now() + interval '30 days', $3, $4)
    `,
    [employeeId, tokenHash, request.ip, request.headers["user-agent"] || null]
  );

  reply.setCookie(sessionCookieName, token, cookieOptions(maxAgeSeconds));
}

export async function destroySession(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = request.cookies[sessionCookieName];
  if (token) {
    await query("DELETE FROM sessions WHERE token_hash = $1", [hashToken(token)]);
  }
  reply.clearCookie(sessionCookieName, cookieOptions(0));
}

export async function assertLoginAllowed(request: FastifyRequest): Promise<boolean> {
  const key = `ip:${request.ip}`;
  const result = await query<{ locked_until: Date | null }>(
    "SELECT locked_until FROM login_attempts WHERE attempt_key = $1",
    [key]
  );
  const lockedUntil = result.rows[0]?.locked_until;
  return !(lockedUntil && lockedUntil.getTime() > Date.now());
}

export async function recordFailedLogin(request: FastifyRequest): Promise<void> {
  const key = `ip:${request.ip}`;
  await query(
    `
      INSERT INTO login_attempts (attempt_key, failed_attempts, locked_until, updated_at)
      VALUES ($1, 1, NULL, now())
      ON CONFLICT (attempt_key) DO UPDATE
      SET failed_attempts = login_attempts.failed_attempts + 1,
          locked_until = CASE
            WHEN login_attempts.failed_attempts + 1 >= 10
            THEN now() + interval '15 minutes'
            ELSE NULL
          END,
          updated_at = now()
    `,
    [key]
  );
}

export async function clearFailedLogins(request: FastifyRequest): Promise<void> {
  await query("DELETE FROM login_attempts WHERE attempt_key = $1", [`ip:${request.ip}`]);
}

export async function findEmployeeByPin(pin: string): Promise<Employee | undefined> {
  const authRows = await query<Employee & { pin_hash: string }>(
    `
      SELECT e.id, e.display_name, e.role, e.is_active, a.pin_hash
      FROM employee_auth a
      JOIN employees e ON e.id = a.employee_id
      WHERE e.is_active = true
        AND (a.locked_until IS NULL OR a.locked_until <= now())
      ORDER BY e.created_at
    `
  );

  for (const row of authRows.rows) {
    if (await verifyPin(row.pin_hash, pin)) {
      return {
        id: row.id,
        display_name: row.display_name,
        role: row.role,
        is_active: row.is_active
      };
    }
  }

  return undefined;
}

export async function deleteExpiredSessions(): Promise<void> {
  await pool.query("DELETE FROM sessions WHERE expires_at <= now()");
}
