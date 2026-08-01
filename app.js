'use strict';

/* ============================================================
   FitFlow — логика приложения
   Принципы:
   - Offline-first: всё хранится локально (localStorage),
     регистрация не требуется.
   - ИИ (Gemini / DeepSeek / YandexGPT) подключается позже и
     только как дополнение к локальному парсеру.
   ============================================================ */

/* ---------- Утилиты ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const fmt = (n) => Math.round(n).toLocaleString('ru-RU');

function todayKey() {
  const d = new Date();
  const p = (x) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ============================================================
   Локальная база продуктов (kcal на 100 г, если не указано иное)
   Значения приблизительные, редактируются позже.
   ============================================================ */
const FOOD_DB = {
  // ===== Крупы, каши, зерновые =====
  'гречка': { kcal: 313 }, 'гречневая каша': { kcal: 110 },
  'рис': { kcal: 344 }, 'рис вареный': { kcal: 116 }, 'рисовый': { kcal: 116 },
  'бурый рис': { kcal: 111 }, 'рис басмати': { kcal: 116 },
  'овсянка': { kcal: 352 }, 'овсяная каша': { kcal: 88 }, 'геркулес': { kcal: 352 },
  'макароны': { kcal: 350 }, 'спагетти': { kcal: 350 }, 'паста': { kcal: 130 },
  'пшенная каша': { kcal: 90 }, 'пшено': { kcal: 348 }, 'манка': { kcal: 328 },
  'рисовая каша': { kcal: 88 }, 'молочная каша': { kcal: 95 },
  'перловка': { kcal: 320 }, 'ячневая крупа': { kcal: 313 }, 'кукурузная крупа': { kcal: 328 },
  'булгур': { kcal: 342 }, 'киноа': { kcal: 368 }, 'кускус': { kcal: 112 },
  'полба': { kcal: 338 }, 'амарант': { kcal: 371 }, 'пшеничная крупа': { kcal: 316 },
  'каша': { kcal: 95 }, 'мюсли': { kcal: 350 }, 'гранола': { kcal: 470 },
  'кукурузные хлопья': { kcal: 357 }, 'овсяные хлопья': { kcal: 352 },
  'отруби': { kcal: 165 }, 'попкорн': { kcal: 387 }, 'толокно': { kcal: 363 },

  // ===== Бобовые =====
  'горох': { kcal: 298 }, 'нут': { kcal: 364 }, 'чечевица': { kcal: 295 },
  'фасоль': { kcal: 333 }, 'красная фасоль': { kcal: 337 }, 'белая фасоль': { kcal: 333 },
  'маш': { kcal: 347 }, 'соя': { kcal: 446 }, 'бобы': { kcal: 132 },
  'чечевица красная': { kcal: 314 }, 'чечевица зеленая': { kcal: 297 },

  // ===== Хлеб и выпечка =====
  'хлеб': { kcal: 250 }, 'ржаной хлеб': { kcal: 200 }, 'цельнозерновой хлеб': { kcal: 230 },
  'отрубной хлеб': { kcal: 220 }, 'белый хлеб': { kcal: 265 }, 'батон': { kcal: 265 },
  'багет': { kcal: 270 }, 'чиабатта': { kcal: 260 }, 'лаваш': { kcal: 275 },
  'питы': { kcal: 275 }, 'лепешка': { kcal: 250 }, 'тост': { kcal: 300 },
  'сушки': { kcal: 330 }, 'сухари': { kcal: 400 }, 'хлебцы': { kcal: 320 },
  'крекеры': { kcal: 420 }, 'бородинский': { kcal: 200 },

  // ===== Макароны и паста =====
  'рожки': { kcal: 350 }, 'лапша': { kcal: 350 }, 'рисовая лапша': { kcal: 364 },
  'гречневая лапша': { kcal: 348 }, 'яичная лапша': { kcal: 138 },
  'равиоли': { kcal: 200 }, 'феттучини': { kcal: 350 }, 'клецки': { kcal: 190 },
  'галушки': { kcal: 210 }, 'лазанья': { kcal: 135 },

  // ===== Мясо и птица =====
  'куриная грудка': { kcal: 113 }, 'куриное филе': { kcal: 113 },
  'курица': { kcal: 165 }, 'куриная ножка': { kcal: 184 }, 'крылышко': { kcal: 203 },
  'куриное бедро': { kcal: 209 }, 'куриный окорочок': { kcal: 184 },
  'индейка': { kcal: 135 }, 'филе индейки': { kcal: 113 },
  'говядина': { kcal: 187 }, 'телятина': { kcal: 90 }, 'свинина': { kcal: 259 },
  'баранина': { kcal: 209 }, 'конина': { kcal: 175 }, 'оленина': { kcal: 130 },
  'утка': { kcal: 308 }, 'гусь': { kcal: 371 }, 'кролик': { kcal: 136 },
  'фарш': { kcal: 240 }, 'фарш куриный': { kcal: 143 }, 'фарш говяжий': { kcal: 254 },
  'фарш свиной': { kcal: 263 }, 'печень': { kcal: 127 }, 'куриная печень': { kcal: 136 },
  'сердце': { kcal: 112 }, 'куриное сердце': { kcal: 158 }, 'язык': { kcal: 146 },
  'почки': { kcal: 86 }, 'сало': { kcal: 797 }, 'шпик': { kcal: 797 },
  'грудинка': { kcal: 350 }, 'корейка': { kcal: 330 }, 'ребра': { kcal: 320 },
  'стейк': { kcal: 240 }, 'ростбиф': { kcal: 180 }, 'буженина': { kcal: 220 },
  'карбонат': { kcal: 190 }, 'балык': { kcal: 170 }, 'отбивная': { kcal: 260 },
  'эскалоп': { kcal: 250 }, 'шницель': { kcal: 280 }, 'мясо': { kcal: 187 },
  'птица': { kcal: 160 },

  // ===== Колбасные изделия =====
  'колбаса': { kcal: 301 }, 'вареная колбаса': { kcal: 260 }, 'варёная колбаса': { kcal: 260 },
  'докторская': { kcal: 257 }, 'молочная колбаса': { kcal: 260 },
  'сырокопченая колбаса': { kcal: 470 }, 'сырокопчёная колбаса': { kcal: 470 },
  'салями': { kcal: 407 }, 'сервелат': { kcal: 461 }, 'ветчина': { kcal: 145 },
  'сосиска': { kcal: 105, per: 'шт' }, 'сарделька': { kcal: 190, per: 'шт' },
  'колбаски': { kcal: 260 }, 'охотничьи колбаски': { kcal: 330 },
  'бекон': { kcal: 458 },

  // ===== Рыба =====
  'лосось': { kcal: 142 }, 'семга': { kcal: 142 }, 'горбуша': { kcal: 127 },
  'форель': { kcal: 97 }, 'кета': { kcal: 127 }, 'нерка': { kcal: 157 },
  'треска': { kcal: 69 }, 'минтай': { kcal: 72 }, 'судак': { kcal: 84 },
  'окунь': { kcal: 91 }, 'щука': { kcal: 84 }, 'лещ': { kcal: 105 },
  'карась': { kcal: 87 }, 'карп': { kcal: 112 }, 'сазан': { kcal: 97 },
  'хек': { kcal: 86 }, 'пикша': { kcal: 73 }, 'камбала': { kcal: 70 },
  'палтус': { kcal: 102 }, 'тунец': { kcal: 101 }, 'сардина': { kcal: 208 },
  'килька': { kcal: 142 }, 'мойва': { kcal: 157 }, 'сайра': { kcal: 205 },
  'сельдь': { kcal: 161 }, 'скумбрия': { kcal: 191 }, 'угорь': { kcal: 184 },
  'сом': { kcal: 100 }, 'осетрина': { kcal: 164 }, 'икра красная': { kcal: 249 },
  'икра черная': { kcal: 254 }, 'икра минтая': { kcal: 131 },
  'печень трески': { kcal: 613 }, 'рыба': { kcal: 100 }, 'соленая сельдь': { kcal: 217 },
  'копченая рыба': { kcal: 150 }, 'вяленая рыба': { kcal: 180 },

  // ===== Морепродукты =====
  'креветки': { kcal: 85 }, 'краб': { kcal: 87 }, 'кальмар': { kcal: 75 },
  'осьминог': { kcal: 82 }, 'мидии': { kcal: 86 }, 'раки': { kcal: 76 },
  'устрицы': { kcal: 72 }, 'крабовые палочки': { kcal: 95 }, 'икра': { kcal: 240 },
  'морской гребешок': { kcal: 88 },

  // ===== Консервы =====
  'шпроты': { kcal: 363 }, 'тушенка': { kcal: 214 }, 'консервы рыбные': { kcal: 180 },
  'кукуруза консервированная': { kcal: 58 }, 'горошек консервированный': { kcal: 53 },
  'оливки': { kcal: 115 }, 'маслины': { kcal: 155 }, 'огурцы маринованные': { kcal: 16 },
  'огурцы соленые': { kcal: 11 }, 'огурцы солёные': { kcal: 11 },
  'помидоры консервированные': { kcal: 19 }, 'каперсы': { kcal: 23 },

  // ===== Молочные продукты =====
  'творог': { kcal: 121 }, 'творог обезжиренный': { kcal: 71 }, 'творог 5%': { kcal: 121 },
  'творог 9%': { kcal: 169 }, 'творожная масса': { kcal: 232 },
  'сырок глазированный': { kcal: 407, per: 'шт' }, 'сырки глазированные': { kcal: 407 },
  'сыр': { kcal: 352 }, 'плавленый сыр': { kcal: 257 }, 'брынза': { kcal: 260 },
  'фета': { kcal: 264 }, 'сулугуни': { kcal: 290 }, 'адыгейский сыр': { kcal: 240 },
  'пармезан': { kcal: 392 }, 'гауда': { kcal: 356 }, 'эдам': { kcal: 357 },
  'чеддер': { kcal: 403 }, 'голландский сыр': { kcal: 352 }, 'российский сыр': { kcal: 363 },
  'маасдам': { kcal: 350 }, 'камамбер': { kcal: 300 }, 'бри': { kcal: 334 },
  'дор блю': { kcal: 353 }, 'моцарелла': { kcal: 280 }, 'рикотта': { kcal: 174 },
  'маскарпоне': { kcal: 429 }, 'молоко': { kcal: 60 }, 'молоко 3.2%': { kcal: 59 },
  'топленое молоко': { kcal: 84 }, 'кефир': { kcal: 40 }, 'ряженка': { kcal: 67 },
  'йогурт': { kcal: 72 }, 'греческий йогурт': { kcal: 73 }, 'йогурт питьевой': { kcal: 65 },
  'простокваша': { kcal: 53 }, 'айран': { kcal: 24 }, 'тан': { kcal: 24 },
  'кумыс': { kcal: 50 }, 'снежок': { kcal: 79 }, 'сметана': { kcal: 210 },
  'сметана 15%': { kcal: 158 }, 'сметана 20%': { kcal: 206 }, 'сливки': { kcal: 205 },
  'сливки 10%': { kcal: 118 }, 'сливки 20%': { kcal: 205 }, 'сливки 33%': { kcal: 337 },
  'сгущенка': { kcal: 320 }, 'вареная сгущенка': { kcal: 328 }, 'мороженое': { kcal: 230 },
  'пломбир': { kcal: 232 }, 'молочный коктейль': { kcal: 84 },
  'соевое молоко': { kcal: 54 }, 'миндальное молоко': { kcal: 25 },
  'кокосовое молоко': { kcal: 152 }, 'овсяное молоко': { kcal: 47 },

  // ===== Яйца =====
  'яйцо': { kcal: 74, per: 'шт' }, 'яйца': { kcal: 157 }, 'перепелиные яйца': { kcal: 168 },
  'яичный белок': { kcal: 44 }, 'желток': { kcal: 322 },
  'омлет': { kcal: 155 }, 'глазунья': { kcal: 180 }, 'яичница': { kcal: 180 },

  // ===== Овощи, зелень, грибы =====
  'картофель': { kcal: 77 }, 'картошка': { kcal: 77 }, 'батат': { kcal: 86 },
  'морковь': { kcal: 32 }, 'свекла': { kcal: 43 }, 'свёкла': { kcal: 43 },
  'лук': { kcal: 40 }, 'лук репчатый': { kcal: 40 }, 'зеленый лук': { kcal: 22 },
  'лук-порей': { kcal: 33 }, 'чеснок': { kcal: 149 },
  'капуста': { kcal: 25 }, 'белокочанная капуста': { kcal: 27 },
  'краснокочанная капуста': { kcal: 31 }, 'пекинская капуста': { kcal: 16 },
  'цветная капуста': { kcal: 25 }, 'брокколи': { kcal: 34 },
  'брюссельская капуста': { kcal: 43 }, 'кольраби': { kcal: 27 },
  'савойская капуста': { kcal: 28 }, 'квашеная капуста': { kcal: 19 },
  'помидор': { kcal: 18 }, 'томат': { kcal: 18 }, 'помидоры черри': { kcal: 15 },
  'огурец': { kcal: 15 }, 'перец болгарский': { kcal: 27 },
  'перец чили': { kcal: 40 }, 'кабачок': { kcal: 24 }, 'цукини': { kcal: 17 },
  'баклажан': { kcal: 24 }, 'тыква': { kcal: 22 }, 'редис': { kcal: 20 },
  'репа': { kcal: 30 }, 'редька': { kcal: 36 }, 'дайкон': { kcal: 21 },
  'сельдерей': { kcal: 16 }, 'шпинат': { kcal: 23 }, 'щавель': { kcal: 22 },
  'салат': { kcal: 55 }, 'айсберг': { kcal: 14 }, 'руккола': { kcal: 25 },
  'петрушка': { kcal: 49 }, 'укроп': { kcal: 40 }, 'кинза': { kcal: 23 },
  'базилик': { kcal: 27 }, 'зелень': { kcal: 30 }, 'спаржа': { kcal: 20 },
  'артишок': { kcal: 47 }, 'топинамбур': { kcal: 73 }, 'хрен': { kcal: 48 },
  'имбирь': { kcal: 80 }, 'стручковая фасоль': { kcal: 31 },
  'кукуруза': { kcal: 86 }, 'горошек': { kcal: 73 }, 'авокадо': { kcal: 160 },
  'морская капуста': { kcal: 49 }, 'вяленые томаты': { kcal: 258 },
  'томатная паста': { kcal: 82 }, 'грибы': { kcal: 22 }, 'шампиньоны': { kcal: 27 },
  'вешенки': { kcal: 38 }, 'белые грибы': { kcal: 34 }, 'лисички': { kcal: 38 },
  'опята': { kcal: 22 }, 'грузди': { kcal: 18 }, 'маринованные грибы': { kcal: 24 },
  'шиитаке': { kcal: 34 }, 'овощи': { kcal: 40 }, 'морковь по-корейски': { kcal: 130 },

  // ===== Фрукты, ягоды =====
  'яблоко': { kcal: 89, per: 'шт' }, 'банан': { kcal: 105, per: 'шт' },
  'апельсин': { kcal: 62, per: 'шт' }, 'мандарин': { kcal: 40, per: 'шт' },
  'груша': { kcal: 57, per: 'шт' }, 'персик': { kcal: 50, per: 'шт' },
  'абрикос': { kcal: 48, per: 'шт' }, 'нектарин': { kcal: 44, per: 'шт' },
  'киви': { kcal: 47, per: 'шт' }, 'лимон': { kcal: 29 }, 'лайм': { kcal: 30 },
  'грейпфрут': { kcal: 42, per: 'шт' }, 'помело': { kcal: 38 }, 'ананас': { kcal: 50 },
  'манго': { kcal: 60 }, 'хурма': { kcal: 67, per: 'шт' }, 'гранат': { kcal: 83, per: 'шт' },
  'инжир': { kcal: 74, per: 'шт' }, 'фейхоа': { kcal: 49 }, 'папайя': { kcal: 43 },
  'кокос': { kcal: 354 }, 'виноград': { kcal: 69 }, 'арбуз': { kcal: 30 },
  'дыня': { kcal: 34 }, 'клубника': { kcal: 32 }, 'земляника': { kcal: 41 },
  'малина': { kcal: 52 }, 'ежевика': { kcal: 43 }, 'вишня': { kcal: 50 },
  'черешня': { kcal: 50 }, 'слива': { kcal: 46 }, 'алыча': { kcal: 34 },
  'смородина': { kcal: 44 }, 'черная смородина': { kcal: 44 },
  'красная смородина': { kcal: 43 }, 'крыжовник': { kcal: 45 },
  'клюква': { kcal: 28 }, 'брусника': { kcal: 46 }, 'черника': { kcal: 44 },
  'голубика': { kcal: 57 }, 'облепиха': { kcal: 82 }, 'персики': { kcal: 50 },
  'фрукты': { kcal: 55 }, 'сушеные фрукты': { kcal: 250 },

  // ===== Орехи, семена, сухофрукты =====
  'орехи': { kcal: 650 }, 'грецкий орех': { kcal: 654 }, 'миндаль': { kcal: 579 },
  'арахис': { kcal: 567 }, 'фундук': { kcal: 628 }, 'кешью': { kcal: 553 },
  'фисташки': { kcal: 560 }, 'кедровые орехи': { kcal: 673 },
  'бразильский орех': { kcal: 656 }, 'макадамия': { kcal: 718 },
  'пекан': { kcal: 691 }, 'семечки': { kcal: 580 }, 'тыквенные семечки': { kcal: 559 },
  'семена льна': { kcal: 534 }, 'семена чиа': { kcal: 486 }, 'кунжут': { kcal: 573 },
  'мак': { kcal: 525 }, 'кокосовая стружка': { kcal: 660 },
  'изюм': { kcal: 299 }, 'курага': { kcal: 241 }, 'чернослив': { kcal: 231 },
  'финики': { kcal: 277 }, 'сушеный инжир': { kcal: 249 }, 'цукаты': { kcal: 320 },
  'банановые чипсы': { kcal: 519 },

  // ===== Готовые блюда =====
  'котлета': { kcal: 210, per: 'шт' }, 'котлеты': { kcal: 210 },
  'тефтели': { kcal: 210 }, 'фрикадельки': { kcal: 200 }, 'зразы': { kcal: 230 },
  'голубцы': { kcal: 120, per: 'шт' }, 'фаршированный перец': { kcal: 130, per: 'шт' },
  'биток': { kcal: 220 }, 'мясо по-французски': { kcal: 250 },
  'котлета по-киевски': { kcal: 350 }, 'курица гриль': { kcal: 220 },
  'картофельное пюре': { kcal: 106 }, 'пюре': { kcal: 106 },
  'жареный картофель': { kcal: 192 }, 'вареная картошка': { kcal: 82 },
  'пельмени': { kcal: 240 }, 'пельмень': { kcal: 12, per: 'шт' },
  'вареники': { kcal: 180 }, 'манты': { kcal: 220 }, 'хинкали': { kcal: 230 },
  'чебурек': { kcal: 300, per: 'шт' }, 'беляш': { kcal: 280, per: 'шт' },
  'самса': { kcal: 300, per: 'шт' }, 'роллы': { kcal: 150 }, 'суши': { kcal: 100 },
  'сашими': { kcal: 110 }, 'ролл': { kcal: 150, per: 'шт' },
  'паста карбонара': { kcal: 220 }, 'паста болоньезе': { kcal: 180 },
  'ризотто': { kcal: 150 }, 'плов': { kcal: 180 }, 'рагу': { kcal: 120 },
  'гуляш': { kcal: 170 }, 'бефстроганов': { kcal: 190 }, 'азу': { kcal: 140 },
  'жаркое': { kcal: 150 }, 'шурпа': { kcal: 60 }, 'харчо': { kcal: 62 },
  'окрошка': { kcal: 58 }, 'рассольник': { kcal: 42 }, 'свекольник': { kcal: 36 },
  'запеканка': { kcal: 170 }, 'творожная запеканка': { kcal: 168 },
  'сырники': { kcal: 183 }, 'сырник': { kcal: 183, per: 'шт' },
  'блины': { kcal: 96 }, 'блин': { kcal: 96, per: 'шт' }, 'оладьи': { kcal: 190 },
  'шарлотка': { kcal: 190 }, 'чизкейк': { kcal: 321 }, 'тирамису': { kcal: 350 },
  'панна-котта': { kcal: 260 }, 'эклер': { kcal: 300, per: 'шт' },
  'профитроли': { kcal: 330 }, 'макаронс': { kcal: 400 },
  'капкейк': { kcal: 380, per: 'шт' }, 'маффин': { kcal: 350, per: 'шт' },
  'кекс': { kcal: 350 }, 'шоколадный кекс': { kcal: 360 },
  'пицца': { kcal: 266 }, 'пицца маргарита': { kcal: 230 }, 'пицца пепперони': { kcal: 290 },
  'бургер': { kcal: 250 }, 'чизбургер': { kcal: 300 }, 'хот-дог': { kcal: 250 },
  'шаурма': { kcal: 200 }, 'донер': { kcal: 230 }, 'наггетсы': { kcal: 296 },
  'стрипсы': { kcal: 270 }, 'картошка фри': { kcal: 312 },
  'лапша вок': { kcal: 140 }, 'пад тай': { kcal: 150 }, 'том-ям': { kcal: 80 },
  'гедза': { kcal: 200 }, 'салат цезарь': { kcal: 190 }, 'оливье': { kcal: 198 },
  'винегрет': { kcal: 75 }, 'селёдка под шубой': { kcal: 180 },
  'греческий салат': { kcal: 90 }, 'крабовый салат': { kcal: 180 },
  'мимоза (салат)': { kcal: 190 }, 'свежий салат': { kcal: 50 },

  // ===== Супы =====
  'борщ': { kcal: 49 }, 'щи': { kcal: 31 }, 'солянка': { kcal: 68 },
  'суп': { kcal: 45 }, 'куриный бульон': { kcal: 36 }, 'уха': { kcal: 46 },
  'грибной суп': { kcal: 40 }, 'сырный суп': { kcal: 95 }, 'гороховый суп': { kcal: 66 },
  'куриный суп': { kcal: 42 }, 'овощной суп': { kcal: 32 }, 'гаспачо': { kcal: 35 },
  'чечевичный суп': { kcal: 75 }, 'фо-бо': { kcal: 60 },

  // ===== Фастфуд и снеки =====
  'чипсы': { kcal: 530 }, 'сухарики': { kcal: 400 }, 'козинаки': { kcal: 510 },
  'халва': { kcal: 523 }, 'печенье': { kcal: 450 },
  'пряник': { kcal: 350 }, 'пряники': { kcal: 350 }, 'вафли': { kcal: 460 },
  'торт': { kcal: 350 }, 'пирожное': { kcal: 380 }, 'пирог': { kcal: 320 },
  'пончик': { kcal: 300, per: 'шт' }, 'пончики': { kcal: 300 },
  'шоколад': { kcal: 540 }, 'шоколадные конфеты': { kcal: 530 },
  'конфеты': { kcal: 450 }, 'карамель': { kcal: 380 }, 'ирис': { kcal: 400 },
  'мармелад': { kcal: 320 }, 'зефир': { kcal: 304 }, 'пастила': { kcal: 310 },
  'нуга': { kcal: 400 }, 'грильяж': { kcal: 510 }, 'леденец': { kcal: 380 },
  'батончик': { kcal: 450 }, 'сникерс': { kcal: 488, per: 'шт' },
  'марс': { kcal: 440, per: 'шт' }, 'твикс': { kcal: 497, per: 'шт' },
  'киткэт': { kcal: 518, per: 'шт' }, 'молочный шоколад': { kcal: 535 },
  'горький шоколад': { kcal: 539 }, 'белый шоколад': { kcal: 540 },
  'нутелла': { kcal: 530 }, 'варенье': { kcal: 250 }, 'джем': { kcal: 250 },
  'сахар': { kcal: 387 }, 'мед': { kcal: 329 }, 'сироп': { kcal: 280 },

  // ===== Напитки =====
  'вода': { kcal: 0 }, 'минералка': { kcal: 0 }, 'минеральная вода': { kcal: 0 },
  'чай': { kcal: 2 }, 'чай с сахаром': { kcal: 40 }, 'кофе': { kcal: 2 },
  'эспрессо': { kcal: 2 }, 'американо': { kcal: 2 }, 'капучино': { kcal: 45 },
  'латте': { kcal: 55 }, 'раф': { kcal: 130 }, 'флэт уайт': { kcal: 45 },
  'какао': { kcal: 80 }, 'горячий шоколад': { kcal: 90 },
  'квас': { kcal: 27 }, 'компот': { kcal: 58 }, 'морс': { kcal: 40 },
  'сок': { kcal: 45 }, 'апельсиновый сок': { kcal: 45 }, 'яблочный сок': { kcal: 46 },
  'томатный сок': { kcal: 17 }, 'вишневый сок': { kcal: 51 }, 'гранатовый сок': { kcal: 56 },
  'фреш': { kcal: 48 }, 'смузи': { kcal: 60 }, 'лимонад': { kcal: 40 },
  'кола': { kcal: 42 }, 'пепси': { kcal: 42 }, 'фанта': { kcal: 43 },
  'спрайт': { kcal: 40 }, 'газировка': { kcal: 42 }, 'энергетик': { kcal: 45 },
  'редбулл': { kcal: 43 }, 'пиво': { kcal: 43 }, 'светлое пиво': { kcal: 42 },
  'темное пиво': { kcal: 48 }, 'безалкогольное пиво': { kcal: 22 },
  'сидр': { kcal: 47 }, 'вино': { kcal: 83 }, 'сухое вино': { kcal: 70 },
  'полусладкое вино': { kcal: 95 }, 'красное вино': { kcal: 70 },
  'белое вино': { kcal: 70 }, 'шампанское': { kcal: 78 }, 'водка': { kcal: 231 },
  'коньяк': { kcal: 239 }, 'виски': { kcal: 235 }, 'ром': { kcal: 231 },
  'текила': { kcal: 231 }, 'джин': { kcal: 231 }, 'ликер': { kcal: 327 },
  'вермут': { kcal: 160 }, 'портвейн': { kcal: 180 }, 'настойка': { kcal: 240 },
  'абсент': { kcal: 300 }, 'протеиновый коктейль': { kcal: 90 },

  // ===== Соусы и добавки =====
  'кетчуп': { kcal: 100 }, 'горчица': { kcal: 66 }, 'майонез': { kcal: 680 },
  'соевый соус': { kcal: 53 }, 'терияки': { kcal: 89 }, 'барбекю (соус)': { kcal: 120 },
  'соус цезарь': { kcal: 540 }, 'песто': { kcal: 490 }, 'тартар': { kcal: 400 },
  'сырный соус': { kcal: 300 }, 'сметанный соус': { kcal: 130 },
  'томатный соус': { kcal: 60 }, 'сальса': { kcal: 35 }, 'гуакамоле': { kcal: 150 },
  'аджика': { kcal: 60 }, 'уксус': { kcal: 20 }, 'бальзамический уксус': { kcal: 88 },
  'хрен (приправа)': { kcal: 48 }, 'оливки зеленые': { kcal: 115 },

  // ===== Масла и жиры =====
  'сливочное масло': { kcal: 748 }, 'масло сливочное': { kcal: 748 },
  'растительное масло': { kcal: 884 }, 'оливковое масло': { kcal: 884 },
  'подсолнечное масло': { kcal: 899 }, 'топленое масло': { kcal: 897 },
  'маргарин': { kcal: 717 }, 'спред': { kcal: 500 }, 'масло': { kcal: 717 },
  'сало топленое': { kcal: 897 }
};


