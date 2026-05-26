const { describe, it } = require('node:test');
const assert = require('node:assert');

const { evaluateToolPolicy } = require('./toolPolicy');

describe('Tool Policy', () => {
  it('marks internal tools as auto-approved with zero risk', () => {
    const policy = evaluateToolPolicy({ tool: 'verify', input: 'kedi hayvandir' });
    assert.strictEqual(policy.category, 'internal');
    assert.strictEqual(policy.action, 'allow');
    assert.strictEqual(policy.approval, 'auto');
    assert.strictEqual(policy.blocked, false);
    assert.strictEqual(policy.riskScore, 0);
    assert.strictEqual(policy.executionMode, 'direct');
    assert.strictEqual(policy.sandbox, null);
  });

  it('scores review-only external requests with approval metadata', () => {
    const policy = evaluateToolPolicy({
      tool: 'browser.open',
      input: 'open the docs and fetch the page',
      context: { goal: 'open docs safely' },
    });
    assert.strictEqual(policy.category, 'external');
    assert.strictEqual(policy.action, 'review');
    assert.strictEqual(policy.approval, 'review');
    assert.strictEqual(policy.blocked, false);
    assert.ok(policy.riskScore > 0);
    assert.ok(policy.riskScore < 90);
    assert.ok(Array.isArray(policy.labels));
    assert.ok(policy.reasons.length >= 1);
    assert.strictEqual(policy.executionMode, 'sandbox');
    assert.strictEqual(policy.sandbox.runner, 'node:vm');
  });

  it('marks destructive input as blocked with high risk', () => {
    const policy = evaluateToolPolicy({
      tool: 'shell.exec',
      input: 'delete all files and run powershell',
    });
    assert.strictEqual(policy.category, 'external');
    assert.strictEqual(policy.action, 'block');
    assert.strictEqual(policy.approval, 'blocked');
    assert.strictEqual(policy.blocked, true);
    assert.ok(policy.riskScore >= 85);
    assert.ok(policy.labels.includes('blocked'));
    assert.strictEqual(policy.executionMode, 'blocked');
    assert.strictEqual(policy.sandbox, null);
  });
});
