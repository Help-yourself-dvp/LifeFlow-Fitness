'use strict';
/* Быстрая защита от регресса: HTML-кнопки не должны ссылаться на исчезнувшие функции. */
const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

const functions = [
  'openMorningThemeDialog', 'closeMorningThemeDialog',
  'showMorningMessageDialog', 'closeMorningMessageDialog',
  'acceptTerms', 'declineTerms', 'openPrivacyDialog', 'closePrivacyDialog',
  'openSourcesDialog', 'closeSourcesDialog', 'startVoiceEntry',
  'openSmartEntry', 'closeSmartEntry', 'previewSmartEntry', 'saveSmartEntry',
  'toggleProfileDetails', 'openHomeLayoutDialog', 'closeHomeLayoutDialog',
  'requestAllProfilesImport', 'closeAllProfilesImportDialog', 'confirmAllProfilesImport',
  'renderWeightSettings', 'saveWeightFromSettings', 'removeWeightRecord',
  'renderWeightOverview', 'openQuickWeightDialog', 'closeQuickWeightDialog', 'saveQuickWeight',
  'openTermsDialog', 'openMethodologyDialog', 'closeMethodologyDialog',
  'renderProfileBasics', 'toggleProfileChoice', 'saveProfileBasicField',
  'computeProfileNorms', 'openNormsDialog', 'closeNormsDialog', 'applyNormsDialog',
  'generateAiRecipe', 'buildAiChatAnswer', 'sendAiChat', 'handleAiRecipeCameraPhoto',
  'normalizeSmartUnits', 'renderStatsWeightChart',
  'canonicalUnit', 'describeFoodItemLine', 'bindDialogScrollLock', 'bindSettingsMenu',
  'renderAiSettings', 'setAiMode', 'setCloudProvider', 'checkCloudConnection',
  'isCloudAiReady', 'callCloudAi', 'cloudErrorText', 'findProductsInText', 'mdLiteToHtml',
  'sendAiChatCloud', 'recognizeFoodPhoto', 'geminiScoreModelName',
  'normalizeNumberWords', 'computeGameTasks', 'renderGameMode', 'computeGameRecords',
  'updateGameModeEnabled', 'renderGameModeSettings', 'renderStatsCompare', 'getCloudBaseUrl',
  // 0.3.8: правдивость парсера, медали-экран, кнопка «назад», справка, отмена «Своя мл»
  'describeFoodItemLine', 'parseSandwichItem', 'parseDishFromItem',
  'computeGameMedals', 'medalBadgeSvg', 'renderGameMedalsView',
  'computeRunKmTotal', 'computeStepsTotal', 'computeWeightLostKg',
  'bindBackNavigation', 'handleBackNavigation', 'getActiveViewName',
  'openHelpTopicDialog', 'closeHelpTopicDialog', 'collapseWaterCustomRow',
  'isHomeCardShown', 'isHomeCardFeatureEnabled', 'syncHomeCardVisibility',
  'pollinationsAnonymousCall',
  // 0.3.9: начинки сэндвичей, чек-ин сна
  'glueSandwichFillings', 'normalizeSleepCheckin', 'computeSleepDurationMin',
  'evaluateSleepOnSchedule', 'getTodaySleepEntry', 'getSleepCheckinSummary',
  'sleepTimeToMinutes', 'openSleepCheckinDialog', 'closeSleepCheckinDialog',
  'saveSleepCheckinDialog', 'skipSleepCheckin', 'maybeShowSleepCheckin',
  'renderSleepCheckinSettings', 'updateSleepCheckinEnabled', 'saveSleepTargets', 'saveSleepWindow', 'isSleepWindowNow',
  'renderSleepDialogControls', 'renderSleepDialogSummary',
  // 0.3.11: объединённый «План дня» + докрутка кнопок над клавиатурой
  'renderDayPlan', 'scheduleKeyboardShift', 'ensureFieldActionsVisible', 'openImeDock', 'closeImeDock', 'isImeDockField', 'computeMealsEatenToday', 'cancelKeyboardShift', 'queueKeyboardShift',
  'getPalette', 'setPalette', 'applyPalette', 'computeMaxCardioDayMinutes',
  // 0.3.12: мини-онбординг
  'openOnboarding', 'closeOnboarding', 'nextOnboardingSlide', 'skipOnboarding',
  'renderOnboardingSlide', 'maybeShowOnboarding', 'hasCompletedOnboarding'
];
const ids = [
  'theme-toggle', 'export-btn', 'import-btn', 'reset-btn',
  'morning-motivation-theme', 'notification-setup-btn',
  'morning-message-dialog-ok', 'meal-reminders-toggle',
  'terms-accept', 'terms-decline',
  'profile-switcher', 'profile-list', 'profile-new-name',
  'home-active-profile', 'date-weekday', 'date-month',
  'home-cards', 'home-layout-open', 'home-layout-close', 'home-layout-list',
  'all-profiles-import-dialog', 'all-profiles-import-cancel', 'all-profiles-import-confirm',
  'weight-form', 'weight-history-date', 'weight-history-input', 'weight-periods', 'weight-chart', 'weight-history-list',
  'weight-card', 'home-weight-current', 'home-weight-trend', 'weight-details-view', 'weight-quick-open', 'weight-quick-dialog', 'weight-quick-form',
  'methodology-open', 'methodology-dialog', 'methodology-dialog-ok', 'terms-open', 'terms-status',
  'profile-sex-choices', 'profile-activity-choices', 'profile-age-input', 'profile-height-input', 'profile-basics-options',
  'norms-calc-btn', 'norms-dialog', 'norms-dialog-text', 'norms-dialog-hint', 'norms-dialog-apply', 'norms-dialog-cancel',
  'stats-periods', 'ai-generate-recipe', 'ai-send-chat',
  'ai-recipe-voice-btn', 'stats-weight-chart-caption',
  'settings-profile-view', 'settings-notifications-view', 'settings-ai-view', 'settings-data-view', 'settings-about-view',
  'ai-cloud-box', 'ai-cloud-provider', 'ai-cloud-key', 'ai-cloud-model', 'ai-cloud-check', 'ai-cloud-clear', 'ai-cloud-status', 'ai-cloud-hint',
  'settings-general-view', 'game-mode-toggle', 'game-mode-status', 'day-plan-card',
  'game-medals-view', 'game-medals-grid', 'game-medals-count', 'game-medals-back',
  'help-dialog', 'help-title', 'help-text', 'help-ok', 'water-custom-cancel',
  'stats-compare-section', 'stats-compare-text', 'stats-compare-motivation',
  'ai-quick-clear-btn', 'ai-chat-clear-btn', 'ai-recipe-clear-btn',
  'ai-cloud-base-row', 'ai-cloud-base', 'ai-quick-result', 'ai-chat-result', 'ai-recipe-result',
  'sleep-checkin-toggle', 'sleep-targets-row', 'sleep-target-bed', 'sleep-target-wake', 'sleep-checkin-status',
  'sleep-window-row', 'sleep-window-start', 'sleep-window-end',
  'sleep-checkin-dialog', 'sleep-rating-row', 'sleep-extra-toggle', 'sleep-extra',
  'sleep-bed-input', 'sleep-wake-input', 'sleep-fill-targets', 'sleep-tags',
  'sleep-summary', 'sleep-save-btn', 'sleep-skip-btn',
  'onboarding-dialog', 'onboarding-emoji', 'onboarding-title', 'onboarding-text',
  'onboarding-dots', 'onboarding-skip', 'onboarding-next', 'onboarding-open',
  'palette-segmented', 'palette-status', 'food-input-clear', 'water-custom-clear',
  'ai-view', 'ai-view-back', 'ai-center-open', 'ai-tabs', 'ime-dock'
];

