const Dream = require('./dream');

const DEFAULT_MAX_STEPS = 4;

function normalizeGoal(goal) {
  return String(goal || '').trim();
}

function lower(goal) {
  return normalizeGoal(goal).toLowerCase();
}

function firstWords(text, count = 3) {
  return normalizeGoal(text)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, count)
    .join(' ');
}

function stripQuestionMarks(text) {
  return String(text || '').replace(/[؟?]+/g, '').trim();
}

class Agent {
  constructor(opts = {}) {
    this.kernel = opts.kernel;
    this.plugins = this.kernel?.plugins;
    this.dream = opts.dream || (this.kernel ? new Dream(this.kernel) : null);
    this.maxSteps = opts.maxSteps || DEFAULT_MAX_STEPS;
    this.lastPlan = null;
    this.lastRun = null;
    this.activeGoal = null;
  }

  _emit(event, data) {
    if (this.plugins && typeof this.plugins.emit === 'function') {
      this.plugins.emit(event, data);
    }
    return data;
  }

  _ok(type, data = null, evidence = [], meta = {}) {
    if (this.kernel && typeof this.kernel._ok === 'function') {
      return this.kernel._ok(type, data, evidence, meta);
    }
    return {
      ok: true,
      type,
      data,
      evidence: Array.isArray(evidence) ? evidence : [],
      error: null,
      meta,
    };
  }

  _collectEvidence(items = []) {
    const evidence = [];
    for (const item of items) {
      if (item && Array.isArray(item.evidence)) evidence.push(...item.evidence);
    }
    return evidence.filter(Boolean);
  }

  _objective(goal) {
    const text = lower(goal);
    if (/(öğren|ekle|kaydet|teach|learn)/i.test(text)) return 'learn';
    if (/(karşılaştır|kıyas|compare|vs)/i.test(text)) return 'compare';
    if (/(neden|niçin|why)/i.test(text)) return 'reason';
    if (/(doğrula|kontrol et|verify|çeliş|risk|manipül)/i.test(text)) return 'verify';
    if (/\b(mi|mı|mu|mü)\b/.test(text) || /\?$/.test(text)) return 'verify';
    if (/(hipotez|öner|dream|rüya|fikir)/i.test(text)) return 'dream';
    if (/(plan|görev|task|ajan|workflow|yap)/i.test(text)) return 'plan';
    return 'investigate';
  }

