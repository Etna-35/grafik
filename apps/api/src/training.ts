import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { audit, requireUser, type SessionUser } from "./auth.js";
import { query } from "./db.js";
import { getQuizCounts, getAttemptStates, buildQuizState, QUIZ_CHAPTER_LIMIT, QUIZ_ATTESTATION_LIMIT } from "./quiz.js";
import { awardPoints } from "./progress.js";

const chapterParamsSchema = z.object({
  id: z.string().uuid()
});

type ModuleRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
  sort_order: number;
};

type ChapterRow = {
  id: string;
  module_id: string;
  slug: string;
  title: string;
  summary: string;
  body: string;
  sort_order: number;
  is_read: boolean;
  read_at: string | null;
};

type AttachmentRow = {
  id: string;
  chapter_id: string;
  slug: string;
  title: string;
  kind: string;
  url: string | null;
  description: string;
  sort_order: number;
};

type RouteRow = {
  id: string;
  slug: string;
  title: string;
  description: string;
};

type RouteDayRow = {
  id: string;
  route_id: string;
  day_number: number;
  title: string;
  description: string;
  sort_order: number;
};

type RouteItemRow = {
  id: string;
  route_day_id: string;
  chapter_id: string | null;
  chapter_title: string | null;
  title: string;
  description: string;
  sort_order: number;
};

type DashboardRow = {
  employee_id: string;
  display_name: string;
  role: string;
  read_count: string;
  last_read_at: string | null;
};

export function registerTrainingRoutes(app: FastifyInstance): void {
  app.get("/api/training/init", async (request, reply) => {
    const user = await requireTrainingAccess(request, reply);
    if (!user) return;

    const canManage = canManageTraining(user);
    const [content, dashboard] = await Promise.all([
      getTrainingContent(user),
      canManage ? getTrainingDashboard() : Promise.resolve(null)
    ]);

    return {
      canManage,
      ...content,
      dashboard
    };
  });

  app.post("/api/training/chapters/:id/read", async (request, reply) => {
    const user = await requireTrainingAccess(request, reply);
    if (!user) return;

    const params = chapterParamsSchema.safeParse(request.params);
    if (!params.success) {
      await reply.code(400).send({ error: "bad_chapter" });
      return;
    }

    const exists = await query<{ id: string }>(
      "SELECT id::text FROM training_chapters WHERE id = $1 AND is_active = true",
      [params.data.id]
    );
    if (!exists.rows[0]) {
      await reply.code(404).send({ error: "not_found" });
      return;
    }

    await query(
      `
        INSERT INTO training_read_marks (employee_id, chapter_id, read_at)
        VALUES ($1, $2, now())
        ON CONFLICT (employee_id, chapter_id) DO UPDATE
        SET read_at = excluded.read_at
      `,
      [user.id, params.data.id]
    );
    await audit(request, "training_chapter_read", user.id, "training_chapter", params.data.id);
    await awardPoints(user.id, "chapter_read", "Прочитал главу", "training_chapter", params.data.id);
    return { ok: true };
  });

  app.post("/api/training/routes/:id/complete", async (request, reply) => {
    const user = await requireTrainingAccess(request, reply);
    if (!user) return;
    const params = chapterParamsSchema.safeParse(request.params);
    if (!params.success) {
      await reply.code(400).send({ error: "bad_route" });
      return;
    }
    await query(
      `INSERT INTO training_route_completions (employee_id, route_id) VALUES ($1, $2)
       ON CONFLICT (employee_id, route_id) DO NOTHING`,
      [user.id, params.data.id]
    );
    return { ok: true };
  });

  app.delete("/api/training/routes/:id/complete", async (request, reply) => {
    const user = await requireTrainingAccess(request, reply);
    if (!user) return;
    const params = chapterParamsSchema.safeParse(request.params);
    if (!params.success) {
      await reply.code(400).send({ error: "bad_route" });
      return;
    }
    await query(
      "DELETE FROM training_route_completions WHERE employee_id = $1 AND route_id = $2",
      [user.id, params.data.id]
    );
    return { ok: true };
  });
}