let failed = 0;
/* Регресс-защита (баг 0.3.5 «dialogs.some is not a function» при входе):
   $$ обязан возвращать Array — NodeList не имеет .some/.map/.filter. */
{
  const ok = /\$\$\s*=\s*\(sel\)\s*=>\s*Array\.from\(/.test(app);
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} $$ возвращает Array.from (не голый NodeList)`);
}

/* Регресс-защита (0.3.14): токен --primary использовался в 16 местах, но был
   НЕ определён — прогресс-бары заданий/медалей и рамки выделений были
   прозрачными. Алиас обязан существовать. */
{
  const css = fs.readFileSync('style.css', 'utf8');
  const ok = /--primary:\s*var\(--md-sys-color-primary\)/.test(css);
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} алиас --primary определён (иначе var(--primary) = прозрачность)`);
}
/* Регресс-защита (0.3.16, кейс GBoard): ИИ-центр — обычный экран #ai-view,
   а НЕ модальный #ai-dialog на фиксированной подложке. Возврат модалки
   воскресит баг «клавиатура со 2-го тапа» после холодного старта. */
{
  const ok = !/id=["']ai-dialog["']/.test(html)
    && /id=["']ai-view["']/.test(html)
    && /switchView\('ai'\)/.test(app);
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} ИИ-центр — экран #ai-view (модалки #ai-dialog нет)`);
}

/* Регресс-защита (0.3.18): акцентная линия 3px единым цветом палитры;
   фон Sport задан ТОЛЬКО для светлой темы (0.3.17 клал селектором без темы —
   специфичность/порядок перебивали тёмный фон на светлый: «всё сливается»);
   IME-док подключён стилями и триггером focusin. */
{
  const css2 = fs.readFileSync('style.css', 'utf8');
  const ok = /border-left:\s*3px solid color-mix\(in srgb, var\(--primary\) 65%, transparent\)/.test(css2)
    && !/--card-accent:/.test(css2)
    && /html\[data-palette="sport"\]:not\(\[data-theme="dark"\]\)[^{]*\{[^}]*--md-sys-color-surface:\s*#f7f4ec/.test(css2)
    && !/html\[data-palette="sport"\]\s*\{[^}]*--md-sys-color-surface/.test(css2)
    && /#ime-dock\s*\{[^}]*position:\s*fixed/.test(css2)
    && /isImeDockField\(field\)\)\s*openImeDock\(field\)/.test(app)
    && /IME_DOCK_FIELD_IDS = \['#ai-quick-input', '#ai-recipe-input', '#ai-chat-input'\]/.test(app)
    && /AI_TAB_FIELD = \{ quick: '#ai-quick-input'/.test(app)
    && /if \(field\) openImeDock\(field\);\s*else closeImeDock\(\);/.test(app)
    && !/imeDockViewportHandler/.test(app)
    && !/scheduleDeferredImeDock|cancelDeferredImeDock|isImeDockDeferredField/.test(app)
    && !/scheduleImeRetry|warmupHiddenViewsLayout/.test(app)
    && !/\.ai-center-modal/.test(css2);
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} линия 3px, фон Sport только светлый, IME-док только для ИИ-полей + детерминированный док вкладок (0.3.22)`);
}

for (const name of functions) {
  const ok = new RegExp(`function\\s+${name}\\s*\\(`).test(app);
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} функция ${name}`);
}
for (const id of ids) {
  const ok = new RegExp(`id=["']${id}["']`).test(html);
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} элемент #${id}`);
}
// 0.3.24: Локальный эксперт 2.0 — функция, подключение в оба отчёта, дубль источников удалён
{
  const app = fs.readFileSync('app.js', 'utf8');
  const okFn = /function buildExpertInsights\(input\)/.test(app)
    && /function buildExpertInsightsHtml\(\)/.test(app);
  if (!okFn) failed++;
  console.log(`${okFn ? '✓' : '✗'} эксперт 2.0: чистая функция buildExpertInsights + html-обёртка`);
  const okWired = (app.match(/buildExpertInsightsHtml\(\) \+/g) || []).length === 2;
  if (!okWired) failed++;
  console.log(`${okWired ? '✓' : '✗'} эксперт 2.0: подключён в оба отчёта (статистика и ИИ-анализ)`);
  const okNoDup = !html.includes('Источники пищевых данных: USDA FoodData Central (public domain) и Open Food Facts (ODbL). Калорийность конкретного бренда')
    && /id="sources-open"[^>]*>.{0,4}Источники пищевых данных<\/button>/u.test(html);
  if (!okNoDup) failed++;
  console.log(`${okNoDup ? '✓' : '✗'} настройки: нет дубля источников, одна кнопка «Источники пищевых данных»`);
  const okMethod = html.includes('Средняя калорийность и объёмы по умолчанию');
  if (!okMethod) failed++;
  console.log(`${okMethod ? '✓' : '✗'} методика: пункт про среднюю калорийность и средние объёмы`);
}

