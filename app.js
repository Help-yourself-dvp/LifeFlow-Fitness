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
  // Крупы, каши, хлеб
  'гречка': { kcal: 313 }, 'гречневая каша': { kcal: 110 },
  'рис': { kcal: 344 }, 'рис вареный': { kcal: 116 }, 'рисовый': { kcal: 116 },
  'овсянка': { kcal: 352 }, 'овсяная каша': { kcal: 88 }, 'геркулес': { kcal: 352 },
  'макароны': { kcal: 350 }, 'спагетти': { kcal: 350 }, 'паста': { kcal: 130 },
  'пшенная каша': { kcal: 90 }, 'манка': { kcal: 328 }, 'каша': { kcal: 95 },
  'хлеб': { kcal: 250 }, 'батон': { kcal: 265 }, 'бородинский': { kcal: 200 },
  'лаваш': { kcal: 275 }, 'тост': { kcal: 300 },

  // Мясо, птица, рыба
  'куриная грудка': { kcal: 113 }, 'куриное филе': { kcal: 113 },
  'курица': { kcal: 165 }, 'куриная ножка': { kcal: 184 }, 'крылышко': { kcal: 203 },
  'индейка': { kcal: 135 }, 'говядина': { kcal: 187 }, 'свинина': { kcal: 259 },
  'баранина': { kcal: 209 }, 'кролик': { kcal: 136 },
  'фарш': { kcal: 240 }, 'печень': { kcal: 127 },
  'лосось': { kcal: 142 }, 'семга': { kcal: 142 }, 'горбуша': { kcal: 127 },
  'треска': { kcal: 69 }, 'минтай': { kcal: 72 }, 'судак': { kcal: 84 },
  'сельдь': { kcal: 161 }, 'скумбрия': { kcal: 191 }, 'тунец': { kcal: 101 },
  'креветки': { kcal: 85 }, 'краб': { kcal: 87 }, 'кальмар': { kcal: 75 },

  // Готовые блюда
  'котлета': { kcal: 210, per: 'шт' },
  'тефтели': { kcal: 210 }, 'биток': { kcal: 220 },
  'сосиска': { kcal: 105, per: 'шт' }, 'сарделька': { kcal: 190, per: 'шт' },
  'колбаса': { kcal: 301 }, 'вареная колбаса': { kcal: 260 },
  'ветчина': { kcal: 145 }, 'бекон': { kcal: 458 },
  'яйцо': { kcal: 74, per: 'шт' }, 'омлет': { kcal: 155 }, 'глазунья': { kcal: 180 },
  'сырник': { kcal: 183, per: 'шт' }, 'блин': { kcal: 96, per: 'шт' },
  'оладьи': { kcal: 190 }, 'пельмени': { kcal: 240 }, 'пельмень': { kcal: 12, per: 'шт' },
  'вареники': { kcal: 180 }, 'манты': { kcal: 220 }, 'хинкали': { kcal: 230 },
  'борщ': { kcal: 49 }, 'щи': { kcal: 31 }, 'солянка': { kcal: 68 },
  'суп': { kcal: 45 }, 'куриный бульон': { kcal: 36 }, 'уха': { kcal: 46 },
  'плов': { kcal: 180 }, 'рагу': { kcal: 120 }, 'гуляш': { kcal: 170 },
  'пицца': { kcal: 266 }, 'бургер': { kcal: 250 }, 'шаурма': { kcal: 200 },
  'шашлык': { kcal: 229 }, 'доширак': { kcal: 440 }, 'картошка фри': { kcal: 312 },
  'картофельное пюре': { kcal: 106 }, 'жареный картофель': { kcal: 192 },

  // Молочка
  'творог': { kcal: 121 }, 'сыр': { kcal: 352 }, 'моцарелла': { kcal: 280 },
  'молоко': { kcal: 60 }, 'кефир': { kcal: 40 }, 'ряженка': { kcal: 67 },
  'йогурт': { kcal: 72 }, 'сметана': { kcal: 210 }, 'сливки': { kcal: 205 },
  'сливочное масло': { kcal: 748 }, 'масло сливочное': { kcal: 748 },
  'растительное масло': { kcal: 884 }, 'оливковое масло': { kcal: 884 },
  'масло': { kcal: 717 },
  'мясо': { kcal: 187 }, 'рыба': { kcal: 100 }, 'овощи': { kcal: 40 },
  'фрукты': { kcal: 55 }, 'салат': { kcal: 55 },
  'майонез': { kcal: 680 }, 'сгущенка': { kcal: 320 }, 'мороженое': { kcal: 230 },

  // Овощи, зелень, фрукты
  'картофель': { kcal: 77 }, 'картошка': { kcal: 77 },
  'помидор': { kcal: 18 }, 'томат': { kcal: 18 },
  'огурец': { kcal: 15 }, 'морковь': { kcal: 32 }, 'свекла': { kcal: 43 },
  'капуста': { kcal: 25 }, 'брокколи': { kcal: 34 }, 'цветная капуста': { kcal: 25 },
  'лук': { kcal: 40 }, 'чеснок': { kcal: 149 }, 'перец болгарский': { kcal: 27 },
  'кабачок': { kcal: 24 }, 'баклажан': { kcal: 24 }, 'тыква': { kcal: 22 },
  'авокадо': { kcal: 160 }, 'грибы': { kcal: 22 }, 'шампиньоны': { kcal: 27 },
  'зелень': { kcal: 30 }, 'укроп': { kcal: 40 }, 'петрушка': { kcal: 49 },
  'кукуруза': { kcal: 86 }, 'горошек': { kcal: 73 }, 'фасоль': { kcal: 333 },
  'чечевица': { kcal: 295 }, 'соевый соус': { kcal: 53 },

  'яблоко': { kcal: 89, per: 'шт' }, 'банан': { kcal: 105, per: 'шт' },
  'апельсин': { kcal: 62, per: 'шт' }, 'мандарин': { kcal: 40, per: 'шт' },
  'груша': { kcal: 57, per: 'шт' }, 'персик': { kcal: 50, per: 'шт' },
  'киви': { kcal: 47, per: 'шт' }, 'виноград': { kcal: 69 },
  'арбуз': { kcal: 30 }, 'дыня': { kcal: 34 }, 'клубника': { kcal: 32 },
  'вишня': { kcal: 50 }, 'слива': { kcal: 46 }, 'лимон': { kcal: 29 },
  'авокадо': { kcal: 160 }, 'ананас': { kcal: 50 }, 'манго': { kcal: 60 },
  'сухофрукты': { kcal: 250 }, 'изюм': { kcal: 299 }, 'курага': { kcal: 241 },
  'финики': { kcal: 277 }, 'орехи': { kcal: 650 }, 'грецкий орех': { kcal: 654 },
  'миндаль': { kcal: 579 }, 'арахис': { kcal: 567 }, 'семечки': { kcal: 580 },

  // Сладкое и снеки
  'шоколад': { kcal: 540 }, 'печенье': { kcal: 450 }, 'пряник': { kcal: 350 },
  'торт': { kcal: 350 }, 'пирожное': { kcal: 380 }, 'пирог': { kcal: 320 },
  'вафли': { kcal: 460 }, 'халва': { kcal: 523 }, 'чипсы': { kcal: 530 },
  'попкорн': { kcal: 387 }, 'сухарики': { kcal: 400 }, 'козинаки': { kcal: 510 },
  'сахар': { kcal: 387 }, 'мед': { kcal: 329 }, 'варенье': { kcal: 250 },
  'джем': { kcal: 250 }, 'нутелла': { kcal: 530 },

  // Напитки (ккал на 100 мл)
  'вода': { kcal: 0 }, 'минералка': { kcal: 0 }, 'минеральная вода': { kcal: 0 },
  'чай': { kcal: 2 }, 'кофе': { kcal: 2 }, 'капучино': { kcal: 45 },
  'латте': { kcal: 55 }, 'квас': { kcal: 27 }, 'компот': { kcal: 58 },
  'морс': { kcal: 40 }, 'сок': { kcal: 45 }, 'смузи': { kcal: 60 },
  'кола': { kcal: 42 }, 'газировка': { kcal: 42 }, 'лимонад': { kcal: 40 },
  'энергетик': { kcal: 45 }, 'пиво': { kcal: 43 }, 'вино': { kcal: 83 },
  'шампанское': { kcal: 78 }, 'водка': { kcal: 231 }
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
   Тема (Light / Dark)
   ============================================================ */
const LIGHT_THEME_COLOR = '#fafdfc';
const DARK_THEME_COLOR = '#0e1514';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('meta-theme')
    .setAttribute('content', theme === 'dark' ? DARK_THEME_COLOR : LIGHT_THEME_COLOR);
}

function initTheme() {
  const saved = state.theme || localStorage.getItem('fitflow:theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved || (prefersDark ? 'dark' : 'light'));

  // Следим за системной темой, пока пользователь не выбрал свою
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', (e) => {
      if (!localStorage.getItem('fitflow:theme')) {
        applyTheme(e.matches ? 'dark' : 'light');
      }
    });
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  state.theme = next;
  localStorage.setItem('fitflow:theme', next);
  applyTheme(next);
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
  $('#water-goal-label').textContent = fmt(goal);
  $('#water-goal').textContent = `${fmt(goal)} мл`;
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

  $$('.nav-item').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.dataset.nav === 'home') return;
      toast(`Раздел «${btn.textContent.trim().replace('скоро', '')}» появится в следующих итерациях`);
    });
  });
}

/* Поддержка запуска в браузере и в Node (для тестов парсера) */
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', init);
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseMealText, parseItem, lookupProduct, calcKcal, FOOD_DB };
}
