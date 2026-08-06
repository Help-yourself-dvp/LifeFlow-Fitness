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
  'renderSleepCheckinSettings', 'updateSleepCheckinEnabled', 'saveSleepTargets',
  'renderSleepDialogControls', 'renderSleepDialogSummary'
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
  'settings-general-view', 'game-mode-toggle', 'game-mode-status', 'game-tasks-card',
  'game-medals-view', 'game-medals-grid', 'game-medals-count', 'game-medals-back',
  'help-dialog', 'help-title', 'help-text', 'help-ok', 'water-custom-cancel',
  'stats-compare-section', 'stats-compare-text', 'stats-compare-motivation',
  'ai-quick-clear-btn', 'ai-chat-clear-btn', 'ai-recipe-clear-btn',
  'ai-cloud-base-row', 'ai-cloud-base', 'ai-quick-result', 'ai-chat-result', 'ai-recipe-result',
  'sleep-checkin-toggle', 'sleep-targets-row', 'sleep-target-bed', 'sleep-target-wake', 'sleep-checkin-status',
  'sleep-checkin-dialog', 'sleep-rating-row', 'sleep-extra-toggle', 'sleep-extra',
  'sleep-bed-input', 'sleep-wake-input', 'sleep-fill-targets', 'sleep-tags',
  'sleep-summary', 'sleep-save-btn', 'sleep-skip-btn'
];

let failed = 0;
/* Регресс-защита (баг 0.3.5 «dialogs.some is not a function» при входе):
   $$ обязан возвращать Array — NodeList не имеет .some/.map/.filter. */
{
  const ok = /\$\$\s*=\s*\(sel\)\s*=>\s*Array\.from\(/.test(app);
  if (!ok) failed++;
  console.log(`${ok ? '✓' : '✗'} $$ возвращает Array.from (не голый NodeList)`);
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
console.log(failed === 0 ? '\nUI INIT CHECK PASSED' : `\n${failed} UI INIT FAILURES`);
process.exit(failed === 0 ? 0 : 1);
