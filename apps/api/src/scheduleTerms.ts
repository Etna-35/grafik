import { pool } from './db.js';

export type EmploymentTerms = {
  employeeId: string; effectiveMonth: string;
  scheduleRole: 'cook' | 'bar' | 'waiter' | 'dish' | 'other'; rate: number | null;
};

// Один выделенный connection: снимок прежних условий и перевод атомарны.
export async function saveEmploymentTerms(data: EmploymentTerms, actorId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const employee = await client.query(
      'SELECT id, schedule_role, role::text, hourly_rate FROM employees WHERE id = $1 AND is_active = true FOR UPDATE',
      [data.employeeId]
    );
    if (!employee.rows[0]) throw new Error('employee_not_found');
    const e = employee.rows[0];
    // Сохраняем исходные условия ДО первого перевода, чтобы прошлое не зависело от карточки.
    await client.query(`INSERT INTO schedule_employment_terms
      (employee_id, effective_month, schedule_role, hourly_rate, created_by)
      SELECT $1, '1900-01-01', $2, $3, $4
      WHERE NOT EXISTS (SELECT 1 FROM schedule_employment_terms WHERE employee_id = $1)
      ON CONFLICT DO NOTHING`,
      [data.employeeId, e.schedule_role === 'dishwasher' || e.role === 'dishwasher' && !e.schedule_role
        ? 'dish' : e.schedule_role || (['cook', 'bar', 'waiter', 'other'].includes(e.role) ? e.role : 'other'),
        e.hourly_rate, actorId]);
    await client.query(`INSERT INTO schedule_employment_terms
      (employee_id, effective_month, schedule_role, hourly_rate, created_by)
      VALUES ($1, $2::date, $3, $4, $5)
      ON CONFLICT (employee_id, effective_month) DO UPDATE SET
        schedule_role = excluded.schedule_role, hourly_rate = excluded.hourly_rate, updated_at = now()`,
      [data.employeeId, data.effectiveMonth + '-01', data.scheduleRole, data.scheduleRole === 'dish' ? null : data.rate, actorId]);
    await client.query('COMMIT');
    return { ok: true, existingShiftsRecomputed: 0 };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
