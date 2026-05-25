const STOP_WORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'to', 'of', 'in', 'on', 'for', 'with',
  'is', 'are', 'was', 'were', 'be', 'been', 'being',
]);

function normalize(word) {
  let w = String(word || '').toLowerCase().trim();
  for (const suf of ['ing', 'ed', 'es', 's']) {
    if (w.endsWith(suf) && w.length > suf.length + 2) {
      w = w.slice(0, -suf.length);
      break;
    }
  }
  return w;
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function isStopWord(word) {
  return STOP_WORDS.has(normalize(word));
}

function extractFacts(text) {
  const tokens = tokenize(text).filter(t => !isStopWord(t));
  if (tokens.length < 2) return [];
  return [{
    subject: normalize(tokens[0]),
    predicate: tokens.slice(1).join(' '),
  }];
}

module.exports = {
  name: 'english',
  normalize,
  tokenize,
  isStopWord,
  extractFacts,
};
