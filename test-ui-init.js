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
  'date-weekday', 'date-month',
  'stats-day-edit-open', 'workout-date', 'undo-snackbar', 'undo-snackbar-action',
  'food-edit-dialog', 'food-edit-form', 'workout-edit-dialog', 'workout-edit-form', 'day-edit-dialog', 'day-edit-form',
  'pro-open', 'pro-menu-status', 'pro-dialog', 'pro-email', 'pro-code', 'pro-activate', 'pro-cancel',
  'pro-active-line', 'pro-status', 'pro-deactivate', 'privacy-help',
  'quick-records-open', 'quick-records-dialog', 'quick-records-close', 'quick-records-tabs',
  'quick-records-tab-hint', 'quick-panel-combo', 'quick-panel-meals', 
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
  'ai-view', 'ai-view-back', 'ai-center-open', 'ai-tabs', 'ime-dock',
  'setup-wizard-open', 'setup-wizard-dialog', 'setup-wizard-emoji', 'setup-wizard-title',
  'setup-wizard-text', 'setup-wizard-progress', 'setup-wizard-actions', 'setup-wizard-yes',
  'setup-wizard-no', 'setup-wizard-finish-actions', 'setup-wizard-done', 'setup-wizard-prof',
  'setup-wizard-skip', 'support-dialog', 'support-later', 'support-open-pro',
  'pro-howto', 'charity-block', 'charity-list', 'about-support-block', 'about-support-open',
  'quick-open-meals',  'weekly-status-chip',
  'license-open', 'license-dialog', 'license-dialog-ok', 'terms-license-open',
  'license-lang-tabs', 'license-panel-ru', 'license-panel-en', 'license-panel-third-party',
  'charity-dialog', 'charity-dialog-ok', 'about-charity-open',
  'water-reminder-window-start', 'water-reminder-window-end',
  'quick-combo-name', 'quick-combo-text', 'quick-combo-save-btn', 'quick-combo-toggle', 'quick-meal-toggle', 'quick-meal-save-btn', 'storage-engine-status'
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
    && /openImeDock\(field\);\s*else closeImeDock\(\)/.test(app)
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
    && cssAll.includes('.ai-result-box.ai-scrollable::after') && cssAll.includes('.ai-result-box::-webkit-scrollbar { width: 6px; }');
  if (!okScroll) failed++;
  console.log(`${okScroll ? '✓' : '✗'} ИИ: честный маркер прокрутки (наблюдатель + градиент + скроллбар 6px, 0.3.32 — чуть тоньше)`);
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
  const okKotlin = kt.includes('name = "FitFlowLocalAI"') /* 0.4.5: аннотация многострочная (permissions) */ && kt.includes('fun importModel(')
    && kt.includes('fun loadModel(') && kt.includes('fun generate(') && kt.includes('fun unloadModel(')
    && kt.includes('litertlm') && !kt.includes('localhost')
    && kt.includes('SamplerConfig(topK = 40, topP = 0.95') && !kt.includes('topP = 0.95f') // v0.12.0: Double, не Float (ночной провальной сборки 152 урок)
    && gradle.includes('com.google.ai.edge.litertlm:litertlm-android') && gradle.includes('minSdkVersion 24')
    && gradle.includes('kotlin-gradle-plugin:2.2.21') // ровно версия stdlib от litertlm
    && gradle.includes("implementation project(':capacitor-android')") && !gradle.includes('implementation "com.getcapacitor');
  if (!okKotlin) failed++;
  console.log(`${okKotlin ? '✓' : '✗'} локальный ИИ: плагин полный (import/load/generate/unload), LiteRT-LM, minSdk 24`);
  const okDormant = app7.includes('window.Capacitor.Plugins.FitFlowLocalAI') && app7.includes('function canUseLocalLlm()')
    && app7.includes('function sendAiChatLocalLlm(') && app7.includes('canUseLocalLlm()')
    && app7.includes('buildAiSystemContext') && !app7.includes("modelPath = 'local://'")
    && html.includes('📁 Выбрать файл модели (.litertlm)');
  if (!okDormant) failed++;
  console.log(`${okDormant ? '✓' : '✗'} локальный ИИ: дремлющий JS (без модуля — false), общий контекст, без заглушек local://`);
}

// 0.3.32: честный остаток парсера, «План дня» (приёмы · позиции), значок «?» справа,
// единое семейство скроллбаров, усиленные паузы голоса (патч)
{
  const app8 = fs.readFileSync('app.js', 'utf8');
  const css8 = fs.readFileSync('style.css', 'utf8');
  const okSoup = app8.includes('function parseSoupCombo(') && app8.includes('const SOUP_PORTION_GRAMS = 300;')
    && app8.includes('const SOUP_MEAT_GRAMS = 50;') && app8.includes('COMPANION_GRAMS[right.key] || SOUP_MEAT_GRAMS');
  if (!okSoup) failed++;
  console.log(`${okSoup ? '✓' : '✗'} парсер: суп «со/с» — тарелка 300 г + добавка (приправы по карте, штучные — 1 шт)`);
  const okMiss = app8.includes('function parseMealTextDetailed(') && app8.includes('function isMeaningfulMiss(')
    && app8.includes('unparsed.push(...segDetailed.missed)') && app8.includes("'⚠️ Не разобрал: «'")
    && app8.includes('<b>Не разобрал</b>');
  if (!okMiss) failed++;
  console.log(`${okMiss ? '✓' : '✗'} честность ввода: непонятный остаток виден и в умном вводе, и в ИИ-поле (не молчим)`);
  const okPlan = app8.includes('function ruForms(') && app8.includes("['приём', 'приёма', 'приёмов']")
    && app8.includes("['позиция', 'позиции', 'позиций']") && app8.includes('const foodMealsLogged = computeMealsEatenToday()');
  if (!okPlan) failed++;
  console.log(`${okPlan ? '✓' : '✗'} «План дня»: честные единицы — приёмы · позиции (не «11 зап.» продуктов)`);
  const okHint = html.includes('О голосовом офлайн-вводе <span class="help-dot smart-help-dot"')
    && !html.includes('>? О голосовом офлайн-вводе</button>')
    && !html.includes('Голосовой режим появится после отдельного тестирования моделей');
  if (!okHint) failed++;
  console.log(`${okHint ? '✓' : '✗'} «?» — классически справа от надписи; справка о голосе правдива (голос уже работает)`);
  const okBars = css8.includes('::-webkit-scrollbar { width: 5px; height: 5px; }')
    && css8.includes('var(--primary) 30%, transparent); border-radius: 3px; }')
    && css8.includes('.smart-preview::-webkit-scrollbar { width: 6px; }')
    && css8.includes('.ai-result-box::-webkit-scrollbar { width: 6px; }')
    && css8.includes('.home-quicknav::-webkit-scrollbar { display: none; }');
  if (!okBars) failed++;
  console.log(`${okBars ? '✓' : '✗'} скроллбары: единое семейство — экран primary 30%/5px, окна разбора 55%/6px (быстрый нав — без полосы)`);
  const patch = fs.existsSync('tools/github-workflows/VOICE_PAUSE_PATCH.md')
    ? fs.readFileSync('tools/github-workflows/VOICE_PAUSE_PATCH.md', 'utf8') : '';
  const okPause = patch.includes('EXTRA_SPEECH_INPUT_MINIMUM_LENGTH_MILLIS, 6000L')
    && patch.includes('EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 4500L')
    && patch.includes('не короче 6 с');
  if (!okPause) failed++;
  console.log(`${okPause ? '✓' : '✗'} голос: сессия ≥6 с (нижняя граница, не лимит), тишина 4–4,5 с (полевое «отключается во время ввода»)`);
}

// 0.3.33: единый акцент карточки в ИИ-разделе (вторая полоса убрана), полный файл-замена в зеркале
{
  const css9 = fs.readFileSync('style.css', 'utf8');
  const aiGroupRule = /\.ai-settings-group\s*\{[^}]*\}/.exec(css9);
  const okOneBar = (!aiGroupRule || !aiGroupRule[0].includes('border-left'))
    && css9.includes('border-left: 3px solid color-mix(in srgb, var(--primary) 65%, transparent)')
    && css9.includes('Дополнительная линия УБРАНА');
  if (!okOneBar) failed++;
  console.log(`${okOneBar ? '✓' : '✗'} ИИ-настройки: одна стандартная акцентная линия карточки (вторая полоса убрана)`);
  const mirror = fs.readFileSync('tools/github-workflows/build.yml', 'utf8');
  const okMirror = mirror.includes('npm install ./plugins/fitflow-local-ai')
    && mirror.includes('minSdkVersion = 24')
    && mirror.includes('EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS, 4500L')
    && mirror.includes('EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS, 4000L');
  if (!okMirror) failed++;
  console.log(`${okMirror ? '✓' : '✗'} зеркало build.yml = готовый полный файл (LOCAL_AI + VOICE_PAUSE внутри)`);
}

// 0.3.37: починка нативной сборки по прочитанному логу (run 31261706136) —
// ActivityResult только из androidx; R8 8.5.35 в файле-замене для Java-21 dex
{
  const ktB = fs.readFileSync('plugins/fitflow-local-ai/android/src/main/java/ru/fitflow/localai/FitFlowLocalAiPlugin.kt', 'utf8');
  const gradleB = fs.readFileSync('plugins/fitflow-local-ai/android/build.gradle', 'utf8');
  const okImports = ktB.includes('import androidx.activity.result.ActivityResult')
    && !ktB.includes('com.getcapacitor.ActivityResult')
    && gradleB.includes('androidx.activity:activity:1.7.0');
  if (!okImports) failed++;
  console.log(`${okImports ? '✓' : '✗'} починка компиляции: ActivityResult — androidx.activity.result (в Capacitor 5 класса com.getcapacitor.ActivityResult НЕТ), зависимость activity:1.7.0`);
  const mirrorB = fs.readFileSync('tools/github-workflows/build.yml', 'utf8');
  const okR8 = mirrorB.includes("classpath 'com.android.tools:r8:8.5.35'")
    && mirrorB.includes('major version 65');
  if (!okR8) failed++;
  console.log(`${okR8 ? '✓' : '✗'} файл-замена: R8 8.5.35 в buildscript корневого build.gradle — D8 читает Java-21 байткод litertlm (лог 0.3.36)`);
}