/* Единицы измерения: сколько «базовых» (г или мл) в одной единице */
const UNIT_MAP = {
  'г': 1, 'гр': 1, 'грамм': 1, 'граммов': 1,
  'кг': 1000, 'килограмм': 1000,
  'мл': 1, 'мл.': 1, 'миллилитр': 1,
  'л': 1000, 'литр': 1,
  'стакан': 250, 'стакана': 250, 'стаканов': 250, 'чашка': 200, 'чашки': 200,
  'ст.л': 20, 'ст. л': 20, 'ст.л.': 20, 'ст л': 20, 'столовая ложка': 20,
  'ч.л': 7, 'ч. л': 7, 'ч.л.': 7, 'ч л': 7, 'чайная ложка': 7,
  'порция': 200, 'порции': 200, 'порций': 200,
  'ложка': 15, 'ложки': 15, 'ложек': 15
};
const PIECE_UNITS = new Set(['шт', 'шт.', 'штук', 'штука', 'штуки', 'штук.']);

/* ============================================================
   Парсер текста: «картофель 150г, котлета 1шт»
   ============================================================ */
function parseMealText(raw) {
  if (!raw || !raw.trim()) return [];
  // Разделители: запятая/точка с запятой перед буквой, «и» между словами,
  // тире/дефисы. \b не используем — в JS он не понимает кириллицу.
  const parts = raw
    .split(/\s*[,;]\s*(?=[а-яёa-z])|\s+и\s+|[\s\u00A0]?[–—][\s\u00A0]?/iu)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts.map(parseItem).filter(Boolean);
}

