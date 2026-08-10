#!/usr/bin/env node
/* ============================================================================
   Генератор PRO-кодов FitFlow — ТОЛЬКО для владельца проекта (не публиковать
   выданные клиентам пары, сами коды не секрет: проверяет их приложение).

   Использование:
     node tools/make-pro-code.js e-mail@покупателя.ru

   Код выглядит как FF-XXXX-XXXX-XXXX и считается как первые 12 hex знаков
   HMAC-SHA256(секрет, e-mail в нижнем регистре). E-mail при проверке
   приводится к нижнему регистру — отправляйте код на тот адрес, который
   покупатель введёт в приложении (регистр не важен, пробелы срежутся).

   ⚠️ СЕКРЕТ обязан совпадать с PRO_SECRET в app.js — синхронно!
   Это честная защита «от добросовестного пользователя», не DRM: секрет лежит
   в открытом APK, и мы не скрываем этого ни от пользователей, ни от себя.
   ============================================================================ */
const crypto = require('crypto');

const PRO_SECRET = 'FitFlow-PRO/help-yourself-dvp/2026/v1'; // == app.js PRO_SECRET

function makeProCode(email) {
  const hex = crypto.createHmac('sha256', PRO_SECRET)
    .update(String(email || '').trim().toLowerCase())
    .digest('hex')
    .toUpperCase()
    .slice(0, 12);
  return `FF-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`;
}

if (require.main === module) {
  const email = (process.argv[2] || '').trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('Использование: node tools/make-pro-code.js e-mail@покупателя.ru');
    process.exit(1);
  }
  console.log(`E-mail: ${email.toLowerCase()}`);
  console.log(`Код:    ${makeProCode(email)}`);
  console.log('Покупатель вводит эту пару в Настройки → FitFlow PRO. На новом устройстве — та же пара.');
}

module.exports = { makeProCode };
