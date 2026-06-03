import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { audit, requireUser, type SessionUser } from "./auth.js";
import { pool, query } from "./db.js";
import { hashPin, verifyPin } from "./security.js";

const roleSchema = z.enum(["owner", "manager", "cook", "bar", "waiter", "dishwasher", "other"]);
const scheduleRoleSchema = z.enum(["cook", "bar", "waiter", "dish", "dishwasher", "other"]);
const payModelSchema = z.enum(["hourly", "fixed"]);
const pinSchema = z.string().regex(/^\d{4}$/);

const serviceAccessSchema = z.object({
  code: z.string().min(1).max(60),
  canView: z.boolean(),
  canEdit: z.boolean()
});

const employeeBaseSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  role: roleSchema,
  isActive: z.boolean(),
  scheduleRole: scheduleRoleSchema.nullable(),
  defaultHours: z.number().min(0).max(24).nullable(),
  hourlyRate: z.number().int().min(0).max(100000).nullable(),
  payModel: payModelSchema.nullable(),
  isHookahMaster: z.boolean(),
  hookahRate: z.number().int().min(0).max(100000).nullable(),
  services: z.array(serviceAccessSchema).max(20)
});

const createEmployeeSchema = employeeBaseSchema.extend({
  pin: pinSchema
});

const updateEmployeeSchema = employeeBaseSchema.extend({
  pin: pinSchema.optional()
});

const employeeParamsSchema = z.object({
  id: z.string().uuid()
});

type ServiceRow = {
  id: string;
  code: string;
  title: string;
  url: string;
  is_active: boolean;
};

type EmployeeRow = {
  id: string;
  display_name: string;
  role: string;
  is_active: boolean;
  schedule_role: string | null;
  default_hours: string | null;
  hourly_rate: number | null;
  pay_model: string | null;
  is_hookah_master: boolean;
  hookah_rate: number;
  has_pin: boolean;
};

type AccessRow = {
  employee_id: string;
  service_id: string;
  code: string;
  can_view: boolean;
  can_edit: boolean;
};

const serviceOrderSql = `
  CASE code
    WHEN 'schedule' THEN 1
    WHEN 'shift_close' THEN 2
    WHEN 'tasks' THEN 3
    WHEN 'payroll' THEN 4
    WHEN 'admin' THEN 5
    ELSE 99
  END,
  title
`;

export function registerAdminRoutes(app: FastifyInstance): void {
  app.get("/api/admin/employees", async (request, reply) => {
    const user = await requireAdmin(request, reply);
    if (!user) return;

    return getAdminEmployees();
  });

  app.post("/api/admin/employees", async (request, reply) => {
    const user = await requireAdmin(request, reply);
    if (!user) return;

    const parsed = createEmployeeSchema.safeParse(request.body);
    if (!parsed.success) {
      await reply.code(400).send({ error: "bad_employee" });
      return;
    }

    if (!canManageRole(user, parsed.data.role)) {
      await reply.code(403).send({ error: "forbidden_role" });
      return;
    }

    try {
      await ensurePinUnique(parsed.data.pin);
      const result = await createEmployee(parsed.data);
      await audit(request, "employee_create", user.id, "employee", result.id, result);
      return result;
    } catch (error) {
      if (isConflictError(error)) {
        await reply.code(409).send({ error: conflictCode(error) });
        return;
      }
      throw error;
    }
  });

  app.patch("/api/admin/employees/:id", async (request, reply) => {
    const user = await requireAdmin(request, reply);
    if (!user) return;

    const params = employeeParamsSchema.safeParse(request.params);
    const parsed = updateEmployeeSchema.safeParse(request.body);
    if (!params.success || !parsed.success) {
      await reply.code(400).send({ error: "bad_employee" });
      return;
    }

    const target = await getEmployeeRole(params.data.id);
    if (!target) {
      await reply.code(404).send({ error: "not_found" });
      return;
    }
    if (!canManageRole(user, target.role) || !canManageRole(user, parsed.data.role)) {
      await reply.code(403).send({ error: "forbidden_role" });
      return;
    }
    if (params.data.id === user.id && !parsed.data.isActive) {
      await reply.code(400).send({ error: "cannot_disable_self" });
      return;
    }
    if (params.data.id === user.id && !keepsOwnAdminAccess(parsed.data.services)) {
      await reply.code(400).send({ error: "cannot_remove_own_admin" });
      return;
    }

    try {
      if (parsed.data.pin) {
        await ensurePinUnique(parsed.data.pin, params.data.id);
      }

      const result = await updateEmployee(params.data.id, parsed.data);
      await audit(request, "employee_update", user.id, "employee", result.id, result);
      return result;
    } catch (error) {
      if (isConflictError(error)) {
        await reply.code(409).send({ error: conflictCode(error) });
        return;
      }
      throw error;
    }
  });
}

