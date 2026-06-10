import { env } from "./env.js";

// Общий слой отправки в Telegram. Используется отчётами закрытия смены, заявками,
// событиями целей/задач и плановым сообщением 11:11.

export const PUBLIC_BASE_URL = "https://lk.no-money-no-honey.ru";

export function tgEscape(value: string): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function managerChatId(): string {
  return env.telegramManagerChatId;
}

export function teamChatId(): string {
  return env.telegramTeamChatId;
}

function apiUrl(method: string): string {
  return `https://api.telegram.org/bot${env.telegramBotToken}/${method}`;
}

export type TelegramResult = { ok: boolean; error: string; messageId: string };

export async function sendMessage(chatId: string, text: string): Promise<TelegramResult> {
  if (!env.telegramBotToken || !chatId) {
    return { ok: false, error: "telegram_not_configured", messageId: "" };
  }
  try {
    const res = await fetch(apiUrl("sendMessage"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true })
    });
    if (!res.ok) {
      const errorText = await res.text();
      return { ok: false, error: errorText.slice(0, 400), messageId: "" };
    }
    const body = (await res.json()) as { result?: { message_id?: number } };
    return { ok: true, error: "", messageId: String(body.result?.message_id || "") };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), messageId: "" };
  }
}

export type OutPhoto = { buffer: Buffer; filename: string; mimeType: string };

// Отправляет подпись и фото. 0 фото → обычное сообщение; 1 → sendPhoto; 2+ → альбом sendMediaGroup
// (подпись у первого элемента). Возвращает ok/error.
export async function sendPhotos(chatId: string, photos: OutPhoto[], caption: string): Promise<TelegramResult> {
  if (!env.telegramBotToken || !chatId) {
    return { ok: false, error: "telegram_not_configured", messageId: "" };
  }
  if (photos.length === 0) {
    return sendMessage(chatId, caption);
  }
  try {
    const form = new FormData();
    form.append("chat_id", chatId);

    if (photos.length === 1) {
      const photo = photos[0];
      form.append("caption", caption);
      form.append("parse_mode", "HTML");
      form.append("photo", new Blob([Uint8Array.from(photo.buffer)], { type: photo.mimeType || "image/jpeg" }), photo.filename || "photo.jpg");
      const res = await fetch(apiUrl("sendPhoto"), { method: "POST", body: form });
      if (!res.ok) return { ok: false, error: (await res.text()).slice(0, 400), messageId: "" };
      return { ok: true, error: "", messageId: "" };
    }

    const media = photos.map((photo, index) => ({
      type: "photo",
      media: `attach://photo${index}`,
      ...(index === 0 ? { caption, parse_mode: "HTML" } : {})
    }));
    form.append("media", JSON.stringify(media));
    photos.forEach((photo, index) => {
      form.append(`photo${index}`, new Blob([Uint8Array.from(photo.buffer)], { type: photo.mimeType || "image/jpeg" }), photo.filename || `photo${index}.jpg`);
    });
    const res = await fetch(apiUrl("sendMediaGroup"), { method: "POST", body: form });
    if (!res.ok) return { ok: false, error: (await res.text()).slice(0, 400), messageId: "" };
    return { ok: true, error: "", messageId: "" };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error), messageId: "" };
  }
}

// Моноширинная таблица для Telegram (<pre>): метки слева, суммы справа, выравнивание по ширине.
export function tgTable(rows: Array<[string, number]>, totalRow?: [string, number]): string {
  const fmt = (n: number) => Math.round(Number(n || 0)).toLocaleString("ru-RU");
  const all = totalRow ? [...rows, totalRow] : rows;
  const maxLabel = Math.max(...all.map(([l]) => l.length));
  const maxAmount = Math.max(...all.map(([, a]) => fmt(a).length));
  const line = ([label, amount]: [string, number]) => `${label.padEnd(maxLabel + 2)}${fmt(amount).padStart(maxAmount)}`;
  let out = rows.map(line).join("\n");
  if (totalRow) {
    out += `\n${"─".repeat(maxLabel + 2 + maxAmount)}\n${line(totalRow)}`;
  }
  return `<pre>${tgEscape(out)}</pre>`;
}

// Моноширинный блок «название … значение» для произвольных строк (заявки и т.п.).
// Колонки выравниваются по самой длинной строке группы — ровно независимо от длины названий.
export function tgPairs(rows: Array<[string, string]>): string {
  if (!rows.length) return "";
  const maxLabel = Math.max(...rows.map(([label]) => label.length));
  const maxValue = Math.max(...rows.map(([, value]) => value.length));
  const out = rows.map(([label, value]) => `${label.padEnd(maxLabel + 2)}${value.padStart(maxValue)}`).join("\n");
  return `<pre>${tgEscape(out)}</pre>`;
}
