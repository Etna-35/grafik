import { pool, query } from "./db.js";
import { productCategories, productSeed } from "./data/productCatalog.js";

// Импорт продуктовой матрицы (цены/единицы/фасовка) из productCatalog.ts.
// ЗАМЕНА: деактивирует старые product-категории/позиции, грузит новые. Идемпотентно (source_id стабилен).
// Запуск вручную после деплоя:
//   docker compose exec -T api node apps/api/dist/importProductCatalog.js

async function main(): Promise<void> {
  await pool.query("BEGIN");
  try {
    // Чистим старый продуктовый каталог (household не трогаем).
    await pool.query("UPDATE requisition_catalog_items SET active = false WHERE kind = 'product'");
    await pool.query("UPDATE requisition_categories SET active = false WHERE kind = 'product'");

    const catId = new Map<string, string>();
    let order = 0;
    for (const name of productCategories) {
      const res = await pool.query<{ id: string }>(
        `INSERT INTO requisition_categories (name, kind, sort_order, active)
         VALUES ($1, 'product', $2, true)
         ON CONFLICT (name, kind) DO UPDATE SET active = true, sort_order = EXCLUDED.sort_order
         RETURNING id`,
        [name, order++]
      );
      catId.set(name, res.rows[0].id);
    }

    let n = 0;
    let itemOrder = 0;
    for (const it of productSeed) {
      const cid = catId.get(it.category);
      if (!cid) continue;
      await pool.query(
        `INSERT INTO requisition_catalog_items (source_id, category_id, name, unit, kind, sort_order, active, price, pack_label)
         VALUES ($1, $2, $3, $4, 'product', $5, true, $6, $7)
         ON CONFLICT (source_id) DO UPDATE
         SET category_id = EXCLUDED.category_id, name = EXCLUDED.name, unit = EXCLUDED.unit,
             sort_order = EXCLUDED.sort_order, active = true, price = EXCLUDED.price, pack_label = EXCLUDED.pack_label`,
        [it.sourceId, cid, it.name, it.unit || "шт", itemOrder++, it.price, it.pack || null]
      );
      n += 1;
    }

    await pool.query("COMMIT");
    console.log(`Product catalog imported: ${productCategories.length} categories, ${n} items`);
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  }
  await pool.end();
}

main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