async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<SessionUser | undefined> {
  const user = await requireUser(request, reply);
  if (!user) return undefined;
  if (user.role !== "owner" && user.role !== "manager") {
    await reply.code(403).send({ error: "forbidden" });
    return undefined;
  }
  return user;
}

function canManageRole(user: SessionUser, role: string): boolean {
  return user.role === "owner" || role !== "owner";
}

function keepsOwnAdminAccess(services: z.infer<typeof serviceAccessSchema>[]): boolean {
  return services.some((service) => service.code === "admin" && service.canView && service.canEdit);
}

async function getEmployeeRole(employeeId: string): Promise<{ role: string } | undefined> {
  const result = await query<{ role: string }>("SELECT role::text FROM employees WHERE id = $1", [employeeId]);
  return result.rows[0];
}

async function getAdminEmployees() {
  const [serviceRows, employeeRows, accessRows] = await Promise.all([
    query<ServiceRow>(`SELECT id, code, title, url, is_active FROM services ORDER BY ${serviceOrderSql}`),
    query<EmployeeRow>(
      `
        SELECT
          e.id,
          e.display_name,
          e.role::text,
          e.is_active,
          e.schedule_role,
          e.default_hours,
          e.hourly_rate,
          e.pay_model,
          e.is_hookah_master,
          e.hookah_rate,
          EXISTS(SELECT 1 FROM employee_auth a WHERE a.employee_id = e.id) AS has_pin
        FROM employees e
        ORDER BY e.is_active DESC,
          CASE e.role
            WHEN 'owner' THEN 1
            WHEN 'manager' THEN 2
            WHEN 'cook' THEN 3
            WHEN 'bar' THEN 4
            WHEN 'waiter' THEN 5
            WHEN 'dishwasher' THEN 6
            ELSE 9
          END,
          e.display_name
      `
    ),
    query<AccessRow>(
      `
        SELECT esa.employee_id, esa.service_id, s.code, esa.can_view, esa.can_edit
        FROM employee_service_access esa
        JOIN services s ON s.id = esa.service_id
      `
    )
  ]);

  const services = serviceRows.rows.map((service) => ({
    id: service.id,
    code: service.code,
    title: service.title,
    url: service.url,
    isActive: service.is_active
  }));

  return {
    services,
    employees: employeeRows.rows.map((employee) => ({
      id: employee.id,
      displayName: employee.display_name,
      role: employee.role,
      roleLabel: roleLabel(employee.role),
      isActive: employee.is_active,
      scheduleRole: employee.schedule_role,
      defaultHours: employee.default_hours ? Number(employee.default_hours) : null,
      hourlyRate: employee.hourly_rate,
      payModel: employee.pay_model,
      isHookahMaster: employee.is_hookah_master,
      hookahRate: employee.hookah_rate,
      hasPin: employee.has_pin,
      services: services.map((service) => {
        const access = accessRows.rows.find((row) => row.employee_id === employee.id && row.code === service.code);
        return {
          code: service.code,
          title: service.title,
          canView: access?.can_view || false,
          canEdit: access?.can_edit || false
        };
      })
    }))
  };
}

