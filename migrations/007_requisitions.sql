DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'requisition_kind') THEN
    CREATE TYPE requisition_kind AS ENUM ('product', 'household');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'requisition_status') THEN
    CREATE TYPE requisition_status AS ENUM ('new', 'accepted', 'purchased', 'rejected');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS requisition_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind requisition_kind NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#2f7a52',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, kind)
);

CREATE TABLE IF NOT EXISTS requisition_catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL UNIQUE,
  category_id uuid REFERENCES requisition_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'шт',
  kind requisition_kind NOT NULL,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS requisitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid REFERENCES employees(id) ON DELETE SET NULL,
  status requisition_status NOT NULL DEFAULT 'new',
  comment text NOT NULL DEFAULT '',
  urgent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS requisition_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requisition_id uuid NOT NULL REFERENCES requisitions(id) ON DELETE CASCADE,
  catalog_item_id uuid REFERENCES requisition_catalog_items(id) ON DELETE SET NULL,
  free_name text NOT NULL DEFAULT '',
  qty numeric(10,2) NOT NULL CHECK (qty > 0),
  unit text NOT NULL DEFAULT 'шт',
  kind requisition_kind NOT NULL,
  category_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (catalog_item_id IS NOT NULL OR length(trim(free_name)) > 0)
);

