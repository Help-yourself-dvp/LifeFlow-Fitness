'use strict';
/* Временный тест парсера: node test-parser.js */
const { parseMealText, parseWorkoutDuration, formatWorkoutDuration, normalizeActivityName, getMorningMotivationMessage, morningMotivationVariantsCount, normalizeFavoriteMeal, parseSmartEntry, canScheduleReminderToday, groupFoodItemsByMealType, normalizeHomeLayoutValue, normalizeAllProfilesBackup, normalizeWeightHistory, getMealTypeIdByTime, MEAL_TIME_RANGES, buildWaterReminderTimes, buildExpertInsights, addCustomFood, removeCustomFood, parseOffProduct, describeFoodItemLine, buildProgressAnswer, cloudErrorText, COMPANION_GRAMS, normalizeCourse, normalizeCourseTimes, addCourse, updateCourse, removeCourse, toggleCourseDose, courseDayNumber, courseDayLabel, isCourseActiveOn, courseDosesForDate, canUseLocalLlm, parseMealTextDetailed, ruForms, ruUnitName, SOUP_PORTION_GRAMS, SOUP_MEAT_GRAMS, isPhotoNoFoodAnswer, buildParseLogEntry, normalizeParseLogList, formatParseLogForClipboard, PARSE_LOG_LIMIT, normalizeCombos, COMBOS_LIMIT } = require('./app.js');

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
  ['йогурт 7% 100г', 0, 110],
  // Кейсы 0.3.19 (реальные записи пользователя через поле «Питание»):
  // честные веса хлебных долей (кусок 40 г, ломоть 30 г — а не 70–100 г),
  // прилагательные в составных ключах («белого хлеба» → «белый хлеб»),
  // точный ключ «творожная масса с изюмом».
  ['творожная масса с изюмом 180 г', 0, 621],
  ['две сосиски', 0, 210],
  // Кейс 0.3.21 (пользователь): «тарелка куриного супа» в умном вводе теряла
  // «куриного», «чёрный хлеб» в базе отсутствовал; 0.3.23: тарелка = 250 г (было 200)
  ['тарелка куриного супа', 0, 105],
  ['кусок чёрного хлеба', 0, 80],
  // Кейс 0.3.22 (пользователь): вариант с союзом «и» — висячее «и » на стыке
  ['тарелка куриного супа и кусок чёрного хлеба', 1, 80],
  // Кейс 0.3.20 (пользователь): спутник через «с» — сосиска/котлета не теряются
  ['картошка с сосиской', 1, 105],
  ['гречка с котлетой', 1, 210],
  // …но кураторская пара и граммовая добавка не делятся
  ['кофе с молоком', 0, 20],
  ['каша с маслом', 0, 95],
  ['два куска белого хлеба', 0, 212],
  ['два ломтика белого хлеба', 0, 159],
  ['ржаного хлеба 80 г', 0, 160],
  ['ломоть ржаного хлеба', 0, 60]
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
// 0.3.8: сохранённый порядок уважается, дубликаты/неизвестные отбрасываются,
// отсутствующие карточки встают в начало в порядке HOME_CARDS.
const homeLayoutOk = normalizedHomeLayout.order.join('|') === 'day-plan|day-mood|water|weight|food'
  && normalizedHomeLayout.visible.food === false && normalizedHomeLayout.visible.water === false && normalizedHomeLayout.visible.weight === true;
if (!homeLayoutOk) failed++;
console.log(`${homeLayoutOk ? '✓' : '✗'} карточки Главной: порядок и защита от пустого экрана → ${normalizedHomeLayout.order.join(',')}`);

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
  ['кусок торта', 0, ['торт'], []],
  // 0.3.19: прилагательные перед существительным в составных ключах
  ['два куска белого хлеба', 0, ['белый хлеб'], []],
  ['ломоть ржаного хлеба', 0, ['ржаной хлеб'], []],
  // 0.3.20: спутник через «с» делится только для штучных продуктов
  ['картошка с сосиской', 0, ['картофель', 'сосиска'], []],
  ['кофе с молоком', 0, ['кофе с молоком'], []],
  ['каша с маслом', 0, ['каша', 'масло'], []], // 0.3.30: масло ≈10 г больше не роняется
  ['бутерброд с колбасой', 0, ['бутерброд с колбасой'], []],
  // 0.3.21: «тарелка/чашка + прилагательное + существительное» не ломается перестановкой
  ['тарелка куриного супа', 0, ['куриный суп'], []],
  ['кусок чёрного хлеба', 0, ['чёрный хлеб'], []],
  // 0.3.22: «…супа и кусок…» — оба продукта, точные веса
  ['тарелка куриного супа и кусок чёрного хлеба', 0, ['куриный суп', 'чёрный хлеб'], []]
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

// Числительные словами (0.3.7, реальный кейс пользователя: распознаватель речи
// выдал «суши шесть штук» — число терялось, порция сбрасывалась на 100 г) +
// честный вес штучных продуктов (бутерброд — 1 шт ≈ 45 г, а не «100 г — 80 ккал»)
// + составные ключи по набору слов («бутербродА с сыром» = «бутерброд с сыром»).
{
  const detailed = [
    // [фраза, [имя, amount, grams, kcal]]
    ['суши шесть штук, пицца три кусочка', [['суши', 6, 420, 420], ['пицца', 3, 300, 798]]],
    ['суши 6 штук, пицца 3 кусочка', [['суши', 6, 420, 420], ['пицца', 3, 300, 798]]],
    ['три куска пиццы', [['пицца', 3, 300, 798]]],
    ['стакан молока, котлета, бутерброд с сыром', [['молоко', 1, 250, 150], ['котлета', null, 100, 210], ['бутерброд с сыром', null, 45, 110]]],
    ['съел два бутерброда с сыром и чашку чая', [['бутерброд с сыром', 2, 90, 220], ['чай', 1, 200, null]]],
    // 0.3.19: «два куска белого хлеба» — 2 куска × 40 г = 80 г (было 2 × 70 г = 350 ккал)
    ['два куска белого хлеба', [['белый хлеб', 2, 80, 212]]],
    // 0.3.20: «картошка с сосиской» — два продукта, сосиска честной 1 шт
    ['картошка с сосиской', [['картофель', null, 100, 77], ['сосиска', null, null, 105]]],
    // 0.3.21: «тарелка куриного супа» — тарелка куриного супа, не «суп 100 г»; 0.3.23: тарелка 250 г
    ['тарелка куриного супа', [['куриный суп', 1, 250, 105]]],
    // 0.3.22: с союзом «и» — суп порцией, хлеб куском 40 г
    ['тарелка куриного супа и кусок чёрного хлеба', [['куриный суп', 1, 250, 105], ['чёрный хлеб', 1, 40, 80]]]
  ];
  for (const [text, expects] of detailed) {
    const r = parseSmartEntry(text);
    const ok = expects.every(([name, amount, grams, kcal]) => r.food.some((f) =>
      f.name === name
      && (amount == null ? f.amount == null : f.amount === amount)
      && (grams == null || f.grams === grams)
      && (kcal == null || f.kcal === kcal)));
    if (!ok) failed++;
    console.log(`${ok ? '✓' : '✗'} детально: «${text}» → ${JSON.stringify(r.food.map((f) => [f.name, f.amount, f.grams, f.kcal]))}`);
  }
  {
    const r = parseSmartEntry('выпил два стакана воды');
    const ok = r.waterMl === 500;
    if (!ok) failed++;
    console.log(`${ok ? '✓' : '✗'} «два стакана воды» → вода ${r.waterMl} (ждали 500)`);
  }
  {
    const r = parseSmartEntry('гулял полчаса');
    const ok = r.activities.length === 1 && r.activities[0].durationMinutes === 30;
    if (!ok) failed++;
    console.log(`${ok ? '✓' : '✗'} «гулял полчаса» → ${JSON.stringify(r.activities)} (ждали 30 мин)`);
  }
}

// Честная правдивость расчётов (0.3.8, фатальный кейс пользователя:
// «4 бутерброда с сырокопченой колбасой» давало 1316 ккал — приложение
// называли «бесполезной игрушкой» из-за таких подмен).
{
  const truth = [
    // [фраза, имя, amount, grams, kcal, approx?]
    ['4 бутерброда с сырокопченой колбасой', ['бутерброд с сырокопченая колбаса', 4, 180, 602, true]],
    ['бутерброд с сыром', ['бутерброд с сыром', null, 45, 110, false]], // кураторский ключ важнее композиции
    ['бутерброд с маслом', ['бутерброд', null, 45, 130, false]],
    ['суп из курицы', ['суп из курица', null, 100, 91, true]],
    ['рагу из говядины', ['рагу из говядины', null, 100, 160, false]], // кураторский ключ, не «говядина»
    ['говяжья котлета', ['котлета говяжья', null, 100, 220, false]],
    ['2 бутерброда с сыром', ['бутерброд с сыром', 2, 90, 220, false]]
  ];
  for (const [text, [name, amount, grams, kcal, approx]] of truth) {
    const r = parseSmartEntry(text);
    const f = r.food[0];
    const ok = !!f && f.name === name
      && (amount == null ? f.amount == null : f.amount === amount)
      && f.grams === grams && f.kcal === kcal && !!f.approx === approx;
    if (!ok) failed++;
    console.log(`${ok ? '✓' : '✗'} правдивость: «${text}» → ${f ? `${f.name} ${f.amount}шт ${f.grams}г ${f.kcal}ккал approx=${!!f.approx}` : 'НЕ РАСПОЗНАНО'}`);
  }
  {
    // расшифровка состава в превью
    const { describeFoodItemLine } = require('./app.js');
    const item = parseSmartEntry('1 бутерброд с сырокопченой колбасой').food[0];
    const line = item && (describeFoodItemLine ? describeFoodItemLine(item) : '');
    const ok = !!item && /по составу/u.test(String(item.note)) && /≈/u.test(line);
    if (!ok) failed++;
    console.log(`${ok ? '✓' : '✗'} превью показывает состав и знак ≈: ${item && item.note}`);
  }
}