// 0.3.25: Личная база продуктов — элементы, привязки, перекрытие в парсере
{
  const app2 = fs.readFileSync('app.js', 'utf8');
  const okIds = ['custom-food-open', 'custom-food-dialog', 'custom-food-name', 'custom-food-kcal', 'custom-food-save', 'custom-food-close', 'custom-food-list']
    .every((id) => new RegExp(`id=["']${id}["']`).test(html));
  if (!okIds) failed++;
  console.log(`${okIds ? '✓' : '✗'} личная база: все элементы диалога «Мои продукты» на месте`);
  const okBind = app2.includes("bindEvent('#custom-food-open', 'click', openCustomFoodDialog)")
    && app2.includes("bindEvent('#custom-food-save', 'click', saveCustomFoodFromDialog)")
    && app2.includes("bindEvent('#custom-food-close', 'click', closeCustomFoodDialog)");
  if (!okBind) failed++;
  console.log(`${okBind ? '✓' : '✗'} личная база: кнопки диалога привязаны`);
  const okLogic = /function lookupProduct\(name\) \{\s*\n\s*\/\/ Сначала личная база/.test(app2)
    && app2.includes('normalizeCustomFoods();')
    && /Number\(product\.pieceG\) > 0\) return/.test(app2);
  if (!okLogic) failed++;
  console.log(`${okLogic ? '✓' : '✗'} личная база: lookupProduct сначала личная база, вес штуки учитывается`);
}

