'use strict';
/* Временный тест парсера: node test-parser.js */
const { parseMealText, parseWorkoutDuration, formatWorkoutDuration, normalizeActivityName, getMorningMotivationMessage, morningMotivationVariantsCount, normalizeFavoriteMeal, parseSmartEntry, canScheduleReminderToday, groupFoodItemsByMealType, normalizeHomeLayoutValue, normalizeAllProfilesBackup, normalizeWeightHistory, getMealTypeIdByTime, MEAL_TIME_RANGES, buildWaterReminderTimes } = require('./app.js');

const tests = [
  ['картофель 150г, котлета 1шт', 2],
  ['гречка 100г', 1],
  ['яйцо 2шт', 1],
  ['куриная грудка 150 г', 1],
  ['банан', 1],
  ['молоко 250 мл', 1],
  ['чай', 1],
  ['овсянка 80г, банан 1шт, кофе', 3],
  ['пельмени 200 грамм', 1],
  ['рис вареный 100 гр', 1],
  ['яблоко и груша', 2],
  ['вода 500мл', 1],
  ['оливковое масло 1 ст.л', 1],
  ['мед 1 ч.л', 1],
  ['несуществующее блюдо 100г', 0],
  ['торт', 1],
  ['кефир 1 стакан', 1],
  ['картофель 1.5 кг', 1],
  ['котлета 2шт', 1],
  ['картофель 150г', 1],
  ['глазированный сырок', 1],
  ['сырок', 1]
];

let failed = 0;
for (const [input, expectedCount] of tests) {
  const res = parseMealText(input);
  const ok = res.length === expectedCount;
  if (!ok) failed++;
  console.log(
    `${ok ? '✓' : '✗'} ${input} => ${res.map(r => `${r.name}:${r.kcal} (${r.amount ?? '—'} ${r.unit})`).join(' | ') || '—'}`
  );
}

// Проверка количеств для ключевых случаев
const checks = [
  ['картофель 150г', 0, 116],
  ['глазированный сырок', 0, 210],
  ['сырок', 0, 210],       // 77/100*150
  ['гречка 100г', 0, 313],
  ['котлета 1шт', 0, 210],
  ['яйцо 2шт', 0, 148],
  ['молоко 250 мл', 0, 150],
  ['оливковое масло 1 ст.л', 0, 177],
  ['кефир 1 стакан', 0, 100],
  ['картофель 1.5 кг', 0, 1155],
  // Новые категории расширенной базы
  ['лосось 200г', 0, 284],          // рыба
  ['пармезан 50г', 0, 196],         // сыр
  ['миндаль 30г', 0, 174],          // орехи
  ['борщ 300 мл', 0, 147],          // супы
  ['шаурма', 0, 200],               // фастфуд
  ['греческий йогурт 150г', 0, 110],// молочка
  ['чернослив 40г', 0, 92],         // сухофрукты
  ['киноа 70г', 0, 258],            // крупы
  ['халва 50г', 0, 262],            // сладости
  ['куриная печень 100г', 0, 136],  // субпродукты
  // Расширение v0.1.7: USDA FoodData Central / Open Food Facts
  ['хумус 100г', 0, 166],
  ['тофу 150г', 0, 114],
  ['нут вареный 150г', 0, 246],
  // Кейсы 0.3.5: доли с известным весом (кусок/ломоть/долька/горсть),
  // число перед продуктом, «мёд» с ё, морфология с мягким знаком
  ['пицца 3 куска', 0, 798],
  ['кусок торта', 0, 350],
  ['ломтик хлеба', 0, 75],
  ['2 дольки лимона', 0, 17],
  ['горсть миндаля', 0, 174],
  ['столовая ложка мёда', 0, 49],
  ['киноа вареная 200г', 0, 240],
  ['арахисовая паста 30г', 0, 176],
  ['протеиновый батончик 60г', 0, 216],
  ['растительный йогурт 150г', 0, 98],
  ['комбуча 250мл', 0, 33],
  ['энергетик без сахара 500мл', 0, 15],
  ['кимчи 200г', 0, 30],
  ['рамен 300мл', 0, 297],
  ['кесадилья 200г', 0, 536],
  ['борщ 300мл, ложка сметаны', 1, 32],
  ['йогурт 5% 100г', 0, 92],
  ['йогурт 7% 100г', 0, 110]
];
for (const [input, idx, expectedKcal] of checks) {
  const res = parseMealText(input);
  const got = res[idx] ? res[idx].kcal : null;
  const ok = got === expectedKcal;
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ккал: ${input} => ${got} (ожидалось ${expectedKcal})`);
}

// Длительность тренировок: принимаем часы, десятичную точку и запятую.
const durationChecks = [
  ['0,5', 30, '30 мин'],
  ['1', 60, '1 ч'],
  ['1.5', 90, '1 ч 30 мин'],
  ['2,25', 135, '2 ч 15 мин'],
  ['0', null, null],
  ['25', null, null]
];
for (const [input, expectedMinutes, expectedText] of durationChecks) {
  const minutes = parseWorkoutDuration(input);
  const text = minutes == null ? null : formatWorkoutDuration(minutes);
  const ok = minutes === expectedMinutes && text === expectedText;
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} активность: ${input} ч => ${minutes ?? '—'} мин${text ? ` (${text})` : ''}`);
}