// 0.3.38: температура 0.4 против «фантазий» 1B (полевой тест build 158), честная
// инструкция краткости; склонение единиц в разборе («2 куска», «2 стакана»)
{
  const appC = fs.readFileSync('app.js', 'utf8');
  const ktC = fs.readFileSync('plugins/fitflow-local-ai/android/src/main/java/ru/fitflow/localai/FitFlowLocalAiPlugin.kt', 'utf8');
  const okTemp = appC.includes('maxTokens: 4096, temperature: 0.7 })')
    && !appC.includes('maxTokens: 4096, temperature: 0.4 })')
    && ktC.includes('lastTemperature = temperature') && ktC.includes('temperature = lastTemperature)')
    && !ktC.includes('temperature = 0.7)');
  if (!okTemp) failed++;
  console.log(`${okTemp ? '✓' : '✗'} температура 0.7 (0.4.0, просьба пользователя: E2B держит), lastTemperature без рассинхрона`);
  const okPrompt = appC.includes('грамотно и кратко: 3–6 коротких предложений') && appC.includes('Если не уверен в факте — честно скажи');
  if (!okPrompt) failed++;
  console.log(`${okPrompt ? '✓' : '✗'} инструкция локальной модели: кратко, грамотно, честно (не уверен — скажи, не выдумывай)`);
  const okUnits = appC.includes('function ruUnitName(') && appC.includes("'стакан': ['стакан', 'стакана', 'стаканов']")
    && (appC.match(/ruUnitName\(item\.amount, item\.unit\)/g) || []).length === 2
    && appC.includes('if (!Number.isInteger(Number(n))) return forms[1];');
  if (!okUnits) failed++;
  console.log(`${okUnits ? '✓' : '✗'} склонение единиц в разборе: «2 куска / 2 стакана / 0,5 стакана», обе ветви describeFoodItemLine`);
}

// 0.3.39: живой стриминг ответа нейросети (полевая боль «3 минуты молчания») +
// честный этап «поднимаю модель»; голос — тишина 4/4,5 с с объяснением floor
{
  const appD = fs.readFileSync('app.js', 'utf8');
  const ktD = fs.readFileSync('plugins/fitflow-local-ai/android/src/main/java/ru/fitflow/localai/FitFlowLocalAiPlugin.kt', 'utf8');
  const patchD = fs.readFileSync('tools/github-workflows/VOICE_PAUSE_PATCH.md', 'utf8');
  const okStream = ktD.includes('notifyListeners("generateProgress", progress)')
    && appD.includes("plugin.addListener('generateProgress',")
    && appD.includes('…печатаю на устройстве — можно читать по ходу.')
    && appD.includes('async function sendAiChatLocalLlm(');
  if (!okStream) failed++;
  console.log(`${okStream ? '✓' : '✗'} локальная нейросеть: живой стриминг в окно чата (generateProgress), async-цепочка этапов`);
  const okStage = appD.includes('одна загрузка до минуты, следующие ответы быстрее');
  if (!okStage) failed++;
  console.log(`${okStage ? '✓' : '✗'} честный этап «поднимаю модель в память» — долгий старт ≠ зависание приложения`);
  const okVoice = patchD.includes('НИЖНЯЯ граница') && patchD.includes('4500L') && patchD.includes('4000L');
  if (!okVoice) failed++;
  console.log(`${okVoice ? '✓' : '✗'} патч голоса: тишина 4/4,5 с + объяснение «6 с = нижняя граница, не лимит»`);
}

// 0.4.0: фото еды нейросетью — целевой сценарий ТЗ (зрячая E2B у пользователя),
// черновая итерация: нейронка описывает снимок строками, расчёты делает парсер
{
  const appE = fs.readFileSync('app.js', 'utf8');
  const ktE = fs.readFileSync('plugins/fitflow-local-ai/android/src/main/java/ru/fitflow/localai/FitFlowLocalAiPlugin.kt', 'utf8');
  const okPhotoNative = ktE.includes('fun generateWithImage(') && ktE.includes('Content.ImageBytes(')
    && ktE.includes('visionBackend = if (withVision) Backend.CPU() else null') /* 0.4.7: GPU откачена */
    && ktE.includes('"no_vision"') && ktE.includes('ret.put("vision", visionEnabled)');
  if (!okPhotoNative) failed++;
  console.log(`${okPhotoNative ? '✓' : '✗'} фото в нативе: generateWithImage(ImageBytes), зрение→откат text-only, коды no_vision/timeout`);
  const okPhotoUi = html.includes('id="smart-entry-photo"') && html.includes('id="smart-entry-photo-input"')
    && appE.includes('const AI_PHOTO_PROMPT') && appE.includes('function cleanPhotoDraftText(')
    && appE.includes('async function runPhotoFoodRecognition(') && appE.includes('function resizeImageToJpegBase64(')
    && appE.includes('!st.vision');
  if (!okPhotoUi) failed++;
  console.log(`${okPhotoUi ? '✓' : '✗'} фото в UI: кнопка 📷 в умном вводе, сжатие 768px, черновик → parseSmartEntry → подтверждение`);
}

// 0.4.1: полевые баги фото — (а) камера ИИ-поля вела на тост-заглушку
// «Фото получено…» и ничего не делала; (б) этапы прятались в исчезающие тосты;
// (в) кнопка 📷 умного ввода не поднимала модель из холода. Плюс правдивость:
// сравнения «больше/меньше нормы» считает JS, не нейросеть (кейс «2300 > 2500»).
{
  const appF = fs.readFileSync('app.js', 'utf8');
  const okEngine = appF.includes('async function recognizeFoodPhotoLocal(')
    && appF.includes('function markPhotoProvenance(')
    && appF.includes("plugin.addListener('generateProgress',");
  if (!okEngine) failed++;
  console.log(`${okEngine ? '✓' : '✗'} единый локальный фото-движок: этапы в панели, стриминг зрения, пометка-провенанс`);

  const okQuickCam = appF.indexOf('function handleAiQuickCamera(file) {') >= 0
    && appF.indexOf('recognizeFoodPhotoLocal(file, input, resultBox, () => parseAiQuickEntry(), true);')
      > appF.indexOf('function handleAiQuickCamera(file) {')
    && appF.indexOf('recognizeFoodPhotoLocal(file, input, resultBox, () => parseAiQuickEntry(), true);')
      < appF.indexOf('recognizeFoodPhoto(file, input, resultBox, () => parseAiQuickEntry());')
    && !appF.includes('Распознавание по фото работает с облачным ИИ (Gemini): Настройки');
  if (!okQuickCam) failed++;
  console.log(`${okQuickCam ? '✓' : '✗'} камера ИИ-поля: локальный зрячий путь ПЕРВЫМ, тост-заглушка удалена`);

  const okRecipeCam = appF.includes("recognizeFoodPhotoLocal(file, recipeInput, resultBox, () => generateAiRecipe());");
  if (!okRecipeCam) failed++;
  console.log(`${okRecipeCam ? '✓' : '✗'} камера рецептов: тот же локальный путь, облако — запасной`);

  const okOpenDlg = appF.includes('if (dlg && dlg.hidden) openSmartEntry();')
    && appF.includes("toast('Сначала выберите зрячую модель: Настройки → ✨ ИИ-помощник → Gemma E2B (.litertlm).', 6000)");
  if (!okOpenDlg) failed++;
  console.log(`${okOpenDlg ? '✓' : '✗'} умный ввод: диалог гарантированно открыт, длинная инструкция (6 с) вместо мелькания`);

  // 0.4.2: проверка переехала в функцию isPhotoNoFoodAnswer (расширенный детектор)
  const okNetCheck = appF.includes('/^нет([^a-zа-яё0-9]|$)/i.test(d)');
  if (!okNetCheck) failed++;
  console.log(`${okNetCheck ? '✓' : '✗'} честный отказ фото: «нет» проверяется юникодо-устойчиво (\\b с кириллицей не работает)`);

  const okTruth = appF.includes("'это МЕНЬШЕ цели на '") && appF.includes("'это БОЛЬШЕ цели на '")
    && appF.includes('kcalLeft') && appF.includes('никогда не выполняй арифметику и не сравнивай числа между собой сам');
  if (!okTruth) failed++;
  console.log(`${okTruth ? '✓' : '✗'} правдивость чисел нутрициолога: сравнения/остатки считает JS, модель пересказывает`);

}