// 0.3.26: док после «Спросить», подтверждение удаления, скролл-зоны, значки, placeholder
{
  const app3 = fs.readFileSync('app.js', 'utf8');
  // 0.3.31 (тест обновлён, код 0.3.26 не сломан): между closeImeDock() и облаком
  // появилась ветка локальной Gemma, поэтому сплошной якорь устарел. Нам важно
  // поведение: гашение клавиатуры и дока — ПЕРВЫМИ строками и общее для всех
  // трёх путей ответа (локальный эксперт → litert → облако).
  const okChat = app3.includes('input.blur();\n  closeImeDock();\n')
    && app3.includes("state.aiSettings.mode === 'litert' && canUseLocalLlm()")
    && app3.includes('sendAiChatLocalLlm(text, resultBox);\n    return;')
    && app3.includes('if (isCloudAiReady()) {\n    sendAiChatCloud(text, resultBox);');
  if (!okChat) failed++;
  console.log(`${okChat ? '✓' : '✗'} ИИ-чат: после «Спросить» клавиатура и док закрываются (режим чтения)`);
  const okDel = ['custom-food-del-dialog', 'custom-food-del-confirm', 'custom-food-del-cancel', 'custom-food-del-name']
    .every((id) => new RegExp(`id=["']${id}["']`).test(html))
    && app3.includes('function askDeleteCustomFood(id)') && app3.includes('function confirmDeleteCustomFood()');
  if (!okDel) failed++;
  console.log(`${okDel ? '✓' : '✗'} подтверждение удаления своего продукта: диалог + функции на месте`);
  const okEdit = app3.includes('function editCustomFood(id)') && app3.includes('custom-food-edit')
    && app3.includes('custom: product.custom === true');
  if (!okEdit) failed++;
  console.log(`${okEdit ? '✓' : '✗'} «Мои продукты»: ✏️ правка из списка + метка custom в parseItem`);
  const cssAll = fs.readFileSync('style.css', 'utf8');
  // 0.3.29: псевдо-ручка убрана (ложный аффорданс), разделители — рамка/тень/скроллбар
  const okScroll = !cssAll.includes('.ai-result-box::before')
    && cssAll.includes('border: 1.5px solid color-mix(in srgb, var(--primary) 40%, transparent)')
    && cssAll.includes('#ai-view-back { margin-top: 16px; }');
  if (!okScroll) failed++;
  console.log(`${okScroll ? '✓' : '✗'} ИИ: панель результата отделена без ложной «ручки» (рамка+скроллбар), «Назад» опущен`);
  const okAbout = html.includes('>ℹ️ Источники пищевых данных</button>') && html.includes('>🧮 Методика расчётов</button>')
    && html.includes('>🛡️ Условия использования</button>') && html.includes('>💧 Как пользоваться приложением</button>');
  if (!okAbout) failed++;
  console.log(`${okAbout ? '✓' : '✗'} «О приложении»: единые значки у всех кнопок`);
  const okPh = html.includes('placeholder="Название (напр., «Творог 5%»)"') && !html.includes('«Простоквашино» 5%');
  if (!okPh) failed++;
  console.log(`${okPh ? '✓' : '✗'} «Мои продукты»: короткий placeholder виден целиком`);
}

