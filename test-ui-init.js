'use strict';
/* Быстрая защита от регресса: HTML-кнопки не должны ссылаться на исчезнувшие функции. */
const fs = require('fs');
const app = fs.readFileSync('app.js', 'utf8');
const VERSION = fs.readFileSync('version.txt', 'utf8').trim(); // единый источник версии (0.7.10)
const html = fs.readFileSync('index.html', 'utf8');
// 0.8.27: нативные исходники вынесены из build.yml в android-native/*.
// Проверки «зеркала» читают workflow ВМЕСТЕ с нативными файлами — так они
// продолжают ловить регресс независимо от того, где физически лежит код.
function readBuildBundle() {
  let out = fs.readFileSync('tools/github-workflows/build.yml', 'utf8');
  for (const f of fs.readdirSync('android-native').sort()) {
    out += '\n' + fs.readFileSync('android-native/' + f, 'utf8');
  }
  return out;
}

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
  'stats-sleep-section', 'stats-sleep-title', 'stats-sleep-total', 'stats-sleep-hint', 'stats-sleep-bars',
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
  'quick-combo-name', 'quick-combo-text', 'quick-combo-save-btn', 'quick-combo-toggle', 'quick-meal-toggle', 'quick-meal-save-btn', 'health-sync-toggle', 'health-sync-options', 'health-priority-choices', 'health-budget-toggle', 'health-connect-open-btn', 'health-phone-perm-btn', 'health-sync-now-btn', 'health-sync-status', 'health-diag-btn', 'health-diag-dialog', 'health-diag-sync-btn', 'health-diag-copy-btn', 'health-diag-close-btn',
  'steps-card', 'steps-card-title', 'steps-card-source', 'steps-goal-stepper', 'steps-goal-minus', 'steps-goal-plus', 'steps-card-count', 'steps-card-goal', 'steps-card-progress', 'steps-card-kcal', 'steps-card-sync-btn',
  'home-density-segmented', 'home-density-hint', 'explain-dialog', 'explain-dialog-title', 'explain-dialog-content', 'explain-dialog-ok'
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
    && app4.includes('master: false, cloudAi: false, barcodeLookup: false, modelDownload: false }')
    // 0.8.28: флаг мало объявить — он обязан проверяться перед сетевым вызовом.
    && app4.includes("if (!isOnlineAllowed('barcodeLookup')) return { ok: false, error: 'offline' };");
  if (!okOff) failed++;
  console.log(`${okOff ? '✓' : '✗'} карта контуров: OFF-строка скрыта, код-основа и выключенный флаг на месте`);

  // 0.8.28 «Онлайн-функции»: рубильник обязан перекрывать ВСЕ выходы в сеть.
  // Проверяем не наличие переключателя в UI, а то, что каждый сетевой путь
  // спрашивает разрешение — иначе рубильник был бы декорацией.
  const okGateFn = app4.includes('function isOnlineAllowed(feature)')
    && app4.includes('if (!o.master) return false;');
  if (!okGateFn) failed++;
  console.log(`${okGateFn ? '✓' : '✗'} онлайн: единый шлюз isOnlineAllowed с приоритетом главного рубильника`);

  // Все три сетевых выхода: облачный ИИ, штрих-код, скачивание модели.
  // Плюс checkCloudConnection — он ходит в сеть мимо isCloudAiReady().
  const okGuards = app4.includes("if (!isOnlineAllowed('cloudAi')) return false;")
    && app4.includes("if (!isOnlineAllowed('barcodeLookup'))")
    && app4.includes("if (!isOnlineAllowed('modelDownload'))")
    && app4.includes("if (!isOnlineAllowed('cloudAi')) {");
  if (!okGuards) failed++;
  console.log(`${okGuards ? '✓' : '✗'} онлайн: закрыты все 4 пути в сеть (облако, штрих-код, модель, проверка связи)`);

  // Офлайн по умолчанию: миграция старых сохранений не должна молча включать сеть.
  const okDefaultOff = app4.includes('master: src.master === true')
    && app4.includes('cloudAi: src.cloudAi === true')
    && app4.includes('normalizeOnlineFeatures();');
  if (!okDefaultOff) failed++;
  console.log(`${okDefaultOff ? '✓' : '✗'} онлайн: офлайн по умолчанию, старые сохранения не включают сеть`);

  // Раздел настроек подключён как подэкран и не «висит» без навигации.
  const okOnlineView = html.includes('id="settings-online-view"')
    && html.includes('data-settings-view="settings-online"')
    && html.includes('id="online-master-toggle"')
    && app4.includes("'settings-online'")
    && app4.includes("if (view === 'settings-online') renderOnlineFeatures();");
  if (!okOnlineView) failed++;
  console.log(`${okOnlineView ? '✓' : '✗'} онлайн: раздел настроек подключён (меню, подэкран, кнопка «назад»)`);
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
  const mirror = readBuildBundle();
  const okMirror = mirror.includes('npm install ./plugins/fitflow-local-ai')
    && /minSdkVersion = (24|26)/.test(mirror)
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
  const mirrorB = readBuildBundle();
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
  const wfH = readBuildBundle();
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
  const wfN = readBuildBundle();
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
  const wfP = readBuildBundle();
  const appP = fs.readFileSync('app.js', 'utf8');
  const dateGuardCount = (wfP.match(/savedDate\.equals\(today\)|!savedDate\.equals\(today\)/g) || []).length;
  const okDate = dateGuardCount >= 3 && wfP.includes('0.4.12') && wfP.includes('new java.text.SimpleDateFormat("yyyy-MM-dd")');
  if (!okDate) failed++;
  console.log(`${okDate ? '✓' : '✗'} виджет/уведомление 0.4.12: дата-стражи в трёх точках (экран, +250-приёмник, текст уведомления)`);

  const okWings = appP.includes("'жареные куриные крылья': { kcal: 254") && appP.includes("'куриные крылья': { kcal: 203");
  const okSand = appP.includes("fillingParts[0].trim().split(/\\s+/).length === 1")
    && appP.includes("fillingParts.length === 1 ? fillingParts[0].trim() : fillingParts.join(' и ')");
  const okAll = okWings && okSand;
  if (!okAll) failed++;
  console.log(`${okAll ? '✓' : '✗'} база крыльев + кураторский ключ только для голой начинки (условие одного слова), имя одной начинки — ключ базы`);
}

// 0.4.13: уведомления — обновление без повторного звука, смахивание = 45 мин
// тишины; журнал распознаваний (полевой контур честности: ввод→разбор→записано).
{
  const wfQ = readBuildBundle();
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
  const okVer = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
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
  const okSchema = appR.includes('const STATE_SCHEMA_VERSION = ') && appR.includes('migrateStateSchema();')
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

  const okVer050 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION)
    && appR.includes('Помощник FitFlow и план дня');
  if (!okVer050) failed++;
  console.log(`${okVer050 ? '✓' : '✗'} 0.5.0 версия в коде/«О приложении», онбординг-lite`);
}

{
  // ===================== 0.5.1 (полевой чек-лист владельца) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const cssR = fs.readFileSync('style.css', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');

  /* 0.5.1 п.1 — отдельные пилюли, прозрачный контейнер (общая рамка-пилюля убрана).
     0.8.26 уточнение: «во всю ширину» (flex:1 1 0) отменено — при 6 включённых
     разделах ширина делилась поровну и длинные названия обрезались. Теперь пилюля
     по ширине текста, а панель прокручивается вбок. Проверяем правило именно чипа,
     а не любое «flex: 1 1 0» в файле (раньше условие проходило случайно). */
  const chipRule = cssR
    .slice(cssR.indexOf('.home-quicknav .quicknav-chip {'), cssR.indexOf('.home-quicknav .quicknav-chip.active'))
    .replace(/\/\*[\s\S]*?\*\//g, ''); // комментарии не считаем кодом: в них упоминается старое flex:1 1 0
  const okPills = /flex:\s*0 0 auto/.test(chipRule) && !/flex:\s*1 1 0/.test(chipRule)
    && cssR.includes('контейнер прозрачный')
    && cssR.includes('.home-quicknav .quicknav-chip.active');
  if (!okPills) failed++;
  console.log(`${okPills ? '✓' : '✗'} 0.5.1 п.1 (уточнено 0.8.26): быстрый переход — отдельные пилюли по ширине текста`);

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

  const okVer051 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION) && fs.existsSync('tools/make-pro-code.js');
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

  // Шапка статистики: без наслоений и двухстрочной подписи (0.5.2/0.7.0)
  const okStatsHead052 = cssR.includes('.stats-card .card-header { align-items: center; flex-wrap: nowrap;')
    && cssR.includes('.stats-day-edit-btn');
  if (!okStatsHead052) failed++;
  console.log(`${okStatsHead052 ? '✓' : '✗'} 0.5.2/0.7.0 статистика: «Итоги за…» в одну строку, кнопка справа без наслоений`);

  // Недельная активность: «выполнено ИЗ цели» (0.5.2); 0.5.5 — короткая строка + чип-статус
  const okWeekly052 = appR.includes('${formatActivityDuration(weeklyMinutes)} из ${formatActivityDuration(weeklyGoal)}')
    && html.includes('id="weekly-status-chip"') && appR.includes('weekly-status-chip good')
    && appR.includes('осталось ${formatActivityDuration(weeklyGoal - weeklyMinutes)}')
    && html.includes('data-help="weekly-goal"') && cssR.includes('.weekly-status-chip');
  if (!okWeekly052) failed++;
  console.log(`${okWeekly052 ? '✓' : '✗'} 0.5.2/0.5.5 активность: «выполнено ИЗ цели», чип-статус, «?» с объяснением`);

  const okVer052 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
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

  const okVer053 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
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

  const okVer054 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
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
  const mirror = readBuildBundle();
  const okMirror055 = mirror.includes('WIDGET_MIDNIGHT_REFRESH')
    && mirror.includes('notif_settings_water')
    && mirror.includes('__fitflowReady === true');
  if (!okMirror055) failed++;
  console.log(`${okMirror055 ? '✓' : '✗'} 0.5.5 зеркало: виджет-полночь, пауза напоминания, «⚙️» у воды (ждёт замены workflow)`);

  // Лицензия: файл в репозитории (окно с полным текстом появилось в 0.5.6)
  const okLicense055 = fs.existsSync('LICENSE') && html.includes('Лицензия FitFlow');
  if (!okLicense055) failed++;
  console.log(`${okLicense055 ? '✓' : '✗'} 0.5.5 лицензия: LICENSE в репозитории`);

  const okVer055 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
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
  const mirror065 = readBuildBundle();
  const okMirror065 = mirror065.includes('scheduleIntervalMs') && !mirror065.includes('waterSkipGapMin');
  if (!okMirror065) failed++;
  console.log(`${okMirror065 ? '✓' : '✗'} 0.5.6 зеркало: пропуск по интервалу сетки (ждёт замены workflow)`);

  // Единое описание приложения (п.1 владельца): файл есть и актуален версии
  const descR = fs.existsSync('APP_DESCRIPTION.md') ? fs.readFileSync('APP_DESCRIPTION.md', 'utf8') : '';
  const okDesc065 = descR.includes('Актуально для версии:') && descR.includes(VERSION);
  if (!okDesc065) failed++;
  console.log(`${okDesc065 ? '✓' : '✗'} 0.5.6 APP_DESCRIPTION.md: единое описание приложения на месте и актуально`);

  const okVer065 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
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
  const mirror057 = readBuildBundle();
  const okWaterText057 = !mirror057.includes('записывать можно прямо здесь')
    && mirror057.includes('"Сегодня: " + total + " из " + goal + " мл."')
    && !appR.includes('Не забудьте добавить воду в FitFlow');
  if (!okWaterText057) failed++;
  console.log(`${okWaterText057 ? '✓' : '✗'} 0.5.7 уведомление воды: короткий текст (натив + JS)`);

  const okVer057 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
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

  const okVer058 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
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
    && html.includes('<script src="sqlite-bundle.js"></script>');
  if (!okSqlBundle) failed++;
  console.log(`${okSqlBundle ? '✓' : '✗'} 0.6.0 SQLite бандл: sqlite-bundle.js подключён в index.html (фоновый движок без визуального загромождения)`);

  // Модуль SQLite в app.js: инициализация, dual-write, схема таблиц, авто-бэкап
  const okSqlModule = appR.includes('function initSqliteStorage')
    && appR.includes('function createSqliteSchema')
    && appR.includes('function syncStateToSqliteNow')
    && appR.includes('function getSqliteStats')
    && appR.includes('fitflow:pre-sqlite-backup')
    && appR.includes('scheduleSqliteSync();');
  if (!okSqlModule) failed++;
  console.log(`${okSqlModule ? '✓' : '✗'} 0.6.0 SQLite движок: схема таблиц, Dual-Write синхронизация, авто-бэкап`);

  const okVer060 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer060) failed++;
  console.log(`${okVer060 ? '✓' : '✗'} 0.6.0 версия в коде и «О приложении»`);
}


{
  // Статический регресс-аудит: 100% прямых вызовов $('#...').addEventListener обязаны существовать в index.html
  const appR = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  const directMatches = (appR.match(/\$\('([^']+)'\)\.addEventListener/g) || []);
  let missingSelectors = 0;
  directMatches.forEach(m => {
    const id = m.match(/\$\('([^']+)'\)/)[1].replace('#', '');
    if (!html.includes(`id="${id}"`) && !html.includes(`id='${id}'`)) {
      missingSelectors++;
      console.error(`MISSING ELEMENT IN HTML: #${id}`);
    }
  });
  const okAudit = missingSelectors === 0;
  if (!okAudit) failed++;
  console.log(`${okAudit ? '✓' : '✗'} статический аудит: 100% прямых селекторов addEventListener присутствуют в index.html`);
}


{
  // ===================== 0.7.0 (Health Connect, телефонный шагомер и тематические значки) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const cssR = fs.readFileSync('style.css', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');

  // Health Connect & Step sensor UI
  const okHealthUI = html.includes('id="health-sync-toggle"')
    && html.includes('id="health-priority-choices"')
    && html.includes('id="health-budget-toggle"')
    && html.includes('id="health-connect-open-btn"')
    && html.includes('id="health-phone-perm-btn"')
    && html.includes('id="health-sync-now-btn"')
    && html.includes('id="health-sync-status"');
  if (!okHealthUI) failed++;
  console.log(`${okHealthUI ? '✓' : '✗'} 0.7.0 Health Connect UI: переключатели синхронизации, приоритетов и системных разрешений`);

  // Health Connect module in JS
  const okHealthJS = appR.includes('function normalizeHealthSync')
    && appR.includes('function getPhoneSteps')
    && appR.includes('function openHealthConnectSettings')
    && appR.includes('function requestActivityRecognition')
    && appR.includes('function syncHealthDataNow')
    && appR.includes('function activityThemeEmoji');
  if (!okHealthJS) failed++;
  console.log(`${okHealthJS ? '✓' : '✗'} 0.7.0 Health Connect JS: трёхуровневая система приоритетов без задвоения`);

  // Mirror build.yml Health Connect permissions
  const mirror070 = readBuildBundle();
  const okMirrorHealth = mirror070.includes('android.permission.ACTIVITY_RECOGNITION')
    && mirror070.includes('android.permission.health.READ_STEPS')
    && mirror070.includes('openHealthConnectSettings')
    && mirror070.includes('getPhoneStepsToday');
  if (!okMirrorHealth) failed++;
  console.log(`${okMirrorHealth ? '✓' : '✗'} 0.7.0 зеркало build.yml: Health Connect permissions + нативный шагомер`);

  const okVer070 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer070) failed++;
  console.log(`${okVer070 ? '✓' : '✗'} 0.7.0 версия в коде и «О приложении»`);
}

{
  // ===================== 0.7.10 (шаги: часы ≠ сумма телефона и часов; сон через полночь) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  const mirror = readBuildBundle();

  // JS: единый распознаватель источника + честная диагностика (отдельно часы и всё HC)
  const okJs = appR.includes('function resolveHealthSteps')
    && appR.includes("resolveHealthSteps(state.healthSync.priority")
    && appR.includes('hcTotalStepsToday')
    && appR.includes('Шагов с часов:');
  if (!okJs) failed++;
  console.log(`${okJs ? '✓' : '✗'} 0.7.10 JS: приоритет источника решает resolveHealthSteps, диагностика разделяет часы и все источники`);

  // Натив (зеркало workflow): разделение шагов по dataOrigin + окно сна через полночь
  const okNative = mirror.includes('WEARABLE_PACKAGES')
    && mirror.includes('record.metadata.dataOrigin')
    && mirror.includes('hc_total_steps_today')
    && mirror.includes('lastBedTime')
    && mirror.includes('atTime(18, 0)')
    && mirror.includes('intArrayOf(watchSteps.toInt(), totalSteps.toInt(), sleepMin)');
  if (!okNative) failed++;
  console.log(`${okNative ? '✓' : '✗'} 0.7.10 зеркало build.yml: шаги по источникам (dataOrigin) + окно сна 18:00→18:00`);

  const okVer0710 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer0710) failed++;
  console.log(`${okVer0710 ? '✓' : '✗'} 0.7.10 версия в коде и «О приложении»`);
}

{
  // ===================== 0.7.11 (свежесть часов в «Авто», больше производителей, авто-номер сборки) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  const mirror = readBuildBundle();

  // JS: «Авто» = часы приоритет, авто-обновление при входе, честная подсказка о возрасте данных часов
  const okJs = appR.includes('function resolveHealthSteps')
    && appR.includes('refreshHealthDataOnResume')
    && appR.includes('watchLastTs')
    && appR.includes('unknownWatchSource');
  if (!okJs) failed++;
  console.log(`${okJs ? '✓' : '✗'} 0.7.11 JS: часы приоритет в «Авто», авто-обновление при входе, подсказка о возрасте данных часов`);

  // Натив: расширенный список производителей часов + метка свежести + авто-номер сборки + страховка зеркала
  const okNative = mirror.includes('com.huawei.health')
    && mirror.includes('com.hihonor.health')
    && mirror.includes('com.xiaomi.wearable')
    && mirror.includes('com.sec.android.app.shealth')
    && mirror.includes('lastWatchEndMs')
    && mirror.includes('hc_watch_last_ts')
    && mirror.includes('pageToken = stepsResponse.pageToken')
    && mirror.includes('steps_base_date')
    && mirror.includes('Inject build number')
    && mirror.includes('активный workflow совпадает с зеркалом');
  if (!okNative) failed++;
  console.log(`${okNative ? '✓' : '✗'} 0.7.11 зеркало build.yml: производители часов + свежесть + авто-номер сборки + страховка зеркала`);

  // Сборка сама подставляет номер run_number вместо «build 0»
  const okBuildInject = mirror.includes("sed -i \"s/const FITFLOW_BUILD = '[^']*';/const FITFLOW_BUILD = 'build ${RUN_NUMBER}';/\" www/app.js");
  if (!okBuildInject) failed++;
  console.log(`${okBuildInject ? '✓' : '✗'} 0.7.11: номер сборки в APK подставляется автоматически из run_number`);

  const okVer0711 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer0711) failed++;
  console.log(`${okVer0711 ? '✓' : '✗'} 0.7.11 версия в коде и «О приложении»`);
}

{
  // ===================== 0.7.13 (фоновая синхронизация для виджета + компактная карточка шагов) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('style.css', 'utf8');
  const mirror = readBuildBundle();

  // JS: приоритет едет в виджет + карточка шагов с подсказкой обновления
  const okJs = appR.includes("priority: (state.healthSync && state.healthSync.priority) || 'auto'")
    && appR.includes('updateNativeWidget(); // 0.7.13: приоритет сразу уезжает')
    && appR.includes('steps-card-sync-hint')
    && html.includes('id="steps-card-sync-hint"')
    && html.includes('class="steps-sync-btn"')
    && css.includes('.steps-sync-btn');
  if (!okJs) failed++;
  console.log(`${okJs ? '✓' : '✗'} 0.7.13 JS/HTML/CSS: компактная кнопка sync + строка обновления + приоритет в виджет`);

  // Натив: фоновый синк для виджета + разрешение шагов по приоритету
  const okNative = mirror.includes('BACKGROUND_SYNC_MIN_INTERVAL')
    && mirror.includes('FitFlowWidgetProvider.updateAll(context)')
    && mirror.includes('resolveWidgetSteps')
    && mirror.includes('putString("health_priority"');
  if (!okNative) failed++;
  console.log(`${okNative ? '✓' : '✗'} 0.7.13 зеркало build.yml: фоновое обновление виджета + шаги по приоритету`);

  const okVer0713 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer0713) failed++;
  console.log(`${okVer0713 ? '✓' : '✗'} 0.7.13 версия в коде и «О приложении»`);
}

