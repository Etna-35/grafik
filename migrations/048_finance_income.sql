-- Прочие поступления: доход проекта МИМО закрытия смены (корпоратив в закрытый день,
-- аренда зала под съёмку и т.п.). Ручной ввод руководителем в разделе «Финансы».
--
-- ВАЖНО (чтобы не сломать формулы): эти суммы входят в выручку МЕСЯЦА (P&L, фудкост),
-- но НЕ участвуют в средних по дням недели (прогноз выручки) и НЕ увеличивают конверты
-- Кассы — это разовые нерегулярные поступления, они не ведут себя как сменная выручка.
CREATE TABLE IF NOT EXISTS finance_income (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Europe/Moscow')::date,
  source text NOT NULL,                          -- корпоратив / аренда / прочее
  amount integer NOT NULL CHECK (amount > 0),
  is_cash boolean NOT NULL DEFAULT true,         -- наличные или безнал
  comment text,
  created_by uuid REFERENCES employees(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS finance_income_month_idx ON finance_income (entry_date);