// 0.4.2: полевой тест фото №2 — галерея (без capture пикер даёт выбор камера/файлы),
// веса: зрение считает ШТУКИ, весит база; температура фото 0.2 против фантазий;
// детектор честного отказа шире одного слова; база знает вяленого кальмара и чупа-чупс.
{
  const appG = fs.readFileSync('app.js', 'utf8');
  const ktG = fs.readFileSync('plugins/fitflow-local-ai/android/src/main/java/ru/fitflow/localai/FitFlowLocalAiPlugin.kt', 'utf8');
  // 0.4.7: промежуточный вывод «убрать capture» опровергнут оболочками —
  // финальная схема: capture-инпут (камера) + отдельный инпут (галерея).
  const okGallery = html.includes('id="ai-quick-gallery-input" accept="image/*" hidden>')
    && html.includes('id="ai-quick-camera-input" accept="image/*" capture="environment"');
  if (!okGallery) failed++;
  console.log(`${okGallery ? '✓' : '✗'} галерея/камера: два пути — capture (камера) и галерея (0.4.7, урок оболочек)`);

  const okPrompt = appG.includes('Штучные продукты пиши КОЛИЧЕСТВОМ, не весом') && appG.includes('одним словом: нет')
    && appG.includes('средний помидор — примерно 120');
  if (!okPrompt) failed++;
  console.log(`${okPrompt ? '✓' : '✗'} промпт 0.4.2: штучное количеством (вес даёт база), якоря веса, строгий «нет»`);

  const okTemp = appG.includes('const AI_PHOTO_TEMPERATURE = 0.2;')
    && appG.includes('imageBase64: base64, temperature: AI_PHOTO_TEMPERATURE')
    && ktG.includes('private fun recreateConversation(temp: Double)')
    && ktG.includes('if (photoTemp != null && photoTemp != chatTemp) recreateConversation(chatTemp)');
  if (!okTemp) failed++;
  console.log(`${okTemp ? '✓' : '✗'} температура фото 0.2 (экстракция ≠ разговор), чатовая возвращается после`);

  const okNoFood = appG.includes('function isPhotoNoFoodAnswer(draft)')
    && appG.includes('if (isPhotoNoFoodAnswer(draft))');
  if (!okNoFood) failed++;
  console.log(`${okNoFood ? '✓' : '✗'} честный отказ расширен: «на фото нет еды», «не вижу еды» тоже отказ`);

  const okDb = appG.includes("'кальмар вяленый': { kcal: 300") && appG.includes("'чупа-чупс': { kcal: 46, p: 0, f: 0, c: 11.4, per: 'шт' }");
  if (!okDb) failed++;
  console.log(`${okDb ? '✓' : '✗'} база: вяленый/сушёный кальмар (в 4 раза калорийнее варёного), чупа-чупс штучный`);

}

// 0.4.3: полевой тест №3 — (а) пункт «Камера» пропал из пикера (manifest!),
// (б) «Бутылка воды» молча пропадала из итога, (в) «Тарелка 300 г» — артефакт
// якоря; «Пакет с…» занижал штуки; листья салата взвешивались блюдом-салатом.
{
  const appH = fs.readFileSync('app.js', 'utf8');
  const wfH = fs.readFileSync('tools/github-workflows/build.yml', 'utf8');
  const okCam = wfH.includes('android.permission.CAMERA') && wfH.includes('android.hardware.camera.any')
    && wfH.includes('CAMERA_CHOOSER_PATCH');
  if (!okCam) failed++;
  console.log(`${okCam ? '✓' : '✗'} зеркало workflow: CAMERA permission + uses-feature (пункт «Камера» в пикере — требует замены файла пользователем)`);

  const okWater = appH.includes('бутылк[а-яё]*') && appH.includes('waterBottleFirst')
    && appH.includes('wateryPart') && appH.includes("unparsed.push(wateryPart)");
  if (!okWater) failed++;
  console.log(`${okWater ? '✓' : '✗'} вода: «бутылка воды» 500 мл обеими порядками + страж «не молчим про воду без объёма»`);

  const okPrompt43 = appH.includes('Посуду и тару без содержимого не называй')
    && appH.includes('«чупа-чупс 7 шт»') && appH.includes('«бутылка воды»');
  if (!okPrompt43) failed++;
  console.log(`${okPrompt43 ? '✓' : '✗'} промпт 0.4.3: «тарелка 300 г»/«пакет с…» — не позиции, пакет считать штуками`);

  const okGreens = appH.includes("'салат листовой': { kcal: 14") && appH.includes("'листья салата': { kcal: 14");
  if (!okGreens) failed++;
  console.log(`${okGreens ? '✓' : '✗'} база: листовая зелень 14 ккал — не блюдо-салат с маслом (55) подставой`);

}

// 0.4.4: приоритет кадра (просьба пользователя): главное = полностью в кадре по
// центру; периферия — только явная еда/напиток; фон/декор — не называть.
{
  const appI = fs.readFileSync('app.js', 'utf8');
  const okFocus = appI.includes('Кадр читай по приоритету фотографа')
    && appI.includes('целиком поместилось в кадр и лежит в центре')
    && appI.includes('декор, цветы на посуде, скатерть, руки, мебель и неузнаваемое не называй');
  if (!okFocus) failed++;
  console.log(`${okFocus ? '✓' : '✗'} промпт 0.4.4: приоритет кадра — центр первичен, периферия только явная еда, фон — молчание`);

}

// 0.4.5: полевой баг «разрешение declared, но пункта Камера нет» — WebView видит
// только GRANTED: спрашиваем по делу при нажатии 📷 (не при старте). Плюс честные
// пометки: упаковка без числа ≠ 1 шт молча; «куриные кусочки» со шашлычного фото.
{
  const appJ = fs.readFileSync('app.js', 'utf8');
  const ktJ = fs.readFileSync('plugins/fitflow-local-ai/android/src/main/java/ru/fitflow/localai/FitFlowLocalAiPlugin.kt', 'utf8');
  // 0.4.7 (урок capture): permission-подход откачен — у оболочек пикер камеры
  // лишён совсем; capture-интент разрешения не требует и работает везде.
  const okPerm = !ktJ.includes('requestPermissionForAlias("camera"')
    && !appJ.includes('ensureCameraPermissionForPicker')
    && appJ.includes('function handleSmartEntryPhotoGallery()');
  if (!okPerm) failed++;
  console.log(`${okPerm ? '✓' : '✗'} камера-пикер: capture-путь (без permission) + отдельная галерея (урок оболочек)`);

  const okPack = appJ.includes('упаковка без количества — принято 1 шт') && appJ.includes('packNoCount')
    && appJ.includes("'куриные кусочки': { kcal: 78");
  if (!okPack) failed++;
  console.log(`${okPack ? '✓' : '✗'} честные пометки: «пакет с…» ≠ молчаливая 1 шт; база знает «куриные кусочки» ≈78 ккал/шт`);

}

// 0.4.7 (откат 0.4.6 по полевому замеру владельца): GPU оказался медленнее CPU
// на его чипе при неизменном качестве — CPU-каскад возвращён, памятка на месте.
{
  const ktK = fs.readFileSync('plugins/fitflow-local-ai/android/src/main/java/ru/fitflow/localai/FitFlowLocalAiPlugin.kt', 'utf8');
  const okGpuRevert = !ktK.includes('Backend.GPU()') && ktK.includes('backend = Backend.CPU()')
    && ktK.includes('ПАМЯТКА 0.4.7: GPU-бэкенд (0.4.6)');
  if (!okGpuRevert) failed++;
  console.log(`${okGpuRevert ? '✓' : '✗'} GPU-откат 0.4.7: поле важнее бенча производителя, CPU-каскад с памяткой`);
}

// 0.4.7: UI камеры — capture-инпуты вернулись на всех трёх точках + 🖼 галерея;
// тост поднят выше IME-дока (перекрытие полем/клавиатурой — полевая жалоба).
{
  const cap47 = html.includes('id="smart-entry-photo-input" accept="image/*" capture="environment"')
    && html.includes('id="ai-quick-camera-input" accept="image/*" capture="environment"')
    && html.includes('id="ai-recipe-camera-input" accept="image/*" capture="environment"');
  const gal47 = html.includes('id="smart-entry-photo-file-input" accept="image/*" hidden>')
    && html.includes('id="ai-quick-gallery-input" accept="image/*" hidden>')
    && html.includes('id="ai-recipe-gallery-input" accept="image/*" hidden>')
    && html.includes('id="ai-quick-gallery-btn"') && html.includes('id="ai-recipe-gallery-btn"')
    && html.includes('id="smart-entry-photo-gallery"');
  const okCamUi = cap47 && gal47;
  if (!okCamUi) failed++;
  console.log(`${okCamUi ? '✓' : '✗'} UI камеры: 📷 capture × 3 + 🖼 галерея × 3 (отдельные надёжные пути)`);
  const css47 = fs.readFileSync('style.css', 'utf8');
  const okToast = css47.includes('bottom: calc(45vh + env(safe-area-inset-bottom))');
  if (!okToast) failed++;
  console.log(`${okToast ? '✓' : '✗'} тост поднят над IME-доком (читаем с открытой клавиатурой)`);
}

// 0.4.8: полевой OOM «после ✓ вышвырнуло на главный экран» — перед камерой
// выгружаем модель (~3 ГБ → процесс переживает съёмку); метка прерванного
// пикера с честным сообщением на старте; выгрузка не трогает занятый движок.
{
  const appK = fs.readFileSync('app.js', 'utf8');
  const ktL = fs.readFileSync('plugins/fitflow-local-ai/android/src/main/java/ru/fitflow/localai/FitFlowLocalAiPlugin.kt', 'utf8');
  const okUnload = appK.includes('function unloadLocalModelForCamera()')
    && appK.includes('plugin.unloadModel()')
    && appK.includes("openSmartPhotoPicker('#smart-entry-photo-input', { camera: true })")
    && appK.includes("openPhotoPickerInput('#ai-quick-camera-input', { camera: true })")
    && appK.includes("openPhotoPickerInput('#ai-recipe-camera-input', { camera: true })");
  if (!okUnload) failed++;
  console.log(`${okUnload ? '✓' : '✗'} камера 0.4.8: модель выгружается из памяти перед съёмкой на всех 3 точках (OOM-профилактика)`);

  const okMark = appK.includes("localStorage.setItem('ff.photoPick.pending'")
    && appK.includes('function reportInterruptedPhotoPick()')
    && appK.includes('setTimeout(reportInterruptedPhotoPick, 1500)')
    && appK.includes("document.addEventListener('visibilitychange'")
    && (appK.match(/clearPhotoPickerPending\(\);/g) || []).length >= 7;
  if (!okMark) failed++;
  console.log(`${okMark ? '✓' : '✗'} «не молчать» 0.4.8: метка прерванного пикера → честный тост на старте; отмена пикера гасится по видимости`);

  const okKt = ktL.includes('if (generating.get()) { call.resolve(); return; }');
  if (!okKt) failed++;
  console.log(`${okKt ? '✓' : '✗'} Kotlin 0.4.8: выгрузка не трогает движок во время генерации (busy-гард)`);
}

