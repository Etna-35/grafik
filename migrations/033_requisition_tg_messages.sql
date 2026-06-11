-- Единое общее сообщение заявок в Telegram за день (П10): бот редактирует одно сообщение,
-- пока сотрудники добавляют/правят заявки. batch_date = день оформления (МСК).
-- snapshot — последний опубликованный набор позиций (для диффа ➕ добавлено / ➖ удалено).
CREATE TABLE IF NOT EXISTS requisition_tg_messages (
  batch_date date PRIMARY KEY,
  chat_id text NOT NULL,
  message_id text NOT NULL,
  snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