async function createEmployee(data: z.infer<typeof createEmployeeSchema>) {
  const pinHash = await hashPin(data.pin);

  await pool.query("BEGIN");
  try {
    const result = await pool.query<{ id: string }>(
      `
        INSERT INTO employees (
          display_name,
          role,
          is_active,
          schedule_role,
          default_hours,
          hourly_rate,
          pay_model,
          is_hookah_master,
          hookah_rate
        )
        VALUES ($1, $2::employee_role, $3, $4, $5, $6, $7, $8, $9)
        RETURNING id
      `,
      [
        data.displayName,
        data.role,
        data.isActive,
        data.scheduleRole,
        data.defaultHours,
        data.hourlyRate,
        data.payModel,
        data.isHookahMaster,
        data.hookahRate || 0
      ]
    );
    const employeeId = result.rows[0].id;

    await pool.query(
      `
        INSERT INTO employee_auth (employee_id, pin_hash, pin_changed_at)
        VALUES ($1, $2, now())
      `,
      [employeeId, pinHash]
    );

    await syncServiceAccess(employeeId, data.services);
    await pool.query("COMMIT");
    return { ok: true, id: employeeId };
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
}

async function updateEmployee(employeeId: string, data: z.infer<typeof updateEmployeeSchema>) {
  await pool.query("BEGIN");
  try {
    await pool.query(
      `
        UPDATE employees
        SET display_name = $2,
            role = $3::employee_role,
            is_active = $4,
            schedule_role = $5,
            default_hours = $6,
            hourly_rate = $7,
            pay_model = $8,
            is_hookah_master = $9,
            hookah_rate = $10,
            updated_at = now()
        WHERE id = $1
      `,
      [
        employeeId,
        data.displayName,
        data.role,
        data.isActive,
        data.scheduleRole,
        data.defaultHours,
        data.hourlyRate,
        data.payModel,
        data.isHookahMaster,
        data.hookahRate || 0
      ]
    );

    if (data.pin) {
      const pinHash = await hashPin(data.pin);
      await pool.query(
        `
          INSERT INTO employee_auth (employee_id, pin_hash, pin_changed_at)
          VALUES ($1, $2, now())
          ON CONFLICT (employee_id) DO UPDATE
          SET pin_hash = excluded.pin_hash,
              pin_changed_at = now(),
              failed_attempts = 0,
              locked_until = NULL
        `,
        [employeeId, pinHash]
      );
    }

    await syncServiceAccess(employeeId, data.services);
    await pool.query("COMMIT");
    return { ok: true, id: employeeId };
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
}

async function syncServiceAccess(employeeId: string, services: z.infer<typeof serviceAccessSchema>[]): Promise<void> {
  await pool.query("DELETE FROM employee_service_access WHERE employee_id = $1", [employeeId]);

  for (const service of services.filter((item) => item.canView || item.canEdit)) {
    await pool.query(
      `
        INSERT INTO employee_service_access (employee_id, service_id, can_view, can_edit)
        SELECT $1, id, $3, $4
        FROM services
        WHERE code = $2
          AND is_active = true
      `,
      [employeeId, service.code, service.canView || service.canEdit, service.canEdit]
    );
  }
}

async function ensurePinUnique(pin: string, excludeEmployeeId?: string): Promise<void> {
  const result = await query<{ employee_id: string; pin_hash: string }>(
    `
      SELECT employee_id, pin_hash
      FROM employee_auth
      WHERE ($1::uuid IS NULL OR employee_id <> $1::uuid)
    `,
    [excludeEmployeeId || null]
  );

  for (const row of result.rows) {
    if (await verifyPin(row.pin_hash, pin)) {
      throw new Error("pin_exists");
    }
  }
}

function isConflictError(error: unknown): boolean {
  return error instanceof Error && (error.message === "pin_exists" || "code" in error && error.code === "23505");
}

function conflictCode(error: unknown): string {
  if (error instanceof Error && error.message === "pin_exists") return "pin_exists";
  return "employee_exists";
}

function roleLabel(role: string): string {
  return {
    owner: "Руководитель",
    manager: "Управляющий",
    cook: "Повар",
    bar: "Бармен",
    waiter: "Официант",
    dishwasher: "Мойщица",
    other: "Сотрудник"
  }[role] || "Сотрудник";
}
