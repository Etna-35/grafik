-- Цена за единицу заказа и подпись фасовки/веса для позиций каталога (для учёта и фудкоста).
ALTER TABLE requisition_catalog_items ADD COLUMN IF NOT EXISTS price numeric(10,2);
ALTER TABLE requisition_catalog_items ADD COLUMN IF NOT EXISTS pack_label text;
