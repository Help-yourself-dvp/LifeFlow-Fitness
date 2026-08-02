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
  'гречка': { kcal: 313 }, 'гречки': { kcal: 313 }, 'гречневая каша': { kcal: 110 },
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
  'йогурт 5%': { kcal: 92 }, 'йогурт 7%': { kcal: 110 }, 'йогурт': { kcal: 72 }, 'греческий йогурт': { kcal: 73 }, 'йогурт питьевой': { kcal: 65 },
  'простокваша': { kcal: 53 }, 'айран': { kcal: 24 }, 'тан': { kcal: 24 },
  'кумыс': { kcal: 50 }, 'снежок': { kcal: 79 }, 'сметана': { kcal: 210 }, 'сметаны': { kcal: 210 }, 'сметану': { kcal: 210 },
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

  // ===== Дополнение v0.1.7: USDA FoodData Central / SR Legacy (public domain) =====
  // Значения — средние на 100 г; новые записи помечены источником для документации.
  'хумус': { kcal: 166, source: 'USDA FDC SR Legacy' },
  'фалафель': { kcal: 333, source: 'USDA FDC SR Legacy' },
  'тофу': { kcal: 76, source: 'USDA FDC SR Legacy' },
  'темпе': { kcal: 193, source: 'USDA FDC SR Legacy' },
  'сейтан': { kcal: 141, source: 'USDA FDC SR Legacy' },
  'эдамаме': { kcal: 121, source: 'USDA FDC SR Legacy' },
  'арахисовая паста': { kcal: 588, source: 'USDA FDC SR Legacy' },
  'тахини': { kcal: 595, source: 'USDA FDC SR Legacy' },
  'урбеч': { kcal: 595, source: 'USDA FDC SR Legacy' },
  'нут вареный': { kcal: 164, source: 'USDA FDC SR Legacy' },
  'чечевица вареная': { kcal: 116, source: 'USDA FDC SR Legacy' },
  'фасоль вареная': { kcal: 127, source: 'USDA FDC SR Legacy' },
  'маш вареный': { kcal: 105, source: 'USDA FDC SR Legacy' },
  'киноа вареная': { kcal: 120, source: 'USDA FDC SR Legacy' },
  'булгур вареный': { kcal: 83, source: 'USDA FDC SR Legacy' },
  'полента': { kcal: 70, source: 'USDA FDC SR Legacy' },
  'рисовая бумага': { kcal: 333, source: 'USDA FDC SR Legacy' },
  'тортилья': { kcal: 312, source: 'USDA FDC SR Legacy' },
  'багл': { kcal: 257, source: 'USDA FDC SR Legacy' },
  'творожный сыр': { kcal: 250, source: 'USDA FDC SR Legacy' },
  'сурими': { kcal: 95, source: 'USDA FDC SR Legacy' },
  'сардины консервированные': { kcal: 208, source: 'USDA FDC SR Legacy' },
  'анчоусы': { kcal: 210, source: 'USDA FDC SR Legacy' },
  'кимчи': { kcal: 15, source: 'USDA FDC SR Legacy' },
  'соленые огурцы': { kcal: 11, source: 'USDA FDC SR Legacy' },
  'масло авокадо': { kcal: 884, source: 'USDA FDC SR Legacy' },
  'кунжутное масло': { kcal: 884, source: 'USDA FDC SR Legacy' },
  'льняное масло': { kcal: 884, source: 'USDA FDC SR Legacy' },
  'кокосовое масло': { kcal: 862, source: 'USDA FDC SR Legacy' },
  'инжир сушеный': { kcal: 249, source: 'USDA FDC SR Legacy' },
  'ягоды годжи': { kcal: 349, source: 'USDA FDC SR Legacy' },
  'клюква сушеная': { kcal: 308, source: 'USDA FDC SR Legacy' },
  'маракуйя': { kcal: 97, source: 'USDA FDC SR Legacy' },
  'личи': { kcal: 66, source: 'USDA FDC SR Legacy' },
  'физалис': { kcal: 53, source: 'USDA FDC SR Legacy' },
  'кокосовая мякоть': { kcal: 354, source: 'USDA FDC SR Legacy' },
  'сельдерей стебель': { kcal: 16, source: 'USDA FDC SR Legacy' },
  'кейл': { kcal: 49, source: 'USDA FDC SR Legacy' },
  'нутовая мука': { kcal: 387, source: 'USDA FDC SR Legacy' },
  'рисовый уксус': { kcal: 18, source: 'USDA FDC SR Legacy' },
  'паста мисо': { kcal: 199, source: 'USDA FDC SR Legacy' },

  // ===== Упакованные продукты: Open Food Facts (ODbL), значения усреднены =====
  'протеин сывороточный': { kcal: 370, source: 'Open Food Facts (ODbL)' },
  'изолят протеина': { kcal: 370, source: 'Open Food Facts (ODbL)' },
  'протеиновый батончик': { kcal: 360, source: 'Open Food Facts (ODbL)' },
  'протеиновый пудинг': { kcal: 80, source: 'Open Food Facts (ODbL)' },
  'растительный йогурт': { kcal: 65, source: 'Open Food Facts (ODbL)' },
  'мюсли без сахара': { kcal: 340, source: 'Open Food Facts (ODbL)' },
  'гранола с шоколадом': { kcal: 460, source: 'Open Food Facts (ODbL)' },
  'овсяное печенье': { kcal: 450, source: 'Open Food Facts (ODbL)' },
  'цельнозерновой крекер': { kcal: 430, source: 'Open Food Facts (ODbL)' },
  'рисовые хлебцы': { kcal: 387, source: 'Open Food Facts (ODbL)' },
  'готовый смузи': { kcal: 55, source: 'Open Food Facts (ODbL)' },
  'комбуча': { kcal: 13, source: 'Open Food Facts (ODbL)' },
  'энергетик без сахара': { kcal: 3, source: 'Open Food Facts (ODbL)' },
  'креатин': { kcal: 0, source: 'Open Food Facts (ODbL)' },
  'шаверма': { kcal: 200, source: 'Open Food Facts (ODbL)' },
  'кесадилья': { kcal: 268, source: 'Open Food Facts (ODbL)' },
  'поке': { kcal: 150, source: 'Open Food Facts (ODbL)' },
  'рамен': { kcal: 99, source: 'Open Food Facts (ODbL)' },
  'фо бо': { kcal: 55, source: 'Open Food Facts (ODbL)' },
  'паэлья': { kcal: 158, source: 'Open Food Facts (ODbL)' },
  'тако': { kcal: 226, source: 'Open Food Facts (ODbL)' },

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

const COMMAND_DICTIONARY = {
  corrections: [
    [/поплавов|попловал|поплавал/giu, 'плавал'],
    [/(^|\s)бана(?=\s|$)/giu, '$1банан'],
    [/(^|\s)грешка(?=\s|$)/giu, '$1гречка'],
    [/(^|\s)картошка(?=\s|$)/giu, '$1картофель'],
    [/полтора\s+часа?/giu, '1.5 часа'],
    [/пол\s+литра?/giu, '0.5 литра'],
    [/(^|\s)(два|две)(?=\s+стакан)/giu, '$12'],
    [/(^|\s)три(?=\s+стакан)/giu, '$13']
  ],
  activityTypes: [
    { type: 'swim', pattern: /плавал|бассейн/u },
    { type: 'cardio', pattern: /бегал|побегал|пробеж|кардио/u },
    { type: 'strength', pattern: /тяж[её]л|силов/u },
    { type: 'walk', pattern: /гуля|прош[её]л/u },
    { type: 'bike', pattern: /велосипед|велопрогул/u },
    { type: 'stretch', pattern: /растяжк|йог/u }
  ]
};

function normalizeCommandText(text) {
  return COMMAND_DICTIONARY.corrections.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), String(text || '').toLowerCase());
}

function detectActivityType(chunk) {
  const found = COMMAND_DICTIONARY.activityTypes.find((entry) => entry.pattern.test(chunk));
  return found ? found.type : 'other';
}

let pendingSmartEntry = null;

function parseSmartEntry(text) {
  const source = String(text || '').trim();
  if (!source) return { waterMl: 0, activities: [], activity: null, food: [] };
  const lower = normalizeCommandText(source);

  let waterMl = 0;
  const waterMatch = lower.match(/(?:выпил(?:а)?|вода|воды)\D{0,24}(\d+(?:[.,]\d+)?)\s*(мл|миллилитр(?:ов|а)?|л|литр(?:а|ов)?|стакан(?:а|ов)?)/iu);
  if (waterMatch) {
    const amount = Number(waterMatch[1].replace(',', '.'));
    waterMl = Math.round(amount * (/^л|литр/u.test(waterMatch[2]) ? 1000 : (/^стакан/u.test(waterMatch[2]) ? 250 : 1)));
  }

  const activities = [];
  const activityPattern = /(?:занимал(?:ся|ась)|тренировал(?:ся|ась)|гулял(?:а)?|прош[её]л(?:а)?|плавал(?:а)?|бассейн|бегал(?:а)?|побегал(?:а)?|пробеж|тяж[её]л(?:ая|ой)?\s+атлетик|силов\w*|велосипед\w*|велопрогул\w*|растяжк\w*|йог\w*|активност[ьи])\D{0,30}?(\d+(?:[.,]\d+)?)\s*(мин(?:ут[аы]?)?|час(?:а|ов)?|ч)/giu;
  let match;
  while ((match = activityPattern.exec(lower))) {
    const amount = Number(match[1].replace(',', '.'));
    const minutes = Math.round(amount * (/^час|^ч$/u.test(match[2]) ? 60 : 1));
    if (minutes < 5) continue;
    const chunk = match[0];
    const type = detectActivityType(chunk);
    activities.push({ type, durationMinutes: minutes });
  }

  const food = [];
  const foodPattern = /(?:съел(?:а)?|поел(?:а)?|съесть)\s+(.+?)(?=(?:\s+(?:выпил(?:а)?|попил(?:а)?|занимал(?:ся|ась)|тренировал(?:ся|ась)|плавал(?:а)?|бегал(?:а)?|побегал(?:а)?|гулял(?:а)?|прош[её]л(?:а)?|съел(?:а)?|поел(?:а)?))|$)/giu;
  while ((match = foodPattern.exec(lower))) {
    food.push(...parseMealText(match[1]).filter((item) => item.name !== 'вода'));
  }
  return { waterMl, activities, activity: activities[0] || null, food };
}

function startVoiceEntry() {
  try {
    if (window.FitFlowExport && typeof window.FitFlowExport.startVoiceInput === 'function') {
      toast('Говорите после сигнала. Можно назвать воду, еду и активность одной фразой.');
      window.FitFlowExport.startVoiceInput();
      return;
    }
  } catch (e) {
    console.warn('Не удалось запустить голосовой ввод:', e);
  }
  openSmartVoiceHelp();
  toast('Для голосового ввода нужна Android-сборка и офлайн-пакет распознавания речи.');
}

function openSmartEntry() {
  pendingSmartEntry = null;
  $('#smart-entry-input').value = '';
  $('#smart-entry-preview').hidden = true;
  $('#smart-entry-preview').innerHTML = '';
  $('#smart-entry-save').hidden = true;
  $('#smart-entry-dialog').hidden = false;
  setTimeout(() => $('#smart-entry-input').focus(), 100);
}

function closeSmartEntry() {
  $('#smart-entry-dialog').hidden = true;
  $('#smart-entry-input').value = '';
  $('#smart-entry-preview').hidden = true;
  $('#smart-entry-preview').innerHTML = '';
  $('#smart-entry-save').hidden = true;
  pendingSmartEntry = null;
}

function previewSmartEntry() {
  const parsed = parseSmartEntry($('#smart-entry-input').value);
  const lines = [];
  if (parsed.waterMl > 0) lines.push(`💧 Вода: ${parsed.waterMl} мл`);
  parsed.activities.forEach((activity) => lines.push(`🌿 ${ACTIVITY_TYPES[activity.type].label}: ${formatWorkoutDuration(activity.durationMinutes)}`));
  if (parsed.food.length) lines.push(`🍽️ Питание: ${parsed.food.map((item) => item.name).join(', ')} · ${fmt(parsed.food.reduce((sum, item) => sum + item.kcal, 0))} ккал`);
  if (lines.length === 0) { toast('Не удалось выделить воду, еду или активность. Попробуйте указать число и единицу.'); return; }
  pendingSmartEntry = parsed;
  const preview = $('#smart-entry-preview');
  preview.innerHTML = `<b>Я понял так:</b>${lines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}`;
  preview.hidden = false;
  $('#smart-entry-save').hidden = false;
}

async function saveSmartEntry() {
  if (!pendingSmartEntry) return;
  const parsed = pendingSmartEntry;
  if (parsed.waterMl > 0) {
    state.water.total += parsed.waterMl;
    state.water.log.push({ ts: Date.now(), ml: parsed.waterMl });
  }
  if (parsed.food.length) state.food.items.push(...applySelectedMealType(parsed.food));
  parsed.activities.forEach((activity) => state.workouts.unshift({
    id: uid(), date: todayKey(), type: activity.type, title: null, note: 'Добавлено быстрым вводом', intensity: 'medium', durationMinutes: activity.durationMinutes, createdAt: Date.now()
  }));
  saveState();
  renderAll();
  await syncMealRemindersForToday();
  await syncTrainingReminderForToday();
  closeSmartEntry();
  toast('Записи добавлены. Проверьте их в воде, питании и активности.');
}

function openSmartVoiceHelp() { $('#smart-voice-help-dialog').hidden = false; }
function closeSmartVoiceHelp() { $('#smart-voice-help-dialog').hidden = true; }

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

  // Поддержка разговорной формы «ложка сметаны» без цифры.
  const implicitSpoon = !amountMatch && text.match(/^(?:столовая\s+|чайная\s+)?ложк[аиу]\s+(.+)$/iu);
  const implicitPlate = !amountMatch && text.match(/^тарелк[ауи]\s+(.+)$/iu);
  if (implicitSpoon) {
    amount = 1;
    unit = 'ложка';
  } else if (implicitPlate) {
    amount = 1;
    unit = 'порция';
  }

  // 2) Имя продукта — всё, что до числа
  let name = text;
  if (amountMatch) {
    name = text.slice(0, amountMatch.index);
  } else if (implicitSpoon) {
    name = implicitSpoon[1];
  } else if (implicitPlate) {
    name = implicitPlate[1];
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
  food: { goal: 2000 },
  reminders: { enabled: false, time: '20:00' },
  morningMotivation: { enabled: false, time: '08:00', theme: 'mixed', message: '' },
  activitySettings: { weeklyGoalMinutes: 150 },
  profileSettings: { weightKg: null },
  mealReminders: { enabled: false, meals: [] },
  customMealTypes: [],
  homeLayout: { order: ['water', 'food'], visible: { water: true, food: true } }
};

const MEAL_REMINDER_TYPES = [
  { id: 'breakfast', label: 'Завтрак', time: '08:00' },
  { id: 'lunch', label: 'Обед', time: '13:00' },
  { id: 'snack', label: 'Полдник', time: '16:00' },
  { id: 'dinner', label: 'Ужин', time: '19:00' },
  { id: 'lateSnack', label: 'Поздний перекус', time: '21:30' }
];

const HOME_CARDS = [
  { id: 'water', label: 'Вода', icon: '💧' },
  { id: 'food', label: 'Питание', icon: '🍽️' }
];

const PROFILES_KEY = 'fitflow:profiles';
const LEGACY_STATE_KEY = 'fitflow:state';
let profilesState = { activeId: 'default', profiles: [{ id: 'default', name: 'Мой профиль' }] };

function profileStateKey(id = profilesState.activeId) {
  return id === 'default' ? LEGACY_STATE_KEY : `fitflow:state:${id}`;
}