// 0.3.9: длинная фраза пользователя — несколько начинок, склейка «сорокопчёной»,
// прилагательное после ёмкости, « и »-начинки не превращаются в 100 г масла
{
  const r = parseSmartEntry('четыре бутерброда сорокопчёной колбасой, два бутерброда с сыром и маслом, рагу из свинины, стакан сока яблочного');
  const [sw1, sw2, stew, juice] = r.food;
  const ok1 = sw1 && sw1.name === 'бутерброд с сырокопченая колбаса' && sw1.amount === 4 && sw1.kcal === 602 && sw1.approx;
  if (!ok1) failed++;
  console.log(`${ok1 ? '✓' : '✗'} «четыре бутерброда сорокопчёной колбасой» → ${sw1 && sw1.name} ${sw1 && sw1.kcal} ккал ≈`);
  const ok2 = sw2 && sw2.name === 'бутерброд с сыром и маслом' && sw2.amount === 2 && sw2.kcal === 380 && sw2.approx
    && /сыр 15 г/.test(sw2.note) && /масло 8 г/.test(sw2.note);
  if (!ok2) failed++;
  console.log(`${ok2 ? '✓' : '✗'} «2 бутерброда с сыром и маслом» ≈380 (не 220+717!): ${sw2 && sw2.name} ${sw2 && sw2.kcal} ккал, note: ${sw2 && sw2.note}`);
  const ok3 = stew && stew.name === 'рагу из свинины' && stew.kcal === 190;
  if (!ok3) failed++;
  console.log(`${ok3 ? '✓' : '✗'} «рагу из свинины» → 190 ккал`);
  const ok4 = juice && juice.name === 'яблочный сок' && juice.amount === 1 && juice.kcal === 115;
  if (!ok4) failed++;
  console.log(`${ok4 ? '✓' : '✗'} «стакан сока яблочного» → яблочный сок, не общий «сок» (${juice && juice.name} ${juice && juice.kcal})`);
  const items = r.food.map((i) => i.name).join(', ');
  const ok5 = r.food.length === 4 && !items.includes('масло,') && !items.endsWith('масло');
  if (!ok5) failed++;
  console.log(`${ok5 ? '✓' : '✗'} «масло» НЕ всплывает отдельным продуктом → всего позиций: ${r.food.length}`);

  const tea = parseMealText('бутерброд с сыром и чай');
  const ok6 = tea.length === 2 && tea[1].name === 'чай';
  if (!ok6) failed++;
  console.log(`${ok6 ? '✓' : '✗'} «бутерброд с сыром и чай» — чай остаётся отдельным напитком (${tea.map((i) => i.name).join(' | ')})`);
}

// 0.3.8: карточки Главной — новые карточки (чек-лист, самочувствие, задания дня)
// в настройках порядка; у текущих пользователей новые встают В НАЧАЛО (как было)
{
  const fresh = normalizeHomeLayoutValue(undefined);
  const okFresh = fresh.order.length === 5 && fresh.order[0] === 'day-plan'
    && fresh.order[fresh.order.length - 1] === 'weight' && Object.values(fresh.visible).every(Boolean);
  if (!okFresh) failed++;
  console.log(`${okFresh ? '✓' : '✗'} раскладка «из коробки»: 5 карточек, «План дня» первым → ${fresh.order.join(',')}`);

  const migrated = normalizeHomeLayoutValue({ order: ['water', 'food', 'weight'], visible: { water: true, food: true, weight: true } });
  const okMig = migrated.order.join(',') === 'day-plan,day-mood,water,food,weight'
    && migrated.visible['day-plan'] === true;
  if (!okMig) failed++;
  console.log(`${okMig ? '✓' : '✗'} миграция раскладки: новые карточки в начале → ${migrated.order.join(',')}`);

  const hidden = normalizeHomeLayoutValue({ order: ['water', 'food', 'weight'], visible: { 'day-checklist': false, 'game-tasks': false } });
  const okHidden = hidden.visible['day-plan'] === false && hidden.visible['day-mood'] === true;
  if (!okHidden) failed++;
  console.log(`${okHidden ? '✓' : '✗'} скрыты обе старые карточки → скрыт и «План дня» → day-plan=${hidden.visible['day-plan']}`);

  // 0.3.11: старые id (day-checklist/game-tasks) переводятся на объединённую карточку
  const legacy = normalizeHomeLayoutValue({ order: ['day-checklist', 'water', 'game-tasks', 'food', 'weight'] });
  const okLegacy = legacy.order.join(',') === 'day-mood,day-plan,water,food,weight';
  if (!okLegacy) failed++;
  console.log(`${okLegacy ? '✓' : '✗'} старые id порядка карточек переезжают на «План дня» → ${legacy.order.join(',')}`);
}

// 0.3.8: медали — 4 группы (привычки, бег ≈, шаги ≈, вес), цели внутри значка
{
  const { computeGameMedals, medalBadgeSvg } = require('./app.js');
  const groups = computeGameMedals();
  const okGroups = Array.isArray(groups) && groups.length === 4
    && groups.flatMap((g) => g.medals).length === 16
    && groups.flatMap((g) => g.medals).every((m) => m.badgeText && typeof m.earned === 'boolean');
  if (!okGroups) failed++;
  console.log(`${okGroups ? '✓' : '✗'} медали: 4 группы × всего 16 медалей → групп=${groups.length}, медалей=${groups.flatMap((g) => g.medals).length}`);
  const svg = medalBadgeSvg({ id: 'run-5', badgeText: '5', earned: true });
  const okSvg = /<svg/u.test(svg) && />5</u.test(svg);
  if (!okSvg) failed++;
  console.log(`${okSvg ? '✓' : '✗'} значок медали: цель 5 внутри SVG`);
}

// 0.3.9: чек-ин сна — длительность с переходом через полночь, соблюдение режима
{
  const { computeSleepDurationMin, evaluateSleepOnSchedule, getSleepCheckinSummary } = require('./app.js');
  const d = computeSleepDurationMin('23:30', '07:10');
  const ok1 = d === 460;
  if (!ok1) failed++;
  console.log(`${ok1 ? '✓' : '✗'} сон 23:30 → 07:10 = ${d} мин (ждали 460)`);
  const ok2 = computeSleepDurationMin('12:00', '12:20') === null // 20 мин — не сон
    && computeSleepDurationMin('23:00', '17:00') === null // >16 ч — ошибка ввода
    && computeSleepDurationMin('', '07:00') === null;
  if (!ok2) failed++;
  console.log(`${ok2 ? '✓' : '✗'} странные/пустые времена честно отклоняются`);
  const ok3 = evaluateSleepOnSchedule('23:25', '07:05', '23:30', '07:00') === true
    && evaluateSleepOnSchedule('00:30', '07:00', '23:30', '07:00') === false // лёг на час позже
    && evaluateSleepOnSchedule('23:30', null, '23:30', '07:00') === null;
  if (!ok3) failed++;
  console.log(`${ok3 ? '✓' : '✗'} «в режиме» считается по ±30 мин от целей отбоя/подъёма`);
  const ok4 = getSleepCheckinSummary(7) === null; // пустой журнал → нет сводки (не выдумываем)
  if (!ok4) failed++;
  console.log(`${ok4 ? '✓' : '✗'} пустой журнал сна → сводки нет (честно)`);
}

