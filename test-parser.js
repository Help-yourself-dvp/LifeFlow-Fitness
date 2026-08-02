'use strict';
/* Временный тест парсера: node test-parser.js */
const { parseMealText, parseWorkoutDuration, formatWorkoutDuration, normalizeActivityName, getMorningMotivationMessage, morningMotivationVariantsCount, normalizeFavoriteMeal, parseSmartEntry } = require('./app.js');

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
  ['картофель 150г', 1]
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
  ['картофель 150г', 0, 116],       // 77/100*150
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

console.log(failed === 0 ? '\nALL TESTS PASSED' : `\n${failed} FAILURES`);
process.exit(failed === 0 ? 0 : 1);
