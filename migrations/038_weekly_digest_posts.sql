-- Идемпотентность еженедельного дайджеста «Итоги недели»: один пост на неделю.
-- Публикуется в воскресенье после сдачи закрытия смены (см. shiftClosing.ts → postWeeklyDigestOnce).
-- Ключ — дата воскресенья (конец недели Пн–Вс).
CREATE TABLE IF NOT EXISTS weekly_digest_posts (
  week_end date PRIMARY KEY,
  posted_at timestamptz NOT NULL DEFAULT now()
);