function normalizeProfiles() {
  const source = profilesState || {};
  const ids = new Set();
  const profiles = (Array.isArray(source.profiles) ? source.profiles : [])
    .map((profile) => ({ id: String(profile.id || uid()), name: normalizeActivityName(profile.name) || '' }))
    .filter((profile) => profile.name && !ids.has(profile.id) && ids.add(profile.id))
    .slice(0, 10);
  if (!profiles.some((profile) => profile.id === 'default')) profiles.unshift({ id: 'default', name: 'Мой профиль' });
  const activeId = profiles.some((profile) => profile.id === source.activeId) ? source.activeId : profiles[0].id;
  profilesState = { activeId, profiles };
}

function loadProfiles() {
  try {
    const raw = localStorage.getItem(PROFILES_KEY);
    if (raw) profilesState = JSON.parse(raw);
  } catch (e) { }
  normalizeProfiles();
  try { localStorage.setItem(PROFILES_KEY, JSON.stringify(profilesState)); } catch (e) { }
}

function saveProfiles() {
  try { localStorage.setItem(PROFILES_KEY, JSON.stringify(profilesState)); } catch (e) { }
}

const ACTIVITY_REMINDER_PROMPT_KEY = 'fitflow:activity-reminder-prompt-seen';
const TERMS_ACCEPTED_KEY = 'fitflow:terms-accepted-v1';

const MORNING_MOTIVATION_THEMES = {
  mixed: 'Смешанная',
  calm: 'Спокойный день',
  health: 'Здоровье',
  food: 'Питание',
  activity: 'Активность'
};

const MORNING_MOTIVATION_MESSAGES = {
  mixed: [
    'Новый день — новая возможность позаботиться о себе',
    'Маленький шаг сегодня важнее идеального плана завтра',
    'Начните день в своём темпе, этого достаточно',
    'Вы уже делаете важное — обращаете внимание на себя',
    'Выберите одно посильное действие и сделайте его спокойно',
    'Не нужно успеть всё, достаточно двигаться в нужную сторону',
    'Пусть сегодня будет чуть больше заботы о себе',
    'Утро — хорошее время выбрать то, что вас поддержит',
    'Ваш темп имеет значение, не сравнивайте его с чужим',
    'Сегодня можно начать заново, даже с самого малого шага',
    'Замечайте то, что уже получается, а не только список дел',
    'Пусть у этого дня будет простая и добрая цель'
  ],
  calm: [
    'Не спешите: один спокойный шаг за другим — уже движение вперёд',
    'Сегодня достаточно сделать то, что действительно важно именно вам',
    'Начните день с воды, дыхания и доброго отношения к себе',
    'Пауза — не слабость, а способ услышать себя',
    'Разрешите себе идти в своём ритме',
    'План на день может быть небольшим и всё равно полезным',
    'Сначала забота о себе, потом всё остальное',
    'Тишина и порядок внутри тоже часть хорошего дня',
    'Вы не обязаны быть продуктивны каждую минуту',
    'Мягкое начало дня может сделать его устойчивее',
    'Отнеситесь к себе сегодня так, как отнеслись бы к другу',
    'Выберите спокойный темп и сохраните его до вечера'
  ],
  health: [
    'Забота о здоровье складывается из маленьких ежедневных решений',
    'Ваше самочувствие важно, найдите сегодня немного времени для себя',
    'Стакан воды, немного движения и отдых — хорошие основы дня',
    'Слушайте тело: ему виднее, когда нужен отдых или движение',
    'Полезная привычка начинается не с идеала, а с повторения',
    'Регулярный сон и еда — это тоже вклад в ваше здоровье',
    'Сегодня можно выбрать вариант, который добавит вам сил',
    'Дышите глубже, расправьте плечи и начните день бережно',
    'Здоровье — это не гонка, а поддержка себя каждый день',
    'Пусть у вас найдётся время на воду, еду и короткую паузу',
    'Хорошее самочувствие строится из простых вещей',
    'Выберите сегодня то, за что тело скажет вам спасибо'
  ],
  food: [
    'Не нужен идеальный рацион — достаточно внимательнее выбирать еду',
    'Начните день с завтрака, который даст вам силы, а не чувство вины',
    'Регулярность важнее строгих запретов',
    'Еда — это энергия и забота, а не повод ругать себя',
    'Старайтесь замечать голод и насыщение без спешки',
    'Сегодня можно добавить к рациону что-то полезное и вкусное',
    'Один сбалансированный приём пищи уже хороший шаг',
    'Не делите еду на хорошую и плохую, ищите баланс',
    'Планируйте питание так, чтобы у вас оставались силы на день',
    'Достаточно сделать следующий выбор немного осознаннее',
    'Ваш рацион не обязан быть идеальным, чтобы быть полезным',
    'Пусть еда сегодня поддерживает вас, а не создаёт напряжение'
  ],
  activity: [
    'Любая активность считается: прогулка тоже отличный выбор',
    'Сегодня можно двигаться в своём ритме — даже 10 минут имеют значение',
    'Выберите движение, которое приносит удовольствие',
    'Необязательно идти в зал: прогулка и растяжка тоже забота о себе',
    'Пара минут разминки может заметно изменить самочувствие',
    'Движение помогает не только телу, но и настроению',
    'Выберите сегодня активность, после которой станет легче',
    'Лестница, прогулка или танец дома — всё это движение',
    'Не сравнивайте свою активность с чужой, выбирайте подходящую вам',
    'Пусть сегодня найдётся немного времени для тела',
    'Даже короткая прогулка может стать хорошей перезагрузкой',
    'Двигайтесь не ради отчёта, а ради ощущения жизни'
  ]
};

const MORNING_MOTIVATION_ENDINGS = [
  '.',
  '. Пусть день начнётся спокойно.',
  '. Выберите то, что поддержит вас.',
  '. Спокойный темп тоже движение вперёд.',
  '. Пусть это будет по-доброму к себе.'
];


function getMorningMotivationMessage(theme, sequenceIndex = 0) {
  const messages = MORNING_MOTIVATION_MESSAGES[theme] || MORNING_MOTIVATION_MESSAGES.mixed;
  const index = Math.abs(Math.floor(Number(sequenceIndex) || 0));
  const base = messages[index % messages.length];
  const ending = MORNING_MOTIVATION_ENDINGS[Math.floor(index / messages.length) % MORNING_MOTIVATION_ENDINGS.length];
  return `${base}${ending}`;
}

function morningMotivationVariantsCount(theme) {
  const messages = MORNING_MOTIVATION_MESSAGES[theme] || MORNING_MOTIVATION_MESSAGES.mixed;
  return messages.length * MORNING_MOTIVATION_ENDINGS.length;
}

const ACTIVITY_TYPES = {
  walk: { label: 'Прогулка', emoji: '🚶' },
  cardio: { label: 'Кардио / бег', emoji: '🏃' },
  swim: { label: 'Плавание', emoji: '🏊' },
  bike: { label: 'Велосипед', emoji: '🚲' },
  strength: { label: 'Силовая', emoji: '🏋️' },
  stretch: { label: 'Растяжка', emoji: '🧘' },
  leisure: { label: 'Активный отдых', emoji: '⛸️' },
  other: { label: 'Другое', emoji: '💪' }
};

const state = {
  water: { date: todayKey(), total: 0, log: [], goal: DEFAULTS.water.goal },
  food: { date: todayKey(), items: [], goal: DEFAULTS.food.goal },
  favoriteMeals: [],
  dailyHistory: [],
  workouts: [],
  activityTemplates: [],
  reminders: { ...DEFAULTS.reminders },
  morningMotivation: { ...DEFAULTS.morningMotivation },
  activitySettings: { ...DEFAULTS.activitySettings },
  profileSettings: { ...DEFAULTS.profileSettings },
  mealReminders: { ...DEFAULTS.mealReminders },
  customMealTypes: [],
  theme: null
};

function isValidReminderTime(time) {
  if (typeof time !== 'string' || !/^\d{2}:\d{2}$/.test(time)) return false;
  const [hours, minutes] = time.split(':').map(Number);
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

function normalizeReminderSettings() {
  const reminders = state.reminders || {};
  state.reminders = {
    enabled: reminders.enabled === true,
    time: isValidReminderTime(reminders.time) ? reminders.time : DEFAULTS.reminders.time
  };
}

function normalizeCustomMealTypes() {
  const ids = new Set();
  state.customMealTypes = (Array.isArray(state.customMealTypes) ? state.customMealTypes : [])
    .map((meal) => ({ id: String(meal.id || uid()), label: normalizeActivityName(meal.label) || '' }))
    .filter((meal) => meal.label && !ids.has(meal.id) && ids.add(meal.id))
    .slice(0, 20);
}

function getMealTypes() {
  return [...MEAL_REMINDER_TYPES, ...state.customMealTypes];
}

function normalizeMealReminders() {
  const source = state.mealReminders || {};
  // Версия 2 безопасно отключает старые повторяющиеся напоминания v0.1.24.
  // Пользователь заново выбирает только нужные приёмы пищи.
  const legacy = source.version !== 2;
  const map = new Map((legacy ? [] : (Array.isArray(source.meals) ? source.meals : [])).map((meal) => [meal.id, meal]));
  state.mealReminders = {
    version: 2,
    enabled: legacy ? false : source.enabled === true,
    meals: getMealTypes().map((type) => {
      const meal = map.get(type.id) || {};
      return { id: type.id, label: type.label, enabled: meal.enabled === true, time: isValidReminderTime(meal.time) ? meal.time : type.time };
    })
  };
}

function normalizeMorningMotivation() {
  const motivation = state.morningMotivation || {};
  const theme = MORNING_MOTIVATION_THEMES[motivation.theme] ? motivation.theme : DEFAULTS.morningMotivation.theme;
  const message = typeof motivation.message === 'string' && motivation.message.length > 0 && motivation.message.length <= 180
    ? motivation.message
    : getMorningMotivationMessage(theme, 0);
  state.morningMotivation = {
    enabled: motivation.enabled === true,
    time: isValidReminderTime(motivation.time) ? motivation.time : DEFAULTS.morningMotivation.time,
    theme,
    message
  };
}

function normalizeProfileSettings() {
  const profile = state.profileSettings || {};
  const weight = Number(String(profile.weightKg || '').replace(',', '.'));
  state.profileSettings = { weightKg: Number.isFinite(weight) && weight >= 25 && weight <= 300 ? Math.round(weight * 10) / 10 : null };
}

function normalizeHomeLayoutValue(source) {
  const layout = source && typeof source === 'object' ? source : {};
  const knownIds = HOME_CARDS.map((card) => card.id);
  const seen = new Set();
  const order = (Array.isArray(layout.order) ? layout.order : [])
    .map((id) => String(id))
    .filter((id) => knownIds.includes(id) && !seen.has(id) && seen.add(id));
  knownIds.forEach((id) => { if (!seen.has(id)) order.push(id); });

  const rawVisible = layout.visible && typeof layout.visible === 'object' ? layout.visible : {};
  const visible = Object.fromEntries(knownIds.map((id) => [id, rawVisible[id] !== false]));
  if (!Object.values(visible).some(Boolean)) visible[order[0]] = true;
  return { order, visible };
}

function normalizeHomeLayout() {
  state.homeLayout = normalizeHomeLayoutValue(state.homeLayout);
}

function normalizeActivitySettings() {
  const settings = state.activitySettings || {};
  state.activitySettings = {
    weeklyGoalMinutes: Math.min(1440, Math.max(30, Math.round(Number(settings.weeklyGoalMinutes) || DEFAULTS.activitySettings.weeklyGoalMinutes)))
  };
}

function normalizeOptionalNote(value) {
  const note = String(value || '').trim().replace(/\s+/g, ' ');
  return note.length > 0 && note.length <= 120 ? note : null;
}

function normalizeActivityName(value) {
  const name = String(value || '').trim().replace(/\s+/g, ' ');
  return name.length >= 2 && name.length <= 60 ? name : null;
}

function normalizeFavoriteMeal(meal) {
  if (!meal || typeof meal !== 'object') return null;
  const name = normalizeActivityName(meal.name);
  const kcal = Math.round(Number(meal.kcal));
  if (!name || !Number.isFinite(kcal) || kcal < 1 || kcal > 5000) return null;
  return { id: String(meal.id || uid()), name, kcal };
}

function normalizeFavoriteMeals() {
  const ids = new Set();
  state.favoriteMeals = (Array.isArray(state.favoriteMeals) ? state.favoriteMeals : [])
    .map(normalizeFavoriteMeal)
    .filter((meal) => meal && !ids.has(meal.id) && ids.add(meal.id))
    .slice(0, 30);
}

function normalizeDailyHistory() {
  const byDate = new Map();
  (Array.isArray(state.dailyHistory) ? state.dailyHistory : []).forEach((day) => {
    if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day.date)) return;
    const normalized = {
      date: day.date,
      waterTotal: Math.max(0, Math.round(Number(day.waterTotal) || 0)),
      waterGoal: Math.max(500, Math.round(Number(day.waterGoal) || DEFAULTS.water.goal)),
      foodTotal: Math.max(0, Math.round(Number(day.foodTotal) || 0)),
      foodGoal: Math.max(800, Math.round(Number(day.foodGoal) || DEFAULTS.food.goal)),
      activityMinutes: Math.max(0, Math.round(Number(day.activityMinutes) || 0))
    };
    byDate.set(normalized.date, normalized);
  });
  state.dailyHistory = [...byDate.values()].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 400);
}

function recordDailySummary(date) {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  const foodItems = state.food && state.food.date === date && Array.isArray(state.food.items) ? state.food.items : [];
  const waterTotal = state.water && state.water.date === date ? Number(state.water.total) || 0 : 0;
  const waterGoal = state.water && state.water.date === date ? state.water.goal : DEFAULTS.water.goal;
  const foodGoal = state.food && state.food.date === date ? state.food.goal : DEFAULTS.food.goal;
  const foodTotal = foodItems.reduce((sum, item) => sum + (Number(item.kcal) || 0), 0);
  const activityMinutes = (Array.isArray(state.workouts) ? state.workouts : [])
    .filter((workout) => workout.date === date)
    .reduce((sum, workout) => sum + (Number(workout.durationMinutes) || 0), 0);

  // Не создаём пустые дни, если пользователь в этот день ничего не отмечал.
  if (waterTotal <= 0 && foodTotal <= 0 && activityMinutes <= 0) return;
  const summary = { date, waterTotal, waterGoal, foodTotal, foodGoal, activityMinutes };
  const history = Array.isArray(state.dailyHistory) ? state.dailyHistory : [];
  const index = history.findIndex((day) => day.date === date);
  if (index >= 0) history[index] = summary;
  else history.push(summary);
  state.dailyHistory = history;
  normalizeDailyHistory();
}

