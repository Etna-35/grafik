import { pool, query } from "./db.js";
import { env } from "./env.js";
import { hashPin } from "./security.js";

const services = [
  ["schedule", "График", "/grafik"],
  ["shift_close", "Закрытие смены", "/smena"],
  ["tasks", "Задачи", "/tasks"],
  ["training", "Обучение", "/training"],
  ["requisition", "Заявка продуктов", "/zayavka"],
  ["payroll", "Выплаты", "/payroll"],
  ["admin", "Админка", "/admin"]
] as const;

async function main(): Promise<void> {
  if (!env.ownerPin) {
    throw new Error("OWNER_PIN is required for seeding the first owner");
  }

  await pool.query("BEGIN");
  try {
    // Имена сотрудников больше не уникальны (миграция 017), поэтому владельца
    // ищем по роли, а не апсертом по display_name. Существующее имя не затираем —
    // владелец мог переименовать себя.
    let ownerId: string;
    const existingOwner = await pool.query<{ id: string }>(
      "SELECT id FROM employees WHERE role = 'owner' LIMIT 1"
    );
    if (existingOwner.rows[0]) {
      ownerId = existingOwner.rows[0].id;
      await pool.query("UPDATE employees SET is_active = true, updated_at = now() WHERE id = $1", [ownerId]);
    } else {
      const byName = await pool.query<{ id: string }>(
        "SELECT id FROM employees WHERE display_name = $1 LIMIT 1",
        [env.ownerName]
      );
      if (byName.rows[0]) {
        ownerId = byName.rows[0].id;
        await pool.query("UPDATE employees SET role = 'owner', is_active = true, updated_at = now() WHERE id = $1", [ownerId]);
      } else {
        const inserted = await pool.query<{ id: string }>(
          "INSERT INTO employees (display_name, role, is_active) VALUES ($1, 'owner', true) RETURNING id",
          [env.ownerName]
        );
        ownerId = inserted.rows[0].id;
      }
    }
    // PIN владельца ставим ОДИН РАЗ — при первом создании учётки. Дальше seed его не трогает,
    // иначе каждый деплой откатывал бы PIN, который владелец сменил в приложении (так и было до
    // 2026-07-30). Аварийный сброс (владелец забыл PIN): выставить OWNER_PIN_RESET=1 в .env,
    // перезапустить api, затем УБРАТЬ переменную — иначе следующий деплой снова перезапишет PIN.
    const pinHash = await hashPin(env.ownerPin);
    const forceReset = process.env.OWNER_PIN_RESET === "1" || process.env.OWNER_PIN_RESET === "true";

    const authResult = await pool.query(
      `
        INSERT INTO employee_auth (employee_id, pin_hash, pin_changed_at)
        VALUES ($1, $2, now())
        ON CONFLICT (employee_id) DO NOTHING
      `,
      [ownerId, pinHash]
    );
    if (authResult.rowCount === 0 && forceReset) {
      await pool.query(
        `
          UPDATE employee_auth
          SET pin_hash = $2, pin_changed_at = now(), failed_attempts = 0, locked_until = NULL
          WHERE employee_id = $1
        `,
        [ownerId, pinHash]
      );
      console.log("OWNER_PIN_RESET: PIN владельца перезаписан значением из OWNER_PIN");
    } else if (authResult.rowCount === 0) {
      console.log("PIN владельца не тронут (учётка уже существует)");
    } else {
      console.log("PIN владельца установлен впервые из OWNER_PIN");
    }

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
