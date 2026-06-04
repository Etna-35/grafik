import { pool, query } from "./db.js";

type ParsedChapter = {
  number: number;
  title: string;
  body: string;
  summary: string;
};

type ParsedRouteDay = {
  dayNumber: number;
  title: string;
  items: string[];
};

type ParsedTraining = {
  introduction: string;
  routeDays: ParsedRouteDay[];
  chapters: ParsedChapter[];
};

const moduleSlug = "waiter-knowledge-base";
const routeSlug = "waiter-intern-route";

async function main(): Promise<void> {
  const source = process.argv[2] || process.env.TRAINING_SOURCE_URL;
  if (!source) {
    throw new Error("Pass Google Doc URL as first argument or set TRAINING_SOURCE_URL");
  }

  const text = await fetchGoogleDocText(source);
  const parsed = parseTrainingText(text);
  if (!parsed.chapters.length) {
    throw new Error("No chapters found in training document");
  }

  await importTraining(parsed);
  console.log(`Imported training: ${parsed.chapters.length} chapters, ${parsed.routeDays.length} route days`);
}

async function fetchGoogleDocText(source: string): Promise<string> {
  const url = toGoogleDocTextExportUrl(source);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Could not fetch Google Doc: ${response.status}`);
  }
  return response.text();
}

function toGoogleDocTextExportUrl(source: string): string {
  const id = source.match(/document\/d\/([^/]+)/)?.[1] || source.match(/^[A-Za-z0-9_-]{20,}$/)?.[0];
  if (!id) {
    throw new Error("Could not parse Google Doc id");
  }
  return `https://docs.google.com/document/d/${id}/export?format=txt`;
}

function parseTrainingText(text: string): ParsedTraining {
  const lines = text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd());

  const contentStart = lines.findIndex((line, index) => index > 20 && line.trim() === "Введение");
  const contentLines = (contentStart >= 0 ? lines.slice(contentStart) : lines).map((line) => line.trimEnd());
  const routeStart = contentLines.findIndex((line) => line.trim() === "Маршрут стажёра");
  const firstChapterStart = contentLines.findIndex((line) => /^Глава\s+\d+\./.test(line.trim()));

  const introduction = normalizeBlock(contentLines.slice(0, routeStart >= 0 ? routeStart : firstChapterStart));
  const routeLines = routeStart >= 0 && firstChapterStart > routeStart
    ? contentLines.slice(routeStart + 1, firstChapterStart)
    : [];
  const routeDays = parseRouteDays(routeLines);
  const chapters = parseChapters(contentLines.slice(firstChapterStart));

  return {
    introduction,
    routeDays,
    chapters
  };
}

function parseRouteDays(lines: string[]): ParsedRouteDay[] {
  const days: ParsedRouteDay[] = [];
  let current: ParsedRouteDay | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const dayMatch = line.match(/^День\s+(\d+)\.\s*(.+)$/);
    if (dayMatch) {
      current = {
        dayNumber: Number(dayMatch[1]),
        title: dayMatch[2].trim(),
        items: []
      };
      days.push(current);
      continue;
    }
    if (!current) continue;
    current.items.push(line.replace(/^\*\s*/, "").trim());
  }

  return days;
}

function parseChapters(lines: string[]): ParsedChapter[] {
  const chapters: ParsedChapter[] = [];
  let current: { number: number; title: string; lines: string[] } | null = null;

  for (const raw of lines) {
    const line = raw.trimEnd();
    const match = line.trim().match(/^Глава\s+(\d+)\.\s*(.+)$/);
    if (match) {
      if (current) {
        chapters.push(chapterFrom(current));
      }
      current = {
        number: Number(match[1]),
        title: match[2].trim(),
        lines: []
      };
      continue;
    }
    if (current) {
      current.lines.push(line);
    }
  }

  if (current) {
    chapters.push(chapterFrom(current));
  }

  return chapters;
}

function chapterFrom(chapter: { number: number; title: string; lines: string[] }): ParsedChapter {
  const body = normalizeBlock(chapter.lines);
  return {
    number: chapter.number,
    title: chapter.title.replace(/\s+s$/, ""),
    body,
    summary: summarize(body)
  };
}