function parseItem(text) {
  if (!text) return null;

  // 1) Ищем количество: число + единица (картофель 150 г)
  const amountMatch = text.match(
    /(\d+[.,]?\d*)\s*(кг|гр?а?м?м?о?в?|мл\.?|л|шт\.?|штук\w*|ст\.?\s*л\.?|ч\.?\s*л\.?|стакан\w*|чашк\w*|порци\w*|ложк\w*)/iu
  );

  let amount = null;
  let unit = null;

  if (amountMatch) {
    amount = parseFloat(amountMatch[1].replace(',', '.'));
    unit = amountMatch[2].toLowerCase().trim();
  }

  // 2) Имя продукта — всё, что до числа
  let name = text;
  if (amountMatch) {
    name = text.slice(0, amountMatch.index);
  }
  name = name
    .toLowerCase()
    .replace(/\s+(отварн\w+|варё\w+|варен\w+|жарен\w+|свеж\w+|сыр\w+|копчён\w+|копчен\w+|тушен\w+|печё\w+|печен\w+|запечён\w+|запечен\w+|солён\w+|солен\w+|маринован\w+|в сметане|с маслом|по-домашнему|домашн\w*|замороженн\w*|полуфабрикат|паровой|на пару|в кляре)\s*$/iu, '')
    .replace(/^пол-\s*/, '')
    .trim();

  if (!name) return null;

  // 3) Поиск в базе: самое длинное совпадение
  const product = lookupProduct(name);
  if (!product) return null;

  // 4) Подсчёт ккал
  const kcal = calcKcal(product, amount, unit);
  if (kcal == null) return null;

  const displayAmount = amount != null
    ? `${Number.isInteger(amount) ? amount : amount.toLocaleString('ru-RU')} ${unit || ''}`
    : 'по умолчанию';

  return {
    id: uid(),
    raw: text.trim(),
    name: product.key,
    amount,
    unit: unit || 'г',
    kcal
  };
}