// 0.3.10: настраиваемое «утреннее окно» показа диалога сна (по умолчанию 05:00–12:00)
{
  const { isSleepWindowNow } = require('./app.js');
  const at = (h, m) => new Date(2026, 7, 6, h, m, 0);
  const ok1 = isSleepWindowNow(at(4, 59), '05:00', '12:00') === false
    && isSleepWindowNow(at(5, 0), '05:00', '12:00') === true
    && isSleepWindowNow(at(11, 59), '05:00', '12:00') === true
    && isSleepWindowNow(at(12, 0), '05:00', '12:00') === false
    && isSleepWindowNow(at(20, 0), '05:00', '12:00') === false;
  if (!ok1) failed++;
  console.log(`${ok1 ? '✓' : '✗'} окно сна по умолчанию [05:00, 12:00) — границы соблюдены`);
  const ok2 = isSleepWindowNow(at(23, 30), '22:00', '02:00') === true  // окно через полночь
    && isSleepWindowNow(at(1, 15), '22:00', '02:00') === true
    && isSleepWindowNow(at(2, 0), '22:00', '02:00') === false
    && isSleepWindowNow(at(12, 0), '22:00', '02:00') === false;
  if (!ok2) failed++;
  console.log(`${ok2 ? '✓' : '✗'} окно сна с переходом через полночь (22:00–02:00)`);
  const ok3 = isSleepWindowNow(at(7, 0), '07:00', '07:00') === false      // равные границы = окна нет
    && isSleepWindowNow(at(7, 0), 'ab:cd', '12:00') === false             // мусор вместо времени
    && isSleepWindowNow('не дата', '05:00', '12:00') === false;
  if (!ok3) failed++;
  console.log(`${ok3 ? '✓' : '✗'} равные/битые границы окна честно отклоняются`);
}

// 0.3.12: онбординг — минимум 3 экрана, каждый с эмодзи, заголовком и живым текстом
{
  const { ONBOARDING_SLIDES } = require('./app.js');
  const ok1 = Array.isArray(ONBOARDING_SLIDES) && ONBOARDING_SLIDES.length >= 3;
  if (!ok1) failed++;
  console.log(`${ok1 ? '✓' : '✗'} онбординг: экранов ${(ONBOARDING_SLIDES || []).length} (минимум 3)`);
  const ok2 = ONBOARDING_SLIDES.every((s) => s && typeof s.emoji === 'string' && s.emoji.trim().length > 0
    && typeof s.title === 'string' && s.title.trim().length >= 5
    && typeof s.text === 'string' && s.text.length >= 40 && s.text.length <= 260);
  if (!ok2) failed++;
  console.log(`${ok2 ? '✓' : '✗'} онбординг: у каждого экрана эмодзи + заголовок + текст 40–260 зн.`);
}

