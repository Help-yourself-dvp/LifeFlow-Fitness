'use strict';
/* Временный тест парсера: node test-parser.js */
const { parseMealText } = require('./app.js');

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
  ['картофель 1.5 кг', 0, 1155]
];
for (const [input, idx, expectedKcal] of checks) {
  const res = parseMealText(input);
  const got = res[idx] ? res[idx].kcal : null;
  const ok = got === expectedKcal;
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ккал: ${input} => ${got} (ожидалось ${expectedKcal})`);
}

console.log(failed === 0 ? '\nALL TESTS PASSED' : `\n${failed} FAILURES`);
process.exit(failed === 0 ? 0 : 1);