function lookupProduct(name) {
  const keys = Object.keys(FOOD_DB).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (name.includes(key)) {
      return { key, ...FOOD_DB[key] };
    }
  }
  return null;
}

function calcKcal(product, amount, unit) {
  const normUnit = (unit || '').toLowerCase().trim();
  const isPiece = PIECE_UNITS.has(normUnit);
  const perPiece = product.per === 'шт';

  if (amount == null) {
    // Нет количества — считаем условную порцию (100 г или 1 шт)
    if (perPiece) return Math.round(product.kcal);
    return product.kcal;
  }

  if (isPiece) {
    if (perPiece) return Math.round(product.kcal * amount);
    // Штуки, а в базе ккал на 100 г — допускаем ~70 г на штуку
    return Math.round((product.kcal / 100) * 70 * amount);
  }

  if (normUnit === 'кг') return Math.round(product.kcal * 10 * amount);
  if (normUnit === 'л') return Math.round(product.kcal * 10 * amount);

  const grams = UNIT_MAP[normUnit] || 1;
  return Math.round((product.kcal / 100) * grams * amount);
}

/* ============================================================
   ИИ-разбор (подключается позже)
   Онлайн-провайдеры: Gemini, DeepSeek, YandexGPT — в РФ действуют
   ограничения, поэтому ИИ остаётся ОПЦИЕЙ пользователя.
   По умолчанию приложение полностью работает офлайн.
   ============================================================ */