const templateNameChecks = [
  ['  Кардио   45 мин  ', 'Кардио 45 мин'],
  ['⛸️ Коньки по выходным', '⛸️ Коньки по выходным'],
  [' ', null],
  ['а', null]
];
for (const [input, expected] of templateNameChecks) {
  const got = normalizeActivityName(input);
  const ok = got === expected;
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} готовый вариант: «${input}» => ${got ?? '—'}`);
}

const morningThemes = ['mixed', 'calm', 'health', 'food', 'activity'];
for (const theme of morningThemes) {
  const variants = morningMotivationVariantsCount(theme);
  const messages = new Set(Array.from({ length: variants }, (_, i) => getMorningMotivationMessage(theme, i)));
  const ok = variants === 60 && messages.size === variants && [...messages].every((message) => message.length >= 15);
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} утренние фразы: ${theme} => ${messages.size}/${variants} уникальных`);
}

const favoriteChecks = [
  [{ id: 'fav1', name: '  Домашний   обед ', kcal: '450' }, 'Домашний обед', 450],
  [{ id: 'fav2', name: 'x', kcal: 200 }, null, null],
  [{ id: 'fav3', name: 'Перекус', kcal: 0 }, null, null]
];
for (const [input, expectedName, expectedKcal] of favoriteChecks) {
  const meal = normalizeFavoriteMeal(input);
  const ok = expectedName == null ? meal === null : meal && meal.name === expectedName && meal.kcal === expectedKcal;
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} своё блюдо: ${input.name} => ${meal ? `${meal.name}: ${meal.kcal}` : '—'}`);
}

const smart = parseSmartEntry('поплавов в бассейне 15 минут съел бана выпил 2 стакана воды');
const smartOk = smart.waterMl === 500 && smart.activity && smart.activity.type === 'swim' && smart.activity.durationMinutes === 15 && smart.food.some((item) => item.name === 'банан');
if (!smartOk) failed++;
console.log(`${smartOk ? '✓' : '✗'} быстрый ввод: плавание, банан и 2 стакана воды`);

const smartMulti = parseSmartEntry('побегал 15 минут поплавала в бассейне 20 минут съел банан выпил два стакана воды съел тарелку гречки');
const smartMultiOk = smartMulti.waterMl === 500 && smartMulti.activities.length === 2 && smartMulti.activities[0].type === 'cardio' && smartMulti.activities[1].type === 'swim' && smartMulti.food.length === 2 && smartMulti.food.some((item) => item.name === 'гречки');
if (!smartMultiOk) failed++;
console.log(`${smartMultiOk ? '✓' : '✗'} быстрый ввод: бег, плавание, банан, гречка и 2 стакана воды`);

const smartDictionary = parseSmartEntry('велосипед 20 минут съел грешка выпил пол литра воды');
const smartDictionaryOk = smartDictionary.waterMl === 500 && smartDictionary.activities[0]?.type === 'bike' && smartDictionary.food.some((item) => item.name === 'гречка');
if (!smartDictionaryOk) failed++;
console.log(`${smartDictionaryOk ? '✓' : '✗'} справочник команд: велосипед, грешка и пол литра`);

const drinkFood = parseMealText('компот 250 мл');
const drinkFoodOk = drinkFood[0]?.kcal === 145;
if (!drinkFoodOk) failed++;
console.log(`${drinkFoodOk ? '✓' : '✗'} напиток в питании: компот 250 мл`);

const smartDrink = parseSmartEntry('выпил 250 мл сока');
const smartDrinkOk = smartDrink.waterMl === 0 && smartDrink.food.length === 1 && smartDrink.food[0].kcal === 113;
if (!smartDrinkOk) failed++;
console.log(`${smartDrinkOk ? '✓' : '✗'} быстрый ввод: сок относится к питанию, а не к воде`);

const foodGroups = groupFoodItemsByMealType([
  { id: '1', name: 'овсянка', kcal: 280, mealTypeId: 'breakfast', mealTypeLabel: 'Завтрак' },
  { id: '2', name: 'банан', kcal: 105, mealTypeId: 'breakfast', mealTypeLabel: 'Завтрак' },
  { id: '3', name: 'борщ', kcal: 147, mealTypeId: 'lunch', mealTypeLabel: 'Обед' },
  { id: '4', name: 'чай', kcal: 2 }
], [
  { id: 'breakfast', label: 'Завтрак' },
  { id: 'lunch', label: 'Обед' }
]);
const foodGroupsOk = foodGroups.length === 3
  && foodGroups[0].label === 'Завтрак' && foodGroups[0].items.length === 2 && foodGroups[0].totalKcal === 385
  && foodGroups[1].label === 'Обед' && foodGroups[1].totalKcal === 147
  && foodGroups[2].label === 'Без типа' && foodGroups[2].totalKcal === 2;
if (!foodGroupsOk) failed++;
console.log(`${foodGroupsOk ? '✓' : '✗'} питание сгруппировано по приёмам пищи`);

const normalizedHomeLayout = normalizeHomeLayoutValue({
  order: ['food', 'food', 'unknown'],
  visible: { water: false, food: false }
});
const homeLayoutOk = normalizedHomeLayout.order.join('|') === 'food|water|weight'
  && normalizedHomeLayout.visible.food === false && normalizedHomeLayout.visible.water === false && normalizedHomeLayout.visible.weight === true;
if (!homeLayoutOk) failed++;
console.log(`${homeLayoutOk ? '✓' : '✗'} карточки Главной: порядок и защита от пустого экрана`);

const allProfilesBackup = normalizeAllProfilesBackup({
  scope: 'all-profiles', activeProfileId: 'wife', profiles: [
    { id: 'default', name: 'Мой профиль', state: { water: { total: 250 } } },
    { id: 'wife', name: 'Жена', state: { food: { items: [{ kcal: 300 }] } } },
    { id: 'wife', name: 'Дубликат', state: {} }
  ]
});
const allProfilesBackupOk = allProfilesBackup && allProfilesBackup.activeProfileId === 'wife'
  && allProfilesBackup.profiles.length === 2 && allProfilesBackup.profiles[1].name === 'Жена'
  && allProfilesBackup.profiles[1].state.food.items[0].kcal === 300;
if (!allProfilesBackupOk) failed++;
console.log(`${allProfilesBackupOk ? '✓' : '✗'} одна копия сохраняет все профили`);

const weightHistory = normalizeWeightHistory([
  { date: '2026-07-30', weightKg: '71,2' },
  { date: '2026-08-01', weightKg: 70.5 },
  { date: '2026-08-01', weightKg: 70.4, updatedAt: 1 },
  { date: '2026-08-02', weightKg: 70 }
]);
const weightHistoryOk = weightHistory.length === 3 && weightHistory[0].weightKg === 71.2 && weightHistory[1].weightKg === 70.4 && weightHistory[2].weightKg === 70;
if (!weightHistoryOk) failed++;
console.log(`${weightHistoryOk ? '✓' : '✗'} история веса: дата, замена записи и допустимый диапазон`);

const morning = new Date(2026, 7, 2, 10, 0, 0);
const reminderPolicy = [
  [canScheduleReminderToday('15:30', false, morning), true, 'новое время сегодня'],
  [canScheduleReminderToday('09:30', false, morning), false, 'время уже прошло'],
  [canScheduleReminderToday('15:30', true, morning), false, 'данные уже внесены']
];
for (const [got, expected, label] of reminderPolicy) {
  const ok = got === expected;
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} правило напоминания: ${label}`);
}