{
  // ===================== 0.7.14 (полировка по прогону «трёх персонажей»: карточка шагов + a11y) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');

  // Карточка шагов при выключенной синхронизации не выглядит «мёртвой» (подсказка включить)
  const okOffHint = appR.includes('Синхронизация выключена — включите в Настройках → Шаги');
  if (!okOffHint) failed++;
  console.log(`${okOffHint ? '✓' : '✗'} 0.7.14 карточка шагов: подсказка при выключенной синхронизации`);

  // a11y: кликабельная метрика шагов имеет aria-label для скринридеров
  const okA11y = html.includes('aria-label="Подробный расчёт шагов"');
  if (!okA11y) failed++;
  console.log(`${okA11y ? '✓' : '✗'} 0.7.14 a11y: aria-label у метрики шагов`);

  const okVer0714 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer0714) failed++;
  console.log(`${okVer0714 ? '✓' : '✗'} 0.7.14 версия в коде и «О приложении»`);
}

{
  // ===================== 0.7.15 (тихая галочка вместо toast при авто-синке шагов) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('style.css', 'utf8');

  const okTick = appR.includes('pendingAutoHealthSync')
    && appR.includes('function showStepsSyncTick')
    && appR.includes('showStepsSyncTick()')
    && html.includes('id="steps-sync-check"')
    && css.includes('.steps-sync-check')
    && css.includes('@keyframes stepsTick');
  if (!okTick) failed++;
  console.log(`${okTick ? '✓' : '✗'} 0.7.15: авто-синк показывает тихую галочку в блоке «Шаги» вместо toast`);

  const okVer0715 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer0715) failed++;
  console.log(`${okVer0715 ? '✓' : '✗'} 0.7.15 версия в коде и «О приложении»`);
}

{
  // ===================== 0.7.16 (правдивость парсера: ISSUES.md) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');

  // Сухая крупа → варёная в готовой порции; пюре/тушёнка; чёрная икра; опечатки; выпечка
  const okParser = appR.includes('DRY_TO_COOKED')
    && appR.includes('MEAL_CONTAINER_UNITS')
    && appR.includes('rightWord = combo[2].trim()')
    && appR.includes('тарталетка с черной икрой')
    && appR.includes('function fixCommonTypos')
    && appR.includes("'выпечка': { kcal: 300");
  if (!okParser) failed++;
  console.log(`${okParser ? '✓' : '✗'} 0.7.16 парсер: варёная крупа, пюре+тушёнка, чёрная икра, опечатки, выпечка`);

  const okVer0716 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer0716) failed++;
  console.log(`${okVer0716 ? '✓' : '✗'} 0.7.16 версия в коде и «О приложении»`);
}

{
  // ===================== 0.7.18 (FAQ с поиском, офлайн) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('style.css', 'utf8');

  const okFaq = appR.includes('const FAQ_ITEMS = [')
    && appR.includes('function renderFaqList')
    && appR.includes('function openFaqDialog')
    && appR.includes('FAQ_ITEMS.filter')
    && html.includes('id="faq-dialog"')
    && html.includes('id="faq-search"')
    && html.includes('id="faq-open"')
    && css.includes('.faq-list')
    && css.includes('.faq-item');
  if (!okFaq) failed++;
  console.log(`${okFaq ? '✓' : '✗'} 0.7.18 FAQ: диалог с поиском (офлайн), кнопка в «О приложении»`);

  // Троттлинг авто-синка снижен до 30 с (возврат из Zepp подхватывает данные)
  const okThrottle = appR.includes('HEALTH_AUTO_READ_MIN_INTERVAL = 30 * 1000');
  if (!okThrottle) failed++;
  console.log(`${okThrottle ? '✓' : '✗'} 0.7.17: авто-синк при возврате — дебаунс 30 с вместо 5 минут`);

  const okVer0718 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer0718) failed++;
  console.log(`${okVer0718 ? '✓' : '✗'} 0.7.18 версия в коде и «О приложении»`);
}

{
  // ===================== 0.8.0 (импорт тренировок с часов, шаг 1) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('style.css', 'utf8');
  const mirror = readBuildBundle();

  // JS: приём сессий, дедуп по recordId, маппинг типа, импорт/игнор, баннер
  const okJs = appR.includes('function onHealthWorkoutsReceived')
    && appR.includes('function mapWatchWorkoutType')
    && appR.includes('function importWatchWorkout')
    && appR.includes('function dismissWatchWorkout')
    && appR.includes('function renderWatchWorkoutsSuggest')
    && appR.includes('requestWatchWorkoutsSync()')
    && html.includes('id="watch-workouts-suggest"')
    && appR.includes('data-watch-import') // кнопки баннера генерируются в JS
    && css.includes('.watch-workouts-suggest');
  if (!okJs) failed++;
  console.log(`${okJs ? '✓' : '✗'} 0.8.0 JS/HTML/CSS: приём сессий часов + баннер «добавить в дневник»`);

  // Натив: чтение ExerciseSessionRecord + мост syncHealthWorkoutsNow
  const okNative = mirror.includes('ExerciseSessionRecord')
    && mirror.includes('readTodayWorkouts')
    && mirror.includes('mapExerciseType')
    && mirror.includes('syncHealthWorkoutsNow')
    && mirror.includes('onHealthWorkoutsReceived');
  if (!okNative) failed++;
  console.log(`${okNative ? '✓' : '✗'} 0.8.0 зеркало build.yml: чтение сессий тренировок из Health Connect`);

  const okVer080 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer080) failed++;
  console.log(`${okVer080 ? '✓' : '✗'} 0.8.0 версия в коде и «О приложении»`);
}

{
  // ===================== 0.8.1 (фикс подсветки быстрого перехода + фиксация двойного учёта ккал) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  const postponed = fs.readFileSync('POSTPONED.md', 'utf8');

  // Подсветка не считается на скрытой Главной + пересчёт при возврате
  const okNav = appR.includes("const homeView = $('#home-view');")
    && appR.includes('if (homeView && homeView.hidden) return;')
    && appR.includes('requestAnimationFrame(() => requestAnimationFrame(updateHomeQuickNavActive));');
  if (!okNav) failed++;
  console.log(`${okNav ? '✓' : '✗'} 0.8.1 быстрый переход: подсветка не «застревает» при смене экранов`);

  // Двойной учёт калорий (шаги+тренировки) зафиксирован как P31
  const okP31 = postponed.includes('P31. Двойной учёт калорий: шаги + тренировки (бег)');
  if (!okP31) failed++;
  console.log(`${okP31 ? '✓' : '✗'} 0.8.1 POSTPONED: P31 (двойной учёт ккал) зафиксирован`);

  const okVer081 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer081) failed++;
  console.log(`${okVer081 ? '✓' : '✗'} 0.8.1 версия в коде и «О приложении»`);
}

{
  // ===================== 0.8.2 (бюджет калорий без двойного счёта + баннер тренировок) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('style.css', 'utf8');

  // Баланс: тренировки по MET + шаги, минус пересечение (P31)
  const okBudget = appR.includes('computeFoodBudgetAdjustmentPure')
    && appR.includes('STEP_KCAL_PER_STEP')
    && appR.includes('overlapKcal')
    && appR.includes('computeFoodBudgetAdjustment()')
    && html.includes('не считаются дважды');
  if (!okBudget) failed++;
  console.log(`${okBudget ? '✓' : '✗'} 0.8.2 бюджет: тренировки MET + шаги − пересечение (без двойного счёта)`);

  // Баннер: компактные кнопки (не глобальный .btn), чистый двухстрочный вид
  const okBanner = appR.includes('watch-btn-add')
    && appR.includes('watch-btn-ghost')
    && appR.includes('тип можно изменить после добавления')
    && css.includes('.watch-btn')
    && css.includes('.watch-workout-actions {');
  if (!okBanner) failed++;
  console.log(`${okBanner ? '✓' : '✗'} 0.8.2 баннер тренировок: компактные кнопки, тип меняется после добавления`);

  const okVer082 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer082) failed++;
  console.log(`${okVer082 ? '✓' : '✗'} 0.8.2 версия в коде и «О приложении»`);
}

{
  // ===================== 0.8.3 (подсветка по визуальному порядку + фикс иконки весов) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');

  // Подсветка по визуальному порядку карточек, а не по фиксированному порядку чипов
  const okNav = appR.includes("Array.from(cardsEl.children).filter((el) => el && !el.hidden")
    && appR.includes('function quicknavStuckBottom')
    && appR.includes("const cardsEl = $('#home-cards')");
  if (!okNav) failed++;
  console.log(`${okNav ? '✓' : '✗'} 0.8.3 быстрый переход: подсветка по визуальному порядку карточек`);

  // Иконка весов в диалоге не растягивается на весь экран (нет width:auto)
  const okIcon = !html.includes('app-dialog-icon" aria-hidden="true" style="width:auto"')
    && html.includes('width="26" height="26" viewBox="0 0 24 24"');
  if (!okIcon) failed++;
  console.log(`${okIcon ? '✓' : '✗'} 0.8.3 диалог веса: иконка весов фиксированного размера`);

  const okVer083 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer083) failed++;
  console.log(`${okVer083 ? '✓' : '✗'} 0.8.3 версия в коде и «О приложении»`);
}

{
  // ===================== 0.8.4 (дневник силовых тренировок) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('style.css', 'utf8');

  // JS: каталог, расчёты, черновик, сохранение
  const okJs = appR.includes('const EXERCISE_CATALOG = {')
    && appR.includes('function computeSetTonnage')
    && appR.includes('function estimate1RM')
    && appR.includes('function saveStrengthSession')
    && appR.includes('function renderStrengthDiary')
    && appR.includes('strengthSessions: []')
    && appR.includes('normalizeStrengthSessions()');
  if (!okJs) failed++;
  console.log(`${okJs ? '✓' : '✗'} 0.8.4 JS: каталог упражнений, тоннаж/1RM, черновик и сохранение силовой`);

  // HTML: блок в Активности + диалог выбора упражнения
  const okHtml = html.includes('id="strength-diary"')
    && html.includes('data-collapse-target="strength-diary-content"')
    && html.includes('id="strength-exercise-dialog"')
    && html.includes('id="strength-exercise-list"')
    && html.includes('id="strength-custom-name"');
  if (!okHtml) failed++;
  console.log(`${okHtml ? '✓' : '✗'} 0.8.4 HTML: блок силовых и диалог выбора упражнения`);

  // CSS
  const okCss = css.includes('.strength-diary') && css.includes('.strength-exercise-list') && css.includes('.strength-set input');
  if (!okCss) failed++;
  console.log(`${okCss ? '✓' : '✗'} 0.8.4 CSS: стили дневника силовых`);

  const okVer084 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer084) failed++;
  console.log(`${okVer084 ? '✓' : '✗'} 0.8.4 версия в коде и «О приложении»`);
}

{
  // ===================== 0.8.5 (силовая в недельную цель + прогресс/рекорды) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('style.css', 'utf8');

  // Длительность силовой засчитывается в недельную цель (запись workout)
  const okIntegrate = appR.includes('durationMinutes: durMin || null')
    && appR.includes("note: 'из дневника силовых'")
    && appR.includes("type: 'strength'")
    && appR.includes('data-s-duration')
    && html.includes('Длительность, мин');
  if (!okIntegrate) failed++;
  console.log(`${okIntegrate ? '✓' : '✗'} 0.8.5 силовая: длительность засчитывается в недельную цель`);

  // Прогресс/рекорды
  const okProgress = appR.includes('function computeStrengthRecords')
    && appR.includes('function renderStrengthHistory')
    && html.includes('id="strength-history"')
    && html.includes('data-collapse-target="strength-history-content"')
    && css.includes('.strength-history');
  if (!okProgress) failed++;
  console.log(`${okProgress ? '✓' : '✗'} 0.8.5 силовые: блок «Прогресс» с рекордами и историей`);

  const okVer085 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer085) failed++;
  console.log(`${okVer085 ? '✓' : '✗'} 0.8.5 версия в коде и «О приложении»`);
}

{
  // ===================== 0.8.6 (уровни силовых — лестница порогов + медали) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('style.css', 'utf8');
  const design = fs.readFileSync('design/strength-game.md', 'utf8');

  // Лестницы порогов + расчёт уровня + цель в прогрессе + медали
  const okLadder = appR.includes('STRENGTH_LADDER_RULES')
    && appR.includes('function computeStrengthLevel')
    && appR.includes('strength-record-goal')
    && appR.includes("id: 'strength', title: '🏋️ Сила (уровни)'")
    && appR.includes('Новый уровень')
    && css.includes('.strength-record-goal');
  if (!okLadder) failed++;
  console.log(`${okLadder ? '✓' : '✗'} 0.8.6 уровни силовых: лестница порогов, цель, группа медалей, момент награды`);

  // Проектирование расписано в файле
  const okDesign = design.includes('лестница уровней') && design.includes('каждый кг — приз');
  if (!okDesign) failed++;
  console.log(`${okDesign ? '✓' : '✗'} 0.8.6 design/strength-game.md: логика расписана`);

  const okVer086 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer086) failed++;
  console.log(`${okVer086 ? '✓' : '✗'} 0.8.6 версия в коде и «О приложении»`);
}

{
  // ===================== 0.8.7 (шаги в статистике, P28) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');

  // История шагов: накопление снапшотов + раздел в статистике
  const okSteps = appR.includes('stepsHistory: []')
    && appR.includes('function normalizeStepsHistory')
    && appR.includes('function recordStepsSnapshot')
    && appR.includes('recordStepsSnapshot(resolved.steps, resolved.source)')
    && appR.includes("const stepsSection = $('#stats-steps-section')")
    && html.includes('id="stats-steps-section"')
    && html.includes('id="stats-steps-bars"')
    && html.includes('id="stats-steps-total"');
  if (!okSteps) failed++;
  console.log(`${okSteps ? '✓' : '✗'} 0.8.7 шаги в статистике: снапшоты по дням + раздел «Шаги»`);

  const okVer087 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer087) failed++;
  console.log(`${okVer087 ? '✓' : '✗'} 0.8.7 версия в коде и «О приложении»`);
}

{
  // ===================== 0.8.8 (шаблоны силовых тренировок) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const css = fs.readFileSync('style.css', 'utf8');

  const okTpl = appR.includes('strengthTemplates: []')
    && appR.includes('function normalizeStrengthTemplatesList')
    && appR.includes('function saveStrengthTemplate')
    && appR.includes('function startStrengthFromTemplate')
    && appR.includes('function deleteStrengthTemplate')
    && appR.includes('data-s-save-template')
    && appR.includes('data-s-start-template')
    && css.includes('.strength-templates');
  if (!okTpl) failed++;
  console.log(`${okTpl ? '✓' : '✗'} 0.8.8 шаблоны силовых: сохранить/начать/удалить, блок в дневнике`);

  const okVer088 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer088) failed++;
  console.log(`${okVer088 ? '✓' : '✗'} 0.8.8 версия в коде и «О приложении»`);
}

{
  // ===================== 0.8.9 (план тренировок по дням недели) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('style.css', 'utf8');

  const okPlan = appR.includes('strengthPlan: []')
    && appR.includes('function normalizeStrengthPlanList')
    && appR.includes('function togglePlanDay')
    && appR.includes('function renderStrengthPlan')
    && appR.includes('function isPlanDoneToday')
    && appR.includes('STRENGTH_PLAN_DAYS')
    && html.includes('id="strength-plan"')
    && html.includes('data-collapse-target="strength-plan-content"')
    && css.includes('.strength-plan-day');
  if (!okPlan) failed++;
  console.log(`${okPlan ? '✓' : '✗'} 0.8.9 план тренировок: дни недели + «выполнить» + отметка выполненного`);

  const okVer089 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer089) failed++;
  console.log(`${okVer089 ? '✓' : '✗'} 0.8.9 версия в коде и «О приложении»`);
}

{
  // ===================== 0.8.10 (таймер отдыха + баланс нагрузки) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('style.css', 'utf8');

  // Таймер отдыха: пресеты + старт/стоп + вибрация
  const okTimer = appR.includes('function startStrengthRest')
    && appR.includes('function stopStrengthRest')
    && appR.includes('navigator.vibrate')
    && appR.includes('renderStrengthRestTimer()')
    && html.includes('id="strength-rest-presets"')
    && html.includes('id="strength-rest-start"')
    && css.includes('.strength-rest-timer');
  if (!okTimer) failed++;
  console.log(`${okTimer ? '✓' : '✗'} 0.8.10 таймер отдыха: пресеты, старт/стоп, вибрация`);

  // Баланс нагрузки
  const okBalance = appR.includes('function computeLoadBalance')
    && appR.includes('renderWeeklyLoadBalance()')
    && html.includes('id="weekly-load-balance"');
  if (!okBalance) failed++;
  console.log(`${okBalance ? '✓' : '✗'} 0.8.10 баланс нагрузки за 7 дней: Сила/Кардио/Растяжка`);

  const okVer0810 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer0810) failed++;
  console.log(`${okVer0810 ? '✓' : '✗'} 0.8.10 версия в коде и «О приложении»`);
}

{
  // ===================== 0.8.11 (backfill шагов + экспорт тренировок в HC — нативный пакет) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const mirror = readBuildBundle();

  // JS: приём backfill + экспорт тренировки
  const okJs = appR.includes('function mergeStepsBackfill')
    && appR.includes('function onHealthStepsHistoryReceived')
    && appR.includes('function exportWorkoutToHealthConnect')
    && appR.includes('function onWorkoutExported')
    && appR.includes('requestStepsHistorySync()')
    && appR.includes('data-export-workout');
  if (!okJs) failed++;
  console.log(`${okJs ? '✓' : '✗'} 0.8.11 JS: backfill шагов + экспорт тренировки в Health Connect`);

  // Натив: чтение истории шагов + запись ExerciseSessionRecord + WRITE_EXERCISE
  const okNative = mirror.includes('readStepsHistory')
    && mirror.includes('insertWorkoutSession')
    && mirror.includes('mapWorkoutTypeToHC')
    && mirror.includes('syncHealthStepsHistory')
    && mirror.includes('exportWorkoutToHealthConnect')
    && mirror.includes('android.permission.health.WRITE_EXERCISE')
    && mirror.includes('exerciseType = mapWorkoutTypeToHC(typeKey)');
  if (!okNative) failed++;
  console.log(`${okNative ? '✓' : '✗'} 0.8.11 зеркало build.yml: backfill шагов + запись тренировки + WRITE_EXERCISE`);

  const okVer0811 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer0811) failed++;
  console.log(`${okVer0811 ? '✓' : '✗'} 0.8.11 версия в коде и «О приложении»`);
}

{
  // ===================== 0.8.13 (адаптив силовых блоков — без вылезания за край) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('style.css', 'utf8');

  // Сетки и флекс-элементы силовых — сжимаемые (min-width: 0), без фиксированных минимумов
  const okAdaptive = css.includes('.strength-meta { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);')
    && css.includes('grid-template-columns: minmax(0, 1.4fr) repeat(7, minmax(0, 1fr));')
    && css.includes('.strength-exercise-summary { font-size: 0.72rem; color: var(--md-sys-color-primary); min-width: 0; text-align: right; }')
    && css.includes('.strength-meta { grid-template-columns: minmax(0, 1fr); }');
  if (!okAdaptive) failed++;
  console.log(`${okAdaptive ? '✓' : '✗'} 0.8.13 адаптив силовых: сжимаемые сетки/флекс, стек полей на узких экранах`);

  const okVer0813 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer0813) failed++;
  console.log(`${okVer0813 ? '✓' : '✗'} 0.8.13 версия в коде и «О приложении»`);
}

