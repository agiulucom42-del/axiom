const tr = require('./lang-tr');
const en = require('./lang-en');

const PACKS = {
  tr,
  turkish: tr,
  en,
  english: en,
};

module.exports = function createNlp(langCode = 'tr') {
  const key = String(langCode || 'tr').toLowerCase();
  return PACKS[key] || tr;
};