// 0.3.27: виды приготовления в базе, OFF-строка, значки из диалогов, Отмена по центру
{
  const app4 = fs.readFileSync('app.js', 'utf8');
  const okCook = app4.includes("'курица жареная': { kcal: 213") && app4.includes("'свинина вареная': { kcal: 350")
    && app4.includes("'курица вареная'") && app4.includes("'грудка жареная'");
  if (!okCook) failed++;
  console.log(`${okCook ? '✓' : '✗'} база: жареная/варёная курица и свинина добавлены`);
  // 0.3.28 (карта контуров — решение пользователя): онлайн-строка СКРЫТА,
  // код-основа сохранён, флаг всегда ВЫКЛ по умолчанию
  const okOff = !html.includes('custom-food-barcode')
    && app4.includes('function parseOffProduct(json)') && app4.includes('async function lookupOffByBarcode(code)')
    && app4.includes('onlineFeatures: { barcodeLookup: false }');
  if (!okOff) failed++;
  console.log(`${okOff ? '✓' : '✗'} карта контуров: OFF-строка скрыта, код-основа и выключенный флаг на месте`);
  const okIcons = html.includes('>ℹ️ Источники пищевых данных</button>') && html.includes('>🧮 Методика расчётов</button>')
    && html.includes('>🛡️ Условия использования</button>') && html.includes('>💧 Как пользоваться приложением</button>');
  if (!okIcons) failed++;
  console.log(`${okIcons ? '✓' : '✗'} «О приложении»: значки кнопок = значки самих разделов`);
  const css5 = fs.readFileSync('style.css', 'utf8');
  const okCenter = css5.includes('#custom-food-del-dialog .app-dialog-actions button { width: 100%; }');
  if (!okCenter) failed++;
  console.log(`${okCenter ? '✓' : '✗'} диалог удаления: кнопка «Отмена» растянута (не прижата влево)`);
}

// 0.3.29: эксперт 2.1 — чат отвечает на вопросы о прогрессе фактами
{
  const app5 = fs.readFileSync('app.js', 'utf8');
  const okProg = app5.includes('function buildProgressAnswer(input)') && app5.includes('function gatherProgressFacts()')
    && app5.includes('buildProgressAnswer(gatherProgressFacts())');
  if (!okProg) failed++;
  console.log(`${okProg ? '✓' : '✗'} эксперт 2.1: чат «как мой день/прогресс» → пакет фактов (мост к локальному ИИ)`);
}