{
  // ===================== 0.8.16 (быстрый переход из видимых карточек + цвет столбцов шагов) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('style.css', 'utf8');

  // Чипы из видимых карточек (Самочувствие и Шаги учтены), единый низ панели для порога и прокрутки
  const okNav = appR.includes("const QUICKNAV_LABELS = {")
    && appR.includes("'steps': 'Шаги'")
    && appR.includes('function quicknavStuckBottom')
    && appR.includes('подсветка по видимой площади раздела') === false
    /* 0.8.26: порог `quicknavStuckBottom() + 2` заменён на верх видимой зоны.
       0.9.8: критерий «видимая площадь» снят (он давал дребезг в зазорах между
       карточками), но низ панели по-прежнему общий для порога и прокрутки — это
       и проверяем. */
    && appR.includes('const viewTop = quicknavStuckBottom();')
    && appR.includes("target.scrollIntoView({ behavior: 'smooth', block: 'start' })")
    && appR.includes("--quicknav-scroll-margin")
    && css.includes('scroll-margin-top: var(--quicknav-scroll-margin, 116px)');
  if (!okNav) failed++;
  console.log(`${okNav ? '✓' : '✗'} 0.8.16 быстрый переход: чипы из видимых карточек, единый низ панели для порога и прокрутки`);

  // Столбцы «Шаги» в статистике получили цвет (были прозрачными).
  // 0.8.25: одного фона мало — проверяем ещё геометрию (см. блок 0.8.25 ниже),
  // потому что при схлопнутой колонке красить было нечего.
  const okStepsBars = css.includes('.stats-steps .stats-bar:not(.is-empty) { background: var(--grad-b); }');
  if (!okStepsBars) failed++;
  console.log(`${okStepsBars ? '✓' : '✗'} 0.8.16 статистика: столбцы «Шаги» окрашены`);

  const okVer0816 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer0816) failed++;
  console.log(`${okVer0816 ? '✓' : '✗'} 0.8.16 версия в коде и «О приложении»`);
}

{
  // ===================== 0.8.17 (компактное «О приложении»: сгруппированные подразделы) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('style.css', 'utf8');

  const okAbout = html.includes('class="about-group"')
    && html.includes('Правовое и данные')
    && html.includes('Поддержка проекта')
    && css.includes('.about-group { margin-top: 14px; }');
  if (!okAbout) failed++;
  console.log(`${okAbout ? '✓' : '✗'} 0.8.17 «О приложении»: сгруппированные подразделы (Справка / Правовое / Поддержка)`);

  const okVer0817 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer0817) failed++;
  console.log(`${okVer0817 ? '✓' : '✗'} 0.8.17 версия в коде и «О приложении»`);
}

{
  // ===================== 0.8.18 (цель шагов в мастере «Быстрая настройка») =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('style.css', 'utf8');

  const okWizard = appR.includes("kind: 'steps'")
    && appR.includes("step.kind === 'steps'")
    && appR.includes('state.healthSync.dailyGoal = Math.min(50000, Math.round(v / 500) * 500)')
    && html.includes('id="setup-wizard-steps"')
    && html.includes('Быстрая настройка (6 вопросов)')
    && css.includes('.setup-wizard-steps-row');
  if (!okWizard) failed++;
  console.log(`${okWizard ? '✓' : '✗'} 0.8.18 мастер: вопрос «Цель шагов в день» с числовым полем`);

  const okVer0818 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer0818) failed++;
  console.log(`${okVer0818 ? '✓' : '✗'} 0.8.18 версия в коде и «О приложении»`);
}

{
  // ===================== 0.8.20 (поиск по базе продуктов, P15) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  const css = fs.readFileSync('style.css', 'utf8');

  const okSearch = appR.includes('function searchFoodDb')
    && appR.includes('function openProductSearchDialog')
    && appR.includes('function renderProductSearch')
    && html.includes('id="product-search-dialog"')
    && html.includes('id="product-search-input"')
    && html.includes('id="product-search-open"')
    && css.includes('.product-search-list');
  if (!okSearch) failed++;
  console.log(`${okSearch ? '✓' : '✗'} 0.8.20 поиск по базе: диалог «Что в базе» + кнопка 🔍 на карточке питания`);

  const okVer0820 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer0820) failed++;
  console.log(`${okVer0820 ? '✓' : '✗'} 0.8.20 версия в коде и «О приложении»`);
}

{
  // ===================== 0.8.21 (экспорт CSV, P16) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');

  const okCsv = appR.includes('function buildCsvExport')
    && appR.includes('function exportCsvData')
    && appR.includes("blob = new Blob(['\\ufeff' + csv]")
    && html.includes('id="export-csv-btn"');
  if (!okCsv) failed++;
  console.log(`${okCsv ? '✓' : '✗'} 0.8.21 CSV: кнопка экспорта в «Данные» + buildCsvExport/exportCsvData`);

  const okVer0821 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer0821) failed++;
  console.log(`${okVer0821 ? '✓' : '✗'} 0.8.21 версия в коде и «О приложении»`);
}

{
  // ===================== 0.8.22 («Повторить вчерашний приём пищи», P24) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');

  const okRepeat = appR.includes('function compactFoodItemsForHistory')
    && appR.includes('function repeatYesterdayMeal')
    && appR.includes("summary.items = compactFoodItemsForHistory(foodItems)")
    && appR.includes('normalized.items = compactFoodItemsForHistory(day.items)')
    && html.includes('id="food-repeat-yesterday"');
  if (!okRepeat) failed++;
  console.log(`${okRepeat ? '✓' : '✗'} 0.8.22 «Повторить вчера»: хранение позиций дня + кнопка «↺ Вчера»`);

  const okVer0822 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer0822) failed++;
  console.log(`${okVer0822 ? '✓' : '✗'} 0.8.22 версия в коде и «О приложении»`);
}

{
  // ===================== 0.8.23 (умные весы: вес/рост из Health Connect, P34) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const mirror = readBuildBundle();

  const okJs = appR.includes('function mergeWeightsFromMetrics')
    && appR.includes('function onHealthBodyMetricsReceived')
    && appR.includes('function requestBodyMetricsSync')
    && appR.includes('requestBodyMetricsSync();');
  if (!okJs) failed++;
  console.log(`${okJs ? '✓' : '✗'} 0.8.23 JS: слияние веса + обработчик + триггер раз в сутки`);

  const okNative = mirror.includes('readBodyMetrics')
    && mirror.includes('WeightRecord')
    && mirror.includes('HeightRecord')
    && mirror.includes('rec.weight.inKilograms')
    && mirror.includes('.height.inMeters')
    && mirror.includes('syncHealthBodyMetrics')
    && mirror.includes('android.permission.health.READ_WEIGHT')
    && mirror.includes('android.permission.health.READ_HEIGHT');
  if (!okNative) failed++;
  console.log(`${okNative ? '✓' : '✗'} 0.8.23 зеркало build.yml: чтение Weight/Height + мост + разрешения`);

  const okVer0823 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer0823) failed++;
  console.log(`${okVer0823 ? '✓' : '✗'} 0.8.23 версия в коде и «О приложении»`);
}

{
  // ===================== 0.8.24 (локальный ИИ на устройстве + напоминание о самочувствии, P13/P14) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const plugin = fs.readFileSync('plugins/fitflow-local-ai/android/src/main/java/ru/fitflow/localai/FitFlowLocalAiPlugin.kt', 'utf8');

  const okDownload = appR.includes('startModelDownload')
    && appR.includes('modelDownloadStatus')
    && appR.includes('cancelModelDownload')
    && html.includes('ai-download-panel');
  if (!okDownload) failed++;
  console.log(`${okDownload ? '✓' : '✗'} 0.8.24 локальный ИИ: загрузка модели (старт/статус/отмена) + панель в UI`);

  const okPluginKt = plugin.includes('fun startModelDownload')
    && plugin.includes('fun modelDownloadStatus')
    && plugin.includes('fun cancelModelDownload')
    && plugin.includes('fun deviceInfo');
  if (!okPluginKt) failed++;
  console.log(`${okPluginKt ? '✓' : '✗'} 0.8.24 плагин Kotlin: методы загрузки модели и сведения об устройстве`);

  const okMood = appR.includes('fitflow_day_mood')
    && appR.includes('fitflow-day-mood')
    && html.includes('day-mood-reminder-toggle');
  if (!okMood) failed++;
  console.log(`${okMood ? '✓' : '✗'} 0.8.24 напоминание о самочувствии: канал + источник + переключатель`);

  const okVer0824 = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVer0824) failed++;
  console.log(`${okVer0824 ? '✓' : '✗'} 0.8.24 версия в коде и «О приложении»`);
}

{
  // ===================== 0.8.25 (тренировки с часов, скрытые карточки, кнопка в уведомлении курса, столбцы шагов) =====================
  const appR = fs.readFileSync('app.js', 'utf8');
  const css = fs.readFileSync('style.css', 'utf8');

  // 1. Тренировки с часов не теряются: дата по началу сессии + авто-импорт + отмена
  const okWatchAuto = appR.includes('function watchWorkoutDateKey')
    && appR.includes('function pickStaleWatchWorkouts')
    && appR.includes('function autoImportStaleWatchWorkouts')
    && appR.includes('function undoAutoWatchWorkout')
    && appR.includes("note: 'с часов (авто)'")
    && appR.includes('watchRecordId')
    && appR.includes('data-watch-undo');
  if (!okWatchAuto) failed++;
  console.log(`${okWatchAuto ? '✓' : '✗'} 0.8.25 часы: дата по началу сессии, авто-добавление за прошлые дни, отмена`);

  // Авто-импорт вызывается и после синка, и при возврате в приложение
  const okWatchTriggers = (appR.match(/autoImportStaleWatchWorkouts\(\);/g) || []).length >= 2;
  if (!okWatchTriggers) failed++;
  console.log(`${okWatchTriggers ? '✓' : '✗'} 0.8.25 часы: авто-импорт вызывается после синхронизации и при возврате`);

  // 2. Скрытая карточка исключается везде: единый хелпер + План дня + задания + статистика
  const okTracker = appR.includes('const TRACKER_CARDS')
    && appR.includes('function isTrackerEnabled')
    && appR.includes("isTrackerEnabled('water')")
    && appR.includes("isTrackerEnabled('food')")
    && appR.includes('.filter((task) => isTrackerEnabled(task.id))')
    && appR.includes('section.hidden = !isTrackerEnabled(cardId)');
  if (!okTracker) failed++;
  console.log(`${okTracker ? '✓' : '✗'} 0.8.25 скрытая карточка: единый хелпер для Плана дня, заданий и Статистики`);

  // Секции статистики получили id, по которым их скрывают
  const okStatsIds = html.includes('id="stats-water-section"')
    && html.includes('id="stats-food-section"')
    && html.includes('id="stats-steps-section"')
    && html.includes('id="stats-weight-section"');
  if (!okStatsIds) failed++;
  console.log(`${okStatsIds ? '✓' : '✗'} 0.8.25 статистика: у секций вода/питание/шаги/вес есть id для скрытия`);

  // Быстрая навигация по-прежнему строится из реально видимых карточек
  const okQuickNav = appR.includes('function renderHomeQuickNav')
    && appR.includes('!el.hidden')
    && appR.includes('renderHomeQuickNav();');
  if (!okQuickNav) failed++;
  console.log(`${okQuickNav ? '✓' : '✗'} 0.8.25 быстрая навигация: чипы строятся из видимых карточек`);

  /* 0.8.25 (регрессия 0.8.16): id элемента карточки — «food-card», а в HOME_CARDS
     лежит «food». Сравнение el.id === h.id не совпадало никогда, и панель быстрого
     перехода молча строилась пустой. Страхуемся: сопоставление должно идти по
     шаблону `${h.id}-card`, а «голого» сравнения el.id с h.id быть не должно. */
  const okQuickNavIds = appR.includes('`${h.id}-card` === el.id')
    && !appR.includes('HOME_CARDS.some((h) => h.id === el.id)');
  if (!okQuickNavIds) failed++;
  console.log(`${okQuickNavIds ? '✓' : '✗'} 0.8.25 быстрая навигация: id карточек сопоставляются корректно (панель не пустая)`);

  /* 0.8.26 (п.1 владельца): в пилюлях быстрого перехода только текст — иконка
     съедала ширину и «Самочувствие» обрезалось. Чип не должен звать homeCardIcon,
     а пилюли не должны делить ширину поровну (flex:1 1 0 → flex:0 0 auto). */
  const cssQuickNav = fs.readFileSync('style.css', 'utf8');
  const chipHtml = appR.slice(appR.indexOf('class="quicknav-chip"') - 200, appR.indexOf('class="quicknav-chip"') + 200);
  const okChipText = !chipHtml.includes('homeCardIcon')
    && cssQuickNav.includes('.home-quicknav .quicknav-chip')
    && !cssQuickNav.includes('.home-quicknav .quicknav-chip svg');
  if (!okChipText) failed++;
  console.log(`${okChipText ? '✓' : '✗'} 0.8.26 быстрый переход: в пилюлях только текст, без иконок`);

  /* 0.8.26 (п.2 владельца): подсветка при прокрутке снизу вверх показывала не
     тот раздел. Требование владельца — «подсвечен тот раздел, который читаю»,
     одинаково в обе стороны.

     0.9.8: реализация этого требования сменилась. Критерий «наибольшая видимая
     площадь» сам оказался источником дребезга (в зазоре между карточками
     побеждала самая высокая, подсветка прыгала туда-обратно), поэтому активен
     раздел, ПЕРЕСЕКАЮЩИЙ линию порога, — он честен в обе стороны прокрутки.
     Проверяем действующий критерий и отсутствие наивного правила «последний,
     чей верх прошёл порог» по всему списку, из-за которого дефект и возник. */
  const okQuickNavActive = appR.includes('function updateHomeQuickNavActive')
    && appR.includes('if (r.top <= line && r.bottom > line)')
    && !appR.includes('if (card.getBoundingClientRect().top <= threshold) activeId = card.id;');
  if (!okQuickNavActive) failed++;
  console.log(`${okQuickNavActive ? '✓' : '✗'} 0.8.26 быстрый переход: активен раздел под панелью (в обе стороны)`);

  // 3. Кнопка «✓ Принял» в уведомлении курса (чистый JS, без правок workflow)
  const okCourseAction = appR.includes('const COURSE_DOSE_ACTION_TYPE')
    && appR.includes('const COURSE_DOSE_ACTION_ID')
    && appR.includes("title: '✓ Принял'")
    && appR.includes('actionTypeId: COURSE_DOSE_ACTION_TYPE')
    && appR.includes('doseIndex: doseIdx')
    && appR.includes('event.actionId === COURSE_DOSE_ACTION_ID')
    && appR.includes('toggleCourseDose(courseId, doseIndex, dateKey)');
  if (!okCourseAction) failed++;
  console.log(`${okCourseAction ? '✓' : '✗'} 0.8.25 курс: кнопка «✓ Принял» в уведомлении отмечает конкретный приём`);

  // 4. Столбцы графиков: определённая высота колонки + явная ширина + контур
  const okBarsGeometry = css.includes('height: 100%;')
    && /\.stats-bar \{[^}]*width: 100%/.test(css)
    && /\.stats-bar \{[^}]*border: 1px solid/.test(css)
    && css.includes('.stats-bar.is-empty')
    && appR.includes("' is-empty'");
  if (!okBarsGeometry) failed++;
  console.log(`${okBarsGeometry ? '✓' : '✗'} 0.8.25 графики: колонка с определённой высотой, столбец с шириной и контуром`);

  // 0.8.29: индикатор режима работы в шапке
  const okNetMarkup = html.includes('id="net-status"')
    && html.includes('net-status-dot')
    && html.includes('net-status-text')
    && /<header class="topbar">[\s\S]{0,2200}id="net-status"/.test(html);
  if (!okNetMarkup) failed++;
  console.log(`${okNetMarkup ? '✓' : '✗'} 0.8.29 индикатор режима присутствует в шапке`);

  // Индикатор обязан читать реальный шлюз, а не отдельный флаг,
  // иначе он начнёт врать при расхождении настроек.
  const netFn = (appR.match(/function getNetStatus\(\)[\s\S]*?\n\}/) || [''])[0];
  const okNetLogic = netFn.includes('ONLINE_FEATURE_TOGGLES')
    && netFn.includes('o.master')
    && netFn.includes("=== true")
    && netFn.includes("navigator.onLine")
    && netFn.includes("'offline'") && netFn.includes("'no-net'") && netFn.includes("'online'");
  if (!okNetLogic) failed++;
  console.log(`${okNetLogic ? '✓' : '✗'} 0.8.29 индикатор считает статус по онлайн-функциям и наличию сети`);

  // Индикатор должен перерисовываться при смене настроек и событиях сети
  const okNetWired = appR.includes('bindNetStatus();')
    && appR.includes("window.addEventListener('online', renderNetStatus)")
    && appR.includes("window.addEventListener('offline', renderNetStatus)")
    && /renderOnlineFeatures\(\)[\s\S]*?renderNetStatus\(\);\n\}/.test(appR)
    && css.includes('.net-status.is-online');
  if (!okNetWired) failed++;
  console.log(`${okNetWired ? '✓' : '✗'} 0.8.29 индикатор обновляется при смене настроек и статуса сети`);

  // 0.8.29: бета-метка на ИИ-анализе периода (оба входа) + пояснение
  const betaCount = (html.match(/data-help="beta-ai-analysis"/g) || []).length;
  const okBeta = betaCount === 2
    && html.includes('class="beta-badge"')
    && css.includes('.beta-badge')
    && appR.includes("'beta-ai-analysis': {")
    && appR.includes('в разработке и тестировании');
  if (!okBeta) failed++;
  console.log(`${okBeta ? '✓' : '✗'} 0.8.29 бета-метка на ИИ-анализе (входов: ${betaCount}/2) с пояснением`);

  // 0.9.0: бета-метка на прогрессе силовых + пояснение, что 1RM/уровни — расчётная оценка
  const okBetaStrength = html.includes('data-help="beta-strength"')
    && appR.includes("'beta-strength': {")
    && appR.includes('в разработке и тестировании');
  if (!okBetaStrength) failed++;
  console.log(`${okBetaStrength ? '✓' : '✗'} 0.9.0 бета-метка на прогрессе силовых с пояснением`);

  // 0.9.0: метка стоит в теле блока, а не в шапке-переключателе,
  // иначе один тап и свернёт блок, и откроет справку.
  const bsIdx = html.indexOf('data-help="beta-strength"');
  const headBefore = html.lastIndexOf('<button class="collapsible-toggle"', bsIdx);
  const closeBefore = html.lastIndexOf('</button>', bsIdx);
  const okBetaPlacement = bsIdx > -1 && closeBefore > headBefore
    && html.indexOf('id="strength-history-content"') < bsIdx;
  if (!okBetaPlacement) failed++;
  console.log(`${okBetaPlacement ? '✓' : '✗'} 0.9.0 бета-метка силовых вне .collapsible-toggle (клик не сворачивает блок)`);

  // 0.9.0: медали силы честно помечены оценкой, а не нормативом
  const okMedalHint = appR.includes("id: 'strength', title: '🏋️ Сила (уровни)'")
    && /id: 'strength',[^\n]*Бета:[^\n]*расчётному 1RM/.test(appR);
  if (!okMedalHint) failed++;
  console.log(`${okMedalHint ? '✓' : '✗'} 0.9.0 медали силы помечены как расчётная оценка`);

  const okVerCurrent = appR.includes("const FITFLOW_VERSION = '" + VERSION + "'") && html.includes('v' + VERSION);
  if (!okVerCurrent) failed++;
  console.log(`${okVerCurrent ? '✓' : '✗'} версия ${VERSION} синхронна в коде и «О приложении»`);

  // 0.8.30 (P22): системный «назад» закрывает диалог его штатной close-функцией.
  // Раньше обработчик ставил hidden = true в обход уборки, из-за чего онбординг
  // и мастер настройки всплывали заново, а в памяти оставались данные.
  const backFn = (appR.match(/function handleBackNavigation\(\)[\s\S]*?\n\}/) || [''])[0];
  const okBackUsesRegistry = appR.includes('const DIALOG_BACK_CLOSERS = {')
    && backFn.includes('DIALOG_BACK_CLOSERS[top.id]')
    && backFn.includes('closer()');
  if (!okBackUsesRegistry) failed++;
  console.log(`${okBackUsesRegistry ? '✓' : '✗'} 0.8.30 «назад» закрывает диалоги штатными close-функциями`);

  // Диалоги, которым уборка нужна обязательно: у них либо отметка «показан»
  // (иначе всплывут снова), либо ссылка на данные в памяти, либо поля ввода.
  const registry = (appR.match(/const DIALOG_BACK_CLOSERS = \{[\s\S]*?\n\};/) || [''])[0];
  const mustClean = {
    'onboarding-dialog': 'skipOnboarding',
    'setup-wizard-dialog': 'closeSetupWizard',
    'all-profiles-import-dialog': 'closeAllProfilesImportDialog',
    'smart-entry-dialog': 'closeSmartEntry',
    'strength-exercise-dialog': 'closeStrengthExercisePicker',
    'course-dialog': 'closeCourseDialog',
    'norms-dialog': 'closeNormsDialog',
    'profile-rename-dialog': 'closeRenameProfileDialog',
    'profile-delete-dialog': 'closeDeleteProfileDialog',
    'activity-reminder-dialog': 'declineActivityReminderPrompt'
  };
  const missingClean = Object.keys(mustClean).filter((id) =>
    !new RegExp(`'${id}':[^\\n]*${mustClean[id]}\\(\\)`).test(registry));
  if (missingClean.length) failed++;
  console.log(`${missingClean.length === 0 ? '✓' : '✗'} 0.8.30 диалоги с уборкой закрываются правильно${missingClean.length ? ' — нет: ' + missingClean.join(', ') : ''}`);

  // Экран условий при первом запуске «назад» обходить по-прежнему нельзя.
  const okTermsGuard = backFn.includes("top.id === 'terms-dialog'")
    && backFn.indexOf("top.id === 'terms-dialog'") < backFn.indexOf('DIALOG_BACK_CLOSERS[top.id]');
  if (!okTermsGuard) failed++;
  console.log(`${okTermsGuard ? '✓' : '✗'} 0.8.30 экран условий не обходится кнопкой «назад»`);

  /* 0.9.1 (п.1 владельца): подсветка чипа быстрого перехода.
     Дефект был в том, что активной считалась карточка с максимальной видимой
     площадью: после клика по низкой карточке («Вес») побеждала высокая соседка
     («Питание») и подсвечивался не тот чип. Критерий должен быть «карточка,
     пересекающая линию порога», а scroll-margin — пересчитан ПЕРЕД прокруткой. */
  const activeFn = (appR.match(/function updateHomeQuickNavActive\(\)[\s\S]*?\n\}/) || [''])[0];
  /* 0.9.8: критерий пересечения порога остался главным, а вот запасной
     «максимум площади» снят — именно он подсвечивал самую крупную карточку.
     Проверяем, что площадь больше нигде не участвует в выборе. */
  const okCross = /r\.top <= line && r\.bottom > line/.test(activeFn)
    && !/bestSeen/.test(activeFn)
    && !/Math\.min\(r\.bottom, viewBottom\)/.test(activeFn);
  if (!okCross) failed++;
  console.log(`${okCross ? '✓' : '✗'} 0.9.1 активен раздел, пересекающий порог (а не самый крупный)`);

  const clickHandler = (appR.match(/quicknavEl\?\.addEventListener\('click'[\s\S]*?\n  \}\);/) || [''])[0];
  const okSync = clickHandler.includes('syncQuickNavTop()')
    && clickHandler.indexOf('syncQuickNavTop()') < clickHandler.indexOf('scrollIntoView');
  if (!okSync) failed++;
  console.log(`${okSync ? '✓' : '✗'} 0.9.1 scroll-margin пересчитан до прокрутки по клику`);

  /* 0.9.2 (п.2 владельца): сканер штрих-кода камерой.
     Требования владельца, которые обязаны сохраниться:
     1) никаких видимых заглушек — кнопка скрыта, пока не подтверждено,
        что есть и нативный мост, и камера;
     2) сканирование камерой, а не ручной ввод кода;
     3) Open Food Facts обязателен к идентификации приложения, иначе банят.
        Заголовок User-Agent из fetch задать нельзя (forbidden header),
        поэтому идентификация идёт параметрами app_name/app_version/app_uuid. */
  const scanBtnHtml = (html.match(/<button[^>]*id="custom-food-scan"[^>]*>/) || [''])[0];
  const okScanHidden = /\shidden(\s|>)/.test(scanBtnHtml);
  if (!okScanHidden) failed++;
  console.log(`${okScanHidden ? '✓' : '✗'} 0.9.2 кнопка сканера скрыта в разметке (без видимых заглушек)`);

  const availFn = (appR.match(/function isBarcodeScannerAvailable\(\)[\s\S]*?\n\}/) || [''])[0];
  const availCode = availFn.replace(/\/\/[^\n]*/g, '');   // без комментариев: они не выполняются
  const okAvail = availCode.includes("typeof b.scanBarcode !== 'function'")
    && /!b\.hasCamera\(\)\)\s*return false/.test(availCode);
  if (!okAvail) failed++;
  console.log(`${okAvail ? '✓' : '✗'} 0.9.2 кнопка показывается только при наличии моста и камеры`);

  const offParams = (appR.match(/function offAppParams\(\)[\s\S]*?\n\}/) || [''])[0];
  const lookupFn = (appR.match(/async function lookupOffByBarcode\([\s\S]*?\n\}/) || [''])[0];
  const okIdent = offParams.includes('app_name=FitFlow') && offParams.includes('app_uuid=')
    && lookupFn.includes('offAppParams()');
  if (!okIdent) failed++;
  console.log(`${okIdent ? '✓' : '✗'} 0.9.2 запрос в Open Food Facts идентифицирует приложение`);

  /* Кэш проверяется РАНЬШЕ рубильника онлайна: уже известный код обязан
     срабатывать и в офлайне, иначе сканер бесполезен без сети. */
  const okCacheFirst = lookupFn.indexOf('offCacheGet(clean)') > -1
    && lookupFn.indexOf('offCacheGet(clean)') < lookupFn.indexOf("isOnlineAllowed('barcodeLookup')");
  if (!okCacheFirst) failed++;
  console.log(`${okCacheFirst ? '✓' : '✗'} 0.9.2 известный штрих-код читается из кэша до проверки онлайна`);

  /* Код прочитан, но продукта нет в базе — владелец не должен остаться
     с пустой формой: подставляется заготовка карточки с кодом. */
  const onScanFn = (appR.match(/async function onBarcodeScanned\([\s\S]*?\n\}\n/) || [''])[0];
  const okFallback = onScanFn.includes("'Продукт ' + code") && onScanFn.includes("error === 'cancelled'");
  if (!okFallback) failed++;
  console.log(`${okFallback ? '✓' : '✗'} 0.9.2 ненайденный код превращается в ручную карточку, отмена молчит`);

  /* Юридическая часть: ZXing (Apache-2.0) и атрибуция ODbL — в существующем
     разделе лицензии, отдельных мест владелец заводить не просил. */
  const thirdParty = (html.match(/id="license-panel-third-party"[\s\S]*?<\/div>/) || [''])[0];
  const okLegal = /ZXing/.test(thirdParty) && /Apache License 2\.0/.test(thirdParty)
    && /Open Database License \(ODbL\)/.test(thirdParty);
  if (!okLegal) failed++;
  console.log(`${okLegal ? '✓' : '✗'} 0.9.2 ZXing и ODbL указаны в разделе лицензии`);
}

