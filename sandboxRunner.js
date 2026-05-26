const vm = require('node:vm');

const DEFAULT_TIMEOUT_MS = 150;
const FORBIDDEN_PATTERNS = [
  /\brequire\s*\(/i,
  /\bprocess\b/i,
  /\bglobalThis\b/i,
  /\bglobal\b/i,
  /\bmodule\b/i,
  /\bexports\b/i,
  /\bFunction\b/i,
  /\beval\s*\(/i,
  /\bimport\s*\(/i,
  /\bconstructor\b/i,
  /\bchild_process\b/i,
  /\bfs\b/i,
];

function cloneValue(value) {
  if (value === undefined || value === null) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
  return JSON.parse(JSON.stringify(value));
}

function validateSandboxSource(source) {
  const text = String(source || '');
  const violations = [];
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) violations.push(pattern.source);
  }
  return {
    ok: violations.length === 0,
    violations,
  };
}

function createSandboxContext(bindings = {}) {
  const sandbox = Object.create(null);
  sandbox.input = cloneValue(bindings.input);
  sandbox.context = cloneValue(bindings.context || {});
  sandbox.console = Object.freeze({
    log() {},
    error() {},
    warn() {},
  });
  return vm.createContext(sandbox, {
    codeGeneration: {
      strings: false,
      wasm: false,
    },
  });
}

function runSandboxed(source, bindings = {}, opts = {}) {
  const timeoutMs = Number(opts.timeoutMs) > 0 ? Number(opts.timeoutMs) : DEFAULT_TIMEOUT_MS;
  const validation = validateSandboxSource(source);
  if (!validation.ok) {
    return {
      ok: false,
      data: null,
      error: {
        code: 'SANDBOX_REJECTED',
        message: 'Sandbox source contains blocked capabilities.',
        details: validation.violations,
      },
      meta: {
        runner: 'node:vm',
        timeoutMs,
      },
    };
  }

  try {
    const context = createSandboxContext(bindings);
    const script = new vm.Script(String(source || ''), {
      filename: opts.filename || 'sandbox.vm.js',
    });
    const result = script.runInContext(context, {
      timeout: timeoutMs,
      displayErrors: true,
    });
    return {
      ok: true,
      data: result === undefined ? null : cloneValue(result),
      error: null,
      meta: {
        runner: 'node:vm',
        timeoutMs,
      },
    };
  } catch (error) {
    return {
      ok: false,
      data: null,
      error: {
        code: error && error.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT' ? 'SANDBOX_TIMEOUT' : 'SANDBOX_RUNTIME',
        message: error && error.message ? error.message : 'Sandbox execution failed.',
      },
      meta: {
        runner: 'node:vm',
        timeoutMs,
      },
    };
  }
}

module.exports = {
  DEFAULT_TIMEOUT_MS,
  runSandboxed,
  validateSandboxSource,
};
