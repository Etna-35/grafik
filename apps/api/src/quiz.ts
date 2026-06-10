import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { audit, requireUser, type SessionUser } from "./auth.js";
import { query } from "./db.js";
import { awardPoints } from "./progress.js";

export const QUIZ_PASS_PCT = 80;
export const QUIZ_PER_QUESTION_SEC = 90;
export const QUIZ_LOCK_MINUTES = 10;
// На попытку выдаётся случайная подвыборка из пула (чтобы тесты не были слишком длинными).
export const QUIZ_CHAPTER_LIMIT = 8;
export const QUIZ_ATTESTATION_LIMIT = 15;
// Добровольный «тест-челлендж»: рандом из всей базы, лимит в сутки, бонус.
export const CHALLENGE_LIMIT = 15;
export const CHALLENGE_PER_DAY = 2;
const CHALLENGE_SCOPE_ID = "00000000-0000-0000-0000-000000000000";

export function quizScopeLimit(scope: "chapter" | "attestation"): number {
  return scope === "attestation" ? QUIZ_ATTESTATION_LIMIT : QUIZ_CHAPTER_LIMIT;
}
const LOCK_MS = QUIZ_LOCK_MINUTES * 60 * 1000;

/** Сколько добровольных тестов сотрудник ещё может пройти сегодня. */
export async function getChallengeLeftToday(employeeId: string): Promise<number> {
  const r = await query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM quiz_attempts
     WHERE employee_id = $1 AND scope_type = 'challenge' AND finished_at IS NOT NULL
       AND (finished_at AT TIME ZONE 'Europe/Moscow')::date = (now() AT TIME ZONE 'Europe/Moscow')::date`,
    [employeeId]
  );
  return Math.max(0, CHALLENGE_PER_DAY - Number(r.rows[0]?.c || 0));
}

const scopeSchema = z.enum(["chapter", "attestation"]);
const paramsSchema = z.object({
  scope: scopeSchema,
  id: z.string().uuid()
});
const attemptParamsSchema = z.object({ attemptId: z.string().uuid() });
const submitSchema = z.object({
  answers: z.array(z.object({
    questionId: z.string().uuid(),
    optionId: z.string().uuid().nullable()
  })).max(500)
});

type AttemptState = { passed: boolean; lockedUntil: string | null; lastScore: number | null };

function questionWhere(scope: "chapter" | "attestation"): string {
  return scope === "chapter"
    ? "q.chapter_id = $1 AND q.is_active = true"
    : "q.module_id = $1 AND q.is_attestation = true AND q.is_active = true";
}

async function countQuestions(scope: "chapter" | "attestation", id: string): Promise<number> {
  const r = await query<{ c: string }>(
    `SELECT COUNT(*)::text AS c FROM quiz_questions q WHERE ${questionWhere(scope)}`,
    [id]
  );
  return Number(r.rows[0]?.c || 0);
}

/** Последнее завершённое состояние попытки по scope для сотрудника + расчёт блокировки. */
export async function getAttemptStates(employeeId: string): Promise<Map<string, AttemptState>> {
  const rows = await query<{ scope_type: string; scope_id: string; passed: boolean; score_pct: number | null; finished_at: string }>(
    `
      SELECT DISTINCT ON (scope_type, scope_id)
        scope_type, scope_id::text, passed, score_pct, finished_at::text
      FROM quiz_attempts
      WHERE employee_id = $1 AND finished_at IS NOT NULL
      ORDER BY scope_type, scope_id, finished_at DESC
    `,
    [employeeId]
  );
  const map = new Map<string, AttemptState>();
  const now = Date.now();
  for (const row of rows.rows) {
    let lockedUntil: string | null = null;
    if (!row.passed && row.finished_at) {
      const until = new Date(row.finished_at).getTime() + LOCK_MS;
      if (until > now) lockedUntil = new Date(until).toISOString();
    }
    map.set(`${row.scope_type}:${row.scope_id}`, {
      passed: row.passed,
      lockedUntil,
      lastScore: row.score_pct ?? null
    });
  }
  return map;
}

export function buildQuizState(questionCount: number, st: AttemptState | undefined) {
  const passed = st?.passed || false;
  const lockedUntil = st?.lockedUntil || null;
  return {
    questionCount,
    durationSec: questionCount * QUIZ_PER_QUESTION_SEC,
    passPct: QUIZ_PASS_PCT,
    passed,
    lastScore: st?.lastScore ?? null,
    lockedUntil,
    canStart: questionCount > 0 && !passed && !lockedUntil
  };
}

/** Счётчики вопросов: главы и аттестации модулей. */
export async function getQuizCounts(): Promise<{ chapter: Map<string, number>; attestation: Map<string, number> }> {
  const rows = await query<{ chapter_id: string | null; module_id: string | null; is_attestation: boolean; c: string }>(
    `
      SELECT chapter_id::text, module_id::text, is_attestation, COUNT(*)::text AS c
      FROM quiz_questions
      WHERE is_active = true
      GROUP BY chapter_id, module_id, is_attestation
    `
  );
  const chapter = new Map<string, number>();
  const attestation = new Map<string, number>();
  for (const r of rows.rows) {
    if (r.chapter_id) chapter.set(r.chapter_id, Number(r.c));
    else if (r.module_id && r.is_attestation) attestation.set(r.module_id, Number(r.c));
  }
  return { chapter, attestation };
}

export function registerQuizRoutes(app: FastifyInstance): void {
  app.get("/api/training/quiz/:scope/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) {
      await reply.code(400).send({ error: "bad_quiz" });
      return;
    }
    const count = Math.min(await countQuestions(params.data.scope, params.data.id), quizScopeLimit(params.data.scope));
    const states = await getAttemptStates(user.id);
    return buildQuizState(count, states.get(`${params.data.scope}:${params.data.id}`));
  });

  app.post("/api/training/quiz/:scope/:id/start", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const params = paramsSchema.safeParse(request.params);
    if (!params.success) {
      await reply.code(400).send({ error: "bad_quiz" });
      return;
    }
    const count = await countQuestions(params.data.scope, params.data.id);
    if (count === 0) {
      await reply.code(400).send({ error: "no_questions" });
      return;
    }
    const states = await getAttemptStates(user.id);
    const st = states.get(`${params.data.scope}:${params.data.id}`);
    if (st?.passed) {
      await reply.code(409).send({ error: "already_passed" });
      return;
    }
    if (st?.lockedUntil) {
      await reply.code(423).send({ error: "locked", lockedUntil: st.lockedUntil });
      return;
    }

    // убрать незавершённые попытки этого scope
    await query(
      "DELETE FROM quiz_attempts WHERE employee_id = $1 AND scope_type = $2 AND scope_id = $3 AND finished_at IS NULL",
      [user.id, params.data.scope, params.data.id]
    );
    const allQ = await query<{ id: string; prompt: string }>(
      `SELECT q.id::text, q.prompt FROM quiz_questions q WHERE ${questionWhere(params.data.scope)} ORDER BY q.sort_order, q.id`,
      [params.data.id]
    );
    // Случайная подвыборка из пула — скоринг корректен, т.к. делитель = total попытки.
    const selected = shuffle(allQ.rows).slice(0, quizScopeLimit(params.data.scope));
    const selCount = selected.length;

    const attempt = await query<{ id: string }>(
      `INSERT INTO quiz_attempts (employee_id, scope_type, scope_id, total) VALUES ($1, $2, $3, $4) RETURNING id`,
      [user.id, params.data.scope, params.data.id, selCount]
    );

    const orows = await query<{ question_id: string; id: string; label: string }>(
      `
        SELECT o.question_id::text, o.id::text, o.label
        FROM quiz_options o
        JOIN quiz_questions q ON q.id = o.question_id
        WHERE ${questionWhere(params.data.scope)}
        ORDER BY o.sort_order, o.id
      `,
      [params.data.id]
    );
    const optsByQ = new Map<string, { id: string; label: string }[]>();
    for (const o of orows.rows) {
      const arr = optsByQ.get(o.question_id) || [];
      arr.push({ id: o.id, label: o.label });
      optsByQ.set(o.question_id, arr);
    }
    const questions = selected.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: shuffle(optsByQ.get(q.id) || [])
    }));

    return {
      attemptId: attempt.rows[0].id,
      durationSec: selCount * QUIZ_PER_QUESTION_SEC,
      passPct: QUIZ_PASS_PCT,
      questions
    };
  });

  // Добровольный «тест-челлендж»: рандом из всей базы вопросов, лимит в сутки, +20% за сдачу.
  app.post("/api/training/challenge/start", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    if ((await getChallengeLeftToday(user.id)) <= 0) {
      await reply.code(429).send({ error: "challenge_limit" });
      return;
    }
    await query(
      "DELETE FROM quiz_attempts WHERE employee_id = $1 AND scope_type = 'challenge' AND finished_at IS NULL",
      [user.id]
    );
    const all = await query<{ id: string; prompt: string }>(
      "SELECT id::text, prompt FROM quiz_questions WHERE is_active = true"
    );
    if (!all.rows.length) {
      await reply.code(400).send({ error: "no_questions" });
      return;
    }
    const selected = shuffle(all.rows).slice(0, CHALLENGE_LIMIT);
    const attempt = await query<{ id: string }>(
      "INSERT INTO quiz_attempts (employee_id, scope_type, scope_id, total) VALUES ($1, 'challenge', $2, $3) RETURNING id",
      [user.id, CHALLENGE_SCOPE_ID, selected.length]
    );
    const orows = await query<{ question_id: string; id: string; label: string }>(
      `SELECT question_id::text, id::text, label FROM quiz_options
       WHERE question_id = ANY($1::uuid[]) ORDER BY sort_order, id`,
      [selected.map((q) => q.id)]
    );
    const optsByQ = new Map<string, { id: string; label: string }[]>();
    for (const o of orows.rows) {
      const arr = optsByQ.get(o.question_id) || [];
      arr.push({ id: o.id, label: o.label });
      optsByQ.set(o.question_id, arr);
    }
    const questions = selected.map((q) => ({
      id: q.id,
      prompt: q.prompt,
      options: shuffle(optsByQ.get(q.id) || [])
    }));
    return {
      attemptId: attempt.rows[0].id,
      durationSec: selected.length * QUIZ_PER_QUESTION_SEC,
      passPct: QUIZ_PASS_PCT,
      questions
    };
  });

  app.post("/api/training/quiz/attempts/:attemptId/submit", async (request: FastifyRequest, reply: FastifyReply) => {
    const user = await requireUser(request, reply);
    if (!user) return;
    const params = attemptParamsSchema.safeParse(request.params);
    const parsed = submitSchema.safeParse(request.body);
    if (!params.success || !parsed.success) {
      await reply.code(400).send({ error: "bad_submit" });
      return;
    }
    const att = await query<{ id: string; scope_type: string; scope_id: string; total: number; finished_at: string | null }>(
      "SELECT id::text, scope_type, scope_id::text, total, finished_at::text FROM quiz_attempts WHERE id = $1 AND employee_id = $2",
      [params.data.attemptId, user.id]
    );
    const attempt = att.rows[0];
    if (!attempt) {
      await reply.code(404).send({ error: "not_found" });
      return;
    }
    if (attempt.finished_at) {
      await reply.code(409).send({ error: "already_finished" });
      return;
    }

    const scope = attempt.scope_type;
    const isChallenge = scope === "challenge";
    const correctRows = await query<{ question_id: string; id: string }>(
      `
        SELECT o.question_id::text, o.id::text
        FROM quiz_options o
        JOIN quiz_questions q ON q.id = o.question_id
        WHERE ${isChallenge ? "q.is_active = true" : questionWhere(scope as "chapter" | "attestation")} AND o.is_correct = true
      `,
      isChallenge ? [] : [attempt.scope_id]
    );
    const correctByQ = new Map<string, Set<string>>();
    for (const r of correctRows.rows) {
      const set = correctByQ.get(r.question_id) || new Set<string>();
      set.add(r.id);
      correctByQ.set(r.question_id, set);
    }
    const answered = new Map<string, string | null>();
    for (const a of parsed.data.answers) answered.set(a.questionId, a.optionId);

    let correct = 0;
    for (const [qid, set] of correctByQ) {
      const chosen = answered.get(qid);
      if (chosen && set.has(chosen)) correct++;
    }
    const total = attempt.total || correctByQ.size || 1;
    const pct = Math.round((correct / total) * 100);
    const passed = pct >= QUIZ_PASS_PCT;

    await query(
      "UPDATE quiz_attempts SET correct = $2, score_pct = $3, passed = $4, finished_at = now() WHERE id = $1",
      [attempt.id, correct, pct, passed]
    );
    await audit(request, "quiz_submit", user.id, "quiz_attempt", attempt.id, { scope, pct, passed });
    if (passed) {
      if (isChallenge) {
        await awardPoints(user.id, "challenge_test", "Добровольная проверка знаний");
      } else if (scope === "attestation") {
        await awardPoints(user.id, "attestation_passed", "Сдал аттестацию", "quiz_attestation", attempt.scope_id);
      } else {
        await awardPoints(user.id, "quiz_passed", "Сдал тест по главе", "quiz_chapter", attempt.scope_id);
      }
    }

    let lockedUntil: string | null = null;
    if (!passed) lockedUntil = new Date(Date.now() + LOCK_MS).toISOString();
    return { scorePct: pct, passed, passPct: QUIZ_PASS_PCT, lockedUntil };
  });
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
