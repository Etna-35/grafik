-- Индивидуальная ставка сотрудника НА КОНКРЕТНЫЙ МЕСЯЦ (например су-шеф с июля дороже).
-- История не страдает: деньги хранятся в schedule_shifts.pay_amount по каждой смене;
-- ставка месяца влияет только на смены ЭТОГО месяца (новые + пересчёт текущих почасовых).
CREATE TABLE IF NOT EXISTS schedule_month_rates (
  year int NOT NULL,
  month int NOT NULL,
  employee_id uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  hourly_rate int NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (year, month, employee_id)
);