function normalizeBlock(lines: string[]): string {
  return lines
    .map((line) => line.trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function summarize(body: string): string {
  const paragraph = body
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .find((item) => item && !/^\d+\.\d+\./.test(item) && !item.startsWith("* "));
  if (!paragraph) return "";
  return paragraph.length > 220 ? `${paragraph.slice(0, 217).trim()}...` : paragraph;
}

async function importTraining(parsed: ParsedTraining): Promise<void> {
  await pool.query("BEGIN");
  try {
    const moduleResult = await pool.query<{ id: string }>(
      `
        INSERT INTO training_modules (slug, title, description, audience_role, sort_order, is_active)
        VALUES ($1, 'База знаний официанта', $2, 'waiter'::employee_role, 1, true)
        ON CONFLICT (slug) DO UPDATE
        SET title = excluded.title,
            description = excluded.description,
            audience_role = excluded.audience_role,
            sort_order = excluded.sort_order,
            is_active = true,
            updated_at = now()
        RETURNING id
      `,
      [moduleSlug, parsed.introduction]
    );
    const moduleId = moduleResult.rows[0].id;
    const chapterIds = new Map<number, string>();

    for (const chapter of parsed.chapters) {
      const result = await pool.query<{ id: string }>(
        `
          INSERT INTO training_chapters (
            module_id,
            slug,
            title,
            summary,
            body,
            source_ref,
            sort_order,
            is_active
          )
          VALUES ($1, $2, $3, $4, $5, 'google_doc_waiter_bible', $6, true)
          ON CONFLICT (module_id, slug) DO UPDATE
          SET title = excluded.title,
              summary = excluded.summary,
              body = excluded.body,
              source_ref = excluded.source_ref,
              sort_order = excluded.sort_order,
              is_active = true,
              updated_at = now()
          RETURNING id
        `,
        [
          moduleId,
          `chapter-${chapter.number}`,
          chapter.title,
          chapter.summary,
          chapter.body,
          chapter.number
        ]
      );
      chapterIds.set(chapter.number, result.rows[0].id);
    }

    await seedAttachmentPlaceholders(chapterIds);
    await importRoute(parsed, chapterIds);

    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
}

async function seedAttachmentPlaceholders(chapterIds: Map<number, string>): Promise<void> {
  const placeholders = [
    {
      chapterNumber: 1,
      slug: "artifacts-manual",
      title: "Методичка по артефактам",
      kind: "manual",
      description: "Описание интерьерных артефактов, которые официант должен знать и уметь показывать гостям."
    },
    {
      chapterNumber: 1,
      slug: "hall-map",
      title: "Карта зала и технические зоны",
      kind: "map",
      description: "Схема зала, сервант, линия раздачи, бар, мойка и другие технические зоны."
    },
    {
      chapterNumber: 3,
      slug: "ttk-menu",
      title: "ТТК и паспорта блюд",
      kind: "ttk",
      description: "Составы, описания блюд кухни, коктейлей, моктейлей и безалкогольных напитков."
    }
  ];

  for (const placeholder of placeholders) {
    const chapterId = chapterIds.get(placeholder.chapterNumber);
    if (!chapterId) continue;
    await pool.query(
      `
        INSERT INTO training_attachments (chapter_id, slug, title, kind, description, sort_order, is_active)
        VALUES ($1, $2, $3, $4, $5, 10, true)
        ON CONFLICT (chapter_id, slug) DO NOTHING
      `,
      [chapterId, placeholder.slug, placeholder.title, placeholder.kind, placeholder.description]
    );
  }
}

async function importRoute(parsed: ParsedTraining, chapterIds: Map<number, string>): Promise<void> {
  const routeResult = await pool.query<{ id: string }>(
    `
      INSERT INTO training_routes (slug, title, description, audience_role, sort_order, is_active)
      VALUES ($1, 'Маршрут стажёра', 'Первые дни официанта: от знакомства с рестораном до сложных ситуаций.', 'waiter'::employee_role, 1, true)
      ON CONFLICT (slug) DO UPDATE
      SET title = excluded.title,
          description = excluded.description,
          audience_role = excluded.audience_role,
          sort_order = excluded.sort_order,
          is_active = true,
          updated_at = now()
      RETURNING id
    `,
    [routeSlug]
  );
  const routeId = routeResult.rows[0].id;

  await pool.query("DELETE FROM training_route_days WHERE route_id = $1", [routeId]);

  for (const day of parsed.routeDays) {
    const dayResult = await pool.query<{ id: string }>(
      `
        INSERT INTO training_route_days (route_id, day_number, title, sort_order)
        VALUES ($1, $2, $3, $2)
        RETURNING id
      `,
      [routeId, day.dayNumber, day.title]
    );
    const dayId = dayResult.rows[0].id;

    for (const [index, item] of day.items.entries()) {
      const chapterNumber = Number(item.match(/Глав[ау]\s+(\d+)/i)?.[1] || 0);
      await pool.query(
        `
          INSERT INTO training_route_items (route_day_id, chapter_id, title, sort_order)
          VALUES ($1, $2, $3, $4)
        `,
        [dayId, chapterIds.get(chapterNumber) || null, item, index + 1]
      );
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