CREATE INDEX IF NOT EXISTS requisition_categories_kind_sort_idx ON requisition_categories(kind, active, sort_order, name);
CREATE INDEX IF NOT EXISTS requisition_catalog_items_kind_idx ON requisition_catalog_items(kind, active, sort_order, name);
CREATE INDEX IF NOT EXISTS requisition_catalog_items_category_idx ON requisition_catalog_items(category_id);
CREATE INDEX IF NOT EXISTS requisitions_author_created_idx ON requisitions(author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS requisitions_status_created_idx ON requisitions(status, created_at DESC);
CREATE INDEX IF NOT EXISTS requisition_lines_requisition_idx ON requisition_lines(requisition_id);

INSERT INTO services (code, title, url, is_active)
VALUES ('requisition', 'Заявка продуктов', '/zayavka', true)
ON CONFLICT (code) DO UPDATE
SET title = excluded.title,
    url = excluded.url,
    is_active = true;

INSERT INTO employee_service_access (employee_id, service_id, can_view, can_edit)
SELECT e.id, s.id, true, e.role IN ('owner', 'manager')
FROM employees e
JOIN services s ON s.code = 'requisition'
WHERE e.is_active = true
  AND e.role IN ('owner', 'manager', 'cook', 'bar')
ON CONFLICT (employee_id, service_id) DO UPDATE
SET can_view = true,
    can_edit = employee_service_access.can_edit OR excluded.can_edit;

WITH category_seed(name, kind, sort_order, color, active) AS (
  VALUES
  ('Овощи', 'product'::requisition_kind, 1, '#5F8D4E', true),
  ('Соусы / бакалея / масла', 'product'::requisition_kind, 2, '#B07A1E', true),
  ('Молочные / сыры / яйца', 'product'::requisition_kind, 3, '#C89B3C', true),
  ('Зелень', 'product'::requisition_kind, 4, '#3F7A4F', true),
  ('Алкоголь', 'product'::requisition_kind, 5, '#8F2433', true),
  ('Консервация / закуски', 'product'::requisition_kind, 6, '#A6622E', true),
  ('Напитки', 'product'::requisition_kind, 7, '#2F6F6B', true),
  ('Гарниры / хлеб / заморозка', 'product'::requisition_kind, 8, '#8A6F4B', true),
  ('Мясо / птица / рыба', 'product'::requisition_kind, 9, '#9D2235', true),
  ('Орехи / семечки', 'product'::requisition_kind, 10, '#7A5C3A', true),
  ('Фрукты', 'product'::requisition_kind, 11, '#C98A2B', true),
  ('Салаты / грибы', 'product'::requisition_kind, 12, '#6B7D3A', true),
  ('Уборка / моющие', 'household'::requisition_kind, 101, '#5b6b86', true),
  ('Одноразовое', 'household'::requisition_kind, 102, '#7a5c3a', true),
  ('Бумага / салфетки', 'household'::requisition_kind, 103, '#8a6f4b', true),
  ('Инвентарь', 'household'::requisition_kind, 104, '#2f6f6b', true)
)
INSERT INTO requisition_categories (name, kind, sort_order, color, active)
SELECT name, kind, sort_order, color, active
FROM category_seed
ON CONFLICT (name, kind) DO UPDATE
SET sort_order = excluded.sort_order,
    color = excluded.color,
    active = excluded.active,
    updated_at = now();

WITH item_seed(source_id, category_name, name, unit, kind, active, sort_order) AS (
  VALUES
  ('p0001', 'Мясо / птица / рыба', 'Анчоусы', 'банка', 'product'::requisition_kind, true, 1),
  ('p0002', 'Овощи', 'Баклажан', 'кг', 'product'::requisition_kind, true, 2),
  ('p0003', 'Овощи', 'Батат', 'кг', 'product'::requisition_kind, true, 3),
  ('p0004', 'Овощи', 'Батат фри', 'уп/пакет', 'product'::requisition_kind, true, 4),
  ('p0005', 'Овощи', 'Вяленые томаты', 'банка', 'product'::requisition_kind, true, 5),
  ('p0006', 'Овощи', 'Вяленые томаты', 'кг', 'product'::requisition_kind, true, 6),
  ('p0007', 'Овощи', 'Дайкон маринованный', 'палка', 'product'::requisition_kind, true, 7),
  ('p0009', 'Овощи', 'Имбирь маринованный', 'кг', 'product'::requisition_kind, true, 8),
  ('p0011', 'Овощи', 'Имбирь свежий', 'кг', 'product'::requisition_kind, true, 9),
  ('p0012', 'Овощи', 'Каперсы', 'банка', 'product'::requisition_kind, true, 10),
  ('p0013', 'Овощи', 'Капуста белокочанная', 'кочан', 'product'::requisition_kind, true, 11),
  ('p0014', 'Овощи', 'Капуста красная', 'кочан', 'product'::requisition_kind, true, 12),
  ('p0015', 'Овощи', 'Картофель', 'кг', 'product'::requisition_kind, true, 13),
  ('p0016', 'Овощи', 'Криспи лук', 'кг', 'product'::requisition_kind, true, 14),
  ('p0018', 'Овощи', 'Лук репчатый', 'кг', 'product'::requisition_kind, true, 15),
  ('p0019', 'Овощи', 'Маслины', 'банка', 'product'::requisition_kind, true, 16),
  ('p0020', 'Овощи', 'Морковь', 'кг', 'product'::requisition_kind, true, 17),
  ('p0021', 'Консервация / закуски', 'Огурцы соленые', 'банка', 'product'::requisition_kind, true, 18),
  ('p0023', 'Овощи', 'Огурцы', 'кг', 'product'::requisition_kind, true, 19),
  ('p0024', 'Овощи', 'Оливки', 'банка', 'product'::requisition_kind, true, 20),
  ('p0026', 'Соусы / бакалея / масла', 'Паста Том Ям', 'шт', 'product'::requisition_kind, true, 21),
  ('p0027', 'Овощи', 'Перец болгарский', 'кг', 'product'::requisition_kind, true, 22),
  ('p0028', 'Овощи', 'Перец чили', 'шт', 'product'::requisition_kind, true, 23),
  ('p0029', 'Овощи', 'Редис', 'кг', 'product'::requisition_kind, true, 24),
  ('p0030', 'Овощи', 'Сельдерей', 'шт', 'product'::requisition_kind, true, 25),
  ('p0031', 'Соусы / бакалея / масла', 'Соус Сладкий чили', 'л', 'product'::requisition_kind, true, 26),
  ('p0032', 'Соусы / бакалея / масла', 'Томатная паста', 'банка', 'product'::requisition_kind, true, 27),
  ('p0035', 'Овощи', 'Томаты розовые', 'кг', 'product'::requisition_kind, true, 28),
  ('p0036', 'Соусы / бакалея / масла', 'Фасоль консервированная', 'банка', 'product'::requisition_kind, true, 29),
  ('p0037', 'Соусы / бакалея / масла', 'Халапеньо', 'уп', 'product'::requisition_kind, true, 30),
  ('p0038', 'Овощи', 'Хрен', 'кг', 'product'::requisition_kind, true, 31),
  ('p0039', 'Овощи', 'Цукини', 'кг', 'product'::requisition_kind, true, 32),
  ('p0040', 'Овощи', 'Черри', 'кг', 'product'::requisition_kind, true, 33),
  ('p0041', 'Овощи', 'Чеснок', 'кг', 'product'::requisition_kind, true, 34),
  ('p0042', 'Соусы / бакалея / масла', 'Чеснок сухой', 'кг', 'product'::requisition_kind, true, 35),
  ('p0043', 'Овощи', 'Чукка', 'кг', 'product'::requisition_kind, true, 36),
  ('p0045', 'Овощи', 'Эдамаме', 'кг', 'product'::requisition_kind, true, 37),
  ('p0047', 'Соусы / бакалея / масла', 'Ворчестер', 'шт', 'product'::requisition_kind, true, 38),
  ('p0048', 'Соусы / бакалея / масла', 'Горчица дижонская', 'шт', 'product'::requisition_kind, true, 39),
  ('p0049', 'Соусы / бакалея / масла', 'Горчица зернистая', 'шт', 'product'::requisition_kind, true, 40),
  ('p0051', 'Соусы / бакалея / масла', 'Жидкий дым', 'банка', 'product'::requisition_kind, true, 41),
  ('p0054', 'Соусы / бакалея / масла', 'Кетчуп', 'шт', 'product'::requisition_kind, true, 42),
  ('p0055', 'Соусы / бакалея / масла', 'Крахмал кукурузный', 'кг', 'product'::requisition_kind, true, 43),
  ('p0056', 'Соусы / бакалея / масла', 'Майонез', 'кг', 'product'::requisition_kind, true, 44),
  ('p0058', 'Соусы / бакалея / масла', 'Масло растительное / подсолнечное', 'л', 'product'::requisition_kind, true, 45),
  ('p0059', 'Соусы / бакалея / масла', 'Масло фритюрное', 'л', 'product'::requisition_kind, true, 46),
  ('p0060', 'Соусы / бакалея / масла', 'Мед', 'л', 'product'::requisition_kind, true, 47),
  ('p0062', 'Соусы / бакалея / масла', 'Наршараб', 'банка', 'product'::requisition_kind, true, 48),
  ('p0063', 'Соусы / бакалея / масла', 'Оливковое масло', 'бутылка', 'product'::requisition_kind, true, 49),
  ('p0064', 'Соусы / бакалея / масла', 'Паприка копчёная', 'пакет', 'product'::requisition_kind, true, 50),
  ('p0065', 'Соусы / бакалея / масла', 'Печенье шоколадное (для земли)', 'шт', 'product'::requisition_kind, true, 51),
  ('p0066', 'Соусы / бакалея / масла', 'Печенье Юбилейное (для картошки)', 'шт', 'product'::requisition_kind, true, 52),
  ('p0067', 'Соусы / бакалея / масла', 'Пудра сахарная', 'кг', 'product'::requisition_kind, true, 53),
  ('p0068', 'Соусы / бакалея / масла', 'Сахар', 'кг', 'product'::requisition_kind, true, 54),
  ('p0069', 'Соусы / бакалея / масла', 'Соевый соус', 'л', 'product'::requisition_kind, true, 55),
  ('p0070', 'Соусы / бакалея / масла', 'Соль', 'кг', 'product'::requisition_kind, true, 56),
  ('p0071', 'Соусы / бакалея / масла', 'Унаги', 'л', 'product'::requisition_kind, true, 57),
  ('p0072', 'Соусы / бакалея / масла', 'Устричный соус', 'л', 'product'::requisition_kind, true, 58),
  ('p0074', 'Соусы / бакалея / масла', 'Шрирача', 'бутылка', 'product'::requisition_kind, true, 59),
  ('p0075', 'Молочные / сыры / яйца', 'Камамбер', 'шт', 'product'::requisition_kind, true, 60),
  ('p0076', 'Молочные / сыры / яйца', 'Креметта', 'шт/шайба', 'product'::requisition_kind, true, 61),
  ('p0077', 'Молочные / сыры / яйца', 'Масло сливочное', 'кг', 'product'::requisition_kind, true, 62),
  ('p0078', 'Молочные / сыры / яйца', 'Молоко', 'л', 'product'::requisition_kind, true, 63),
  ('p0079', 'Молочные / сыры / яйца', 'Молоко кокосовое', 'л', 'product'::requisition_kind, true, 64),
  ('p0080', 'Молочные / сыры / яйца', 'Молоко миндальное', 'л', 'product'::requisition_kind, true, 65),
  ('p0081', 'Молочные / сыры / яйца', 'Мон Блю', 'уп', 'product'::requisition_kind, true, 66),
  ('p0082', 'Молочные / сыры / яйца', 'Моцарелла для пиццы', 'палка', 'product'::requisition_kind, true, 67),
  ('p0083', 'Молочные / сыры / яйца', 'Моцарелла рассольная', 'кг', 'product'::requisition_kind, true, 68),
  ('p0084', 'Молочные / сыры / яйца', 'Пармезан', 'кг', 'product'::requisition_kind, true, 69),
  ('p0085', 'Молочные / сыры / яйца', 'Ряженка', 'л', 'product'::requisition_kind, true, 70),
  ('p0086', 'Молочные / сыры / яйца', 'Сгущёнка', 'банка', 'product'::requisition_kind, true, 71),
  ('p0087', 'Молочные / сыры / яйца', 'Сливки 10%', 'л', 'product'::requisition_kind, true, 72),
  ('p0088', 'Молочные / сыры / яйца', 'Сливки 22%', 'л', 'product'::requisition_kind, true, 73),
  ('p0089', 'Молочные / сыры / яйца', 'Сливки 33%', 'л', 'product'::requisition_kind, true, 74),
  ('p0090', 'Молочные / сыры / яйца', 'Сметана', 'кг', 'product'::requisition_kind, true, 75),
  ('p0091', 'Молочные / сыры / яйца', 'Страчателла', 'банка', 'product'::requisition_kind, true, 76),
  ('p0092', 'Молочные / сыры / яйца', 'Сулугуни', 'палка', 'product'::requisition_kind, true, 77),
  ('p0093', 'Молочные / сыры / яйца', 'Сыр', 'кг', 'product'::requisition_kind, true, 78),
  ('p0094', 'Молочные / сыры / яйца', 'Фетакса', 'уп', 'product'::requisition_kind, true, 79),
  ('p0095', 'Молочные / сыры / яйца', 'Чеддер слайсы', 'уп', 'product'::requisition_kind, true, 80),
  ('p0096', 'Молочные / сыры / яйца', 'Яйца куриные', 'уп', 'product'::requisition_kind, true, 81),
  ('p0097', 'Зелень', 'Айсберг', 'шт', 'product'::requisition_kind, true, 82),
  ('p0098', 'Фрукты', 'Апельсины', 'кг', 'product'::requisition_kind, true, 83),
  ('p0099', 'Зелень', 'Вешенки', 'кг', 'product'::requisition_kind, true, 84),
  ('p0100', 'Зелень', 'Виноград', 'кг', 'product'::requisition_kind, true, 85),
  ('p0102', 'Зелень', 'Картофель', 'кг', 'product'::requisition_kind, true, 86),
  ('p0103', 'Зелень', 'Кинза', 'уп', 'product'::requisition_kind, true, 87),
  ('p0105', 'Фрукты', 'Лайм', 'кг', 'product'::requisition_kind, true, 88),
  ('p0106', 'Фрукты', 'Лимоны', 'кг', 'product'::requisition_kind, true, 89),
  ('p0107', 'Овощи', 'Лук красный', 'кг', 'product'::requisition_kind, true, 90),
  ('p0108', 'Зелень', 'Мята', 'уп', 'product'::requisition_kind, true, 91),
  ('p0109', 'Овощи', 'Огурцы', 'кг', 'product'::requisition_kind, true, 92),
  ('p0110', 'Зелень', 'Петрушка', 'уп', 'product'::requisition_kind, true, 93),
  ('p0111', 'Зелень', 'Розмарин', 'уп', 'product'::requisition_kind, true, 94),
  ('p0112', 'Овощи', 'Свекла', 'кг', 'product'::requisition_kind, true, 95),
  ('p0113', 'Зелень', 'Тимьян', 'уп', 'product'::requisition_kind, true, 96),
  ('p0114', 'Зелень', 'Укроп', 'уп', 'product'::requisition_kind, true, 97),
  ('p0116', 'Фрукты', 'Яблоки', 'кг', 'product'::requisition_kind, true, 98),
  ('p0121', 'Напитки', 'Вода газированная', 'л', 'product'::requisition_kind, true, 99),
  ('p0122', 'Напитки', 'Вода негазированная', 'л', 'product'::requisition_kind, true, 100),
  ('p0123', 'Алкоголь', 'Водка Белая Берёзка 40%', 'л', 'product'::requisition_kind, true, 101),
  ('p0125', 'Алкоголь', 'Джин Barrister Dry 40% 1 л', 'л', 'product'::requisition_kind, true, 102),
  ('p0126', 'Алкоголь', 'Пиво Б\А', 'шт', 'product'::requisition_kind, true, 103),
  ('p0127', 'Алкоголь', 'Пиво Лагер', 'шт', 'product'::requisition_kind, true, 104),
  ('p0128', 'Алкоголь', 'Пиво Пшеничное', 'шт', 'product'::requisition_kind, true, 105),
  ('p0129', 'Алкоголь', 'Пиво безалкогольное', 'л', 'product'::requisition_kind, true, 106),
  ('p0130', 'Алкоголь', 'Ром Higuana Silver 38% 0,7 л', 'шт', 'product'::requisition_kind, true, 107),
  ('p0131', 'Алкоголь', 'Сидр яблочный', 'шт', 'product'::requisition_kind, true, 108),
  ('p0132', 'Консервация / закуски', 'Ананасы консервированные', 'шт', 'product'::requisition_kind, true, 109),
  ('p0133', 'Консервация / закуски', 'Кетчуп', 'уп', 'product'::requisition_kind, true, 110),
  ('p0134', 'Консервация / закуски', 'Кукуруза вакуум', 'уп', 'product'::requisition_kind, true, 111),
  ('p0135', 'Консервация / закуски', 'Кукуруза консервированная', 'банка', 'product'::requisition_kind, true, 112),
  ('p0136', 'Консервация / закуски', 'Макароны', 'кг', 'product'::requisition_kind, true, 113),
  ('p0137', 'Консервация / закуски', 'Манго консервированное', 'л', 'product'::requisition_kind, true, 114),
  ('p0138', 'Консервация / закуски', 'Мед', 'кг', 'product'::requisition_kind, true, 115),
  ('p0139', 'Консервация / закуски', 'Наршараб', 'кг', 'product'::requisition_kind, true, 116),
  ('p0140', 'Консервация / закуски', 'Оливки / маслины', 'л', 'product'::requisition_kind, true, 117),
  ('p0141', 'Консервация / закуски', 'Персики консервированные', 'л', 'product'::requisition_kind, true, 118),
  ('p0144', 'Консервация / закуски', 'Тортильи / лепёшки', 'кг', 'product'::requisition_kind, true, 119),
  ('p0145', 'Консервация / закуски', 'Уксус', 'л', 'product'::requisition_kind, true, 120),
  ('p0146', 'Консервация / закуски', 'Халва', 'кг', 'product'::requisition_kind, true, 121),
  ('p0150', 'Напитки', 'Квас', 'л', 'product'::requisition_kind, true, 122),
  ('p0151', 'Напитки', 'Кола', 'л', 'product'::requisition_kind, true, 123),
  ('p0152', 'Напитки', 'Кофе', 'кг', 'product'::requisition_kind, true, 124),
  ('p0154', 'Напитки', 'Сок Яблочный', 'л', 'product'::requisition_kind, true, 125),
  ('p0155', 'Напитки', 'Сок Вишневый', 'л', 'product'::requisition_kind, true, 126),
  ('p0156', 'Напитки', 'Сок томатный', 'л', 'product'::requisition_kind, true, 127),
  ('p0157', 'Напитки', 'Тоник', 'л', 'product'::requisition_kind, true, 128),
  ('p0158', 'Напитки', 'Чай чёрный', 'кг', 'product'::requisition_kind, true, 129),
  ('p0159', 'Гарниры / хлеб / заморозка', 'Булгур', 'кг', 'product'::requisition_kind, true, 130),
  ('p0160', 'Гарниры / хлеб / заморозка', 'Булки бургер / бриошь', 'коробка', 'product'::requisition_kind, true, 131),
  ('p0161', 'Гарниры / хлеб / заморозка', 'Киноа', 'кг', 'product'::requisition_kind, true, 132),
  ('p0163', 'Гарниры / хлеб / заморозка', 'Лепешки роти', 'коробка', 'product'::requisition_kind, true, 133),
  ('p0164', 'Гарниры / хлеб / заморозка', 'Мука', 'кг', 'product'::requisition_kind, true, 134),
  ('p0165', 'Гарниры / хлеб / заморозка', 'Облепиха замороженная', 'кг', 'product'::requisition_kind, true, 135),
  ('p0166', 'Гарниры / хлеб / заморозка', 'Панко сухари', 'уп', 'product'::requisition_kind, true, 136),
  ('p0167', 'Гарниры / хлеб / заморозка', 'Рис бурый', 'кг', 'product'::requisition_kind, true, 137),
  ('p0168', 'Гарниры / хлеб / заморозка', 'Рис жасмин', 'уп', 'product'::requisition_kind, true, 138),
  ('p0171', 'Мясо / птица / рыба', 'Бекон', 'кг', 'product'::requisition_kind, true, 139),
  ('p0172', 'Мясо / птица / рыба', 'Гребешок', 'уп', 'product'::requisition_kind, true, 140),
  ('p0174', 'Мясо / птица / рыба', 'Колбаса Сервелат', 'шт', 'product'::requisition_kind, true, 141),
  ('p0175', 'Мясо / птица / рыба', 'Колбаса варёная', 'шт', 'product'::requisition_kind, true, 142),
  ('p0176', 'Мясо / птица / рыба', 'Креветки', 'блок', 'product'::requisition_kind, true, 143),
  ('p0177', 'Мясо / птица / рыба', 'Куриное филе', 'кг', 'product'::requisition_kind, true, 144),
  ('p0178', 'Мясо / птица / рыба', 'Курица тушка', 'кг', 'product'::requisition_kind, true, 145),
  ('p0179', 'Мясо / птица / рыба', 'Мачете', 'кг', 'product'::requisition_kind, true, 146),
  ('p0180', 'Мясо / птица / рыба', 'Ребрышки свиные', 'кг', 'product'::requisition_kind, true, 147),
  ('p0181', 'Мясо / птица / рыба', 'Тунец свежий', 'кг', 'product'::requisition_kind, true, 148),
  ('p0182', 'Мясо / птица / рыба', 'Фарш мраморный', 'кг', 'product'::requisition_kind, true, 149),
  ('p0183', 'Орехи / семечки', 'Грецкий орех', 'кг', 'product'::requisition_kind, true, 150),
  ('p0184', 'Орехи / семечки', 'Кедровые орехи', 'кг', 'product'::requisition_kind, true, 151),
  ('p0185', 'Орехи / семечки', 'Кешью', 'кг', 'product'::requisition_kind, true, 152),
  ('p0186', 'Орехи / семечки', 'Миндаль', 'кг', 'product'::requisition_kind, true, 153),
  ('p0188', 'Соусы / бакалея / масла', 'Ореховый / орехово-кунжутный соус', 'л', 'product'::requisition_kind, true, 154),
  ('p0189', 'Орехи / семечки', 'Тыквенные семечки', 'кг', 'product'::requisition_kind, true, 155),
  ('p0190', 'Фрукты', 'Авокадо', 'кг', 'product'::requisition_kind, true, 156),
  ('p0192', 'Фрукты', 'Гранат', 'шт', 'product'::requisition_kind, true, 157),
  ('p0193', 'Фрукты', 'Грейпфрут', 'шт', 'product'::requisition_kind, true, 158),
  ('p0194', 'Фрукты', 'Груша конференция', 'кг', 'product'::requisition_kind, true, 159),
  ('p0195', 'Фрукты', 'Лимон', 'кг', 'product'::requisition_kind, true, 160),
  ('p0198', 'Салаты / грибы', 'Вешенки', 'уп', 'product'::requisition_kind, true, 161),
  ('p0200', 'Зелень', 'Микс салат', 'уп', 'product'::requisition_kind, true, 162),
  ('p0201', 'Зелень', 'Романо', 'шт', 'product'::requisition_kind, true, 163),
  ('p0202', 'Салаты / грибы', 'Шампиньоны', 'кг', 'product'::requisition_kind, true, 164),
  ('h0001', 'Уборка / моющие', 'Средство для посуды', 'канистра', 'household'::requisition_kind, true, 165),
  ('h0002', 'Уборка / моющие', 'Средство для пола', 'канистра', 'household'::requisition_kind, true, 166),
  ('h0003', 'Уборка / моющие', 'Губки кухонные', 'упак', 'household'::requisition_kind, true, 167),
  ('h0004', 'Одноразовое', 'Перчатки нитрил, M', 'упак', 'household'::requisition_kind, true, 168),
  ('h0005', 'Одноразовое', 'Стаканы 200 мл', 'упак', 'household'::requisition_kind, true, 169),
  ('h0006', 'Бумага / салфетки', 'Салфетки бумажные', 'упак', 'household'::requisition_kind, true, 170),
  ('h0007', 'Бумага / салфетки', 'Бумажные полотенца', 'рулон', 'household'::requisition_kind, true, 171),
  ('h0008', 'Инвентарь', 'Мешки для мусора 60 л', 'рулон', 'household'::requisition_kind, true, 172)
)
INSERT INTO requisition_catalog_items (source_id, category_id, name, unit, kind, active, sort_order)
SELECT i.source_id, c.id, i.name, i.unit, i.kind, i.active, i.sort_order
FROM item_seed i
JOIN requisition_categories c ON c.name = i.category_name AND c.kind = i.kind
ON CONFLICT (source_id) DO UPDATE
SET category_id = excluded.category_id,
    name = excluded.name,
    unit = excluded.unit,
    kind = excluded.kind,
    active = excluded.active,
    sort_order = excluded.sort_order,
    updated_at = now();