  _buildPlan(goal, opts = {}) {
    const objective = this._objective(goal);
    const cleanedGoal = normalizeGoal(goal);
    const shortGoal = firstWords(cleanedGoal, 5);
    const steps = [];
    const selectedTools = [];

    const pushStep = (id, action, tool, input, rationale) => {
      steps.push({ id, action, tool, input, rationale });
      if (!selectedTools.includes(tool)) selectedTools.push(tool);
    };

    if (objective === 'learn') {
      pushStep('ingest', 'learn', 'learn', cleanedGoal, 'İstek bilgi eklemeye dönük.');
      pushStep('confirm', 'verify', 'verify', cleanedGoal, 'Yeni bilgi mümkünse doğrulanır.');
    } else if (objective === 'compare') {
      pushStep('context', 'ask', 'ask', cleanedGoal, 'Karşılaştırma için bağlam toplanır.');
      pushStep('compare', 'compare', 'compare', cleanedGoal, 'İki varlık arasındaki farklar çıkarılır.');
    } else if (objective === 'reason') {
      pushStep('context', 'ask', 'ask', cleanedGoal, 'Sebep analizi için bağlam alınır.');
      pushStep('reason', 'reason', 'reason', cleanedGoal, 'Neden-sonuç zinciri oluşturulur.');
    } else if (objective === 'verify') {
      pushStep('context', 'ask', 'ask', cleanedGoal, 'İddianın grafikteki durumu kontrol edilir.');
      pushStep('verify', 'verify', 'verify', cleanedGoal, 'Doğruluk ve çelişki denetlenir.');
      pushStep('fallback', 'dream', 'dream', {}, 'Sonuç bilinmiyorsa hipotez üretip boşluğu işaretler.');
    } else if (objective === 'dream') {
      pushStep('dream', 'dream', 'dream', {}, 'Hipotez ve bağlamsal öneri üretilir.');
      pushStep('context', 'ask', 'ask', cleanedGoal, 'Hipotez sonrası bağlam açılır.');
    } else if (objective === 'plan') {
      pushStep('context', 'ask', 'ask', cleanedGoal, 'Görevin kapsamı netleştirilir.');
      pushStep('verify', 'verify', 'verify', cleanedGoal, 'Kritik iddia veya kısıtlar doğrulanır.');
      pushStep('dream', 'dream', 'dream', {}, 'Alternatif yol ve riskler keşfedilir.');
    } else {
      pushStep('context', 'ask', 'ask', cleanedGoal, 'Genel bağlam toplanır.');
      pushStep('verify', 'verify', 'verify', cleanedGoal, 'Mevcut iddia destekleniyor mu kontrol edilir.');
      pushStep('dream', 'dream', 'dream', {}, 'Eksik alanlar için hipotez üretilir.');
    }

    const limitedSteps = steps.slice(0, Math.max(1, opts.maxSteps || this.maxSteps));
    const plan = {
      goal: cleanedGoal,
      objective,
      shortGoal,
      steps: limitedSteps,
      selectedTools,
      maxSteps: Math.max(1, opts.maxSteps || this.maxSteps),
      status: 'planned',
      confidence: objective === 'investigate' ? 0.58 : 0.74,
      rationale: objective === 'investigate'
        ? 'Genel amaç belirsiz; önce bağlam topla, sonra karar ver.'
        : 'Amaç sinyali açık; ilgili araçlar sıralandı.',
    };

    this.lastPlan = plan;
    this.activeGoal = cleanedGoal;
    this._emit('beforePlan', plan);
    this._emit('afterPlan', plan);
    return this._ok('plan', plan, [], { objective });
  }

  plan(goal, opts = {}) {
    return this._buildPlan(goal, opts);
  }

  _extractAgentSummary(result) {
    if (!result || typeof result !== 'object') return { text: '', status: 'unknown', evidence: [] };
    const data = result.data && typeof result.data === 'object' ? result.data : {};
    const evidence = Array.isArray(result.evidence) ? result.evidence : [];
    return {
      text:
        data.answer ||
        data.explanation ||
        data.summary ||
        data.reason ||
        data.hypothesis ||
        data.status ||
        '',
      status: data.status || 'unknown',
      evidence,
      data,
    };
  }

  _chooseFollowUp(step, summary, state) {
    if (step.action === 'verify') {
      if (summary.status === 'bilinmiyor') return { action: 'dream', tool: 'dream', input: {} };
      return null;
    }
    if (step.action === 'ask') {
      if (!summary.text || summary.text === 'Bilmiyorum') return { action: 'dream', tool: 'dream', input: {} };
      if (state.objective === 'verify') return { action: 'verify', tool: 'verify', input: state.goal };
      if (state.objective === 'reason') return { action: 'reason', tool: 'reason', input: state.goal };
    }
    if (step.action === 'compare' && (!summary.text || summary.text === 'Bilmiyorum')) {
      return { action: 'dream', tool: 'dream', input: {} };
    }
    if (step.action === 'dream') {
      return null;
    }
    if (step.action === 'learn') {
      return { action: 'verify', tool: 'verify', input: state.goal };
    }
    return null;
  }