// 0.4.9: полевой баг «за вчерашний день нет информации вообще» — объект дня
// собирали, но в byDate НЕ клали: история обнулялась при каждом сохранении.
// byDate.set на месте, операция чистая с node-прогоном; статистика в дни без
// сводки берёт правду минут из журнала тренировок. Плюс P11-бутерброд.
{
  const appL = fs.readFileSync('app.js', 'utf8');
  const okHist = appL.includes('byDate.set(normalized.date, normalized);')
    && appL.includes('function normalizeDailyHistoryList(list)')
    && appL.includes('state.dailyHistory = normalizeDailyHistoryList(state.dailyHistory);')
    && appL.includes('activityMinutes: activityMinutesForDate(date)');
  if (!okHist) failed++;
  console.log(`${okHist ? '✓' : '✗'} история дней 0.4.9: byDate.set восстановлен (silent wipe закрыт), минуты активности — из живого журнала`);

  const okSand = appL.includes('function sandwichTailLooksFillings(prev)')
    && appL.includes('!/(?:^|\\s)с\\s+\\S/iu.test(part)')
    && appL.includes('function splitJuxtaposedFillings(chunk)')
    && appL.includes('splitJuxtaposedFillings(part) || [part]');
  if (!okSand) failed++;
  console.log(`${okSand ? '✓' : '✗'} P11-бутерброд 0.4.9: хвост начинок любой длины, страж от «кофе с молоком», перечисление без союза «и»`);
}

// 0.4.10: правдивость фото-разбора (якоря веса + запрет дублей в промпте,
// дедуп в парсере), рецепты — нейросеть на устройстве (local → cloud → шаблон),
// шрифты тем из системных семейств (без роста APK и без сети).
{
  const appM = fs.readFileSync('app.js', 'utf8');
  const okPrompt = appM.includes('повторы запрещены: «горошек» и «зелёный горошек» — один продукт')
    && appM.includes('Слово «порция» не используй')
    && appM.includes('овощной смеси 30–50 граммов');
  if (!okPrompt) failed++;
  console.log(`${okPrompt ? '✓' : '✗'} фото-промпт 0.4.10: граммы вместо «порций», якоря тарелки (150–200/100–150/30–50), дубли запрещены`);

  const okMerge = appM.includes('function mergeDuplicateFoodItems(items)')
    && appM.includes('food: mergeDuplicateFoodItems(food), unparsed');
  if (!okMerge) failed++;
  console.log(`${okMerge ? '✓' : '✗'} дедуп 0.4.10: mergeDuplicateFoodItems в parseSmartEntry (страховка против двойного счёта)`);

  const okRecipe = appM.includes('async function enhanceRecipeWithLocalLlm(')
    && appM.includes("getLocalAiPlugin() && hasRealLocalModel() && state.aiSettings.mode !== 'cloud'")
    && appM.includes('enhanceRecipeWithLocalLlm(resultBox, stepsBoxId, items, volumeText)')
    && appM.includes('🧠 …печатаю рецепт на устройстве')
    && appM.includes('🧠 Нейросеть не ответила (')
    && appM.includes('else if (isCloudAiReady()) {');
  if (!okRecipe) failed++;
  console.log(`${okRecipe ? '✓' : '✗'} рецепты 0.4.10: нейросеть на устройстве со стримингом (local → cloud только по явному выбору → шаблон), КБЖУ — локальная база`);

  const okFont = html.includes('id="font-segmented"')
    && html.includes('data-font="standard"') && html.includes('data-font="condensed"') && html.includes('data-font="serif"')
    && appM.includes('function applyFont(font)') && appM.includes('applyFont(getFont());')
    && appM.includes("localStorage.getItem('fitflow:font')");
  const cssM = fs.readFileSync('style.css', 'utf8');
  const okFontCss = okFont && cssM.includes('html[data-font="condensed"] body') && cssM.includes('html[data-font="serif"] body');
  if (!okFontCss) failed++;
  console.log(`${okFontCss ? '✓' : '✗'} шрифты тем 0.4.10: Стандарт/Узкий/Книжный из системных семейств (офлайн, 0 байт в APK), выбор сохраняется`);
}

// 0.4.11: уникальные ФАЙЛОВЫЕ шрифты тем (Neon=Manrope, Sport=Russo One,
// Лес=PT Serif, Виноград=Comfortaa; до загрузки .ttf — тихий системный откат;
// ручной выбор шрифта идёт ПОСЛЕ и сильнее). Плюс база «перец» и зеркало.
{
  const cssN = fs.readFileSync('style.css', 'utf8');
  const appN = fs.readFileSync('app.js', 'utf8');
  const wfN = fs.readFileSync('tools/github-workflows/build.yml', 'utf8');
  const okFaces = cssN.includes('font-family: "Manrope"') && cssN.includes('assets/fonts/manrope.ttf')
    && cssN.includes('font-family: "Russo One"') && cssN.includes('assets/fonts/russoone.ttf')
    && cssN.includes('font-family: "PT Serif Custom"') && cssN.includes('ptserif-regular.ttf') && cssN.includes('ptserif-bold.ttf')
    && cssN.includes('font-family: "Comfortaa"') && cssN.includes('assets/fonts/comfortaa.ttf');
  // 0.4.14 (фидбэк «Спорт-Стандарт жутковато — толсто и крупно»): у sport
  // Russo One убран из body — остался только в заголовках (характер темы).
  const okThemeFonts = cssN.includes('html[data-palette="neon"] body,')
    && cssN.includes('html[data-palette="sport"] h1')
    && !cssN.includes('html[data-palette="sport"] body {')
    && cssN.includes('html[data-palette="forest"] body')
    && cssN.includes('html[data-palette="berry"] body,');
  // Ручной выбор (data-font) стоит ПОЗЖЕ тематических правил — перекрывает их.
  const okOrder = cssN.indexOf('html[data-font="condensed"] body') > cssN.indexOf('html[data-palette="berry"] body,');
  const okFonts = okFaces && okThemeFonts && okOrder;
  if (!okFonts) failed++;
  console.log(`${okFonts ? '✓' : '✗'} файловые шрифты тем 0.4.11: 5 @font-face + правила на 4 темы, ручной выбор сильнее тематического`);

  const okDb = appN.includes("'перец': { kcal: 27") && appN.includes("'перец сладкий': { kcal: 27");
  const okMirror = wfN.includes('cp assets/fonts/*.ttf www/assets/fonts/');
  const okAll = okDb && okMirror;
  if (!okAll) failed++;
  console.log(`${okAll ? '✓' : '✗'} база «перец» (⚠️-находка) + зеркало workflow копирует assets/fonts в APK`);
}

// 0.4.12: виджет/уведомление — дата-стражи (вчерашние цифры утром), база
// крыльев, бутерброд с уточнением начинки («с вареной колбасой» честнее базовой).
{
  const wfP = fs.readFileSync('tools/github-workflows/build.yml', 'utf8');
  const appP = fs.readFileSync('app.js', 'utf8');
  const dateGuardCount = (wfP.match(/savedDate\.equals\(today\)|!savedDate\.equals\(today\)/g) || []).length;
  const okDate = dateGuardCount >= 3 && wfP.includes('0.4.12') && wfP.includes('new java.text.SimpleDateFormat("yyyy-MM-dd")');
  if (!okDate) failed++;
  console.log(`${okDate ? '✓' : '✗'} виджет/уведомление 0.4.12: дата-стражи в трёх точках (экран, +250-приёмник, текст уведомления)`);

  const okWings = appP.includes("'жареные куриные крылья': { kcal: 254") && appP.includes("'куриные крылья': { kcal: 203");
  const okSand = appP.includes("fillingParts[0].trim().split(/\\s+/).length === 1")
    && appP.includes("fillingParts.length === 1 ? known[0].product.key : fillingParts.join(' и ')");
  const okAll = okWings && okSand;
  if (!okAll) failed++;
  console.log(`${okAll ? '✓' : '✗'} база крыльев + кураторский ключ только для голой начинки (условие одного слова), имя одной начинки — ключ базы`);
}

// 0.4.13: уведомления — обновление без повторного звука, смахивание = 45 мин
// тишины; журнал распознаваний (полевой контур честности: ввод→разбор→записано).
{
  const wfQ = fs.readFileSync('tools/github-workflows/build.yml', 'utf8');
  const appQ = fs.readFileSync('app.js', 'utf8');
  const okNotif = wfQ.includes('.setOnlyAlertOnce(true)') && wfQ.includes('WATER_REMINDER_DISMISSED')
    && wfQ.includes('DISMISS_MUTE_MS') && wfQ.includes('KEY_MUTE_UNTIL');
  if (!okNotif) failed++;
  console.log(`${okNotif ? '✓' : '✗'} уведомления 0.4.13: onlyAlertOnce (правка текста молчит), смахивание глушит 45 минут`);

  const okLog = appQ.includes('const PARSE_LOG_KEY') && appQ.includes('normalizeParseLogList')
    && appQ.includes('logParseEvent(') && appQ.includes('markParseLogSaved')
    && html.includes('id="parse-log-export-btn"') && html.includes('id="parse-log-status"')
    && appQ.includes("bindEvent('#parse-log-export-btn'");
  if (!okLog) failed++;
  console.log(`${okLog ? '✓' : '✗'} журнал распознаваний 0.4.13: кольцо 300, all-разборы, экспорт/копия/очистка в настройках ИИ`);

  const okDb13 = appQ.includes("'полукопченая колбаса'") && appQ.includes("'рыба в кляре'")
    && appQ.includes("'овсяное печенье': { kcal: 450, p: 6, f: 18, c: 65, pieceG: 15")
    && appQ.includes('LOOKUP_STOP_WORDS') && appQ.includes('lookupWordNegated')
    && appQ.includes("'омлет с молоком'") && appQ.includes("'окорочка'");
  if (!okDb13) failed++;
  console.log(`${okDb13 ? '✓' : '✗'} база 0.4.13: виды колбас/курица-части/кляр-панировка, печенье 15 г, стоп+негация гарды lookup`);

  const okPrompt13 = appQ.includes('Кашу называй кашей') && appQ.includes('не «черника»');
  if (!okPrompt13) failed++;
  console.log(`${okPrompt13 ? '✓' : '✗'} промпт 0.4.13: каша ≠ ягода, добавка малым весом отдельной строкой (полевой промах «гречка→черника»)`);
}

