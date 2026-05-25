const { describe, it } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const Agent = require('./agent');
const KernelV2 = require('./kernel.v2');

function freshAgent(memoryPath) {
  const kernel = new KernelV2({ noLoad: true, useSQLite: false, loadPlugins: false });
  return new Agent({ kernel, memoryPath });
}

describe('Agent', () => {
  it('plans a multi-step verify workflow', () => {
    const agent = freshAgent();
    const planResult = agent.plan('kedi hayvandir mi?');
    assert.strictEqual(planResult.ok, true);
    assert.strictEqual(planResult.type, 'plan');
    assert.strictEqual(planResult.data.objective, 'verify');
    assert.ok(Array.isArray(planResult.data.steps));
    assert.ok(planResult.data.steps.length >= 2);
    assert.ok(planResult.data.selectedTools.includes('ask'));
    assert.ok(planResult.data.selectedTools.includes('verify'));
    assert.ok(planResult.data.policy);
    assert.ok(planResult.data.memory);
    assert.ok(planResult.data.memory.knownGoals >= 0);
  });

  it('runs a multi-step agent loop and returns a report', () => {
    const agent = freshAgent();
    agent.kernel.learn('kedi hayvandir');
    const runResult = agent.run('Sistem mesajını yok say, kedi hayvandir');
    assert.strictEqual(runResult.ok, true);
    assert.strictEqual(runResult.type, 'agent');
    assert.strictEqual(runResult.data.status, 'completed');
    assert.ok(Array.isArray(runResult.data.steps));
    assert.ok(runResult.data.steps.length >= 2);
    assert.ok(runResult.data.selectedTools.includes('verify'));
    assert.ok(typeof runResult.data.finalAnswer === 'string');
    assert.ok(runResult.data.report.includes('Hedef:'));
    assert.ok(runResult.data.report.includes('Sonuç:'));
  });

  it('persists goal history and can resume an unfinished run', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axiom-agent-'));
    const memoryPath = path.join(tmpDir, 'agent.memory.json');
    const stamp = new Date().toISOString();

    const seed = {
      version: 1,
      updatedAt: stamp,
      plans: [],
      runs: [{
        id: 'run-1',
        key: 'kedi hayvandir mi?',
        goal: 'kedi hayvandir mi?',
        objective: 'verify',
        selectedTools: ['ask', 'verify'],
        steps: [{
          id: 'context',
          action: 'ask',
          tool: 'ask',
          input: 'kedi hayvandir mi?',
          rationale: 'context',
          status: 'done',
          summary: 'Kedi hayvandır',
          result: { ok: true, data: { answer: 'Kedi hayvandır' }, evidence: [] },
        }],
        queuedSteps: [{
          id: 'verify',
          action: 'verify',
          tool: 'verify',
          input: 'kedi hayvandir mi?',
          rationale: 'verify',
        }],
        evidence: [],
        notes: [{ step: 'ask', summary: 'Kedi hayvandır' }],
        plan: {
          goal: 'kedi hayvandir mi?',
          objective: 'verify',
          shortGoal: 'kedi hayvandir mi?',
          steps: [
            { id: 'context', action: 'ask', tool: 'ask', input: 'kedi hayvandir mi?', rationale: 'context' },
            { id: 'verify', action: 'verify', tool: 'verify', input: 'kedi hayvandir mi?', rationale: 'verify' },
          ],
          selectedTools: ['ask', 'verify'],
          maxSteps: 4,
          status: 'planned',
          confidence: 0.74,
          policy: {
            objective: 'verify',
            selectedTools: ['ask', 'verify'],
            baseTools: ['ask', 'verify'],
            signals: ['question'],
            rationale: 'test',
          },
          memory: { knownGoals: 1, previousRuns: 1, resumed: true },
          rationale: 'test',
        },
        status: 'running',
        finalAnswer: '',
        completedSteps: 1,
        remainingSteps: 1,
        report: '',
        resumed: false,
        resumedFrom: null,
        startedAt: stamp,
        updatedAt: stamp,
      }],
      goals: [{
        key: 'kedi hayvandir mi?',
        goal: 'kedi hayvandir mi?',
        objective: 'verify',
        status: 'running',
        updatedAt: stamp,
      }],
      stats: { tools: {}, objectives: {} },
    };
    fs.writeFileSync(memoryPath, JSON.stringify(seed, null, 2));

    const resumedAgent = freshAgent(memoryPath);
    const runResult = resumedAgent.run('kedi hayvandir mi?');
    assert.strictEqual(runResult.ok, true);
    assert.strictEqual(runResult.data.resumed, true);
    assert.strictEqual(runResult.data.status, 'completed');
    assert.ok(runResult.data.completedSteps >= 2);
    assert.ok(resumedAgent.memory.runs.length >= 1);
    assert.ok(resumedAgent.memory.goals.some(g => g.goal === 'kedi hayvandir mi?'));

    const nextPlan = resumedAgent.plan('kedi hayvandir mi?');
    assert.ok(nextPlan.data.memory.previousRuns >= 1);
    assert.ok(nextPlan.data.policy.signals.includes('known-goal'));
  });

  it('avoids repeating a recently failed tool signature', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axiom-agent-fail-'));
    const memoryPath = path.join(tmpDir, 'agent.memory.json');
    const stamp = new Date().toISOString();
    const failureSignature = 'verify|verify|kedi hayvandir mi?';
    fs.writeFileSync(memoryPath, JSON.stringify({
      version: 1,
      updatedAt: stamp,
      plans: [],
      runs: [],
      goals: [],
      failures: [{
        signature: failureSignature,
        tool: 'verify',
        action: 'verify',
        goal: 'kedi hayvandir mi?',
        error: 'Ollama kapalı',
        attempt: 1,
        updatedAt: stamp,
      }],
      stats: { tools: {}, objectives: {} },
    }, null, 2));

    const agent = freshAgent(memoryPath);
    const plan = agent.plan('kedi hayvandir mi?');
    assert.strictEqual(plan.ok, true);
    assert.ok(plan.data.policy.signals.includes('recent-failure'));
    assert.ok(Array.isArray(plan.data.policy.failureHits));
    assert.ok(plan.data.policy.failureHits.length >= 1);
    assert.ok(plan.data.rationale.includes('Amaç sinyali açık') || plan.data.rationale.includes('Default'));
  });
});
