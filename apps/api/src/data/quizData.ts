// АВТОГЕНЕРАЦИЯ (parseQuiz.mjs из docs/quiz-source). Не редактировать вручную.
// 216 curated-вопросов, разложенных по главам и аттестациям модулей.
export type QuizSeed = {
  module: "waiter" | "kitchen" | "bar";
  chapterOrder: number | null; // sort_order главы; null = аттестация модуля
  attestation: boolean;
  prompt: string;
  options: { label: string; correct: boolean }[];
};

export const quizSeed: QuizSeed[] = [
  {
    "module": "bar",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Какой из перечисленных коктейлей относится к категории «Тики» и, согласно легенде, передает дух народа острова Гаити?",
    "options": [
      {
        "label": "Май Тай",
        "correct": true
      },
      {
        "label": "Дайкири",
        "correct": false
      },
      {
        "label": "Мохито",
        "correct": false
      },
      {
        "label": "Банганга",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "В чем заключается ключевое отличие коктейля «Нью-Йорк Сауэр» от классического «Виски Сауэр» согласно нашему меню?",
    "options": [
      {
        "label": "Подача в глиняной чашке",
        "correct": false
      },
      {
        "label": "Добавление ягодного кордиала",
        "correct": false
      },
      {
        "label": "Использование водки вместо бурбона",
        "correct": false
      },
      {
        "label": "Наличие слоя красного сухого вина",
        "correct": true
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 2,
    "attestation": false,
    "prompt": "При открытии смены официант должен включить свет в рубильниках. Какие именно номера рубильников указаны в чек-листе?",
    "options": [
      {
        "label": "1, 3, 5, 7, 10",
        "correct": false
      },
      {
        "label": "6, 7, 8, 9, 10",
        "correct": false
      },
      {
        "label": "Все рубильники с 1 по 12",
        "correct": false
      },
      {
        "label": "6, 8, 9, 11, 12",
        "correct": true
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Какую необычную основу имеет настойка «Карамельная клубника» в нашем барном меню?",
    "options": [
      {
        "label": "Белый ром",
        "correct": false
      },
      {
        "label": "Сливки 33%",
        "correct": false
      },
      {
        "label": "Ряженка",
        "correct": true
      },
      {
        "label": "Коньяк",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 4,
    "attestation": false,
    "prompt": "Правило «первого касания» гласит, что напитки должны быть поданы гостю в течение определенного времени. Каков этот лимит?",
    "options": [
      {
        "label": "По готовности вместе с закусками",
        "correct": false
      },
      {
        "label": "5 минут",
        "correct": true
      },
      {
        "label": "3 минуты",
        "correct": false
      },
      {
        "label": "10 минут",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Коктейль «Асгард» сочетает в себе крепость водки и цитрусовые акценты. Какие именно цитрусовые используются в его составе?",
    "options": [
      {
        "label": "Мандарин и лимон",
        "correct": false
      },
      {
        "label": "Грейпфрут и лимон",
        "correct": true
      },
      {
        "label": "Лимон и бергамот",
        "correct": false
      },
      {
        "label": "Апельсин и лайм",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Каким специфическим элементом декора украшается авторский коктейль «Банганга» для создания образа тропического потока?",
    "options": [
      {
        "label": "Кора ивы",
        "correct": true
      },
      {
        "label": "Сушеный ананас",
        "correct": false
      },
      {
        "label": "Веточка розмарина",
        "correct": false
      },
      {
        "label": "Листья бамбука",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 5,
    "attestation": false,
    "prompt": "Официант заметил, что двое гостей за столом заказали по бокалу одного и того же вина. Какую технику продаж уместнее всего применить в этой ситуации?",
    "options": [
      {
        "label": "«Перекрестная продажа»",
        "correct": false
      },
      {
        "label": "«Два варианта без отказа»",
        "correct": false
      },
      {
        "label": "«Бутылка вместо бокалов»",
        "correct": true
      },
      {
        "label": "«Личная рекомендация»",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Какой из классических коктейлей описывается как сливочный с ярко выраженными кофейными нотами?",
    "options": [
      {
        "label": "Эспрессо Мартини",
        "correct": false
      },
      {
        "label": "Пина Колада",
        "correct": false
      },
      {
        "label": "Крестный отец",
        "correct": false
      },
      {
        "label": "Белый русский",
        "correct": true
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Что входит в состав безалкогольной хреновухи согласно барному меню?",
    "options": [
      {
        "label": "Сушеный хрен",
        "correct": true
      },
      {
        "label": "Горчичный порошок и мед",
        "correct": false
      },
      {
        "label": "Свежий корень хрена и водка",
        "correct": false
      },
      {
        "label": "Имбирь и лимонный сок",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Коктейль «Дайкири» в нашем меню характеризуется как шорт-дринк. Что это означает для гостя?",
    "options": [
      {
        "label": "Напиток выпивается за 3–4 глотка",
        "correct": true
      },
      {
        "label": "Напиток подается в высоком бокале с большим количеством льда",
        "correct": false
      },
      {
        "label": "В составе используется только один вид алкоголя",
        "correct": false
      },
      {
        "label": "Напиток готовится менее чем за 60 секунд",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Согласно меню, популярность какого коктейля объясняется его появлением в сериале «Секс в большом городе»?",
    "options": [
      {
        "label": "Апероль",
        "correct": false
      },
      {
        "label": "Маргарита",
        "correct": false
      },
      {
        "label": "Космополитен",
        "correct": true
      },
      {
        "label": "Порнстар Мартини",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 0,
    "attestation": false,
    "prompt": "Как описывается вкусовой профиль коктейля «Апероль» в нашем справочнике?",
    "options": [
      {
        "label": "Кислый и соленый",
        "correct": false
      },
      {
        "label": "Слегка горький и сухой",
        "correct": true
      },
      {
        "label": "Крепкий и пряный",
        "correct": false
      },
      {
        "label": "Приторно сладкий и фруктовый",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "При создании коктейля «Альбион» бармены вдохновлялись историей. Какое послевкусие характерно для этого напитка?",
    "options": [
      {
        "label": "Травянистое",
        "correct": true
      },
      {
        "label": "Ярко выраженное ванильное",
        "correct": false
      },
      {
        "label": "Острое перцовое",
        "correct": false
      },
      {
        "label": "Копченое",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Какой ингредиент придает насыщенность и «многослойность» авторскому коктейлю «Рашмор»?",
    "options": [
      {
        "label": "Кордиал из красной смородины с черным чаем",
        "correct": true
      },
      {
        "label": "Сироп из бузины и белое вино",
        "correct": false
      },
      {
        "label": "Пюре маракуйи и ванильная водка",
        "correct": false
      },
      {
        "label": "Сок алоэ и яблочный кордиал",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Какое количество лимонов требуется для приготовления одной порции безалкогольного Лимончелло (согласно ТТК в главе «Настойки»)?",
    "options": [
      {
        "label": "1 кг",
        "correct": false
      },
      {
        "label": "500 грамм",
        "correct": false
      },
      {
        "label": "300 грамм",
        "correct": true
      },
      {
        "label": "100 грамм",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 7,
    "attestation": false,
    "prompt": "Где именно находится «Стафф-зона», которую официант обязан прибрать в конце смены?",
    "options": [
      {
        "label": "Место отдыха за кухней",
        "correct": false
      },
      {
        "label": "Моечный цех",
        "correct": false
      },
      {
        "label": "Раздевалка персонала",
        "correct": false
      },
      {
        "label": "Территория у льдогенератора",
        "correct": true
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "На основе чего готовится безалкогольный коктейль (моктейль) «Клюква-маракуйя»?",
    "options": [
      {
        "label": "Клюквенный морс",
        "correct": true
      },
      {
        "label": "Свежевыжатый сок клюквы",
        "correct": false
      },
      {
        "label": "Цитрусовый кордиал",
        "correct": false
      },
      {
        "label": "Газированная вода с сиропом",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 6,
    "attestation": false,
    "prompt": "Если гость находится в состоянии сильного алкогольного опьянения, как стандарт сервиса рекомендует отказать ему в продаже очередной порции алкоголя?",
    "options": [
      {
        "label": "Предложить фирменный чай или кофе, отметив, что вечер прошел прекрасно",
        "correct": true
      },
      {
        "label": "Вызвать администратора для немедленного вывода гостя",
        "correct": false
      },
      {
        "label": "Проигнорировать просьбу и не подходить к столу",
        "correct": false
      },
      {
        "label": "Твердо сказать, что алкоголь закончился",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 4,
    "attestation": false,
    "prompt": "С какой стороны от гостя следует подавать и доливать напитки согласно стандартам ресторана «Этна»?",
    "options": [
      {
        "label": "Всегда через плечо гостя",
        "correct": false
      },
      {
        "label": "Справа",
        "correct": true
      },
      {
        "label": "Слева",
        "correct": false
      },
      {
        "label": "С любой свободной стороны",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Японское слово 姫 (Химэ) в названии нашего авторского коктейля означает:",
    "options": [
      {
        "label": "Утренняя роса",
        "correct": false
      },
      {
        "label": "Барышня знатного происхождения",
        "correct": true
      },
      {
        "label": "Цветок сакуры",
        "correct": false
      },
      {
        "label": "Острый меч",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 0,
    "attestation": false,
    "prompt": "Какой конкретно ликер используется для приготовления коктейля «Кир Роял»?",
    "options": [
      {
        "label": "Вишневый ликер",
        "correct": false
      },
      {
        "label": "Ликер маракуйя",
        "correct": false
      },
      {
        "label": "Персиковый ликер",
        "correct": false
      },
      {
        "label": "Ликер черная смородина",
        "correct": true
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "В описании коктейля «Негрони» указано использование 30 мл джина. Каким вкусовым характеристикам соответствует этот напиток?",
    "options": [
      {
        "label": "Сливочный и нежный",
        "correct": false
      },
      {
        "label": "Освежающий, мятный, слабоалкогольный",
        "correct": false
      },
      {
        "label": "Терпкий, горький, крепкий",
        "correct": true
      },
      {
        "label": "Сладкий, фруктовый, легкий",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 0,
    "attestation": false,
    "prompt": "Какой крепкий алкоголь служит базой для коктейля «Возрождение бурбона» (Bourbon Renewal)?",
    "options": [
      {
        "label": "Ржаной виски",
        "correct": false
      },
      {
        "label": "Водка",
        "correct": false
      },
      {
        "label": "Бурбон",
        "correct": true
      },
      {
        "label": "Джин",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "В какой посуде гостю подается авторский горячий чай «Транс-сибирский Экспресс»?",
    "options": [
      {
        "label": "Классический прозрачный чайник",
        "correct": false
      },
      {
        "label": "Кружка РЖД",
        "correct": true
      },
      {
        "label": "Глиняная чашка",
        "correct": false
      },
      {
        "label": "Деревянная кружка",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Базовым алкоголем для «Цитрусового грога» в нашем меню является:",
    "options": [
      {
        "label": "Водка",
        "correct": false
      },
      {
        "label": "Бренди",
        "correct": false
      },
      {
        "label": "Ром",
        "correct": true
      },
      {
        "label": "Джин",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 0,
    "attestation": false,
    "prompt": "Как правильно подавать коктейль «Порнстар Мартини» согласно описанию его текстуры и состава?",
    "options": [
      {
        "label": "Слоистый шот, который пьется залпом",
        "correct": false
      },
      {
        "label": "Плотный напиток с обязательной подачей игристого вина",
        "correct": true
      },
      {
        "label": "Прозрачный напиток, смешанный методом 'стир'",
        "correct": false
      },
      {
        "label": "Горячий напиток в высоком бокале",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 2,
    "attestation": false,
    "prompt": "Что обязан сделать официант с ледогенератором в конце рабочей смены согласно чек-листу закрытия?",
    "options": [
      {
        "label": "Убрать всё с него и протереть его",
        "correct": true
      },
      {
        "label": "Засыпать в него свежую соль",
        "correct": false
      },
      {
        "label": "Выключить его из розетки",
        "correct": false
      },
      {
        "label": "Полностью разморозить его",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 4,
    "attestation": false,
    "prompt": "Какое правило поведения на «Входе в бар» (место получения напитков) является обязательным для официантов?",
    "options": [
      {
        "label": "Не толпиться и не стоять в ожидании чуда",
        "correct": true
      },
      {
        "label": "Проверять чистоту бокалов прямо за стойкой",
        "correct": false
      },
      {
        "label": "Громко объявлять номер стола бармену",
        "correct": false
      },
      {
        "label": "Самостоятельно наливать безалкогольные напитки",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 5,
    "attestation": false,
    "prompt": "Согласно технике «Два варианта без отказа», как лучше всего предложить сопровождение к стейку мачете?",
    "options": [
      {
        "label": "«У нас есть отличное красное вино, принести?»",
        "correct": false
      },
      {
        "label": "«Желаете ли вы заказать что-нибудь выпить к мясу?»",
        "correct": false
      },
      {
        "label": "«Могу предложить бокал шираза или авторскую сангриту. Что предпочтёте?»",
        "correct": true
      },
      {
        "label": "«К стейку обычно берут водку, вам повторить?»",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 0,
    "attestation": false,
    "prompt": "Какой из классических коктейлей отличается наличием слоя красного сухого вина поверх напитка?",
    "options": [
      {
        "label": "Виски Сауэр",
        "correct": false
      },
      {
        "label": "Нью-Йорк Сауэр",
        "correct": true
      },
      {
        "label": "Негрони",
        "correct": false
      },
      {
        "label": "Манхэттен",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 0,
    "attestation": false,
    "prompt": "К какой категории напитков относится классический Дайкири согласно барной карте?",
    "options": [
      {
        "label": "Шорт-дринк",
        "correct": true
      },
      {
        "label": "Лонг-дринк",
        "correct": false
      },
      {
        "label": "Тики-коктейль",
        "correct": false
      },
      {
        "label": "Дижестив",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 0,
    "attestation": false,
    "prompt": "В чем заключается уникальность вкуса и аромата коктейля Маргарита согласно описанию?",
    "options": [
      {
        "label": "Использование сока голубой агавы",
        "correct": true
      },
      {
        "label": "Добавление миндального сиропа",
        "correct": false
      },
      {
        "label": "Использование ванильного сиропа",
        "correct": false
      },
      {
        "label": "Наличие кофейных нот",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 0,
    "attestation": false,
    "prompt": "Какой дух народа, согласно меню, отражает тропический коктейль Май Тай?",
    "options": [
      {
        "label": "Народа Италии",
        "correct": false
      },
      {
        "label": "Народа Британии",
        "correct": false
      },
      {
        "label": "Народа острова Гаити",
        "correct": true
      },
      {
        "label": "Народа Кубы",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 0,
    "attestation": false,
    "prompt": "Какие вкусовые ноты преобладают в классическом коктейле Негрони?",
    "options": [
      {
        "label": "Терпкий, горький, крепкий",
        "correct": true
      },
      {
        "label": "Сладкий, тропический",
        "correct": false
      },
      {
        "label": "Цитрусовый, ванильный",
        "correct": false
      },
      {
        "label": "Сливочный, кофейный",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 0,
    "attestation": false,
    "prompt": "Какова плотность и текстура коктейля Кровавая Мэри в нашем исполнении?",
    "options": [
      {
        "label": "Легкая текстура, высокая кислотность",
        "correct": false
      },
      {
        "label": "Газированная текстура, очень кислый",
        "correct": false
      },
      {
        "label": "Плотная текстура, средняя острота",
        "correct": true
      },
      {
        "label": "Прозрачная текстура, сладкий",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 0,
    "attestation": false,
    "prompt": "Благодаря какому сериалу стал популярен коктейль Космополитен?",
    "options": [
      {
        "label": "Секс в большом городе",
        "correct": true
      },
      {
        "label": "Сплетница",
        "correct": false
      },
      {
        "label": "Безумцы",
        "correct": false
      },
      {
        "label": "Друзья",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 1,
    "attestation": false,
    "prompt": "Чем вдохновлялись создатели авторского коктейля Альбион?",
    "options": [
      {
        "label": "Скандинавскими мифами о богах",
        "correct": false
      },
      {
        "label": "Американскими памятниками архитектуры",
        "correct": false
      },
      {
        "label": "Древними мореплавателями у берегов Британии",
        "correct": true
      },
      {
        "label": "Индийскими легендами о священных реках",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 1,
    "attestation": false,
    "prompt": "Какие ингредиенты создают насыщенную основу коктейля Рашмор?",
    "options": [
      {
        "label": "Джин и цитрусовый кордиал",
        "correct": false
      },
      {
        "label": "Бурбон и кордиал из красной смородины с черным чаем",
        "correct": true
      },
      {
        "label": "Ром и банановый ликер",
        "correct": false
      },
      {
        "label": "Водка и миндальный сироп",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 1,
    "attestation": false,
    "prompt": "Какое необычное украшение используется в коктейле Бан Ганга для создания атмосферы тропического потока?",
    "options": [
      {
        "label": "Кора ивы",
        "correct": true
      },
      {
        "label": "Долька сушеного апельсина",
        "correct": false
      },
      {
        "label": "Листья нори",
        "correct": false
      },
      {
        "label": "Ветка розмарина",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 1,
    "attestation": false,
    "prompt": "Что означает название авторского коктейля Хи-Мэ (姫)?",
    "options": [
      {
        "label": "Сила и гармония воинов",
        "correct": false
      },
      {
        "label": "Барышня или девушка знатного происхождения",
        "correct": true
      },
      {
        "label": "Священный источник",
        "correct": false
      },
      {
        "label": "Туманный берег",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 1,
    "attestation": false,
    "prompt": "Какой из авторских коктейлей сочетает в себе крепость водки, миндальный сироп и грейпфрут?",
    "options": [
      {
        "label": "Асгард",
        "correct": true
      },
      {
        "label": "Рашмор",
        "correct": false
      },
      {
        "label": "Альбион",
        "correct": false
      },
      {
        "label": "Хи-Мэ",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 1,
    "attestation": false,
    "prompt": "На какой алкогольной основе готовится авторский коктейль Бан Ганга?",
    "options": [
      {
        "label": "Водка",
        "correct": false
      },
      {
        "label": "Ром",
        "correct": true
      },
      {
        "label": "Бурбон",
        "correct": false
      },
      {
        "label": "Джин",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 1,
    "attestation": false,
    "prompt": "Какое послевкусие характерно для коктейля Альбион благодаря его составу?",
    "options": [
      {
        "label": "Дымное",
        "correct": false
      },
      {
        "label": "Миндальное",
        "correct": false
      },
      {
        "label": "Кофейное",
        "correct": false
      },
      {
        "label": "Травянистое",
        "correct": true
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 2,
    "attestation": false,
    "prompt": "Что служит основой для безалкогольного коктейля 'Смородина-бузина'?",
    "options": [
      {
        "label": "Кордиал черный чай-смородина",
        "correct": true
      },
      {
        "label": "Клюквенный морс",
        "correct": false
      },
      {
        "label": "Цитрусовый кордиал",
        "correct": false
      },
      {
        "label": "Сок алоэ",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 2,
    "attestation": false,
    "prompt": "Какой объем сиропа используется для приготовления безалкогольного Апероля?",
    "options": [
      {
        "label": "60 мл",
        "correct": false
      },
      {
        "label": "40 мл",
        "correct": true
      },
      {
        "label": "30 мл",
        "correct": false
      },
      {
        "label": "50 мл",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 2,
    "attestation": false,
    "prompt": "Какой ингредиент придает моктейлю 'Алоэ-зеленое яблоко' его основную вкусовую характеристику?",
    "options": [
      {
        "label": "Сок алоэ",
        "correct": true
      },
      {
        "label": "Лимонный сок",
        "correct": false
      },
      {
        "label": "Мятный сироп",
        "correct": false
      },
      {
        "label": "Яблочное пюре",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 2,
    "attestation": false,
    "prompt": "На основе чего готовится безалкогольный коктейль 'Клюква-маракуйя'?",
    "options": [
      {
        "label": "Клюквенный морс",
        "correct": true
      },
      {
        "label": "Свежевыжатый сок апельсина",
        "correct": false
      },
      {
        "label": "Газированная вода",
        "correct": false
      },
      {
        "label": "Пюре маракуйи",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 3,
    "attestation": false,
    "prompt": "Какое количество ягод (в граммах) используется для приготовления авторских чаев объемом 700 мл?",
    "options": [
      {
        "label": "50 гр",
        "correct": false
      },
      {
        "label": "100 гр",
        "correct": false
      },
      {
        "label": "70 гр",
        "correct": true
      },
      {
        "label": "120 гр",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 3,
    "attestation": false,
    "prompt": "В какой посуде подается 'Гранатовый глинтвейн'?",
    "options": [
      {
        "label": "Деревянная кружка",
        "correct": false
      },
      {
        "label": "Стеклянный бокал с ручкой",
        "correct": false
      },
      {
        "label": "Глиняная чашка",
        "correct": true
      },
      {
        "label": "Кружка РЖД",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 3,
    "attestation": false,
    "prompt": "Какой алкоголь входит в состав горячего коктейля 'Транссибирский экспресс'?",
    "options": [
      {
        "label": "Ром",
        "correct": false
      },
      {
        "label": "Бурбон",
        "correct": false
      },
      {
        "label": "Водка",
        "correct": true
      },
      {
        "label": "Вино",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 3,
    "attestation": false,
    "prompt": "Чем украшается коктейль 'Транссибирский экспресс' при подаче?",
    "options": [
      {
        "label": "Ветка розмарина",
        "correct": true
      },
      {
        "label": "Долька лимона",
        "correct": false
      },
      {
        "label": "Палочка корицы",
        "correct": false
      },
      {
        "label": "Ягоды клюквы",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 3,
    "attestation": false,
    "prompt": "Какой напиток подается в деревянной кружке согласно меню?",
    "options": [
      {
        "label": "Транссибирский экспресс",
        "correct": false
      },
      {
        "label": "Гранатовый глинтвейн",
        "correct": false
      },
      {
        "label": "Цитрусовый грог",
        "correct": true
      },
      {
        "label": "Авторский чай с малиной",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 4,
    "attestation": false,
    "prompt": "На какой базе готовится настойка 'Карамельная клубника'?",
    "options": [
      {
        "label": "Ряженка",
        "correct": true
      },
      {
        "label": "Водка",
        "correct": false
      },
      {
        "label": "Джин",
        "correct": false
      },
      {
        "label": "Сливки",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 4,
    "attestation": false,
    "prompt": "К какому типу напитков относится настойка 'Миндальная вишня'?",
    "options": [
      {
        "label": "Тики-коктейль",
        "correct": false
      },
      {
        "label": "Милк-панч",
        "correct": true
      },
      {
        "label": "Кордиал",
        "correct": false
      },
      {
        "label": "Шорт-дринк",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 4,
    "attestation": false,
    "prompt": "Какой объем водки требуется для приготовления партии настойки Смородина-маракуйя?",
    "options": [
      {
        "label": "2000 мл",
        "correct": false
      },
      {
        "label": "1500 мл",
        "correct": true
      },
      {
        "label": "1000 мл",
        "correct": false
      },
      {
        "label": "500 мл",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 4,
    "attestation": false,
    "prompt": "Чем отличается приготовление безалкогольной Хреновухи от алкогольной версии?",
    "options": [
      {
        "label": "Использованием сушеного хрена",
        "correct": true
      },
      {
        "label": "Отсутствием настаивания",
        "correct": false
      },
      {
        "label": "Добавлением большого количества сахара",
        "correct": false
      },
      {
        "label": "Использованием сиропа хрена",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 4,
    "attestation": false,
    "prompt": "Сколько лимонов требуется для приготовления порции безалкогольного Лимончелло?",
    "options": [
      {
        "label": "500 гр",
        "correct": false
      },
      {
        "label": "300 гр",
        "correct": true
      },
      {
        "label": "70 гр",
        "correct": false
      },
      {
        "label": "150 гр",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 1,
    "attestation": false,
    "prompt": "Какую алкогольную основу имеет коктейль 'Рашмор'?",
    "options": [
      {
        "label": "Ром",
        "correct": false
      },
      {
        "label": "Джин",
        "correct": false
      },
      {
        "label": "Бурбон",
        "correct": true
      },
      {
        "label": "Текила",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 4,
    "attestation": false,
    "prompt": "Какой объем водки используется для приготовления алкогольного Лимончелло (1 литр)?",
    "options": [
      {
        "label": "1 литр",
        "correct": false
      },
      {
        "label": "2 литра",
        "correct": true
      },
      {
        "label": "0.5 литра",
        "correct": false
      },
      {
        "label": "1.5 литра",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Какая общая черта объединяет коктейли Май Тай, Дайкири и Бан Ганга?",
    "options": [
      {
        "label": "Алкогольная база — Ром",
        "correct": true
      },
      {
        "label": "Все они являются шорт-дринками",
        "correct": false
      },
      {
        "label": "Одинаковое украшение",
        "correct": false
      },
      {
        "label": "Все они — горячие коктейли",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 0,
    "attestation": false,
    "prompt": "Какой из классических коктейлей описывается как 'сливочный с кофейными нотами'?",
    "options": [
      {
        "label": "Крестный отец",
        "correct": false
      },
      {
        "label": "Маргарита",
        "correct": false
      },
      {
        "label": "Эспрессо Мартини",
        "correct": false
      },
      {
        "label": "Белый Русский",
        "correct": true
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 4,
    "attestation": false,
    "prompt": "Что входит в состав 'Тики соуса' для авторского блюда Тикки Карри, что перекликается с составом напитков?",
    "options": [
      {
        "label": "Миндальный сироп",
        "correct": false
      },
      {
        "label": "Томатный сок",
        "correct": false
      },
      {
        "label": "Банановый ликер",
        "correct": false
      },
      {
        "label": "Сливки и шрирача",
        "correct": true
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 0,
    "attestation": false,
    "prompt": "В чем главное отличие коктейля Виски Сауэр от Нью-Йорк Сауэр согласно меню?",
    "options": [
      {
        "label": "Разная алкогольная основа",
        "correct": false
      },
      {
        "label": "Отсутствие вина в классической версии",
        "correct": true
      },
      {
        "label": "Разный объем подачи",
        "correct": false
      },
      {
        "label": "Использование разных сиропов",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": 1,
    "attestation": false,
    "prompt": "Какой из авторских коктейлей описывается как 'освежающий напиток с плотной текстурой и травянистым послевкусием'?",
    "options": [
      {
        "label": "Асгард",
        "correct": false
      },
      {
        "label": "Альбион",
        "correct": true
      },
      {
        "label": "Хи-Мэ",
        "correct": false
      },
      {
        "label": "Рашмор",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 0,
    "attestation": false,
    "prompt": "Какие именно виды сыров входят в состав 'Сета к вину' в разделе закусок?",
    "options": [
      {
        "label": "Бри, рокфор, эмменталь и грана падано",
        "correct": false
      },
      {
        "label": "Дорблю, чеддер, моцарелла и маасдам",
        "correct": false
      },
      {
        "label": "Страчателла, сулугуни, пармезан и камамбер",
        "correct": false
      },
      {
        "label": "Камамбер, горгонзола, гауда и пармезан",
        "correct": true
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 0,
    "attestation": false,
    "prompt": "Что входит в состав сливочного соуса для блюда 'Вителло тоннато'?",
    "options": [
      {
        "label": "Майонез, шрирача, соевый соус и чесночное масло",
        "correct": false
      },
      {
        "label": "Сливки, пармезан, белое вино и каперсы",
        "correct": false
      },
      {
        "label": "Сметана, анчоусы, горчица, лимонный сок и каперсы",
        "correct": false
      },
      {
        "label": "Сливки, ворчестер, соевый соус, майонез, консервированный тунец и сушеный чеснок",
        "correct": true
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 0,
    "attestation": false,
    "prompt": "С какими дополнениями подается 'Тар тар из мраморной говядины'?",
    "options": [
      {
        "label": "Желток перепелиного яйца, пита, страчателла и микс салата под пармезаном",
        "correct": true
      },
      {
        "label": "Бородинский хлеб, копченая сметана, каперсы и лук",
        "correct": false
      },
      {
        "label": "Картофельные оладьи, щучья икра и редис",
        "correct": false
      },
      {
        "label": "Тосты из белого хлеба, сливочное масло и вяленые томаты",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 0,
    "attestation": false,
    "prompt": "В чем особенность приготовления 'Ананасов кимчи'?",
    "options": [
      {
        "label": "Они заранее маринуются в остро-сладком соусе на основе сока ананаса, свит чили, шрирачи и лимона",
        "correct": true
      },
      {
        "label": "Ананасы ферментируются вместе с пекинской капустой в течение 3 дней",
        "correct": false
      },
      {
        "label": "Их посыпают сухим маринадом из перца чили и соли непосредственно перед подачей",
        "correct": false
      },
      {
        "label": "Свежие ананасы обжариваются на гриле с добавлением пасты кочудян",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 0,
    "attestation": false,
    "prompt": "Что служит подложкой для 'Картофельных пончиков'?",
    "options": [
      {
        "label": "Сырная пена",
        "correct": false
      },
      {
        "label": "Копченая сметана",
        "correct": true
      },
      {
        "label": "Соус арабьято",
        "correct": false
      },
      {
        "label": "Соус монт блю",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 0,
    "attestation": false,
    "prompt": "Какие сыры используются в начинке 'Кутабов с зеленью'?",
    "options": [
      {
        "label": "Сулугуни и моцарелла",
        "correct": true
      },
      {
        "label": "Фетакса и пармезан",
        "correct": false
      },
      {
        "label": "Страчателла и креметте",
        "correct": false
      },
      {
        "label": "Брынза и творожный сыр",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 0,
    "attestation": false,
    "prompt": "Как подаются 'Ташкентские томаты' в нашем ресторане?",
    "options": [
      {
        "label": "Тонко нарезанными на подложке из авторского соуса с красным луком и копченой сметаной",
        "correct": true
      },
      {
        "label": "Целиком с соусом песто и кедровыми орехами",
        "correct": false
      },
      {
        "label": "Запеченными с чесноком и тимьяном",
        "correct": false
      },
      {
        "label": "В виде салата с кубиками брынзы и оливками",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 1,
    "attestation": false,
    "prompt": "Какой основной соус используется в салате 'Груша с копченой уткой и рукколой'?",
    "options": [
      {
        "label": "Бальзамический соус",
        "correct": false
      },
      {
        "label": "Соус блючиз",
        "correct": true
      },
      {
        "label": "Ореховый соус",
        "correct": false
      },
      {
        "label": "Медово-горчичный соус",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 1,
    "attestation": false,
    "prompt": "Какие овощи входят в состав 'Теплого салата с ребрышками и бататом'?",
    "options": [
      {
        "label": "Огурцы, томаты, красный лук и редис",
        "correct": false
      },
      {
        "label": "Черри, батат, болгарский перец и бейби картофель",
        "correct": true
      },
      {
        "label": "Дайкон, имбирь, чукка и авокадо",
        "correct": false
      },
      {
        "label": "Баклажан, цуккини, болгарский перец и томаты",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 1,
    "attestation": false,
    "prompt": "В чем заключается уникальность заправки в салате 'Тбилиси с говядиной'?",
    "options": [
      {
        "label": "Используется ореховый соус из микса свежих орехов",
        "correct": true
      },
      {
        "label": "Используется чистый винный уксус и масло без добавок",
        "correct": false
      },
      {
        "label": "Используется соус из тунца и каперсов",
        "correct": false
      },
      {
        "label": "Заправляется соусом на основе гранатового сока и кинзы",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 1,
    "attestation": false,
    "prompt": "Что является подложкой для салата с вырезкой из мраморной говядины?",
    "options": [
      {
        "label": "Слой из карамелизированного лука и грибов",
        "correct": false
      },
      {
        "label": "Подушка из отварного риса или киноа",
        "correct": false
      },
      {
        "label": "Пюре из запеченной тыквы",
        "correct": false
      },
      {
        "label": "Запеченные овощи: болгарский перец, цуккини и баклажан",
        "correct": true
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 1,
    "attestation": false,
    "prompt": "Какой необычный фрукт входит в состав 'Поке с авокадо и креветками'?",
    "options": [
      {
        "label": "Консервированный персик",
        "correct": true
      },
      {
        "label": "Карамелизированная груша",
        "correct": false
      },
      {
        "label": "Свежее манго",
        "correct": false
      },
      {
        "label": "Ананас кимчи",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 1,
    "attestation": false,
    "prompt": "Какое дополнение украшает 'Греческий салат' и 'Салат с тунцом' в 'Этне'?",
    "options": [
      {
        "label": "Яйцо пашот",
        "correct": false
      },
      {
        "label": "Стружка из вяленого мяса",
        "correct": false
      },
      {
        "label": "Нежная сырная пена из пармезана, фетаксы и сливок",
        "correct": true
      },
      {
        "label": "Свекольный мягкий сыр",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 1,
    "attestation": false,
    "prompt": "Что используется в качестве гренок (хрустиков) в нашем 'Цезаре с креветкой'?",
    "options": [
      {
        "label": "Хрустики из тортильи",
        "correct": true
      },
      {
        "label": "Чесночные крутоны из багета",
        "correct": false
      },
      {
        "label": "Слайсы поджаренной питы",
        "correct": false
      },
      {
        "label": "Чипсы из пармезана",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 2,
    "attestation": false,
    "prompt": "Что официант ОБЯЗАН уточнить при заказе супа 'Том Ям'?",
    "options": [
      {
        "label": "Нужен ли к нему рис",
        "correct": false
      },
      {
        "label": "Добавлять ли в него кокосовое молоко",
        "correct": false
      },
      {
        "label": "Желает ли гость заменить креветки на курицу",
        "correct": false
      },
      {
        "label": "Что суп УМЕРЕННО пряно-острый",
        "correct": true
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 2,
    "attestation": false,
    "prompt": "Какие грибы используются в нашем 'Том Яме'?",
    "options": [
      {
        "label": "Шитаке и муэр",
        "correct": false
      },
      {
        "label": "Вешенки и шампиньоны",
        "correct": true
      },
      {
        "label": "Цао гу (соломенные грибы)",
        "correct": false
      },
      {
        "label": "Белые грибы и лисички",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 2,
    "attestation": false,
    "prompt": "С какими дополнениями подается наш 'Борщ с ребрышками'?",
    "options": [
      {
        "label": "Запеченные ребра, копченая сметана, смалец, бородинский хлеб и домашняя хреновуха",
        "correct": true
      },
      {
        "label": "Гренки из белого хлеба и соус горчичный",
        "correct": false
      },
      {
        "label": "Только сметана и зелень",
        "correct": false
      },
      {
        "label": "Пампушки с чесноком, обычная сметана и соленое сало",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 2,
    "attestation": false,
    "prompt": "Какая база используется для приготовления 'Деревенской томатной солянки'?",
    "options": [
      {
        "label": "Куриный бульон, томатная паста, овощи и томатный сок",
        "correct": true
      },
      {
        "label": "Рыбный бульон биск и протертые томаты",
        "correct": false
      },
      {
        "label": "Овощной отвар и соус арабьято",
        "correct": false
      },
      {
        "label": "Говяжий бульон и рассол от огурцов",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 2,
    "attestation": false,
    "prompt": "Какие виды мясных изделий входят в состав солянки?",
    "options": [
      {
        "label": "Сосиски, вареная колбаса и тушенка",
        "correct": false
      },
      {
        "label": "Реберное мясо и говяжья вырезка",
        "correct": false
      },
      {
        "label": "Ветчина, бекон и салями",
        "correct": true
      },
      {
        "label": "Ростбиф, курица и охотничьи колбаски",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 2,
    "attestation": false,
    "prompt": "Какой из супов подается с долькой лимона?",
    "options": [
      {
        "label": "Деревенская томатная солянка",
        "correct": true
      },
      {
        "label": "Борщ с ребрышками",
        "correct": false
      },
      {
        "label": "Все супы в меню",
        "correct": false
      },
      {
        "label": "Том Ям",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 2,
    "attestation": false,
    "prompt": "Что объединяет подачу 'Том Яма' и 'Борща' в плане декора или сервировки?",
    "options": [
      {
        "label": "Оба супа варятся на мясном или сложном бульоне (базе)",
        "correct": true
      },
      {
        "label": "Наличие риса в комплекте",
        "correct": false
      },
      {
        "label": "Использование кунжута в оформлении",
        "correct": false
      },
      {
        "label": "Использование копченой сметаны",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 3,
    "attestation": false,
    "prompt": "Какая необычная деталь есть в составе 'Бургера с котлетой из говядины и беконом'?",
    "options": [
      {
        "label": "Яичница-глазунья",
        "correct": false
      },
      {
        "label": "Ананасы кимчи",
        "correct": false
      },
      {
        "label": "Соус из голубого сыра",
        "correct": false
      },
      {
        "label": "Вишневый конфитюр",
        "correct": true
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 3,
    "attestation": false,
    "prompt": "Какой соус используется в бургере с говяжьей котлетой?",
    "options": [
      {
        "label": "Классический кетчуп и майонез",
        "correct": false
      },
      {
        "label": "Розмариновый соус на сливочной основе",
        "correct": true
      },
      {
        "label": "Соус барбекю",
        "correct": false
      },
      {
        "label": "Острый соус шрирача",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 3,
    "attestation": false,
    "prompt": "Что входит в состав 'Бургера с реберным мясом'?",
    "options": [
      {
        "label": "Пшеничная булочка, котлета, бекон и вишня",
        "correct": false
      },
      {
        "label": "Индийская лепешка, рваная говядина и соус блючиз",
        "correct": false
      },
      {
        "label": "Булочка бриошь, реберное мясо, маринованные огурцы, сыр чеддер, томаты и жареный лук",
        "correct": true
      },
      {
        "label": "Булочка бриошь, ребра на кости и салат коул-слоу",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 3,
    "attestation": false,
    "prompt": "На какой основе готовится наша пицца?",
    "options": [
      {
        "label": "Индийская лепешка роти из слоеного теста",
        "correct": true
      },
      {
        "label": "Бездрожжевой лаваш",
        "correct": false
      },
      {
        "label": "Тонкое итальянское тесто на закваске",
        "correct": false
      },
      {
        "label": "Пышное американское тесто",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 3,
    "attestation": false,
    "prompt": "Какой выбор соусов-основ есть у гостя при заказе 'Пиццы роти 4 сыра'?",
    "options": [
      {
        "label": "Сливочный соус или чесночное масло",
        "correct": false
      },
      {
        "label": "Томатный соус или песто",
        "correct": false
      },
      {
        "label": "Соус блючиз или сметана",
        "correct": true
      },
      {
        "label": "Выбора нет, основа всегда томатная",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 3,
    "attestation": false,
    "prompt": "Какой соус используется в пиццах 'Пепперони' и 'С креветками'?",
    "options": [
      {
        "label": "Белый соус цезарь",
        "correct": false
      },
      {
        "label": "Сливочно-шпинатный соус",
        "correct": false
      },
      {
        "label": "Томатно-овощной соус арабьято",
        "correct": true
      },
      {
        "label": "Классический соус маринара",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 3,
    "attestation": false,
    "prompt": "Какие сыры входят в состав 'Пиццы роти 4 сыра'?",
    "options": [
      {
        "label": "Пармезан, моцарелла, плавленный чеддер и блючиз (в основе)",
        "correct": true
      },
      {
        "label": "Пармезан, горгонзола, камамбер и гауда",
        "correct": false
      },
      {
        "label": "Гауда, эмменталь, маасдам и тильзитер",
        "correct": false
      },
      {
        "label": "Сулугуни, брынза, фетакса и страчателла",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 4,
    "attestation": false,
    "prompt": "С каким гарниром и соусом подаются 'Говяжьи щечки'?",
    "options": [
      {
        "label": "С двумя видами риса и соусом карри",
        "correct": false
      },
      {
        "label": "С картофельным пюре и грибным соусом",
        "correct": false
      },
      {
        "label": "С отварным булгуром в сливочно-шпинатном соусе",
        "correct": true
      },
      {
        "label": "С печеным болгарским перцем и бейби картофелем",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 4,
    "attestation": false,
    "prompt": "Что входит в состав гарнира к блюду 'Тонкацу из свинины'?",
    "options": [
      {
        "label": "Просто отварной рис без добавок",
        "correct": false
      },
      {
        "label": "Запеченный картофель с грибным соусом",
        "correct": false
      },
      {
        "label": "Рис и микс овощей: кукуруза, горошек, морковь, грибы муэр, бобы эдамаме и перец",
        "correct": true
      },
      {
        "label": "Стейк из капусты с икрой тобико",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 4,
    "attestation": false,
    "prompt": "Как готовится 'Паста Карбонара' в нашем ресторане по умолчанию?",
    "options": [
      {
        "label": "На жирных сливках с добавлением грибов",
        "correct": false
      },
      {
        "label": "С использованием томатного соуса и ветчины",
        "correct": false
      },
      {
        "label": "Классически на желтках с беконом и пармезаном",
        "correct": true
      },
      {
        "label": "На основе овощного бульона с копченым сыром",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 4,
    "attestation": false,
    "prompt": "В чем особенность приготовления 'Рёбер BBQ'?",
    "options": [
      {
        "label": "Они обжариваются во фритюре до хрустящей корочки",
        "correct": false
      },
      {
        "label": "Это говяжьи ребра, которые подаются в сыром виде как карпаччо",
        "correct": false
      },
      {
        "label": "Их маринуют в уксусе 24 часа перед подачей",
        "correct": false
      },
      {
        "label": "Они томятся методом су-вид, поэтому мясо легко отходит от кости",
        "correct": true
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 4,
    "attestation": false,
    "prompt": "С каким гарниром и соусом подается 'Семга'?",
    "options": [
      {
        "label": "С запеченным картофелем и томатным соусом",
        "correct": false
      },
      {
        "label": "С рисом и азиатским соусом",
        "correct": false
      },
      {
        "label": "Со стейком из томленой капусты под сливочным соусом с икрой тобико",
        "correct": true
      },
      {
        "label": "С миксом салата и лимонным маслом",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 4,
    "attestation": false,
    "prompt": "Что представляет собой блюдо 'Тикки Карри'?",
    "options": [
      {
        "label": "Куриное филе су-вид с двумя видами риса под пряным (не острым) соусом",
        "correct": true
      },
      {
        "label": "Индийские вегетарианские котлеты из нута",
        "correct": false
      },
      {
        "label": "Острые креветки в панировке с овощами",
        "correct": false
      },
      {
        "label": "Жареная свинина в остром соусе чили",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 4,
    "attestation": false,
    "prompt": "С какими дополнениями подается 'Камбала'?",
    "options": [
      {
        "label": "С картофельными пончиками и щучьей икрой",
        "correct": false
      },
      {
        "label": "В чистом виде с долькой лимона",
        "correct": false
      },
      {
        "label": "Под томатным соусом с маслинами, оливками и апельсином",
        "correct": true
      },
      {
        "label": "С отварным булгуром и шпинатом",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 5,
    "attestation": false,
    "prompt": "Какая начинка используется в нашем фирменном 'Меренговом рулете'?",
    "options": [
      {
        "label": "Вареная сгущенка",
        "correct": false
      },
      {
        "label": "Кусочки персика",
        "correct": true
      },
      {
        "label": "Свежая малина",
        "correct": false
      },
      {
        "label": "Фисташковый крем",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 5,
    "attestation": false,
    "prompt": "В чем заключается особенность нашего десерта 'Сан-Себастьян'?",
    "options": [
      {
        "label": "Он подается с горячим карамельным соусом",
        "correct": false
      },
      {
        "label": "Это классический творожный пирог с ягодами",
        "correct": false
      },
      {
        "label": "Это мягкий шоколадный чизкейк с крошкой из шоколадного печенья",
        "correct": true
      },
      {
        "label": "В него добавляется белый ром",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 5,
    "attestation": false,
    "prompt": "Какой секретный ингредиент входит в состав десерта 'Картошка'?",
    "options": [
      {
        "label": "Белый ром",
        "correct": true
      },
      {
        "label": "Коньяк",
        "correct": false
      },
      {
        "label": "Кофейный экстракт",
        "correct": false
      },
      {
        "label": "Ликер Амаретто",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 5,
    "attestation": false,
    "prompt": "Что представляет собой десерт 'Сливочная халва' в нашем меню?",
    "options": [
      {
        "label": "Торт-наполеон с прослойкой из халвы",
        "correct": false
      },
      {
        "label": "Мороженое со вкусом халвы",
        "correct": false
      },
      {
        "label": "Классический плотный брусок халвы с семечками",
        "correct": false
      },
      {
        "label": "Халва, смешанная с сыром креметте, с карамелизированными орехами и хрустиками из тортильи",
        "correct": true
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 5,
    "attestation": false,
    "prompt": "Как оформляется десерт 'Картошка' при подаче?",
    "options": [
      {
        "label": "Подается под 'землей' из крошки шоколадного печенья",
        "correct": true
      },
      {
        "label": "Посыпается сахарной пудрой",
        "correct": false
      },
      {
        "label": "Украшается свежими ягодами малины",
        "correct": false
      },
      {
        "label": "Поливается белым шоколадом",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 5,
    "attestation": false,
    "prompt": "Что входит в состав 'орехов в карамели' для десерта с халвой?",
    "options": [
      {
        "label": "Фундук, карамельный сироп и морская соль",
        "correct": false
      },
      {
        "label": "Грецкие орехи, мёд, сок лимона и тростниковый сахар",
        "correct": true
      },
      {
        "label": "Кешью и вареная сгущенка",
        "correct": false
      },
      {
        "label": "Миндаль и кленовый сироп",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 5,
    "attestation": false,
    "prompt": "Какой из десертов рекомендуется гостям, которые любят 'нежное и не приторное' (согласно Главе 5.3)?",
    "options": [
      {
        "label": "Сан-Себастьян",
        "correct": false
      },
      {
        "label": "Меренговый рулет",
        "correct": true
      },
      {
        "label": "Сливочная халва",
        "correct": false
      },
      {
        "label": "Десерт 'Картошка'",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Какой из перечисленных ингредиентов является ключевым компонентом соуса в блюде «Вителло тоннато»?",
    "options": [
      {
        "label": "Печень трески",
        "correct": false
      },
      {
        "label": "Консервированный тунец",
        "correct": true
      },
      {
        "label": "Анчоусы и каперсы (без рыбы)",
        "correct": false
      },
      {
        "label": "Сливочный сыр и хрен",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "С каким топпингом подаются «Картофельные пончики» в ресторане «Этна»?",
    "options": [
      {
        "label": "Бекон и зеленый лук",
        "correct": false
      },
      {
        "label": "Щучья икра и редис",
        "correct": true
      },
      {
        "label": "Трюфельное масло и пармезан",
        "correct": false
      },
      {
        "label": "Красная икра и огурец",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Какие виды сыров входят в состав начинки для «Кутабов»?",
    "options": [
      {
        "label": "Брынза и адыгейский сыр",
        "correct": false
      },
      {
        "label": "Фета и пармезан",
        "correct": false
      },
      {
        "label": "Чеддер и гауда",
        "correct": false
      },
      {
        "label": "Сулугуни и моцарелла",
        "correct": true
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "В чем заключается особенность приготовления салата «Тбилиси» согласно меню?",
    "options": [
      {
        "label": "Использование орехового соуса из микса свежих орехов",
        "correct": true
      },
      {
        "label": "Использование только маринованной говядины",
        "correct": false
      },
      {
        "label": "Заправка на основе майонеза и чеснока",
        "correct": false
      },
      {
        "label": "Добавление копченого сулугуни",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Какой необычный сырный компонент используется в «Салате с вырезкой из мраморной говядины»?",
    "options": [
      {
        "label": "Жареный халуми",
        "correct": false
      },
      {
        "label": "Мусс из горгонзолы",
        "correct": false
      },
      {
        "label": "Козий сыр в панировке",
        "correct": false
      },
      {
        "label": "Свекольный мягкий сыр",
        "correct": true
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "На какой «подушке» гость может выбрать подачу «Поке с авокадо и креветками»?",
    "options": [
      {
        "label": "Картофельное пюре или птитим",
        "correct": false
      },
      {
        "label": "Микс салата или фунчоза",
        "correct": false
      },
      {
        "label": "Рис или киноа",
        "correct": true
      },
      {
        "label": "Булгур или кускус",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Какая деталь в подаче «Греческого салата» отличает его от классического варианта?",
    "options": [
      {
        "label": "Добавление обжаренных креветок",
        "correct": false
      },
      {
        "label": "Подача в корзинке из теста фило",
        "correct": false
      },
      {
        "label": "Заправка из соуса «бальзамическая икра»",
        "correct": false
      },
      {
        "label": "Использование сырной пены и пудры из маслин",
        "correct": true
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Что важно сообщить гостю при заказе супа «Том ям» согласно базе знаний?",
    "options": [
      {
        "label": "Что это самый острый суп в городе",
        "correct": false
      },
      {
        "label": "Что суп является умеренно пряно-острым",
        "correct": true
      },
      {
        "label": "Что он подается без риса",
        "correct": false
      },
      {
        "label": "Что в нем нет морепродуктов",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Какой алкогольный напиток входит в стандарт подачи «Борща с ребрышками»?",
    "options": [
      {
        "label": "Бокал красного вина",
        "correct": false
      },
      {
        "label": "Домашняя хреновуха",
        "correct": true
      },
      {
        "label": "Стопка ледяной водки",
        "correct": false
      },
      {
        "label": "Гранатовое вино",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "В чем особенность основы для «Пиццы роти» в нашем ресторане?",
    "options": [
      {
        "label": "Это классическое тонкое итальянское тесто",
        "correct": false
      },
      {
        "label": "Она делается из безглютеновой муки",
        "correct": false
      },
      {
        "label": "Она выпекается на черном угле",
        "correct": false
      },
      {
        "label": "Она готовится на индийской лепешке из слоеного теста",
        "correct": true
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "С каким гарниром и соусом подаются «Говяжьи щечки»?",
    "options": [
      {
        "label": "Овощи гриль и перечный соус",
        "correct": false
      },
      {
        "label": "Картофельное пюре и соус демиглас",
        "correct": false
      },
      {
        "label": "Рис и соус карри",
        "correct": false
      },
      {
        "label": "Булгур и сливочно-шпинатный соус",
        "correct": true
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Какое мясо используется для приготовления блюда «Оджахури»?",
    "options": [
      {
        "label": "Говяжья вырезка",
        "correct": true
      },
      {
        "label": "Куриное филе су-вид",
        "correct": false
      },
      {
        "label": "Мякоть баранины",
        "correct": false
      },
      {
        "label": "Свиная шея",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Что входит в состав гарнира к «Тонкацу из свинины»?",
    "options": [
      {
        "label": "Картофель фри и салат коул-слоу",
        "correct": false
      },
      {
        "label": "Жареные баклажаны и цуккини",
        "correct": false
      },
      {
        "label": "Только белый рис без добавок",
        "correct": false
      },
      {
        "label": "Рис с кукурузой, горошком, морковью, грибами муэр и бобами эдамаме",
        "correct": true
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "С каким гарниром подается «Семга» в разделе основных блюд?",
    "options": [
      {
        "label": "Дикий рис и спаржа",
        "correct": false
      },
      {
        "label": "Томленый стейк из капусты",
        "correct": true
      },
      {
        "label": "Шпинат в сливках",
        "correct": false
      },
      {
        "label": "Бейби картофель с розмарином",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Какую особенность имеет наш десерт «Сан-себастьян»?",
    "options": [
      {
        "label": "Это шоколадный чизкейк с крошкой шоколадного печенья",
        "correct": true
      },
      {
        "label": "Он подается с инжирным вареньем",
        "correct": false
      },
      {
        "label": "Он готовится без использования яиц",
        "correct": false
      },
      {
        "label": "В него добавляется белый ром",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Из каких ингредиентов состоит «Сливочная халва» в нашем десертном меню?",
    "options": [
      {
        "label": "Мусс из халвы на основе взбитых сливок и безе",
        "correct": false
      },
      {
        "label": "Халва с добавлением меда и кунжута",
        "correct": false
      },
      {
        "label": "Халва, смешанная с сыром креметте, с грецкими орехами в карамели",
        "correct": true
      },
      {
        "label": "Классическая подсолнечная халва с шариком мороженого",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Какой фрукт является основой начинки в «Меренговом рулете»?",
    "options": [
      {
        "label": "Персик",
        "correct": true
      },
      {
        "label": "Малина",
        "correct": false
      },
      {
        "label": "Манго",
        "correct": false
      },
      {
        "label": "Клубника",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Чем заправляются «Ташкентские томаты»?",
    "options": [
      {
        "label": "Бальзамическим кремом и соусом песто",
        "correct": false
      },
      {
        "label": "Сложным соусом на основе оливкового масла, уксусов, меда и шрирачи",
        "correct": true
      },
      {
        "label": "Просто солью и нерафинированным маслом",
        "correct": false
      },
      {
        "label": "Зеленым маслом с добавлением кедровых орехов",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Какая основа используется для «Пиццы роти пепперони»?",
    "options": [
      {
        "label": "Сливочный соус блючиз",
        "correct": false
      },
      {
        "label": "Томатно-овощной соус арабьято",
        "correct": true
      },
      {
        "label": "Сметанная подложка",
        "correct": false
      },
      {
        "label": "Чесночное масло и базилик",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "С каким соусом подается «Батат фри с пармезаном»?",
    "options": [
      {
        "label": "Обычный кетчуп",
        "correct": false
      },
      {
        "label": "Чесночный соус на основе майонеза",
        "correct": false
      },
      {
        "label": "Соус монт блю (блючиз)",
        "correct": true
      },
      {
        "label": "Кисло-сладкий чили",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 1,
    "attestation": false,
    "prompt": "Какое ключевое понятие определяет сервис в ресторане «Этна» согласно главе о концепции?",
    "options": [
      {
        "label": "Строгое соблюдение классических протоколов обслуживания",
        "correct": false
      },
      {
        "label": "Минимальное взаимодействие для обеспечения приватности",
        "correct": false
      },
      {
        "label": "Акцент на быстрой подаче блюд в стиле 'фаст-кэжуал'",
        "correct": false
      },
      {
        "label": "Создание уютной домашней приветливой атмосферы",
        "correct": true
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 1,
    "attestation": false,
    "prompt": "Как официант должен изменить свой стиль общения, если за столом сидит шумная и веселая компания?",
    "options": [
      {
        "label": "Открыто улыбаться и поддерживать шутки",
        "correct": true
      },
      {
        "label": "Попросить гостей вести себя тише, соблюдая концепцию 'домашнего уюта'",
        "correct": false
      },
      {
        "label": "Сохранять нейтрально-вежливую дистанцию во избежание панибратства",
        "correct": false
      },
      {
        "label": "Сделать музыку в зале громче, чтобы соответствовать их настроению",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 1,
    "attestation": false,
    "prompt": "Какие конкретные артефакты упоминаются как часть интерьера, созданного Юрием?",
    "options": [
      {
        "label": "Балясины с усадьбы Островского",
        "correct": true
      },
      {
        "label": "Картины современных этнических художников",
        "correct": false
      },
      {
        "label": "Глиняные амфоры с раскопок в Греции",
        "correct": false
      },
      {
        "label": "Антикварные подсвечники из Италии",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 1,
    "attestation": false,
    "prompt": "Какая роль в команде описывается как 'всея РУСИ' и отвечает за решение глобальных конфликтов?",
    "options": [
      {
        "label": "Старший официант",
        "correct": false
      },
      {
        "label": "Шеф-повар",
        "correct": false
      },
      {
        "label": "Администратор",
        "correct": false
      },
      {
        "label": "Директор / Управляющий Юрий",
        "correct": true
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 2,
    "attestation": false,
    "prompt": "Что входит в обязанности официанта по отношению к зоне 'Сервант'?",
    "options": [
      {
        "label": "Следить за чистотой и пополнением приборами и салфетками всю смену",
        "correct": true
      },
      {
        "label": "Хранить там личные вещи и мобильный телефон",
        "correct": false
      },
      {
        "label": "Протирать пыль только в конце недели",
        "correct": false
      },
      {
        "label": "Забирать оттуда готовые напитки",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 4,
    "attestation": false,
    "prompt": "Какое правило поведения на линии раздачи кухни является обязательным?",
    "options": [
      {
        "label": "Помогать поварам выкладывать блюда на тарелки",
        "correct": false
      },
      {
        "label": "Ждать блюдо непосредственно у раздачи для ускорения сервиса",
        "correct": false
      },
      {
        "label": "Протирать зону раздачи только по требованию шеф-повара",
        "correct": false
      },
      {
        "label": "Не толпиться на раздаче всем коллективом",
        "correct": true
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 2,
    "attestation": false,
    "prompt": "Какое задание стажер должен выполнить в первую очередь при изучении карты зала?",
    "options": [
      {
        "label": "Выучить имена всех постоянных гостей",
        "correct": false
      },
      {
        "label": "Натереть все приборы в серванте до блеска",
        "correct": false
      },
      {
        "label": "Расставить столы согласно схеме банкета",
        "correct": false
      },
      {
        "label": "Пройти по залу и найти каждую техническую зону по схеме",
        "correct": true
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 2,
    "attestation": false,
    "prompt": "Какие требования предъявляются к обуви официанта в ресторане «Этна»?",
    "options": [
      {
        "label": "Любая спортивная обувь ярких расцветок",
        "correct": false
      },
      {
        "label": "Закрытая, чистая и удобная",
        "correct": true
      },
      {
        "label": "Открытые сандалии в летний период",
        "correct": false
      },
      {
        "label": "Классические туфли на каблуке для девушек",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 2,
    "attestation": false,
    "prompt": "Разрешены ли джинсы в качестве рабочей формы официанта?",
    "options": [
      {
        "label": "Только по согласованию с администратором в выходные дни",
        "correct": false
      },
      {
        "label": "Да, если на них нет яркого принта",
        "correct": true
      },
      {
        "label": "Нет, разрешены только классические брюки",
        "correct": false
      },
      {
        "label": "Да, любые джинсы, включая рваные и с нашивками",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 2,
    "attestation": false,
    "prompt": "Какое правило использования мобильного телефона действует во время смены?",
    "options": [
      {
        "label": "Можно использовать в зале только для записи заказа",
        "correct": true
      },
      {
        "label": "Телефон должен находиться в серванте на зарядке",
        "correct": false
      },
      {
        "label": "Можно отвечать на личные звонки, если нет гостей",
        "correct": false
      },
      {
        "label": "Телефон категорически запрещен в зале",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 2,
    "attestation": false,
    "prompt": "В какое время официант обязан быть в ресторане для начала подготовки к смене?",
    "options": [
      {
        "label": "К 12:00, когда приходят первые гости",
        "correct": false
      },
      {
        "label": "Заблаговременно до 11:30",
        "correct": true
      },
      {
        "label": "В 11:00 для совместного завтрака",
        "correct": false
      },
      {
        "label": "Ровно в 11:30",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Какие номера рубильников необходимо включить при открытии смены?",
    "options": [
      {
        "label": "1, 2, 3, 4, 5",
        "correct": false
      },
      {
        "label": "6, 8, 9, 11, 12",
        "correct": true
      },
      {
        "label": "Только рубильники 11 и 12",
        "correct": false
      },
      {
        "label": "Все рубильники в щитке",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 2,
    "attestation": false,
    "prompt": "Что официант должен сделать с диванами в зале во время открытия и закрытия?",
    "options": [
      {
        "label": "Протереть влажной тряпкой с дезинфектором",
        "correct": false
      },
      {
        "label": "Очистить щеткой от крошек и выровнять",
        "correct": true
      },
      {
        "label": "Просто поправить подушки",
        "correct": false
      },
      {
        "label": "Передвинуть их для мытья пола мойщицей",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 2,
    "attestation": false,
    "prompt": "Какая задача по пополнению запасов стоит перед официантом в конце смены?",
    "options": [
      {
        "label": "Пополнить запас накрученных салфеток и перчаток",
        "correct": true
      },
      {
        "label": "Заказать продукты у поставщиков",
        "correct": false
      },
      {
        "label": "Заполнить винный шкаф новыми бутылками",
        "correct": false
      },
      {
        "label": "Сварить морс на завтрашний день",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "В чем заключается особенность подачи супа Том Ям в ресторане «Этна»?",
    "options": [
      {
        "label": "Его острота характеризуется как умеренная",
        "correct": true
      },
      {
        "label": "В составе присутствуют только морепродукты без грибов",
        "correct": false
      },
      {
        "label": "В него не добавляются кокосовые сливки",
        "correct": false
      },
      {
        "label": "Он подается экстремально острым по умолчанию",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": 0,
    "attestation": false,
    "prompt": "Что входит в состав соуса для креветок 'Бэнг Бэнг'?",
    "options": [
      {
        "label": "Устричный соус и апельсиновый сок",
        "correct": false
      },
      {
        "label": "Майонез, свит чили, шрирача",
        "correct": true
      },
      {
        "label": "Сливки, пармезан и чеснок",
        "correct": false
      },
      {
        "label": "Соевый соус, мед и кунжутное масло",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Каким образом подается классический борщ в нашем заведении?",
    "options": [
      {
        "label": "Только с пампушками и салом",
        "correct": false
      },
      {
        "label": "В хлебной чаше с чесночным маслом",
        "correct": false
      },
      {
        "label": "С гренками из белого хлеба и обычной сметаной",
        "correct": false
      },
      {
        "label": "С запеченными ребрами, копченой сметаной, смальцем и хреновухой",
        "correct": true
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Что является основой для всех видов пиццы Роти в меню?",
    "options": [
      {
        "label": "Тонкое пресное тесто как для кутабов",
        "correct": false
      },
      {
        "label": "Индийская лепешка из слоеного теста",
        "correct": true
      },
      {
        "label": "Классическое дрожжевое тесто для пиццы",
        "correct": false
      },
      {
        "label": "Картофельное пюре с мукой",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Какой гарнир подается к томленым говяжьим щечкам?",
    "options": [
      {
        "label": "Булгур в сливочно-шпинатном соусе",
        "correct": true
      },
      {
        "label": "Рис жасмин с овощами",
        "correct": false
      },
      {
        "label": "Запеченный батат с пармезаном",
        "correct": false
      },
      {
        "label": "Картофельное пюре с трюфельным маслом",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "В чем уникальность десерта 'Картошка' в нашем исполнении?",
    "options": [
      {
        "label": "Он подается 'под землей' из крошки шоколадного печенья",
        "correct": true
      },
      {
        "label": "Он подается с инжирным вареньем",
        "correct": false
      },
      {
        "label": "Он готовится из настоящей запеченной картошки",
        "correct": false
      },
      {
        "label": "Внутри находится жидкий центр из карамели",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Какое вино используется для создания коктейля 'Нью-Йорк Сауэр'?",
    "options": [
      {
        "label": "Красное сухое вино",
        "correct": true
      },
      {
        "label": "Крепленое вино (Портвейн)",
        "correct": false
      },
      {
        "label": "Белое сухое вино (Рислинг)",
        "correct": false
      },
      {
        "label": "Игристое вино (Просекко)",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 4,
    "attestation": false,
    "prompt": "Какое из правил 'Пяти шагов' сервиса выполняется вторым по счету?",
    "options": [
      {
        "label": "Предложение аперитива",
        "correct": false
      },
      {
        "label": "Помощь с посадкой",
        "correct": true
      },
      {
        "label": "Подача меню",
        "correct": false
      },
      {
        "label": "Прием заказа",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 4,
    "attestation": false,
    "prompt": "С какой стороны от гостя правильно подавать блюда согласно стандартам?",
    "options": [
      {
        "label": "Сторона не имеет значения, главное — техника 'открытой ладони'",
        "correct": false
      },
      {
        "label": "Всегда только справа, чтобы не мешать гостю",
        "correct": false
      },
      {
        "label": "Слева левой рукой",
        "correct": true
      },
      {
        "label": "Справа правой рукой",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 4,
    "attestation": false,
    "prompt": "Каков приоритет подачи меню гостям за столом?",
    "options": [
      {
        "label": "Детям, затем мужчинам, затем женщинам",
        "correct": false
      },
      {
        "label": "Случайный порядок для создания непринужденной атмосферы",
        "correct": false
      },
      {
        "label": "Хозяину стола, затем всем остальным по кругу",
        "correct": false
      },
      {
        "label": "Дамам, затем старшим гостям, затем мужчинам",
        "correct": true
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "В течение какого времени должны быть поданы напитки после совершения заказа?",
    "options": [
      {
        "label": "В течение 5 минут",
        "correct": true
      },
      {
        "label": "Сразу же вместе с закусками",
        "correct": false
      },
      {
        "label": "По готовности бармена, ограничений по времени нет",
        "correct": false
      },
      {
        "label": "В течение 10 минут",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 4,
    "attestation": false,
    "prompt": "Какова рекомендуемая пауза между подачей закуски и горячего блюда?",
    "options": [
      {
        "label": "Пауза не нужна, если гость очень голоден",
        "correct": false
      },
      {
        "label": "15 минут, чтобы гость успел проголодаться",
        "correct": false
      },
      {
        "label": "Горячее выносится мгновенно после того, как убрали тарелку из-под закуски",
        "correct": false
      },
      {
        "label": "5-7 минут",
        "correct": true
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 4,
    "attestation": false,
    "prompt": "Что означает правило 'Смотрители зала'?",
    "options": [
      {
        "label": "За залом следит хостес через камеры видеонаблюдения",
        "correct": false
      },
      {
        "label": "Бармены обязаны следить за залом, пока официанты на кухне",
        "correct": false
      },
      {
        "label": "Хотя бы один официант всегда должен находиться в поле зрения гостей в зале",
        "correct": true
      },
      {
        "label": "Официанты могут уходить на перерыв одновременно, если в зале мало гостей",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 4,
    "attestation": false,
    "prompt": "Как правильно переносить поднос по технике 'Плечо официанта'?",
    "options": [
      {
        "label": "Обеими руками перед собой на уровне пояса",
        "correct": false
      },
      {
        "label": "Тяжелые предметы ставить на край, чтобы было легче контролировать наклон",
        "correct": false
      },
      {
        "label": "На левой ладони, пальцы раскрыты веером, не прижимая к груди",
        "correct": true
      },
      {
        "label": "На плече, придерживая одной рукой для устойчивости",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "В чем заключается суть техники 'Два варианта без отказа'?",
    "options": [
      {
        "label": "Всегда приносить два бокала вина, даже если заказан один",
        "correct": false
      },
      {
        "label": "Задавать вопрос так, чтобы гость выбирал между 'да' и 'да'",
        "correct": true
      },
      {
        "label": "Предлагать гостю на выбор два самых дорогих блюда",
        "correct": false
      },
      {
        "label": "Давать гостю две попытки, если он сначала отказался от заказа",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Когда уместно применять технику 'Бутылка вместо бокалов'?",
    "options": [
      {
        "label": "Когда один гость заказывает второй бокал вина",
        "correct": false
      },
      {
        "label": "Если гость хочет попробовать вино перед заказом",
        "correct": false
      },
      {
        "label": "Когда гости пьют разные вина, но одного производителя",
        "correct": false
      },
      {
        "label": "Когда двое и более гостей заказали по бокалу одного и того же вина",
        "correct": true
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 5,
    "attestation": false,
    "prompt": "Что такое 'Трёхшаговая рекомендация' при помощи гостю в выборе блюда?",
    "options": [
      {
        "label": "Предложение трех вариантов: легкий, сытный и 'визитная карточка'",
        "correct": true
      },
      {
        "label": "Описание вкуса, состава и способа приготовления одного блюда",
        "correct": false
      },
      {
        "label": "Рекомендация блюда, затем соуса к нему, затем напитка",
        "correct": false
      },
      {
        "label": "Сначала предложить закуску, потом основное, потом десерт",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 5,
    "attestation": false,
    "prompt": "Какую стоп-фразу нельзя использовать при приеме оплаты?",
    "options": [
      {
        "label": "Удобно оплатить картой или наличными?",
        "correct": false
      },
      {
        "label": "Я сейчас принесу терминал",
        "correct": false
      },
      {
        "label": "Ваш счет — [сумма] рублей",
        "correct": false
      },
      {
        "label": "С вас [сумма]",
        "correct": true
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 5,
    "attestation": false,
    "prompt": "Что официант должен предложить в качестве 'кросс-сейла' к стейку мачете?",
    "options": [
      {
        "label": "Запеченный картофель с грибным соусом",
        "correct": true
      },
      {
        "label": "Еще один стейк со скидкой",
        "correct": false
      },
      {
        "label": "Стакан воды",
        "correct": false
      },
      {
        "label": "Десерт Сан-Себастьян",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 5,
    "attestation": false,
    "prompt": "В чем суть продажи через 'Личную рекомендацию'?",
    "options": [
      {
        "label": "Сказать, что это блюдо заказывает сам Юрий",
        "correct": false
      },
      {
        "label": "Поделиться собственным вкусовым опытом (например, про меренговый рулет)",
        "correct": true
      },
      {
        "label": "Утверждать, что повар приготовил это блюдо специально для этого гостя",
        "correct": false
      },
      {
        "label": "Рассказать гостю, какое блюдо самое дорогое в меню",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 5,
    "attestation": false,
    "prompt": "Какую профессиональную замену следует использовать вместо фразы 'Я не знаю'?",
    "options": [
      {
        "label": "Я стажер, спросите другого официанта",
        "correct": false
      },
      {
        "label": "Посмотрите, пожалуйста, в меню самостоятельно",
        "correct": false
      },
      {
        "label": "Наверное, в составе есть орехи",
        "correct": false
      },
      {
        "label": "Сейчас уточню у повара / бармена. Одну минуту",
        "correct": true
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 6,
    "attestation": false,
    "prompt": "Что означает буква 'П' в алгоритме ПРИ при работе с жалобой гостя?",
    "options": [
      {
        "label": "Предупредить",
        "correct": false
      },
      {
        "label": "Присоединиться",
        "correct": true
      },
      {
        "label": "Переделать",
        "correct": false
      },
      {
        "label": "Поспорить",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 6,
    "attestation": false,
    "prompt": "Что категорически запрещено делать при получении жалобы на блюдо?",
    "options": [
      {
        "label": "Обвинять кухню ('Это не я, это повара!')",
        "correct": true
      },
      {
        "label": "Коротко объяснить причину ошибки",
        "correct": false
      },
      {
        "label": "Предлагать заменить блюдо на новое",
        "correct": false
      },
      {
        "label": "Соглашаться с чувствами гостя",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Как корректно отказать гостю в продаже алкоголя при сильном опьянении?",
    "options": [
      {
        "label": "Сделать вид, что алкоголь закончился",
        "correct": false
      },
      {
        "label": "Предложить фирменный чай или кофе, чтобы 'взбодриться'",
        "correct": true
      },
      {
        "label": "Вызвать охрану и вывести гостя без объяснений",
        "correct": false
      },
      {
        "label": "Сказать прямо: 'Вы слишком пьяны, я вам больше не налью'",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 6,
    "attestation": false,
    "prompt": "Какое действие официанта является обязательным, если гость сообщил об аллергии на орехи?",
    "options": [
      {
        "label": "Предложить гостю выбрать любое блюдо из детского меню",
        "correct": false
      },
      {
        "label": "Сказать: 'Кажется, там нет орехов, не волнуйтесь'",
        "correct": false
      },
      {
        "label": "Проверить состав по паспорту блюда и уточнить у шеф-повара",
        "correct": true
      },
      {
        "label": "Запомнить аллергию на слух, не записывая",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 6,
    "attestation": false,
    "prompt": "Что должен сделать официант первым делом, если он случайно опрокинул напиток на гостя?",
    "options": [
      {
        "label": "Немедленно извиниться и предложить чистую салфетку",
        "correct": true
      },
      {
        "label": "Убежать за администратором",
        "correct": false
      },
      {
        "label": "Сказать, что стакан был слишком скользким",
        "correct": false
      },
      {
        "label": "Предложить гостю оплатить его химчистку самостоятельно",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 6,
    "attestation": false,
    "prompt": "Как реагировать, если гость уронил прибор на пол?",
    "options": [
      {
        "label": "Поднять грязный прибор и протереть его салфеткой",
        "correct": false
      },
      {
        "label": "Подождать, пока гость сам попросит новый",
        "correct": false
      },
      {
        "label": "Сделать замечание, чтобы гость был аккуратнее",
        "correct": false
      },
      {
        "label": "Мгновенно заменить на чистый без напоминания",
        "correct": true
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 6,
    "attestation": false,
    "prompt": "Кого рекомендуется обслуживать первым при наличии ребенка за столом?",
    "options": [
      {
        "label": "Ребенка (принести его заказ первым)",
        "correct": true
      },
      {
        "label": "Мать ребенка",
        "correct": false
      },
      {
        "label": "Главу семьи, чтобы он одобрил выбор",
        "correct": false
      },
      {
        "label": "Всех одновременно, когда будут готовы все блюда",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 7,
    "attestation": false,
    "prompt": "Что в ресторанном сленге «Этны» означают термины «Плюс» и «Минус»?",
    "options": [
      {
        "label": "Прибыль и убыток за смену",
        "correct": false
      },
      {
        "label": "Наличие или отсутствие блюда в стоп-листе",
        "correct": false
      },
      {
        "label": "Положительный и отрицательный отзыв гостя",
        "correct": false
      },
      {
        "label": "Холодильник и морозильная камера",
        "correct": true
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 7,
    "attestation": false,
    "prompt": "Где находится зона «Бек»?",
    "options": [
      {
        "label": "На летней веранде",
        "correct": false
      },
      {
        "label": "У входа в гостевой туалет",
        "correct": false
      },
      {
        "label": "Сразу за барной стойкой",
        "correct": false
      },
      {
        "label": "У выхода для работников, рядом с раздевалкой",
        "correct": true
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Какую зону официант обязан прибрать у льдогенератора в конце смены?",
    "options": [
      {
        "label": "Сухотарку",
        "correct": false
      },
      {
        "label": "Стафф-зону",
        "correct": true
      },
      {
        "label": "Линию раздачи",
        "correct": false
      },
      {
        "label": "Хозку",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 4,
    "attestation": false,
    "prompt": "Как правильно благодарить за чаевые?",
    "options": [
      {
        "label": "Просто кивнуть и уйти",
        "correct": false
      },
      {
        "label": "Пересчитать их при госте и сказать 'Спасибо'",
        "correct": false
      },
      {
        "label": "Сказать: 'Спасибо большое, мне очень приятно'",
        "correct": true
      },
      {
        "label": "Обсудить сумму с коллегой в зале сразу после получения",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 6,
    "attestation": false,
    "prompt": "Что делать, если вы забыли, кто из гостей что заказал?",
    "options": [
      {
        "label": "Вернуть блюдо на кухню, пока не вспомните",
        "correct": false
      },
      {
        "label": "Поставить тарелки наугад",
        "correct": false
      },
      {
        "label": "Спросить 'Кто заказывал стейк?' громко на весь зал",
        "correct": false
      },
      {
        "label": "Уточнить детали у стола, честно признав ошибку",
        "correct": true
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 7,
    "attestation": false,
    "prompt": "Где официанту разрешено принимать пищу?",
    "options": [
      {
        "label": "За свободным столом в зале до открытия",
        "correct": false
      },
      {
        "label": "Только на беке во время перерыва",
        "correct": true
      },
      {
        "label": "На линии раздачи, если нет заказов",
        "correct": false
      },
      {
        "label": "В серванте, быстро перекусывая между выходами",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": 7,
    "attestation": false,
    "prompt": "К кому нужно обратиться, если в серванте закончились чистые приборы?",
    "options": [
      {
        "label": "В посудомоечный цех",
        "correct": true
      },
      {
        "label": "К Юрию напрямую",
        "correct": false
      },
      {
        "label": "К поварам горячего цеха",
        "correct": false
      },
      {
        "label": "В сухотарку",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Согласно концепции ресторана «Этна», какой стиль общения должен выбрать официант, если гости ведут себя шумно и весело?",
    "options": [
      {
        "label": "Сделать вежливое замечание о соблюдении тишины.",
        "correct": false
      },
      {
        "label": "Игнорировать шум и выполнять только технические задачи.",
        "correct": false
      },
      {
        "label": "Поддержать шутку и открыто улыбаться.",
        "correct": true
      },
      {
        "label": "Сохранять строгую дистанцию и официальный тон.",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "При открытии смены в электрощитке необходимо включить рубильники под определенными номерами. Какая комбинация верна?",
    "options": [
      {
        "label": "6, 7, 8, 9, 10",
        "correct": false
      },
      {
        "label": "Все рубильники с 1 по 12",
        "correct": false
      },
      {
        "label": "1, 3, 5, 7, 10",
        "correct": false
      },
      {
        "label": "6, 8, 9, 11, 12",
        "correct": true
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Какое правило «Пяти шагов» сервиса регламентирует подачу меню гостям?",
    "options": [
      {
        "label": "Меню подается закрытым, чтобы гость сам его открыл.",
        "correct": false
      },
      {
        "label": "Меню подается открытым со словами «Я дам вам пару минут освоиться».",
        "correct": true
      },
      {
        "label": "Меню подается только после предложения аперитива.",
        "correct": false
      },
      {
        "label": "Официант должен стоять рядом, пока гость не откроет меню.",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "В какой последовательности, согласно стандартам «Этна», осуществляется прием заказа за столом?",
    "options": [
      {
        "label": "От старшего к младшему, независимо от пола.",
        "correct": false
      },
      {
        "label": "Дети — женщины — мужчины — хозяин стола.",
        "correct": true
      },
      {
        "label": "По часовой стрелке от первого севшего гостя.",
        "correct": false
      },
      {
        "label": "Сначала принимается заказ у того, кто первым закрыл меню.",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Что подразумевает техника «Открытая ладонь» при подаче блюд?",
    "options": [
      {
        "label": "Демонстрация гостю чистых рук перед тем, как поставить блюдо.",
        "correct": false
      },
      {
        "label": "Подача тарелки строго на раскрытой ладони без использования пальцев.",
        "correct": false
      },
      {
        "label": "Блюдо ставится так, чтобы рука не перекрывала обзор гостю и не нависала над столом.",
        "correct": true
      },
      {
        "label": "Удержание подноса на вытянутой руке при подходе к столу.",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "При использовании техники «Плечо официанта», как правильно располагать предметы на подносе?",
    "options": [
      {
        "label": "Тяжёлые предметы — ближе к телу, лёгкие — к краю.",
        "correct": true
      },
      {
        "label": "Высокие бокалы — в центре, тарелки — по краям.",
        "correct": false
      },
      {
        "label": "Равномерно по всей площади подноса.",
        "correct": false
      },
      {
        "label": "Лёгкие предметы — ближе к телу, чтобы не сдуло воздухом.",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "В чем заключается суть алгоритма «ПРИ» при работе с жалобой гостя?",
    "options": [
      {
        "label": "Приветствовать, Разобраться, Искупить.",
        "correct": false
      },
      {
        "label": "Промолчать, Расспросить, Извиниться.",
        "correct": false
      },
      {
        "label": "Прислушаться, Покаяться, Исправить.",
        "correct": false
      },
      {
        "label": "Присоединиться, Признать, Решить.",
        "correct": true
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Что входит в состав блюда «Картофельные пончики» из раздела закусок?",
    "options": [
      {
        "label": "Картофельные дольки, соус тартар, микрозелень.",
        "correct": false
      },
      {
        "label": "Картофельные шарики с беконом и сыром внутри.",
        "correct": false
      },
      {
        "label": "Картофельное пюре, копченая сметана, редис, щучья икра.",
        "correct": true
      },
      {
        "label": "Драники, лосось, сливочный сыр.",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Какая особенность подачи пасты «Карбонара» указана в меню как опциональная?",
    "options": [
      {
        "label": "Подача без пармезана.",
        "correct": false
      },
      {
        "label": "Приготовление на сливках вместо желтков.",
        "correct": true
      },
      {
        "label": "Добавление грибов или томатов.",
        "correct": false
      },
      {
        "label": "Замена бекона на куриное филе.",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Как официанту следует поступить, если за столом двое гостей заказали по бокалу одного и того же вина?",
    "options": [
      {
        "label": "Предложить к вину закуску, не упоминая бутылку.",
        "correct": false
      },
      {
        "label": "Просто принести два бокала, как было заказано.",
        "correct": false
      },
      {
        "label": "Предложить бутылку, объяснив, что это выгоднее по цене.",
        "correct": true
      },
      {
        "label": "Сначала принести бокалы, а на второй круг предложить бутылку.",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Какой соус подается к салату «Груша с копчёной уткой и рукколой»?",
    "options": [
      {
        "label": "Медово-горчичная заправка.",
        "correct": false
      },
      {
        "label": "Ореховый соус на основе кешью.",
        "correct": false
      },
      {
        "label": "Соус блючиз (майонез, сливки, монт блю).",
        "correct": true
      },
      {
        "label": "Бальзамический крем.",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "В чем заключается техника продаж «Три варианта без отказа» (Трехшаговая рекомендация)?",
    "options": [
      {
        "label": "Озвучивание трех любых блюд, которые повар приготовит быстрее всего.",
        "correct": false
      },
      {
        "label": "Навязывание трех блюд, у которых скоро закончится срок годности.",
        "correct": false
      },
      {
        "label": "Предложение позиций разной сытности: легкое, среднее и визитная карточка.",
        "correct": true
      },
      {
        "label": "Предложение самого дешевого, среднего и самого дорогого блюда.",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Что официант ОБЯЗАН сделать в конце смены согласно чек-листу закрытия?",
    "options": [
      {
        "label": "Убрать всё с ледогенератора и протереть его.",
        "correct": true
      },
      {
        "label": "Вымыть пол во всем зале.",
        "correct": false
      },
      {
        "label": "Отключить холодильники на кухне.",
        "correct": false
      },
      {
        "label": "Провести полную инвентаризацию бара.",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Какое описание соответствует авторскому коктейлю «Рашмор»?",
    "options": [
      {
        "label": "Ром, банановый ликер, груша и лимон.",
        "correct": false
      },
      {
        "label": "Водка, миндальный сироп, грейпфрут и лимон.",
        "correct": false
      },
      {
        "label": "Джин, травянистое послевкусие, плотная текстура.",
        "correct": false
      },
      {
        "label": "Бурбон, кордиал из красной смородины с черным чаем и освежающий тоник.",
        "correct": true
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Что означает термин «Бек» (Back) в ресторанном сленге «Этны»?",
    "options": [
      {
        "label": "Место хранения грязной посуды.",
        "correct": false
      },
      {
        "label": "Задняя часть барной стойки.",
        "correct": false
      },
      {
        "label": "Выход для персонала рядом с раздевалкой.",
        "correct": true
      },
      {
        "label": "Возврат блюда на кухню из-за ошибки.",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Какое правило «первого касания» действует для напитков в ресторане?",
    "options": [
      {
        "label": "Напитки выносятся только после того, как гость полностью изучил меню.",
        "correct": false
      },
      {
        "label": "Сначала подается вода, а через 10 минут — основные напитки.",
        "correct": false
      },
      {
        "label": "Напитки должны быть поданы в течение 5 минут после заказа.",
        "correct": true
      },
      {
        "label": "Напитки подаются одновременно с первой закуской.",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Как правильно ответить гостю на вопрос «Это блюдо свежее?», используя профессиональную замену стоп-фразам?",
    "options": [
      {
        "label": "«Повара говорят, что свежее».",
        "correct": false
      },
      {
        "label": "«У нас всё абсолютно свежее, не переживайте».",
        "correct": false
      },
      {
        "label": "«Я не знаю, сейчас уточню дату на упаковке».",
        "correct": false
      },
      {
        "label": "«Продукт доставлен сегодня утром, рекомендую попробовать».",
        "correct": true
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Какое блюдо в меню описывается как «Классическое индийское блюдо из мягкого филе курицы под пряным (не острым) соусом»?",
    "options": [
      {
        "label": "Тикки Карри",
        "correct": true
      },
      {
        "label": "Тонкацу из свинины",
        "correct": false
      },
      {
        "label": "Оджахури",
        "correct": false
      },
      {
        "label": "Креветки Бэнг Бэнг",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Что официант должен сделать СРАЗУ, если он случайно разбил посуду в зале?",
    "options": [
      {
        "label": "Извиниться перед гостями и убрать крупные осколки.",
        "correct": true
      },
      {
        "label": "Попросить гостей пересесть за другой стол.",
        "correct": false
      },
      {
        "label": "Сделать вид, что ничего не произошло, и позвать уборщика.",
        "correct": false
      },
      {
        "label": "Побежать за шваброй, оставив осколки на полу.",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "В чем заключается особенность «Транс-сибирского Экспресса» в барном меню?",
    "options": [
      {
        "label": "Это безалкогольный чай с облепихой.",
        "correct": false
      },
      {
        "label": "Подается в деревянной кружке с ромом.",
        "correct": false
      },
      {
        "label": "Подается в кружке РЖД с веткой розмарина.",
        "correct": true
      },
      {
        "label": "Готовится на основе гранатового вина в глиняной чашке.",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Наш интерьер украшен старинными элементами декора, которые имеют историческую ценность. Откуда именно были привезены балясины, используемые в оформлении?",
    "options": [
      {
        "label": "Из мастерской архитектора Юрия",
        "correct": false
      },
      {
        "label": "Из старинного особняка в Костроме",
        "correct": false
      },
      {
        "label": "Из усадьбы Островского",
        "correct": true
      },
      {
        "label": "Из этнографического музея",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "При открытии смены официант обязан включить свет в строго определенных рубильниках. Какие номера рубильников указаны в чек-листе?",
    "options": [
      {
        "label": "6, 8, 9, 11, 12",
        "correct": true
      },
      {
        "label": "6, 7, 8, 9, 10",
        "correct": false
      },
      {
        "label": "Все рубильники в щитке",
        "correct": false
      },
      {
        "label": "1, 3, 5, 7, 9",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Согласно стандартам подачи, с какой стороны от гостя и какой рукой официант должен ставить блюдо на стол?",
    "options": [
      {
        "label": "Слева от гостя, правой рукой",
        "correct": false
      },
      {
        "label": "Слева от гостя, левой рукой",
        "correct": true
      },
      {
        "label": "Справа от гостя, правой рукой",
        "correct": false
      },
      {
        "label": "С любой удобной стороны, используя обе руки",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "В блюде «Картофельные пончики» используется необычное дополнение, которое придает закуске премиальный вкус. Что это?",
    "options": [
      {
        "label": "Копченая паприка и лук сибулет",
        "correct": false
      },
      {
        "label": "Красная икра и микрозелень",
        "correct": false
      },
      {
        "label": "Щучья икра и слайсы редиса",
        "correct": true
      },
      {
        "label": "Трюфельное масло и пармезан",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Соус к блюду «Вителло тоннато» является сложным и многокомпонентным. Какой из перечисленных ингредиентов НЕ входит в его состав согласно ТТК?",
    "options": [
      {
        "label": "Консервированный тунец",
        "correct": false
      },
      {
        "label": "Кедровый орех",
        "correct": true
      },
      {
        "label": "Ворчестер",
        "correct": false
      },
      {
        "label": "Соевый соус",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Блюдо «Тар тар из мраморной говядины» подается с определенным набором дополнений. Какие компоненты сопровождают мясо на тарелке?",
    "options": [
      {
        "label": "Бородинские гренки и горчица",
        "correct": false
      },
      {
        "label": "Свежая пита и сыр страчателла",
        "correct": true
      },
      {
        "label": "Чипсы из тортильи и чеддер",
        "correct": false
      },
      {
        "label": "Картофельные чипсы и мусс из авокадо",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "В салате «Греческий» в нашем ресторане используется не классический нарезанный сыр Фета, а особая форма подачи. Какая?",
    "options": [
      {
        "label": "Сырные шарики в панировке",
        "correct": false
      },
      {
        "label": "Сыр, натертый тонкими слайсами",
        "correct": false
      },
      {
        "label": "Сырная пена (мусс) из пармезана и фетаксы",
        "correct": true
      },
      {
        "label": "Обжаренный во фритюре сулугуни",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "При подаче супа Том Ям важно правильно проконсультировать гостя по вкусовым характеристикам. Как именно он описан в меню?",
    "options": [
      {
        "label": "Экстремально острый по оригинальному рецепту",
        "correct": false
      },
      {
        "label": "Сливочный и совсем не острый",
        "correct": false
      },
      {
        "label": "Кисло-сладкий без специй",
        "correct": false
      },
      {
        "label": "Умеренно пряно-острый",
        "correct": true
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Блюдо «Тонкацу из свинины» включает в себя богатый гарнир из риса и набора овощей. Какой вид грибов входит в этот гарнир?",
    "options": [
      {
        "label": "Вешенки",
        "correct": false
      },
      {
        "label": "Шампиньоны",
        "correct": false
      },
      {
        "label": "Шиитаке",
        "correct": false
      },
      {
        "label": "Грибы муэр",
        "correct": true
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Авторский коктейль «Альбион» был вдохновлен историей мореплавателей. Какие вкусовые характеристики и послевкусие он имеет?",
    "options": [
      {
        "label": "Сладкий, с ярко выраженным банановым вкусом",
        "correct": false
      },
      {
        "label": "Освежающий, с травянистым послевкусием",
        "correct": true
      },
      {
        "label": "Терпкий и горький, на основе вина",
        "correct": false
      },
      {
        "label": "Кислый и крепкий с ароматом агавы",
        "correct": false
      }
    ]
  },
  {
    "module": "bar",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "В нашем меню есть позиция «Хреновуха». Важно знать, что она представлена в двух вариантах. В чем их ключевое отличие при заказе?",
    "options": [
      {
        "label": "Есть алкогольный вариант на водке и безалкогольный на сушеном хрене",
        "correct": true
      },
      {
        "label": "Отличие только в цвете из-за добавления меда",
        "correct": false
      },
      {
        "label": "Разница только в объеме подачи (50 мл или 250 мл)",
        "correct": false
      },
      {
        "label": "Одна готовится на корне хрена, другая на листьях",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Алгоритм ПРИ используется для эффективного разрешения жалоб гостей. Что именно означает буква «Р» в этой аббревиатуре?",
    "options": [
      {
        "label": "Реши (предложи конкретное действие сейчас)",
        "correct": true
      },
      {
        "label": "Расспроси (узнай все детали недовольства)",
        "correct": false
      },
      {
        "label": "Расскажи (объясни причины ошибки кухни)",
        "correct": false
      },
      {
        "label": "Рассчитай (предоставь гостю счет со скидкой)",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "При приеме заказа (Этап 3) существует строгая последовательность, кому в первую очередь стоит уделить внимание. Каков верный порядок?",
    "options": [
      {
        "label": "Кто первый готов сделать заказ",
        "correct": false
      },
      {
        "label": "Старшие по возрасту → дети → женщины → мужчины",
        "correct": false
      },
      {
        "label": "Дети → женщины → мужчины → хозяин стола",
        "correct": true
      },
      {
        "label": "Хозяин стола → все остальные по часовой стрелке",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Техника продаж «Два варианта без отказа» позволяет избежать отрицательного ответа гостя. Какая фраза является правильным примером этой техники для аперитива?",
    "options": [
      {
        "label": "«Желаете ли вы чего-нибудь выпить, пока выбираете блюда?»",
        "correct": false
      },
      {
        "label": "«Могу предложить вам бокал игристого или наш фирменный лимонад. Что вам поставить?»",
        "correct": true
      },
      {
        "label": "«У нас есть отличное вино и лимонады, вам что-нибудь принести?»",
        "correct": false
      },
      {
        "label": "«Вам принести воды?»",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Как официант должен поступить, если гость сообщает о наличии аллергии на какой-либо продукт?",
    "options": [
      {
        "label": "Заверить гостя, что все наши продукты свежие и натуральные",
        "correct": false
      },
      {
        "label": "Посоветовать гостю выбрать что-то из детского меню, так как оно более безопасное",
        "correct": false
      },
      {
        "label": "Записать аллерген, проверить по паспорту блюда и при сомнениях уточнить у шефа",
        "correct": true
      },
      {
        "label": "Предложить гостю блюдо, в котором 'кажется' нет этого продукта",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "В описании десерта «Сан-себастьян» указано, что он подается в авторском исполнении. В чем его главная особенность?",
    "options": [
      {
        "label": "Подается горячим с шариком мороженого",
        "correct": false
      },
      {
        "label": "Внутри него находится жидкая карамель",
        "correct": false
      },
      {
        "label": "Это мягкий шоколадный чизкейк с крошкой печенья",
        "correct": true
      },
      {
        "label": "Он готовится без использования яиц",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "При закрытии смены официант выполняет ряд задач по уборке. Какая зона, помимо зала, закреплена за официантом для финальной протирки?",
    "options": [
      {
        "label": "Склад сухих продуктов (сухотарка)",
        "correct": false
      },
      {
        "label": "Плиты в горячем цеху",
        "correct": false
      },
      {
        "label": "Зона раздачи и ледогенератор",
        "correct": true
      },
      {
        "label": "Полки с алкоголем на баре",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Какое правило использования мобильного телефона действует для персонала во время смены?",
    "options": [
      {
        "label": "Категорически запрещено доставать телефон в зале",
        "correct": false
      },
      {
        "label": "Разрешено использовать в зале только для записи заказа",
        "correct": true
      },
      {
        "label": "Можно пользоваться для личных целей, если в зале нет гостей",
        "correct": false
      },
      {
        "label": "Разрешено использовать только для звонков менеджеру",
        "correct": false
      }
    ]
  },
  {
    "module": "kitchen",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Что входит в состав гарнира к блюду «Семга со стейком из капусты»?",
    "options": [
      {
        "label": "Брокколи и голландский соус",
        "correct": false
      },
      {
        "label": "Цветная капуста и соус бешамель",
        "correct": false
      },
      {
        "label": "Томленая капуста и соус с икрой тобико",
        "correct": true
      },
      {
        "label": "Квашеная капуста и яблочное пюре",
        "correct": false
      }
    ]
  },
  {
    "module": "waiter",
    "chapterOrder": null,
    "attestation": true,
    "prompt": "Какую финальную фразу должен произнести официант при прощании с гостем согласно стандартам сервиса?",
    "options": [
      {
        "label": "«Ждем вас на завтраки завтра!»",
        "correct": false
      },
      {
        "label": "«Всего доброго, надеемся, вам все понравилось»",
        "correct": false
      },
      {
        "label": "«До свидания, приходите еще, когда будет время»",
        "correct": false
      },
      {
        "label": "«Будем рады видеть вас снова в Этне/ у нас в гостях. Доброго дня/ вечера!»",
        "correct": true
      }
    ]
  }
];
