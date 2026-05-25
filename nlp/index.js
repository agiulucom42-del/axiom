const tr = require('./lang-tr');
const en = require('./lang-en');
const de = require('./lang-de');
const ar = require('./lang-ar');

const PACKS = {
  tr,
  turkish: tr,
  en,
  english: en,
  de,
  german: de,
  deutsch: de,
  ar,
  arabic: ar,
  arabi: ar,
};

module.exports = function createNlp(langCode = 'tr') {
  const key = String(langCode || 'tr').toLowerCase();
  return PACKS[key] || tr;
};