// 0.4.14: «Мои комбо» (завтрак одним тапом), маячок журнала под разбором,
// недельный отчёт нейросетью на устройстве, значки тем (слоты), весы SVG,
// sport-шрифт только в заголовках, компактные сегменты настроек.
{
  const appR = fs.readFileSync('app.js', 'utf8');
  const cssR = fs.readFileSync('style.css', 'utf8');

  const okComboCode = appR.includes('function normalizeCombos') && appR.includes('const COMBOS_LIMIT = 12')
    && appR.includes('function useCombo') && appR.includes('function renderComboChips')
    && appR.includes('function commitParsedEntry') && appR.includes('function saveComboFromSmartEntry')
    && appR.includes('normalizeCombosState();')
    && appR.includes("bindEvent('#combo-manage-btn'") && appR.includes("bindEvent('#smart-entry-combo-btn'")
    && appR.includes("data-combo-use=") && appR.includes("data-combo-remove=") && appR.includes("data-combo-rename=");
  const okComboHtml = html.includes('id="combo-chips"') && html.includes('id="combo-manage-btn"')
    && html.includes('id="combo-dialog"') && html.includes('id="combo-list"')
    && html.includes('id="combo-new-text"') && html.includes('id="smart-entry-combo-btn"');
  const okComboCss = cssR.includes('.combo-section') && cssR.includes('.combo-row');
  const okCombo = okComboCode && okComboHtml && okComboCss;
  if (!okCombo) failed++;
  console.log(`${okCombo ? '✓' : '✗'} 0.4.14 комбо: код+HTML+CSS+биндинги, кнопка «☆ В комбо» в умном вводе`);

  const captionCalls = (appR.match(/parseLogCaptionHtml\(\)/g) || []).length;
  const okCaption = appR.includes('function parseLogCaptionHtml') && appR.includes('parse-log-caption')
    && captionCalls >= 2 && html.includes('id="parse-log-status"');
  if (!okCaption) failed++;
  console.log(`${okCaption ? '✓' : '✗'} 0.4.14 маячок журнала: подпись под разбором в умном вводе и ИИ-центре`);

  const okReport = appR.includes('function enhanceAnalysisWithLocalLlm')
    && appR.includes('function buildAnalysisFactsText')
    && appR.includes('ai-analysis-llm-note')
    && appR.includes("state.aiSettings.mode !== 'cloud'");
  if (!okReport) failed++;
  console.log(`${okReport ? '✓' : '✗'} 0.4.14 недельный отчёт: нейросеть на устройстве дополняет факты (цифры — локально)`);

  const okIcons = appR.includes('const THEME_ICON_SETS') && appR.includes('function applyThemeIconSet')
    && appR.includes('function homeCardIcon') && (html.match(/data-icon-slot=/g) || []).length >= 12;
  const okWeight = appR.includes('WEIGHT_SCALE_SVG_SM')
    && appR.indexOf('WEIGHT_SCALE_SVG_SM =') < appR.indexOf('const HOME_CARDS') // не TDZ
    && !html.includes('⚖');
  const okIconsAll = okIcons && okWeight;
  if (!okIconsAll) failed++;
  console.log(`${okIconsAll ? '✓' : '✗'} 0.4.14 значки тем: наборы слотов + применение; весы — SVG вместо ⚖️, без TDZ`);

  const okBench = !appR.includes('runAiBenchmark');
  const okCompact = cssR.includes('#palette-segmented button, #font-segmented button') && cssR.includes('flex: 1 1 27%');
  const okVer = appR.includes("const FITFLOW_VERSION = '0.6.0'") && html.includes('v0.6.0');
  const okMisc = okBench && okCompact && okVer;
  if (!okMisc) failed++;
  console.log(`${okMisc ? '✓' : '✗'} 0.4.14 прочее: бенчмарк убран, компактные сегменты, версия 0.5.5 в коде и «О приложении»`);

  // ===================== 0.4.15 =====================
  // 0.5.1: формулировка «записей N из M дн.» собирается через daysChunk
  const okTruthStats = appR.includes('в дни с записями') && appR.includes('daysChunk')
    && appR.includes('✓ +') && appR.includes('сверх')
    && appR.includes('renderWater();\n  renderDayPlan();') && appR.includes('renderFood();\n  renderDayPlan();');
  if (!okTruthStats) failed++;
  console.log(`${okTruthStats ? '✓' : '✗'} 0.4.15 правдивость: «нет данных ≠ 0» в статистике, >100% цели = успех, план дня при смене цели`);

  const okWeightTruth = appR.includes('появится линия динамики') && appR.includes('· 30 дн: ')
    && appR.includes('checklist-icon noted') && cssR.includes('.checklist-icon.noted');
  if (!okWeightTruth) failed++;
  console.log(`${okWeightTruth ? '✓' : '✗'} 0.4.15 правдивость-2: одна точка веса → текст, дельта 30 дн, сон «отмечен» нейтрально`);

  const okDock = appR.includes("!String(field.value || '').trim()")
    && appR.includes('cancelCourseReminders();')
    && !appR.includes('await cancelWaterReminders();\n  await cancelWaterReminders();');
  if (!okDock) failed++;
  console.log(`${okDock ? '✓' : '✗'} 0.4.15 стабильность ввода: док не перекрывает навигацию при тексте в поле; switchProfile без дублей, курсы гасятся`);

  const okAnalysisHost = appR.includes('ai-analysis-llm-note')
    && !appR.includes("insertAdjacentHTML('beforeend'")
    && appR.includes("activeStatsPeriod === 'month' ? 30 : 7")
    && !html.includes('ai-stats-period')
    && html.includes('Анализ периода · Помощник FitFlow');
  if (!okAnalysisHost) failed++;
  console.log(`${okAnalysisHost ? '✓' : '✗'} 0.4.15 п.8: блок нейросети сразу после заголовка анализа; один переключатель периода`);

  const okFonts = cssR.includes('html[data-font="standard"] h1')
    && appR.includes("document.documentElement.setAttribute('data-font', 'standard')")
    && appR.includes("localStorage.setItem('fitflow:font', f);");
  if (!okFonts) failed++;
  console.log(`${okFonts ? '✓' : '✗'} 0.4.15 п.4: явный «Стандарт» — единый шрифт поверх всех тем`);

  const okNav = html.includes('M4 7h8M18 7h2') // новые «ползунки» Настроек
    && !/data-nav="settings"[\s\S]{0,700}M12 2\.5v2\.5M12 19v2\.5/.test(html); // солнце = тема в шапке, не настройки
  if (!okNav) failed++;
  console.log(`${okNav ? '✓' : '✗'} 0.4.15 навигация: Настройки — не «солнце» (семантика значков)`);

  const okDate = cssR.includes('#date-label::first-letter')
    && !cssR.includes('#date-label { display: grid; gap: 1px; line-height: 1.1; text-transform: capitalize; }');
  if (!okDate) failed++;
  console.log(`${okDate ? '✓' : '✗'} 0.4.15 дата: «10 авг. 2026 г.» — заглавной нет у месяца/«г.»`);

  const okGoals = html.includes('data-goal-toggle="#water-goal-stepper"')
    && html.includes('data-goal-toggle="#food-goal-stepper"')
    && html.includes('data-goal-toggle="#weekly-goal-stepper"')
    && appR.includes('[data-goal-toggle]');
  if (!okGoals) failed++;
  console.log(`${okGoals ? '✓' : '✗'} 0.4.15 цели −/+ за кнопкой «Цель» на всех трёх карточках`);

  const okMood = appR.includes('data-mood-inline') && !appR.includes('mood-pick-open')
    && !html.includes('id="mood-dialog"') && html.includes('id="greeting-sub"')
    && appR.includes('GREETING_SUBTITLES');
  if (!okMood) failed++;
  console.log(`${okMood ? '✓' : '✗'} 0.4.15 самочувствие инлайн + день/вечер; приветствие из пула фраз`);

  const okFood = html.includes('Быстрые записи')
    && html.includes('id="favorite-meals"');
  if (!okFood) failed++;
  console.log(`${okFood ? '✓' : '✗'} 0.4.15 п.5/п.6: «Быстрые записи» с ясной разницей, «☆ В комбо» у поля`);

  const okCopy = html.includes('>Спросить</button>') && !html.includes('нутрициолог')
    && appR.includes('Встроенный анализ') && !html.includes('За неделю (7 дней)')
    && html.includes('Рассчитать ориентировочные цели') && html.includes('Использовать как цель')
    && (html.match(/Не указан/g) || []).length >= 2
    && html.includes('по умолчанию хранятся только на вашем устройстве')
    && html.includes('↓ К форме') && !html.includes('＋ Запись');
  if (!okCopy) failed++;
  console.log(`${okCopy ? '✓' : '✗'} 0.4.15 копирайтинг: «Помощник FitFlow» единый бренд, «Не указан», privacy-точность, FAB «↓ К форме»`);

  const okTrust = html.includes('id="backup-last-info"') && appR.includes('fitflow:backup:last')
    && html.includes('id="notif-daily-summary"') && appR.includes('computeTodayNotificationBudget')
    && !html.includes('reminder-test-btn') && !appR.includes('sendSpecificReminderTest');
  if (!okTrust) failed++;
  console.log(`${okTrust ? '✓' : '✗'} 0.4.15 доверие: «последняя копия N дн. назад», бюджет уведомлений, тест-кнопки убраны`);

  const okGiga = appR.includes('GIGACHAT_API_PERS') && appR.includes('getGigaChatAccessToken')
    && html.includes('data-cloud-provider="gigachat"') && appR.includes('ngw.devices.sberbank.ru');
  if (!okGiga) failed++;
  console.log(`${okGiga ? '✓' : '✗'} 0.4.15 п.2: GigaChat — провайдер с OAuth-обменом`);

  const okDayPlan = appR.includes('fitflow:dayplan-collapsed') && appR.includes('data-dayplan-toggle')
    && appR.includes('updateActivityKcalHint') && html.includes('id="activity-kcal-hint"')
    && appR.includes('intensityMemorySave') && html.includes('activity-extra-content')
    && appR.includes('stats-bar-value') && cssR.includes('.stats-bar-value');
  if (!okDayPlan) failed++;
  console.log(`${okDayPlan ? '✓' : '✗'} 0.4.15 UX: компактный план дня, ≈ккал и память интенсивности, «Дополнительно», числа на графиках`);
}