/* ============================================================
   0.9.3 (п.3 владельца): ссылка на страницу ИИ-модели
   и пошаговая инструкция в подсказке «?».
   ============================================================ */
{
  const appR = fs.readFileSync('app.js', 'utf8');
  const nativeR = fs.readFileSync('android-native/MainActivity.java', 'utf8');

  /* Ссылка ведёт на страницу репозитория модели, а не на файл: прямые
     ссылки живут недолго и требуют авторизации. */
  const okUrl = /const AI_MODEL_PAGE_URL = 'https:\/\/huggingface\.co\/litert-community\//.test(appR)
    && !/AI_MODEL_PAGE_URL = '[^']*\.litertlm/.test(appR);
  if (!okUrl) failed++;
  console.log(`${okUrl ? '✓' : '✗'} 0.9.3 ссылка ведёт на страницу модели, а не на прямой файл`);

  /* Кнопка не должна быть заглушкой: обработчик привязан, а открытие
     идёт через мост с запасными вариантами (браузер, буфер обмена). */
  const okWired = /bindEvent\('#ai-model-page-btn', 'click', openAiModelPage\)/.test(appR)
    && /id="ai-model-page-btn"/.test(html);
  if (!okWired) failed++;
  console.log(`${okWired ? '✓' : '✗'} 0.9.3 кнопка страницы модели привязана к обработчику`);

  const openFn = (appR.match(/function openExternalLink\([\s\S]*?\n\}\n/) || [''])[0];
  const okFallback = openFn.includes('openExternalUrl') && openFn.includes('window.open')
    && openFn.includes('clipboard.writeText(link)');
  if (!okFallback) failed++;
  console.log(`${okFallback ? '✓' : '✗'} 0.9.3 у открытия ссылки есть запасные варианты`);

  /* Натив открывает только http/https — иначе через мост можно было бы
     дотянуться до чужих схем (intent://, file://). */
  const okSafe = /public boolean openExternalUrl/.test(nativeR)
    && /startsWith\("https:\/\/"\)/.test(nativeR)
    && /FLAG_ACTIVITY_NEW_TASK/.test(nativeR);
  if (!okSafe) failed++;
  console.log(`${okSafe ? '✓' : '✗'} 0.9.3 натив открывает только http/https-ссылки`);

  /* Пошаговая инструкция в «?»: аккаунт, лицензия Gemma, расширение файла
     и предупреждение про GGUF — без них владелец застрянет на сайте. */
  const helpTopic = (appR.match(/'ai-model-download': \{[\s\S]*?\n  \},/) || [''])[0];
  const okHelp = /data-help="ai-model-download"/.test(html)
    && /аккаунт/i.test(helpTopic) && /условия Gemma/.test(helpTopic)
    && /\.litertlm/.test(helpTopic) && /GGUF/.test(helpTopic);
  if (!okHelp) failed++;
  console.log(`${okHelp ? '✓' : '✗'} 0.9.3 подсказка «?» содержит пошаговую инструкцию`);

  /* Условия Gemma — в существующем разделе лицензии (владелец просил
     не заводить под юридические тексты новых мест). */
  const tp = (html.match(/id="license-panel-third-party"[\s\S]*?<\/div>/) || [''])[0];
  const okGemma = /Gemma Terms of Use/.test(tp) && /Prohibited Use Policy/.test(tp)
    && /не являются медицинской рекомендацией/.test(tp);
  if (!okGemma) failed++;
  console.log(`${okGemma ? '✓' : '✗'} 0.9.3 условия Gemma описаны в разделе лицензии`);
}

