import { pool, query } from "./db.js";
import { menuData, type MenuItem, type MenuSheet } from "./data/menuData.js";

const MODULES = [
  { kind: "kitchen" as const, slug: "kitchen-menu", title: "Меню кухни", sort: 10 },
  { kind: "bar" as const, slug: "bar-menu", title: "Меню бара", sort: 11 }
];

function composition(item: MenuItem): string {
  const entries = Object.entries(item.fields);
  const sostav = entries.filter(([k]) => k.toLowerCase().includes("состав")).map(([, v]) => v);
  let text = sostav.join(", ");
  if (!text) {
    const alt = entries.find(([k]) => /техкарт|способ|описан|метод/i.test(k));
    if (alt) text = alt[1];
  }
  if (!text && entries.length) text = entries.map(([, v]) => v).join(", ");
  text = text.replace(/\s+/g, " ").trim();
  return text.length > 200 ? text.slice(0, 197) + "…" : text;
}

function description(item: MenuItem): string {
  const d = Object.entries(item.fields).find(([k]) => /описан/i.test(k));
  return d ? d[1] : "";
}

function chapterBody(items: MenuItem[]): string {
  const blocks: string[] = [];
  for (const it of items) {
    const lines = [it.name];
    const comp = composition(it);
    if (comp) lines.push(`* Состав: ${comp}`);
    const desc = description(it);
    if (desc) lines.push(`* ${desc}`);
    blocks.push(lines.join("\n"));
  }
  return blocks.join("\n\n");
}

function shuffle<T>(a: T[]): T[] {
  const r = a.slice();
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j], r[i]];
  }
  return r;
}

type Q = { prompt: string; correct: string; distractors: string[] };

async function insertQuestion(
  scope: { chapterId?: string; moduleId?: string; attestation?: boolean },
  q: Q,
  sortOrder: number
): Promise<void> {
  const res = await query<{ id: string }>(
    `INSERT INTO quiz_questions (chapter_id, module_id, is_attestation, prompt, sort_order)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [scope.chapterId ?? null, scope.moduleId ?? null, scope.attestation ?? false, q.prompt, sortOrder]
  );
  const qid = res.rows[0].id;
  const options = shuffle([
    { label: q.correct, correct: true },
    ...q.distractors.map((d) => ({ label: d, correct: false }))
  ]);
  for (let i = 0; i < options.length; i++) {
    await query(
      `INSERT INTO quiz_options (question_id, label, is_correct, sort_order) VALUES ($1, $2, $3, $4)`,
      [qid, options[i].label, options[i].correct, i]
    );
  }
}

async function importModule(mod: typeof MODULES[number]): Promise<void> {
  const sheets: MenuSheet[] = menuData.filter((s) => s.kind === mod.kind);
  if (!sheets.length) return;

  await query("DELETE FROM training_modules WHERE slug = $1", [mod.slug]);
  const modRes = await query<{ id: string }>(
    `INSERT INTO training_modules (slug, title, description, audience_role, sort_order, is_active)
     VALUES ($1, $2, $3, NULL, $4, true) RETURNING id`,
    [mod.slug, mod.title, "Изучается по блокам с тестом после каждого. В конце — аттестация.", mod.sort]
  );
  const moduleId = modRes.rows[0].id;

  // пул составов для дистракторов по всему модулю
  const pool: Q[] = [];
  for (const sheet of sheets) {
    for (const it of sheet.items) {
      const comp = composition(it);
      if (comp && comp.length > 2) pool.push({ prompt: `Что входит в состав «${it.name}»?`, correct: comp, distractors: [] });
    }
  }
  const allComps = pool.map((p) => p.correct);
  const pickDistractors = (correct: string): string[] => {
    const others = shuffle(allComps.filter((c) => c !== correct));
    const seen = new Set<string>();
    const out: string[] = [];
    for (const c of others) {
      if (seen.has(c)) continue;
      seen.add(c);
      out.push(c);
      if (out.length >= 3) break;
    }
    return out;
  };

  const attestation: Q[] = [];
  for (let si = 0; si < sheets.length; si++) {
    const sheet = sheets[si];
    const chRes = await query<{ id: string }>(
      `INSERT INTO training_chapters (module_id, slug, title, summary, body, source_ref, sort_order, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true) RETURNING id`,
      [moduleId, `sheet-${si + 1}`, sheet.sheet, `${sheet.items.length} позиций`, chapterBody(sheet.items), "ТТК Этна", si]
    );
    const chapterId = chRes.rows[0].id;

    let order = 0;
    for (const it of sheet.items) {
      const comp = composition(it);
      if (!comp || comp.length <= 2) continue;
      const q: Q = { prompt: `Что входит в состав «${it.name}»?`, correct: comp, distractors: pickDistractors(comp) };
      if (q.distractors.length < 1) continue;
      await insertQuestion({ chapterId }, q, order++);
      attestation.push(q);
    }
  }

  // аттестация модуля: до 14 вопросов равномерно по пулу
  const picked = attestation.length <= 14 ? attestation : attestation.filter((_, i) => i % Math.ceil(attestation.length / 14) === 0).slice(0, 14);
  let ao = 0;
  for (const q of picked) {
    await insertQuestion({ moduleId, attestation: true }, q, ao++);
  }

  console.log(`Imported ${mod.title}: ${sheets.length} chapters, attestation ${picked.length} questions`);
}

async function main(): Promise<void> {
  for (const mod of MODULES) {
    await importModule(mod);
  }
  console.log("Menu import done");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