function normalizeActivityTemplates() {
  const templates = Array.isArray(state.activityTemplates) ? state.activityTemplates : [];
  state.activityTemplates = templates
    .filter((template) => template && typeof template === 'object'
      && ACTIVITY_TYPES[template.type]
      && normalizeActivityName(template.name)
      && Number.isFinite(Number(template.durationMinutes))
      && Number(template.durationMinutes) >= 5)
    .map((template) => ({
      id: String(template.id || uid()),
      name: normalizeActivityName(template.name),
      type: template.type,
      durationMinutes: Math.min(1440, Math.round(Number(template.durationMinutes))),
      createdAt: Number(template.createdAt) || Date.now()
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

function normalizeWorkouts() {
  const workouts = Array.isArray(state.workouts) ? state.workouts : [];
  state.workouts = workouts
    .filter((workout) => workout && typeof workout === 'object'
      && /^\d{4}-\d{2}-\d{2}$/.test(workout.date)
      && ACTIVITY_TYPES[workout.type]
      && Number.isFinite(Number(workout.durationMinutes))
      && Number(workout.durationMinutes) >= 5)
    .map((workout) => ({
      id: String(workout.id || uid()),
      date: workout.date,
      type: workout.type,
      title: normalizeActivityName(workout.title) || null,
      note: normalizeOptionalNote(workout.note),
      intensity: ['low','medium','high'].includes(workout.intensity) ? workout.intensity : 'medium',
      durationMinutes: Math.min(1440, Math.round(Number(workout.durationMinutes))),
      createdAt: Number(workout.createdAt) || Date.now()
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

// В списке всегда видны только имена: раскрыт может быть один профиль с его действиями.
let expandedProfileId = null;

function renderProfiles() {
  if (typeof document === 'undefined') return;
  const active = profilesState.profiles.find((profile) => profile.id === profilesState.activeId);
  const name = active ? active.name : 'Мой профиль';
  const switcher = $('#profile-switcher');
  if (switcher) {
    switcher.title = `Текущий профиль: ${name}`;
    switcher.setAttribute('aria-label', `Выбрать профиль. Текущий: ${name}`);
  }
  const settingsName = $('#profile-settings-name');
  if (settingsName) settingsName.textContent = name;
  const homeProfileName = $('#home-active-profile');
  if (homeProfileName) homeProfileName.textContent = name;
  const list = $('#profile-list');
  if (!list) return;

  list.innerHTML = profilesState.profiles.map((profile, index) => {
    const isActive = profile.id === profilesState.activeId;
    const isOpen = profile.id === expandedProfileId;
    const profileId = escapeHtml(profile.id);
    const profileName = escapeHtml(profile.name);
    const detailsId = `profile-details-${index}`;
    const energySettings = isActive ? `
      <div class="profile-energy-settings profile-card-energy">
        <label for="profile-weight">Ваш вес, кг <span>(необязательно)</span></label>
        <div class="profile-weight-row">
          <input id="profile-weight" type="text" inputmode="decimal" value="${state.profileSettings.weightKg || ''}" placeholder="Например, 70">
          <button class="btn btn-secondary" id="profile-weight-save" type="button">Сохранить</button>
        </div>
        <p class="training-hint">Вес используется только для примерной оценки расхода энергии при активности и не меняет цель питания автоматически.</p>
      </div>` : '';
    return `
      <section class="profile-card ${isActive ? 'active' : ''}">
        <div class="profile-card-header">
          <button type="button" class="profile-select" data-profile-id="${profileId}" aria-label="${isActive ? 'Текущий профиль' : 'Перейти в профиль'}: ${profileName}">
            <span class="profile-card-name">${profileName}</span>
            <span class="profile-card-status">${isActive ? 'Текущий' : 'Перейти'}</span>
          </button>
          <button class="profile-expand-btn" type="button" data-profile-expand="${profileId}" aria-expanded="${isOpen}" aria-controls="${detailsId}" aria-label="${isOpen ? 'Свернуть' : 'Открыть'} параметры профиля ${profileName}">
            <span aria-hidden="true">⌄</span>
          </button>
        </div>
        <div class="profile-card-details" id="${detailsId}" ${isOpen ? '' : 'hidden'}>
          <p>${isActive ? 'Это активный профиль. Его вес, цели, история и уведомления не смешиваются с другими профилями.' : 'Нажмите название выше, чтобы перейти в этот профиль. Его данные хранятся отдельно.'}</p>
          <div class="profile-card-actions">
            <button class="profile-edit-btn" type="button" data-profile-rename="${profileId}">Переименовать</button>
            ${profile.id !== 'default' ? `<button class="profile-delete-btn" type="button" data-profile-delete="${profileId}">Удалить</button>` : ''}
          </div>
          ${energySettings}
        </div>
      </section>`;
  }).join('');
}

function toggleProfileDetails(id) {
  if (!profilesState.profiles.some((profile) => profile.id === id)) return;
  expandedProfileId = expandedProfileId === id ? null : id;
  renderProfiles();
}

function openProfilesDialog() {
  expandedProfileId = null;
  renderProfiles();
  $('#profiles-dialog').hidden = false;
}
function closeProfilesDialog() {
  expandedProfileId = null;
  $('#profiles-dialog').hidden = true;
}
async function switchProfile(id) {
  if (!profilesState.profiles.some((profile) => profile.id === id)) return;
  if (id === profilesState.activeId) { closeProfilesDialog(); return; }
  saveState();
  await cancelTrainingReminder();
  await cancelMealReminders();
  await cancelMorningMotivation();
  profilesState.activeId = id;
  saveProfiles();
  location.reload();
}
function addProfile() {
  const input = $('#profile-new-name');
  const name = normalizeActivityName(input.value);
  if (!name) { toast('Введите имя профиля'); input.focus(); return; }
  if (profilesState.profiles.length >= 10) { toast('Можно добавить не более 10 профилей'); return; }
  const id = `profile-${uid()}`;
  profilesState.profiles.push({ id, name });
  saveProfiles();
  switchProfile(id);
}

let pendingProfileRenameId = null;
function requestRenameProfile(id) {
  const profile = profilesState.profiles.find((item) => item.id === id);
  if (!profile) return;
  pendingProfileRenameId = id;
  $('#profile-rename-input').value = profile.name;
  $('#profile-rename-dialog').hidden = false;
  setTimeout(() => $('#profile-rename-input').focus(), 100);
}
function closeRenameProfileDialog() { pendingProfileRenameId = null; $('#profile-rename-dialog').hidden = true; }
function confirmRenameProfile() {
  const profile = profilesState.profiles.find((item) => item.id === pendingProfileRenameId);
  const name = normalizeActivityName($('#profile-rename-input').value);
  if (!profile || !name) { toast('Введите название профиля'); return; }
  profile.name = name;
  saveProfiles();
  closeRenameProfileDialog();
  renderProfiles();
  toast('Профиль переименован');
}

let pendingProfileDeleteId = null;
function requestDeleteProfile(id) {
  const profile = profilesState.profiles.find((item) => item.id === id);
  if (!profile || profile.id === 'default') return;
  pendingProfileDeleteId = id;
  $('#profile-delete-text').textContent = `Профиль «${profile.name}» и все его данные будут удалены только с этого устройства. Это нельзя отменить.`;
  $('#profile-delete-dialog').hidden = false;
}
function closeDeleteProfileDialog() { pendingProfileDeleteId = null; $('#profile-delete-dialog').hidden = true; }
async function confirmDeleteProfile() {
  const id = pendingProfileDeleteId;
  const profile = profilesState.profiles.find((item) => item.id === id);
  if (!profile) return closeDeleteProfileDialog();
  profilesState.profiles = profilesState.profiles.filter((item) => item.id !== id);
  localStorage.removeItem(profileStateKey(id));
  const wasActive = profilesState.activeId === id;
  if (wasActive) {
    await cancelTrainingReminder(); await cancelMealReminders(); await cancelMorningMotivation();
    profilesState.activeId = 'default';
  }
  saveProfiles();
  closeDeleteProfileDialog();
  if (wasActive) { location.reload(); return; }
  renderProfiles();
  toast('Профиль удалён');
}

function saveProfileWeight() {
  const input = $('#profile-weight');
  const weight = Number(String(input.value).replace(',', '.'));
  if (!Number.isFinite(weight) || weight < 25 || weight > 300) { toast('Укажите вес от 25 до 300 кг или оставьте поле пустым'); return; }
  state.profileSettings.weightKg = Math.round(weight * 10) / 10;
  saveState();
  renderTraining();
  toast('Вес сохранён. Расход энергии будет показываться как оценка.');
}

function loadState() {
  try {
    const raw = localStorage.getItem(profileStateKey());
    if (raw) Object.assign(state, JSON.parse(raw));
  } catch (e) { /* повреждённые данные — начинаем заново */ }

  const today = todayKey();
  const previousWaterDate = state.water.date;
  const previousFoodDate = state.food.date;
  if (previousWaterDate !== today || previousFoodDate !== today) {
    recordDailySummary(previousWaterDate !== today ? previousWaterDate : previousFoodDate);
  }
  if (state.water.date !== today) {
    state.water = { date: today, total: 0, log: [], goal: state.water.goal || DEFAULTS.water.goal };
  }
  if (state.food.date !== today) {
    state.food = { date: today, items: [], goal: state.food.goal || DEFAULTS.food.goal };
  }
  normalizeDailyHistory();
  normalizeReminderSettings();
  normalizeCustomMealTypes();
  normalizeMealReminders();
  normalizeMorningMotivation();
  normalizeActivitySettings();
  normalizeProfileSettings();
  normalizeHomeLayout();
  normalizeFavoriteMeals();
  normalizeWorkouts();
  normalizeActivityTemplates();
  if (previousWaterDate !== today || previousFoodDate !== today) {
    try { localStorage.setItem(profileStateKey(), JSON.stringify(state)); } catch (e) { /* localStorage недоступен */ }
  }
}

function saveState() {
  try {
    recordDailySummary(todayKey());
    localStorage.setItem(profileStateKey(), JSON.stringify(state));
    updateNativeWidget();
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
let activeStatsPeriod = 'week';
let activeWaterDetailPeriod = 'week';
let activeFoodDetailPeriod = 'week';

function updateNativeWidget() {
  if (typeof window === 'undefined' || !window.FitFlowExport
      || typeof window.FitFlowExport.updateWidget !== 'function') return;
  try {
    const activityMinutes = (Array.isArray(state.workouts) ? state.workouts : [])
      .filter((workout) => workout.date === todayKey())
      .reduce((sum, workout) => sum + (Number(workout.durationMinutes) || 0), 0);
    const foodTotal = state.food.items.reduce((sum, item) => sum + (Number(item.kcal) || 0), 0);
    window.FitFlowExport.updateWidget(JSON.stringify({
      waterTotal: state.water.total,
      waterGoal: state.water.goal,
      foodTotal,
      foodGoal: state.food.goal,
      activityMinutes,
      date: todayKey()
    }));
  } catch (e) {
    console.warn('Не удалось обновить Android-виджет:', e);
  }
}

function renderAll() {
  applyHomeLayout();
  renderHomeLayoutSettings();
  renderWater();
  renderFood();
  renderMealTypePicker();
  renderStats();
  renderTraining();
  renderActivityIntensity();
  renderDurationUnit();
  renderReminderSettings();
  renderMealRemindersSettings();
  renderMorningMotivationSettings();
  updateNativeWidget();
}

function applyHomeLayout() {
  if (typeof document === 'undefined') return;
  const container = $('#home-cards');
  if (!container) return;
  const layout = normalizeHomeLayoutValue(state.homeLayout);
  state.homeLayout = layout;
  layout.order.forEach((id) => {
    const card = $(`#${id}-card`);
    if (!card) return;
    card.hidden = !layout.visible[id];
    container.appendChild(card);
  });
}

function renderHomeLayoutSettings() {
  const status = $('#home-layout-status');
  if (!status) return;
  const layout = normalizeHomeLayoutValue(state.homeLayout);
  const visibleCount = Object.values(layout.visible).filter(Boolean).length;
  status.textContent = `Показывается: ${visibleCount} из ${HOME_CARDS.length}`;
}

function renderHomeLayoutDialog() {
  const list = $('#home-layout-list');
  if (!list) return;
  const layout = normalizeHomeLayoutValue(state.homeLayout);
  list.innerHTML = layout.order.map((id, index) => {
    const card = HOME_CARDS.find((item) => item.id === id);
    if (!card) return '';
    return `<div class="home-layout-row">
      <div class="home-layout-card-name"><span aria-hidden="true">${card.icon}</span><strong>${card.label}</strong></div>
      <div class="home-layout-controls">
        <label class="switch" title="Показывать ${card.label} на Главной">
          <input type="checkbox" data-home-card-visible="${card.id}" ${layout.visible[card.id] ? 'checked' : ''}>
          <span class="switch-track" aria-hidden="true"><span class="switch-thumb"></span></span>
          <span class="sr-only">Показывать ${card.label} на Главной</span>
        </label>
        <div class="home-layout-order" aria-label="Изменить порядок ${card.label}">
          <button type="button" data-home-card-move="${card.id}" data-home-card-direction="-1" ${index === 0 ? 'disabled' : ''} aria-label="Переместить ${card.label} выше">↑</button>
          <button type="button" data-home-card-move="${card.id}" data-home-card-direction="1" ${index === layout.order.length - 1 ? 'disabled' : ''} aria-label="Переместить ${card.label} ниже">↓</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function openHomeLayoutDialog() {
  renderHomeLayoutDialog();
  $('#home-layout-dialog').hidden = false;
}
function closeHomeLayoutDialog() { $('#home-layout-dialog').hidden = true; }

function updateHomeCardVisibility(id, visible) {
  const layout = normalizeHomeLayoutValue(state.homeLayout);
  if (!HOME_CARDS.some((card) => card.id === id)) return;
  if (!visible && Object.values(layout.visible).filter(Boolean).length <= 1) {
    toast('Оставьте хотя бы одну карточку на Главной');
    renderHomeLayoutDialog();
    return;
  }
  layout.visible[id] = visible;
  state.homeLayout = layout;
  saveState();
  applyHomeLayout();
  renderHomeLayoutSettings();
  renderHomeLayoutDialog();
}

function moveHomeCard(id, direction) {
  const layout = normalizeHomeLayoutValue(state.homeLayout);
  const from = layout.order.indexOf(id);
  const to = from + Number(direction);
  if (from < 0 || to < 0 || to >= layout.order.length) return;
  [layout.order[from], layout.order[to]] = [layout.order[to], layout.order[from]];
  state.homeLayout = layout;
  saveState();
  applyHomeLayout();
  renderHomeLayoutDialog();
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
  renderFavoriteMeals();
}

function statsDateKey(daysAgo) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - daysAgo);
  const p = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

function statsPeriodDays(period = activeStatsPeriod) {
  if (period === 'day') return 1;
  if (period === 'month') return 30;
  return 7;
}

function currentDaySummary() {
  return {
    date: todayKey(),
    waterTotal: state.water.total,
    waterGoal: state.water.goal,
    foodTotal: state.food.items.reduce((sum, item) => sum + (Number(item.kcal) || 0), 0),
    foodGoal: state.food.goal,
    activityMinutes: (Array.isArray(state.workouts) ? state.workouts : [])
      .filter((workout) => workout.date === todayKey())
      .reduce((sum, workout) => sum + (Number(workout.durationMinutes) || 0), 0)
  };
}

function getStatsDays(period = activeStatsPeriod) {
  const count = statsPeriodDays(period);
  const historyByDate = new Map((Array.isArray(state.dailyHistory) ? state.dailyHistory : [])
    .map((day) => [day.date, day]));
  const days = [];
  for (let offset = count - 1; offset >= 0; offset--) {
    const date = statsDateKey(offset);
    days.push(date === todayKey()
      ? currentDaySummary()
      : (historyByDate.get(date) || {
        date, waterTotal: 0, waterGoal: DEFAULTS.water.goal,
        foodTotal: 0, foodGoal: DEFAULTS.food.goal, activityMinutes: 0
      }));
  }
  return days;
}

function statsDateLabel(dateKey, period) {
  if (period === 'day') return 'сегодня';
  return dateKey.slice(8, 10);
}

function formatActivityDuration(minutes) {
  if (!minutes) return '0 мин';
  return formatWorkoutDuration(minutes);
}

function renderStatsBars(container, days, valueKey, maxValue, period) {
  const safeMax = Math.max(1, maxValue);
  container.innerHTML = days.map((day) => {
    const value = Number(day[valueKey]) || 0;
    const height = Math.max(2, Math.min(100, (value / safeMax) * 100));
    return `<div class="stats-bar-wrap" title="${statsDateLabel(day.date, period)}: ${Math.round(value)}">
      <div class="stats-bar" style="height:${height}%"></div>
      <span class="stats-bar-label">${statsDateLabel(day.date, period)}</span>
    </div>`;
  }).join('');
}

function renderStats() {
  if (typeof document === 'undefined') return;
  const days = getStatsDays();
  const period = activeStatsPeriod;
  const waterTotal = days.reduce((sum, day) => sum + day.waterTotal, 0);
  const waterGoal = days.reduce((sum, day) => sum + day.waterGoal, 0);
  const foodTotal = days.reduce((sum, day) => sum + day.foodTotal, 0);
  const foodGoal = days.reduce((sum, day) => sum + day.foodGoal, 0);
  const activityMinutes = days.reduce((sum, day) => sum + day.activityMinutes, 0);
  const count = days.length;

  const captions = { day: 'Итоги за сегодня', week: 'Итоги за 7 дней', month: 'Итоги за 30 дней' };
  $('#stats-period-caption').textContent = captions[period];
  $('#stats-water-total').textContent = `${fmt(waterTotal)} мл`;
  $('#stats-water-hint').textContent = `${Math.round(waterGoal ? (waterTotal / waterGoal) * 100 : 0)}% от цели · в среднем ${fmt(waterTotal / count)} мл/день`;
  $('#stats-food-total').textContent = `${fmt(foodTotal)} ккал`;
  $('#stats-food-hint').textContent = `${Math.round(foodGoal ? (foodTotal / foodGoal) * 100 : 0)}% от цели · в среднем ${fmt(foodTotal / count)} ккал/день`;
  $('#stats-activity-total').textContent = formatActivityDuration(activityMinutes);
  $('#stats-activity-hint').textContent = activityMinutes
    ? `В среднем ${formatActivityDuration(activityMinutes / count)} в день`
    : 'Пока нет отмеченной активности';

  renderStatsBars($('#stats-water-bars'), days, 'waterTotal', Math.max(...days.map((day) => day.waterGoal)), period);
  renderStatsBars($('#stats-food-bars'), days, 'foodTotal', Math.max(...days.map((day) => day.foodGoal)), period);
  renderStatsBars($('#stats-activity-bars'), days, 'activityMinutes', Math.max(...days.map((day) => day.activityMinutes), 30), period);
  $$('#stats-periods button').forEach((button) =>
    button.classList.toggle('active', button.dataset.statsPeriod === period));
}

function renderWaterDetails() {
  if (typeof document === 'undefined') return;
  const period = activeWaterDetailPeriod;
  const days = getStatsDays(period);
  const total = days.reduce((sum, day) => sum + day.waterTotal, 0);
  const goal = days.reduce((sum, day) => sum + day.waterGoal, 0);
  const achieved = days.filter((day) => day.waterTotal > 0 && day.waterTotal >= day.waterGoal).length;
  const captions = { day: 'Итоги за сегодня', week: 'Итоги за 7 дней', month: 'Итоги за 30 дней' };
  $('#water-details-caption').textContent = captions[period];
  $('#water-details-total').textContent = `${fmt(total)} мл`;
  $('#water-details-average').textContent = `В среднем ${fmt(total / days.length)} мл в день · ${Math.round(goal ? total / goal * 100 : 0)}% от цели`;
  $('#water-details-insight').textContent = achieved
    ? `Цель по воде выполнена в ${achieved} из ${days.length} дней.`
    : 'Добавляйте воду на Главной — здесь появится история выполнения цели.';
  renderStatsBars($('#water-details-bars'), days, 'waterTotal', Math.max(...days.map((day) => day.waterGoal)), period);
  $$('#water-detail-periods button').forEach((button) => button.classList.toggle('active', button.dataset.detailPeriod === period));
}

function renderFoodDetails() {
  if (typeof document === 'undefined') return;
  const period = activeFoodDetailPeriod;
  const days = getStatsDays(period);
  const total = days.reduce((sum, day) => sum + day.foodTotal, 0);
  const goal = days.reduce((sum, day) => sum + day.foodGoal, 0);
  const withinGoal = days.filter((day) => day.foodTotal > 0 && day.foodTotal <= day.foodGoal).length;
  const captions = { day: 'Итоги за сегодня', week: 'Итоги за 7 дней', month: 'Итоги за 30 дней' };
  $('#food-details-caption').textContent = captions[period];
  $('#food-details-total').textContent = `${fmt(total)} ккал`;
  $('#food-details-average').textContent = `В среднем ${fmt(total / days.length)} ккал в день · ${Math.round(goal ? total / goal * 100 : 0)}% от цели`;
  $('#food-details-insight').textContent = withinGoal
    ? `Цель по калориям не превышена в ${withinGoal} из ${days.length} дней с записями.`
    : 'Добавляйте питание на Главной — здесь появятся дневные итоги.';
  renderStatsBars($('#food-details-bars'), days, 'foodTotal', Math.max(...days.map((day) => day.foodGoal)), period);
  $$('#food-detail-periods button').forEach((button) => button.classList.toggle('active', button.dataset.detailPeriod === period));
}

let selectedMealTypeId = '';

function getSelectedMealType() {
  return getMealTypes().find((type) => type.id === selectedMealTypeId) || null;
}

function renderMealTypePicker() {
  const picker = $('#meal-type-picker');
  if (!picker) return;
  picker.innerHTML = [
    '<button class="chip chip-sm meal-type-chip active" type="button" data-meal-type="">Без типа</button>',
    ...getMealTypes().map((type) => `<button class="chip chip-sm meal-type-chip" type="button" data-meal-type="${type.id}">${escapeHtml(type.label)}</button>`)
  ].join('');
  $$('#meal-type-picker [data-meal-type]').forEach((button) =>
    button.classList.toggle('active', button.dataset.mealType === selectedMealTypeId));
}

function addCustomMealType() {
  const input = $('#custom-meal-type-name');
  const label = normalizeActivityName(input.value);
  if (!label) { toast('Введите название типа приёма пищи'); input.focus(); return; }
  const id = `custom-${uid()}`;
  state.customMealTypes.push({ id, label });
  normalizeCustomMealTypes();
  selectedMealTypeId = id;
  input.value = '';
  $('#custom-meal-type-inline').classList.remove('is-open');
  saveState();
  renderMealTypePicker();
  renderMealRemindersSettings();
  toast(`Тип «${label}» добавлен`);
}

function applySelectedMealType(items) {
  const type = getSelectedMealType();
  return items.map((item) => ({ ...item, mealTypeId: type ? type.id : null, mealTypeLabel: type ? type.label : null }));
}

function groupFoodItemsByMealType(items, mealTypes = getMealTypes()) {
  const groupsById = new Map();
  const extraGroups = [];
  const untyped = { id: '', label: 'Без типа', items: [] };
  const knownTypes = new Map(mealTypes.map((type) => [type.id, { id: type.id, label: type.label, items: [] }]));

  items.forEach((item) => {
    const typeId = String(item.mealTypeId || '');
    let group = knownTypes.get(typeId);
    // Сохраняем читаемую старую метку при импорте, даже если тип позже исчез из списка.
    if (!group && typeId && item.mealTypeLabel) {
      group = groupsById.get(typeId);
      if (!group) {
        group = { id: typeId, label: String(item.mealTypeLabel).trim() || 'Другой приём пищи', items: [] };
        groupsById.set(typeId, group);
        extraGroups.push(group);
      }
    }
    (group || untyped).items.push(item);
  });

  return [
    ...[...knownTypes.values()].filter((group) => group.items.length > 0),
    ...extraGroups.filter((group) => group.items.length > 0),
    ...(untyped.items.length ? [untyped] : [])
  ].map((group) => ({
    ...group,
    totalKcal: group.items.reduce((sum, item) => sum + (Number(item.kcal) || 0), 0)
  }));
}

function renderFoodItem(item) {
  return `
    <li class="food-item" data-id="${item.id}">
      <span class="food-item-dot" aria-hidden="true">🍴</span>
      <div class="food-item-info">
        <p class="food-item-name">${escapeHtml(item.name)}</p>
        <p class="food-item-desc">${escapeHtml(item.raw)}</p>
      </div>
      <span class="food-item-kcal">${fmt(item.kcal)}</span>
      <button class="food-item-remove" data-remove="${item.id}" type="button" aria-label="Удалить ${escapeHtml(item.name)}">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </button>
    </li>`;
}

function renderFoodList() {
  const list = $('#food-list');
  const { items } = state.food;

  if (items.length === 0) {
    list.innerHTML = `<li class="food-empty">Пока пусто. Добавьте еду текстом:
      «овсянка 80г, банан 1шт» 🍽️</li>`;
    return;
  }

  list.innerHTML = groupFoodItemsByMealType(items).map((group) => `
    <li class="food-group">
      <div class="food-group-header">
        <h3>${escapeHtml(group.label)}</h3>
        <span aria-label="Итого ${fmt(group.totalKcal)} килокалорий">${fmt(group.totalKcal)} ккал</span>
      </div>
      <ul class="food-group-items" aria-label="${escapeHtml(group.label)}">
        ${group.items.map(renderFoodItem).join('')}
      </ul>
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

  items = applySelectedMealType(items);
  const totalKcal = items.reduce((s, it) => s + it.kcal, 0);
  state.food.items.push(...items);
  saveState();
  renderFood();
  await syncMealRemindersForToday();
  toast(`Добавлено: ${items.map((i) => i.name).join(', ')} (+${fmt(totalKcal)} ккал)`);
}

function readManualMeal() {
  const name = normalizeActivityName($('#manual-food-name').value);
  const kcal = Math.round(Number(String($('#manual-food-kcal').value).replace(',', '.')));
  if (!name || !Number.isFinite(kcal) || kcal < 1 || kcal > 5000) {
    toast('Введите название и от 1 до 5 000 ккал');
    return null;
  }
  return { name, kcal };
}

async function addManualFood() {
  const meal = readManualMeal();
  if (!meal) return;
  state.food.items.push({
    id: uid(), raw: meal.name, name: meal.name, amount: null, unit: 'порция', kcal: meal.kcal, ...applySelectedMealType([{}])[0]
  });
  saveState();
  $('#manual-food-name').value = '';
  $('#manual-food-kcal').value = '';
  renderFood();
  await syncMealRemindersForToday();
  toast(`${meal.name}: +${fmt(meal.kcal)} ккал`);
}

function saveFavoriteMeal() {
  const meal = readManualMeal();
  if (!meal) return;
  state.favoriteMeals.unshift({ id: uid(), ...meal });
  normalizeFavoriteMeals();
  saveState();
  renderFavoriteMeals();
  toast(`«${meal.name}» сохранено в мои блюда`);
}

async function addFavoriteMeal(id) {
  const meal = state.favoriteMeals.find((item) => item.id === id);
  if (!meal) return;
  state.food.items.push({
    id: uid(), raw: meal.name, name: meal.name, amount: null, unit: 'порция', kcal: meal.kcal, ...applySelectedMealType([{}])[0]
  });
  saveState();
  renderFood();
  await syncMealRemindersForToday();
  toast(`${meal.name}: +${fmt(meal.kcal)} ккал`);
}

function removeFavoriteMeal(id) {
  const meal = state.favoriteMeals.find((item) => item.id === id);
  if (!meal) return;
  state.favoriteMeals = state.favoriteMeals.filter((item) => item.id !== id);
  saveState();
  renderFavoriteMeals();
  toast(`«${meal.name}» удалено из моих блюд`);
}

function renderFavoriteMeals() {
  const container = $('#favorite-meals');
  if (!container) return;
  if (state.favoriteMeals.length === 0) {
    container.innerHTML = '<span class="favorite-meals-empty">Сохраните своё блюдо, чтобы добавлять его одним нажатием.</span>';
    return;
  }
  container.innerHTML = state.favoriteMeals.map((meal) => `
    <span class="favorite-meal">
      <button class="favorite-meal-use" type="button" data-favorite-meal="${meal.id}">${escapeHtml(meal.name)} · ${fmt(meal.kcal)} ккал</button>
      <button class="favorite-meal-remove" type="button" data-remove-favorite="${meal.id}" aria-label="Удалить «${escapeHtml(meal.name)}» из моих блюд">×</button>
    </span>`).join('');
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
   Активность: история, готовые варианты и связь с напоминанием
   ============================================================ */
let selectedActivityType = 'walk';
let selectedActivityIntensity = 'medium';
let selectedDurationUnit = 'minutes';

function renderDurationUnit() {
  const label = $('#workout-duration-unit-label');
  if (label) label.textContent = selectedDurationUnit === 'hours' ? 'часы' : 'мин';
  $$('#duration-unit-choices button').forEach((button) => button.classList.toggle('active', button.dataset.durationUnit === selectedDurationUnit));
}

function openDurationUnitDialog() {
  $('#duration-unit-dialog').hidden = false;
  renderDurationUnit();
}
function closeDurationUnitDialog() { $('#duration-unit-dialog').hidden = true; }
function setDurationUnit(unit) {
  if (unit !== 'minutes' && unit !== 'hours') return;
  selectedDurationUnit = unit;
  closeDurationUnitDialog();
  renderDurationUnit();
  $('#workout-duration').placeholder = unit === 'hours' ? '0,5' : '30';
}

function parseWorkoutDuration(raw, unit = 'hours') {
  const normalized = String(raw || '').trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  const isHours = unit === 'hours';
  if (!Number.isFinite(value) || value <= 0 || (isHours && value > 24) || (!isHours && value > 1440)) return null;
  const minutes = Math.round(isHours ? value * 60 : value);
  return minutes >= 5 ? minutes : null;
}

function formatWorkoutDuration(minutes) {
  const safeMinutes = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(safeMinutes / 60);
  const rest = safeMinutes % 60;
  if (hours === 0) return `${rest} мин`;
  if (rest === 0) return `${hours} ч`;
  return `${hours} ч ${rest} мин`;
}

function getWorkoutsForDate(date = todayKey()) {
  return state.workouts.filter((workout) => workout.date === date);
}

function activityCountText(count) {
  const lastTwoDigits = count % 100;
  const lastDigit = count % 10;
  if (lastTwoDigits >= 11 && lastTwoDigits <= 14) return 'активностей';
  if (lastDigit === 1) return 'активность';
  if (lastDigit >= 2 && lastDigit <= 4) return 'активности';
  return 'активностей';
}

function hasWorkoutToday() {
  return getWorkoutsForDate().length > 0;
}

function renderActivityTypeSelection() {
  $$('.workout-type-btn').forEach((button) => {
    const selected = button.dataset.activityType === selectedActivityType;
    button.classList.toggle('active', selected);
    button.setAttribute('aria-checked', String(selected));
  });
}

function renderActivityTemplates() {
  const list = $('#activity-templates');
  if (!list) return;

  if (state.activityTemplates.length === 0) {
    list.innerHTML = '<p class="activity-template-empty">Пока нет готовых вариантов. Например: «Кардио 45 мин» или «Прогулка в парке».</p>';
    return;
  }

  list.innerHTML = state.activityTemplates.map((template) => {
    const type = ACTIVITY_TYPES[template.type] || ACTIVITY_TYPES.other;
    return `
      <li class="activity-template-item">
        <button class="activity-template-use" type="button" data-use-template="${template.id}">
          <span>${type.emoji} ${escapeHtml(template.name)}</span>
          <small>${formatWorkoutDuration(template.durationMinutes)}</small>
        </button>
        <button class="activity-template-remove" type="button" data-remove-template="${template.id}" aria-label="Удалить готовый вариант «${escapeHtml(template.name)}»">×</button>
      </li>`;
  }).join('');
}

const ACTIVITY_MET = {
  walk: { low: 2.5, medium: 3.5, high: 5 }, cardio: { low: 6, medium: 8, high: 10 },
  swim: { low: 5, medium: 7, high: 9 }, strength: { low: 3.5, medium: 5, high: 6 },
  stretch: { low: 2, medium: 2.5, high: 3 }, leisure: { low: 3, medium: 5, high: 7 }, other: { low: 3, medium: 5, high: 7 }
};
function estimateActivityKcal(workout) {
  const weight = state.profileSettings.weightKg;
  if (!weight || !workout) return null;
  const met = (ACTIVITY_MET[workout.type] || ACTIVITY_MET.other)[workout.intensity || 'medium'];
  return Math.round(met * weight * (workout.durationMinutes / 60));
}
function renderActivityIntensity() {
  $$('#activity-intensity [data-intensity]').forEach((button) => button.classList.toggle('active', button.dataset.intensity === selectedActivityIntensity));
}

function renderTraining() {
  if (typeof document === 'undefined') return;
  const list = $('#training-list');
  const total = $('#training-total');
  if (!list || !total) return;

  const workouts = getWorkoutsForDate();
  const totalMinutes = workouts.reduce((sum, workout) => sum + workout.durationMinutes, 0);
  if (workouts.length === 0) {
    total.textContent = 'Сегодня активности пока нет';
    list.innerHTML = '<li class="workout-empty">Выберите вид активности, укажите длительность и добавьте первую запись 🚶</li>';
  } else {
    total.textContent = `${workouts.length} ${activityCountText(workouts.length)} · ${formatWorkoutDuration(totalMinutes)}`;
    list.innerHTML = workouts.map((workout) => {
      const type = ACTIVITY_TYPES[workout.type] || ACTIVITY_TYPES.other;
      const title = workout.title || type.label;
      return `
        <li class="workout-item" data-workout-id="${workout.id}">
          <span class="workout-item-emoji" aria-hidden="true">${type.emoji}</span>
          <div class="workout-item-info">
            <p>${escapeHtml(title)}</p>
            <span>${formatWorkoutDuration(workout.durationMinutes)}${estimateActivityKcal(workout) != null ? ` · <span class="energy-estimate">~${estimateActivityKcal(workout)} ккал</span>` : ''}${workout.note ? ` · ${escapeHtml(workout.note)}` : ''}</span>
          </div>
          <button class="workout-item-remove" data-remove-workout="${workout.id}" type="button" aria-label="Удалить активность «${escapeHtml(title)}»">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </li>`;
    }).join('');
  }
  const weeklyMinutes = getStatsDays('week').reduce((sum, day) => sum + day.activityMinutes, 0);
  const weeklyGoal = state.activitySettings.weeklyGoalMinutes;
  $('#weekly-activity-total').textContent = `${formatActivityDuration(weeklyMinutes)} из ${formatActivityDuration(weeklyGoal)}`;
  $('#weekly-activity-progress').style.width = `${Math.min(100, (weeklyMinutes / weeklyGoal) * 100)}%`;
  renderActivityTypeSelection();
  renderActivityTemplates();
}

async function syncTrainingReminderForToday() {
  if (!state.reminders.enabled) return true;
  const result = await scheduleTrainingReminder({
    skipToday: hasWorkoutToday(),
    clearDelivered: hasWorkoutToday()
  });
  return result.ok;
}

async function addActivity(template = null) {
  const durationInput = $('#workout-duration');
  const durationMinutes = template ? template.durationMinutes : parseWorkoutDuration(durationInput.value, selectedDurationUnit);
  if (!durationMinutes) {
    toast('Укажите длительность от 5 минут до 24 часов: например, 1,5');
    durationInput.focus();
    return;
  }

  const type = template
    ? template.type
    : (ACTIVITY_TYPES[selectedActivityType] ? selectedActivityType : 'other');
  const title = template ? template.name : null;
  const note = template ? null : normalizeOptionalNote($('#activity-note').value);
  const saveAsTemplate = !template && $('#activity-save-template').checked;
  const templateName = saveAsTemplate ? normalizeActivityName($('#activity-template-name').value) : null;
  if (saveAsTemplate && !templateName) {
    toast('Введите название готового варианта или выключите сохранение шаблона');
    $('#activity-template-name').focus();
    return;
  }
  state.workouts.unshift({
    id: uid(),
    date: todayKey(),
    type,
    title,
    note,
    intensity: template ? 'medium' : selectedActivityIntensity,
    durationMinutes,
    createdAt: Date.now()
  });
  if (saveAsTemplate) {
    state.activityTemplates.unshift({
      id: uid(), name: templateName, type, durationMinutes, createdAt: Date.now()
    });
    normalizeActivityTemplates();
  }
  saveState();
  if (!template) {
    durationInput.value = '';
    selectedDurationUnit = 'minutes';
    renderDurationUnit();
    $('#activity-note').value = '';
    $('#activity-save-template').checked = false;
    $('#activity-template-name').value = '';
    $('#activity-template-inline').classList.remove('is-open');
  }
  renderTraining();

  const reminderUpdated = await syncTrainingReminderForToday();
  const reminderText = state.reminders.enabled
    ? (reminderUpdated ? ' Напоминание на сегодня отменено.' : ' Не удалось обновить напоминание.')
    : '';
  const label = title || ACTIVITY_TYPES[type].label;
  toast(`${label}: ${formatWorkoutDuration(durationMinutes)} добавлено.${reminderText}`);
}

function saveCurrentAsActivityTemplate() {
  const nameInput = $('#activity-template-name');
  const durationInput = $('#workout-duration');
  const name = normalizeActivityName(nameInput.value);
  const durationMinutes = parseWorkoutDuration(durationInput.value, selectedDurationUnit);
  if (!name) {
    toast('Введите название готового варианта: от 2 до 60 символов');
    nameInput.focus();
    return;
  }
  if (!durationMinutes) {
    toast('Сначала укажите длительность: например, 0,5 или 1,5');
    durationInput.focus();
    return;
  }

  const type = ACTIVITY_TYPES[selectedActivityType] ? selectedActivityType : 'other';
  state.activityTemplates.unshift({
    id: uid(),
    name,
    type,
    durationMinutes,
    createdAt: Date.now()
  });
  saveState();
  nameInput.value = '';
  renderActivityTemplates();
  toast(`Готовый вариант «${name}» сохранён`);
}

function changeWeeklyActivityGoal(delta) {
  const next = Math.min(1440, Math.max(30, state.activitySettings.weeklyGoalMinutes + delta));
  if (next === state.activitySettings.weeklyGoalMinutes) return;
  state.activitySettings.weeklyGoalMinutes = next;
  saveState();
  renderTraining();
}

async function removeWorkout(id) {
  const workout = state.workouts.find((item) => item.id === id);
  if (!workout) return;
  state.workouts = state.workouts.filter((item) => item.id !== id);
  saveState();
  renderTraining();

  const reminderUpdated = await syncTrainingReminderForToday();
  const reminderText = state.reminders.enabled && !hasWorkoutToday()
    ? (reminderUpdated ? ' Напоминание снова активно.' : ' Не удалось обновить напоминание.')
    : '';
  toast(`Активность удалена.${reminderText}`);
}

function removeActivityTemplate(id) {
  const template = state.activityTemplates.find((item) => item.id === id);
  if (!template) return;
  state.activityTemplates = state.activityTemplates.filter((item) => item.id !== id);
  saveState();
  renderActivityTemplates();
  toast(`Готовый вариант «${template.name}» удалён`);
}

/* ============================================================
   Вечернее напоминание об активности (Capacitor Local Notifications)
   ============================================================ */
const LEGACY_TRAINING_REMINDER_ID = 71001;
const TRAINING_REMINDER_BASE_ID = 76000;
const TRAINING_REMINDER_SCHEDULE_DAYS = 14;
const ACTIVITY_TEST_NOTIFICATION_ID = 71002;
const ACTIVITY_REMINDER_TEST_ID = 71003;
const MEAL_REMINDER_TEST_ID = 74001;
const LEGACY_MEAL_REMINDER_NOTIFICATION_BASE_ID = 73000;
const MEAL_REMINDER_NOTIFICATION_BASE_ID = 73200;
const MEAL_REMINDER_SCHEDULE_DAYS = 14;
const MEAL_REMINDER_CHANNEL = 'fitflow_meal_reminders_v3';
const MORNING_MOTIVATION_NOTIFICATION_BASE_ID = 71100;
const MORNING_MOTIVATION_SCHEDULE_DAYS = 30;
const TRAINING_REMINDER_CHANNEL = 'fitflow_training_reminders';
const MORNING_MOTIVATION_CHANNEL = 'fitflow_morning_motivation';
let activityNotificationListenerInstalled = false;

const VENDOR_NOTIFICATION_HINTS = {
  xiaomi: {
    title: 'Автозапуск',
    note: 'Xiaomi / Redmi / POCO: в открывшемся списке «Автозапуск» найдите FitFlow и включите переключатель. Затем: значок приложения → «О приложении» → «Экономия батареи» → «Без ограничений».'
  },
  redmi: {
    title: 'Автозапуск',
    note: 'Xiaomi / Redmi / POCO: в открывшемся списке «Автозапуск» найдите FitFlow и включите переключатель. Затем: значок приложения → «О приложении» → «Экономия батареи» → «Без ограничений».'
  },
  poco: {
    title: 'Автозапуск',
    note: 'Xiaomi / Redmi / POCO: в открывшемся списке «Автозапуск» найдите FitFlow и включите переключатель. Затем: значок приложения → «О приложении» → «Экономия батареи» → «Без ограничений».'
  },
  huawei: {
    title: 'Запуск приложений',
    note: 'Huawei / Honor: откройте «Запуск приложений», найдите FitFlow, выключите «Автоматически» и включите вручную автозапуск, косвенный запуск и работу в фоне.'
  },
  honor: {
    title: 'Запуск приложений',
    note: 'Huawei / Honor: откройте «Запуск приложений», найдите FitFlow, выключите «Автоматически» и включите вручную автозапуск, косвенный запуск и работу в фоне.'
  },
  oppo: {
    title: 'Автозапуск',
    note: 'OPPO / realme: включите «Автозапуск» для FitFlow, а в настройках экономии энергии выберите «Не ограничивать фоновую работу».'
  },
  realme: {
    title: 'Автозапуск',
    note: 'OPPO / realme: включите «Автозапуск» для FitFlow, а в настройках экономии энергии выберите «Не ограничивать фоновую работу».'
  },
  vivo: {
    title: 'Фоновый запуск',
    note: 'vivo / iQOO: разрешите FitFlow фоновый запуск с высоким потреблением и добавьте приложение в белый список энергопотребления.'
  },
  iqoo: {
    title: 'Фоновый запуск',
    note: 'vivo / iQOO: разрешите FitFlow фоновый запуск с высоким потреблением и добавьте приложение в белый список энергопотребления.'
  },
  samsung: {
    title: 'Работа в фоне',
    note: 'Samsung: откройте «Обслуживание устройства» → «Батарея» → «Ограничения в фоновом режиме» и не добавляйте FitFlow в приложения в режиме сна.'
  },
  meizu: {
    title: 'Автозапуск',
    note: 'Meizu: разрешите автозапуск и фоновую работу для FitFlow в настройках безопасности.'
  },
  asus: {
    title: 'Автозапуск',
    note: 'ASUS: включите FitFlow в «Диспетчере автозапуска».'
  }
};

const DEFAULT_VENDOR_NOTIFICATION_HINT = {
  title: 'Автозапуск и работа в фоне',
  note: 'Откроются настройки приложения. Найдите пункты про батарею, автозапуск или фоновую работу и снимите ограничения для FitFlow. На «чистом» Android обычно достаточно первых двух шагов.'
};

function getLocalNotifications() {
  if (typeof window === 'undefined' || !window.Capacitor || !window.Capacitor.Plugins) return null;
  return window.Capacitor.Plugins.LocalNotifications || null;
}

function getNativeSettingsBridge() {
  if (typeof window === 'undefined') return null;
  const bridge = window.FitFlowExport || window.AquaExport;
  return bridge && typeof bridge.openSettingsScreen === 'function' ? bridge : null;
}

function reminderTimeText(time) {
  return isValidReminderTime(time) ? time : DEFAULTS.reminders.time;
}

function canScheduleReminderToday(time, hasDataForToday, now = new Date()) {
  if (hasDataForToday || !isValidReminderTime(time)) return false;
  const [hours, minutes] = time.split(':').map(Number);
  const scheduled = new Date(now.getTime());
  scheduled.setHours(hours, minutes, 0, 0);
  return scheduled > now;
}

function nextReminderDate(time, skipToday = false) {
  const [hours, minutes] = reminderTimeText(time).split(':').map(Number);
  const next = new Date();
  next.setHours(hours, minutes, 0, 0);
  if (skipToday || next <= new Date()) next.setDate(next.getDate() + 1);
  return next;
}

function getVendorNotificationHint() {
  const bridge = getNativeSettingsBridge();
  let manufacturer = '';
  try {
    if (bridge && typeof bridge.getManufacturer === 'function') {
      manufacturer = String(bridge.getManufacturer() || '').toLowerCase();
    }
  } catch (e) {
    console.warn('Не удалось определить производителя телефона:', e);
  }

  for (const name of Object.keys(VENDOR_NOTIFICATION_HINTS)) {
    if (manufacturer.includes(name)) return VENDOR_NOTIFICATION_HINTS[name];
  }
  return DEFAULT_VENDOR_NOTIFICATION_HINT;
}

function renderReminderSettings() {
  if (typeof document === 'undefined') return;
  const toggle = $('#workout-reminder-toggle');
  const timeInput = $('#workout-reminder-time');
  const status = $('#workout-reminder-status');
  if (!toggle || !timeInput || !status) return;

  toggle.checked = state.reminders.enabled;
  timeInput.value = reminderTimeText(state.reminders.time);
  status.textContent = state.reminders.enabled
    ? `Каждый день в ${reminderTimeText(state.reminders.time)}. Напоминание сохранено на телефоне.`
    : 'Напоминание выключено.';
}

function renderMealRemindersSettings() {
  if (typeof document === 'undefined') return;
  const toggle = $('#meal-reminders-toggle');
  const list = $('#meal-reminders-list');
  const status = $('#meal-reminders-status');
  if (!toggle || !list || !status) return;
  const reminders = state.mealReminders;
  toggle.checked = reminders.enabled;
  list.innerHTML = reminders.meals.map((meal) => `
    <div class="meal-reminder-row">
      <input type="checkbox" data-meal-enabled="${meal.id}" ${meal.enabled ? 'checked' : ''} aria-label="Напоминать: ${meal.label}">
      <label>${meal.label}</label>
      <input type="time" data-meal-time="${meal.id}" value="${meal.time}" aria-label="Время: ${meal.label}">
    </div>`).join('');
  const enabledCount = reminders.meals.filter((meal) => meal.enabled).length;
  status.textContent = reminders.enabled
    ? `Включено приёмов пищи: ${enabledCount} из ${reminders.meals.length}.`
    : 'Напоминания о питании выключены.';
}

function renderMorningMotivationSettings() {
  if (typeof document === 'undefined') return;
  const toggle = $('#morning-motivation-toggle');
  const timeInput = $('#morning-motivation-time');
  const themeLabel = $('#morning-motivation-theme-label');
  const status = $('#morning-motivation-status');
  if (!toggle || !timeInput || !themeLabel || !status) return;

  const motivation = state.morningMotivation;
  toggle.checked = motivation.enabled;
  timeInput.value = motivation.time;
  themeLabel.textContent = MORNING_MOTIVATION_THEMES[motivation.theme];
  $$('#morning-theme-choices button').forEach((button) =>
    button.classList.toggle('active', button.dataset.morningTheme === motivation.theme));
  status.textContent = motivation.enabled
    ? `Каждое утро в ${motivation.time} · тема: ${MORNING_MOTIVATION_THEMES[motivation.theme]}.`
    : 'Утренние фразы выключены.';
}

async function ensureNotificationPermission(localNotifications) {
  try {
    let permission = await localNotifications.checkPermissions();
    if (permission.display !== 'granted') {
      permission = await localNotifications.requestPermissions();
    }
    return permission.display === 'granted';
  } catch (e) {
    console.warn('Не удалось запросить разрешение на уведомления:', e);
    return false;
  }
}

async function ensureTrainingReminderChannel(localNotifications) {
  if (typeof localNotifications.createChannel !== 'function') return;
  await localNotifications.createChannel({
    id: TRAINING_REMINDER_CHANNEL,
    name: 'FitFlow: активность',
    description: 'Вечерние напоминания о прогулках, спорте и активном отдыхе',
    importance: 5,
    visibility: 1,
    sound: 'default',
    vibrates: true
  });
}

function activityReminderId(dateKey) {
  let hash = 2166136261;
  for (let i = 0; i < dateKey.length; i++) { hash ^= dateKey.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return TRAINING_REMINDER_BASE_ID + ((hash >>> 0) % 900000);
}

function activityReminderIds() {
  const ids = [LEGACY_TRAINING_REMINDER_ID];
  const base = new Date(); base.setHours(0, 0, 0, 0);
  for (let offset = 0; offset <= TRAINING_REMINDER_SCHEDULE_DAYS; offset++) {
    const day = new Date(base.getTime()); day.setDate(day.getDate() + offset);
    const date = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
    ids.push(activityReminderId(date));
  }
  return ids;
}

async function removeDeliveredTrainingReminder(localNotifications = getLocalNotifications(), id = null) {
  if (!localNotifications || typeof localNotifications.removeDeliveredNotifications !== 'function') return false;
  try {
    await localNotifications.removeDeliveredNotifications({ notifications: [{ id: id || LEGACY_TRAINING_REMINDER_ID }] });
    return true;
  } catch (e) { return false; }
}

async function cancelTrainingReminder(localNotifications = getLocalNotifications()) {
  if (!localNotifications) return false;
  try {
    await localNotifications.cancel({ notifications: activityReminderIds().map((id) => ({ id })) });
    return true;
  } catch (e) { return false; }
}

async function scheduleTrainingReminder({ skipToday = false, clearDelivered = false, requestPermission = true } = {}) {
  const localNotifications = getLocalNotifications();
  if (!localNotifications) return { ok: false, message: 'Напоминания работают в Android-приложении, а не в браузере.' };
  let allowed = false;
  if (requestPermission) allowed = await ensureNotificationPermission(localNotifications);
  else { try { allowed = (await localNotifications.checkPermissions()).display === 'granted'; } catch (e) { } }
  if (!allowed) return { ok: false, message: 'Разрешите уведомления Android, чтобы включить напоминание.' };
  try {
    await ensureTrainingReminderChannel(localNotifications);
    await cancelTrainingReminder(localNotifications);
    const firstAt = nextReminderDate(state.reminders.time, skipToday);
    const notifications = [];
    for (let dayIndex = 0; dayIndex < TRAINING_REMINDER_SCHEDULE_DAYS; dayIndex++) {
      const at = new Date(firstAt.getTime()); at.setDate(at.getDate() + dayIndex);
      const date = `${at.getFullYear()}-${String(at.getMonth()+1).padStart(2,'0')}-${String(at.getDate()).padStart(2,'0')}`;
      if (hasWorkoutToday() && date === todayKey()) continue;
      notifications.push({
        id: activityReminderId(date),
        title: 'Была сегодня активность?',
        body: 'Откройте FitFlow, чтобы отметить прогулку, спорт или активный отдых.',
        schedule: { at, allowWhileIdle: true },
        channelId: TRAINING_REMINDER_CHANNEL,
        smallIcon: 'ic_stat_icon', iconColor: '#00696B', autoCancel: true,
        extra: { source: 'fitflow-training-reminder' }
      });
    }
    if (notifications.length) await localNotifications.schedule({ notifications });
    if (clearDelivered) await removeDeliveredTrainingReminder(localNotifications);
    return { ok: true };
  } catch (e) {
    console.warn('Не удалось запланировать вечернее напоминание:', e);
    return { ok: false, message: 'Не удалось запланировать напоминание. Откройте «Настроить уведомления» и проверьте разрешения.' };
  }
}

async function refreshTrainingReminderOnLaunch() {
  if (!state.reminders.enabled || !getLocalNotifications()) return;
  await scheduleTrainingReminder({ skipToday: hasWorkoutToday(), requestPermission: false });
}

function openMorningThemeDialog() {
  const dialog = $('#morning-theme-dialog');
  if (dialog) dialog.hidden = false;
  renderMorningMotivationSettings();
}

function closeMorningThemeDialog() {
  const dialog = $('#morning-theme-dialog');
  if (dialog) dialog.hidden = true;
}

function showMorningMessageDialog(message) {
  const dialog = $('#morning-message-dialog');
  const text = $('#morning-message-dialog-text');
  if (!dialog || !text) return;
  text.textContent = message || 'Пусть сегодняшний день будет добрым к вам.';
  dialog.hidden = false;
}

function closeMorningMessageDialog() {
  const dialog = $('#morning-message-dialog');
  if (dialog) dialog.hidden = true;
}

function installActivityNotificationListener() {
  const localNotifications = getLocalNotifications();
  if (activityNotificationListenerInstalled || !localNotifications
      || typeof localNotifications.addListener !== 'function') return;

  try {
    localNotifications.addListener('localNotificationActionPerformed', async (event) => {
      const notification = event && event.notification;
      if (!notification) return;
      const extra = notification.extra || {};
      if (extra.source === 'fitflow-training-reminder') {
        await removeDeliveredTrainingReminder(localNotifications, notification.id);
        switchView('training');
        toast('Была сегодня активность? Выберите вид и добавьте запись.');
        return;
      }
      if (extra.source === 'fitflow-meal-reminder') {
        switchView('home');
        selectedMealTypeId = extra.mealId || '';
        renderMealTypePicker();
        setTimeout(() => $('#food-input').focus(), 250);
        toast(`Запишите ${extra.mealLabel || 'приём пищи'} в дневник`);
        return;
      }
      if (notification.id >= MORNING_MOTIVATION_NOTIFICATION_BASE_ID
          && notification.id < MORNING_MOTIVATION_NOTIFICATION_BASE_ID + MORNING_MOTIVATION_SCHEDULE_DAYS) {
        const extra = notification.extra || {};
        showMorningMessageDialog(extra.message || notification.largeBody || notification.body);
      }
    });
    activityNotificationListenerInstalled = true;
  } catch (e) {
    console.warn('Не удалось подключить обработчик вечернего вопроса:', e);
  }
}

async function ensureMealReminderChannel(localNotifications) {
  if (typeof localNotifications.createChannel !== 'function') return;
  await localNotifications.createChannel({
    id: MEAL_REMINDER_CHANNEL,
    name: 'FitFlow: приёмы пищи',
    description: 'Напоминания записать завтрак, обед и другие приёмы пищи',
    importance: 4,
    visibility: 1,
    sound: 'default',
    vibrates: true
  });
}

function mealNotificationId(mealId, dateKey) {
  const text = `${mealId}|${dateKey}`;
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return 900000000 + ((hash >>> 0) % 900000000);
}

function mealReminderNotificationIds() {
  const legacy = Array.from({ length: MEAL_REMINDER_TYPES.length * MEAL_REMINDER_SCHEDULE_DAYS }, (_, index) => MEAL_REMINDER_NOTIFICATION_BASE_ID + index);
  const ids = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let offset = 0; offset <= MEAL_REMINDER_SCHEDULE_DAYS; offset++) {
    const day = new Date(base.getTime());
    day.setDate(day.getDate() + offset);
    const pad = (value) => String(value).padStart(2, '0');
    const date = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
    getMealTypes().forEach((meal) => ids.push(mealNotificationId(meal.id, date)));
  }
  return [...legacy, ...ids];
}

function hasMealTypeOnDate(mealId, date = todayKey()) {
  return state.food.items.some((item) => item.mealTypeId === mealId && state.food.date === date);
}

async function cancelMealReminders(localNotifications = getLocalNotifications()) {
  if (!localNotifications) return;
  try { await localNotifications.cancel({ notifications: mealReminderNotificationIds().map((id) => ({ id })) }); } catch (e) { }
}

async function scheduleMealReminders({ requestPermission = true } = {}) {
  const localNotifications = getLocalNotifications();
  if (!localNotifications) return { ok: false, message: 'Напоминания о питании работают только в Android-приложении.' };
  let allowed = false;
  if (requestPermission) allowed = await ensureNotificationPermission(localNotifications);
  else { try { allowed = (await localNotifications.checkPermissions()).display === 'granted'; } catch (e) { } }
  if (!allowed) return { ok: false, message: 'Разрешите уведомления Android, чтобы включить напоминания о питании.' };
  try {
    await ensureMealReminderChannel(localNotifications);
    await cancelMealReminders(localNotifications);
    const notifications = [];
    state.mealReminders.meals.filter((meal) => meal.enabled).forEach((meal) => {
      const firstAt = nextReminderDate(meal.time);
      for (let dayIndex = 0; dayIndex < MEAL_REMINDER_SCHEDULE_DAYS; dayIndex++) {
        const at = new Date(firstAt.getTime());
        at.setDate(at.getDate() + dayIndex);
        const pad = (value) => String(value).padStart(2, '0');
        const date = `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`;
        if (hasMealTypeOnDate(meal.id, date)) continue;
        notifications.push({
          id: mealNotificationId(meal.id, date),
          title: `Пора записать: ${meal.label} · ${meal.time}`,
          body: `Не забудьте добавить ваш ${meal.label.toLowerCase()} в FitFlow.`,
          schedule: { at, allowWhileIdle: true },
          channelId: MEAL_REMINDER_CHANNEL,
          smallIcon: 'ic_stat_icon', iconColor: '#FF9E3D', autoCancel: true,
          extra: { source: 'fitflow-meal-reminder', mealId: meal.id, mealLabel: meal.label }
        });
      }
    });
    if (notifications.length) await localNotifications.schedule({ notifications });
    return { ok: true };
  } catch (e) {
    console.warn('Не удалось запланировать напоминания о питании:', e);
    return { ok: false, message: 'Не удалось включить напоминания о питании. Проверьте разрешения Android.' };
  }
}

async function syncMealRemindersForToday() {
  if (!state.mealReminders.enabled) return;
  await scheduleMealReminders();
}

async function refreshMealRemindersOnLaunch() {
  if (!state.mealReminders.enabled || !getLocalNotifications()) return;
  await scheduleMealReminders({ requestPermission: false });
}

async function updateMealRemindersEnabled(enabled) {
  state.mealReminders.enabled = enabled;
  saveState();
  renderMealRemindersSettings();
  if (!enabled) { await cancelMealReminders(); toast('Напоминания о питании выключены'); return; }
  const result = await scheduleMealReminders();
  if (!result.ok) { state.mealReminders.enabled = false; saveState(); renderMealRemindersSettings(); toast(result.message); return; }
  toast('Напоминания о питании включены');
}

async function updateMealReminder(id, changes) {
  const meal = state.mealReminders.meals.find((item) => item.id === id);
  if (!meal) return;
  Object.assign(meal, changes);
  if (!isValidReminderTime(meal.time)) { renderMealRemindersSettings(); toast('Укажите время в формате ЧЧ:ММ'); return; }
  saveState();
  renderMealRemindersSettings();
  if (!state.mealReminders.enabled) return;
  const result = await scheduleMealReminders();
  if (!result.ok) toast(result.message);
}

async function setAllMealReminders(enabled) {
  state.mealReminders.meals.forEach((meal) => { meal.enabled = enabled; });
  saveState();
  renderMealRemindersSettings();
  if (state.mealReminders.enabled) await scheduleMealReminders();
}

async function ensureMorningMotivationChannel(localNotifications) {
  if (typeof localNotifications.createChannel !== 'function') return;
  await localNotifications.createChannel({
    id: MORNING_MOTIVATION_CHANNEL,
    name: 'FitFlow: утренняя мотивация',
    description: 'Короткие мотивирующие фразы в начале дня',
    importance: 3,
    visibility: 1,
    sound: 'default',
    vibrates: false
  });
}

function getMorningMotivationNotificationIds() {
  return Array.from(
    { length: MORNING_MOTIVATION_SCHEDULE_DAYS },
    (_, index) => MORNING_MOTIVATION_NOTIFICATION_BASE_ID + index
  );
}

function daySequenceIndex(date) {
  const localMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor(localMidnight.getTime() / 86400000);
}

function morningScheduleStart(time) {
  return nextReminderDate(time);
}

async function cancelMorningMotivation(localNotifications = getLocalNotifications()) {
  if (!localNotifications) return;
  try {
    await localNotifications.cancel({
      notifications: getMorningMotivationNotificationIds().map((id) => ({ id }))
    });
  } catch (e) {
    // Часть фраз может уже прийти или ещё не быть запланирована.
  }
}

async function scheduleMorningMotivation({ requestPermission = true } = {}) {
  const localNotifications = getLocalNotifications();
  if (!localNotifications) {
    return { ok: false, message: 'Утренняя мотивация работает только в Android-приложении.' };
  }

  let allowed = false;
  if (requestPermission) {
    allowed = await ensureNotificationPermission(localNotifications);
  } else {
    try {
      const permission = await localNotifications.checkPermissions();
      allowed = permission.display === 'granted';
    } catch (e) {
      allowed = false;
    }
  }
  if (!allowed) return { ok: false, message: 'Разрешите уведомления Android, чтобы включить утренние фразы.' };

  try {
    await ensureMorningMotivationChannel(localNotifications);
    await cancelMorningMotivation(localNotifications);
    const motivation = state.morningMotivation;
    const firstAt = morningScheduleStart(motivation.time);
    const notifications = Array.from({ length: MORNING_MOTIVATION_SCHEDULE_DAYS }, (_, index) => {
      const at = new Date(firstAt.getTime());
      at.setDate(at.getDate() + index);
      const message = getMorningMotivationMessage(motivation.theme, daySequenceIndex(at));
      return {
        id: MORNING_MOTIVATION_NOTIFICATION_BASE_ID + index,
        title: 'Доброе утро ☀️',
        body: message,
        largeBody: message,
        summaryText: 'FitFlow · утренняя мотивация',
        schedule: { at, allowWhileIdle: true },
        channelId: MORNING_MOTIVATION_CHANNEL,
        smallIcon: 'ic_stat_icon',
        iconColor: '#00696B',
        autoCancel: true,
        extra: { source: 'fitflow-morning-motivation', message }
      };
    });
    motivation.message = notifications[0].body;
    saveState();
    await localNotifications.schedule({ notifications });
    return { ok: true };
  } catch (e) {
    console.warn('Не удалось запланировать утреннюю мотивацию:', e);
    return { ok: false, message: 'Не удалось включить утренние фразы. Проверьте разрешения Android.' };
  }
}

async function refreshMorningMotivationScheduleOnLaunch() {
  if (!state.morningMotivation.enabled || !getLocalNotifications()) return;
  // При обычном открытии приложения не показываем повторный системный запрос.
  // Если разрешение уже есть, обновляем окно из 30 будущих фраз.
  await scheduleMorningMotivation({ requestPermission: false });
}

async function updateMorningMotivationEnabled(enabled) {
  state.morningMotivation.enabled = enabled;
  saveState();
  renderMorningMotivationSettings();

  if (!enabled) {
    await cancelMorningMotivation();
    toast('Утренние фразы выключены');
    return;
  }

  const result = await scheduleMorningMotivation();
  if (!result.ok) {
    state.morningMotivation.enabled = false;
    saveState();
    renderMorningMotivationSettings();
    toast(result.message);
    return;
  }
  toast(`Утренняя фраза включена: каждый день в ${state.morningMotivation.time}`);
}

async function updateMorningMotivationTime(time) {
  if (!isValidReminderTime(time)) {
    renderMorningMotivationSettings();
    toast('Укажите время в формате ЧЧ:ММ');
    return;
  }
  state.morningMotivation.time = time;
  saveState();
  renderMorningMotivationSettings();
  if (!state.morningMotivation.enabled) {
    toast(`Время утренней фразы: ${time}`);
    return;
  }
  const result = await scheduleMorningMotivation();
  toast(result.ok ? `Утренняя фраза перенесена на ${time}` : result.message);
}

async function updateMorningMotivationTheme(theme) {
  if (!MORNING_MOTIVATION_THEMES[theme]) return;
  state.morningMotivation.theme = theme;
  saveState();
  renderMorningMotivationSettings();
  if (!state.morningMotivation.enabled) {
    toast(`Тема утренних фраз: ${MORNING_MOTIVATION_THEMES[theme]}`);
    return;
  }
  const result = await scheduleMorningMotivation();
  toast(result.ok ? 'Тема утренних фраз обновлена' : result.message);
}

async function cancelTestActivityNotification(localNotifications = getLocalNotifications()) {
  if (!localNotifications) return;
  try {
    await localNotifications.cancel({ notifications: [{ id: ACTIVITY_TEST_NOTIFICATION_ID }] });
  } catch (e) {
    // Тест может ещё не быть запланирован — это нормально.
  }
}

async function sendTestActivityNotification() {
  const localNotifications = getLocalNotifications();
  if (!localNotifications) {
    toast('Тест уведомления доступен только в Android-приложении');
    return;
  }

  const allowed = await ensureNotificationPermission(localNotifications);
  if (!allowed) {
    toast('Разрешите уведомления Android, затем повторите тест');
    return;
  }

  try {
    await ensureTrainingReminderChannel(localNotifications);
    await cancelTestActivityNotification(localNotifications);
    await localNotifications.schedule({
      notifications: [{
        id: ACTIVITY_TEST_NOTIFICATION_ID,
        title: 'Тест уведомлений FitFlow',
        body: 'Если это сообщение пришло — уведомления настроены правильно ✓',
        schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true },
        channelId: TRAINING_REMINDER_CHANNEL,
        smallIcon: 'ic_stat_icon',
        iconColor: '#00696B',
        autoCancel: true,
        extra: { source: 'fitflow-activity-test' }
      }]
    });
    toast('Тестовое уведомление придёт примерно через 5 секунд');
  } catch (e) {
    console.warn('Не удалось отправить тестовое уведомление:', e);
    toast('Не удалось отправить тест. Проверьте разрешения Android.');
  }
}

async function sendSpecificReminderTest(kind) {
  const localNotifications = getLocalNotifications();
  if (!localNotifications) { toast('Тест доступен только в Android-приложении'); return; }
  const allowed = await ensureNotificationPermission(localNotifications);
  if (!allowed) { toast('Разрешите уведомления Android, затем повторите тест'); return; }
  const isMeal = kind === 'meal';
  const id = isMeal ? MEAL_REMINDER_TEST_ID : ACTIVITY_REMINDER_TEST_ID;
  const channel = isMeal ? MEAL_REMINDER_CHANNEL : TRAINING_REMINDER_CHANNEL;
  try {
    if (isMeal) await ensureMealReminderChannel(localNotifications); else await ensureTrainingReminderChannel(localNotifications);
    await localNotifications.cancel({ notifications: [{ id }] });
    await localNotifications.schedule({ notifications: [{
      id,
      title: isMeal ? 'Тест: приём пищи' : 'Тест: вечерняя активность',
      body: isMeal ? 'Канал питания работает правильно ✓' : 'Канал вечерней активности работает правильно ✓',
      schedule: { at: new Date(Date.now() + 5000), allowWhileIdle: true },
      channelId: channel, smallIcon: 'ic_stat_icon', iconColor: isMeal ? '#FF9E3D' : '#00696B', autoCancel: true,
      extra: { source: isMeal ? 'fitflow-meal-test' : 'fitflow-activity-test' }
    }] });
    toast('Тестовое уведомление придёт примерно через 5 секунд');
  } catch (e) {
    console.warn('Не удалось отправить тест уведомления:', e);
    toast('Не удалось отправить тест. Проверьте разрешения Android.');
  }
}

async function updateTrainingReminderEnabled(enabled) {
  state.reminders.enabled = enabled;
  saveState();
  renderReminderSettings();

  if (!enabled) {
    await cancelTrainingReminder();
    toast('Вечернее напоминание выключено');
    return;
  }

  const result = await scheduleTrainingReminder({ skipToday: hasWorkoutToday() }); // ручное время на будущее сегодня создаёт новый вопрос, если активности нет
  if (!result.ok) {
    state.reminders.enabled = false;
    saveState();
    renderReminderSettings();
    toast(result.message);
    return;
  }

  toast(`Напоминание включено: каждый день в ${reminderTimeText(state.reminders.time)}`);
}

async function updateTrainingReminderTime(time) {
  if (!isValidReminderTime(time)) {
    renderReminderSettings();
    toast('Укажите время в формате ЧЧ:ММ');
    return;
  }

  state.reminders.time = time;
  saveState();
  renderReminderSettings();

  if (!state.reminders.enabled) {
    toast(`Время напоминания: ${time}`);
    return;
  }

  const result = await scheduleTrainingReminder({ skipToday: hasWorkoutToday() });
  toast(result.ok
    ? `Напоминание перенесено на ${time}`
    : result.message);
}

function refreshNotificationSetupState() {
  if (typeof document === 'undefined') return { notifications: false, battery: false };
  const bridge = getNativeSettingsBridge();
  let notifications = false;
  let battery = false;

  try {
    if (bridge && typeof bridge.areNotificationsEnabled === 'function') {
      notifications = Boolean(bridge.areNotificationsEnabled());
    }
  } catch (e) {
    console.warn('Не удалось проверить разрешение на уведомления:', e);
  }
  try {
    if (bridge && typeof bridge.isBatteryOptimizationIgnored === 'function') {
      battery = Boolean(bridge.isBatteryOptimizationIgnored());
    }
  } catch (e) {
    console.warn('Не удалось проверить оптимизацию батареи:', e);
  }

  const mark = (okSelector, badSelector, granted) => {
    const ok = $(okSelector);
    const bad = $(badSelector);
    if (ok) ok.hidden = !granted;
    // В браузере статус неизвестен: не показываем ошибку, которой там нет.
    if (bad) bad.hidden = granted || !bridge;
  };

  mark('#setup-notifications-ok', '#setup-notifications-bad', notifications);
  mark('#setup-battery-ok', '#setup-battery-bad', battery);

  const hint = getVendorNotificationHint();
  const title = $('#setup-autostart-title');
  const note = $('#setup-autostart-hint');
  const vendorNote = $('#setup-vendor-note');
  if (title) title.textContent = hint.title;
  if (note) note.textContent = 'Разрешает приложению запускаться после перезагрузки телефона и работать в фоне.';
  if (vendorNote) vendorNote.textContent = hint.note;

  return { notifications, battery };
}

function hasAcceptedTerms() {
  try { return localStorage.getItem(TERMS_ACCEPTED_KEY) === '1'; } catch (e) { return false; }
}

function maybeShowTerms() {
  if (hasAcceptedTerms()) return;
  const dialog = $('#terms-dialog');
  if (dialog) dialog.hidden = false;
}

function acceptTerms() {
  try { localStorage.setItem(TERMS_ACCEPTED_KEY, '1'); } catch (e) { console.warn('Не удалось сохранить принятие условий:', e); }
  const dialog = $('#terms-dialog');
  if (dialog) dialog.hidden = true;
}

function declineTerms() {
  const terms = $('#terms-dialog');
  const blocked = $('#terms-blocked-dialog');
  if (terms) terms.hidden = true;
  if (blocked) blocked.hidden = false;
}

function closeApplicationAfterTermsDecline() {
  try {
    if (window.FitFlowExport && typeof window.FitFlowExport.closeApp === 'function') {
      window.FitFlowExport.closeApp();
      return;
    }
  } catch (e) {
    console.warn('Не удалось закрыть приложение:', e);
  }
  // В браузере окно нельзя гарантированно закрыть; условия останутся при следующем запуске.
  try { window.close(); } catch (e) { }
}

function openSourcesDialog() {
  const dialog = $('#sources-dialog');
  if (dialog) dialog.hidden = false;
}

function closeSourcesDialog() {
  const dialog = $('#sources-dialog');
  if (dialog) dialog.hidden = true;
}

function openPrivacyDialog() {
  const dialog = $('#privacy-dialog');
  if (dialog) dialog.hidden = false;
}

function closePrivacyDialog() {
  const dialog = $('#privacy-dialog');
  if (dialog) dialog.hidden = true;
}

function hasSeenActivityReminderPrompt() {
  try {
    return localStorage.getItem(ACTIVITY_REMINDER_PROMPT_KEY) === '1';
  } catch (e) {
    return false;
  }
}

function markActivityReminderPromptSeen() {
  try {
    localStorage.setItem(ACTIVITY_REMINDER_PROMPT_KEY, '1');
  } catch (e) {
    console.warn('Не удалось сохранить выбор напоминания:', e);
  }
}

function closeActivityReminderPrompt() {
  const dialog = $('#activity-reminder-dialog');
  if (dialog) dialog.hidden = true;
}

function maybeShowActivityReminderPrompt() {
  // В браузере не спрашиваем: системное уведомление доступно только в Android APK.
  if (state.reminders.enabled || hasSeenActivityReminderPrompt() || !getLocalNotifications()) return;

  setTimeout(() => {
    const dialog = $('#activity-reminder-dialog');
    const activityView = $('#training-view');
    if (!dialog || !activityView || activityView.hidden || state.reminders.enabled || hasSeenActivityReminderPrompt()) return;
    dialog.hidden = false;
  }, 250);
}

async function acceptActivityReminderPrompt() {
  markActivityReminderPromptSeen();
  closeActivityReminderPrompt();
  await updateTrainingReminderEnabled(true);
}

function declineActivityReminderPrompt() {
  markActivityReminderPromptSeen();
  closeActivityReminderPrompt();
  toast('Вечерние вопросы выключены. Их можно включить позже в Настройках.');
}

function openNativeNotificationSetting(which) {
  const bridge = getNativeSettingsBridge();
  if (!bridge) {
    toast('Эта настройка открывается только в Android-приложении');
    return;
  }

  const status = refreshNotificationSetupState();
  if (which === 'notifications' && status.notifications) {
    toast('Уведомления уже разрешены — открываем настройки Android');
  } else if (which === 'battery' && status.battery) {
    toast('Ограничения батареи уже сняты — открываем настройки Android');
  }

  try {
    bridge.openSettingsScreen(which);
  } catch (e) {
    console.warn('Не удалось открыть экран системных настроек:', e);
    toast('Не удалось открыть настройки Android. Откройте их вручную.');
  }
}

/* ============================================================
   Экран Настройки: переключение, экспорт/импорт/сброс
   ============================================================ */
function setCollapsibleState(button, content, open) {
  button.setAttribute('aria-expanded', String(open));
  content.classList.toggle('is-open', open);
}

function updateActivityFab(isTraining) {
  const fab = $('#activity-fab');
  if (fab) fab.hidden = !isTraining;
}

function switchView(view) {
  const isHome = view === 'home';
  const isStats = view === 'stats';
  const isWaterDetails = view === 'water-details';
  const isFoodDetails = view === 'food-details';
  const isTraining = view === 'training';
  const isSettings = view === 'settings';
  const isNotifications = view === 'notifications';

  $('#home-view').hidden = !isHome;
  $('#stats-view').hidden = !isStats;
  $('#water-details-view').hidden = !isWaterDetails;
  $('#food-details-view').hidden = !isFoodDetails;
  $('#training-view').hidden = !isTraining;
  $('#settings-view').hidden = !isSettings;
  $('#notifications-view').hidden = !isNotifications;
  $$('.nav-item').forEach((b) =>
    b.classList.toggle('active', b.dataset.nav === (isNotifications ? 'settings' : ((isWaterDetails || isFoodDetails) ? 'stats' : view))));

  updateActivityFab(isTraining);
  if (isStats) renderStats();
  if (isWaterDetails) renderWaterDetails();
  if (isFoodDetails) renderFoodDetails();
  if (isTraining) {
    renderTraining();
    maybeShowActivityReminderPrompt();
  }
  if (isNotifications) refreshNotificationSetupState();
  window.scrollTo(0, 0);
}

function exportData() {
  const backup = {
    app: 'fitflow',
    version: 1,
    exportedAt: new Date().toISOString(),
    settings: { theme: getThemeMode() },
    profile: { id: profilesState.activeId, name: (profilesState.profiles.find((profile) => profile.id === profilesState.activeId) || {}).name || 'Мой профиль' },
    reminders: { enabled: state.reminders.enabled, time: state.reminders.time },
    mealReminders: { ...state.mealReminders, meals: state.mealReminders.meals.map((meal) => ({ ...meal })) },
    customMealTypes: state.customMealTypes,
    morningMotivation: { ...state.morningMotivation },
    favoriteMeals: state.favoriteMeals,
    dailyHistory: state.dailyHistory,
    activitySettings: { ...state.activitySettings },
    profileSettings: { ...state.profileSettings },
    homeLayout: { order: [...state.homeLayout.order], visible: { ...state.homeLayout.visible } },
    workouts: state.workouts,
    activityTemplates: state.activityTemplates,
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
  window.onVoiceInputResult = function (text) {
    if (!text) { toast('Речь не распознана. Попробуйте ещё раз.'); return; }
    openSmartEntry();
    $('#smart-entry-input').value = text;
    previewSmartEntry();
  };
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = async () => {
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

      if (Array.isArray(data.customMealTypes)) {
        state.customMealTypes = data.customMealTypes;
        normalizeCustomMealTypes();
      }

      if (data.mealReminders && typeof data.mealReminders === 'object') {
        state.mealReminders = { ...data.mealReminders };
        normalizeMealReminders();
      }

      // Утренняя мотивация появилась в версии 0.1.9. Старые копии
      // остаются совместимыми и не меняют текущую настройку.
      if (data.morningMotivation && typeof data.morningMotivation === 'object') {
        state.morningMotivation = { ...data.morningMotivation };
        normalizeMorningMotivation();
      }

      if (Array.isArray(data.dailyHistory)) {
        const dates = new Set(state.dailyHistory.map((day) => day.date));
        data.dailyHistory.forEach((day) => {
          if (day && !dates.has(day.date)) {
            state.dailyHistory.push(day);
            dates.add(day.date);
          }
        });
        normalizeDailyHistory();
      }

      if (Array.isArray(data.favoriteMeals)) {
        const existingIds = new Set(state.favoriteMeals.map((meal) => meal.id));
        data.favoriteMeals.forEach((meal) => {
          const normalized = normalizeFavoriteMeal(meal);
          if (normalized && !existingIds.has(normalized.id)) {
            state.favoriteMeals.push(normalized);
            existingIds.add(normalized.id);
          }
        });
        normalizeFavoriteMeals();
      }

      if (data.profileSettings && typeof data.profileSettings === 'object') {
        state.profileSettings = { ...data.profileSettings };
        normalizeProfileSettings();
      }

      if (data.homeLayout && typeof data.homeLayout === 'object') {
        state.homeLayout = normalizeHomeLayoutValue(data.homeLayout);
      }

      if (data.activitySettings && typeof data.activitySettings === 'object') {
        state.activitySettings = { ...data.activitySettings };
        normalizeActivitySettings();
      }

      // История тренировок сохраняется отдельно от дневных воды и еды.
      // Объединяем записи по id, чтобы одна и та же копия не создавала дубликаты.
      if (Array.isArray(data.workouts)) {
        const existingIds = new Set(state.workouts.map((workout) => workout.id));
        data.workouts.forEach((workout) => {
          const id = workout && workout.id != null ? String(workout.id) : '';
          if (workout && id && !existingIds.has(id)) {
            state.workouts.push(workout);
            existingIds.add(id);
          }
        });
        normalizeWorkouts();
      }

      // Готовые варианты активности объединяются по id, как и история.
      if (Array.isArray(data.activityTemplates)) {
        const existingIds = new Set(state.activityTemplates.map((template) => template.id));
        data.activityTemplates.forEach((template) => {
          const id = template && template.id != null ? String(template.id) : '';
          if (template && id && !existingIds.has(id)) {
            state.activityTemplates.push(template);
            existingIds.add(id);
          }
        });
        normalizeActivityTemplates();
      }

      // Напоминание появилось в версии 0.1.2. Старые копии без этого блока
      // остаются полностью совместимыми и просто не меняют текущую настройку.
      if (data.reminders && typeof data.reminders === 'object') {
        state.reminders = {
          enabled: data.reminders.enabled === true,
          time: data.reminders.time
        };
        normalizeReminderSettings();
      }

      saveState();
      renderAll();

      let reminderNotice = '';
      if (state.reminders.enabled && getLocalNotifications()) {
        const result = await scheduleTrainingReminder({ skipToday: hasWorkoutToday() });
        if (!result.ok) reminderNotice = ' Напоминание нужно включить заново.';
      }
      toast(`Данные импортированы ✓${reminderNotice}`);
    } catch (e) {
      console.warn('Не удалось импортировать резервную копию:', e);
      toast('Не удалось прочитать файл резервной копии');
    }
  };
  reader.readAsText(file);
}

function requestResetAll() { $('#reset-dialog').hidden = false; }
function closeResetDialog() { $('#reset-dialog').hidden = true; }

async function resetAll() {
  closeResetDialog();
  await cancelTrainingReminder();
  await cancelTestActivityNotification();
  await cancelMorningMotivation();
  await cancelMealReminders();
  localStorage.removeItem('fitflow:state');
  localStorage.removeItem('fitflow:theme');
  localStorage.removeItem(ACTIVITY_REMINDER_PROMPT_KEY);
  localStorage.removeItem(TERMS_ACCEPTED_KEY);
  profilesState.profiles.forEach((profile) => localStorage.removeItem(profileStateKey(profile.id)));
  localStorage.removeItem(PROFILES_KEY);
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
  const weekday = new Intl.DateTimeFormat('ru-RU', { weekday: 'long' }).format(now);
  const dayAndMonth = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(now);
  const dateLabel = $('#date-label');
  const weekdayElement = $('#date-weekday');
  const monthElement = $('#date-month');
  if (weekdayElement) weekdayElement.textContent = weekday;
  if (monthElement) monthElement.textContent = dayAndMonth;
  if (dateLabel) dateLabel.setAttribute('aria-label', `${weekday}, ${dayAndMonth}`);
}

/* ============================================================
   Инициализация
   ============================================================ */
function bindEvent(selector, eventName, handler) {
  const element = $(selector);
  if (!element) {
    console.warn(`Не найден элемент ${selector}; остальная инициализация продолжается.`);
    return null;
  }
  element.addEventListener(eventName, handler);
  return element;
}

function init() {
  loadProfiles();
  loadState();
  initTheme();
  renderGreeting();
  renderAll();
  renderProfiles();
  installActivityNotificationListener();
  refreshMorningMotivationScheduleOnLaunch();
  refreshMealRemindersOnLaunch();
  refreshTrainingReminderOnLaunch();

  // Тема
  bindEvent('#theme-toggle', 'click', toggleTheme);

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

  $('#meal-type-picker').addEventListener('click', (e) => {
    const button = e.target.closest('[data-meal-type]');
    if (!button) return;
    selectedMealTypeId = button.dataset.mealType;
    renderMealTypePicker();
  });
  $('#custom-meal-type-toggle').addEventListener('click', () => $('#custom-meal-type-inline').classList.toggle('is-open'));
  $('#custom-meal-type-save').addEventListener('click', addCustomMealType);
  $('#manual-food-add').addEventListener('click', addManualFood);
  $('#manual-food-favorite').addEventListener('click', saveFavoriteMeal);
  $('#favorite-meals').addEventListener('click', (e) => {
    const useButton = e.target.closest('[data-favorite-meal]');
    if (useButton) return addFavoriteMeal(useButton.dataset.favoriteMeal);
    const removeButton = e.target.closest('[data-remove-favorite]');
    if (removeButton) removeFavoriteMeal(removeButton.dataset.removeFavorite);
  });

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

  // Навигация
  $$('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nav = btn.dataset.nav;
      if (nav === 'home' || nav === 'stats' || nav === 'training' || nav === 'settings') {
        switchView(nav);
      } else {
        toast(`Раздел «${btn.textContent.trim().replace('скоро', '')}» появится в следующих итерациях`);
      }
    });
  });

  // Статистика: период меняется без перехода на другой экран
  $$('#stats-periods button').forEach((button) =>
    button.addEventListener('click', () => {
      activeStatsPeriod = button.dataset.statsPeriod;
      renderStats();
    }));

  $$('[data-open-detail]').forEach((button) =>
    button.addEventListener('click', () => switchView(`${button.dataset.openDetail}-details`)));
  $$('[data-back-to-stats]').forEach((button) =>
    button.addEventListener('click', () => switchView('stats')));
  $$('#water-detail-periods button').forEach((button) =>
    button.addEventListener('click', () => {
      activeWaterDetailPeriod = button.dataset.detailPeriod;
      renderWaterDetails();
    }));
  $$('#food-detail-periods button').forEach((button) =>
    button.addEventListener('click', () => {
      activeFoodDetailPeriod = button.dataset.detailPeriod;
      renderFoodDetails();
    }));

  // Раскрываемые дополнительные блоки
  $$('.collapsible-toggle').forEach((button) => {
    const content = $(`#${button.dataset.collapseTarget}`);
    if (!content) return;
    button.addEventListener('click', () =>
      setCollapsibleState(button, content, button.getAttribute('aria-expanded') !== 'true'));
  });

  $('#activity-fab').addEventListener('click', () => {
    const form = $('#training-form');
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => $('#workout-duration').focus(), 350);
  });

  // Активность и готовые варианты
  $('#training-form').addEventListener('submit', (e) => {
    e.preventDefault();
    addActivity();
  });
  $$('.workout-type-btn').forEach((btn) =>
    btn.addEventListener('click', () => {
      selectedActivityType = btn.dataset.activityType;
      renderActivityTypeSelection();
    }));
  $$('#activity-intensity [data-intensity]').forEach((button) =>
    button.addEventListener('click', () => { selectedActivityIntensity = button.dataset.intensity; renderActivityIntensity(); }));
  $('#workout-duration-unit').addEventListener('click', openDurationUnitDialog);
  $('#duration-unit-cancel').addEventListener('click', closeDurationUnitDialog);
  $$('#duration-unit-choices button').forEach((button) =>
    button.addEventListener('click', () => setDurationUnit(button.dataset.durationUnit)));
  $('#weekly-goal-minus').addEventListener('click', () => changeWeeklyActivityGoal(-30));
  $('#weekly-goal-plus').addEventListener('click', () => changeWeeklyActivityGoal(30));
  $('#training-list').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove-workout]');
    if (btn) removeWorkout(btn.dataset.removeWorkout);
  });
  $('#activity-save-template').addEventListener('change', (e) => {
    $('#activity-template-inline').classList.toggle('is-open', e.target.checked);
    if (e.target.checked) $('#activity-template-name').focus();
  });
  $('#activity-templates').addEventListener('click', (e) => {
    const useButton = e.target.closest('[data-use-template]');
    if (useButton) {
      const template = state.activityTemplates.find((item) => item.id === useButton.dataset.useTemplate);
      if (template) addActivity(template);
      return;
    }
    const removeButton = e.target.closest('[data-remove-template]');
    if (removeButton) removeActivityTemplate(removeButton.dataset.removeTemplate);
  });

  // Первый вход в «Активность»: выбор вечернего напоминания
  $('#activity-reminder-accept').addEventListener('click', acceptActivityReminderPrompt);
  $('#activity-reminder-decline').addEventListener('click', declineActivityReminderPrompt);
  $('#home-layout-open').addEventListener('click', openHomeLayoutDialog);
  $('#home-layout-close').addEventListener('click', closeHomeLayoutDialog);
  $('#home-layout-list').addEventListener('change', (e) => {
    const checkbox = e.target.closest('[data-home-card-visible]');
    if (checkbox) updateHomeCardVisibility(checkbox.dataset.homeCardVisible, checkbox.checked);
  });
  $('#home-layout-list').addEventListener('click', (e) => {
    const button = e.target.closest('[data-home-card-move]');
    if (button) moveHomeCard(button.dataset.homeCardMove, button.dataset.homeCardDirection);
  });
  $('#profile-switcher').addEventListener('click', openProfilesDialog);
  $('#profiles-dialog-cancel').addEventListener('click', closeProfilesDialog);
  $('#profile-list').addEventListener('click', (e) => {
    const deleteButton = e.target.closest('[data-profile-delete]');
    if (deleteButton) return requestDeleteProfile(deleteButton.dataset.profileDelete);
    const renameButton = e.target.closest('[data-profile-rename]');
    if (renameButton) return requestRenameProfile(renameButton.dataset.profileRename);
    const expandButton = e.target.closest('[data-profile-expand]');
    if (expandButton) return toggleProfileDetails(expandButton.dataset.profileExpand);
    const button = e.target.closest('[data-profile-id]');
    if (button) switchProfile(button.dataset.profileId);
  });
  $('#profile-add').addEventListener('click', addProfile);
  $('#profile-rename-cancel').addEventListener('click', closeRenameProfileDialog);
  $('#profile-rename-confirm').addEventListener('click', confirmRenameProfile);
  $('#profile-delete-cancel').addEventListener('click', closeDeleteProfileDialog);
  $('#profile-delete-confirm').addEventListener('click', confirmDeleteProfile);
  $('#profile-weight-save').addEventListener('click', saveProfileWeight);
  $('#smart-entry-open').addEventListener('click', openSmartEntry);
  $('#smart-entry-cancel').addEventListener('click', closeSmartEntry);
  $('#smart-entry-parse').addEventListener('click', previewSmartEntry);
  $('#smart-entry-voice').addEventListener('click', startVoiceEntry);
  $('#smart-entry-save').addEventListener('click', saveSmartEntry);
  $('#smart-voice-help-open').addEventListener('click', openSmartVoiceHelp);
  $('#smart-voice-help-ok').addEventListener('click', closeSmartVoiceHelp);
  $('#terms-accept').addEventListener('click', acceptTerms);
  $('#terms-decline').addEventListener('click', declineTerms);
  $('#terms-blocked-ok').addEventListener('click', closeApplicationAfterTermsDecline);
  $('#privacy-help').addEventListener('click', openPrivacyDialog);
  $('#privacy-dialog-ok').addEventListener('click', closePrivacyDialog);
  $('#sources-open').addEventListener('click', openSourcesDialog);
  $('#sources-dialog-ok').addEventListener('click', closeSourcesDialog);
  $('#morning-message-dialog-ok').addEventListener('click', closeMorningMessageDialog);

  // Настройки: тема
  $$('#theme-segmented button').forEach((btn) =>
    btn.addEventListener('click', () => setThemeMode(btn.dataset.themeMode)));

  // Настройки: утренние фразы, вечерний вопрос и разрешения Android
  $('#morning-motivation-toggle').addEventListener('change', (e) =>
    updateMorningMotivationEnabled(e.target.checked));
  $('#morning-motivation-time').addEventListener('change', (e) =>
    updateMorningMotivationTime(e.target.value));
  bindEvent('#morning-motivation-theme', 'click', openMorningThemeDialog);
  $('#morning-theme-dialog-cancel').addEventListener('click', closeMorningThemeDialog);
  $$('#morning-theme-choices button').forEach((button) =>
    button.addEventListener('click', async () => {
      closeMorningThemeDialog();
      await updateMorningMotivationTheme(button.dataset.morningTheme);
    }));
  $('#meal-reminders-toggle').addEventListener('change', (e) => updateMealRemindersEnabled(e.target.checked));
  $('#meal-reminders-all').addEventListener('click', () => setAllMealReminders(true));
  $('#meal-reminders-none').addEventListener('click', () => setAllMealReminders(false));
  $('#meal-reminders-list').addEventListener('change', (e) => {
    const enabled = e.target.closest('[data-meal-enabled]');
    if (enabled) return updateMealReminder(enabled.dataset.mealEnabled, { enabled: enabled.checked });
    const time = e.target.closest('[data-meal-time]');
    if (time) updateMealReminder(time.dataset.mealTime, { time: time.value });
  });
  $('#workout-reminder-toggle').addEventListener('change', (e) =>
    updateTrainingReminderEnabled(e.target.checked));
  $('#workout-reminder-time').addEventListener('change', (e) =>
    updateTrainingReminderTime(e.target.value));
  bindEvent('#notification-setup-btn', 'click', () => switchView('notifications'));
  bindEvent('#notification-test-btn', 'click', sendTestActivityNotification);
  bindEvent('#activity-reminder-test', 'click', () => sendSpecificReminderTest('activity'));
  bindEvent('#meal-reminder-test', 'click', () => sendSpecificReminderTest('meal'));
  $('#notifications-back-btn').addEventListener('click', () => switchView('settings'));
  $$('[data-open-settings]').forEach((btn) =>
    btn.addEventListener('click', () => openNativeNotificationSetting(btn.dataset.openSettings)));

  // Настройки: резервное копирование
  bindEvent('#export-btn', 'click', exportData);
  bindEvent('#import-btn', 'click', () => $('#import-file').click());
  $('#import-file').addEventListener('change', (e) => {
    if (e.target.files[0]) importData(e.target.files[0]);
    e.target.value = '';
  });
  bindEvent('#reset-btn', 'click', requestResetAll);
  $('#reset-dialog-cancel').addEventListener('click', closeResetDialog);
  $('#reset-dialog-confirm').addEventListener('click', resetAll);

  // После возврата из системных настроек обновляем статусы разрешений.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && !$('#notifications-view').hidden) {
      refreshNotificationSetupState();
    }
  });
  document.addEventListener('focusin', (event) => {
    const field = event.target;
    if (!field || !field.matches || !field.matches('input, textarea')) return;
    setTimeout(() => field.scrollIntoView({ behavior: 'smooth', block: 'center' }), 250);
  });

  maybeShowTerms();
}

/* Поддержка запуска в браузере и в Node (для тестов парсера) */
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', init);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    parseMealText, parseItem, lookupProduct, calcKcal, FOOD_DB,
    parseWorkoutDuration, formatWorkoutDuration, normalizeActivityName,
    getMorningMotivationMessage, morningMotivationVariantsCount, normalizeFavoriteMeal,
    normalizeDailyHistory, getStatsDays, normalizeOptionalNote, updateNativeWidget, parseSmartEntry, canScheduleReminderToday, profileStateKey, estimateActivityKcal, groupFoodItemsByMealType, normalizeHomeLayoutValue
  };
}