// 0.3.14: темы оформления — стандарт плюс два стиля, корректные id
{
  const { PALETTES } = require('./app.js');
  const ids = (PALETTES || []).map((p) => p && p.id);
  const ok = ids.length === 5 && ids[0] === 'standard' && ids.includes('neon') && ids.includes('sport')
    && ids.includes('forest') && ids.includes('berry')
    && (PALETTES || []).every((p) => typeof p.label === 'string' && p.label.length >= 3);
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} палитры (5): стандарт + neon + sport + forest + berry, у всех подписи → ${ids.join(',')}`);
}

// 0.3.18: задание «3 записи питания» = ПРИЁМЫ ПИЩИ (завтрак/обед/ужин),
// а не число продуктов (кейс пользователя: йогурт+бутерброд+банан в один
// завтрак давали «3 записи»)
{
  const { computeMealsEatenToday } = require('./app.js');
  const once = computeMealsEatenToday([
    { name: 'Йогурт', mealTypeId: 'breakfast' },
    { name: 'Бутерброд', mealTypeId: 'breakfast' },
    { name: 'Банан', mealTypeId: 'breakfast' }
  ]) === 1;
  if (!once) failed++;
  console.log(`${once ? '✓' : '✗'} три продукта одного завтрака = 1 приём пищи`);

  const full = computeMealsEatenToday([
    { name: 'Каша', mealTypeId: 'breakfast' },
    { name: 'Суп', mealTypeId: 'lunch' },
    { name: 'Курица', mealTypeId: 'dinner' }
  ]) === 3;
  if (!full) failed++;
  console.log(`${full ? '✓' : '✗'} завтрак + обед + ужин = 3 приёма пищи`);

  const snacks = computeMealsEatenToday([
    { name: 'Яблоко', mealTypeId: 'snack' },
    { name: 'Орехи', mealTypeId: 'lateSnack' },
    { name: 'Что-то своё', mealTypeId: 'custom-123' },
    { name: 'Без типа', mealTypeId: null }
  ]) === 0;
  if (!snacks) failed++;
  console.log(`${snacks ? '✓' : '✗'} перекусы/свои типы/без типа прогресс задания не дают`);
}

// 0.3.15: «Марафонец» — только бег (кардио); силовая и прогулка не считаются
{
  const { computeMaxCardioDayMinutes } = require('./app.js');
  const m = computeMaxCardioDayMinutes([
    { type: 'cardio', date: '2026-08-01', durationMinutes: 40 },
    { type: 'cardio', date: '2026-08-01', durationMinutes: 25 }, // тот же день → 65 суммарно
    { type: 'strength', date: '2026-08-02', durationMinutes: 90 }, // силовая — НЕ бег
    { type: 'walk', date: '2026-08-03', durationMinutes: 120 }     // прогулка — НЕ бег
  ]);
  const ok1 = m.value === 65 && m.date === '2026-08-01';
  if (!ok1) failed++;
  console.log(`${ok1 ? '✓' : '✗'} «Марафонец»: две пробежки за день суммируются, силовая/прогулка игнорятся → ${m.value} мин`);
  const m2 = computeMaxCardioDayMinutes([{ type: 'strength', date: '2026-08-02', durationMinutes: 90 }]);
  const ok2 = m2.value === 0 && m2.date === null;
  if (!ok2) failed++;
  console.log(`${ok2 ? '✓' : '✗'} «Марафонец»: день только из силовой медали не даёт`);
}

// ---- Локальный эксперт 2.0 (0.3.24): связи сон/вода/активность ↔ самочувствие/калории ----
{
  // 3 коротких ночи (хуже дни) + 3 длинных (лучше дни): все четыре связи должны сработать
  const daily = [
    { date: '2026-08-01', mood: 2, foodTotal: 2500, waterTotal: 1000, waterGoal: 2500, activityMinutes: 0 },
    { date: '2026-08-02', mood: 2, foodTotal: 2400, waterTotal: 900,  waterGoal: 2500, activityMinutes: 0 },
    { date: '2026-08-03', mood: 3, foodTotal: 2600, waterTotal: 1100, waterGoal: 2500, activityMinutes: 0 },
    { date: '2026-08-04', mood: 4, foodTotal: 1800, waterTotal: 2800, waterGoal: 2500, activityMinutes: 35 },
    { date: '2026-08-05', mood: 5, foodTotal: 1700, waterTotal: 3000, waterGoal: 2500, activityMinutes: 40 },
    { date: '2026-08-06', mood: 4, foodTotal: 1900, waterTotal: 2600, waterGoal: 2500, activityMinutes: 30 }
  ];
  const sleep = [
    { date: '2026-08-01', durationMin: 330 }, { date: '2026-08-02', durationMin: 350 }, { date: '2026-08-03', durationMin: 360 },
    { date: '2026-08-04', durationMin: 470 }, { date: '2026-08-05', durationMin: 480 }, { date: '2026-08-06', durationMin: 460 }
  ];
  const ins = buildExpertInsights({ daily, sleep });
  const titles = ins.map((i) => i.title);
  const okAll = ['Сон и самочувствие', 'Сон и аппетит', 'Вода и самочувствие', 'Активность и самочувствие']
    .every((t) => titles.includes(t));
  if (!okAll) failed++;
  console.log(`${okAll ? '✓' : '✗'} эксперт: все 4 связи найдены (сон→самочувствие/аппетит, вода/активность→самочувствие)`);
  const kcalIns = ins.find((i) => i.title === 'Сон и аппетит');
  const okKcal = kcalIns && kcalIns.text.includes('2500') && kcalIns.text.includes('1800') && kcalIns.text.includes('700');
  if (!okKcal) failed++;
  console.log(`${okKcal ? '✓' : '✗'} эксперт: сон→аппетит считает верно (2500 против 1800, +700 ккал)`);

  // Мало данных (по 2 дня в группе): никаких выводов — правдивость важнее
  const insFew = buildExpertInsights({ daily: daily.slice(0, 4), sleep: sleep.slice(0, 4) });
  const okFew = Array.isArray(insFew) && insFew.length === 0;
  if (!okFew) failed++;
  console.log(`${okFew ? '✓' : '✗'} эксперт: при < 3 дней в группе — честный отказ от выводов`);

  // Без разницы между днями — связей быть не должно
  const flat = [0, 1, 2, 3, 4, 5].map((i) => ({
    date: '2026-08-0' + (i + 1), mood: 4, foodTotal: 2000,
    waterTotal: 2500, waterGoal: 2500, activityMinutes: 20
  }));
  const insFlat = buildExpertInsights({ daily: flat, sleep });
  const okFlat = insFlat.length === 0;
  if (!okFlat) failed++;
  console.log(`${okFlat ? '✓' : '✗'} эксперт: ровные дни без разницы → никаких ложных связей`);

  // Устойчивость к мусору на входе
  const okJunk = buildExpertInsights(null).length === 0 && buildExpertInsights({}).length === 0
    && buildExpertInsights({ daily: [{}], sleep: [{ date: 'бред', durationMin: 'x' }] }).length === 0;
  if (!okJunk) failed++;
  console.log(`${okJunk ? '✓' : '✗'} эксперт: пустой/битый вход → пустой результат без падения`);
}

// ---- Личная база продуктов (0.3.25): свои значения перекрывают общую базу ----
{
  // Свой продукт, граммовка
  const r1 = addCustomFood({ name: 'протеиновый батончик фитнес', kcal: 350, p: 30, f: 9, c: 28 });
  const p1 = parseMealText('протеиновый батончик фитнес 50 г')[0];
  const ok1 = r1.ok && p1 && p1.name === 'протеиновый батончик фитнес' && p1.kcal === 175 && p1.grams === 50 && p1.p === 15;
  if (!ok1) failed++;
  console.log(`${ok1 ? '✓' : '✗'} свой продукт: 50 г «протеинового батончика» → 175 ккал, БЖУ из своих данных`);

  // Перекрытие общей базы: своё «яблоко» важнее усреднённого
  const r2 = addCustomFood({ name: 'яблоко', kcal: 120 });
  const p2 = parseMealText('яблоко 100 г')[0];
  const ok2 = r2.ok && p2 && p2.kcal === 120;
  if (!ok2) failed++;
  console.log(`${ok2 ? '✓' : '✗'} свой продукт перекрывает общую базу («яблоко» = 120, не усреднённые 52)`);

  // Штучный продукт со своим весом штуки
  const r3 = addCustomFood({ name: 'сырник домашний', kcal: 220, pieceG: 60 });
  const p3 = parseMealText('2 сырника домашних')[0];
  const ok3 = r3.ok && p3 && p3.grams === 120 && p3.kcal === 264;
  if (!ok3) failed++;
  console.log(`${ok3 ? '✓' : '✗'} свой вес штуки: «2 сырника домашних» → 120 г / 264 ккал (не 70 г/шт)`);

  // Замена по тому же названию = обновление с новой упаковки
  addCustomFood({ name: 'протеиновый батончик фитнес', kcal: 300 });
  const p4 = parseMealText('протеиновый батончик фитнес 100 г')[0];
  const ok4 = p4 && p4.kcal === 300;
  if (!ok4) failed++;
  console.log(`${ok4 ? '✓' : '✗'} повторное сохранение того же продукта — замена значений`);

  // Валидация: мусор не сохраняется
  const ok5 = !addCustomFood({ name: 'x', kcal: 100 }).ok
    && !addCustomFood({ name: 'норм название', kcal: 0 }).ok
    && !addCustomFood({ name: 'норм название', kcal: 901 }).ok;
  if (!ok5) failed++;
  console.log(`${ok5 ? '✓' : '✗'} валидация: короткое имя / 0 ккал / >900 ккал отклоняются`);

  // Удаление возвращает общую базу (в базе яблоко = 89 ккал за шт ~180 г)
  const rmOk = removeCustomFood(r2.item.id) && parseMealText('яблоко 100 г')[0].kcal === 89;
  if (!rmOk) failed++;
  console.log(`${rmOk ? '✓' : '✗'} удаление своего «яблока» — снова значение общей базы (89 ккал)`);
  // Очистка за собой, чтобы не влиять на остальные тесты
  removeCustomFood(r1.item.id);
  removeCustomFood(r3.item.id);
}

// ---- Виды приготовления (0.3.27): жареная/варёная ≠ обычная ----
{
  const cooking = [
    ['жареная курица', 'курица жареная', 213],
    ['жареная курица 150 г', 'курица жареная', 320],
    ['варёная курица', 'курица вареная', 150],
    ['отварная курица', 'отварная курица', 150],
    ['жареная грудка', 'грудка жареная', 187],
    ['жареная куриная грудка', 'куриная грудка жареная', 187],
    ['свинина жареная 100 г', 'свинина жареная', 318],
    ['свинина вареная 100 г', 'свинина вареная', 350],
    ['курица', 'курица', 165]
  ];
  let cookingOk = true;
  for (const [text, name, kcal] of cooking) {
    const r = parseMealText(text)[0];
    if (!r || r.name !== name || r.kcal !== kcal) { cookingOk = false; console.log('  ✗ промах:', text, '→', r && r.name, r && r.kcal); }
  }
  if (!cookingOk) failed++;
  console.log(`${cookingOk ? '✓' : '✗'} виды приготовления: жареная/варёная курица-свинина отличаются, простая «курица» не тронута`);
  // Регресс: старые жареные/варёные ключи на месте
  const regOk = parseMealText('говядина вареная')[0]?.kcal === 175 && parseMealText('жареной картошки')[0]?.name === 'жареный картофель';
  if (!regOk) failed++;
  console.log(`${regOk ? '✓' : '✗'} виды приготовления: регресс (говядина вареная, жареная картошка)`);
}

// ---- OFF-разбор ответа (0.3.27): чистая функция по штрих-коду ----
{
  const full = parseOffProduct({ status: 1, product: { product_name_ru: 'Творог зерновой 5%', product_quantity: '150',
    nutriments: { 'energy-kcal_100g': 105, proteins_100g: 12.7, fat_100g: 5, carbohydrates_100g: 1.8 } } });
  const okFull = full && full.name === 'творог зерновой 5%' && full.kcal === 105 && full.p === 12.7 && full.pieceG === 150;
  if (!okFull) failed++;
  console.log(`${okFull ? '✓' : '✗'} OFF-разбор: полный ответ → имя, ккал, БЖУ, вес упаковки`);
  const kj = parseOffProduct({ status: 1, product: { product_name: 'Bar', nutriments: { energy_100g: 837 } } });
  const okKj = kj && kj.kcal === 200 && kj.p === null;
  if (!okKj) failed++;
  console.log(`${okKj ? '✓' : '✗'} OFF-разбор: только кДж → пересчёт в ккал (837 кДж ≈ 200)`);
  const okJunk = parseOffProduct(null) === null && parseOffProduct({ status: 0 }) === null
    && parseOffProduct({ status: 1, product: { product_name: 'x' } }) === null
    && parseOffProduct({ status: 1, product: { product_name: 'x', nutriments: { 'energy-kcal_100g': 5000 } } }) === null;
  if (!okJunk) failed++;
  console.log(`${okJunk ? '✓' : '✗'} OFF-разбор: не найден / без ккал / мусор → честный отказ без формы`);
}

// ---- Пометка «🏷 ваши значения» в разборе (0.3.28) ----
{
  const rTag = addCustomFood({ name: 'творог фермерский тест', kcal: 140, p: 16, f: 5, c: 3 });
  const tagged = parseMealText('творог фермерский тест 200 г')[0];
  const okTag = tagged && tagged.custom === true && tagged.kcal === 280
    && describeFoodItemLine(tagged).includes('🏷 ваши значения');
  if (!okTag) failed++;
  console.log(`${okTag ? '✓' : '✗'} разбор помечает свой продукт: «200 г → 280 ккал · 🏷 ваши значения»`);
  const plain = parseMealText('курица 100 г')[0];
  const okPlain = plain && !plain.custom && !describeFoodItemLine(plain).includes('🏷');
  if (!okPlain) failed++;
  console.log(`${okPlain ? '✓' : '✗'} обычный продукт базы — без пометки`);
  removeCustomFood(rTag.item.id);
}

// ---- Эксперт 2.1 (0.3.29): пакет фактов прогресса ----
{
  const lines = buildProgressAnswer({
    today: { waterTotal: 1500, waterGoal: 2500, foodTotal: 1800, foodGoal: 2000, foodP: 85, activityMinutes: 30, mood: 4 },
    week: { days: 5, kcalAvg: 1900, waterPctAvg: 72, moodAvg: 3.8, sleepAvgMin: 425 },
    insights: ['😴 Сон и самочувствие: после сна < 7 ч ниже']
  });
  const okFull = lines.length === 3
    && lines[0].includes('1500 из 2500 мл (60%)') && lines[0].includes('1800 из 2000 ккал (90%)')
    && lines[0].includes('белок 85 г') && lines[0].includes('4/5')
    && lines[1].includes('1900 ккал/день') && lines[1].includes('7 ч 05 мин')
    && lines[2].includes('Сон и самочувствие');
  if (!okFull) failed++;
  console.log(`${okFull ? '✓' : '✗'} эксперт 2.1: день/неделя/связи собираются с верными числами`);
  const few = buildProgressAnswer({ today: { waterTotal: 0, waterGoal: 2500, foodTotal: 0, foodGoal: 2000 }, week: { days: 1 } });
  const okFew = few.length === 1 && few[0].includes('ещё не оценено') && !few.join('').includes('В среднем');
  if (!okFew) failed++;
  console.log(`${okFew ? '✓' : '✗'} эксперт 2.1: мало данных — только честный день, без недели и выдумок`);
  const okJunk = Array.isArray(buildProgressAnswer(null)) && buildProgressAnswer(null).length === 0
    && buildProgressAnswer({}).length === 0;
  if (!okJunk) failed++;
  console.log(`${okJunk ? '✓' : '✗'} эксперт 2.1: мусор на входе → пусто без падения`);
}

// ---- 0.3.30: граммовые спутники через «с» (кейс пользователя «гречка с тушёнкой» — гречка молча пропадала) ----
{
  const g = parseMealText('гречка с тушёнкой');
  const okG = g.length === 2 && g[0].name === 'гречка вареная' && Math.round(g[0].kcal) === 110
    && g[1].name === 'тушенка' && g[1].amount === 100 && Math.round(g[1].kcal) === 214;
  if (!okG) failed++;
  console.log(`${okG ? '✓' : '✗'} «гречка с тушёнкой» → гречка ВАРЁНАЯ 110 + тушёнка 100 г/214 (не сухая крупа, ничего не роняем)`);
  const m = parseMealText('макароны с сыром');
  const okM = m.length === 2 && m[0].name === 'макароны' && m[1].name === 'сыр'
    && m[1].amount === 25 && Math.round(m[1].kcal) === 88;
  if (!okM) failed++;
  console.log(`${okM ? '✓' : '✗'} «макароны с сыром» → макароны + сыр ≈25 г/88 (не «100 г сыра»)`);
  const k = parseMealText('каша с маслом');
  const okK = k.length === 2 && k[0].name === 'каша' && Math.round(k[0].kcal) === 95
    && k[1].amount === 10 && Math.round(k[1].kcal) === 72;
  if (!okK) failed++;
  console.log(`${okK ? '✓' : '✗'} «каша с маслом» → каша + масло ≈10 г/72 (не «100 г масла»)`);
  const t = parseMealText('чай с сахаром');
  const okT = t.length === 1 && t[0].name === 'чай с сахаром' && Math.round(t[0].kcal) === 40;
  if (!okT) failed++;
  console.log(`${okT ? '✓' : '✗'} «чай с сахаром» → кураторский ключ базы 40 ккал/чашка (сплит не нужен, пара кураторская)`);
  const milk = parseMealText('каша с молоком');
  const okMilk = milk.length === 1 && milk[0].name === 'каша с молоком' && Math.round(milk[0].kcal) === 100;
  if (!okMilk) failed++;
  console.log(`${okMilk ? '✓' : '✗'} «каша с молоком» → кураторский ключ 100 (одно блюдо, не «молоко 60»)`);
  const ovs = parseMealText('овсянка с молоком');
  const okOvs = ovs.length === 1 && ovs[0].name === 'овсянка с молоком' && Math.round(ovs[0].kcal) === 100;
  if (!okOvs) failed++;
  console.log(`${okOvs ? '✓' : '✗'} «овсянка с молоком» → 100 (ранее падало в «овсяное молоко» 47)`);
  // Регрессии семейства «с»:
  const s = parseMealText('картошка с сосиской');
  const okS = s.length === 2 && s[1].name === 'сосиска' && s[1].unit === 'шт';
  if (!okS) failed++;
  console.log(`${okS ? '✓' : '✗'} регрессия: «картошка с сосиской» — штучный спутник 1 шт на месте`);
  const rc = parseMealText('рис с курицей');
  const okRc = rc.length === 1 && rc[0].name === 'рис с курицей';
  if (!okRc) failed++;
  console.log(`${okRc ? '✓' : '✗'} регрессия: «рис с курицей» — кураторская пара не разделяется`);
  const butter = parseMealText('бутерброд с сыром');
  const okB = butter.length === 1 && butter[0].name === 'бутерброд с сыром';
  if (!okB) failed++;
  console.log(`${okB ? '✓' : '✗'} регрессия: «бутерброд с сыром» — одно блюдо`);
  // Вся фраза пользователя целиком:
  const full = parseMealText('Варёная курица, жареная курица, гречка с тушёнкой, два куска белого хлеба, стакан газировки');
  const names = full.map((i) => i.name);
  const okFull = full.length === 6 && names.includes('курица вареная') && names.includes('курица жареная')
    && names.includes('гречка вареная') && names.includes('тушенка') && names.includes('белый хлеб') && names.includes('газировка');
  if (!okFull) failed++;
  console.log(`${okFull ? '✓' : '✗'} фраза пользователя целиком → 6 позиций (${names.join(' · ')})`);
}

// ---- 0.3.30: ведущая ёмкость без цифры («стакан кефира») ----
{
  const glass = parseMealText('стакан газировки');
  const okGlass = glass.length === 1 && glass[0].unit === 'стакан' && Math.round(glass[0].kcal) === 105;
  if (!okGlass) failed++;
  console.log(`${okGlass ? '✓' : '✗'} «стакан газировки» → 1 стакан/105 (ранее молчаливое «≈100 г:42»)`);
  const kef = parseMealText('стакан кефира');
  const okKef = kef.length === 1 && kef[0].unit === 'стакан' && Math.round(kef[0].kcal) === 100;
  if (!okKef) failed++;
  console.log(`${okKef ? '✓' : '✗'} «стакан кефира» → 1 стакан/100`);
  const bowl = parseMealText('тарелка супа');
  const okBowl = bowl.length === 1 && bowl[0].unit === 'тарелка' && Math.round(bowl[0].kcal) === 113;
  if (!okBowl) failed++;
  console.log(`${okBowl ? '✓' : '✗'} регрессия: «тарелка супа» по-прежнему 1 тарелка/113`);
}

// ---- 0.3.30: облачные ошибки — человеческий 402, регрессии прочих веток ----
{
  const e402 = cloudErrorText(new Error('HTTP 402: {"error":{"message":"Payment Required"}}'));
  const ok402 = e402.includes('402') && /баланс|тариф/i.test(e402) && !/неизвестная/i.test(e402);
  if (!ok402) failed++;
  console.log(`${ok402 ? '✓' : '✗'} cloudErrorText: 402 → честное «баланс/тариф провайдера», не голый код`);
  const ok429 = cloudErrorText('HTTP 429: too many requests').includes('лимит запросов');
  const okNet = cloudErrorText(new TypeError('Failed to fetch')).includes('Нет соединения');
  const ok500 = cloudErrorText('HTTP 500: boom').includes('500');
  const okBranches = ok429 && okNet && ok500;
  if (!okBranches) failed++;
  console.log(`${okBranches ? '✓' : '✗'} cloudErrorText: ветки 429/нет сети/500 не сломаны новой 402`);
}

// ---- 0.3.30: «Мой курс» — чистая модель ----
{
  // Нормализация времени: сортировка, дедупликация, валидация формата.
  const times = normalizeCourseTimes(['20:00', '08:00', '08:00', 'утром', '24:00', '9:30']);
  const okTimes = times.join(',') === '08:00,20:00'; // «9:30» без ведущего нуля отклоняем — строгий ЧЧ:ММ
  if (!okTimes) failed++;
  console.log(`${okTimes ? '✓' : '✗'} курс: время нормализуется (сортировка + дедуп + формат ЧЧ:ММ)`);
  // Отказ на мусоре — короткое имя, пустое/битое время, без даты старта.
  const okBad = normalizeCourse({ name: 'А', times: ['08:00'], startDate: '2026-08-01' }) === null
    && normalizeCourse({ name: 'Витамин D', times: [], startDate: '2026-08-01' }) === null
    && normalizeCourse({ name: 'Витамин D', times: ['вечером'], startDate: '2026-08-01' }) === null
    && normalizeCourse({ name: 'Витамин D', times: ['08:00'] }) === null
    && normalizeCourse(null) === null;
  if (!okBad) failed++;
  console.log(`${okBad ? '✓' : '✗'} курс: мусор на входе → честный отказ без записи`);
  // Счётчик дня и окно активности.
  const c = normalizeCourse({ name: 'Витамин D', times: ['08:00', '20:00'], daysTotal: 30, startDate: '2026-08-01' });
  const okWin = c && courseDayNumber(c, '2026-08-12') === 12
    && isCourseActiveOn(c, '2026-08-01') && isCourseActiveOn(c, '2026-08-30')
    && !isCourseActiveOn(c, '2026-08-31') && !isCourseActiveOn(c, '2026-07-31')
    && courseDayLabel(c, '2026-08-12') === 'день 12 из 30';
  if (!okWin) failed++;
  console.log(`${okWin ? '✓' : '✗'} курс: «день 12 из 30», окно активности по датам честное`);
  // Бессрочный курс.
  const endless = normalizeCourse({ name: 'Омега-3', times: ['08:00'], daysTotal: 0, startDate: '2026-01-01' });
  const okEndless = endless && endless.daysTotal === 0 && isCourseActiveOn(endless, '2027-01-01')
    && courseDayLabel(endless, '2026-01-10') === 'день 10';
  if (!okEndless) failed++;
  console.log(`${okEndless ? '✓' : '✗'} курс: длительность 0 = «пока не остановлю», активен всегда`);
  // Отметки: нормализация журнала + живой тумблер в состоянии (с уборкой за собой).
  const withLog = normalizeCourse({ name: 'Креатин', times: ['08:00', '20:00'], daysTotal: 0, startDate: '2026-08-01',
    checkLog: { '2026-08-07': [1, 0, 0, 9, -1], 'плохая дата': [0] } });
  const doses = courseDosesForDate(withLog, '2026-08-07');
  const okLog = withLog && doses.length === 2 && doses[0].done === true && doses[1].done === true
    && !('плохая дата' in withLog.checkLog);
  if (!okLog) failed++;
  console.log(`${okLog ? '✓' : '✗'} курс: журнал отметок — дедуп, отсев индексов вне приёмов и битых дат`);
  const added = addCourse({ name: 'Тестовый курс xx', times: ['08:00', '20:00'], daysTotal: 30 });
  const t1 = toggleCourseDose(added.item.id, 0);
  const t2 = toggleCourseDose(added.item.id, 0);
  const okToggle = added.ok && t1 && t2
    && toggleCourseDose(added.item.id, 5) === false
    && toggleCourseDose('нет-такого-id', 0) === false;
  if (!okToggle) failed++;
  console.log(`${okToggle ? '✓' : '✗'} курс: тумблер приёма ставит/снимает отметку, мусор отклоняется`);
  removeCourse(added.item.id);
  const okUpd = addCourse({ name: 'Тестовый курс yy', times: ['08:00'], daysTotal: 10 });
  const upd = updateCourse(okUpd.item.id, { name: 'Тестовый курс yy', times: ['09:00', '21:00'], daysTotal: 20 });
  const okUpdOk = upd.ok && upd.item.times.join(',') === '09:00,21:00' && upd.item.daysTotal === 20
    && upd.item.startDate === okUpd.item.startDate
    && updateCourse('нет-такого-id', { name: 'Х', times: ['08:00'] }).ok === false;
  if (!okUpdOk) failed++;
  console.log(`${okUpdOk ? '✓' : '✗'} курс: правка меняет время/дни, дату старта и отметки не трогает`);
  removeCourse(okUpd.item.id);
}

// ---- 0.3.31: яичные блюда «из N яиц» (кейс: «глазунья из двух яиц» теряла число) ----
{
  const g = parseMealText('глазунья из двух яиц');
  const okG = g.length === 1 && g[0].name === 'глазунья' && g[0].amount === 120 && Math.round(g[0].kcal) === 216;
  if (!okG) failed++;
  console.log(`${okG ? '✓' : '✗'} «глазунья из двух яиц» → 2×60 г = 120 г/216 ккал (было «100 г»)`);
  const o = parseMealText('омлет из трёх яиц');
  const okO = o.length === 1 && o[0].name === 'омлет' && o[0].amount === 240 && Math.round(o[0].kcal) === 372;
  if (!okO) failed++;
  console.log(`${okO ? '✓' : '✗'} «омлет из трёх яиц» → 3×80 г = 240 г/372 ккал (омлет с молоком)`);
  const y = parseMealText('яичница из 2 яиц');
  const okY = y.length === 1 && y[0].amount === 120;
  if (!okY) failed++;
  console.log(`${okY ? '✓' : '✗'} «яичница из 2 яиц» (цифрой) → 120 г`);
  const bare = parseMealText('глазунья');
  const okBare = bare.length === 1 && bare[0].amount == null && Math.round(bare[0].kcal) === 180;
  if (!okBare) failed++;
  console.log(`${okBare ? '✓' : '✗'} регрессия: просто «глазунья» — по-прежнему ≈100 г/180`);
}

// ---- 0.3.31: честный кусок колбасы (кейс: «3 куска варёной» → 300 г/780 ккал) ----
{
  const c = parseMealText('три куска варёной колбасы');
  const okC = c.length === 1 && c[0].name === 'вареная колбаса' && c[0].amount === 3
    && Math.round(c[0].grams) === 135 && Math.round(c[0].kcal) === 351;
  if (!okC) failed++;
  console.log(`${okC ? '✓' : '✗'} «три куска варёной колбасы» → 3×45 г = 135 г/351 (было 300 г/780)`);
  const v = parseMealText('кусок ветчины');
  const okV = v.length === 1 && Math.round(v[0].grams) === 45 && Math.round(v[0].kcal) === 65;
  if (!okV) failed++;
  console.log(`${okV ? '✓' : '✗'} «кусок ветчины» → 45 г/65`);
  const h = parseMealText('два куска белого хлеба');
  const okH = h.length === 1 && Math.round(h[0].grams) === 80 && Math.round(h[0].kcal) === 212;
  if (!okH) failed++;
  console.log(`${okH ? '✓' : '✗'} регрессия: хлебные веса не тронуты (2×40 г = 80 г/212)`);
  // Вся фраза пользователя целиком (0.3.31): 6 позиций
  const full = parseMealText('Глазунья из двух яиц, один помидор, один огурец, два куска хлеба, три куска варёной колбасы, кофе');
  const names = full.map((i) => i.name);
  const okFull = full.length === 6 && names.includes('глазунья') && names.includes('помидор')
    && names.includes('огурец') && names.includes('хлеб') && names.includes('вареная колбаса') && names.includes('кофе')
    && Math.round(full[0].kcal) === 216 && Math.round(full[4].kcal) === 351;
  if (!okFull) failed++;
  console.log(`${okFull ? '✓' : '✗'} фраза пользователя целиком → 6 позиций, глазунья 216, колбаса 351`);
}

// ---- 0.3.31: локальный ИИ — дремлющая проверка готовности (node: модуля нет) ----
{
  const okLlm = canUseLocalLlm() === false; // без нативного модуля строго false
  if (!okLlm) failed++;
  console.log(`${okLlm ? '✓' : '✗'} canUseLocalLlm без нативного моста → честное false (режим недоступен)`);
}

// ---- 0.3.32: суп с добавкой «со/с» (кейс: «щи со свининой» превращались в «свинина 100 г», щи пропадали) ----
{
  const s = parseMealText('щи со свининой');
  const okS = s.length === 2 && s[0].name === 'щи' && s[0].grams === SOUP_PORTION_GRAMS
    && Math.round(s[0].kcal) === 93 && s[0].approx === true && /тарелка/.test(s[0].note)
    && s[1].name === 'свинина' && s[1].grams === SOUP_MEAT_GRAMS && Math.round(s[1].kcal) === 130
    && s[1].approx === true && /добавки в супе/.test(s[1].note);
  if (!okS) failed++;
  console.log(`${okS ? '✓' : '✗'} «щи со свининой» → щи ≈300 г/93 + свинина ≈50 г/130 (обе с пометкой оценки, было: только свинина 259)`);
  const b = parseMealText('борщ со сметаной');
  const okB = b.length === 2 && b[0].name === 'борщ' && b[0].grams === 300
    && b[1].name === 'сметана' && b[1].grams === 20; // приправы — по карте COMPANION_GRAMS, а не «мясо 50 г»
  if (!okB) failed++;
  console.log(`${okB ? '✓' : '✗'} «борщ со сметаной» → борщ 300 г + сметана по карте приправ ≈20 г (не 50 г)`);
  const g = parseMealText('щи');
  const okG = g.length === 1 && g[0].name === 'щи' && g[0].grams === 300 && g[0].approx === true && Math.round(g[0].kcal) === 93;
  if (!okG) failed++;
  console.log(`${okG ? '✓' : '✗'} голый суп «щи» — честная тарелка ≈300 г/93 (было ≈100 г/31, как щепотка)`);
  const d = parseMealText('щи 250 г');
  const okD = d.length === 1 && d[0].amount === 250 && d[0].unit === 'г' && !d[0].approx; // точная запись не тронута
  if (!okD) failed++;
  console.log(`${okD ? '✓' : '✗'} регрессия: «щи 250 г» — точные граммы без оценочной пометки`);
  const k = parseMealText('солянка с котлетой');
  const okK = k.length === 2 && k[0].name === 'солянка' && k[1].name === 'котлета' && k[1].perPiece === true;
  if (!okK) failed++;
  console.log(`${okK ? '✓' : '✗'} «солянка с котлетой» → суп 300 г + штучная котлета 1 шт`);
}

// ---- 0.3.32: гарантия «ничего не теряется молча» (непонятный остаток виден) ----
{
  const d1 = app => app; // читаемость
  const r = parseMealTextDetailed('щи со стекляшкой');
  const okR = r.items.length === 1 && r.items[0].name === 'щи' && r.missed.length === 1 && r.missed[0] === 'стекляшкой';
  if (!okR) failed++;
  console.log(`${okR ? '✓' : '✗'} неизвестная добавка «со стекляшкой» → суп распознан + остаток в missed (не молчим)`);
  const smart = parseSmartEntry('банан, хорькундель 300 г');
  const ok2 = smart.food.length === 1 && smart.food[0].name === 'банан'
    && Array.isArray(smart.unparsed) && smart.unparsed.join(' ').includes('хорькундель');
  if (!ok2) failed++;
  console.log(`${ok2 ? '✓' : '✗'} parseSmartEntry: «хорькундель 300 г» ушёл в unparsed, банан разобран`);
  const clean = parseSmartEntry('гречка 150 г, курица 100 г');
  const ok3 = clean.unparsed.length === 0;
  if (!ok3) failed++;
  console.log(`${ok3 ? '✓' : '✗'} регрессия: полностью понятная фраза не даёт ложных «не разобрал»`);
  const noise = parseSmartEntry('овсянка 150 г 300 ккал'); // «300 ккал» не должно стать ложным «не разобрал»
  const ok4 = noise.food.some((i) => i.name === 'овсянка');
  if (!ok4) failed++;
  console.log(`${ok4 ? '✓' : '✗'} регрессия: «овсянка 150 г 300 ккал» — овсянка разобрана`);
}

// ---- 0.3.32: вся фраза пользователя (обед 8.08) — щи на месте, ничего не потеряно ----
{
  const full = parseSmartEntry('щи со свининой, два куска чёрного хлеба, два куска белого хлеба, четыре куска колбасы, стакан газировки');
  const names = full.food.map((i) => i.name);
  const total = Math.round(full.food.reduce((sum, i) => sum + i.kcal, 0));
  const ok = full.food.length === 6 && names[0] === 'щи' && names[1] === 'свинина'
    && Math.round(full.food[0].kcal) === 93 && Math.round(full.food[1].kcal) === 130
    && total === 1242 && full.unparsed.length === 0;
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} фраза обеда целиком → 6 позиций, 1242 ккал (было: 5 позиций, 1278, щи украдены)`);
}

