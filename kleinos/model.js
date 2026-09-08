(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.KleinModel = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, Number(n) || 0));
  const avg = (pairs) => {
    const totalWeight = pairs.reduce((sum, [, w]) => sum + w, 0);
    return totalWeight ? pairs.reduce((sum, [v, w]) => sum + clamp(v) * w, 0) / totalWeight : 0;
  };

  function scoreCompany(input) {
    const governance = avg([
      [input.aiInventory, 1.0],
      [input.humanOversight, 1.2],
      [input.monitoring, 1.1],
      [input.incidentResponse, 1.0],
      [input.documentation, 0.9]
    ]);

    const data = avg([
      [input.dataRights, 1.3],
      [input.privacyReview, 1.2],
      [input.dataLineage, 1.0],
      [input.retentionControls, 0.8]
    ]);

    const technical = avg([
      [input.evaluation, 1.4],
      [input.securityTesting, 1.2],
      [input.fallbackPlan, 0.9],
      [input.reproducibility, 0.8]
    ]);

    const commercial = avg([
      [input.moatEvidence, 1.3],
      [input.unitEconomics, 1.0],
      [input.vendorResilience, 0.9],
      [input.customerProof, 1.2]
    ]);

    const categories = {
      Governance: Math.round(governance),
      Data: Math.round(data),
      Technical: Math.round(technical),
      Commercial: Math.round(commercial)
    };

    let score = avg([
      [governance, 0.30],
      [data, 0.25],
      [technical, 0.25],
      [commercial, 0.20]
    ]);

    const flags = [];
    const addFlag = (severity, title, detail, question) => flags.push({ severity, title, detail, question });

    if (input.highImpact === 'yes' && clamp(input.humanOversight) < 50) {
      addFlag('critical', 'High-impact automation lacks robust human oversight',
        'The company uses AI in consequential decisions without a mature review mechanism.',
        'What decisions can the system make without a human, and how can those decisions be challenged or reversed?');
      score -= 14;
    }

    if (input.coreAI === 'yes' && clamp(input.evaluation) < 50) {
      addFlag('high', 'Core AI product lacks a credible evaluation program',
        'A company whose product depends on AI should be able to show repeatable quality, safety and regression testing.',
        'Show the evaluation set, failure thresholds, regression history and release gates for the core model workflow.');
      score -= 10;
    }

    if (clamp(input.dataRights) < 50) {
      addFlag('high', 'Training or customer-data rights are unclear',
        'Weak evidence of data rights can create legal, commercial and platform risk.',
        'Provide the contractual basis, licences and provenance records for training, fine-tuning and customer data.');
      score -= 10;
    }

    if (input.regulated === 'yes' && clamp(input.privacyReview) < 50) {
      addFlag('high', 'Regulated-market diligence is underdeveloped',
        'The company targets a regulated sector but has limited evidence of formal risk or privacy review.',
        'Which regulatory obligations have been mapped to product controls, owners and evidence?');
      score -= 8;
    }

    if (clamp(input.vendorResilience) < 50 && input.coreAI === 'yes') {
      addFlag('medium', 'Material dependency on a single model or infrastructure vendor',
        'Concentration can affect margin, uptime, roadmap control and negotiating leverage.',
        'What happens to gross margin, latency and product quality if the primary AI vendor changes price, policy or availability?');
      score -= 5;
    }

    if (clamp(input.securityTesting) < 50) {
      addFlag('medium', 'AI-specific security testing is immature',
        'Prompt injection, data leakage, model abuse and unsafe tool execution may not be tested systematically.',
        'Show the most recent adversarial test results and the controls that prevent data leakage or unsafe tool actions.');
      score -= 5;
    }

    if (clamp(input.incidentResponse) < 50 && clamp(input.monitoring) < 50) {
      addFlag('medium', 'Limited post-deployment detection and response',
        'Failures may reach customers before the company can detect, triage or contain them.',
        'How are AI incidents detected, severity-rated, escalated and communicated to customers?');
      score -= 5;
    }

    if (clamp(input.customerProof) < 50 && clamp(input.moatEvidence) < 50) {
      addFlag('medium', 'AI story is ahead of commercial proof',
        'Differentiation and customer evidence are both weak, increasing the risk of an easily replicated wrapper.',
        'Which customer outcome is uniquely better because of your proprietary data, workflow, distribution or model capability?');
      score -= 6;
    }

    score = Math.round(clamp(score));

    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    flags.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);

    let tier = 'Low';
    if (score < 45 || flags.some(f => f.severity === 'critical')) tier = 'Critical';
    else if (score < 60 || flags.filter(f => f.severity === 'high').length >= 2) tier = 'High';
    else if (score < 75 || flags.some(f => f.severity === 'high')) tier = 'Medium';

    const decision = score >= 78 && tier !== 'High' && tier !== 'Critical'
      ? 'Proceed'
      : score >= 62 && tier !== 'Critical'
        ? 'Proceed with conditions'
        : 'Deep diligence required';

    return {
      score,
      tier,
      decision,
      categories,
      flags,
      strengths: buildStrengths(categories, input),
      memo: buildMemo(input, score, tier, decision, categories, flags)
    };
  }

  function buildStrengths(categories, input) {
    const strengths = Object.entries(categories)
      .filter(([, score]) => score >= 75)
      .sort((a, b) => b[1] - a[1])
      .map(([name, score]) => `${name} maturity is comparatively strong (${score}/100).`);

    if (clamp(input.customerProof) >= 75) strengths.push('Customer proof is well evidenced.');
    if (clamp(input.moatEvidence) >= 75) strengths.push('The company presents credible evidence of an AI-specific moat.');
    if (clamp(input.evaluation) >= 75) strengths.push('Model evaluation appears repeatable and release-oriented.');
    return [...new Set(strengths)].slice(0, 4);
  }

  function buildMemo(input, score, tier, decision, categories, flags) {
    const name = (input.companyName || 'Target company').trim();
    const summary = `${name} scores ${score}/100 on KleinOS Venture Diligence, with ${tier.toLowerCase()} residual AI risk. Recommended IC posture: ${decision}.`;
    const categoryLine = Object.entries(categories).map(([k, v]) => `${k} ${v}/100`).join('; ');
    const redFlags = flags.length
      ? flags.slice(0, 4).map((f, i) => `${i + 1}. ${f.title}: ${f.detail}`).join('\n')
      : 'No material red flags were triggered by the current assessment.';
    const questions = flags.length
      ? flags.slice(0, 5).map((f, i) => `${i + 1}. ${f.question}`).join('\n')
      : '1. Validate the strongest controls with documentary evidence before close.\n2. Re-run the assessment at the next financing or material product change.';

    return `KLEINOS VENTURE DILIGENCE — IC SNAPSHOT\n\nCompany: ${name}\nAssessment score: ${score}/100\nResidual AI risk: ${tier}\nRecommendation: ${decision}\n\nEXECUTIVE VIEW\n${summary}\n\nCATEGORY SCORES\n${categoryLine}\n\nTOP RISKS\n${redFlags}\n\nDILIGENCE QUESTIONS\n${questions}\n\nNOTE\nThis is a structured diligence aid, not legal, regulatory, investment or financial advice. Scores should be validated against evidence, management interviews and specialist review.`;
  }

  return { scoreCompany };
});