// Автовыбор типа приёма пищи по времени суток (Завтрак 06–13, Обед 13–16, Полдник 16–18, Ужин 18–22, Поздний перекус 22–06)
const mealTimePolicy = [
  [new Date(2026, 7, 5, 6, 0, 0), 'breakfast', '06:00 начало завтрака'],
  [new Date(2026, 7, 5, 9, 30, 0), 'breakfast', '09:30 завтрак'],
  [new Date(2026, 7, 5, 12, 59, 0), 'breakfast', '12:59 всё ещё завтрак'],
  [new Date(2026, 7, 5, 13, 0, 0), 'lunch', '13:00 обед'],
  [new Date(2026, 7, 5, 15, 59, 0), 'lunch', '15:59 конец обеда'],
  [new Date(2026, 7, 5, 17, 15, 0), 'snack', '17:15 полдник'],
  [new Date(2026, 7, 5, 19, 0, 0), 'dinner', '19:00 ужин'],
  [new Date(2026, 7, 5, 21, 59, 0), 'dinner', '21:59 конец ужина'],
  [new Date(2026, 7, 5, 23, 10, 0), 'lateSnack', '23:10 поздний перекус'],
  [new Date(2026, 7, 5, 2, 30, 0), 'lateSnack', '02:30 ночь — поздний перекус'],
  [new Date(2026, 7, 5, 5, 59, 0), 'lateSnack', '05:59 граница ночи']
];
for (const [date, expected, label] of mealTimePolicy) {
  const got = getMealTypeIdByTime(date);
  const ok = got === expected;
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} автотип приёма пищи: ${label} → ${got}`);
}
const rangesOk = MEAL_TIME_RANGES.length === 5 && MEAL_TIME_RANGES.every((r) => r.fromMinutes < r.toMinutes);
if (!rangesOk) failed++;
console.log(`${rangesOk ? '✓' : '✗'} диапазоны приёмов пищи покрывают всё время без наложений`);

// Нативный планировщик напоминаний о воде: минуты от полуночи по интервалу и окну
const waterReminderPlan = [
  [buildWaterReminderTimes(90, '08:00', '22:00'), [480, 570, 660, 750, 840, 930, 1020, 1110, 1200, 1290], 'каждые 90 мин 08:00–22:00'],
  [buildWaterReminderTimes(120, '08:00', '22:00'), [480, 600, 720, 840, 960, 1080, 1200, 1320], 'каждые 120 мин 08:00–22:00'],
  [buildWaterReminderTimes(60, '22:00', '02:00'), [0, 60, 120, 1320, 1380], 'окно через полночь 22:00–02:00'],
  [buildWaterReminderTimes(90, '08:00', '08:00'), [480], 'окно из одной точки'],
  [buildWaterReminderTimes(90, 'некорректно', '22:00'), [], 'некорректное начало'],
  [buildWaterReminderTimes(90, '08:00', '99:99'), [], 'некорректный конец']
];
for (const [got, expected, label] of waterReminderPlan) {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} расписание воды: ${label} → [${got.join(', ')}]`);
}
const onceOk = buildWaterReminderTimes(90, '08:00', '22:00').every((t) => t >= 0 && t < 1440);
if (!onceOk) failed++;
console.log(`${onceOk ? '✓' : '✗'} все точки расписания воды в пределах суток`);