// ---- 0.3.32: ruForms — склонения для «Плана дня» ----
{
  const ok = ruForms(1, ['приём', 'приёма', 'приёмов']) === 'приём'
    && ruForms(2, ['приём', 'приёма', 'приёмов']) === 'приёма'
    && ruForms(5, ['приём', 'приёма', 'приёмов']) === 'приёмов'
    && ruForms(11, ['позиция', 'позиции', 'позиций']) === 'позиций'
    && ruForms(21, ['позиция', 'позиции', 'позиций']) === 'позиция';
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ruForms: 1 приём, 2 приёма, 5 приёмов, 11 позиций, 21 позиция`);
}

// ---- 0.3.38: ruUnitName + дробные формы — грамотные единицы в разборе ----
{
  const ok = ruUnitName(1, 'кусок') === 'кусок' && ruUnitName(2, 'кусок') === 'куска'
    && ruUnitName(5, 'кусок') === 'кусков' && ruUnitName(2, 'стакан') === 'стакана'
    && ruUnitName(3, 'чашка') === 'чашки' && ruUnitName(11, 'тарелка') === 'тарелок'
    && ruUnitName(0.5, 'стакан') === 'стакана' && ruUnitName(2, 'несуществующая') === 'несуществующая'
    && ruUnitName(21, 'долька') === 'долька';
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ruUnitName: 1 кусок, 2 куска, 5 кусков, 2 стакана, 3 чашки, 11 тарелок, 0,5 стакана, незнакомая — как есть`);
}