async function requireTrainingAccess(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<SessionUser | undefined> {
  // Обучение доступно всем авторизованным сотрудникам (решение продукта).
  return requireUser(request, reply);
}

function canManageTraining(user: SessionUser): boolean {
  return user.role === "owner" || user.role === "manager";
}

async function getTrainingContent(user: SessionUser) {
  // Обучение открыто всем: ролевые ограничения видимости модулей сняты (решение продукта).
  const moduleAudienceFilter = "";
  const chapterAudienceFilter = "";
  const routeAudienceFilter = "";

  const [modulesResult, chaptersResult, attachmentsResult, routeResult, routeDaysResult, routeItemsResult] =
    await Promise.all([
      query<ModuleRow>(
        `
          SELECT id::text, slug, title, description, sort_order
          FROM training_modules m
          WHERE m.is_active = true
            ${moduleAudienceFilter}
          ORDER BY sort_order, title
        `,
        []
      ),
      query<ChapterRow>(
        `
          SELECT
            c.id::text,
            c.module_id::text,
            c.slug,
            c.title,
            c.summary,
            c.body,
            c.sort_order,
            (rm.id IS NOT NULL) AS is_read,
            rm.read_at::text
          FROM training_chapters c
          LEFT JOIN training_read_marks rm ON rm.chapter_id = c.id AND rm.employee_id = $1
          JOIN training_modules m ON m.id = c.module_id
          WHERE c.is_active = true
            AND m.is_active = true
            ${chapterAudienceFilter}
          ORDER BY m.sort_order, c.sort_order, c.title
        `,
        [user.id]
      ),
      query<AttachmentRow>(
        `
          SELECT
            a.id::text,
            a.chapter_id::text,
            a.slug,
            a.title,
            a.kind,
            a.url,
            a.description,
            a.sort_order
          FROM training_attachments a
          JOIN training_chapters c ON c.id = a.chapter_id
          JOIN training_modules m ON m.id = c.module_id
          WHERE a.is_active = true
            AND c.is_active = true
            AND m.is_active = true
            ${moduleAudienceFilter}
          ORDER BY a.sort_order, a.title
        `,
        []
      ),
      query<RouteRow>(
        `
          SELECT id::text, slug, title, description
          FROM training_routes r
          WHERE r.is_active = true
            ${routeAudienceFilter}
          ORDER BY sort_order, title
          LIMIT 1
        `,
        []
      ),
      query<RouteDayRow>(
        `
          SELECT d.id::text, d.route_id::text, d.day_number, d.title, d.description, d.sort_order
          FROM training_route_days d
          JOIN training_routes r ON r.id = d.route_id
          WHERE r.is_active = true
            ${routeAudienceFilter}
          ORDER BY d.sort_order, d.day_number
        `,
        []
      ),
      query<RouteItemRow>(
        `
          SELECT
            i.id::text,
            i.route_day_id::text,
            i.chapter_id::text,
            c.title AS chapter_title,
            i.title,
            i.description,
            i.sort_order
          FROM training_route_items i
          JOIN training_route_days d ON d.id = i.route_day_id
          JOIN training_routes r ON r.id = d.route_id
          LEFT JOIN training_chapters c ON c.id = i.chapter_id
          WHERE r.is_active = true
            ${routeAudienceFilter}
          ORDER BY i.sort_order, i.title
        `,
        []
      )
    ]);

  const attachmentsByChapter = groupBy(attachmentsResult.rows, "chapter_id");
  const [{ chapter: chapterCounts, attestation: attCounts }, attemptStates] = await Promise.all([
    getQuizCounts(),
    getAttemptStates(user.id)
  ]);

  const chapters = chaptersResult.rows.map((chapter) => ({
    id: chapter.id,
    moduleId: chapter.module_id,
    slug: chapter.slug,
    title: chapter.title,
    summary: chapter.summary,
    body: chapter.body,
    sortOrder: chapter.sort_order,
    isRead: chapter.is_read,
    readAt: chapter.read_at,
    quiz: buildQuizState(Math.min(chapterCounts.get(chapter.id) || 0, QUIZ_CHAPTER_LIMIT), attemptStates.get(`chapter:${chapter.id}`)),
    locked: false,
    attachments: (attachmentsByChapter.get(chapter.id) || []).map(serializeAttachment)
  }));
  const chaptersByModule = groupBy(chapters, "moduleId");

  // Гейтинг: глава заблокирована, пока тест предыдущей не пройден (глава без вопросов гейт не ставит).
  for (const list of chaptersByModule.values()) {
    let prevPassed = true;
    for (const ch of list) {
      ch.locked = !prevPassed;
      const passedThis = ch.quiz.questionCount === 0 ? true : ch.quiz.passed;
      prevPassed = prevPassed && passedThis;
    }
  }

  let routeCompleted = false;
  if (routeResult.rows[0]) {
    const done = await query<{ c: string }>(
      "SELECT COUNT(*)::text AS c FROM training_route_completions WHERE employee_id = $1 AND route_id = $2",
      [user.id, routeResult.rows[0].id]
    );
    routeCompleted = Number(done.rows[0]?.c || 0) > 0;
  }
  const route = routeResult.rows[0]
    ? serializeRoute(routeResult.rows[0], routeDaysResult.rows, routeItemsResult.rows, routeCompleted)
    : null;
  const readCount = chapters.filter((chapter) => chapter.isRead).length;

  return {
    modules: modulesResult.rows.map((module) => {
      const list = chaptersByModule.get(module.id) || [];
      const allPassed = list.every((ch) => (ch.quiz.questionCount === 0 ? true : ch.quiz.passed));
      const attState = buildQuizState(Math.min(attCounts.get(module.id) || 0, QUIZ_ATTESTATION_LIMIT), attemptStates.get(`attestation:${module.id}`));
      return {
        id: module.id,
        slug: module.slug,
        title: module.title,
        description: module.description,
        sortOrder: module.sort_order,
        chapters: list,
        attestation: { ...attState, available: allPassed }
      };
    }),
    route,
    progress: {
      totalChapters: chapters.length,
      readChapters: readCount,
      percent: chapters.length ? Math.round((readCount / chapters.length) * 100) : 0
    }
  };
}

async function getTrainingDashboard() {
  const totalChaptersResult = await query<{ total: string }>(
    `
      SELECT COUNT(*)::text AS total
      FROM training_chapters c
      JOIN training_modules m ON m.id = c.module_id
      WHERE c.is_active = true
        AND m.is_active = true
        AND (m.audience_role IS NULL OR m.audience_role = 'waiter')
    `
  );
  const totalChapters = Number(totalChaptersResult.rows[0]?.total || 0);
  const result = await query<DashboardRow>(
    `
      WITH training_employees AS (
        SELECT e.id, e.display_name, e.role::text
        FROM employees e
        JOIN employee_service_access esa ON esa.employee_id = e.id
        JOIN services s ON s.id = esa.service_id
        WHERE e.is_active = true
          AND e.role = 'waiter'
          AND s.code = 'training'
          AND esa.can_view = true
      )
      SELECT
        e.id::text AS employee_id,
        e.display_name,
        e.role,
        COUNT(m.id)::text AS read_count,
        MAX(CASE WHEN m.id IS NOT NULL THEN rm.read_at END)::text AS last_read_at
      FROM training_employees e
      LEFT JOIN training_read_marks rm ON rm.employee_id = e.id
      LEFT JOIN training_chapters c ON c.id = rm.chapter_id AND c.is_active = true
      LEFT JOIN training_modules m ON m.id = c.module_id
        AND m.is_active = true
        AND (m.audience_role IS NULL OR m.audience_role = 'waiter')
      GROUP BY e.id, e.display_name, e.role
      ORDER BY
        CASE e.role
          WHEN 'owner' THEN 1
          WHEN 'manager' THEN 2
          WHEN 'waiter' THEN 3
          ELSE 9
        END,
        e.display_name
    `
  );

  const employees = result.rows.map((row) => ({
    employeeId: row.employee_id,
    displayName: row.display_name,
    role: row.role,
    readChapters: Number(row.read_count),
    totalChapters,
    percent: totalChapters ? Math.round((Number(row.read_count) / totalChapters) * 100) : 0,
    lastReadAt: row.last_read_at
  }));
  const averagePercent = employees.length
    ? Math.round(employees.reduce((sum, employee) => sum + employee.percent, 0) / employees.length)
    : 0;

  return {
    totalChapters,
    employeesTotal: employees.length,
    completedTotal: employees.filter((employee) => totalChapters > 0 && employee.readChapters >= totalChapters).length,
    averagePercent,
    employees
  };
}

function serializeAttachment(row: AttachmentRow) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    kind: row.kind,
    url: row.url,
    description: row.description,
    sortOrder: row.sort_order
  };
}

function serializeRoute(route: RouteRow, days: RouteDayRow[], items: RouteItemRow[], completed: boolean) {
  const itemsByDay = groupBy(items, "route_day_id");
  return {
    id: route.id,
    slug: route.slug,
    title: route.title,
    description: route.description,
    completed,
    days: days
      .filter((day) => day.route_id === route.id)
      .map((day) => ({
        id: day.id,
        dayNumber: day.day_number,
        title: day.title,
        description: day.description,
        items: (itemsByDay.get(day.id) || []).map((item) => ({
          id: item.id,
          chapterId: item.chapter_id,
          chapterTitle: item.chapter_title,
          title: item.title,
          description: item.description,
          sortOrder: item.sort_order
        }))
      }))
  };
}

function groupBy<T extends Record<string, unknown>>(items: T[], key: keyof T): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const value = String(item[key]);
    map.set(value, [...(map.get(value) || []), item]);
  }
  return map;
}