const AI = {
  configured: false, // станет true после настройки в «Настройках»
  provider: null,    // 'gemini' | 'deepseek' | 'yandex' | 'local'
  apiKey: null
};

/**
 * Попытка распознать фразу через ИИ. Возвращает массив блюд
 * (как parseMealText) или null, если ИИ не настроен.
 */
async function parseWithAI(text) {
  if (!AI.configured || !AI.apiKey) return null;
  // Реализация появится на этапе интеграции ИИ.
  return null;
}

/* ============================================================
   Состояние (localStorage, день-в-день)
   ============================================================ */
const DEFAULTS = {
  water: { goal: 2500 },
  food: { goal: 2000 }
};

const state = {
  water: { date: todayKey(), total: 0, log: [], goal: DEFAULTS.water.goal },
  food: { date: todayKey(), items: [], goal: DEFAULTS.food.goal },
  theme: null
};

function loadState() {
  try {
    const raw = localStorage.getItem('fitflow:state');
    if (raw) Object.assign(state, JSON.parse(raw));
  } catch (e) { /* повреждённые данные — начинаем заново */ }

  const today = todayKey();
  if (state.water.date !== today) {
    state.water = { date: today, total: 0, log: [], goal: state.water.goal || DEFAULTS.water.goal };
  }
  if (state.food.date !== today) {
    state.food = { date: today, items: [], goal: state.food.goal || DEFAULTS.food.goal };
  }
}