/* ------------------------------------------------------------------
   0.9.4 — конфигуратор виджета и скрытие выключенных показателей.
------------------------------------------------------------------- */
{
  const appR = fs.readFileSync('app.js', 'utf8');
  const provR = fs.readFileSync('android-native/FitFlowWidgetProvider.java', 'utf8');
  const yml = fs.readFileSync('tools/github-workflows/build.yml', 'utf8');

  /* Бюджет строк должен совпадать в трёх местах: таблица размеров в JS,
     число слотов в генераторе layout'ов и массивы слотов в Java. Разъедутся —
     виджет либо обрежет строки молча, либо упадёт на несуществующем id. */
  const sizes = (appR.match(/const WIDGET_SIZES = \[[\s\S]*?\];/) || [''])[0];
  const okBudget = /'small', label: '[^']*', units: 3/.test(sizes)
    && /'medium', label: '[^']*', units: 5/.test(sizes)
    && /'large', label: '[^']*', units: 8/.test(sizes);
  if (!okBudget) failed++;
  console.log(`${okBudget ? '✓' : '✗'} 0.9.4 бюджет строк виджета задан для трёх размеров`);

  /* Самый крупный бюджет (8) обязан помещаться в большую раскладку (10 слотов),
     а компактная (5 слотов) — вмещать свой бюджет 3. */
  const okSlots = /widget_layout_xml\(5,/.test(yml) && /widget_layout_xml\(10,/.test(yml)
    && /SLOT_IDS_SMALL/.test(provR) && /R\.id\.widget_slot_10\b/.test(provR);
  if (!okSlots) failed++;
  console.log(`${okSlots ? '✓' : '✗'} 0.9.4 слоты виджета есть и в layout'ах, и в Java`);

  /* Каждый id, к которому обращается Java, должен существовать в разметке.
     Проверяем по большой раскладке — она надмножество компактной. */
  const usedIds = Array.from(new Set((provR.match(/R\.id\.(widget_[a-z0-9_]+)/g) || [])
    .map((m) => m.replace('R.id.', ''))));
  const declared = new Set((yml.match(/@\+id\/(widget_[a-z0-9_]+)/g) || [])
    .map((m) => m.replace('@+id/', '')));
  // Слоты объявлены через %d-шаблон, поэтому раскрываем нумерацию вручную.
  for (let i = 1; i <= 10; i++) {
    ['', '_text', '_bar', '_bar2'].forEach((suffix) => declared.add(`widget_slot_${i}${suffix}`));
  }
  const missing = usedIds.filter((id) => !declared.has(id));
  const okIds = missing.length === 0;
  if (!okIds) failed++;
  console.log(`${okIds ? '✓' : '✗'} 0.9.4 все id из Java объявлены в разметке${okIds ? '' : ': нет ' + missing.join(', ')}`);

  /* Требование владельца: превышение лимита — не «тихий отказ», а сообщение
     с цифрами (сколько занимает элемент и сколько свободно). */
  const upd = (appR.match(/function updateWidgetItem\([\s\S]*?\n\}/) || [''])[0];
  const okLimit = /Не помещается/.test(upd) && /item\.units > free/.test(upd)
    && /toast\(/.test(upd) && /return;/.test(upd);
  if (!okLimit) failed++;
  console.log(`${okLimit ? '✓' : '✗'} 0.9.4 при превышении лимита показывается сообщение`);

  /* Календарь тренировок владелец просил добавить отдельным пунктом. */
  const items = (appR.match(/const WIDGET_ITEMS = \[[\s\S]*?\];/) || [''])[0];
  const okWorkout = /id: 'workout'/.test(items) && /Календарь тренировок/.test(items);
  if (!okWorkout) failed++;
  console.log(`${okWorkout ? '✓' : '✗'} 0.9.4 календарь тренировок доступен для виджета`);

  /* Дефект п.5: «Питание» не должно попадать на виджет, если карточка
     выключена в приложении. Фильтр обязан стоять на пути в натив. */
  const active = (appR.match(/function activeWidgetItems\([\s\S]*?\n\}/) || [''])[0];
  const okHide = /filter\(isWidgetItemAvailable\)/.test(active)
    && /widgetItems: activeWidgetItems\(\)/.test(appR);
  if (!okHide) failed++;
  console.log(`${okHide ? '✓' : '✗'} 0.9.4 выключенные показатели не уходят на виджет`);

  /* Натив тоже обязан уважать список: если он снова начнёт рисовать воду и
     питание безусловно, дефект п.5 вернётся при первом же обновлении виджета. */
  const okNativeList = /widgetItems/.test(provR) && /widget_empty/.test(provR)
    && !/setTextViewText\(R\.id\.widget_water/.test(provR);
  if (!okNativeList) failed++;
  console.log(`${okNativeList ? '✓' : '✗'} 0.9.4 натив рисует строки по списку, а не жёстко`);
}

/* -------------------------------------------------------------------
   0.9.5 — замечания владельца: подсветка на самом верху, дубли строк
   на виджете, авто-подбор числа строк, кнопка обновления.
------------------------------------------------------------------- */
{
  const appR = fs.readFileSync('app.js', 'utf8');
  const provR = fs.readFileSync('android-native/FitFlowWidgetProvider.java', 'utf8');
  const yml = fs.readFileSync('tools/github-workflows/build.yml', 'utf8');

  /* Дефект владельца: «поднимаюсь на самый верх — подсвечен „День“, хотя
     первая карточка „Шаги“». Наверху линию порога не пересекает никто
     (первая карточка стоит ниже неё), поэтому нужен явный случай «мы наверху →
     активна первая карточка» — до ветки atBottom и до запасного критерия. */
  const act = (appR.match(/function updateHomeQuickNavActive\([\s\S]*?\n\}/) || [''])[0];
  const okTop = /const atTop = scrollTop <= 8;/.test(act)
    && /if \(atTop\) \{\s*\n\s*activeId = cards\[0\]\.id;/.test(act)
    // 0.9.8: ветка «мы наверху» по-прежнему раньше всех остальных критериев
    && act.indexOf('atTop') < act.indexOf('r.top <= line');
  if (!okTop) failed++;
  console.log(`${okTop ? '✓' : '✗'} 0.9.5 на самом верху подсвечен первый раздел`);

  /* Дефект владельца: после перестановки строк в настройках на виджете
     появились две одинаковые строки «Вода». Натив обязан рисовать каждый
     показатель не более одного раза, даже если в prefs пришёл дубликат. */
  const okDedup = /HashSet<String> drawn/.test(provR) && /drawn\.add\(itemId\)/.test(provR);
  if (!okDedup) failed++;
  console.log(`${okDedup ? '✓' : '✗'} 0.9.5 повторяющийся показатель не рисуется дважды`);

  /* Число строк подбирается под фактическую высоту виджета, иначе кнопки либо
     наполовину закрыты, либо под ними остаётся пустое место. */
  const okFit = /int fitSlots = \(maxHeight - chromeDp\) \/ rowDp;/.test(provR)
    && /Math\.max\(1, Math\.min\(maxSlots, fitSlots\)\)/.test(provR);
  if (!okFit) failed++;
  console.log(`${okFit ? '✓' : '✗'} 0.9.5 число строк виджета подбирается по высоте`);

  /* При уменьшении размера строки выше нового лимита обязаны гаснуть,
     иначе в них останется текст от прошлой раскладки. */
  const okClear = /for \(int i = used; i < maxSlots; i\+\+\)/.test(provR);
  if (!okClear) failed++;
  console.log(`${okClear ? '✓' : '✗'} 0.9.5 лишние слоты гасятся при уменьшении виджета`);

  /* Кнопка «обновить» на самом виджете: есть в разметке, в Java и в onReceive. */
  const okRefresh = /@\+id\/widget_refresh_btn/.test(yml)
    && /R\.id\.widget_refresh_btn/.test(provR)
    && /ACTION_REFRESH = "com\.fitflow\.app\.WIDGET_REFRESH"/.test(provR)
    && /ACTION_REFRESH\.equals\(intent\.getAction\(\)\)/.test(provR);
  if (!okRefresh) failed++;
  console.log(`${okRefresh ? '✓' : '✗'} 0.9.5 на виджете есть рабочая кнопка обновления`);

  /* Кнопки прижаты к низу: строки лежат в контейнере с layout_weight="1",
     иначе при большом виджете под кнопками снова появится пустое поле. */
  const okWeight = /android:layout_height="0dp" android:layout_weight="1" android:orientation="vertical"/.test(yml);
  if (!okWeight) failed++;
  console.log(`${okWeight ? '✓' : '✗'} 0.9.5 кнопки виджета прижаты к нижнему краю`);
}

/* -------------------------------------------------------------------
   0.9.5 — п.1 «Питание»: чёткое разделение трёх сущностей и видимый
   адрес результата сканирования; п.3 — узкие микроанимации отклика.
------------------------------------------------------------------- */
{
  const appR = fs.readFileSync('app.js', 'utf8');
  const htmlR = fs.readFileSync('index.html', 'utf8');
  const cssR = fs.readFileSync('style.css', 'utf8');

  /* Дефект владельца: «сканирую штрих-код, а результат ищу не там».
     После сохранения продукт обязан САМ называть своё место. */
  const okAddress = /сохранён в «Мои продукты»/.test(appR)
    && /он попадёт в «Мои продукты»/.test(appR);
  if (!okAddress) failed++;
  console.log(`${okAddress ? '✓' : '✗'} 0.9.5 сканер сообщает, куда сохранён продукт`);

  /* Комбо умеют воду и активность (commitParsedEntry пишет waterMl и
     activities) — это обязано быть видно в поле создания, иначе владелец
     снова не найдёт способ добавить воду в комбо. */
  const okComboHint = /placeholder="Напр\.: 500 мл воды, овсянка 150 г, бег 30 мин"/.test(htmlR)
    && /записывает СРАЗУ воду, еду и активность/.test(appR);
  if (!okComboHint) failed++;
  console.log(`${okComboHint ? '✓' : '✗'} 0.9.5 в комбо видно, что можно писать воду и активность`);

  /* Подсказка в разметке и подсказка в JS не должны разъезжаться:
     при открытии вкладки JS перезаписывает текст, и рассинхрон был бы
     заметен как «мигание» другой формулировки. */
  const hintsBlock = (appR.match(/const QUICK_TAB_HINTS = \{[\s\S]*?\n\};/) || [''])[0];
  const jsCombo = (hintsBlock.match(/combo: '([^']+)'/) || [])[1] || '';
  const okSync = jsCombo.length > 30 && htmlR.includes(jsCombo);
  if (!okSync) failed++;
  console.log(`${okSync ? '✓' : '✗'} 0.9.5 подсказка вкладки «Комбо» синхронна в HTML и JS`);

  /* П.3: анимация обязана запускаться ТОЛЬКО при реальном изменении —
     иначе число дёргается на каждой плановой перерисовке. */
  const fn = (appR.match(/function setValueAnimated\([\s\S]*?\n\}/) || [''])[0];
  const okGuard = /el\.textContent !== next/.test(fn) && /if \(!changed\) return;/.test(fn);
  if (!okGuard) failed++;
  console.log(`${okGuard ? '✓' : '✗'} 0.9.5 микроанимация только при реальном изменении`);

  /* Счётчики воды и ккал переведены на анимированную установку. */
  const okWired = /setValueAnimated\(\$\('#water-total'\)/.test(appR)
    && /setValueAnimated\(\$\('#food-total'\)/.test(appR);
  if (!okWired) failed++;
  console.log(`${okWired ? '✓' : '✗'} 0.9.5 счётчики воды и ккал дают отклик`);

  /* Классы анимаций описаны в CSS, а системный режим «уменьшить движение»
     обязан их гасить — глобальное правило уже есть, проверяем оба факта. */
  const okCss = /@keyframes value-bump/.test(cssR) && /@keyframes check-pop/.test(cssR)
    && /prefers-reduced-motion/.test(cssR);
  if (!okCss) failed++;
  console.log(`${okCss ? '✓' : '✗'} 0.9.5 анимации описаны и уважают «уменьшить движение»`);

  /* Галочка цели «пухнет» один раз — в момент достижения, а не постоянно. */
  const okOnce = /const wasReached =/.test(appR) && /if \(reached && !wasReached\)/.test(appR);
  if (!okOnce) failed++;
  console.log(`${okOnce ? '✓' : '✗'} 0.9.5 значок цели анимируется только в момент достижения`);
}

/* 0.9.6 — пункт 5 владельца: несколько оформлений виджета для сравнения.
   Классический строчный виджет остаётся нетронутым, рядом появляются
   «рисованные» варианты. Проверяем сцепку четырёх частей: исходники
   копируются в сборку, ресиверы объявлены в манифесте, каждому выдан свой
   appwidget-info, и все R.id из Java существуют в генерируемой разметке. */
{
  const bundle = readBuildBundle();
  const yml = fs.readFileSync('tools/github-workflows/build.yml', 'utf8');
  const appW = fs.readFileSync('app.js', 'utf8');

  const variants = [
    'FitFlowWidgetRingProvider',
    'FitFlowWidgetRingsProvider',
    'FitFlowWidgetDialProvider',
    'FitFlowWidgetTilesProvider'
  ];

  /* Файлы вариантов реально лежат в репозитории. */
  const okFiles = variants.every((v) => fs.existsSync('android-native/' + v + '.java'))
    && fs.existsSync('android-native/FitFlowWidgetCanvasProvider.java')
    && fs.existsSync('android-native/FitFlowWidgetData.java')
    && fs.existsSync('android-native/FitFlowWidgetDraw.java');
  if (!okFiles) failed++;
  console.log(`${okFiles ? '✓' : '✗'} 0.9.6 исходники вариантов виджета на месте`);

  /* Шаг копирования должен забирать КАЖДЫЙ файл из android-native/ — иначе
     манифест сошлётся на несуществующий класс и сборка упадёт на «Build APK».
     0.9.13 (переписано): раньше здесь требовалось поимённое перечисление, но
     именно оно и роняло сборку — про новый класс забывали. Теперь копирование
     идёт циклом по маске, поэтому проверяем покрытие: файл считается
     скопированным, если он попадает либо под маску, либо в явный список. */
  const copyStep = (yml.match(/Копировать нативные исходники[\s\S]{0,1800}/) || [''])[0];
  const hasGlob = /for f in android-native\/\*\.java android-native\/\*\.kt/.test(copyStep);
  const nativeFiles = fs.readdirSync('android-native')
    .filter((f) => f.endsWith('.java') || f.endsWith('.kt'));
  const okCopy = nativeFiles.length > 0
    && nativeFiles.every((f) => (hasGlob && (f.endsWith('.java') || f.endsWith('.kt')))
      || copyStep.includes(f));
  if (!okCopy) failed++;
  console.log(`${okCopy ? '✓' : '✗'} 0.9.6 все нативные исходники копируются в сборку`);

  /* Каждый вариант объявлен ресивером и получил собственный appwidget-info. */
  const infos = ['fitflow_widget_ring_info', 'fitflow_widget_rings_info',
                 'fitflow_widget_dial_info', 'fitflow_widget_tiles_info'];
  const okManifest = variants.every((v) => yml.includes(`'${v}'`))
    && infos.every((i) => yml.includes(i));
  if (!okManifest) failed++;
  console.log(`${okManifest ? '✓' : '✗'} 0.9.6 каждому варианту свой ресивер и appwidget-info`);

  /* Разметка «рисованного» виджета генерируется и содержит все нужные id. */
  const canvasIds = ['widget_canvas_root', 'widget_canvas_image',
                     'widget_canvas_water_btn', 'widget_canvas_record_btn', 'widget_canvas_refresh_btn'];
  const okLayout = yml.includes('fitflow_widget_canvas.xml')
    && canvasIds.every((id) => yml.includes('@+id/' + id));
  if (!okLayout) failed++;
  console.log(`${okLayout ? '✓' : '✗'} 0.9.6 разметка рисованного виджета описана`);

  /* Все R.id/R.layout, которые Java просит у ресурсов, должны существовать
     в генерируемой разметке. Именно это ломает сборку в первую очередь. */
  const declaredIds = new Set((yml.match(/@\+id\/([A-Za-z0-9_]+)/g) || [])
    .map((m) => m.replace('@+id/', '')));
  /* Слоты классического виджета генерируются шаблоном ('widget_slot_%d'),
     поэтому в тексте workflow буквальных widget_slot_1..10 нет. Разворачиваем
     шаблоны в конкретные номера — до 10 слотов большой раскладки. */
  (yml.match(/@\+id\/([A-Za-z0-9_]*)%d([A-Za-z0-9_]*)/g) || []).forEach((m) => {
    const tpl = m.replace('@+id/', '');
    for (let i = 1; i <= 10; i++) declaredIds.add(tpl.replace('%d', String(i)));
  });
  const declaredLayouts = new Set((yml.match(/'(fitflow_widget[a-z_]*)\.xml'/g) || [])
    .map((m) => m.replace(/'/g, '').replace('.xml', '')));
  let usedIds = new Set();
  let usedLayouts = new Set();
  for (const f of fs.readdirSync('android-native').filter((f) => f.endsWith('.java'))) {
    const t = fs.readFileSync('android-native/' + f, 'utf8');
    (t.match(/R\.id\.([A-Za-z0-9_]+)/g) || []).forEach((m) => usedIds.add(m.slice(5)));
    (t.match(/R\.layout\.([A-Za-z0-9_]+)/g) || []).forEach((m) => usedLayouts.add(m.slice(9)));
  }
  const missingIds = [...usedIds].filter((id) => !declaredIds.has(id));
  const missingLayouts = [...usedLayouts].filter((l) => !declaredLayouts.has(l));
  const okRefs = usedIds.size > 20 && missingIds.length === 0 && missingLayouts.length === 0;
  if (!okRefs) failed++;
  console.log(`${okRefs ? '✓' : '✗'} 0.9.6 все R.id и R.layout существуют в разметке`
    + (missingIds.length ? ` (нет id: ${missingIds.join(', ')})` : '')
    + (missingLayouts.length ? ` (нет layout: ${missingLayouts.join(', ')})` : ''));

  /* Обновление данных доходит до новых виджетов: единая точка updateAll
     перерисовывает и «рисованные» варианты. */
  const okUpdate = bundle.includes('FitFlowWidgetCanvasProvider.updateAllCanvas(context);')
    && /static void updateAllCanvas\(Context context\)/.test(bundle);
  if (!okUpdate) failed++;
  console.log(`${okUpdate ? '✓' : '✗'} 0.9.6 новые виджеты обновляются из общей точки`);

  /* Кольцам и дугам нужны цели, иначе процент не из чего считать:
     JS шлёт их, MainActivity кладёт в prefs, класс данных читает. */
  const okGoals = /stepsGoal: \(state\.healthSync/.test(appW)
    && /activityGoal: Math\.max\(1,/.test(appW)
    && bundle.includes('.putInt("stepsGoal"')
    && bundle.includes('.putInt("activityGoal"');
  if (!okGoals) failed++;
  console.log(`${okGoals ? '✓' : '✗'} 0.9.6 цели шагов и активности доходят до виджета`);

  /* Картинка рисуется без области кнопок — иначе содержимое уезжает под них. */
  const okRoom = /BUTTON_ROW_DP/.test(bundle)
    && /maxHeightDp - BUTTON_ROW_DP/.test(bundle);
  if (!okRoom) failed++;
  console.log(`${okRoom ? '✓' : '✗'} 0.9.6 картинка не залезает под кнопки`);

  /* Классический виджет не тронут: его разметка и слоты на месте. */
  const okLegacy = yml.includes('widget_layout_xml(5,') && yml.includes('widget_layout_xml(10,')
    && bundle.includes('R.layout.fitflow_widget_large');
  if (!okLegacy) failed++;
  console.log(`${okLegacy ? '✓' : '✗'} 0.9.6 классический виджет остался прежним`);
}

/* 0.9.7 — замечания владельца: сканер пишет съеденное сразу в питание,
   а тип приёма пищи можно поменять у уже записанной строки. */
{
  const api = require('./app.js');

  /* Вес порции: пример владельца — йогурт 130 г должен считаться за 130 г,
     а не за дефолтные 100 г. Плюс совместимость с кэшем до 0.9.7 (packG
     там нет, вес лежит в pieceG) и отсев мусорных значений. */
  const okGrams = api.scannedPortionGrams({ packG: 130 }) === 130
    && api.scannedPortionGrams({ pieceG: 200 }) === 200
    && api.scannedPortionGrams({}) === 100
    && api.scannedPortionGrams({ packG: 5000 }) === 100
    && api.scannedPortionGrams(null) === 100;
  if (!okGrams) failed++;
  console.log(`${okGrams ? '✓' : '✗'} 0.9.7 порция берётся из веса упаковки (йогурт 130 г → 130 г)`);

  /* Вес упаковки больше не подменяет «вес 1 шт»: иначе пачка печенья 400 г
     превратила бы «2 шт» в 800 г. */
  const off = api.parseOffProduct({ status: 1, product: { product_name: 'Печенье', product_quantity: '400',
    nutriments: { 'energy-kcal_100g': 450 } } });
  const okSplit = off && off.packG === 400 && off.pieceG === null;
  if (!okSplit) failed++;
  console.log(`${okSplit ? '✓' : '✗'} 0.9.7 вес упаковки не попадает в «вес 1 шт»`);

  /* Кнопка есть в разметке, скрыта по умолчанию (правило «никаких видимых
     заглушек») и привязана к обработчику. */
  const okBtn = /id="custom-food-eat"[^>]*hidden/.test(html)
    && app.includes("bindEvent('#custom-food-eat', 'click', eatScannedProduct)")
    && app.includes('function eatScannedProduct');
  if (!okBtn) failed++;
  console.log(`${okBtn ? '✓' : '✗'} 0.9.7 кнопка «Съел это» скрыта до сканирования и подключена`);

  /* Цифры считаются заранее и пишутся на самой кнопке — ни полей, ни выбора. */
  const okLabel = app.includes("'🍽 Съел это · ' + fmt(grams) + ' г, ' + fmt(kcal) + ' ккал'")
    && app.includes('showScannedEatButton(result.product)');
  if (!okLabel) failed++;
  console.log(`${okLabel ? '✓' : '✗'} 0.9.7 на кнопке уже посчитаны граммы и калории`);

  /* Запись идёт в дневник питания с текущим приёмом пищи, и справочник
     «Мои продукты» при этом не пополняется (разовые покупки не копятся). */
  const eatFn = app.slice(app.indexOf('function eatScannedProduct'));
  const eatBody = eatFn.slice(0, eatFn.indexOf('\n}'));
  const okWrite = eatBody.includes('state.food.items.push')
    && eatBody.includes('applySelectedMealType')
    && eatBody.includes('saveState()')
    && !eatBody.includes('addCustomFood');
  if (!okWrite) failed++;
  console.log(`${okWrite ? '✓' : '✗'} 0.9.7 съеденное идёт в питание, а не в «Мои продукты»`);

  /* Смена типа приёма пищи у существующей записи: поле в диалоге,
     заполнение при открытии и сохранение обоих полей (id + метка). */
  const okMealUi = /id="food-edit-meal"/.test(html)
    && app.includes("const mealSelect = $('#food-edit-meal')");
  const saveFn = app.slice(app.indexOf('function saveFoodEdit'));
  const saveBody = saveFn.slice(0, saveFn.indexOf('\n}'));
  const okMealSave = saveBody.includes('item.mealTypeId') && saveBody.includes('item.mealTypeLabel');
  if (!okMealUi || !okMealSave) failed++;
  console.log(`${okMealUi && okMealSave ? '✓' : '✗'} 0.9.7 тип приёма пищи меняется у записанной строки`);
}

/* 0.9.8 — дефект владельца: «при скролле главного экрана подсветка быстрого
   доступа прыгает между „Шаги“ и „День“ несколько раз, с „Самочувствие“ и
   „Вода“ то же самое».

   Текстовых проверок тут мало: дефект геометрический. Поэтому исполняем
   настоящий алгоритм выбора активного раздела на смоделированной раскладке
   Главной (карточки разной высоты + зазор между ними, как в CSS gap 10–16px)
   и прокручиваем страницу пиксель за пикселем. */
{
  const appR = fs.readFileSync('app.js', 'utf8');

  // Берём тело реальной функции и подставляем свои DOM/окно — так тест
  // проверяет фактический код, а не его копию.
  const fnSrc = (appR.match(/function updateHomeQuickNavActive\(\)[\s\S]*?\n\}/) || [''])[0];
  const okExtract = fnSrc.length > 500;
  if (!okExtract) failed++;
  console.log(`${okExtract ? '✓' : '✗'} 0.9.8 тело updateHomeQuickNavActive извлечено для прогона`);

  // Раскладка: низкая карточка рядом с высокой — именно та пара, на которой
  // «максимум площади» давал прыжок («Шаги» 120px рядом с «День» 380px).
  const layout = [
    { id: 'steps-card', h: 120 }, { id: 'day-plan-card', h: 380 },
    { id: 'day-mood-card', h: 90 }, { id: 'water-card', h: 200 },
    { id: 'food-card', h: 400 }
  ];
  const GAP = 16, TOPBAR = 72, NAVH = 44, WINH = 800;
  const viewTop = TOPBAR + NAVH;
  let y = 0;
  const geom = layout.map((c) => { const o = { id: c.id, top: y, bottom: y + c.h }; y += c.h + GAP; return o; });
  const pageH = y + 400;

  let scrollTop = 0;
  const active = [];
  const chips = layout.map((c) => ({
    dataset: { jump: c.id },
    classList: { toggle: (cls, on) => { if (cls === 'active' && on) active.push(c.id); } }
  }));
  const cardEls = geom.map((g) => ({
    id: g.id, hidden: false,
    getBoundingClientRect: () => ({ top: g.top - scrollTop, bottom: g.bottom - scrollTop })
  }));
  const sandbox = {
    document: {
      documentElement: { scrollTop: 0, clientHeight: WINH, scrollHeight: pageH },
      querySelector: (sel) => (sel === '.topbar' ? { offsetHeight: TOPBAR } : null)
    },
    window: { get scrollY() { return scrollTop; }, innerHeight: WINH },
    $: (sel) => {
      if (sel === '#home-quicknav') return { hidden: false, offsetHeight: NAVH, querySelectorAll: () => chips };
      if (sel === '#home-view') return { hidden: false };
      if (sel === '#home-cards') return { children: cardEls };
      return null;
    }
  };
  let run = null;
  try {
    run = new Function('document', 'window', '$', 'quicknavStuckBottom',
      fnSrc + '; return updateHomeQuickNavActive;')(
      sandbox.document, sandbox.window, sandbox.$,
      () => TOPBAR + NAVH);
  } catch (e) { run = null; }

  if (!run) {
    failed++;
    console.log('✗ 0.9.8 алгоритм подсветки не удалось выполнить в песочнице');
  } else {
    const seq = [];
    for (let sc = 0; sc <= pageH - WINH; sc += 2) {
      scrollTop = sc;
      active.length = 0;
      run();
      const cur = active[0] || null;
      if (!seq.length || seq[seq.length - 1].id !== cur) seq.push({ id: cur, at: sc });
    }
    const order = layout.map((c) => c.id);

    /* Главное требование: при прокрутке вниз подсветка идёт строго по порядку
       разделов и никогда не возвращается назад. Любой откат — это и есть
       «прыгает несколько раз». */
    let back = null, maxIdx = -1;
    for (const st of seq) {
      const i = order.indexOf(st.id);
      if (i < maxIdx && !back) back = st;
      maxIdx = Math.max(maxIdx, i);
    }
    if (back) failed++;
    console.log(`${!back ? '✓' : '✗'} 0.9.8 подсветка не прыгает назад при прокрутке вниз`
      + (back ? ` (откат на «${back.id}» при scrollTop=${back.at})` : ''));

    // Каждый раздел получает подсветку ровно один раз — без «туда-обратно».
    const visits = {};
    seq.forEach((st) => { visits[st.id] = (visits[st.id] || 0) + 1; });
    const repeated = Object.entries(visits).filter(([, n]) => n > 1);
    if (repeated.length) failed++;
    console.log(`${!repeated.length ? '✓' : '✗'} 0.9.8 каждый раздел подсвечивается один раз`
      + (repeated.length ? ` (повторы: ${repeated.map(([k, n]) => `${k}×${n}`).join(', ')})` : ''));

    // Ни один включённый раздел не пропущен: до каждого можно доскроллить.
    const missed = order.filter((id) => !visits[id]);
    if (missed.length) failed++;
    console.log(`${!missed.length ? '✓' : '✗'} 0.9.8 ни один раздел не пропущен при прокрутке`
      + (missed.length ? ` (пропущены: ${missed.join(', ')})` : ''));

    // Края: наверху — первый раздел, внизу — последний.
    scrollTop = 0; active.length = 0; run();
    const topOk = active[0] === order[0];
    scrollTop = pageH - WINH; active.length = 0; run();
    const botOk = active[0] === order[order.length - 1];
    if (!topOk || !botOk) failed++;
    console.log(`${topOk && botOk ? '✓' : '✗'} 0.9.8 наверху активен первый раздел, внизу — последний`);
  }
}

/* ============================================================
   0.9.9: «План тренировок» — путь создания шаблона и отметка
   выполнения. Замечание владельца: «не смог найти, как создать
   шаблон». Проверяем не текст подсказки, а наличие рабочего
   пути и устойчивость галочки к переименованию.
   ============================================================ */
{
  const appPlanSrc = fs.readFileSync('app.js', 'utf8');

  // 1. В пустом плане есть кнопка создания, и у неё есть обработчик.
  const planFn = appPlanSrc.slice(appPlanSrc.indexOf('function renderStrengthPlan()'));
  const planEmpty = planFn.slice(0, planFn.indexOf('// «Сегодня по плану»'));
  const hasCreateBtn = /data-s-plan-create/.test(planEmpty);
  if (!hasCreateBtn) failed++;
  console.log(`${hasCreateBtn ? '✓' : '✗'} 0.9.9 в пустом плане есть кнопка «Создать шаблон»`);

  const hasHandler = /\[data-s-plan-create\]/.test(appPlanSrc)
    && /function openStrengthTemplateCreation\(\)/.test(appPlanSrc);
  if (!hasHandler) failed++;
  console.log(`${hasHandler ? '✓' : '✗'} 0.9.9 кнопка создания шаблона привязана к обработчику`);

  // 2. Обработчик реально раскрывает дневник силовых и ставит фокус в название.
  const openFn = appPlanSrc.slice(appPlanSrc.indexOf('function openStrengthTemplateCreation()'));
  const openBody = openFn.slice(0, openFn.indexOf('\n}\n'));
  const opensDiary = /strength-diary-content/.test(openBody)
    && /setCollapsibleState\(toggle, content, true\)/.test(openBody)
    && /data-s-title/.test(openBody);
  if (!opensDiary) failed++;
  console.log(`${opensDiary ? '✓' : '✗'} 0.9.9 создание шаблона открывает дневник и ставит курсор в «Название»`);

  // 3. Поле названия не подписано «необязательно» — сохранение шаблона его требует.
  const saysOptional = /Название \(необязательно\)/.test(appPlanSrc);
  if (saysOptional) failed++;
  console.log(`${!saysOptional ? '✓' : '✗'} 0.9.9 подпись поля «Название» не противоречит проверке при сохранении`);

  // 4. Поведение isPlanDoneToday: галочка переживает переименование тренировки.
  const doneSrc = appPlanSrc.slice(appPlanSrc.indexOf('function isPlanDoneToday('));
  const doneBody = doneSrc.slice(0, doneSrc.indexOf('\n}\n') + 2);
  const TODAY = '2026-08-24';
  const mkState = (sessions) => ({
    strengthTemplates: [{ id: 'tpl-1', name: 'День ног', exercises: [] }],
    strengthSessions: sessions
  });
  const callDone = (st) => {
    const fn = new Function('state', 'todayKey', doneBody + '; return isPlanDoneToday;')(st, () => TODAY);
    return fn('tpl-1');
  };

  // 4a. Тренировка начата из шаблона и переименована — план всё равно засчитан.
  const renamed = callDone(mkState([
    { date: TODAY, title: 'Ноги + пресс (добавил упражнения)', templateId: 'tpl-1' }
  ]));
  if (!renamed) failed++;
  console.log(`${renamed ? '✓' : '✗'} 0.9.9 переименованная тренировка по шаблону отмечается выполненной`);

  // 4b. Старая запись (до 0.9.9, без templateId) — засчитывается по имени.
  const legacy = callDone(mkState([{ date: TODAY, title: 'День ног' }]));
  if (!legacy) failed++;
  console.log(`${legacy ? '✓' : '✗'} 0.9.9 записи прежних версий по-прежнему засчитываются по названию`);

  // 4c. Чужая тренировка того же дня не засчитывается за шаблон.
  const other = callDone(mkState([
    { date: TODAY, title: 'Плавание', templateId: 'tpl-2' }
  ]));
  if (other) failed++;
  console.log(`${!other ? '✓' : '✗'} 0.9.9 посторонняя тренировка не отмечает план выполненным`);
}

/* ============================================================
   0.9.10: двойной учёт тренировок. Владелец отверг критерий
   «совпадение длительности ±15 мин» — две тренировки в день
   одной длины обычны. Сверяем пересечение интервалов времени.
   ============================================================ */
{
  const api = require('./app.js');
  const appDupSrc = fs.readFileSync('app.js', 'utf8');
  const D = '2026-08-23';
  const at = (h, mi) => new Date(`${D}T${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}:00`).getTime();
  const hasApi = typeof api.classifyWatchWorkout === 'function';
  if (!hasApi) failed++;
  console.log(`${hasApi ? '✓' : '✗'} 0.9.10 сопоставление тренировок по времени доступно для прогона`);
  // Если функции нет — не роняем весь прогон, а помечаем проверки проваленными.
  const verdict = (session, workouts) => (hasApi
    ? api.classifyWatchWorkout(session, workouts, {}).verdict
    : 'НЕТ ФУНКЦИИ');
  const check = (name, got, want) => {
    const ok = got === want;
    if (!ok) failed++;
    console.log(`${ok ? '✓' : '✗'} 0.9.10 ${name}${ok ? '' : ` (получили «${got}», ждали «${want}»)`}`);
  };

  // Жалоба владельца: силовая записана сразу, часы прислали её же.
  check('силовая из дневника и она же с часов не задваиваются',
    verdict({ recordId: 'w1', date: D, type: 'other', title: 'Workout', minutes: 58, start: at(18, 2), end: at(19, 0) },
      [{ id: 'a', date: D, type: 'strength', durationMinutes: 60, createdAt: at(19, 5) }]), 'duplicate');

  // Отвергнутый критерий: одинаковая длительность ≠ дубль.
  check('утренняя и вечерняя одной длины считаются разными',
    verdict({ recordId: 'w2', date: D, type: 'other', minutes: 60, start: at(19, 0), end: at(20, 0) },
      [{ id: 'a', date: D, type: 'strength', durationMinutes: 60, createdAt: at(8, 5) }]), 'unique');

  check('две тренировки подряд одной длины не схлопываются',
    verdict({ recordId: 'w3', date: D, type: 'other', minutes: 45, start: at(19, 10), end: at(19, 55) },
      [{ id: 'a', date: D, type: 'strength', durationMinutes: 45, createdAt: at(19, 5) }]), 'unique');

  // Вопрос владельца: тренировка была утром, записали вечером.
  check('запись задним числом не добавляется молча, а спрашивает',
    verdict({ recordId: 'w4', date: D, type: 'other', minutes: 60, start: at(8, 0), end: at(9, 0) },
      [{ id: 'a', date: D, type: 'strength', durationMinutes: 60, createdAt: at(22, 30) }]), 'unsure');

  // «Тренировки» из ходьбы остаются (решение владельца — keep).
  check('длинная прогулка с часов не считается дублем короткой силовой',
    verdict({ recordId: 'w5', date: D, type: 'walk', minutes: 180, start: at(10, 0), end: at(13, 0) },
      [{ id: 'a', date: D, type: 'strength', durationMinutes: 40, createdAt: at(20, 0) }]), 'unique');

  check('силовая внутри длинной сессии часов — дубль',
    verdict({ recordId: 'w6', date: D, type: 'other', minutes: 180, start: at(17, 0), end: at(20, 0) },
      [{ id: 'a', date: D, type: 'strength', durationMinutes: 40, createdAt: at(18, 40) }]), 'duplicate');

  check('повторный синк уже импортированной сессии не добавляет её снова',
    verdict({ recordId: 'w7', date: D, type: 'other', minutes: 60, start: at(18, 0), end: at(19, 0) },
      [{ id: 'a', date: D, type: 'strength', durationMinutes: 60, createdAt: at(19, 2), watchRecordId: 'w7' }]), 'duplicate');

  check('одинаковая тренировка в другой день остаётся своей',
    verdict({ recordId: 'w8', date: D, type: 'other', minutes: 60, start: at(18, 0), end: at(19, 0) },
      [{ id: 'a', date: '2026-08-22', type: 'strength', durationMinutes: 60, createdAt: at(19, 2) }]), 'unique');

  // Сквозной счёт минут — та самая «118 вместо 60».
  const workouts = [{ id: 'a', date: D, type: 'strength', durationMinutes: 60, createdAt: at(19, 5) }];
  const session = { recordId: 'w1', date: D, type: 'other', minutes: 58, start: at(18, 2), end: at(19, 0) };
  if (verdict(session, workouts) === 'unique') workouts.push({ id: 'b', date: D, type: 'strength', durationMinutes: 58, createdAt: Date.now() });
  const totalMin = workouts.reduce((n, w) => n + w.durationMinutes, 0);
  // hasApi в условии: без функции сверки тест не должен «проходить» вхолостую.
  const minutesOk = hasApi && totalMin === 60;
  if (!minutesOk) failed++;
  console.log(`${minutesOk ? '✓' : '✗'} 0.9.10 недельная цель считает 60 мин, а не 118${minutesOk ? '' : ` (вышло ${totalMin})`}`);

  // Health Connect не должен возвращать наш собственный экспорт.
  const hc = fs.readFileSync('android-native/HealthConnectHelper.kt', 'utf8');
  const readFn = hc.slice(hc.indexOf('fun readTodayWorkouts'));
  const body = readFn.slice(0, readFn.indexOf('private fun mapExerciseType'));
  const selfFiltered = /context\.packageName/.test(body) && /dataOrigin\?\.packageName/.test(body);
  if (!selfFiltered) failed++;
  console.log(`${selfFiltered ? '✓' : '✗'} 0.9.10 собственный экспорт не читается обратно как «с часов»`);

  // Нормализация не должна терять связь записи с сессией часов.
  const normFn = appDupSrc.slice(appDupSrc.indexOf('function normalizeWorkouts()'));
  const normBody = normFn.slice(0, normFn.indexOf('\n}\n'));
  const keepsLink = /watchRecordId:/.test(normBody) && /watchStart:/.test(normBody);
  if (!keepsLink) failed++;
  console.log(`${keepsLink ? '✓' : '✗'} 0.9.10 связь записи с сессией часов переживает нормализацию`);
}


/* 0.9.11: пропущенные дни (шаги и сон) должны восстанавливаться задним числом.
   Симптом владельца: 20 и 21 августа шаги и сон не записались, хотя часы носились. */
{
  const api = require('./app.js');
  const hasSteps = typeof api.mergeStepsBackfill === 'function';
  const hasSleep = typeof api.mergeSleepBackfill === 'function';
  const T = '2026-08-24';

  // Шаги: частичный утренний снимок не должен блокировать итог дня из Health Connect.
  let stepsFixed = false;
  if (hasSteps) {
    const r = api.mergeStepsBackfill([{ date: '2026-08-20', steps: 480, source: 'часы' }],
                                     [{ date: '2026-08-20', steps: 11200 }], T);
    const day = r.find((e) => e.date === '2026-08-20');
    stepsFixed = !!day && day.steps === 11200;
  }
  if (!stepsFixed) failed++;
  console.log(`${stepsFixed ? '✓' : '✗'} 0.9.11 частичный снимок шагов перезаписывается итогом из Health Connect`);

  // Но пустой ответ HC не должен стирать уже собранные шаги.
  let stepsKept = false;
  if (hasSteps) {
    const r = api.mergeStepsBackfill([{ date: '2026-08-20', steps: 11200, source: 'часы' }],
                                     [{ date: '2026-08-20', steps: 0 }], T);
    const day = r.find((e) => e.date === '2026-08-20');
    stepsKept = !!day && day.steps === 11200;
  }
  if (!stepsKept) failed++;
  console.log(`${stepsKept ? '✓' : '✗'} 0.9.11 «нет записи в HC» не обнуляет шаги за день`);

  // Сон: пропущенные ночи восстанавливаются.
  let sleepFixed = false;
  if (hasSleep) {
    const res = api.mergeSleepBackfill({}, [
      { date: '2026-08-20', minutes: 430, bedTime: '23:40', wakeTime: '06:50' },
      { date: '2026-08-21', minutes: 395, bedTime: '00:10', wakeTime: '06:45' }
    ], T);
    sleepFixed = res.added === 2 && res.history['2026-08-20'].durationMinutes === 430
      && res.history['2026-08-21'].wakeTime === '06:45';
  }
  if (!sleepFixed) failed++;
  console.log(`${sleepFixed ? '✓' : '✗'} 0.9.11 пропущенные ночи сна дозаливаются из Health Connect`);

  // Ручной чек-ин важнее показаний часов.
  let manualKept = false;
  if (hasSleep) {
    const res = api.mergeSleepBackfill(
      { '2026-08-20': { date: '2026-08-20', durationMinutes: 400, source: 'Чек-ин', rating: 5 } },
      [{ date: '2026-08-20', minutes: 430 }], T);
    manualKept = res.history['2026-08-20'].durationMinutes === 400 && res.added === 0 && res.updated === 0;
  }
  if (!manualKept) failed++;
  console.log(`${manualKept ? '✓' : '✗'} 0.9.11 ручной чек-ин сна не перезаписывается часами`);

  // Нативная сторона: шаги через полночь делятся между сутками, сон читается за период.
  const hcSrc = fs.readFileSync('android-native/HealthConnectHelper.kt', 'utf8');
  const splitsMidnight = /0\.9\.11/.test(hcSrc) && /endDate/.test(hcSrc) && /rec\.endTime\.atZone/.test(hcSrc);
  if (!splitsMidnight) failed++;
  console.log(`${splitsMidnight ? '✓' : '✗'} 0.9.11 шаги через полночь не уходят целиком во вчера`);

  const maSrc = fs.readFileSync('android-native/MainActivity.java', 'utf8');
  const hasSleepReader = /fun readSleepHistory/.test(hcSrc) && /void syncHealthSleepHistory\(\)/.test(maSrc);
  if (!hasSleepReader) failed++;
  console.log(`${hasSleepReader ? '✓' : '✗'} 0.9.11 нативный мост умеет отдавать историю сна`);

  // 0.9.12: чтение истории обязано быть постраничным. readRecords отдаёт до 1000
  // записей за страницу; за 30 дней часы пишут шаги мелкими кусками, и без цикла
  // свежие дни не доезжают — ровно этот баг оставил 20-21 августа без шагов.
  const stepsHistFn = hcSrc.slice(hcSrc.indexOf('fun readStepsHistory'));
  const stepsHistBody = stepsHistFn.slice(0, stepsHistFn.indexOf('\n    }\n'));
  const stepsPaged = /pageToken/.test(stepsHistBody) && /while \(pageToken != null\)/.test(stepsHistBody);
  if (!stepsPaged) failed++;
  console.log(`${stepsPaged ? '✓' : '✗'} 0.9.12 история шагов читается постранично (иначе свежие дни теряются)`);

  const sleepHistFn = hcSrc.slice(hcSrc.indexOf('fun readSleepHistory'));
  const sleepHistBody = sleepHistFn.slice(0, sleepHistFn.indexOf('\n    }\n'));
  const sleepPaged = /pageToken/.test(sleepHistBody) && /while \(pageToken != null\)/.test(sleepHistBody);
  if (!sleepPaged) failed++;
  console.log(`${sleepPaged ? '✓' : '✗'} 0.9.12 история сна читается постранично`);

  // Цепочка должна быть замкнута: Kotlin → Java → window.<колбэк> → JS-функция.
  // Без публикации на window нативный вызов молча уходит в никуда.
  const appSrc = fs.readFileSync('app.js', 'utf8');
  const cbName = (maSrc.match(/window\.(onHealthSleepHistoryReceived)/) || [])[1];
  const chainOk = !!cbName
    && new RegExp('window\\.' + cbName + '\\s*=').test(appSrc)
    && /window\.FitFlowExport\.syncHealthSleepHistory\(\)/.test(appSrc)
    && /requestSleepHistorySync\(\);/.test(appSrc);
  if (!chainOk) failed++;
  console.log(`${chainOk ? '✓' : '✗'} 0.9.11 история сна: цепочка Kotlin → Java → window → JS замкнута`);
}

/* ============================================================
   0.9.12: журнал силовых — быстрый ввод, отмена, таймер отдыха
   ============================================================ */
{
  const appS = fs.readFileSync('app.js', 'utf8');
  const htmlS = fs.readFileSync('index.html', 'utf8');
  const api = require('./app.js');
  // Guard: на откате функций ещё нет в module.exports, и без заглушек прогон
  // упал бы аварийно, вместо того чтобы честно показать «✗».
  const hasApi = typeof api.parseQuickSets === 'function'
    && typeof api.parseRestInput === 'function'
    && typeof api.formatRestSeconds === 'function';
  const noop = () => null;

  // --- Быстрый ввод «подходы × повторения × вес» ---
  // Владелец: «5 подходов по 10 повторений с 12 кг» не должно стоить 10 нажатий.
  const qs = hasApi ? api.parseQuickSets : noop;
  const quickCases = [
    ['5x10x12', { sets: 5, reps: 10, weight: 12 }],
    ['5х10х12', { sets: 5, reps: 10, weight: 12 }], // кириллическая «х» — её и набирают
    ['5 10 12', { sets: 5, reps: 10, weight: 12 }],
    ['5*10*12', { sets: 5, reps: 10, weight: 12 }],
    ['3x8', { sets: 3, reps: 8, weight: 0 }],       // без веса — отжимания
    ['12', { sets: 1, reps: 12, weight: 0 }]
  ];
  const quickOk = hasApi && quickCases.every(([input, want]) => {
    const got = qs(input);
    return got && got.sets === want.sets && got.reps === want.reps && got.weight === want.weight;
  });
  if (!quickOk) failed++;
  console.log(`${quickOk ? '✓' : '✗'} 0.9.12 быстрый ввод подходов понимает 5x10x12 / 5х10х12 / 5 10 12 / 3x8`);

  // Мусор и выходы за границы не должны создавать подходы молча.
  const quickBad = hasApi && ['', 'abc', '0x10', '41x10', '5x10x600'].every((t) => qs(t) === null);
  if (!quickBad) failed++;
  console.log(`${quickBad ? '✓' : '✗'} 0.9.12 быстрый ввод отбраковывает мусор и выход за пределы`);

  // Дробный вес (12.5 кг блин) должен проходить — иначе половинки не записать.
  const half = qs('4x8x12,5');
  const halfOk = !!half && half.weight === 12.5 && half.sets === 4;
  if (!halfOk) failed++;
  console.log(`${halfOk ? '✓' : '✗'} 0.9.12 быстрый ввод принимает дробный вес (12,5 кг)`);

  // Поле быстрого ввода и его обработчики должны существовать в разметке дневника.
  const quickUi = /data-s-quick="\$\{idx\}"/.test(appS)
    && /data-s-quick-apply="\$\{idx\}"/.test(appS)
    && /closest\('\[data-s-quick-apply\]'\)/.test(appS)
    && /applyQuickSetsFromInput/.test(appS);
  if (!quickUi) failed++;
  console.log(`${quickUi ? '✓' : '✗'} 0.9.12 поле быстрого ввода отрисовано и подключено к обработчику`);

  // --- Термины: «повторы» ≠ «повторения» ---
  // Владелец отдельно указал, что это разные вещи; в подходе — повторения.
  const diaryStart = appS.indexOf('function renderStrengthDiary');
  const diarySrc = appS.slice(diaryStart, appS.indexOf('\nfunction saveStrengthSession', diaryStart));
  const termsOk = /placeholder="Повторения"/.test(diarySrc) && !/placeholder="Повторы"/.test(diarySrc);
  if (!termsOk) failed++;
  console.log(`${termsOk ? '✓' : '✗'} 0.9.12 поле подхода называется «Повторения», а не «Повторы»`);

  // --- Отмена заполнения ---
  const cancelOk = /function cancelStrengthDraft/.test(appS)
    && /function resetStrengthDraft/.test(appS)
    && /data-s-cancel/.test(appS)
    && /closest\('\[data-s-cancel\]'\)/.test(appS);
  if (!cancelOk) failed++;
  console.log(`${cancelOk ? '✓' : '✗'} 0.9.12 отмена заполнения силовой есть в разметке и в обработчике`);

  // Сохранение обязано чистить черновик тем же путём, что и отмена, —
  // иначе два способа разъедутся при следующей правке.
  const saveStart = appS.indexOf('function saveStrengthSession');
  const saveSrc = appS.slice(saveStart, saveStart + 4000);
  const saveResets = /resetStrengthDraft\(\);/.test(saveSrc);
  if (!saveResets) failed++;
  console.log(`${saveResets ? '✓' : '✗'} 0.9.12 сохранение силовой сбрасывает черновик общей функцией`);

  // --- Таймер отдыха ---
  // Пресеты больше не должны быть прибиты в HTML: нужны свои значения (3 мин).
  const htmlHardcoded = /data-rest="(30|60|90|120)"/.test(htmlS);
  if (htmlHardcoded) failed++;
  console.log(`${!htmlHardcoded ? '✓' : '✗'} 0.9.12 пресеты отдыха не захардкожены в index.html`);

  const restState = /strengthRest: \{ seconds: 90, presets: \[60, 90, 120, 180\] \}/.test(appS)
    && /function normalizeStrengthRest/.test(appS)
    && /function addStrengthRestPreset/.test(appS)
    && /function removeStrengthRestPreset/.test(appS);
  if (!restState) failed++;
  console.log(`${restState ? '✓' : '✗'} 0.9.12 пресеты отдыха живут в состоянии (есть и 3 минуты по умолчанию)`);

  // Ввод своего времени: «3 мин», «2:30», «180».
  const ri = hasApi ? api.parseRestInput : noop;
  const restParse = hasApi && ri('3 мин') === 180 && ri('2:30') === 150 && ri('180') === 180 && ri('abc') === null;
  if (!restParse) failed++;
  console.log(`${restParse ? '✓' : '✗'} 0.9.12 своё время отдыха понимает «3 мин», «2:30» и «180»`);

  const rf = hasApi ? api.formatRestSeconds : noop;
  const restFmt = hasApi && rf(45) === '45с' && rf(180) === '3 мин' && rf(90) === '1:30';
  if (!restFmt) failed++;
  console.log(`${restFmt ? '✓' : '✗'} 0.9.12 подпись пресета короткая: 45с / 1:30 / 3 мин`);

  // Удаление последнего пресета запрещено — иначе таймер нечем запускать.
  const restBody = appS.slice(appS.indexOf('function removeStrengthRestPreset'));
  const lastGuard = /reason: 'last'/.test(restBody.slice(0, 900));
  if (!lastGuard) failed++;
  console.log(`${lastGuard ? '✓' : '✗'} 0.9.12 последний пресет отдыха удалить нельзя`);

  // Кнопки рисуются из состояния и слушатель делегирован — иначе после
  // перерисовки пресеты перестали бы реагировать на нажатия.
  const restRender = /box\.innerHTML = rest\.presets/.test(appS)
    && /restBox\.addEventListener\('click'/.test(appS)
    && /data-rest-add/.test(appS);
  if (!restRender) failed++;
  console.log(`${restRender ? '✓' : '✗'} 0.9.12 пресеты перерисовываются из состояния, клик делегирован контейнеру`);
}

/* ============================================================
   0.9.13 «Витамины»: подтверждение приёма из шторки без открытия
   приложения и строка курса на виджете.
   Проверяем контракт JS↔натив: если одна сторона переименует ключ
   или отвалится мост, отметка молча потеряется — а на телефоне это
   выглядит как «нажал Принял, а ничего не записалось».
   ============================================================ */
{
  const api = require('./app.js');
  const appS = fs.readFileSync('app.js', 'utf8');
  const hasApi = typeof api.buildNativeCoursePlan === 'function'
    && typeof api.buildNativeCourseDone === 'function';
  if (!hasApi) failed++;
  console.log(`${hasApi ? '✓' : '✗'} 0.9.13 сборка плана курса для натива доступна для прогона`);

  // Планировщик обязан идти native-first: кнопки уведомлений Capacitor на
  // Android всегда открывают приложение, а владелец просил обратного.
  const schedStart = appS.indexOf('async function scheduleCourseReminders');
  const schedSrc = appS.slice(schedStart, appS.indexOf('\nasync function refreshCourseRemindersOnLaunch', schedStart));
  const nativeFirst = /scheduleCourseRemindersNative/.test(schedSrc)
    && schedSrc.indexOf('syncNativeCourseState') < schedSrc.indexOf('localNotifications.schedule');
  if (!nativeFirst) failed++;
  console.log(`${nativeFirst ? '✓' : '✗'} 0.9.13 напоминания курса планирует натив, JS остаётся запасным путём`);

  // План уезжает в натив ДО проверки разрешения: строка витаминов на виджете
  // не должна зависеть от того, разрешены ли уведомления.
  const beforePermission = schedSrc.indexOf('if (hasNative) syncNativeCourseState();')
    < schedSrc.indexOf('ensureNotificationPermission');
  if (!beforePermission) failed++;
  console.log(`${beforePermission ? '✓' : '✗'} 0.9.13 виджет получает курс независимо от разрешения на уведомления`);

  // Отметка в приложении обязана доехать в натив, иначе придёт напоминание
  // об уже принятом приёме, а виджет покажет старый счёт.
  const toggleStart = appS.indexOf('function toggleCourseDose');
  const toggleSrc = appS.slice(toggleStart, appS.indexOf('\n/* Строки курсов', toggleStart));
  const toggleSyncs = /syncNativeCourseState\(\)/.test(toggleSrc);
  if (!toggleSyncs) failed++;
  console.log(`${toggleSyncs ? '✓' : '✗'} 0.9.13 отметка приёма в приложении сразу уходит в натив`);

  // Обратный канал: колбэк обязан быть присвоен в window, иначе натив его
  // не найдёт (наступали на это с onHealthBodyMetricsReceived).
  const cbOk = /window\.onCourseDosesFromNative\s*=/.test(appS)
    && /onCourseDosesFromNative/.test(fs.readFileSync('android-native/MainActivity.java', 'utf8'));
  if (!cbOk) failed++;
  console.log(`${cbOk ? '✓' : '✗'} 0.9.13 очередь отметок из натива принимает window.onCourseDosesFromNative`);

  // Натив присылает конечное состояние (done 1/0), а не «переключить»:
  // повторная доставка очереди не должна снимать уже отмеченный приём.
  const cbStart = appS.indexOf('window.onCourseDosesFromNative =');
  const cbSrc = appS.slice(cbStart, cbStart + 1600);
  const idempotent = /marks\.includes\(idx\) === wantDone/.test(cbSrc);
  if (!idempotent) failed++;
  console.log(`${idempotent ? '✓' : '✗'} 0.9.13 повторная доставка очереди не переворачивает отметку`);

  // Формат плана для натива: ключи короткие и совпадают с FitFlowCourses.java.
  const coursesJava = fs.readFileSync('android-native/FitFlowCourses.java', 'utf8');
  const planKeysOk = ['id', 'name', 'start', 'days', 'remind', 'times']
    .every((k) => new RegExp('optString\\("' + k + '"|optInt\\("' + k + '"|optBoolean\\("' + k + '"|optJSONArray\\("' + k + '"').test(coursesJava));
  if (!planKeysOk) failed++;
  console.log(`${planKeysOk ? '✓' : '✗'} 0.9.13 ключи плана курса совпадают в app.js и FitFlowCourses.java`);

  // Кнопка «Принял» должна быть броадкастом: getActivity открыл бы приложение.
  const receiverJava = fs.readFileSync('android-native/CourseReminderReceiver.java', 'utf8');
  const takenStart = receiverJava.indexOf('Intent taken = new Intent');
  const takenSrc = receiverJava.slice(takenStart, takenStart + 700);
  const broadcastOk = /PendingIntent\.getBroadcast\(context, notifId, taken/.test(takenSrc)
    && /addAction\(R\.drawable\.ic_stat_icon, "✓ Принял", takenPi\)/.test(receiverJava);
  if (!broadcastOk) failed++;
  console.log(`${broadcastOk ? '✓' : '✗'} 0.9.13 «✓ Принял» — броадкаст, приложение не открывается`);

  // Диапазоны id уведомлений не должны пересекаться с водой (4250).
  const baseMatch = receiverJava.match(/COURSE_NOTIFICATION_BASE = (\d+)/);
  const waterJava = fs.readFileSync('android-native/WaterReminderReceiver.java', 'utf8');
  const waterMatch = waterJava.match(/WATER_NOTIFICATION_ID = (\d+)/);
  const base = baseMatch ? Number(baseMatch[1]) : -1;
  const waterId = waterMatch ? Number(waterMatch[1]) : -1;
  const rangesOk = base > 0 && waterId > 0 && (waterId < base || waterId > base + 99);
  if (!rangesOk) failed++;
  console.log(`${rangesOk ? '✓' : '✗'} 0.9.13 id уведомлений курса не пересекаются с водой`);

  // Виджет: пункт есть в конфигураторе и обрабатывается нативом.
  const widgetJava = fs.readFileSync('android-native/FitFlowWidgetProvider.java', 'utf8');
  const widgetOk = /id: 'courses'/.test(appS)
    && /"courses"\.equals\(itemId\)/.test(widgetJava)
    && /FitFlowCourses\.widgetLine/.test(widgetJava)
    && /FitFlowCourses\.toggleTarget/.test(widgetJava);
  if (!widgetOk) failed++;
  console.log(`${widgetOk ? '✓' : '✗'} 0.9.13 строка витаминов есть в конфигураторе и рисуется нативом`);

  // Без заведённого курса пункт не предлагается: правило «никаких заглушек».
  const availStart = appS.indexOf('function isWidgetItemAvailable');
  const availSrc = appS.slice(availStart, availStart + 700);
  const noStub = /id === 'courses'/.test(availSrc) && /state\.myCourses/.test(availSrc);
  if (!noStub) failed++;
  console.log(`${noStub ? '✓' : '✗'} 0.9.13 без курса строка витаминов не предлагается в настройках виджета`);

  // Сборка: новые файлы копируются, ресивер попадает в манифест.
  const yml = fs.readFileSync('tools/github-workflows/build.yml', 'utf8');
  const buildOk = /FitFlowCourses\.java/.test(yml)
    && /CourseReminderReceiver\.java/.test(yml)
    && /android:name="\.CourseReminderReceiver"/.test(yml);
  if (!buildOk) failed++;
  console.log(`${buildOk ? '✓' : '✗'} 0.9.13 нативные файлы курса копируются и ресивер объявлен в манифесте`);

  // Удаление последнего курса обязано чистить нативную копию, иначе строка
  // витаминов и будильник переживут удаление.
  const refreshStart = appS.indexOf('async function refreshCourseRemindersOnLaunch');
  const refreshSrc = appS.slice(refreshStart, refreshStart + 900);
  const clearsOk = /cancelCourseRemindersNative/.test(refreshSrc);
  if (!clearsOk) failed++;
  console.log(`${clearsOk ? '✓' : '✗'} 0.9.13 при пустом курсе нативная копия очищается`);
}

/* ============================================================
   0.9.14 «История тренировок с часов».
   Владелец увидел в статистике за 7 дней только три дня с тренировками,
   хотя часы фиксировали больше. Причина: натив читал сессии лишь за
   WORKOUTS_LOOKBACK_DAYS (3 суток), обратной заливки (как у шагов и сна)
   не существовало вовсе, а добавленная задним числом тренировка не
   попадала в сводку прошлого дня — то есть и в график активности.
   Тесты держат всю цепочку: натив → мост → JS → сводка дня.
   ============================================================ */
{
  const appS = fs.readFileSync('app.js', 'utf8');
  const helperKt = fs.readFileSync('android-native/HealthConnectHelper.kt', 'utf8');
  const mainJava = fs.readFileSync('android-native/MainActivity.java', 'utf8');

  // 1. Натив умеет читать историю за N дней и делает это постранично:
  // readRecords отдаёт до 1000 записей за страницу, а за месяц сессий бывает
  // больше (часы пишут «тренировкой» и обычную ходьбу). Ровно на этом
  // в 0.9.12 погорела история шагов.
  const histStart = helperKt.indexOf('fun readWorkoutsHistory');
  const histSrc = histStart >= 0 ? helperKt.slice(histStart, histStart + 2200) : '';
  const nativeHistoryOk = histStart >= 0
    && /pageToken/.test(histSrc)
    && /while \(pageToken != null\)/.test(histSrc)
    && /ExerciseSessionRecord::class/.test(histSrc);
  if (!nativeHistoryOk) failed++;
  console.log(`${nativeHistoryOk ? '✓' : '✗'} 0.9.14 натив читает историю тренировок постранично`);

  // 2. Собственный экспорт в Health Connect читать обратно нельзя — иначе
  // тренировка задваивается сама с собой (урок 0.9.10).
  const selfFilterOk = /== selfPkg\) continue/.test(histSrc);
  if (!selfFilterOk) failed++;
  console.log(`${selfFilterOk ? '✓' : '✗'} 0.9.14 история пропускает собственный экспорт приложения`);

  // 3. Мост: имя метода и имя колбэка должны совпадать по обе стороны.
  // Разъедутся — данные молча не доедут, а на телефоне это выглядит как
  // «синхронизация есть, тренировок нет».
  const bridgeOk = /public void syncHealthWorkoutsHistory\(\)/.test(mainJava)
    && /readWorkoutsHistory\(getApplicationContext\(\), 30\)/.test(mainJava)
    && /window\.onHealthWorkoutsHistoryReceived/.test(mainJava)
    && /FitFlowExport\.syncHealthWorkoutsHistory/.test(appS);
  if (!bridgeOk) failed++;
  console.log(`${bridgeOk ? '✓' : '✗'} 0.9.14 мост истории тренировок согласован между JS и нативом`);

  // 4. Колбэк обязан быть присвоен в window: натив зовёт его по имени и
  // без присваивания молча ничего не делает (грабли 0.8.23 — вес с весов).
  const inWindowOk = /window\.onHealthWorkoutsHistoryReceived = onHealthWorkoutsHistoryReceived/.test(appS)
    && /window\.onHealthBodyMetricsReceived = onHealthBodyMetricsReceived/.test(appS);
  if (!inWindowOk) failed++;
  console.log(`${inWindowOk ? '✓' : '✗'} 0.9.14 колбэки истории тренировок и показателей тела присвоены в window`);

  // 5. Заливка вызывается рядом с историей шагов и сна и не чаще раза в сутки.
  const reqStart = appS.indexOf('function requestWorkoutsHistorySync');
  const reqSrc = reqStart >= 0 ? appS.slice(reqStart, reqStart + 500) : '';
  const dailyOk = reqStart >= 0
    && /24 \* 60 \* 60 \* 1000/.test(reqSrc)
    && /requestWorkoutsHistorySync\(\); \/\/ 0\.9\.14/.test(appS);
  if (!dailyOk) failed++;
  console.log(`${dailyOk ? '✓' : '✗'} 0.9.14 история тренировок запрашивается раз в сутки при возврате в приложение`);

  // 6. Поведение разбора: пачка за 30 дней превращается в сессии, повторная
  // доставка тех же записей ничего не добавляет (дедуп по recordId).
  const api = require('./app.js');
  const hasApi = typeof api.mergeWatchWorkoutsBackfill === 'function';
  if (!hasApi) failed++;
  console.log(`${hasApi ? '✓' : '✗'} 0.9.14 слияние истории тренировок доступно для прогона`);

  if (hasApi) {
    const merge = api.mergeWatchWorkoutsBackfill;
    const dayMs = 86400000;
    const at = (daysAgo, hour) => {
      const d = new Date();
      d.setHours(hour, 0, 0, 0);
      return d.getTime() - daysAgo * dayMs;
    };
    const mk = (id, daysAgo, minutes) => ({
      recordId: id, type: 'other', title: 'Тренировка',
      start: at(daysAgo, 10), end: at(daysAgo, 10) + minutes * 60000, minutes
    });
    const today = new Date();
    const p2 = (v) => String(v).padStart(2, '0');
    const todayK = `${today.getFullYear()}-${p2(today.getMonth() + 1)}-${p2(today.getDate())}`;
    const payload = [mk('h1', 12, 45), mk('h2', 9, 30), mk('h3', 6, 50)];

    const first = merge([], payload, todayK);
    const again = merge(first.list, payload, todayK);
    const hasAll = ['h1', 'h2', 'h3'].every((id) => first.list.some((s) => s.recordId === id));
    const mergeOk = first.added === 3 && again.added === 0 && again.list.length === 3 && hasAll;
    if (!mergeOk) failed++;
    console.log(`${mergeOk ? '✓' : '✗'} 0.9.14 сессии за прошлые недели добавляются один раз (повтор не задваивает)`);

    // Уже импортированная или отклонённая сессия не должна вернуться из истории:
    // иначе месячная заливка воскресила бы всё, что владелец разобрал руками.
    const settled = first.list.map((s) => ({ ...s, imported: s.recordId === 'h1', ignored: s.recordId === 'h2' }));
    const revive = merge(settled, payload, todayK);
    const noRevive = revive.added === 0
      && revive.list.find((s) => s.recordId === 'h1').imported === true
      && revive.list.find((s) => s.recordId === 'h2').ignored === true;
    if (!noRevive) failed++;
    console.log(`${noRevive ? '✓' : '✗'} 0.9.14 разобранные сессии не воскресают из месячной истории`);

    // Дата сессии — по времени НАЧАЛА, а не по дню получения данных: иначе
    // вся месячная история сложилась бы в сегодняшний день (урок 0.8.25).
    const s1 = first.list.find((s) => s.recordId === 'h1');
    const want = new Date(at(12, 10));
    const wantKey = `${want.getFullYear()}-${p2(want.getMonth() + 1)}-${p2(want.getDate())}`;
    const dateOk = !!s1 && s1.date === wantKey && s1.date !== todayK;
    if (!dateOk) failed++;
    console.log(`${dateOk ? '✓' : '✗'} 0.9.14 дата сессии из истории берётся по времени начала тренировки`);

    // Короткие сессии (случайно включённый режим на часах) не засоряют дневник.
    const shortRes = merge([], [mk('h-short', 5, 3)], todayK);
    const shortIgnored = shortRes.added === 0 && shortRes.list.length === 0;
    if (!shortIgnored) failed++;
    console.log(`${shortIgnored ? '✓' : '✗'} 0.9.14 сессии короче 5 минут в историю не попадают`);

    // Потолок списка режет самое старое, а не свежее: за 30 дней записей много,
    // а список целиком лежит в localStorage.
    const many = [];
    for (let i = 0; i < 40; i++) many.push(mk('m' + i, i, 20));
    const capped = merge([], many, todayK, 10);
    const keepsFresh = capped.list.length === 10
      && capped.list.some((s) => s.recordId === 'm0')
      && !capped.list.some((s) => s.recordId === 'm39');
    if (!keepsFresh) failed++;
    console.log(`${keepsFresh ? '✓' : '✗'} 0.9.14 потолок списка сессий отрезает самые старые`);
  }

  // 7. Порог короткой сессии продублирован в нативе и JS — значения обязаны
  // совпадать, иначе телефон и часы «видят» разные тренировки.
  const ktMin = helperKt.match(/MIN_WORKOUT_MINUTES = (\d+)/);
  const jsMin = appS.match(/WATCH_MIN_WORKOUT_MINUTES = (\d+)/);
  const thresholdOk = !!ktMin && !!jsMin && ktMin[1] === jsMin[1];
  if (!thresholdOk) failed++;
  console.log(`${thresholdOk ? '✓' : '✗'} 0.9.14 порог короткой сессии одинаков в нативе и JS`);

  // 8. Тренировка, добавленная задним числом, обязана попасть в сводку дня.
  // Без этого график активности за прошлый день остаётся пустым, если за тот
  // день уже была запись о воде или еде — ровно то, что видел владелец.
  const autoStart = appS.indexOf('function autoImportStaleWatchWorkouts');
  const autoSrc = autoStart >= 0 ? appS.slice(autoStart, autoStart + 3600) : '';
  const summaryOk = /touchedDates\.forEach\(\(d\) => syncPastDaySummary\(d\)\)/.test(autoSrc);
  if (!summaryOk) failed++;
  console.log(`${summaryOk ? '✓' : '✗'} 0.9.14 авто-добавленная тренировка обновляет сводку прошлого дня`);

  const importStart = appS.indexOf('function importWatchWorkout');
  const importSrc = importStart >= 0 ? appS.slice(importStart, importStart + 1600) : '';
  const importSummaryOk = /syncPastDaySummary\(s\.date/.test(importSrc);
  if (!importSummaryOk) failed++;
  console.log(`${importSummaryOk ? '✓' : '✗'} 0.9.14 ручное добавление с часов тоже обновляет сводку дня`);
}

/* ============================================================
   0.9.14: сравнение периодов больше не спрятано за игровым режимом.
   ============================================================ */
{
  const appS = fs.readFileSync('app.js', 'utf8');
  const cmpStart = appS.indexOf('function renderStatsCompare');
  const cmpSrc = cmpStart >= 0 ? appS.slice(cmpStart, cmpStart + 2600) : '';

  // Блок обязан зависеть только от периода: статистика к игре отношения не имеет.
  const notGated = cmpStart >= 0
    && /const show = period !== 'day'/.test(cmpSrc)
    && !/gameMode/.test(cmpSrc);
  if (!notGated) failed++;
  console.log(`${notGated ? '✓' : '✗'} 0.9.14 сравнение периодов не зависит от игрового режима`);

  // Заголовок называет сравниваемые окна — исходный вопрос владельца.
  const titleOk = /Последние ' \+ count \+ ' дней против предыдущих ' \+ count/.test(cmpSrc);
  if (!titleOk) failed++;
  console.log(`${titleOk ? '✓' : '✗'} 0.9.14 заголовок сравнения называет оба периода явно`);

  // Прошлый период считает минуты активности так же, как текущий: из журнала
  // тренировок. Иначе сравнение занижает прошлые дни без воды и еды.
  const fairOk = /activityMinutes: activityMinutesForDate\(date\)/.test(cmpSrc);
  if (!fairOk) failed++;
  console.log(`${fairOk ? '✓' : '✗'} 0.9.14 прошлый период учитывает тренировки из журнала`);

  // Подпись периода описывает скользящее окно, а не календарную неделю.
  const captionOk = /week: 'Последние 7 дней'/.test(appS) && !/week: 'Итоги за 7 дней'/.test(appS);
  if (!captionOk) failed++;
  console.log(`${captionOk ? '✓' : '✗'} 0.9.14 подпись периода говорит «последние N дней»`);
}

/* ==== 0.9.15: фоновое чтение Health Connect и вечернее напоминание ==== */
{
  const appS = fs.readFileSync('app.js', 'utf8');
  const html = fs.readFileSync('index.html', 'utf8');
  const kt = fs.readFileSync('android-native/HealthConnectHelper.kt', 'utf8');
  const main = fs.readFileSync('android-native/MainActivity.java', 'utf8');
  const recv = fs.readFileSync('android-native/HealthSyncReceiver.java', 'utf8');
  const wf = fs.readFileSync('tools/github-workflows/build.yml', 'utf8');

  // 1. Разрешение фонового чтения попадает в манифест сборки.
  const permOk = /android\.permission\.health\.READ_HEALTH_DATA_IN_BACKGROUND/.test(wf);
  if (!permOk) failed++;
  console.log(`${permOk ? '✓' : '✗'} 0.9.15 READ_HEALTH_DATA_IN_BACKGROUND есть в манифесте`);

  // 2. Строка разрешения объявлена ровно один раз и точно совпадает с
  //    платформенной. Раньше здесь бралась константа HealthPermission, но
  //    её нет в закреплённой connect-client:1.1.0-alpha07 — сборка падала.
  //    Литерал допустим, потому что значение задано платформой; ошибка в
  //    нём проявилась бы только на устройстве, поэтому сверяем посимвольно.
  const constOk = /val BACKGROUND_READ_PERMISSION: String = "android\.permission\.health\.READ_HEALTH_DATA_IN_BACKGROUND"/.test(kt);
  if (!constOk) failed++;
  console.log(`${constOk ? '✓' : '✗'} 0.9.15 строка разрешения объявлена точно и одним местом`);

  // 3. Не тянем из библиотеки то, чего в закреплённой версии нет.
  //    HealthConnectFeatures и HealthPermission.PERMISSION_* появились в
  //    1.1.0-alpha09, а собираемся на alpha07: любое обращение к ним (вне
  //    комментария) снова уронит шаг Build APK.
  const ktCode = kt.split('\n')
    .filter(function (line) { return !/^\s*(\/\/|\*|\/\*)/.test(line); })
    .join('\n');
  const noNewApiOk = !/HealthConnectFeatures/.test(ktCode)
    && !/HealthPermission\./.test(ktCode)
    && !/\.features\b/.test(ktCode);
  if (!noNewApiOk) failed++;
  console.log(`${noNewApiOk ? '✓' : '✗'} 0.9.15 нет обращений к API новее connect-client:1.1.0-alpha07`);

  // 3b. Доступность определяется до запроса разрешения: старая служба или
  //     Android ниже 15 — предлагать нечего.
  const featOk = /Build\.VERSION\.SDK_INT >= 35/.test(kt)
    && /fun isBackgroundReadAvailable/.test(kt);
  if (!featOk) failed++;
  console.log(`${featOk ? '✓' : '✗'} 0.9.15 доступность фонового чтения проверяется до запроса`);

  // 4. Выданность читается через getGrantedPermissions: пользователь может
  //    отозвать доступ, манифест об этом не знает.
  const grantOk = /getGrantedPermissions\(\)[\s\S]{0,120}BACKGROUND_READ_PERMISSION/.test(kt);
  if (!grantOk) failed++;
  console.log(`${grantOk ? '✓' : '✗'} 0.9.15 выданность проверяется через getGrantedPermissions`);

  // 5. Мост наружу и три возможных состояния.
  const bridgeOk = /getHealthBackgroundReadStatus/.test(main)
    && /requestHealthBackgroundRead/.test(main)
    && /backgroundReadStatus/.test(kt);
  if (!bridgeOk) failed++;
  console.log(`${bridgeOk ? '✓' : '✗'} 0.9.15 мосты фонового чтения объявлены в MainActivity`);

  const jsBridgeOk = /function healthBackgroundReadStatus/.test(appS)
    && /'granted'/.test(appS) && /'unavailable'/.test(appS);
  if (!jsBridgeOk) failed++;
  console.log(`${jsBridgeOk ? '✓' : '✗'} 0.9.15 JS читает состояние фонового чтения`);

  // 6. Никаких видимых заглушек: блок скрыт в разметке и открывается кодом.
  const hiddenOk = /id="health-background-read-block" hidden/.test(html)
    && /block\.hidden = true/.test(appS);
  if (!hiddenOk) failed++;
  console.log(`${hiddenOk ? '✓' : '✗'} 0.9.15 блок фонового доступа скрыт, пока функция недоступна`);

  // 7. Порог «день засчитан» — сумма минут, а не количество записей.
  //    Часы заводят «тренировкой» двухминутную ходьбу до магазина.
  const thresholdOk = /const ACTIVITY_REMINDER_MIN_MINUTES = (\d+)/.test(appS)
    && /function hasWorkoutToday\(\)[\s\S]{0,160}activityMinutesForDate\(todayKey\(\)\) >= ACTIVITY_REMINDER_MIN_MINUTES/.test(appS);
  if (!thresholdOk) failed++;
  console.log(`${thresholdOk ? '✓' : '✗'} 0.9.15 вечерний вопрос считает СУММУ минут за день`);

  // 8. Порог одинаков в JS и в фоновом ресивере — иначе фон и приложение
  //    закрывали бы день по разным правилам.
  const jsThr = (appS.match(/const ACTIVITY_REMINDER_MIN_MINUTES = (\d+)/) || [])[1];
  const javaThr = (recv.match(/ACTIVITY_REMINDER_MIN_MINUTES = (\d+)/) || [])[1];
  const sameThr = !!jsThr && jsThr === javaThr;
  if (!sameThr) failed++;
  console.log(`${sameThr ? '✓' : '✗'} 0.9.15 порог активности совпадает в JS (${jsThr}) и в фоне (${javaThr})`);

  // 9. Идентификатор напоминания в фоне считается тем же алгоритмом (FNV-1a
  //    от даты + база), иначе фон гасил бы чужое уведомление.
  const jsBase = (appS.match(/TRAINING_REMINDER_BASE_ID = (\d+)/) || [])[1];
  const javaBase = (recv.match(/TRAINING_REMINDER_BASE_ID = (\d+)/) || [])[1];
  const idOk = !!jsBase && jsBase === javaBase
    && /16777619/.test(recv) && /900000/.test(recv);
  if (!idOk) failed++;
  console.log(`${idOk ? '✓' : '✗'} 0.9.15 id вечернего напоминания считается одинаково в JS и в фоне`);

  // 10. Дыра №1: импорт тренировки с часов пересчитывает напоминание.
  const importSyncOk = /syncPastDaySummary\(s\.date \|\| ''\)[\s\S]{0,400}syncTrainingReminderForToday/.test(appS);
  if (!importSyncOk) failed++;
  console.log(`${importSyncOk ? '✓' : '✗'} 0.9.15 ручной импорт с часов пересчитывает вечерний вопрос`);

  // 11. Дыра №1 (авто): автоимпорт делает то же самое.
  const autoSyncOk = /if \(added\) \{ Promise\.resolve\(syncTrainingReminderForToday\(\)\)/.test(appS);
  if (!autoSyncOk) failed++;
  console.log(`${autoSyncOk ? '✓' : '✗'} 0.9.15 автоимпорт с часов пересчитывает вечерний вопрос`);

  // 12. Дыра №2: расписание пересматривается при возврате в приложение,
  //     а не только в момент построения на 14 дней вперёд.
  const resumeOk = /function refreshTrainingReminderOnResume/.test(appS)
    && /refreshTrainingReminderOnResume\(\);/.test(appS)
    && /refreshTrainingReminderOnResume\(true\)/.test(appS);
  if (!resumeOk) failed++;
  console.log(`${resumeOk ? '✓' : '✗'} 0.9.15 напоминание пересчитывается при возврате в приложение`);

  // 13. Дыра №3: фоновый синк снимает уже показанный вопрос.
  const bgOk = /readTodayExerciseMinutes/.test(recv)
    && /cancelTrainingReminderNotification/.test(recv);
  if (!bgOk) failed++;
  console.log(`${bgOk ? '✓' : '✗'} 0.9.15 фоновый синк снимает вопрос при засчитанном дне`);

  // 14. Нативный счётчик минут отбрасывает собственный экспорт — иначе
  //     записанная нами тренировка вернулась бы и закрыла день сама себе.
  const selfOk = /fun readTodayExerciseMinutes[\s\S]{0,900}packageName[\s\S]{0,80}selfPkg/.test(kt);
  if (!selfOk) failed++;
  console.log(`${selfOk ? '✓' : '✗'} 0.9.15 фоновый счётчик минут игнорирует собственный экспорт`);

  // 15. Подсказка про экономию батареи приложения часов — причина задержек
  //     не в FitFlow, и владельцу это нужно видеть в настройках синхронизации.
  const zeppOk = /экономию батареи/.test(html) && /Health Connect только когда работает само/.test(html);
  if (!zeppOk) failed++;
  console.log(`${zeppOk ? '✓' : '✗'} 0.9.15 подсказка про экономию батареи приложения часов`);
}

// --- 0.9.16: дневник зала понятен и не теряет подходы ---------------------
{
  const appS = app;
  const api = require('./app.js');

  // 1. Главный баг: подход засчитывается по повторениям. Пока фильтр требовал
  //    weight > 0, подтягивания без блина исчезали при сохранении целиком.
  // Внимание: почти такой же код есть в saveStrengthTemplate, поэтому срез
  // берём строго от объявления saveStrengthSession, а не по первому indexOf.
  const saveStart = appS.indexOf('function saveStrengthSession');
  const saveBlock = appS.slice(saveStart, saveStart + 1200);
  const keepsBw = /\.filter\(\(s\) => s\.reps > 0\)/.test(saveBlock)
    && !/s\.weight > 0 && s\.reps > 0/.test(saveBlock);
  if (!keepsBw) failed++;
  console.log(`${keepsBw ? '✓' : '✗'} 0.9.16 подход с собственным весом сохраняется без веса`);

  // 2. Тот же фильтр в нормализации — иначе подходы пропадали бы при
  //    перезагрузке уже сохранённых данных.
  const normOk = /\.filter\(\(set\) => set\.reps > 0\)[\s\S]{0,60}return \{ name, sets \}/.test(appS);
  if (!normOk) failed++;
  console.log(`${normOk ? '✓' : '✗'} 0.9.16 нормализация сессий не выбрасывает подходы без веса`);

  // 3. Коэффициенты собственного веса (P37). Порядок правил важен: «брусья»
  //    и «подтягивания» должны срабатывать раньше «отжиманий».
  const coefOk = api.bodyweightCoefFor('подтягивания') === 0.95
    && api.bodyweightCoefFor('Отжимания от пола') === 0.64
    && api.bodyweightCoefFor('брусья') === 0.95
    && api.bodyweightCoefFor('жим лёжа') === 0;
  if (!coefOk) failed++;
  console.log(`${coefOk ? '✓' : '✗'} 0.9.16 коэффициенты собственного веса определяются по названию`);

  // 4. Нагрузка подхода = доля массы тела + добавка в поле веса.
  const loadOk = api.setLoadKg({ weight: 0, reps: 10 }, 0.95, 80) === 76
    && api.setLoadKg({ weight: 10, reps: 10 }, 0.95, 80) === 86
    && api.setLoadKg({ weight: 60, reps: 10 }, 0, 80) === 60;
  if (!loadOk) failed++;
  console.log(`${loadOk ? '✓' : '✗'} 0.9.16 вес в поле трактуется как добавка к собственному весу`);

  // 5. Объём считается только когда нагрузка передана. Без второго аргумента
  //    поведение прежнее — сохранённые данные и старые вызовы не ломаются.
  const sets = [{ weight: 0, reps: 10 }, { weight: 0, reps: 10 }];
  const compatOk = api.computeSetTonnage(sets, { coef: 0.95, bodyKg: 80 }) === 1520
    && api.computeSetTonnage(sets) === 0;
  if (!compatOk) failed++;
  console.log(`${compatOk ? '✓' : '✗'} 0.9.16 объём учитывает массу тела, старая сигнатура сохранена`);

  // 6. Название блока и подписи полей. Прежнее «Силовая: вес × повторы»
  //    не объясняло, что вводить при отжиманиях с жилетом.
  const uiOk = /Тренировка в зале: подходы/.test(html)
    && !/Силовая: вес × повторы/.test(html)
    && /\+ жилет, кг/.test(appS)
    && /берётся из вашего профиля/.test(html);
  if (!uiOk) failed++;
  console.log(`${uiOk ? '✓' : '✗'} 0.9.16 блок переименован и объясняет ввод веса`);

  // 7. Без массы тела в профиле показываем просьбу, а не заниженный объём.
  const profileOk = /укажите вес в профиле, чтобы считать объём/.test(appS)
    && /state\.profileSettings[\s\S]{0,120}weightKg/.test(appS);
  if (!profileOk) failed++;
  console.log(`${profileOk ? '✓' : '✗'} 0.9.16 без веса в профиле объём не выдумывается`);
}

// --- 0.9.17: прогресс по упражнению «в прошлый раз 50, сейчас 57» ----------
{
  const api = require('./app.js');
  const css = fs.readFileSync('style.css', 'utf8');

  // 1. Главный сценарий владельца: рабочий вес вырос с 50 до 57 кг.
  const s1 = [
    { id: '1', date: '2026-08-17', exercises: [{ name: 'жим лёжа', sets: [{ weight: 50, reps: 8 }] }] },
    { id: '2', date: '2026-08-24', exercises: [{ name: 'жим лёжа', sets: [{ weight: 57, reps: 8 }] }] }
  ];
  const p1 = api.computeExerciseProgress(s1)[0];
  const growOk = p1 && p1.prev.weight === 50 && p1.last.weight === 57
    && p1.deltaKg === 7 && api.formatStrengthProgress(p1) === '▲ +7 кг';
  if (!growOk) failed++;
  console.log(`${growOk ? '✓' : '✗'} 0.9.17 рост рабочего веса 50 → 57 показывается как +7 кг`);

  // 2. Собственный вес: прогресс идёт по повторениям, а не по кг.
  const s2 = [
    { id: '1', date: '2026-08-17', exercises: [{ name: 'отжимания от пола', sets: [{ weight: 0, reps: 20 }] }] },
    { id: '2', date: '2026-08-24', exercises: [{ name: 'отжимания от пола', sets: [{ weight: 0, reps: 25 }] }] }
  ];
  const p2 = api.computeExerciseProgress(s2)[0];
  const repsOk = p2 && p2.deltaReps === 5 && api.formatStrengthProgress(p2) === '▲ +5 повт.'
    && api.formatStrengthSet(p2.name, p2.last) === 'своим весом × 25';
  if (!repsOk) failed++;
  console.log(`${repsOk ? '✓' : '✗'} 0.9.17 у собственного веса прогресс считается в повторениях`);

  // 3. Сравнивается ВНЕШНИЙ вес, а не нагрузка с массой тела: иначе похудение
  //    выглядело бы откатом в подтягиваниях, хотя человек просто легче.
  const s3 = [
    { id: '1', date: '2026-08-17', exercises: [{ name: 'подтягивания', sets: [{ weight: 0, reps: 10 }] }] },
    { id: '2', date: '2026-08-24', exercises: [{ name: 'подтягивания', sets: [{ weight: 5, reps: 8 }] }] }
  ];
  const p3 = api.computeExerciseProgress(s3)[0];
  const addOk = p3 && p3.deltaKg === 5 && api.formatStrengthSet(p3.name, p3.last) === '+5 кг × 8';
  if (!addOk) failed++;
  console.log(`${addOk ? '✓' : '✗'} 0.9.17 динамика считается по добавке, масса тела её не искажает`);

  // 4. Одна тренировка — сравнивать не с чем, блок не выдумывается.
  const noneOk = api.computeExerciseProgress([s1[0]]).length === 0;
  if (!noneOk) failed++;
  console.log(`${noneOk ? '✓' : '✗'} 0.9.17 после первой тренировки прогресс не показывается`);

  // 5. Две сессии в один день не должны давать «прогресс внутри дня» —
  //    точка на день одна, берётся лучший подход.
  const s5 = [
    { id: '1', date: '2026-08-24', exercises: [{ name: 'присед', sets: [{ weight: 60, reps: 5 }] }] },
    { id: '2', date: '2026-08-24', exercises: [{ name: 'присед', sets: [{ weight: 70, reps: 5 }] }] }
  ];
  const dayOk = api.computeExerciseProgress(s5).length === 0;
  if (!dayOk) failed++;
  console.log(`${dayOk ? '✓' : '✗'} 0.9.17 две сессии за один день не создают ложный прогресс`);

  // 6. Блок выводится в истории раньше рекордов и имеет стили.
  const uiOk = /Как идёт прогресс/.test(app)
    && app.indexOf('Как идёт прогресс') < app.indexOf('Личные рекорды по упражнениям')
    && /в прошлый раз \$\{formatStrengthSet/.test(app)
    && /\.strength-progress-row/.test(css);
  if (!uiOk) failed++;
  console.log(`${uiOk ? '✓' : '✗'} 0.9.17 блок прогресса стоит перед рекордами и оформлен`);
}

console.log(failed === 0 ? '\nUI INIT CHECK PASSED' : `\n${failed} UI INIT FAILURES`);
process.exit(failed === 0 ? 0 : 1);
