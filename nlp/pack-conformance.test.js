const test = require('node:test');
const assert = require('node:assert/strict');

const createNlp = require('./index');

const cases = [
  {
    code: 'tr',
    sample: 'Kedi hayvandır',
    subject: 'kedi',
  },
  {
    code: 'en',
    sample: 'Cats are animals',
    subject: 'cat',
  },
  {
    code: 'de',
    sample: 'Katzen sind Tiere',
    subject: 'katzen',
  },
  {
    code: 'ar',
    sample: 'القط هو حيوان',
    subject: 'قط',
  },
];

for (const entry of cases) {
  test(`nlp pack ${entry.code} exposes the common interface`, () => {
    const nlp = createNlp(entry.code);
    assert.equal(typeof nlp.normalize, 'function');
    assert.equal(typeof nlp.tokenize, 'function');
    assert.equal(typeof nlp.isStopWord, 'function');
    assert.equal(typeof nlp.extractFacts, 'function');

    const facts = nlp.extractFacts(entry.sample);
    assert.ok(Array.isArray(facts));
    assert.ok(facts.length >= 1);
    assert.equal(nlp.normalize(entry.subject), entry.subject);
  });
}
