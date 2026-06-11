// Автоген из docs/catalog-products-filled.csv (продуктовая матрица с ценами). Не редактировать вручную.
export type ProductSeed = { sourceId: string; category: string; name: string; unit: string; pack: string; price: number | null };
export const productCategories: string[] = ["Овощи", "Соусы / бакалея / масла", "Молочные / сыры / яйца", "Зелень", "Алкоголь", "Консервация / закуски", "Напитки", "Гарниры / хлеб / заморозка", "Мясо / птица / рыба", "Орехи / семечки", "Фрукты", "Салаты / грибы", "Специи, сухие смеси, соль, сахар"];
export const productSeed: ProductSeed[] = [
{
"sourceId": "p1e14876d00a",
"category": "Овощи",
"name": "Баклажан",
"unit": "кг",
"pack": "1 кг",
"price": 278.0
},
{
"sourceId": "pd4e5188ba5a",
"category": "Овощи",
"name": "Батат",
"unit": "кг",
"pack": "1 кг",
"price": 470.0
},
{
"sourceId": "p0b7489be1f4",
"category": "Овощи",
"name": "Батат фри",
"unit": "пакет",
"pack": "2,5 кг",
"price": 1078.54
},
{
"sourceId": "p2af3bc2497f",
"category": "Овощи",
"name": "Вяленые томаты",
"unit": "банка",
"pack": "0,98 л",
"price": 533.6
},
{
"sourceId": "p4c93361b444",
"category": "Овощи",
"name": "Дайкон маринованный",
"unit": "упаковка",
"pack": "0,5 кг",
"price": 200.0
},
{
"sourceId": "pc6592d067bf",
"category": "Овощи",
"name": "Имбирь маринованный",
"unit": "кг",
"pack": "1 кг",
"price": 164.0
},
{
"sourceId": "pd63e20e768d",
"category": "Овощи",
"name": "Имбирь свежий",
"unit": "кг",
"pack": "0,1 кг",
"price": 49.5
},
{
"sourceId": "padc3986f94e",
"category": "Овощи",
"name": "Каперсы",
"unit": "банка",
"pack": "0,5 кг",
"price": 1250.0
},
{
"sourceId": "pf6a5f70e627",
"category": "Овощи",
"name": "Капуста белокочанная",
"unit": "кочан",
"pack": "1,5 кг",
"price": 72.0
},
{
"sourceId": "p6502740ab89",
"category": "Овощи",
"name": "Капуста красная",
"unit": "кочан",
"pack": "1,5 кг",
"price": 165.0
},
{
"sourceId": "p9fa88204d8d",
"category": "Овощи",
"name": "Картофель",
"unit": "кг",
"pack": "1 кг",
"price": 35.0
},
{
"sourceId": "pe8638ec2688",
"category": "Овощи",
"name": "Криспи лук",
"unit": "кг",
"pack": "1 кг",
"price": 500.0
},
{
"sourceId": "pcfea3ec044e",
"category": "Овощи",
"name": "Лук репчатый",
"unit": "кг",
"pack": "1 кг",
"price": 40.0
},
{
"sourceId": "pff551d8e4f3",
"category": "Овощи",
"name": "Маслины",
"unit": "банка",
"pack": "0,3 л",
"price": 98.0
},
{
"sourceId": "p9c28bdfb4ed",
"category": "Овощи",
"name": "Морковь",
"unit": "кг",
"pack": "1 кг",
"price": 48.0
},
{
"sourceId": "pcb9c1148c8e",
"category": "Овощи",
"name": "Огурцы",
"unit": "кг",
"pack": "1 кг",
"price": 180.0
},
{
"sourceId": "p8b543443d3c",
"category": "Овощи",
"name": "Оливки",
"unit": "банка",
"pack": "0,3 л",
"price": 105.0
},
{
"sourceId": "p4cb22840cda",
"category": "Овощи",
"name": "Перец болгарский",
"unit": "кг",
"pack": "1 кг",
"price": 260.0
},
{
"sourceId": "p46840b57d0f",
"category": "Овощи",
"name": "Перец чили",
"unit": "кг",
"pack": "1 кг",
"price": 1000.0
},
{
"sourceId": "p39dfe7b2c19",
"category": "Овощи",
"name": "Редис",
"unit": "кг",
"pack": "1 кг",
"price": 230.0
},
{
"sourceId": "p1d6a6eb34fc",
"category": "Овощи",
"name": "Сельдерей",
"unit": "пучок",
"pack": "0,2 кг",
"price": 46.0
},
{
"sourceId": "pebdc171f22c",
"category": "Овощи",
"name": "Томаты розовые",
"unit": "кг",
"pack": "1 кг",
"price": 380.0
},
{
"sourceId": "p0cd5dad8c28",
"category": "Овощи",
"name": "Хрен корень",
"unit": "кг",
"pack": "0,1 кг",
"price": 300.0
},
{
"sourceId": "pb19947dc19b",
"category": "Овощи",
"name": "Цукини",
"unit": "кг",
"pack": "1 кг",
"price": 390.0
},
{
"sourceId": "pb8cfd2f6d53",
"category": "Овощи",
"name": "Черри помидоры",
"unit": "кг",
"pack": "1 кг",
"price": 600.0
},
{
"sourceId": "p8d20595b32c",
"category": "Овощи",
"name": "Чеснок",
"unit": "кг",
"pack": "1 кг",
"price": 300.0
},
{
"sourceId": "p8d6c5c801b0",
"category": "Овощи",
"name": "Чукка",
"unit": "кг",
"pack": "1 кг",
"price": 218.0
},
{
"sourceId": "pf2e81b530b3",
"category": "Овощи",
"name": "Бобы Эдамаме",
"unit": "кг",
"pack": "1 кг",
"price": 520.0
},
{
"sourceId": "pfaa9260308f",
"category": "Овощи",
"name": "Лук красный",
"unit": "кг",
"pack": "1 кг",
"price": 80.0
},
{
"sourceId": "pb47f573d09e",
"category": "Овощи",
"name": "Свекла",
"unit": "кг",
"pack": "1 кг",
"price": 35.0
},
{
"sourceId": "p1edb730f7e4",
"category": "Овощи",
"name": "Авокадо",
"unit": "шт",
"pack": "0,2 кг",
"price": 104.0
},
{
"sourceId": "p4cc45f789e3",
"category": "Овощи",
"name": "Ананас",
"unit": "шт",
"pack": "1,2 кг",
"price": 480.0
},
{
"sourceId": "p1bd30d1ff2c",
"category": "Овощи",
"name": "Базилик",
"unit": "пучок",
"pack": "0,05 кг",
"price": 140.0
},
{
"sourceId": "p5dfe9d22f83",
"category": "Овощи",
"name": "Брокколи",
"unit": "кг",
"pack": "1 кг",
"price": 480.0
},
{
"sourceId": "p34ae89960de",
"category": "Овощи",
"name": "Горох консервированный",
"unit": "банка",
"pack": "0,4 кг",
"price": 80.0
},
{
"sourceId": "pc705a50c112",
"category": "Овощи",
"name": "Горох сухой",
"unit": "кг",
"pack": "1 кг",
"price": 100.0
},
{
"sourceId": "p4027043852f",
"category": "Овощи",
"name": "Греча зеленая",
"unit": "кг",
"pack": "1 кг",
"price": 330.0
},
{
"sourceId": "p1390683f32a",
"category": "Овощи",
"name": "Гриб белый (заморозка)",
"unit": "кг",
"pack": "1 кг",
"price": 793.0
},
{
"sourceId": "pfe4ae40a8e7",
"category": "Овощи",
"name": "Гриб Лисички (заморозка)",
"unit": "кг",
"pack": "1 кг",
"price": 825.0
},
{
"sourceId": "p2aceb6eb2bd",
"category": "Овощи",
"name": "Грибы древесные Муэр",
"unit": "пачка",
"pack": "0,5 кг",
"price": 1160.0
},
{
"sourceId": "pb1bfcb708d1",
"category": "Овощи",
"name": "Грибы еноки",
"unit": "упаковка",
"pack": "0,1 кг",
"price": null
},
{
"sourceId": "p1713729e159",
"category": "Овощи",
"name": "Грибы цау гу",
"unit": "банка",
"pack": "0,4 кг",
"price": 264.0
},
{
"sourceId": "pea7ac567730",
"category": "Овощи",
"name": "Грузди маринованные",
"unit": "банка",
"pack": "0,5 кг",
"price": 300.0
},
{
"sourceId": "pd170fb745fc",
"category": "Овощи",
"name": "Капуста квашеная",
"unit": "кг",
"pack": "1 кг",
"price": 163.0
},
{
"sourceId": "p970abe509c9",
"category": "Овощи",
"name": "Капуста цветная",
"unit": "кг",
"pack": "1 кг",
"price": 230.0
},
{
"sourceId": "p6f7f4e76303",
"category": "Овощи",
"name": "Картофель бейби",
"unit": "кг",
"pack": "1 кг",
"price": 110.0
},
{
"sourceId": "pccb8fda2e55",
"category": "Овощи",
"name": "Картофель фри",
"unit": "пакет",
"pack": "2,5 кг",
"price": 435.0
},
{
"sourceId": "pa7fec3a8d1b",
"category": "Овощи",
"name": "Клубника (заморозка)",
"unit": "кг",
"pack": "1 кг",
"price": 195.0
},
{
"sourceId": "p3bc69a88eab",
"category": "Овощи",
"name": "Клубника свежая",
"unit": "кг",
"pack": "1 кг",
"price": 700.0
},
{
"sourceId": "pc97c4d486c8",
"category": "Овощи",
"name": "Клюква (заморозка)",
"unit": "кг",
"pack": "1 кг",
"price": 445.0
},
{
"sourceId": "pe3d4142a265",
"category": "Овощи",
"name": "Кукуруза в вакууме",
"unit": "шт",
"pack": "0,3 кг",
"price": 140.0
},
{
"sourceId": "p55852905839",
"category": "Овощи",
"name": "Лук зеленый",
"unit": "пучок",
"pack": "0,1 кг",
"price": 38.0
},
{
"sourceId": "p0747e53eb84",
"category": "Овощи",
"name": "Лук порей",
"unit": "пучок",
"pack": "0,3 кг",
"price": 144.0
},
{
"sourceId": "p7752e15b4f5",
"category": "Овощи",
"name": "Малина (заморозка)",
"unit": "кг",
"pack": "1 кг",
"price": 420.0
},
{
"sourceId": "pc508cbce720",
"category": "Овощи",
"name": "Нут",
"unit": "кг",
"pack": "1 кг",
"price": 341.0
},
{
"sourceId": "pd8b5efc2941",
"category": "Овощи",
"name": "Огурцы корнишоны",
"unit": "банка",
"pack": "0,72 л",
"price": 178.0
},
{
"sourceId": "p5171c8756e8",
"category": "Овощи",
"name": "Оливки гигантские",
"unit": "банка",
"pack": "0,42 кг",
"price": 426.0
},
{
"sourceId": "pe7e7930805f",
"category": "Овощи",
"name": "Пекинская капуста",
"unit": "кочан",
"pack": "0,8 кг",
"price": 80.0
},
{
"sourceId": "p3ca500fe2d2",
"category": "Овощи",
"name": "Рамиро",
"unit": "шт",
"pack": "0,15 кг",
"price": 39.0
},
{
"sourceId": "p5367807ef83",
"category": "Овощи",
"name": "Рис Рубин (красный)",
"unit": "кг",
"pack": "1 кг",
"price": 180.0
},
{
"sourceId": "pb629e97e9c4",
"category": "Овощи",
"name": "Тыква",
"unit": "кг",
"pack": "1 кг",
"price": 155.0
},
{
"sourceId": "pc8a56317e17",
"category": "Овощи",
"name": "Черная смородина (заморозка)",
"unit": "кг",
"pack": "1 кг",
"price": 590.0
},
{
"sourceId": "pfb8c4874df6",
"category": "Овощи",
"name": "Чечевица",
"unit": "кг",
"pack": "1 кг",
"price": 63.0
},
{
"sourceId": "p492d5f8b4df",
"category": "Соусы / бакалея / масла",
"name": "Паста Том Ям",
"unit": "банка",
"pack": "0,2 кг",
"price": 300.0
},
{
"sourceId": "p4d791e0e8d0",
"category": "Соусы / бакалея / масла",
"name": "Соус Сладкий чили",
"unit": "л",
"pack": "1 л",
"price": 360.0
},
{
"sourceId": "p2c413c7d58f",
"category": "Соусы / бакалея / масла",
"name": "Томатная паста",
"unit": "банка",
"pack": "0,5 кг",
"price": 190.0
},
{
"sourceId": "p0bfd45ef806",
"category": "Соусы / бакалея / масла",
"name": "Фасоль консервированная",
"unit": "банка",
"pack": "0,4 кг",
"price": 52.0
},
{
"sourceId": "p483756dc885",
"category": "Соусы / бакалея / масла",
"name": "Халапеньо",
"unit": "кг",
"pack": "1 кг",
"price": 550.0
},
{
"sourceId": "pcc668bb57b0",
"category": "Соусы / бакалея / масла",
"name": "Чеснок сухой",
"unit": "кг",
"pack": "1 кг",
"price": 675.0
},
{
"sourceId": "p650614e931c",
"category": "Соусы / бакалея / масла",
"name": "Ворчестер",
"unit": "банка",
"pack": "0,2 л",
"price": 95.0
},
{
"sourceId": "p4f6df0fb072",
"category": "Соусы / бакалея / масла",
"name": "Горчица дижонская",
"unit": "банка",
"pack": "0,2 кг",
"price": 200.0
},
{
"sourceId": "p0d857a11ce2",
"category": "Соусы / бакалея / масла",
"name": "Горчица зернистая",
"unit": "банка",
"pack": "0,2 кг",
"price": 200.0
},
{
"sourceId": "p99d531147cb",
"category": "Соусы / бакалея / масла",
"name": "Жидкий дым",
"unit": "банка",
"pack": "0,33 л",
"price": 136.6
},
{
"sourceId": "p9d6d89b1f63",
"category": "Соусы / бакалея / масла",
"name": "Кетчуп",
"unit": "бутылка",
"pack": "0,8 кг",
"price": 203.0
},
{
"sourceId": "pa4901c61e8f",
"category": "Соусы / бакалея / масла",
"name": "Крахмал кукурузный",
"unit": "кг",
"pack": "1 кг",
"price": 134.0
},
{
"sourceId": "pee3a934f2ae",
"category": "Соусы / бакалея / масла",
"name": "Майонез фасовка",
"unit": "пакет",
"pack": "3 кг",
"price": 500.0
},
{
"sourceId": "p781549e2c0d",
"category": "Соусы / бакалея / масла",
"name": "Масло растительное",
"unit": "л",
"pack": "1 л",
"price": 115.0
},
{
"sourceId": "paec73361b06",
"category": "Соусы / бакалея / масла",
"name": "Масло фритюрное",
"unit": "л",
"pack": "5 л",
"price": 725.0
},
{
"sourceId": "p29c0648ce6c",
"category": "Соусы / бакалея / масла",
"name": "Мед",
"unit": "л",
"pack": "0,5 л",
"price": 157.0
},
{
"sourceId": "p127a2bfcd63",
"category": "Соусы / бакалея / масла",
"name": "Наршараб",
"unit": "банка",
"pack": "0,3 кг",
"price": 87.0
},
{
"sourceId": "p57ecbff868f",
"category": "Соусы / бакалея / масла",
"name": "Оливковое масло",
"unit": "бутылка",
"pack": "1 л",
"price": 440.0
},
{
"sourceId": "pef6bcc2e5be",
"category": "Соусы / бакалея / масла",
"name": "Паприка копчёная",
"unit": "кг",
"pack": "1 кг",
"price": 1279.0
},
{
"sourceId": "p605799f8532",
"category": "Соусы / бакалея / масла",
"name": "Печенье шоколадное",
"unit": "пачка",
"pack": "0,4 кг",
"price": 140.0
},
{
"sourceId": "p0103ed79643",
"category": "Соусы / бакалея / масла",
"name": "Печенье Юбилейное",
"unit": "пачка",
"pack": "0,4 кг",
"price": 140.0
},
{
"sourceId": "pf6622e635db",
"category": "Соусы / бакалея / масла",
"name": "Пудра сахарная",
"unit": "кг",
"pack": "1 кг",
"price": 116.0
},
{
"sourceId": "p61e85f1da6c",
"category": "Соусы / бакалея / масла",
"name": "Сахар",
"unit": "кг",
"pack": "1 кг",
"price": 80.0
},
{
"sourceId": "pc906048f909",
"category": "Соусы / бакалея / масла",
"name": "Соевый соус",
"unit": "л",
"pack": "1 л",
"price": 89.0
},
{
"sourceId": "pe055b07bca5",
"category": "Соусы / бакалея / масла",
"name": "Соль",
"unit": "кг",
"pack": "1 кг",
"price": 29.0
},
{
"sourceId": "p9ffc51c2f0b",
"category": "Соусы / бакалея / масла",
"name": "Унаги",
"unit": "бутылка",
"pack": "1 л",
"price": 300.0
},
{
"sourceId": "p66cdf657d24",
"category": "Соусы / бакалея / масла",
"name": "Устричный соус",
"unit": "л",
"pack": "1 л",
"price": 300.0
},
{
"sourceId": "pd7ef880f790",
"category": "Соусы / бакалея / масла",
"name": "Шрирача",
"unit": "бутылка",
"pack": "1 л",
"price": 450.0
},
{
"sourceId": "peeebc9a1eac",
"category": "Соусы / бакалея / масла",
"name": "Орехово-кунжутный соус",
"unit": "бутылка",
"pack": "1 л",
"price": 500.0
},
{
"sourceId": "p34a486ce78e",
"category": "Соусы / бакалея / масла",
"name": "Паста Карри",
"unit": "кг",
"pack": "1 кг",
"price": 750.0
},
{
"sourceId": "pdb08421ca4e",
"category": "Соусы / бакалея / масла",
"name": "Паста соевая",
"unit": "кг",
"pack": "1 кг",
"price": 258.0
},
{
"sourceId": "pf03d78c25a8",
"category": "Молочные / сыры / яйца",
"name": "Сыр Камамбер",
"unit": "головка",
"pack": "0,125 кг",
"price": 210.0
},
{
"sourceId": "p50cf1a05cd0",
"category": "Молочные / сыры / яйца",
"name": "Масло сливочное",
"unit": "пачка",
"pack": "0,2 кг",
"price": 217.0
},
{
"sourceId": "pda5aa4e7d09",
"category": "Молочные / сыры / яйца",
"name": "Молоко",
"unit": "л",
"pack": "1 л",
"price": 90.0
},
{
"sourceId": "p19b1333abc4",
"category": "Молочные / сыры / яйца",
"name": "Молоко кокосовое",
"unit": "л",
"pack": "1 л",
"price": 171.0
},
{
"sourceId": "p5e95e17efb3",
"category": "Молочные / сыры / яйца",
"name": "Молоко миндальное",
"unit": "л",
"pack": "1 л",
"price": 116.0
},
{
"sourceId": "p84412b8f830",
"category": "Молочные / сыры / яйца",
"name": "Мон Блю",
"unit": "упаковка",
"pack": "1,8 кг",
"price": 2343.0
},
{
"sourceId": "pec3e27a7a35",
"category": "Молочные / сыры / яйца",
"name": "Моцарелла для пиццы",
"unit": "палка",
"pack": "0,2 кг",
"price": 135.0
},
{
"sourceId": "p2cc75205f58",
"category": "Молочные / сыры / яйца",
"name": "Моцарелла рассольная",
"unit": "пакет",
"pack": "0,1 кг",
"price": 63.0
},
{
"sourceId": "pd36385193e3",
"category": "Молочные / сыры / яйца",
"name": "Пармезан",
"unit": "головка",
"pack": "4 кг",
"price": 3880.0
},
{
"sourceId": "p9690bc877dc",
"category": "Молочные / сыры / яйца",
"name": "Ряженка",
"unit": "л",
"pack": "0,5 л",
"price": 55.0
},
{
"sourceId": "p58eeeb3f2d1",
"category": "Молочные / сыры / яйца",
"name": "Сгущёнка",
"unit": "банка",
"pack": "0,5 кг",
"price": 146.0
},
{
"sourceId": "pbf7de91d959",
"category": "Молочные / сыры / яйца",
"name": "Сливки 10%",
"unit": "л",
"pack": "0,5 л",
"price": 113.0
},
{
"sourceId": "p0408d15dc46",
"category": "Молочные / сыры / яйца",
"name": "Сливки 22%",
"unit": "л",
"pack": "1 л",
"price": 424.0
},
{
"sourceId": "p2c4e6fddaf1",
"category": "Молочные / сыры / яйца",
"name": "Сливки 33%",
"unit": "л",
"pack": "1 л",
"price": 514.0
},
{
"sourceId": "p0ed12f28f9b",
"category": "Молочные / сыры / яйца",
"name": "Сметана",
"unit": "кг",
"pack": "1 кг",
"price": 226.0
},
{
"sourceId": "p2faca4aa453",
"category": "Молочные / сыры / яйца",
"name": "Страчателла",
"unit": "банка",
"pack": "0,2 кг",
"price": 368.0
},
{
"sourceId": "p3af901eb95b",
"category": "Молочные / сыры / яйца",
"name": "Сулугуни",
"unit": "палка",
"pack": "0,3 кг",
"price": 174.0
},
{
"sourceId": "pa3be2b1bbde",
"category": "Молочные / сыры / яйца",
"name": "Фетакса",
"unit": "упаковка",
"pack": "0,2 кг",
"price": 168.0
},
{
"sourceId": "pba2fa00882e",
"category": "Молочные / сыры / яйца",
"name": "Чеддер слайсы",
"unit": "упаковка",
"pack": "0,15 кг",
"price": 137.0
},
{
"sourceId": "p8a9a7b1c9b7",
"category": "Молочные / сыры / яйца",
"name": "Яйца куриные",
"unit": "десяток",
"pack": "10 шт",
"price": 90.0
},
{
"sourceId": "pc34e91b7795",
"category": "Молочные / сыры / яйца",
"name": "Йогурт Греческий",
"unit": "кг",
"pack": "0,5 кг",
"price": 62.0
},
{
"sourceId": "pbefc9ff3d59",
"category": "Молочные / сыры / яйца",
"name": "Сыр Гауда",
"unit": "кг",
"pack": "1 кг",
"price": 594.0
},
{
"sourceId": "pd7e60466ae2",
"category": "Молочные / сыры / яйца",
"name": "Сыр Творожный Креметте",
"unit": "упаковка",
"pack": "2,2 кг",
"price": 1240.0
},
{
"sourceId": "p37b71143325",
"category": "Молочные / сыры / яйца",
"name": "Сыр Тофу",
"unit": "кг",
"pack": "1 кг",
"price": 850.0
},
{
"sourceId": "p7d731282a3e",
"category": "Зелень",
"name": "Айсберг",
"unit": "кочан",
"pack": "0,4 кг",
"price": 100.0
},
{
"sourceId": "pd9c0678f8f0",
"category": "Зелень",
"name": "Вешенки",
"unit": "упаковка",
"pack": "0,3 кг",
"price": 75.0
},
{
"sourceId": "pb78f848c5a1",
"category": "Зелень",
"name": "Виноград",
"unit": "гроздь",
"pack": "0,1 кг",
"price": 39.0
},
{
"sourceId": "pc6936cf156a",
"category": "Зелень",
"name": "Кинза",
"unit": "пучок",
"pack": "0,05 кг",
"price": 55.0
},
{
"sourceId": "p981f2110c79",
"category": "Зелень",
"name": "Мята",
"unit": "пучок",
"pack": "0,05 кг",
"price": 52.5
},
{
"sourceId": "p1fef6b5ffb3",
"category": "Зелень",
"name": "Петрушка",
"unit": "пучок",
"pack": "0,05 кг",
"price": 17.5
},
{
"sourceId": "pbc552d578f9",
"category": "Зелень",
"name": "Розмарин",
"unit": "пучок",
"pack": "0,03 кг",
"price": 39.0
},
{
"sourceId": "p44eb5be7d90",
"category": "Зелень",
"name": "Тимьян",
"unit": "пучок",
"pack": "0,03 кг",
"price": 54.0
},
{
"sourceId": "p1b03a2b92d7",
"category": "Зелень",
"name": "Укроп",
"unit": "пучок",
"pack": "0,05 кг",
"price": 17.5
},
{
"sourceId": "p7ea2eb1c265",
"category": "Зелень",
"name": "Микс салат",
"unit": "упаковка",
"pack": "0,1 кг",
"price": 150.0
},
{
"sourceId": "p82439212fa5",
"category": "Зелень",
"name": "Романо",
"unit": "кочан",
"pack": "0,25 кг",
"price": 150.0
},
{
"sourceId": "p277026bc45c",
"category": "Зелень",
"name": "Салат Руккола",
"unit": "упаковка",
"pack": "0,1 кг",
"price": 200.0
},
{
"sourceId": "p845eb739aed",
"category": "Зелень",
"name": "Листья смородины",
"unit": "упаковка",
"pack": "0,05 кг",
"price": null
},
{
"sourceId": "pd2b06e02801",
"category": "Зелень",
"name": "Шпинат",
"unit": "кг",
"pack": "1 кг",
"price": 800.0
},
{
"sourceId": "pbcc2b042236",
"category": "Зелень",
"name": "Эстрагон",
"unit": "кг",
"pack": "1 кг",
"price": null
},
{
"sourceId": "p7670aec26c1",
"category": "Алкоголь",
"name": "Водка Белая Берёзка 40%",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 1011.0
},
{
"sourceId": "p1281b9a36cd",
"category": "Алкоголь",
"name": "Джин Barrister Dry 40% 1 л",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 1300.0
},
{
"sourceId": "p28c6c3641f3",
"category": "Алкоголь",
"name": "Пиво Б\\А",
"unit": "бутылка",
"pack": "0,5 л",
"price": 76.0
},
{
"sourceId": "pd8f32eeaa02",
"category": "Алкоголь",
"name": "Пиво Лагер",
"unit": "бутылка",
"pack": "0,5 л",
"price": 140.0
},
{
"sourceId": "p0d863707b93",
"category": "Алкоголь",
"name": "Пиво Пшеничное",
"unit": "бутылка",
"pack": "0,5 л",
"price": 140.0
},
{
"sourceId": "pf2ccd714f8d",
"category": "Алкоголь",
"name": "Пиво безалкогольное",
"unit": "бутылка",
"pack": "0,5 л",
"price": 76.0
},
{
"sourceId": "pfc6c32861de",
"category": "Алкоголь",
"name": "Ром Higuana Silver 38% 0,7 л",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 1200.0
},
{
"sourceId": "p40eee48b2d5",
"category": "Алкоголь",
"name": "Сидр яблочный",
"unit": "бутылка",
"pack": "0,5 л",
"price": 170.0
},
{
"sourceId": "p6404c80340d",
"category": "Алкоголь",
"name": "Вермут Россо",
"unit": "бутылка",
"pack": "0,75 л",
"price": 2100.0
},
{
"sourceId": "p9986c1f8997",
"category": "Алкоголь",
"name": "Амаретто",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 540.0
},
{
"sourceId": "p6f80e80101c",
"category": "Алкоголь",
"name": "Апероль",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 2213.0
},
{
"sourceId": "p5cb9f9c8b5b",
"category": "Алкоголь",
"name": "Арарат 3года",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 1429.0
},
{
"sourceId": "pcd819c44d85",
"category": "Алкоголь",
"name": "Безалкогольный ликер Апероль",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 2118.0
},
{
"sourceId": "pc451a8a2c28",
"category": "Алкоголь",
"name": "Вино Армения Гранатовое",
"unit": "бутылка",
"pack": "0,75 л",
"price": 671.0
},
{
"sourceId": "pb83b687bf93",
"category": "Алкоголь",
"name": "Вино Армения Ежевичное",
"unit": "бутылка",
"pack": "0,75 л",
"price": 440.0
},
{
"sourceId": "p96e90dee2ad",
"category": "Алкоголь",
"name": "Вино красное кухня",
"unit": "бутылка",
"pack": "0,75 л",
"price": 1000.0
},
{
"sourceId": "p2e4f064d303",
"category": "Алкоголь",
"name": "Вино красное Киндзмараули",
"unit": "бутылка",
"pack": "0,75 л",
"price": 1599.0
},
{
"sourceId": "p451f5e28eea",
"category": "Алкоголь",
"name": "Вино красное Неро д'Авола",
"unit": "бутылка",
"pack": "0,75 л",
"price": 1319.0
},
{
"sourceId": "pb41479d6e2d",
"category": "Алкоголь",
"name": "Вино красное Шираз",
"unit": "бутылка",
"pack": "0,75 л",
"price": 1444.0
},
{
"sourceId": "pfb56ce5e0a7",
"category": "Алкоголь",
"name": "Вино розовое б/а",
"unit": "бутылка",
"pack": "0,75 л",
"price": 1000.0
},
{
"sourceId": "pfa4f58a7071",
"category": "Алкоголь",
"name": "Вино белое Шардоне",
"unit": "бутылка",
"pack": "0,75 л",
"price": 2067.0
},
{
"sourceId": "p649729b3037",
"category": "Алкоголь",
"name": "Вино красное Пино Нуар",
"unit": "бутылка",
"pack": "0,75 л",
"price": 720.0
},
{
"sourceId": "p988d60dade0",
"category": "Алкоголь",
"name": "Вино красное Зинфандель",
"unit": "бутылка",
"pack": "0,75 л",
"price": 3533.0
},
{
"sourceId": "pb4cbf3c0a85",
"category": "Алкоголь",
"name": "Вино белое Грюнер Вельтлинер",
"unit": "бутылка",
"pack": "0,75 л",
"price": 1830.0
},
{
"sourceId": "pae98730e9a0",
"category": "Алкоголь",
"name": "Виски Баллантайнс",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 1500.0
},
{
"sourceId": "pf4e826f9645",
"category": "Алкоголь",
"name": "Виски Джек Дэниелс",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 2700.0
},
{
"sourceId": "pfc81b71bda6",
"category": "Алкоголь",
"name": "Виски Поугс",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 2350.0
},
{
"sourceId": "pe7dc3f2865e",
"category": "Алкоголь",
"name": "Виски Синглтон 12лет",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 5740.0
},
{
"sourceId": "p4c356801954",
"category": "Алкоголь",
"name": "Виски хаус",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 2000.0
},
{
"sourceId": "pc72330b0ad8",
"category": "Алкоголь",
"name": "Водка Мамонт",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 1200.0
},
{
"sourceId": "p5f7793e1104",
"category": "Алкоголь",
"name": "Водка Ортодокс",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 1140.0
},
{
"sourceId": "p5fe209f2332",
"category": "Алкоголь",
"name": "Водка Финляндия",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 1961.0
},
{
"sourceId": "p468cd77e995",
"category": "Алкоголь",
"name": "Водка хаус",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 800.0
},
{
"sourceId": "pc3d340b9aca",
"category": "Алкоголь",
"name": "Чача",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 1468.0
},
{
"sourceId": "p8e6a94db028",
"category": "Алкоголь",
"name": "Граппа",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 2000.0
},
{
"sourceId": "p27ea7857cb6",
"category": "Алкоголь",
"name": "Джин Хопперс Ориджинал Драй",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 1200.0
},
{
"sourceId": "pc29d8f74be5",
"category": "Алкоголь",
"name": "Джин Дж.Уитли Лондон",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 1334.0
},
{
"sourceId": "pd186437e5a4",
"category": "Алкоголь",
"name": "Джин хаус",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 1200.0
},
{
"sourceId": "pb7d1c98665f",
"category": "Алкоголь",
"name": "Егерьмейстер",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 1550.0
},
{
"sourceId": "p91c4b55d3a3",
"category": "Алкоголь",
"name": "Игристое б/а",
"unit": "бутылка",
"pack": "0,75 л",
"price": 1120.0
},
{
"sourceId": "p2f6cdf86346",
"category": "Алкоголь",
"name": "Игристое брют белое Кава",
"unit": "бутылка",
"pack": "0,75 л",
"price": 1854.0
},
{
"sourceId": "pa4eb7156a3e",
"category": "Алкоголь",
"name": "Игристое вино Проссеко",
"unit": "бутылка",
"pack": "0,75 л",
"price": 1647.0
},
{
"sourceId": "pd6fa0c39f85",
"category": "Алкоголь",
"name": "Игристое вино Тинтонелли",
"unit": "бутылка",
"pack": "0,75 л",
"price": 1700.0
},
{
"sourceId": "p667f2c4b734",
"category": "Алкоголь",
"name": "Игристое хаус",
"unit": "бутылка",
"pack": "0,75 л",
"price": 1000.0
},
{
"sourceId": "pfaa34412f18",
"category": "Алкоголь",
"name": "Коньяк хаус",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 757.0
},
{
"sourceId": "pc9c8ee1a0a8",
"category": "Алкоголь",
"name": "Крепленое вино Марсала",
"unit": "бутылка",
"pack": "0,75 л",
"price": 2969.0
},
{
"sourceId": "pcc8d151d552",
"category": "Алкоголь",
"name": "Ликер Амарето",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 2046.0
},
{
"sourceId": "p8140226794b",
"category": "Алкоголь",
"name": "Ликер Кампари",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 2998.0
},
{
"sourceId": "p0c5204f796e",
"category": "Алкоголь",
"name": "Ликер кофейный",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 600.0
},
{
"sourceId": "pc1a18cb1e73",
"category": "Алкоголь",
"name": "Ликер Трипл Сек",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 954.0
},
{
"sourceId": "pe04cc590052",
"category": "Алкоголь",
"name": "Портвейн",
"unit": "бутылка",
"pack": "0,75 л",
"price": 2000.0
},
{
"sourceId": "p324a4eca5d7",
"category": "Алкоголь",
"name": "Ром Баку 4",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 1500.0
},
{
"sourceId": "pe387bfcf291",
"category": "Алкоголь",
"name": "Ром Варадеро",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 1415.0
},
{
"sourceId": "p8c5a10f93b7",
"category": "Алкоголь",
"name": "Ром хаус",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 1400.0
},
{
"sourceId": "pbe05df483b9",
"category": "Алкоголь",
"name": "Полугар №1",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 4235.0
},
{
"sourceId": "p5f4eac293fb",
"category": "Алкоголь",
"name": "Кашаса",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 2000.0
},
{
"sourceId": "p2de56e97738",
"category": "Алкоголь",
"name": "Мескаль",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 3429.0
},
{
"sourceId": "p2498b970302",
"category": "Алкоголь",
"name": "Текила Эсполон",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 4189.0
},
{
"sourceId": "p7542d46c876",
"category": "Алкоголь",
"name": "Текила хаус",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 2000.0
},
{
"sourceId": "p39d78d2f67b",
"category": "Алкоголь",
"name": "Херес",
"unit": "бутылка",
"pack": "0,75 л",
"price": 6136.0
},
{
"sourceId": "p811aec7b05a",
"category": "Алкоголь",
"name": "Коньяк Хеннесси",
"unit": "0,5 л",
"pack": "0,5 л",
"price": 7614.0
},
{
"sourceId": "pe237b3c3497",
"category": "Консервация / закуски",
"name": "Огурцы соленые",
"unit": "банка",
"pack": "0,5 кг",
"price": 130.0
},
{
"sourceId": "p8d69686af5c",
"category": "Консервация / закуски",
"name": "Ананасы консервированные",
"unit": "банка",
"pack": "0,5 кг",
"price": 150.0
},
{
"sourceId": "p5d9d6d18a5d",
"category": "Консервация / закуски",
"name": "Кетчуп",
"unit": "бутылка",
"pack": "0,8 кг",
"price": 203.0
},
{
"sourceId": "pd4c52857cd9",
"category": "Консервация / закуски",
"name": "Кукуруза в вакууме",
"unit": "упаковка",
"pack": "0,3 кг",
"price": 140.0
},
{
"sourceId": "peb8fabf92b9",
"category": "Консервация / закуски",
"name": "Кукуруза консервированная",
"unit": "банка",
"pack": "0,4 кг",
"price": 140.0
},
{
"sourceId": "p29c24561f86",
"category": "Консервация / закуски",
"name": "Макароны",
"unit": "кг",
"pack": "1 кг",
"price": 278.0
},
{
"sourceId": "p12963786e93",
"category": "Консервация / закуски",
"name": "Манго консервированное",
"unit": "банка",
"pack": "0,5 кг",
"price": 200.0
},
{
"sourceId": "p867b39d4a39",
"category": "Консервация / закуски",
"name": "Мед",
"unit": "кг",
"pack": "1 кг",
"price": 315.0
},
{
"sourceId": "p317b2cb6438",
"category": "Консервация / закуски",
"name": "Наршараб",
"unit": "банка",
"pack": "0,3 кг",
"price": 87.0
},
{
"sourceId": "p5c51c79ac93",
"category": "Консервация / закуски",
"name": "Оливки / маслины",
"unit": "банка",
"pack": "0,3 л",
"price": 105.0
},
{
"sourceId": "p218fd052843",
"category": "Консервация / закуски",
"name": "Персики консервированные",
"unit": "банка",
"pack": "0,5 кг",
"price": 104.0
},
{
"sourceId": "p06a1926a590",
"category": "Консервация / закуски",
"name": "Тортильи / лепёшки",
"unit": "кг",
"pack": "1 кг",
"price": 120.0
},
{
"sourceId": "p6c077f481b0",
"category": "Консервация / закуски",
"name": "Халва",
"unit": "кг",
"pack": "1 кг",
"price": 242.0
},
{
"sourceId": "p026ad95ea6f",
"category": "Консервация / закуски",
"name": "Фасоль красная в банке",
"unit": "банка",
"pack": "0,4 кг",
"price": 52.0
},
{
"sourceId": "p44fbbb48573",
"category": "Напитки",
"name": "Вода газированная",
"unit": "л",
"pack": "1 л",
"price": 44.0
},
{
"sourceId": "pd919642abfe",
"category": "Напитки",
"name": "Вода негазированная",
"unit": "л",
"pack": "1 л",
"price": 23.0
},
{
"sourceId": "p48ae926589a",
"category": "Напитки",
"name": "Квас",
"unit": "л",
"pack": "1 л",
"price": 96.0
},
{
"sourceId": "padd1d256182",
"category": "Напитки",
"name": "Кола",
"unit": "л",
"pack": "1 л",
"price": 107.0
},
{
"sourceId": "p4805b0947a1",
"category": "Напитки",
"name": "Кофе",
"unit": "кг",
"pack": "1 кг",
"price": 1700.0
},
{
"sourceId": "p84058564901",
"category": "Напитки",
"name": "Сок Яблочный",
"unit": "л",
"pack": "1 л",
"price": 132.0
},
{
"sourceId": "p6db043f01bf",
"category": "Напитки",
"name": "Сок Вишневый",
"unit": "л",
"pack": "1 л",
"price": 164.0
},
{
"sourceId": "p2b677b32f77",
"category": "Напитки",
"name": "Сок томатный",
"unit": "л",
"pack": "1 л",
"price": 100.0
},
{
"sourceId": "p6c2f3889973",
"category": "Напитки",
"name": "Тоник",
"unit": "л",
"pack": "1 л",
"price": 105.0
},
{
"sourceId": "pe5fb33d1c4c",
"category": "Напитки",
"name": "Чай чёрный",
"unit": "кг",
"pack": "1 кг",
"price": 1257.0
},
{
"sourceId": "pe010897fd20",
"category": "Напитки",
"name": "Кола 0,25л с сахаром",
"unit": "бутылка",
"pack": "0,25 л",
"price": 100.0
},
{
"sourceId": "pe6bd638df75",
"category": "Напитки",
"name": "Кола 0,25 без сахара",
"unit": "бутылка",
"pack": "0,25 л",
"price": 100.0
},
{
"sourceId": "p88c9ee97d5a",
"category": "Напитки",
"name": "Пиво Б/А Stella Artois",
"unit": "бутылка",
"pack": "0,5 л",
"price": 76.0
},
{
"sourceId": "pc51fba13fc7",
"category": "Напитки",
"name": "Сироп Апероль",
"unit": "л",
"pack": "1 л",
"price": 770.0
},
{
"sourceId": "p698cdd7ac38",
"category": "Напитки",
"name": "Сироп Бузина",
"unit": "л",
"pack": "1 л",
"price": 234.0
},
{
"sourceId": "p2bc5bbdb90e",
"category": "Напитки",
"name": "Сироп Ваниль",
"unit": "л",
"pack": "1 л",
"price": 484.0
},
{
"sourceId": "pce194ee2320",
"category": "Напитки",
"name": "Сироп Гренадин",
"unit": "л",
"pack": "1 л",
"price": 393.0
},
{
"sourceId": "pcee344b9e4f",
"category": "Напитки",
"name": "Сироп зелёное яблоко",
"unit": "л",
"pack": "1 л",
"price": 488.0
},
{
"sourceId": "pc56e4217318",
"category": "Напитки",
"name": "Сироп клубника",
"unit": "л",
"pack": "1 л",
"price": 948.0
},
{
"sourceId": "p1d9e5c7c546",
"category": "Напитки",
"name": "Сироп кокос",
"unit": "л",
"pack": "1 л",
"price": 957.0
},
{
"sourceId": "p00d1fce4620",
"category": "Напитки",
"name": "Сироп лесной орех",
"unit": "л",
"pack": "1 л",
"price": 957.0
},
{
"sourceId": "p711ad3f5a2f",
"category": "Напитки",
"name": "Сироп макадамия",
"unit": "л",
"pack": "1 л",
"price": 957.0
},
{
"sourceId": "p9f7a6fe65ad",
"category": "Напитки",
"name": "Сироп миндаль",
"unit": "л",
"pack": "1 л",
"price": 597.0
},
{
"sourceId": "pd3455f78982",
"category": "Напитки",
"name": "Сироп Соленая карамель",
"unit": "л",
"pack": "1 л",
"price": 490.0
},
{
"sourceId": "p74621b56c1c",
"category": "Напитки",
"name": "Сок ананасовый",
"unit": "л",
"pack": "1 л",
"price": 202.0
},
{
"sourceId": "pfac3563919f",
"category": "Напитки",
"name": "Сок грейпфрутовый",
"unit": "л",
"pack": "1 л",
"price": 178.0
},
{
"sourceId": "p345e54c040b",
"category": "Напитки",
"name": "Сок лимонный",
"unit": "л",
"pack": "1 л",
"price": 128.0
},
{
"sourceId": "p307419ea441",
"category": "Гарниры / хлеб / заморозка",
"name": "Булгур",
"unit": "кг",
"pack": "1 кг",
"price": 312.0
},
{
"sourceId": "p55d26b87ae1",
"category": "Гарниры / хлеб / заморозка",
"name": "Булки бургер / бриошь",
"unit": "коробка",
"pack": "10 шт",
"price": 99.0
},
{
"sourceId": "p3ddacdbdaaf",
"category": "Гарниры / хлеб / заморозка",
"name": "Киноа",
"unit": "кг",
"pack": "1 кг",
"price": 575.0
},
{
"sourceId": "pf105323ffa2",
"category": "Гарниры / хлеб / заморозка",
"name": "Лепешки роти",
"unit": "коробка",
"pack": "20 шт",
"price": 554.0
},
{
"sourceId": "p9bfc8c5b467",
"category": "Гарниры / хлеб / заморозка",
"name": "Мука",
"unit": "кг",
"pack": "1 кг",
"price": 51.0
},
{
"sourceId": "pfeaa023c4c6",
"category": "Гарниры / хлеб / заморозка",
"name": "Облепиха замороженная",
"unit": "кг",
"pack": "1 кг",
"price": 358.0
},
{
"sourceId": "pfd35bc15c5b",
"category": "Гарниры / хлеб / заморозка",
"name": "Панко сухари",
"unit": "упаковка",
"pack": "0,2 кг",
"price": 72.0
},
{
"sourceId": "p1f9128f021d",
"category": "Гарниры / хлеб / заморозка",
"name": "Рис бурый",
"unit": "кг",
"pack": "1 кг",
"price": 407.0
},
{
"sourceId": "pac73091c8a0",
"category": "Гарниры / хлеб / заморозка",
"name": "Рис жасмин",
"unit": "кг",
"pack": "1 кг",
"price": 365.0
},
{
"sourceId": "p0b07874db88",
"category": "Гарниры / хлеб / заморозка",
"name": "Рис для суши",
"unit": "кг",
"pack": "1 кг",
"price": 108.0
},
{
"sourceId": "pdad7ebba8a9",
"category": "Гарниры / хлеб / заморозка",
"name": "Пита (заморозка)",
"unit": "упаковка",
"pack": "10 шт",
"price": 104.0
},
{
"sourceId": "p4a50ed3e2c3",
"category": "Гарниры / хлеб / заморозка",
"name": "Удон лапша",
"unit": "кг",
"pack": "1 кг",
"price": 167.0
},
{
"sourceId": "p0127858aa21",
"category": "Гарниры / хлеб / заморозка",
"name": "Фунчоза",
"unit": "кг",
"pack": "1 кг",
"price": 714.0
},
{
"sourceId": "paa7df65229c",
"category": "Гарниры / хлеб / заморозка",
"name": "Хлеб Бородинский",
"unit": "шт",
"pack": "0,6 кг",
"price": 250.0
},
{
"sourceId": "p2d5adc20204",
"category": "Гарниры / хлеб / заморозка",
"name": "Хлеб пшеничный тартин",
"unit": "шт",
"pack": "0,6 кг",
"price": 250.0
},
{
"sourceId": "pab9df11cf2f",
"category": "Гарниры / хлеб / заморозка",
"name": "Хлеб ржаной тартин",
"unit": "шт",
"pack": "0,6 кг",
"price": 250.0
},
{
"sourceId": "p0bc246620f0",
"category": "Мясо / птица / рыба",
"name": "Анчоусы",
"unit": "банка",
"pack": "0,2 кг",
"price": 409.0
},
{
"sourceId": "p6b5795b3b6a",
"category": "Мясо / птица / рыба",
"name": "Бекон",
"unit": "кг",
"pack": "1 кг",
"price": 600.0
},
{
"sourceId": "pa07a0236da1",
"category": "Мясо / птица / рыба",
"name": "Гребешок",
"unit": "кг",
"pack": "1 кг",
"price": 2058.0
},
{
"sourceId": "pfb5b78efab9",
"category": "Мясо / птица / рыба",
"name": "Колбаса Сервелат",
"unit": "кг",
"pack": "1 кг",
"price": 435.0
},
{
"sourceId": "p76eb6752d5c",
"category": "Мясо / птица / рыба",
"name": "Колбаса варёная",
"unit": "кг",
"pack": "1 кг",
"price": 513.0
},
{
"sourceId": "p1b5839cae72",
"category": "Мясо / птица / рыба",
"name": "Креветки в панцире",
"unit": "кг",
"pack": "1,8 кг",
"price": 1895.0
},
{
"sourceId": "p7fc12ab89b8",
"category": "Мясо / птица / рыба",
"name": "Куриное филе",
"unit": "кг",
"pack": "1 кг",
"price": 439.0
},
{
"sourceId": "p4d18f7a81dd",
"category": "Мясо / птица / рыба",
"name": "Курица тушка",
"unit": "шт",
"pack": "1,2 кг",
"price": 312.0
},
{
"sourceId": "p1df322ff8bd",
"category": "Мясо / птица / рыба",
"name": "Мачете",
"unit": "кг",
"pack": "1 кг",
"price": 2275.0
},
{
"sourceId": "pfa68d1e3414",
"category": "Мясо / птица / рыба",
"name": "Ребрышки свиные",
"unit": "кг",
"pack": "1 кг",
"price": 555.0
},
{
"sourceId": "pc2f91ae8de2",
"category": "Мясо / птица / рыба",
"name": "Тунец свежий",
"unit": "кг",
"pack": "1 кг",
"price": 1054.0
},
{
"sourceId": "p43d081d81f7",
"category": "Мясо / птица / рыба",
"name": "Фарш мраморный",
"unit": "кг",
"pack": "1 кг",
"price": 777.0
},
{
"sourceId": "p8ad9c67423b",
"category": "Мясо / птица / рыба",
"name": "Колбаса Ветчина",
"unit": "кг",
"pack": "1 кг",
"price": 513.0
},
{
"sourceId": "p0b22f6c1f4f",
"category": "Мясо / птица / рыба",
"name": "Говядина вырезка",
"unit": "кг",
"pack": "1 кг",
"price": 1508.0
},
{
"sourceId": "pb7a65e1d87f",
"category": "Мясо / птица / рыба",
"name": "Говядина лопатка",
"unit": "кг",
"pack": "1 кг",
"price": 900.0
},
{
"sourceId": "p99f0584aeaf",
"category": "Мясо / птица / рыба",
"name": "Говядина щеки",
"unit": "кг",
"pack": "1 кг",
"price": 1171.0
},
{
"sourceId": "pe8715077b84",
"category": "Мясо / птица / рыба",
"name": "Куриная печень",
"unit": "кг",
"pack": "1 кг",
"price": 233.0
},
{
"sourceId": "pd46e007d118",
"category": "Мясо / птица / рыба",
"name": "Курдюк",
"unit": "кг",
"pack": "1 кг",
"price": 950.0
},
{
"sourceId": "pbdb613bc46a",
"category": "Мясо / птица / рыба",
"name": "Печень кролика",
"unit": "кг",
"pack": "1 кг",
"price": 610.0
},
{
"sourceId": "pb1097613f05",
"category": "Мясо / птица / рыба",
"name": "Свинина корейка на кости",
"unit": "кг",
"pack": "1 кг",
"price": 290.0
},
{
"sourceId": "pfb817bea095",
"category": "Мясо / птица / рыба",
"name": "Свинина шея",
"unit": "кг",
"pack": "1 кг",
"price": 501.0
},
{
"sourceId": "p0f03d119bd9",
"category": "Мясо / птица / рыба",
"name": "Утка Филе Сырокопченая",
"unit": "упаковка",
"pack": "0,07 кг",
"price": 275.0
},
{
"sourceId": "pdafeedddefd",
"category": "Мясо / птица / рыба",
"name": "Камбала",
"unit": "шт",
"pack": "0,3 кг",
"price": 114.0
},
{
"sourceId": "pec4ef6558e3",
"category": "Мясо / птица / рыба",
"name": "Кальмар",
"unit": "кг",
"pack": "1 кг",
"price": 876.0
},
{
"sourceId": "p8236925639e",
"category": "Мясо / птица / рыба",
"name": "Креветки чищенные",
"unit": "кг",
"pack": "1 кг",
"price": 1385.0
},
{
"sourceId": "pfd625631223",
"category": "Мясо / птица / рыба",
"name": "Семга",
"unit": "шт",
"pack": "0,12 кг",
"price": 204.0
},
{
"sourceId": "p2303f1aeb6e",
"category": "Мясо / птица / рыба",
"name": "Щучья икра",
"unit": "банка",
"pack": "0,12 кг",
"price": 1364.0
},
{
"sourceId": "p31978849a78",
"category": "Мясо / птица / рыба",
"name": "Икра летучей рыбы красная",
"unit": "кг",
"pack": "1 кг",
"price": 804.0
},
{
"sourceId": "pf78d92775d6",
"category": "Орехи / семечки",
"name": "Грецкий орех",
"unit": "кг",
"pack": "1 кг",
"price": 850.0
},
{
"sourceId": "p20dcf01f28d",
"category": "Орехи / семечки",
"name": "Кедровые орехи",
"unit": "кг",
"pack": "1 кг",
"price": 2800.0
},
{
"sourceId": "pec22e5f99c0",
"category": "Орехи / семечки",
"name": "Кешью",
"unit": "кг",
"pack": "1 кг",
"price": 1232.0
},
{
"sourceId": "p31da7fe8f6d",
"category": "Орехи / семечки",
"name": "Миндаль",
"unit": "кг",
"pack": "1 кг",
"price": 1342.0
},
{
"sourceId": "p2dc8557ed64",
"category": "Орехи / семечки",
"name": "Тыквенные семечки",
"unit": "кг",
"pack": "1 кг",
"price": 680.0
},
{
"sourceId": "pa5a7f4afc45",
"category": "Орехи / семечки",
"name": "Семечки подсолнуха",
"unit": "кг",
"pack": "1 кг",
"price": 285.0
},
{
"sourceId": "pd4d938e46b5",
"category": "Фрукты",
"name": "Апельсины",
"unit": "кг",
"pack": "1 кг",
"price": 130.0
},
{
"sourceId": "pf3b46c09ea9",
"category": "Фрукты",
"name": "Лайм",
"unit": "кг",
"pack": "1 кг",
"price": 550.0
},
{
"sourceId": "pfe05f0f4430",
"category": "Фрукты",
"name": "Лимоны",
"unit": "кг",
"pack": "1 кг",
"price": 210.0
},
{
"sourceId": "pd8f2a52423a",
"category": "Фрукты",
"name": "Яблоки",
"unit": "кг",
"pack": "1 кг",
"price": 120.0
},
{
"sourceId": "p5262cd52f7f",
"category": "Фрукты",
"name": "Гранат",
"unit": "шт",
"pack": "0,2 кг",
"price": 66.0
},
{
"sourceId": "p5e7391162fa",
"category": "Фрукты",
"name": "Грейпфрут",
"unit": "шт",
"pack": "0,2 кг",
"price": 38.0
},
{
"sourceId": "p8f99979eeed",
"category": "Фрукты",
"name": "Груша конференция",
"unit": "кг",
"pack": "1 кг",
"price": 330.0
},
{
"sourceId": "pb665c479b5d",
"category": "Салаты / грибы",
"name": "Вешенки",
"unit": "упаковка",
"pack": "0,2 кг",
"price": 116.66
},
{
"sourceId": "p3ec641a1355",
"category": "Салаты / грибы",
"name": "Шампиньоны",
"unit": "кг",
"pack": "1 кг",
"price": 350.0
},
{
"sourceId": "p8f3c2fdb994",
"category": "Специи, сухие смеси, соль, сахар",
"name": "Агар-агар",
"unit": "кг",
"pack": "1 кг",
"price": 2750.0
},
{
"sourceId": "p233fbae08db",
"category": "Специи, сухие смеси, соль, сахар",
"name": "Бадьян",
"unit": "кг",
"pack": "1 кг",
"price": 2559.0
},
{
"sourceId": "pe15c567d1cd",
"category": "Специи, сухие смеси, соль, сахар",
"name": "Ванилин",
"unit": "кг",
"pack": "1 кг",
"price": 300.0
},
{
"sourceId": "p6db4c3a2adf",
"category": "Специи, сухие смеси, соль, сахар",
"name": "Гвоздика целая",
"unit": "кг",
"pack": "1 кг",
"price": 2417.0
},
{
"sourceId": "p771f8153d0c",
"category": "Специи, сухие смеси, соль, сахар",
"name": "Глутамат натрия",
"unit": "кг",
"pack": "1 кг",
"price": 352.0
},
{
"sourceId": "p4446f053706",
"category": "Специи, сухие смеси, соль, сахар",
"name": "Зира (кумин)",
"unit": "кг",
"pack": "1 кг",
"price": 1440.0
},
{
"sourceId": "p7aa995d5ccc",
"category": "Специи, сухие смеси, соль, сахар",
"name": "Какао порошок",
"unit": "кг",
"pack": "1 кг",
"price": 1793.0
},
{
"sourceId": "p56c5e7024b1",
"category": "Специи, сухие смеси, соль, сахар",
"name": "Карри",
"unit": "кг",
"pack": "1 кг",
"price": 407.0
},
{
"sourceId": "pb98d7d24505",
"category": "Специи, сухие смеси, соль, сахар",
"name": "Кислота лимонная",
"unit": "кг",
"pack": "1 кг",
"price": 477.0
},
{
"sourceId": "pe8916e264d4",
"category": "Специи, сухие смеси, соль, сахар",
"name": "Кориандр молотый",
"unit": "кг",
"pack": "1 кг",
"price": 186.0
},
{
"sourceId": "pc4968e827cd",
"category": "Специи, сухие смеси, соль, сахар",
"name": "Кориандр целый",
"unit": "кг",
"pack": "1 кг",
"price": 225.0
},
{
"sourceId": "pe368637a802",
"category": "Специи, сухие смеси, соль, сахар",
"name": "Корица молотая",
"unit": "кг",
"pack": "1 кг",
"price": 500.0
},
{
"sourceId": "p4410d18f784",
"category": "Специи, сухие смеси, соль, сахар",
"name": "Куркума",
"unit": "кг",
"pack": "1 кг",
"price": 380.0
},
{
"sourceId": "pf02d42172d7",
"category": "Специи, сухие смеси, соль, сахар",
"name": "Лавровый лист",
"unit": "кг",
"pack": "1 кг",
"price": 2404.0
},
{
"sourceId": "p2482bd57dbb",
"category": "Специи, сухие смеси, соль, сахар",
"name": "Мускатный орех молотый",
"unit": "кг",
"pack": "1 кг",
"price": 794.0
},
{
"sourceId": "p5e7cf42f42c",
"category": "Специи, сухие смеси, соль, сахар",
"name": "Чай Каркаде",
"unit": "кг",
"pack": "1 кг",
"price": 1262.0
},
{
"sourceId": "p09379fceb72",
"category": "Специи, сухие смеси, соль, сахар",
"name": "Орегано",
"unit": "кг",
"pack": "1 кг",
"price": 450.0
},
{
"sourceId": "p242cda0ea15",
"category": "Специи, сухие смеси, соль, сахар",
"name": "Перец горошек",
"unit": "кг",
"pack": "1 кг",
"price": 348.0
},
{
"sourceId": "p24a9bd4ab5c",
"category": "Специи, сухие смеси, соль, сахар",
"name": "Разрыхлитель",
"unit": "кг",
"pack": "1 кг",
"price": 657.0
},
{
"sourceId": "p08ab63802ab",
"category": "Специи, сухие смеси, соль, сахар",
"name": "Сахар тростниковый",
"unit": "кг",
"pack": "1 кг",
"price": 413.0
},
{
"sourceId": "p3d4e34ce89c",
"category": "Специи, сухие смеси, соль, сахар",
"name": "Соль Черная",
"unit": "кг",
"pack": "1 кг",
"price": 576.0
},
{
"sourceId": "p62a7e2a76f6",
"category": "Специи, сухие смеси, соль, сахар",
"name": "Уксус бальзамический",
"unit": "л",
"pack": "1 л",
"price": 667.0
},
{
"sourceId": "p0597f6e55ba",
"category": "Специи, сухие смеси, соль, сахар",
"name": "Уксус винный",
"unit": "л",
"pack": "1 л",
"price": 188.0
},
{
"sourceId": "p55a19493dd2",
"category": "Специи, сухие смеси, соль, сахар",
"name": "Уксус рисовый",
"unit": "л",
"pack": "1 л",
"price": 58.0
},
{
"sourceId": "p2737348d34a",
"category": "Специи, сухие смеси, соль, сахар",
"name": "Уксус столовый яблочный",
"unit": "л",
"pack": "1 л",
"price": 52.0
},
{
"sourceId": "pb3d0d969e6d",
"category": "Специи, сухие смеси, соль, сахар",
"name": "Хмели-сунели",
"unit": "кг",
"pack": "1 кг",
"price": 370.0
},
{
"sourceId": "p2a6d9f5813b",
"category": "Специи, сухие смеси, соль, сахар",
"name": "Шафран",
"unit": "кг",
"pack": "1 кг",
"price": 9552.0
}
];