{
  // ===================== 0.5.0 =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const cssR = fs.readFileSync('style.css', 'utf8');
  const okSchema = appR.includes('const STATE_SCHEMA_VERSION = 2;') && appR.includes('migrateStateSchema();')
    && appR.includes('stateSchema: STATE_SCHEMA_VERSION') && appR.includes('schemaVersion: STATE_SCHEMA_VERSION');
  if (!okSchema) failed++;
  console.log(`${okSchema ? '✓' : '✗'} 0.5.0 основа: schemaVersion состояния + миграции, номер в резервной копии`);

  // 0.5.1: средние теперь с «≈», день подписан «от сегодняшней цели»
  const okAvg = appR.includes("≈ ${nbNum(fmt(wAvg), 'мл')}") && appR.includes("≈ ${nbNum(fmt(fAvg), 'ккал')}")
    && appR.includes('от сегодняшней цели');
  if (!okAvg) failed++;
  console.log(`${okAvg ? '✓' : '✗'} 0.5.0 статистика: крупное число периода — среднее в день, сумма — подсказкой`);

  const okEdit = html.includes('id="food-edit-dialog"') && html.includes('id="workout-edit-dialog"')
    && appR.includes('data-edit-food=') && appR.includes('function saveFoodEdit')
    && appR.includes('data-edit-workout=') && appR.includes('function saveWorkoutEdit') && appR.includes('workout-edit-type')
    && appR.includes('data-edit-weight=') && appR.includes('openWeightEditForDate');
  if (!okEdit) failed++;
  console.log(`${okEdit ? '✓' : '✗'} 0.5.0 редактирование записей: еда, активность (с датой), вес`);

  const okBackdate = html.includes('id="day-edit-dialog"') && html.includes('id="stats-day-edit-open"')
    && appR.includes('function saveDayEdit') && appR.includes('syncPastDaySummary')
    && html.includes('id="workout-date"') && appR.includes('validPastOrTodayDate');
  if (!okBackdate) failed++;
  console.log(`${okBackdate ? '✓' : '✗'} 0.5.0 задним числом: итог дня (вода/ккал/мин), дата активности`);

  const okUndo = html.includes('id="undo-snackbar"') && appR.includes('function showUndoSnack')
    && (appR.match(/showUndoSnack\(/g) || []).length >= 4 && cssR.includes('#undo-snackbar');
  if (!okUndo) failed++;
  console.log(`${okUndo ? '✓' : '✗'} 0.5.0 системная отмена: еда/активность/вес/итог дня`);

  const okHeader = !html.includes('greeting-profile') && !appR.includes('home-active-profile')
    && appR.includes('greetingName') && html.includes('id="greeting-sub"');
  if (!okHeader) failed++;
  console.log(`${okHeader ? '✓' : '✗'} 0.5.0 шапка: имя в приветствии, строка «Профиль:» убрана`);

  const okVer050 = appR.includes("const FITFLOW_VERSION = '0.6.0'") && html.includes('v0.6.0')
    && appR.includes('Помощник FitFlow и план дня');
  if (!okVer050) failed++;
  console.log(`${okVer050 ? '✓' : '✗'} 0.5.0 версия в коде/«О приложении», онбординг-lite`);
}

{
  // ===================== 0.5.1 (полевой чек-лист владельца) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const cssR = fs.readFileSync('style.css', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');

  const okPills = /flex:\s*1 1 0/.test(cssR) && cssR.includes('контейнер прозрачный')
    && cssR.includes('.home-quicknav .quicknav-chip.active');
  if (!okPills) failed++;
  console.log(`${okPills ? '✓' : '✗'} 0.5.1 п.1: быстрый переход — отдельные пилюли во всю ширину`);

  const brandTextRule = (cssR.match(/\.brand-text p\s*\{[^}]*\}/) || [''])[0];
  const okDateCase = brandTextRule !== '' && !brandTextRule.includes('capitalize')
    && cssR.includes('#date-label::first-letter');
  if (!okDateCase) failed++;
  console.log(`${okDateCase ? '✓' : '✗'} 0.5.1 п.15: дата шапки без «Авг. … Г.» (capitalize убран)`);

  const okSleepMark = appR.includes('SLEEP_MARK_EMOJIS') && appR.includes('mark-good')
    && cssR.includes('.checklist-icon.mark-low');
  if (!okSleepMark) failed++;
  console.log(`${okSleepMark ? '✓' : '✗'} 0.5.1 п.2: сон — эмодзи оценки вместо загадочной серой галочки`);

  const okFoodLayout = html.includes('class="food-form-actions"') && cssR.includes('.food-form-actions')
    && html.includes('data-help="quick-records"') && appR.includes("'quick-records'");
  if (!okFoodLayout) failed++;
  console.log(`${okFoodLayout ? '✓' : '✗'} 0.5.1 п.3: поле питания во всю строку, описания — в «?»`);

  const okDayEdit051 = html.includes('class="btn btn-secondary stats-day-edit-btn"')
    && html.includes('class="day-edit-fields"') && cssR.includes('.day-edit-fields')
    && html.includes('сумма минут, без вида');
  if (!okDayEdit051) failed++;
  console.log(`${okDayEdit051 ? '✓' : '✗'} 0.5.1 п.4/7: «Поправить день» напротив заголовка, поля стопкой, честная подпись` );

  const okStatsNew = appR.includes('daysChunk') && appR.includes('stats-bar-col')
    && cssR.includes('.stats-bar-col') && appR.includes("≈ ${nbNum(fmt(fAvg),");
  if (!okStatsNew) failed++;
  console.log(`${okStatsNew ? '✓' : '✗'} 0.5.1 п.5/6/8: ≈-средние, склейка цифра+единица, даты графиков не уплывают`);

  const okFontFull = cssR.includes('html[data-font="serif"] .settings-label')
    && cssR.includes('html[data-font="condensed"] .greeting-title');
  if (!okFontFull) failed++;
  console.log(`${okFontFull ? '✓' : '✗'} 0.5.1 п.9: выбранный шрифт действует на все темы полностью (включая Спорт)`);

  const headerPart = html.slice(0, html.indexOf('</header>'));
  const okPro = html.includes('id="pro-dialog"') && appR.includes('function activateProFromDialog')
    && appR.includes('pro: readProState()') && fs.existsSync('tools/make-pro-code.js')
    && !headerPart.includes('privacy-help') && html.includes('id="privacy-help"');
  if (!okPro) failed++;
  console.log(`${okPro ? '✓' : '✗'} 0.5.1 п.13/16: PRO-каркас (экран/код/бэкап/генератор), шапка — 3 значка`);

  const okVer051 = appR.includes("const FITFLOW_VERSION = '0.6.0'") && html.includes('v0.6.0') && fs.existsSync('tools/make-pro-code.js');
  if (!okVer051) failed++;
  console.log(`${okVer051 ? '✓' : '✗'} 0.5.1 версия в коде и «О приложении»`);
}