function saveState() {
  try {
    localStorage.setItem('fitflow:state', JSON.stringify(state));
  } catch (e) {
    console.warn('Не удалось сохранить данные:', e);
  }
}

/* ============================================================
   Тема (Авто / Light / Dark)
   ============================================================ */
const LIGHT_THEME_COLOR = '#fafdfc';
const DARK_THEME_COLOR = '#0e1514';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('meta-theme')
    .setAttribute('content', theme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
}

function systemPrefersDark() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function getThemeMode() {
  const saved = localStorage.getItem('fitflow:theme');
  return saved === 'light' || saved === 'dark' ? saved : 'auto';
}

function setThemeMode(mode) {
  if (mode === 'auto') {
    localStorage.removeItem('fitflow:theme');
  } else {
    localStorage.setItem('fitflow:theme', mode);
  }
  applyThemeMode(mode);
}

function applyThemeMode(mode) {
  applyTheme(mode === 'auto' ? (systemPrefersDark() ? 'dark' : 'light') : mode);
  $$('#theme-segmented button').forEach((btn) =>
    btn.classList.toggle('active', btn.dataset.themeMode === mode));
}

function initTheme() {
  applyThemeMode(getThemeMode());

  // Следим за системной темой в режиме «Авто»
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', (e) => {
      if (getThemeMode() === 'auto') {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  setThemeMode(current === 'dark' ? 'light' : 'dark');
}

/* ============================================================
   Рендер
   ============================================================ */
const RING_CIRCUMFERENCE = 2 * Math.PI * 54;

function renderAll() {
  renderWater();
  renderFood();
}

function renderWater() {
  const { total, goal } = state.water;
  const pct = Math.min(1, goal > 0 ? total / goal : 0);

  $('#water-total').textContent = fmt(total);
  $('#water-ring-fg').style.strokeDashoffset =
    String(RING_CIRCUMFERENCE * (1 - pct));

  const card = $('#water-card');
  card.classList.toggle('goal-reached', total >= goal);

  const reached = total >= goal;
  $('#water-status').innerHTML = reached
    ? '<span style="color:var(--success);font-weight:700">Цель достигнута! 🎉</span>'
    : `из ${fmt(goal)} мл`;

  $('#water-undo').style.opacity = total > 0 ? '1' : '0.45';
}

function renderFood() {
  const { items, goal } = state.food;
  const total = items.reduce((s, it) => s + it.kcal, 0);
  const pct = Math.min(1, goal > 0 ? total / goal : 0);

  $('#food-total').textContent = fmt(total);
  $('#food-goal-label').textContent = fmt(goal);
  $('#food-goal').textContent = `${fmt(goal)} ккал`;
  $('#food-progress-fill').style.width = `${pct * 100}%`;
  $('#food-progress').setAttribute('aria-valuenow', String(total));
  $('#food-progress').setAttribute('aria-valuemax', String(goal));

  const card = $('#food-card');
  card.classList.toggle('over-goal', total > goal);

  const status = $('#food-status');
  if (total === 0) {
    status.textContent = 'Добавьте приём пищи, чтобы начать';
  } else if (total > goal) {
    status.textContent = `На ${fmt(total - goal)} ккал больше цели. Всё в порядке — вы заслужили!`;
  } else {
    status.textContent = `Осталось ${fmt(goal - total)} ккал до цели`;
  }

  renderFoodList();
}

function renderFoodList() {
  const list = $('#food-list');
  const { items } = state.food;

  if (items.length === 0) {
    list.innerHTML = `<li class="food-empty">Пока пусто. Добавьте еду текстом:
      «овсянка 80г, банан 1шт» 🍽️</li>`;
    return;
  }

  list.innerHTML = items.map((it) => `
    <li class="food-item" data-id="${it.id}">
      <span class="food-item-dot" aria-hidden="true">🍴</span>
      <div class="food-item-info">
        <p class="food-item-name">${escapeHtml(it.name)}</p>
        <p class="food-item-desc">${escapeHtml(it.raw)}</p>
      </div>
      <span class="food-item-kcal">${fmt(it.kcal)}</span>
      <button class="food-item-remove" data-remove="${it.id}" type="button" aria-label="Удалить">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </li>`).join('');
}

function escapeHtml(s) {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

/* ============================================================
   Действия: вода
   ============================================================ */
function addWater(ml) {
  state.water.total += ml;
  state.water.log.push({ ts: Date.now(), ml });
  saveState();
  renderWater();
}

function undoWater() {
  const last = state.water.log.pop();
  if (!last) return;
  state.water.total = Math.max(0, state.water.total - last.ml);
  saveState();
  renderWater();
  toast('Последнее добавление отменено');
}

function changeWaterGoal(delta) {
  const next = Math.min(10000, Math.max(500, state.water.goal + delta));
  if (next === state.water.goal) return;
  state.water.goal = next;
  saveState();
  renderWater();
}

/* ============================================================
   Действия: еда
   ============================================================ */
async function addFoodText(text) {
  const errorBox = $('#food-error');
  errorBox.hidden = true;

  let items = parseMealText(text);

  // Если локальный парсер не справился — пробуем ИИ (если настроен)
  if (items.length === 0) {
    items = await parseWithAI(text);
  }

  if (!items || items.length === 0) {
    errorBox.textContent = `Не удалось разобрать: «${text}».
      Попробуйте так: «картофель 150г, котлета 1шт». ИИ-разбор появится позже.`;
    errorBox.hidden = false;
    return;
  }

  const totalKcal = items.reduce((s, it) => s + it.kcal, 0);
  state.food.items.push(...items);
  saveState();
  renderFood();
  toast(`Добавлено: ${items.map((i) => i.name).join(', ')} (+${fmt(totalKcal)} ккал)`);
}

function removeFood(id) {
  state.food.items = state.food.items.filter((it) => it.id !== id);
  saveState();
  renderFood();
}

function changeFoodGoal(delta) {
  const next = Math.min(10000, Math.max(800, state.food.goal + delta));
  if (next === state.food.goal) return;
  state.food.goal = next;
  saveState();
  renderFood();
}

/* ============================================================
   Экран Настройки: переключение, экспорт/импорт/сброс
   ============================================================ */
function switchView(view) {
  const isSettings = view === 'settings';
  $('#home-view').hidden = isSettings;
  $('#settings-view').hidden = !isSettings;
  $$('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.nav === view));
}

function exportData() {
  const backup = {
    app: 'fitflow',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: { theme: getThemeMode() },
    water: { date: state.water.date, total: state.water.total, log: state.water.log, goal: state.water.goal },
    food: { date: state.food.date, items: state.food.items, goal: state.food.goal }
  };
  const json = JSON.stringify(backup, null, 2);
  const fileName = `fitflow-backup-${todayKey()}.json`;

  // 1. Android WebView (Capacitor/SAF мост через JavascriptInterface)
  try {
    if (window.FitFlowExport && typeof window.FitFlowExport.saveBackup === 'function') {
      toast('Выберите папку для сохранения...');
      window.FitFlowExport.saveBackup(json, fileName);
      return;
    }
    if (window.AquaExport && typeof window.AquaExport.saveBackup === 'function') {
      toast('Выберите папку для сохранения...');
      window.AquaExport.saveBackup(json, fileName);
      return;
    }
  } catch (e) {
    console.warn('Native backup export error:', e);
  }

  // 2. Браузер: обычное скачивание файла
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast('Резервная копия сохранена');
}

if (typeof window !== 'undefined') {
  window.onBackupSaveResult = function (ok, message) {
    toast(message || (ok ? 'Резервная копия сохранена' : 'Сохранение отменено'));
  };
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || data.app !== 'fitflow') throw new Error('bad format');

      if (data.settings && data.settings.theme) setThemeMode(data.settings.theme);

      // Вода: объединяем журнал с сегодняшним днём
      if (data.water && Array.isArray(data.water.log)) {
        state.water.log.push(...data.water.log);
        state.water.total = state.water.log.reduce((s, l) => s + (l.ml || 0), 0);
      }
      if (data.water && typeof data.water.goal === 'number') {
        state.water.goal = Math.min(10000, Math.max(500, Math.round(data.water.goal)));
      }

      // Еда: добавляем блюда
      if (data.food && Array.isArray(data.food.items)) {
        state.food.items.push(...data.food.items);
      }
      if (data.food && typeof data.food.goal === 'number') {
        state.food.goal = Math.min(10000, Math.max(800, Math.round(data.food.goal)));
      }

      saveState();
      renderAll();
      toast('Данные импортированы ✓');
    } catch (e) {
      toast('Не удалось прочитать файл резервной копии');
    }
  };
  reader.readAsText(file);
}

