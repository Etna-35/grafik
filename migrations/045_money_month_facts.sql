-- Раздел «Деньги» (owner-only) — замена «Кассы».
-- Единственная сущность с ручным вводом: закуп (продукты + бар) за месяц, одной цифрой.
-- Всё остальное считается из уже имеющихся данных (закрытия смен, график, finance_fixed).
CREATE TABLE IF NOT EXISTS money_month_facts (
  month date PRIMARY KEY,                -- 1-е число месяца
  purchase_amount integer,               -- закуп за месяц, ₽ (NULL = не введено, показываем оценку)
  note text NOT NULL DEFAULT '',
  updated_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
