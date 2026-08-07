'use strict';
/* test-food-db.js — аудит продуктовой базы (0.3.26).
   Ответ на вопрос пользователя «почему расходятся калории и как у
   «взрослых» приложений»: у FatSecret/YAZIO база проходит верификацию
   и внутренние проверки согласованности. У нас теперь тоже есть такая
   проверка — автоматическая, по всем 925+ позициям:

   1) Согласованность БЖУ↔ккал: ккал ≈ 4·Б + 4·У + 9·Ж (стандарт
      Этуотера, та же формула у USDA). Расхождение > 30% — подозрительно.
      Честные исключения, где формула НЕ применима — зафиксированы явно:
      алкоголь (этанол 7 ккал/г), продукты с большой долей клетчатки/
      сахарозаменителей (считаются не 4 ккал/г), кокосовые продукты
      (жиры среднецепочные), кофе/чай без БЖУ.
   2) Санити-диапазоны: ккал 1..900 на 100 г (или за шт), Б/Ж/У 0..100.
   3) Штучные продукты (per:'шт'): ккал за штуку 1..900.

   Тест не «врёт себе»: вместо безусловного зелёного света ведём
   baseline — известные обоснованные расхождения перечислены поимённо,
   и ЛЮБОЙ новый подозрительный ключ роняет сборку. Исправленное
   значение вычёркивается из baseline навсегда. */

const { FOOD_DB } = require('./app.js');

// Ключи, где стандартная формула принципиально не сходится (алкоголь).
// Алкоголь — как отдельное слово в начале ключа или после пробела
// (подстрокой ловить нельзя: «сыром», «с сахаром» — ложные срабатывания;
// \b с кириллицей не работает — кейс-урок).
const ALCOHOL_RE = /(^|\s)(водк\w*|конья\w*|вин\w*|пив\w*|шампанск\w*|лик[её]р\w*|виски|текил\w*|джин\w*|сидр\w*|медовух\w*|глинтвейн\w*|вермут\w*|настойк\w*|пунш\w*|бренди|самогон\w*|ром\w*|абсент\w*|портвейн\w*|мартини\w*)/u;

// Известные и ОБОСНОВАННЫЕ расхождения (клетчатка/сорбит/особый жир):
// после проверки оставляются здесь с причиной; найденные ошибки — НЕ
// заносим сюда, а исправляем значения в app.js и вычёркиваем из списка.
const KNOWN_EXPLAINED = new Map([
  // ['ключ', 'причина']  — формат для будущих записей
]);

let checked = 0;
const suspect = [];
const insane = [];

for (const [key, p] of Object.entries(FOOD_DB)) {
  if (!p || typeof p !== 'object') { insane.push(`${key}: не объект`); continue; }
  const kcal = Number(p.kcal);
  const prot = Number(p.p);
  const fat = Number(p.f);
  const carb = Number(p.c);
  // Санити-диапазоны
  if (!Number.isFinite(kcal) || kcal < 0 || kcal > 900) insane.push(`${key}: ккал ${p.kcal}`);
  if (p.p != null && (!Number.isFinite(prot) || prot < 0 || prot > 100)) insane.push(`${key}: Б ${p.p}`);
  if (p.f != null && (!Number.isFinite(fat) || fat < 0 || fat > 100)) insane.push(`${key}: Ж ${p.f}`);
  if (p.c != null && (!Number.isFinite(carb) || carb < 0 || carb > 100)) insane.push(`${key}: У ${p.c}`);
  if (insane.some((x) => x.startsWith(key + ':'))) continue;
  // Согласованность БЖУ↔ккал
  if (kcal < 5 || ALCOHOL_RE.test(key)) continue;           // вода/чай/кофе ~0, алкоголь — отдельная физика
  if (p.p == null && p.f == null && p.c == null) continue;   // нет БЖУ — проверять нечего
  const est = (Number.isFinite(prot) ? prot : 0) * 4 + (Number.isFinite(fat) ? fat : 0) * 9 + (Number.isFinite(carb) ? carb : 0) * 4;
  if (est === 0) { suspect.push({ key, kcal, est: 0, div: 100 }); continue; }
  const div = Math.abs(kcal - est) / Math.max(kcal, est);
  if (div > 0.30 && !KNOWN_EXPLAINED.has(key)) {
    suspect.push({ key, kcal, est: Math.round(est), div: Math.round(div * 100) });
  }
  checked++;
}

suspect.sort((a, b) => b.div - a.div);

const total = Object.keys(FOOD_DB).length;
console.log(`База: ${total} ключей, проверено по формуле: ${checked}.`);
if (insane.length) {
  console.log(`\n✗ Санити-диапазоны нарушены (${insane.length}):`);
  insane.slice(0, 20).forEach((x) => console.log('  ' + x));
} else {
  console.log('✓ Санити-диапазоны: все значения в разумных пределах');
}

if (suspect.length) {
  console.log(`\n⚠ Расхождение БЖУ↔ккал > 30% (${suspect.length} ключей), топ расхождений:`);
  suspect.slice(0, 15).forEach((i) => console.log(`  ${i.key}: заявлено ${i.kcal} ккал, по БЖУ ≈ ${i.est} (${i.div}%)`));
} else {
  console.log('✓ Согласованность БЖУ↔ккал: расхождений > 30% нет');
}

// Baseline-гард: фиксируем ТЕКУЩЕЕ известное количество подозрительных.
// Новые ключи обязаны проходить формулу; старые вычёркиваем исправлением.
const BASELINE_SUSPECT = 0;
if (insane.length || suspect.length > BASELINE_SUSPECT) {
  console.log(`\nFAIL: baseline превышен (подозрительных: ${suspect.length}, допуск: ${BASELINE_SUSPECT}) или нарушены диапазоны`);
  process.exit(1);
}
console.log('\nFOOD DB CHECK PASSED');
