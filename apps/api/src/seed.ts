import { pool, query } from "./db.js";
import { env } from "./env.js";
import { hashPin } from "./security.js";

const services = [
  ["schedule", "График", "/grafik"],
  ["shift_close", "Закрытие смены", "/smena"],
  ["tasks", "Задачи", "/tasks"],
  ["payroll", "Выплаты", "/payroll"],
  ["admin", "Админка", "/admin"]
] as const;

async function main(): Promise<void> {
  if (!env.ownerPin) {
    throw new Error("OWNER_PIN is required for seeding the first owner");
  }

  await pool.query("BEGIN");
  try {
    const employeeResult = await pool.query<{ id: string }>(
      `
        INSERT INTO employees (display_name, role, is_active)
        VALUES ($1, 'owner', true)
        ON CONFLICT (display_name) DO UPDATE
        SET role = 'owner', is_active = true, updated_at = now()
        RETURNING id
      `,
      [env.ownerName]
    );
    const ownerId = employeeResult.rows[0].id;
    const pinHash = await hashPin(env.ownerPin);

    await pool.query(
      `
        INSERT INTO employee_auth (employee_id, pin_hash, pin_changed_at)
        VALUES ($1, $2, now())
        ON CONFLICT (employee_id) DO UPDATE
        SET pin_hash = excluded.pin_hash,
            pin_changed_at = now(),
            failed_attempts = 0,
            locked_until = NULL
      `,
      [ownerId, pinHash]
    );

    for (const [code, title, url] of services) {
      await pool.query(
        `
          INSERT INTO services (code, title, url, is_active)
          VALUES ($1, $2, $3, true)
          ON CONFLICT (code) DO UPDATE
          SET title = excluded.title,
              url = excluded.url,
              is_active = true
        `,
        [code, title, url]
      );
    }

    await pool.query(
      `
        INSERT INTO employee_service_access (employee_id, service_id, can_view, can_edit)
        SELECT $1, id, true, true
        FROM services
        ON CONFLICT (employee_id, service_id) DO UPDATE
        SET can_view = true, can_edit = true
      `,
      [ownerId]
    );

    await pool.query("COMMIT");
    console.log(`Seeded owner ${env.ownerName}`);
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
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