// Быстрый ввод («Разобрать» в ИИ-центре): структура ответа и «голый» список продуктов
const smartStructure = (() => {
  const r = parseSmartEntry('100 мл воды, персик');
  return r.waterMl === 100 && Array.isArray(r.food) && r.food.length === 1 && r.food[0].name === 'персик' && r.activities.length === 0;
})();
if (!smartStructure) failed++;
console.log(`${smartStructure ? '✓' : '✗'} быстрый ввод: «100 мл воды, персик» → вода 100 мл + персик`);

const smartCases = [
  ['овсянка 150г, банан, гулял 40 мин', 0, ['овсянка', 'банан'], ['walk']],
  ['100 мл воды, персик, ходьба 10 мин', 100, ['персик'], ['walk']],
  ['100 мл воды, персик, прогулка 10 мин', 100, ['персик'], ['walk']],
  ['прогулка 10 мин', 0, [], ['walk']],
  ['пешком 20 мин', 0, [], ['walk']],
  ['тренировка 40 мин', 0, [], ['other']],
  ['занимался спортом 30 мин', 0, [], ['other']],
  ['кардио 25 мин', 0, [], ['cardio']],
  ['бег 15 мин', 0, [], ['cardio']],
  ['зарядка 15 мин', 0, [], ['stretch']],
  ['съел яблоко', 0, ['яблоко'], []],
  ['выпил 250 мл сока', 0, ['сока'], []],
  ['100 мл сока', 0, ['сока'], []],
  ['пробежал 30 минут', 0, [], ['cardio']],
  ['плавание 20 мин', 0, [], ['swim']],
  ['шёл 15 минут', 0, [], []],
  ['спал 2 часа, персик', 0, ['персик'], []],
  ['занимался йогой 25 минут, вода 300мл, персик 2шт', 300, ['персик'], ['stretch']],
  ['бассейн 45 минут, творог 150г', 0, ['творог'], ['swim']],
  ['вода 300мл', 300, [], []],
  // Голосовой ввод без знаков препинания (кейс пользователя)
  ['100 мл вод стакан сока персик прогулка 5 мин', 100, ['сока', 'персик'], ['walk']],
  ['стакан сока', 0, ['сока'], []],
  ['выпил стакан сока', 0, ['сока'], []],
  ['чашка кофе', 0, ['кофе'], []],
  ['чашку чая', 0, ['чай'], []],
  ['суп тарелка', 0, ['суп'], []],
  ['кефир литр', 0, ['кефир'], []],
  ['2 стакана сока', 0, ['сока'], []],
  ['вода стакан', 250, [], []],
  // Кейсы 0.3.5: «кусок» как единица, запятая перед числом, глагол «ходил»
  ['суши 6 штук, пицца 3 кусочка', 0, ['суши', 'пицца'], []],
  ['3 куска пиццы', 0, ['пицца'], []],
  ['суши 5 шт, 3 куска пиццы', 0, ['суши', 'пицца'], []],
  ['ходил 15 мин', 0, [], ['walk']],
  ['100 мл воды стакан сока абрикос ходил 5 мин', 100, ['сока', 'абрикос'], ['walk']],
  ['кусок торта', 0, ['торт'], []]
];
for (const [text, water, foodNames, actTypes] of smartCases) {
  const r = parseSmartEntry(text);
  const gotFood = r.food.map((f) => f.name);
  const gotActs = r.activities.map((a) => a.type);
  const ok = r.waterMl === water
    && JSON.stringify(gotFood) === JSON.stringify(foodNames)
    && JSON.stringify(gotActs) === JSON.stringify(actTypes);
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} быстрый ввод: «${text}» → вода ${r.waterMl}, еда [${gotFood}], активность [${gotActs}]`);
}

// Нутрициолог (0.3.5): факты из базы — да, шаблонных «умных» ответов — нет.
// Третий элемент кейса — строки, которых в ответе быть НЕ должно (регрессия
// на псевдоответы вроде кофе-правила на любой вопрос «перед сном»).
{
  const { buildAiChatAnswer } = require('./app.js');
  const chatCases = [
    ['сколько калорий в гречке', ['гречка', 'ккал'], []],
    ['сколько белка в твороге', ['творог', 'б '], []],
    ['творог', ['творог', 'ккал'], []],
    ['что приготовить из курицы и риса', ['рецепт'], []],
    // Свободные вопросы → честный фолбэк про облако, без заготовленных ответов:
    ['что лучше пить перед сном чай или кофе', ['облачн'], ['перед сном — без кофеина', 'травяной']],
    ['перед сном лучше выпить стакан сока или стакан воды', ['облачн'], ['кофе лучше пить', 'травяной чай']],
    ['назови столицу канады', ['облачн'], []],
    ['чем полезны квантовые флюктуации', ['облачн'], []]
  ];
  for (const [question, needles, forbidden] of chatCases) {
    const answer = buildAiChatAnswer(question);
    const ok = needles.every((needle) => answer.toLowerCase().includes(needle.toLowerCase()))
      && (forbidden || []).every((needle) => !answer.toLowerCase().includes(needle.toLowerCase()));
    if (!ok) failed++;
    console.log(`${ok ? '✓' : '✗'} нутрициолог: «${question}» → есть [${needles}], нет [${(forbidden || []).join(',') || '—'}]`);
  }
}

console.log(failed === 0 ? '\nALL TESTS PASSED' : `\n${failed} FAILURES`);
process.exit(failed === 0 ? 0 : 1);