function resetAll() {
  if (!window.confirm('Удалить все данные FitFlow с этого устройства? Действие нельзя отменить.')) return;
  localStorage.removeItem('fitflow:state');
  localStorage.removeItem('fitflow:theme');
  location.reload();
}

/* ============================================================
   Toast
   ============================================================ */
let toastTimer = null;
function toast(message) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

/* ============================================================
   Приветствие и дата
   ============================================================ */
function renderGreeting() {
  const now = new Date();
  const h = now.getHours();
  let greeting = 'Доброй ночи!';
  if (h >= 5 && h < 12) greeting = 'Доброе утро!';
  else if (h >= 12 && h < 18) greeting = 'Добрый день!';
  else if (h >= 18 && h < 23) greeting = 'Добрый вечер!';

  $('#greeting-title').textContent = greeting;
  $('#date-label').textContent = new Intl.DateTimeFormat('ru-RU', {
    weekday: 'long', day: 'numeric', month: 'long'
  }).format(now);
}

/* ============================================================
   Инициализация
   ============================================================ */
function init() {
  loadState();
  initTheme();
  renderGreeting();
  renderAll();

  // Тема
  $('#theme-toggle').addEventListener('click', toggleTheme);

  // Вода
  $$('.chip[data-water]').forEach((btn) =>
    btn.addEventListener('click', () => addWater(Number(btn.dataset.water))));
  $('#water-undo').addEventListener('click', undoWater);
  $('#water-goal-minus').addEventListener('click', () => changeWaterGoal(-100));
  $('#water-goal-plus').addEventListener('click', () => changeWaterGoal(100));

  // Еда: форма
  $('#food-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#food-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    addFoodText(text);
  });

  // Быстрые добавления
  $$('.chip[data-quick]').forEach((btn) =>
    btn.addEventListener('click', () => addFoodText(btn.dataset.quick)));

  // Удаление из списка (делегирование)
  $('#food-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove]');
    if (btn) removeFood(btn.dataset.remove);
  });

  $('#food-goal-minus').addEventListener('click', () => changeFoodGoal(-100));
  $('#food-goal-plus').addEventListener('click', () => changeFoodGoal(100));

  // Заглушки неактивных разделов
  $('#food-ai-badge').addEventListener('click', () =>
    toast('ИИ-разбор фраз: Gemini / DeepSeek / YandexGPT — подключим позже'));
  $('#food-mic').addEventListener('click', () =>
    toast('Голосовой ввод — скоро'));

  // Навигация
  $$('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nav = btn.dataset.nav;
      if (nav === 'home' || nav === 'settings') {
        switchView(nav);
      } else {
        toast(`Раздел «${btn.textContent.trim().replace('скоро', '')}» появится в следующих итерациях`);
      }
    });
  });

  // Настройки: тема
  $$('#theme-segmented button').forEach((btn) =>
    btn.addEventListener('click', () => setThemeMode(btn.dataset.themeMode)));

  // Настройки: резервное копирование
  $('#export-btn').addEventListener('click', exportData);
  $('#import-btn').addEventListener('click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', (e) => {
    if (e.target.files[0]) importData(e.target.files[0]);
    e.target.value = '';
  });
  $('#reset-btn').addEventListener('click', resetAll);
}

/* Поддержка запуска в браузере и в Node (для тестов парсера) */
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', init);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseMealText, parseItem, lookupProduct, calcKcal, FOOD_DB };
}
