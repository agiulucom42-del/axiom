const { describe, it } = require('node:test');
const assert = require('node:assert');
const { loadFixture, runBenchmarks } = require('./bench');

describe('Benchmark fixtures', () => {
  it('loads deterministic fixture arrays', () => {
    assert(Array.isArray(loadFixture('small')));
    assert(Array.isArray(loadFixture('medium')));
    assert(Array.isArray(loadFixture('large')));
    assert(Array.isArray(loadFixture('xlarge')));
  });

  it('runs a quick benchmark pass', () => {
    const results = runBenchmarks({ fixtures: ['small'], iterations: 1 });
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].label, 'small');
    assert.ok(results[0].learn.avgMs >= 0);
    assert.ok(results[0].ask.avgMs >= 0);
  });

  it('runs the xlarge fixture without dropping graph size', () => {
    const results = runBenchmarks({ fixtures: ['xlarge'], iterations: 1 });
    assert.strictEqual(results[0].label, 'xlarge');
    assert.ok(results[0].nodes >= 80);
    assert.ok(results[0].edges >= 80);
  });
});
