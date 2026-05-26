const { describe, it } = require('node:test');
const assert = require('node:assert');

const { runSandboxed, validateSandboxSource } = require('./sandboxRunner');

describe('Sandbox Runner', () => {
  it('executes simple code with cloned input', () => {
    const result = runSandboxed('({ total: input.a + input.b, safe: true })', {
      input: { a: 2, b: 3 },
    });
    assert.strictEqual(result.ok, true);
    assert.deepStrictEqual(result.data, { total: 5, safe: true });
    assert.strictEqual(result.meta.runner, 'node:vm');
  });

  it('rejects blocked capabilities before execution', () => {
    const validation = validateSandboxSource('require("fs").readFileSync("x")');
    assert.strictEqual(validation.ok, false);
    const result = runSandboxed('require("fs").readFileSync("x")');
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.error.code, 'SANDBOX_REJECTED');
  });

  it('times out infinite loops', () => {
    const result = runSandboxed('while (true) {}', {}, { timeoutMs: 25 });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.error.code, 'SANDBOX_TIMEOUT');
  });
});