// ---- 0.4.2: честный отказ фото-детектора «нет еды» ----
{
  const t = isPhotoNoFoodAnswer;
  const ok = t('нет') && t('Нет.') && t('на фото нет еды') && t('Еды нет') && t('не вижу еды') && t('продуктов нет') && t('')
    && !t('нетто 200 г') && !t('бананы 5 шт') && !t('кальмар сушёный 70 г') && !t('борщ 300 г');
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} isPhotoNoFoodAnswer: отказы ловит любые формулировки, цифры = доверие («нетто 200 г» — не отказ)`);
}

// ---- 0.4.3: вода «бутылка» + страж правдивости ----
{
  const w = (t) => parseSmartEntry(t);
  const ok = w('бутылка воды').waterMl === 500 && w('две бутылки воды').waterMl === 1000
    && w('стакан воды').waterMl === 250 && w('вода 300 мл').waterMl === 300
    && w('две бутылки воды').waterMl === 1000;
  const guard = w('попил воды');
  const ok2 = ok && guard.waterMl === 0 && (guard.unparsed || []).join(' ').includes('попил воды')
    && w('водка 100 г').waterMl === 0
    && w('Бананы 6 шт, Кальмар сушёный 70 г, Бутылка воды').waterMl === 500;
  if (!ok2) failed++;
  console.log(`${ok2 ? '✓' : '✗'} вода: бутылка 500 мл, две — 1000; «попил воды» без объёма — честный ⚠️, «водка» не вода`);

}

// ---- 0.4.9: регресс «за вчерашний день нет данных» (normalizeDailyHistory молча обнуляла историю) ----
{
  const { normalizeDailyHistoryList } = require('./app.js');
  const list = normalizeDailyHistoryList([
    { date: '2026-08-08', waterTotal: 1500, waterGoal: 2000, foodTotal: 2100, foodGoal: 2500, foodP: 90.04, foodF: 70, foodC: 250, activityMinutes: 30, mood: 4 },
    { date: '2026-08-07', waterTotal: 800, waterGoal: 2000, foodTotal: 0, foodGoal: 2500, foodP: 0, foodF: 0, foodC: 0, activityMinutes: 0 },
    { date: '2026-08-08', waterTotal: 1800, waterGoal: 2000, foodTotal: 2200, foodGoal: 2500, foodP: 95, foodF: 72, foodC: 255, activityMinutes: 45 },
    { date: 'не-дата', waterTotal: 999 },
    null
  ]);
  const ok = list.length === 2
    && list[0].date === '2026-08-08' && list[1].date === '2026-08-07'
    && list[0].waterTotal === 1800 && list[0].foodTotal === 2200
    && list[0].mood === undefined // дедуп last-wins: поздняя запись без mood заменяет раннюю с mood
    && Math.abs(list[0].foodP - 95) < 0.01
    && list.every((d) => d.waterGoal === 2000 && d.foodGoal === 2500);
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} история дней: записи СОХРАНЯЮТСЯ, дедуп по дате (поздняя побеждает), сортировка по убыванию, мусор отсеян`);
}