// 0.3.30: «Мой курс» (P8 — решение пользователя), правдивость спутников, фолбэк облака
{
  const app6 = fs.readFileSync('app.js', 'utf8');
  const okModel = app6.includes('myCourses: [], // «Мой курс»')
    && app6.includes('function normalizeCourse(raw)') && app6.includes('function normalizeCourseTimes(')
    && app6.includes('function buildCoursesPlanHtml(') && app6.includes('async function scheduleCourseReminders(')
    && app6.includes('refreshCourseRemindersOnLaunch();')
    && app6.includes('async function cancelCourseReminders(')
    && app6.includes('getTodayCourses().length > 0'); // «План дня» виден и с одними курсами
  if (!okModel) failed++;
  console.log(`${okModel ? '✓' : '✗'} «Мой курс»: модель, напоминания (канал/id-план), запуск с приложением, видимость карточки`);
  const okWiring = app6.includes("'settings-courses'") && app6.includes("title: 'Мой курс',")
    && app6.includes('renderCoursesSettings();') && app6.includes("bindEvent('#course-save', 'click', saveCourseFromDialog);")
    && app6.includes('[data-course-dose]');
  if (!okWiring) failed++;
  console.log(`${okWiring ? '✓' : '✗'} «Мой курс»: подэкран в подписках настроек, справка, back-карта, привязки событий`);
  const okHtml = html.includes('data-settings-view="settings-courses"') && html.includes('id="settings-courses-view"')
    && html.includes('id="course-dialog"') && html.includes('id="course-del-dialog"')
    && html.includes('id="course-doses"') && html.includes('id="course-times"')
    && html.includes('id="course-list"') && html.includes('id="course-add"')
    && html.includes('id="course-remind"') && html.includes('id="course-days"') && html.includes('id="course-name"');
  if (!okHtml) failed++;
  console.log(`${okHtml ? '✓' : '✗'} «Мой курс»: пункт меню, подэкран со списком, диалог с полными параметрами расписания`);
  const okCss = fs.readFileSync('style.css', 'utf8').includes('.course-dose-chip');
  if (!okCss) failed++;
  console.log(`${okCss ? '✓' : '✗'} «Мой курс»: стили чипов приёма на месте`);
  const okCompanion = app6.includes('const COMPANION_GRAMS = {') && app6.includes('function cookedCompanionLeft')
    && app6.includes("'тушенка': 100") && app6.includes("'каша с молоком': { kcal: 100");
  if (!okCompanion) failed++;
  console.log(`${okCompanion ? '✓' : '✗'} правдивость спутников: карта граммовых добавок, варёная подмена, молочная каша — ключ базы`);
  const okGlass = app6.includes("text.match(/^(стакан[а-яё]*|чашк[а-яё]*|кружк[а-яё]*|тарелк[а-яё]*|миск[а-яё]*|пиал[а-яё]*)");
  if (!okGlass) failed++;
  console.log(`${okGlass ? '✓' : '✗'} ведущая ёмкость «стакан/чашка/миска + продукт» без цифры распознаётся как 1 единица`);
  const okFallback = app6.includes('Облако ответить не смогло — ответ выше собран локально')
    && app6.includes('баланс или тарифный лимит (ошибка 402)');
  if (!okFallback) failed++;
  console.log(`${okFallback ? '✓' : '✗'} облако: человеческий 402 + фолбэк чата на локальные факты при сбое`);
  // Баланс скобок/тегов новой разметки (бытовой самоконтроль)
  const divOpen = (html.match(/<div/g) || []).length;
  const divClose = (html.match(/<\/div/g) || []).length;
  const okBalance = divOpen === divClose;
  if (!okBalance) failed++;
  console.log(`${okBalance ? '✓' : '✗'} баланс div в index.html (${divOpen}/${divClose})`);
}