  _executeStep(step, state, opts = {}) {
    this._emit('beforeTask', { step, state, opts });
    let result;

    switch (step.tool) {
      case 'learn':
        result = this.kernel.learn(step.input, opts.learnOpts || {});
        break;
      case 'ask':
        result = this.kernel.ask(step.input, opts.askOpts || {});
        break;
      case 'verify':
        result = this.kernel.verify(step.input, opts.verifyOpts || {});
        break;
      case 'reason':
        result = this.kernel.reason(stripQuestionMarks(step.input || state.goal), opts.reasonOpts || {});
        break;
      case 'compare': {
        const text = String(step.input || state.goal);
        const parts = text.split('|').map(s => s.trim()).filter(Boolean);
        if (parts.length >= 2) {
          result = this.kernel.compare(parts[0], parts[1], opts.compareOpts || {});
        } else {
          result = this.kernel.compare(firstWords(text, 2), firstWords(text.split(/\s+/).slice(2).join(' '), 2), opts.compareOpts || {});
        }
        break;
      }
      case 'dream':
        result = this.dream ? this.dream.dream(opts.dreamOpts || {}) : this.kernel.dream(opts.dreamOpts || {});
        break;
      default:
        result = this.kernel.ask(state.goal, opts.askOpts || {});
        break;
    }

    const summary = this._extractAgentSummary(result);
    const stepReport = {
      id: step.id,
      action: step.action,
      tool: step.tool,
      input: step.input,
      rationale: step.rationale,
      status: result?.ok === false ? 'error' : 'done',
      summary: summary.text || '',
      result,
    };
    this._emit('afterTask', { step: stepReport, state, opts });
    return stepReport;
  }

  run(goal, opts = {}) {
    const planResult = this.plan(goal, opts);
    const plan = planResult.data;
    const state = {
      goal: plan.goal,
      objective: plan.objective,
      selectedTools: [...plan.selectedTools],
      steps: [],
      evidence: [],
      status: 'running',
      notes: [],
    };
    this._emit('beforeAgentRun', state);

    const queued = [...plan.steps];
    while (queued.length > 0 && state.steps.length < plan.maxSteps) {
      const step = queued.shift();
      const report = this._executeStep(step, state, opts);
      state.steps.push(report);
      state.evidence.push(...this._collectEvidence([report.result]));
      state.notes.push({
        step: report.action,
        summary: report.summary,
      });

      const summary = this._extractAgentSummary(report.result);
      const followUp = this._chooseFollowUp(step, summary, state);
      if (followUp && state.steps.length < plan.maxSteps) {
        queued.unshift({
          id: `${followUp.action}-${state.steps.length + 1}`,
          action: followUp.action,
          tool: followUp.tool,
          input: followUp.input,
          rationale: `Önceki adımın sonucu ek adım gerektirdi.`,
        });
      }
    }

    const finalStep = state.steps[state.steps.length - 1];
    const finalSummary = finalStep ? this._extractAgentSummary(finalStep.result) : { text: '' };
    const finalAnswer = finalSummary.text || 'Ajan görevi tamamladı ancak kısa özet üretilemedi.';
    state.status = finalStep && finalStep.result && finalStep.result.ok === false ? 'blocked' : 'completed';
    state.finalAnswer = finalAnswer;
    state.completedSteps = state.steps.length;
    state.remainingSteps = Math.max(0, plan.maxSteps - state.steps.length);
    state.report = this._renderReport(state);
    this.lastRun = state;
    this._emit('afterAgentRun', state);

    return this._ok('agent', state, state.evidence, {
      objective: plan.objective,
      selectedTools: plan.selectedTools,
    });
  }

  _renderReport(state) {
    const stepLines = state.steps.map((step, index) => {
      const summary = step.summary ? ` - ${step.summary}` : '';
      return `${index + 1}. ${step.action} (${step.tool})${summary}`;
    });
    return [
      `Hedef: ${state.goal}`,
      `Amaç: ${state.objective}`,
      `Durum: ${state.status}`,
      `Adım sayısı: ${state.completedSteps}`,
      ...stepLines,
      `Sonuç: ${state.finalAnswer}`,
    ].join('\n');
  }
}

module.exports = Agent;