// ---- 0.4.9: бутербродная композиция (полевой обед «…с маслом сыром и колбасой») ----
{
  const full = parseSmartEntry('тарелка манной каши, два бутерброда с маслом сыром и колбасой');
  const sandwich = full.food.find((i) => /бутерброд/.test(i.name));
  const okFull = full.food.length === 2 && sandwich && sandwich.amount === 2
    && /хлеб 30 г \+ масло 8 г \+ сыр 15 г \+ колбаса 15 г/.test(sandwich.note || '')
    && sandwich.kcal === 471 && sandwich.approx === true
    && full.unparsed.length === 0;
  const withCommas = parseSmartEntry('бутерброд с маслом, сыром и колбасой').food;
  const okCommas = withCommas.length === 1 && withCommas[0].kcal === 235;
  const noFalseGlue = parseSmartEntry('бутерброд с маслом, кофе с молоком');
  const okCoffee = noFalseGlue.food.length === 2
    && noFalseGlue.food.some((i) => i.name === 'кофе с молоком' && i.kcal === 20);
  const twoFill = parseSmartEntry('бутерброд с маслом и сыром').food;
  const okTwo = twoFill.length === 1 && twoFill[0].kcal === 190 && /сыр 15 г/.test(twoFill[0].note || '');
  const crab = parseSmartEntry('бутерброд с крабовыми палочками').food;
  const okCrab = crab.length === 1 && /крабовые палочки/.test(crab[0].name);
  const ham = parseSmartEntry('два бутерброда с ветчиной сыром').food;
  const okHam = ham.length === 1 && /ветчина 15 г \+ сыр 15 г/.test(ham[0].note || '') && ham[0].amount === 2;
  const okAll = okFull && okCommas && okCoffee && okTwo && okCrab && okHam;
  if (!okAll) failed++;
  console.log(`${okAll ? '✓' : '✗'} бутерброды: начинки без «и» собираются в состав (масло 8 + сыр 15 + колбаса 15 на шт), «кофе с молоком» не вклеивается, «и чай» остаётся отдельным`);
}

// ---- 0.4.10: дедуп одинаковых продуктов (полевое фото «горошек» и «зелёный горошек» → двойной счёт) ----
{
  const dup = parseSmartEntry('горошек 1 порция, зелёный горошек 1 порция');
  const okDup = dup.food.length === 1 && dup.food[0].name === 'горошек'
    && dup.food[0].amount === 2 && dup.food[0].grams === 400 && dup.food[0].kcal === 292
    && /повтор в фразе объединил \(×2\)/u.test(dup.food[0].note || '');
  const milk = parseSmartEntry('молоко 100 г, молоко 50 г');
  const okMilk = milk.food.length === 1 && milk.food[0].amount === 150 && milk.food[0].kcal === 90;
  const apple = parseSmartEntry('яблоко 1 шт, яблоко 1 шт');
  const okApple = apple.food.length === 1 && apple.food[0].amount === 2 && apple.food[0].kcal === 178;
  const distinct = parseSmartEntry('морковь 1 порция, горошек 1 порция');
  const okDistinct = distinct.food.length === 2
    && !/повтор в фразе/.test((distinct.food[0].note || '') + (distinct.food[1].note || ''));
  const photoPlate = parseSmartEntry('макароны 1 порция, курица 1 порция, горошек 1 порция, морковь 1 порция, зелёный горошек 1 порция, зелёная стручковая фасоль 1 порция');
  const okPlate = photoPlate.food.length === 5 && photoPlate.food.filter((i) => i.name === 'горошек').length === 1;
  const ok5 = okDup && okMilk && okApple && okDistinct && okPlate;
  if (!ok5) failed++;
  console.log(`${ok5 ? '✓' : '✗'} дедуп 0.4.10: одинаковые позиции суммируются с честной пометкой (горошек ×2 = 400 г 292), разные не тронуты, фото-тарелка: 5 позиций вместо 6`);
}