{
  // ===================== 0.5.2 (полевой чек-лист владельца №2) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const cssR = fs.readFileSync('style.css', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');

  // Самочувствие — всегда компактная строка (развёрнутый вечерний вариант убран)
  const okMood052 = appR.includes('как прошёл день?') && !appR.includes('mood-card-value')
    && !cssR.includes('.mood-card-value') && cssR.includes('.mood-card {');
  if (!okMood052) failed++;
  console.log(`${okMood052 ? '✓' : '✗'} 0.5.2 самочувствие: одна строка всегда, большой блок убран`);

  // Быстрые записи — один диалог с вкладками Комбо и Мои блюда (0.5.8)
  const okQuick052 = html.includes('id="quick-records-dialog"')
    && (html.match(/data-quick-tab=/g) || []).length >= 2
    && html.includes('id="combo-chips"') && html.includes('id="favorite-meals"')
    && appR.includes('function switchQuickTab') && appR.includes('function openQuickRecordsDialog')
    && cssR.includes('.quick-entry-row')
    && html.includes('id="quick-open-meals"');
  if (!okQuick052) failed++;
  console.log(`${okQuick052 ? '✓' : '✗'} 0.5.2 быстрые записи: один диалог, вкладки комбо/блюда/своё`);

  // Шапка статистики: без наслоений и двухстрочной подписи
  const okStatsHead052 = cssR.includes('.stats-card .card-header { align-items: center; flex-wrap: nowrap;')
    && cssR.includes('.stats-card .card-title-wrap p { overflow: hidden;');
  if (!okStatsHead052) failed++;
  console.log(`${okStatsHead052 ? '✓' : '✗'} 0.5.2 статистика: «Итоги за…» в одну строку, кнопка справа без наслоений`);

  // Недельная активность: «выполнено ИЗ цели» (0.5.2); 0.5.5 — короткая строка + чип-статус
  const okWeekly052 = appR.includes('${formatActivityDuration(weeklyMinutes)} из ${formatActivityDuration(weeklyGoal)}')
    && html.includes('id="weekly-status-chip"') && appR.includes('weekly-status-chip good')
    && appR.includes('осталось ${formatActivityDuration(weeklyGoal - weeklyMinutes)}')
    && html.includes('data-help="weekly-goal"') && cssR.includes('.weekly-status-chip');
  if (!okWeekly052) failed++;
  console.log(`${okWeekly052 ? '✓' : '✗'} 0.5.2/0.5.5 активность: «выполнено ИЗ цели», чип-статус, «?» с объяснением`);

  const okVer052 = appR.includes("const FITFLOW_VERSION = '0.6.0'") && html.includes('v0.6.0');
  if (!okVer052) failed++;
  console.log(`${okVer052 ? '✓' : '✗'} 0.5.2 версия в коде и «О приложении»`);
}

{
  // ===================== 0.5.3 (идеи владельца: второй уровень первого запуска) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const cssR = fs.readFileSync('style.css', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');

  // Мастер «Быстрая настройка»: диалог, 5 вопросов → штатные сеттеры, повтор из Настроек
  const okWizard = html.includes('id="setup-wizard-dialog"') && html.includes('id="setup-wizard-open"')
    && appR.includes('SETUP_WIZARD_STEPS') && appR.includes('function maybeShowSetupWizard')
    && appR.includes('updateWaterRemindersEnabled(yes)') && appR.includes('updateGameModeEnabled(yes)')
    && appR.includes('#setup-wizard-yes')
    && cssR.includes('#setup-wizard-progress');
  if (!okWizard) failed++;
  console.log(`${okWizard ? '✓' : '✗'} 0.5.3 мастер: диалог, 5 вопросов → штатные сеттеры, повтор из Настройки → Общее`);

  // Разовая плашка поддержки: один раз после ~10 запуска + «как поддержать» в PRO
  const okSupport = html.includes('id="support-dialog"') && html.includes('id="pro-howto"')
    && appR.includes('function maybeShowSupportDialog') && appR.includes('fitflow:launch-count')
    && appR.includes('getLaunchCount() < 10')
    && appR.includes('#support-open-pro');
  if (!okSupport) failed++;
  console.log(`${okSupport ? '✓' : '✗'} 0.5.3 поддержка: плашка поддержки и инструкция в PRO`);

  // Благотворительные отчёты: честный пустой раздел + каркас записей
  const okCharity = html.includes('id="charity-block"') && html.includes('id="charity-list"')
    && appR.includes('CHARITY_REPORTS') && appR.includes('function renderCharityReports')
    && appR.includes('Перечислений пока не было') && cssR.includes('.charity-block');
  if (!okCharity) failed++;
  console.log(`${okCharity ? '✓' : '✗'} 0.5.3 добрые дела: открытые отчёты в «О приложении», пусто — честно`);

  const okVer053 = appR.includes("const FITFLOW_VERSION = '0.6.0'") && html.includes('v0.6.0');
  if (!okVer053) failed++;
  console.log(`${okVer053 ? '✓' : '✗'} 0.5.3 версия в коде и «О приложении»`);
}

{
  // ===================== 0.5.4 (уточнения владельца перед полевым тестом) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const cssR = fs.readFileSync('style.css', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');

  // «⚙️ Настроить» в уведомлениях: действие зарегистрировано, раздел во всех типах, ветка — первой
  const okNotifActions = appR.includes("const NOTIF_SETTINGS_ACTION_TYPE = 'fitflow-notif-settings'")
    && appR.includes('registerActionTypes')
    && appR.includes('function openNotificationSettings')
    && appR.includes("notifSettings: 'water'") && appR.includes("notifSettings: 'meals'")
    && appR.includes("notifSettings: 'morning'") && appR.includes("notifSettings: 'evening'")
    && appR.includes("notifSettings: 'course'")
    && appR.includes('event.actionId === NOTIF_SETTINGS_ACTION_ID')
    && cssR.includes('.settings-flash');
  if (!okNotifActions) failed++;
  console.log(`${okNotifActions ? '✓' : '✗'} 0.5.4 уведомления: «⚙️ Настроить» ведёт в свой раздел с подсветкой`);

  // Кольцо воды: «Цель достигнута!» внутри безопасной зоны
  const okRing054 = cssR.includes('.water-ring-center {\n  padding-left: 26px;')
    && cssR.includes('.water-ring-center .water-sub {');
  if (!okRing054) failed++;
  console.log(`${okRing054 ? '✓' : '✗'} 0.5.4 кольцо воды: подпись не залезает на дугу`);

  // Плашка поддержки: редкий повтор, PRO — стоп, постоянный блок в «О приложении»
  const okSupport054 = appR.includes('fitflow:support-next')
    && appR.includes('SUPPORT_SNOOZE_MS') && appR.includes('SUPPORT_AFTER_PRO_MS')
    && appR.includes('readProState().unlocked')
    && !appR.includes('fitflow:support-shown')
    && html.includes('В другой раз') && html.includes('id="about-support-block"')
    && html.includes('id="about-support-open"');
  if (!okSupport054) failed++;
  console.log(`${okSupport054 ? '✓' : '✗'} 0.5.4 поддержка: повтор не чаще 14 дней, PRO не тревожим, блок в «О приложении»`);

  const okVer054 = appR.includes("const FITFLOW_VERSION = '0.6.0'") && html.includes('v0.6.0');
  if (!okVer054) failed++;
  console.log(`${okVer054 ? '✓' : '✗'} 0.5.4 версия в коде и «О приложении»`);
}

{
  // ===================== 0.5.5 (пакет владельца: еда, бэкап, вода, виджет, лицензия) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const cssR = fs.readFileSync('style.css', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');

  // База еды: рыба по сортам/приготовлению, виды икры, бутерброды и тарталетки с икрой
  const okFood055 = appR.includes("'икра сельди'") && appR.includes("'икра щуки'")
    && appR.includes("'скумбрия копченая'") && appR.includes("'семга слабосоленая'")
    && appR.includes("'бутерброд с красной икрой и маслом'")
    && appR.includes("'тарталетка с красной икрой и творожным сыром'");
  if (!okFood055) failed++;
  console.log(`${okFood055 ? '✓' : '✗'} 0.5.5 еда: рыба по сортам/приготовлению, виды икры, бутерброды/тарталетки`);

  // Бэкап: PRO-код едет в копии и восстанавливается
  const okBackup055 = appR.includes('code: typeof parsed.code')
    && appR.includes('code: typeof pro.code') && appR.includes('code: typeof proBackup.code')
    && appR.includes("code: `FF-${code.match");
  if (!okBackup055) failed++;
  console.log(`${okBackup055 ? '✓' : '✗'} 0.5.5 бэкап: PRO-код в копии (read/write/activate/restore)`);

  // Мост виджета: готовность, маршрут настроек (настройка «пауза» отменена в 0.5.6 —
  // правило стало автоматическим, её проверка перенесена в блок 0.5.6)
  const okWater055 = appR.includes('lastWaterAt: state.water.lastAddedAt')
    && appR.includes('window.__fitflowReady = true')
    && appR.includes("action === 'notif_settings_water'");
  if (!okWater055) failed++;
  console.log(`${okWater055 ? '✓' : '✗'} 0.5.5 вода: надёжная доставка с виджета (JS-сторона)`);

  // Нативный пакет в зеркале: полночь виджета, skip после записи, «⚙️» у воды
  const mirror = fs.readFileSync('tools/github-workflows/build.yml', 'utf8');
  const okMirror055 = mirror.includes('WIDGET_MIDNIGHT_REFRESH')
    && mirror.includes('notif_settings_water')
    && mirror.includes('__fitflowReady === true');
  if (!okMirror055) failed++;
  console.log(`${okMirror055 ? '✓' : '✗'} 0.5.5 зеркало: виджет-полночь, пауза напоминания, «⚙️» у воды (ждёт замены workflow)`);

  // Лицензия: файл в репозитории (окно с полным текстом появилось в 0.5.6)
  const okLicense055 = fs.existsSync('LICENSE') && html.includes('Лицензия FitFlow');
  if (!okLicense055) failed++;
  console.log(`${okLicense055 ? '✓' : '✗'} 0.5.5 лицензия: LICENSE в репозитории`);

  const okVer055 = appR.includes("const FITFLOW_VERSION = '0.6.0'") && html.includes('v0.6.0');
  if (!okVer055) failed++;
  console.log(`${okVer055 ? '✓' : '✗'} 0.5.5 версия в коде и «О приложении»`);
}

