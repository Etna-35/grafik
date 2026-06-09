import { pool, query } from "./db.js";
import { quizSeed } from "./data/quizData.js";

// Импортёр curated-вопросов квиза (docs/quiz-source → quizData.ts).
// ЗАМЕНА: удаляет все существующие вопросы (в т.ч. авто-генерацию «Что входит в состав»)
// и загружает curated, разложенные по главам и аттестациям модулей. Идемпотентно.
// Запуск вручную после деплоя:
//   docker compose exec -T api node apps/api/dist/importQuiz.js

const MODULE_SORT: Record<string, number> = { waiter: 1, kitchen: 10, bar: 11 };

async function main(): Promise<void> {
  const modules = await query<{ id: string; sort_order: number }>(
    "SELECT id::text, sort_order FROM training_modules"
  );
  const moduleId: Record<string, string> = {};
  for (const [name, ord] of Object.entries(MODULE_SORT)) {
    const found = modules.rows.find((row) => row.sort_order === ord);
    if (!found) throw new Error(`Модуль ${name} (sort_order ${ord}) не найден`);
    moduleId[name] = found.id;
  }

  const chapters = await query<{ id: string; module_id: string; sort_order: number }>(
    "SELECT id::text, module_id::text, sort_order FROM training_chapters"
  );
  const chapterId = (mid: string, ord: number): string | undefined =>
    chapters.rows.find((row) => row.module_id === mid && row.sort_order === ord)?.id;

  await pool.query("BEGIN");
  try {
    await pool.query("DELETE FROM quiz_questions");
    let n = 0;
    for (const q of quizSeed) {
      const mid = moduleId[q.module];
      let chId: string | null = null;
      let modId: string | null = null;
      if (q.attestation) {
        modId = mid;
      } else {
        const resolved = chapterId(mid, q.chapterOrder as number);
        if (!resolved) {
          console.error(`Нет главы ${q.module}:${q.chapterOrder} — пропуск`);
          continue;
        }
        chId = resolved;
      }
      const ins = await pool.query<{ id: string }>(
        `INSERT INTO quiz_questions (chapter_id, module_id, is_attestation, prompt, sort_order)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [chId, modId, q.attestation, q.prompt, n]
      );
      const qid = ins.rows[0].id;
      let so = 0;
      for (const opt of q.options) {
        await pool.query(
          `INSERT INTO quiz_options (question_id, label, is_correct, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [qid, opt.label, opt.correct, so++]
        );
      }
      n += 1;
    }
    await pool.query("COMMIT");
    console.log(`Импортировано вопросов квиза: ${n}`);
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