// ---- 0.4.11: разговорный «перец» = перец болгарский (полевой ⚠️ нашёл дыру базы) ----
{
  const pepper = parseSmartEntry('перец 40 г');
  const okPepper = pepper.food.length === 1 && pepper.food[0].name === 'перец'
    && pepper.food[0].grams === 40 && pepper.food[0].kcal === 11 && pepper.unparsed.length === 0;
  const sweet = parseSmartEntry('перец сладкий 50 г');
  const okSweet = sweet.food.length === 1 && sweet.food[0].kcal === 14;
  const full = parseSmartEntry('макароны 180 г, куриное филе 120 г, морковь 40 г, горошек 30 г, зелёный горошек 30 г, лук 30 г, перец 40 г');
  const okFull = full.unparsed.length === 0 && full.food.length === 6
    && full.food.filter((i) => i.name === 'горошек').length === 1
    && full.food.find((i) => i.name === 'горошек').grams === 60;
  const ok6 = okPepper && okSweet && okFull;
  if (!ok6) failed++;
  console.log(`${ok6 ? '✓' : '✗'} «перец» 0.4.11: 40 г = 11 ккал разобраны (⚠️-страж сработал верно и привёл к ключу базы); полевая тарелка — 6/6 без пропусков`);
}

// ---- 0.4.12: куриные крылья (полевое ⚠️) + бутерброд с уточнением начинки ----
{
  const wings = parseSmartEntry('жареные куриные крылья 2 шт');
  const okWings = wings.food.length === 1 && wings.food[0].name === 'жареные куриные крылья'
    && wings.food[0].amount === 2 && wings.food[0].grams === 140 && wings.food[0].kcal === 356;
  const plain = parseSmartEntry('куриные крылья 2 шт');
  const okPlain = plain.food.length === 1 && plain.food[0].kcal === 284 && plain.unparsed.length === 0;
  const boiled = parseSmartEntry('бутерброд с вареной колбасой');
  const bItem = boiled.food.length === 1 ? boiled.food[0] : null;
  const okBoiled = !!bItem && bItem.name === 'бутерброд с вареная колбаса'
    && /вареная колбаса 15 г/.test(bItem.note || '') && bItem.kcal === 119 && bItem.approx === true;
  const curated = parseSmartEntry('бутерброд с колбасой');
  const okCurated = curated.food.length === 1 && curated.food[0].kcal === 125
    && !/варен/.test(curated.food[0].note || '');
  const ok7 = okWings && okPlain && okBoiled && okCurated;
  if (!ok7) failed++;
  console.log(`${ok7 ? '✓' : '✗'} 0.4.12: крылья всех речевых форм (жареные 2 шт = 356), уточнение «вареная» сохранено в имени ключа и составе, голое «с колбасой» — кураторский 125`);
}

// ---- 0.4.13: правдивость еды I — штучные веса, части курицы/колбасы, кляр, негация, журнал ----
{
  let bad = 0;
  const P = (s) => parseSmartEntry(s);
  const one = (s) => P(s).food[0] || {};
  const b1 = one('овсяное печенье 2 шт'); // полевое: было 2×70 г = 630 ккал
  if (!(b1.kcal === 135 && b1.grams === 30)) bad++;
  const b2 = one('бедро без кожи'); // полевое: было «безе» 305 ккал (стем «без»)
  if (!(b2.name === 'бедро без кожи' && b2.kcal === 165)) bad++;
  const b3 = one('рыба в кляре 200 г'); // составной ключ, не голая рыба 200
  if (!(b3.name === 'рыба в кляре' && b3.kcal === 410)) bad++;
  const b4 = one('минтай в кляре 200 г'); // фолбэк Этуотера с ≈-пометкой, не молчаливый голый минтай (144)
  if (!(b4.name === 'минтай' && b4.kcal === 358 && b4.approx === true && /кляр/.test(b4.note || ''))) bad++;
  const b5 = one('полукопченая колбаса 50 г'); // было: молча generic «колбаса» 301
  if (!(b5.name === 'полукопченая колбаса' && b5.kcal === 180)) bad++;
  const b6 = one('ломтик чайной колбасы'); // новые виды делят честную нарезку 25 г
  if (!(b6.name === 'чайная колбаса' && b6.grams === 25 && b6.kcal === 54)) bad++;
  const b7 = one('окорочка'); // род.п. с чередованием — стемом не ловился
  if (!(b7.kcal === 184)) bad++;
  const b8 = one('куриные ноги 2 шт'); // нога целиком 250 г/шт
  if (!(b8.grams === 500 && b8.kcal === 920)) bad++;
  const b9 = one('омлет с молоком'); // было: «молоко 60» — омлет пропадал
  if (!(b9.name === 'омлет с молоком' && b9.kcal === 155)) bad++;
  const b10 = P('каша без сахара'); // негация: сахар не добавляется
  if (!(b10.food.length === 1 && b10.food[0].name === 'каша' && b10.food[0].kcal === 95)) bad++;
  const b11 = P('чай без сахара'); // было: «чай с сахаром» 40 — враньё
  if (!(b11.food.length === 1 && b11.food[0].name === 'чай' && b11.food[0].kcal === 2)) bad++;
  const b12 = P('каша с сахаром'); // позитивный случай не сломан
  if (!(b12.food.length === 2 && b12.food.some((f) => /сахар/.test(f.name)))) bad++;
  // Журнал распознаваний: чистые примитивы
  const e = buildParseLogEntry('text', 'овсяное печенье 2 шт', P('овсяное печенье 2 шт'));
  if (!(e.items.length === 1 && e.items[0].kcal === 135 && e.saved === false && e.src === 'text')) bad++;
  const ring = normalizeParseLogList(Array.from({ length: 320 }, (_, i) => ({ id: 'x' + i, ts: i + 1, src: 'text', input: 'v' + i })));
  if (!(ring.length === PARSE_LOG_LIMIT && ring[0].id === 'x0')) bad++;
  if (!/не записано/.test(formatParseLogForClipboard([e]))) bad++;
  const ok13 = bad === 0;
  if (!ok13) failed++;
  console.log(`${ok13 ? '✓' : '✗'} 0.4.13: печенье 15 г/шт, курица-части+«без кожи», кляр ключи+фолбэк, виды колбас, «омлет с молоком», негация «без», журнал-ячейки`);
}

// ===== 0.4.14: «Мои комбо» — чистая нормализация шаблонов умного ввода =====
{
  let bad = 0;
  // Мусор отфильтровывается, текст режется до 300, uses нормализуется
  const norm = normalizeCombos([
    null, 'строка', {}, { text: '   ' },
    { id: 'a', name: 'Завтрак', text: 'овсянка 150 г, кофе с молоком', uses: 3.7 },
    { id: 'a', name: 'Дубль', text: 'чай' }, // дубль id — вылетает
    { text: 'банан 1 шт' }, // без id и имени — авто-имя из первой позиции
    { id: 'c', name: 'x'.repeat(60), text: 'кефир 200 мл' } // имя режется до 40
  ]);
  if (!(norm.length === 3)) bad++;
  if (!(norm[0].name === 'Завтрак' && norm[0].uses === 4)) bad++; // uses округляется: 3.7 → 4
  if (!(norm[1].name === 'банан 1 шт' && norm[1].id && norm[1].uses === 0)) bad++;
  if (!(norm[2].name.length === 40)) bad++;
  // Авто-имя с « +» при нескольких позициях
  const multi = normalizeCombos([{ text: 'овсянка 150 г, кофе, банан' }]);
  if (!(multi.length === 1 && /\+$/u.test(multi[0].name))) bad++;
  // Лимит 12
  const over = normalizeCombos(Array.from({ length: 20 }, (_, i) => ({ id: 'k' + i, text: 'чай ' + i })));
  if (!(over.length === COMBOS_LIMIT)) bad++;
  // Не-массив → пустой список (бэкап/порча не роняет)
  if (!(normalizeCombos(undefined).length === 0 && normalizeCombos('x').length === 0)) bad++;
  // Текст комбо честно перепарсивается актуальным парсером (главная механика)
  const comboParsed = parseSmartEntry(norm[0].text);
  if (!(comboParsed.food.length === 2)) bad++;
  const ok14 = bad === 0;
  if (!ok14) failed++;
  console.log(`${ok14 ? '✓' : '✗'} 0.4.14 комбо: нормализация (фильтр/дедуп/лимит/авто-имя), перепарсинг текста актуальным парсером`);
}

console.log(failed === 0 ? '\nALL TESTS PASSED' : `\n${failed} FAILURES`);
process.exit(failed === 0 ? 0 : 1);