// 0.3.31: голос→проверка, сворачиваемые приёмы, AI-скролл, «Отмена» по центру, основа локального ИИ
{
  const app7 = fs.readFileSync('app.js', 'utf8');
  const cssAll = fs.readFileSync('style.css', 'utf8');
  const okVoice = app7.includes('ВСЕГДА проходит через экран') && app7.includes('previewSmartEntry();\n    toast(')
    && app7.includes('window.onVoiceInputResult(event.results[0][0].transcript);');
  if (!okVoice) failed++;
  console.log(`${okVoice ? '✓' : '✗'} голосовой ввод (и нативный, и веб-фолбэк) → экран проверки умного ввода с кнопкой «Сохранить»`);
  const okFold = app7.includes('foodGroupCollapsed') && app7.includes('data-group-toggle')
    && app7.includes('group.items.length >= 4')
    && cssAll.includes('.food-group.collapsed .food-group-chevron');
  if (!okFold) failed++;
  console.log(`${okFold ? '✓' : '✗'} приёмы пищи сворачиваются: 4+ записей свёрнуты, заголовок — кнопка-шеврон`);
  const okCenter = cssAll.includes('.app-dialog-actions .btn {')
    && cssAll.includes('justify-content: center;')
    && cssAll.includes('text-align: center;');
  if (!okCenter) failed++;
  console.log(`${okCenter ? '✓' : '✗'} все диалоги подтверждения: текст кнопок (включая «Отмена») по центру`);
  const okScroll = app7.includes('function watchAiResultBoxes()') && app7.includes('watchAiResultBoxes();')
    && cssAll.includes('.ai-result-box.ai-scrollable::after') && cssAll.includes('width: 8px; }');
  if (!okScroll) failed++;
  console.log(`${okScroll ? '✓' : '✗'} ИИ: честный маркер прокрутки (наблюдатель + градиент + заметный скроллбар 8px)`);
  const okParse = app7.includes('SAUSAGE_SLICE_GRAMS') && app7.includes('function eggPortionCount(')
    && app7.includes('глазунья|яичница|омлет');
  if (!okParse) failed++;
  console.log(`${okParse ? '✓' : '✗'} парсер: яичные «из N яиц» + честный кусок колбасы (карты в коде)`);
  // Основа локального ИИ (этап 0.4.x): нативный плагин + патч-инструкция + дремлющий JS
  const okPlugin = fs.existsSync('plugins/fitflow-local-ai/package.json')
    && fs.existsSync('plugins/fitflow-local-ai/android/build.gradle')
    && fs.existsSync('plugins/fitflow-local-ai/android/src/main/AndroidManifest.xml')
    && fs.existsSync('plugins/fitflow-local-ai/android/src/main/java/ru/fitflow/localai/FitFlowLocalAiPlugin.kt')
    && fs.existsSync('tools/github-workflows/LOCAL_AI_PATCH.md');
  if (!okPlugin) failed++;
  console.log(`${okPlugin ? '✓' : '✗'} локальный ИИ: файлы плагина Capacitor и инструкция-патч на месте`);
  const kt = fs.existsSync('plugins/fitflow-local-ai/android/src/main/java/ru/fitflow/localai/FitFlowLocalAiPlugin.kt')
    ? fs.readFileSync('plugins/fitflow-local-ai/android/src/main/java/ru/fitflow/localai/FitFlowLocalAiPlugin.kt', 'utf8') : '';
  const gradle = fs.existsSync('plugins/fitflow-local-ai/android/build.gradle')
    ? fs.readFileSync('plugins/fitflow-local-ai/android/build.gradle', 'utf8') : '';
  const okKotlin = kt.includes('@CapacitorPlugin(name = "FitFlowLocalAI")') && kt.includes('fun importModel(')
    && kt.includes('fun loadModel(') && kt.includes('fun generate(') && kt.includes('fun unloadModel(')
    && kt.includes('litertlm') && !kt.includes('localhost')
    && gradle.includes('com.google.ai.edge.litertlm:litertlm-android') && gradle.includes('minSdkVersion 24');
  if (!okKotlin) failed++;
  console.log(`${okKotlin ? '✓' : '✗'} локальный ИИ: плагин полный (import/load/generate/unload), LiteRT-LM, minSdk 24`);
  const okDormant = app7.includes('window.Capacitor.Plugins.FitFlowLocalAI') && app7.includes('function canUseLocalLlm()')
    && app7.includes('function sendAiChatLocalLlm(') && app7.includes('canUseLocalLlm()')
    && app7.includes('buildAiSystemContext') && !app7.includes("modelPath = 'local://'")
    && html.includes('📁 Выбрать файл модели (.litertlm)');
  if (!okDormant) failed++;
  console.log(`${okDormant ? '✓' : '✗'} локальный ИИ: дремлющий JS (без модуля — false), общий контекст, без заглушек local://`);
}

console.log(failed === 0 ? '\nUI INIT CHECK PASSED' : `\n${failed} UI INIT FAILURES`);
process.exit(failed === 0 ? 0 : 1);