{
  // ===================== 0.5.6 (решения владельца: авто-пропуск воды, тихая вода
  // извне, лицензия окном и в условиях, самочувствие в 2 строки, живые 🍽/✍️) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const cssR = fs.readFileSync('style.css', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');

  // Авто-пропуск ближайшего напоминания воды: переключатель убран, правило фиксированное
  const okWater065 = !html.includes('water-skip-choices') && !appR.includes('updateWaterSkipGap')
    && !appR.includes('skipRecentGapMin') && appR.includes('function isWaterReminderSlotSkipped')
    && html.includes('ближайшее напоминание пропустится само');
  if (!okWater065) failed++;
  console.log(`${okWater065 ? '✓' : '✗'} 0.5.6 вода: автопропуск ближайшего напоминания без лишнего переключателя`);

  // Вода с виджета/из уведомления — молча, без отложенных окон при входе
  const okSilent065 = !appR.includes('воды с виджета') && !appR.includes('воды по напоминанию');
  if (!okSilent065) failed++;
  console.log(`${okSilent065 ? '✓' : '✗'} 0.5.6 вода извне: без отложенных окон («я же ничего не добавлял»)`);

  // Быстрые записи: все три значка привязаны к своим вкладкам (🍽 и ✍️ были мёртвыми)
  const okQuick065 = appR.includes("openQuickRecordsDialog('combo')")
    && appR.includes("openQuickRecordsDialog('meals')")
    && appR.includes("openQuickRecordsDialog('manual')");
  if (!okQuick065) failed++;
  console.log(`${okQuick065 ? '✓' : '✗'} 0.5.6 быстрые записи: ⭐/🍽/✍️ открывают свои вкладки`);

  // Лицензия: полное окно, кнопки из «О приложении» и из условий первого входа
  const okLicense065 = html.includes('id="license-dialog"') && html.includes('id="license-open"')
    && html.includes('id="terms-license-open"') && html.includes('Запрещается без предварительного письменного согласия автора')
    && !html.includes('about-license-block')
    && appR.includes('function openLicenseDialog')
    && appR.includes('ознакомление с условиями использования и лицензией FitFlow');
  if (!okLicense065) failed++;
  console.log(`${okLicense065 ? '✓' : '✗'} 0.5.6 лицензия: полное окно + упоминание при первом входе`);

  // Самочувствие: компактные две строки (заголовок+смайлы / примечание)
  const okMood065 = appR.includes('mood-compact-top') && cssR.includes('.mood-compact-top');
  if (!okMood065) failed++;
  console.log(`${okMood065 ? '✓' : '✗'} 0.5.6 самочувствие: компактные две строки`);

  // Зеркало: автопропуск по интервалу сетки (ждёт замены workflow владельцем)
  const mirror065 = fs.readFileSync('tools/github-workflows/build.yml', 'utf8');
  const okMirror065 = mirror065.includes('scheduleIntervalMs') && !mirror065.includes('waterSkipGapMin');
  if (!okMirror065) failed++;
  console.log(`${okMirror065 ? '✓' : '✗'} 0.5.6 зеркало: пропуск по интервалу сетки (ждёт замены workflow)`);

  // Единое описание приложения (п.1 владельца): файл есть и актуален версии
  const descR = fs.existsSync('APP_DESCRIPTION.md') ? fs.readFileSync('APP_DESCRIPTION.md', 'utf8') : '';
  const okDesc065 = descR.includes('Актуально для версии:') && descR.includes('0.6.0');
  if (!okDesc065) failed++;
  console.log(`${okDesc065 ? '✓' : '✗'} 0.5.6 APP_DESCRIPTION.md: единое описание приложения на месте и актуально`);

  const okVer065 = appR.includes("const FITFLOW_VERSION = '0.6.0'") && html.includes('v0.6.0');
  if (!okVer065) failed++;
  console.log(`${okVer065 ? '✓' : '✗'} 0.5.6 версия в коде и «О приложении»`);
}

{
  // ===================== 0.5.7 (полевой баг «Быстрого ввода» + короткий текст воды) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const cssR = fs.readFileSync('style.css', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');

  // «Быстрый ввод»: «Разобрать» на виду — иконки-источники + primary в одном ряду,
  // «Отмена» отдельной строкой (раньше 5 широких кнопок сжимались и обрезались)
  const okSmart057 = html.includes('smart-entry-actions') && html.includes('id="smart-entry-parse"')
    && html.includes('id="smart-entry-cancel"')
    && cssR.includes('.smart-entry-actions') && cssR.includes('.smart-entry-cancel-btn');
  if (!okSmart057) failed++;
  console.log(`${okSmart057 ? '✓' : '✗'} 0.5.7 быстрый ввод: «Разобрать» всегда на виду`);

  // Уведомление воды: короткий текст целиком виден в свёрнутом виде (нативно + JS-фолбэк)
  const mirror057 = fs.readFileSync('tools/github-workflows/build.yml', 'utf8');
  const okWaterText057 = !mirror057.includes('записывать можно прямо здесь')
    && mirror057.includes('"Сегодня: " + total + " из " + goal + " мл."')
    && !appR.includes('Не забудьте добавить воду в FitFlow');
  if (!okWaterText057) failed++;
  console.log(`${okWaterText057 ? '✓' : '✗'} 0.5.7 уведомление воды: короткий текст (натив + JS)`);

  const okVer057 = appR.includes("const FITFLOW_VERSION = '0.6.0'") && html.includes('v0.6.0');
  if (!okVer057) failed++;
  console.log(`${okVer057 ? '✓' : '✗'} 0.5.7 версия в коде и «О приложении»`);
}


{
  // ===================== 0.5.8 (лицензия RU/EN/3rd-party, лаконичное «О приложении»,
  // окно воды, комбо-добавление прямо в табах, самочувствие 2 строки с «?») =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const cssR = fs.readFileSync('style.css', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');

  // Лицензия с тремя вкладками (RU, EN, Third-Party) без внешних ссылок
  const okLicense058 = html.includes('id="license-lang-tabs"')
    && html.includes('id="license-panel-ru"') && html.includes('id="license-panel-en"')
    && html.includes('id="license-panel-third-party"')
    && appR.includes('function switchLicenseTab')
    && !html.includes('см. файл THIRD_PARTY.md в репозитории')
    && !html.includes('в файле LICENSE репозитория');
  if (!okLicense058) failed++;
  console.log(`${okLicense058 ? '✓' : '✗'} 0.5.8 лицензия: вкладки RU/EN/Third-Party прямо в окне (без внешних ссылок)`);

  // Окно времени воды: настраивается в Настройках
  const okWaterWindow058 = html.includes('id="water-reminder-window-start"')
    && html.includes('id="water-reminder-window-end"')
    && appR.includes('updateWaterReminderWindow')
    && cssR.includes('.water-time-window-row');
  if (!okWaterWindow058) failed++;
  console.log(`${okWaterWindow058 ? '✓' : '✗'} 0.5.8 напоминания воды: выбор периода «с... до...» в интерфейсе`);

  // Быстрые записи: создание комбо и добавление блюд прямо из диалога со сворачиванием
  const okQuick058 = html.includes('id="quick-combo-save-btn"')
    && html.includes('id="quick-meal-save-btn"')
    && html.includes('id="quick-combo-toggle"')
    && html.includes('id="quick-meal-toggle"')
    && appR.includes('#quick-combo-save-btn')
    && appR.includes('#quick-meal-save-btn');
  if (!okQuick058) failed++;
  console.log(`${okQuick058 ? '✓' : '✗'} 0.5.8 быстрые записи: создание комбо и блюд прямо из вкладок диалога`);

  // Самочувствие: две аккуратные строки со справкой «?»
  const okMood058 = appR.includes('data-help="day-mood"')
    && appR.includes("'day-mood': {")
    && cssR.includes('.mood-compact-top') && cssR.includes('.mood-compact-bottom');
  if (!okMood058) failed++;
  console.log(`${okMood058 ? '✓' : '✗'} 0.5.8 самочувствие: 2 аккуратные строки + справка «?»`);

  // О приложении: лаконичный вид + модальное окно добрых дел
  const okAbout058 = html.includes('id="about-charity-open"')
    && html.includes('id="charity-dialog"')
    && appR.includes('function openCharityDialog');
  if (!okAbout058) failed++;
  console.log(`${okAbout058 ? '✓' : '✗'} 0.5.8 о приложении: лаконичный вид с кнопками + диалог добрых дел`);

  const okVer058 = appR.includes("const FITFLOW_VERSION = '0.6.0'") && html.includes('v0.6.0');
  if (!okVer058) failed++;
  console.log(`${okVer058 ? '✓' : '✗'} 0.5.8 версия в коде и «О приложении»`);
}


{
  // ===================== 0.6.0 (SQLite Storage Engine: sql.js WASM + IndexedDB) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const cssR = fs.readFileSync('style.css', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');

  // SQLite бандл и скрипты
  const okSqlBundle = fs.existsSync('sqlite-bundle.js')
    && html.includes('<script src="sqlite-bundle.js"></script>')
    && html.includes('id="storage-engine-status"');
  if (!okSqlBundle) failed++;
  console.log(`${okSqlBundle ? '✓' : '✗'} 0.6.0 SQLite бандл: sqlite-bundle.js подключён в index.html и статус в настройках`);

  // Модуль SQLite в app.js: инициализация, dual-write, схема таблиц, авто-бэкап
  const okSqlModule = appR.includes('function initSqliteStorage')
    && appR.includes('function createSqliteSchema')
    && appR.includes('function syncStateToSqliteNow')
    && appR.includes('function getSqliteStats')
    && appR.includes('fitflow:pre-sqlite-backup')
    && appR.includes('scheduleSqliteSync();');
  if (!okSqlModule) failed++;
  console.log(`${okSqlModule ? '✓' : '✗'} 0.6.0 SQLite движок: схема таблиц, Dual-Write синхронизация, авто-бэкап`);

  const okVer060 = appR.includes("const FITFLOW_VERSION = '0.6.0'") && html.includes('v0.6.0');
  if (!okVer060) failed++;
  console.log(`${okVer060 ? '✓' : '✗'} 0.6.0 версия в коде и «О приложении»`);
}

console.log(failed === 0 ? '\nUI INIT CHECK PASSED' : `\n${failed} UI INIT FAILURES`);
process.exit(failed === 0 ? 0 : 1);
