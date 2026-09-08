const form = document.getElementById('diligenceForm');
const $ = (id) => document.getElementById(id);
let lastResult = null;
let lastInput = null;

function values() {
  const raw = Object.fromEntries(new FormData(form).entries());
  const numeric = ['aiInventory','humanOversight','monitoring','incidentResponse','documentation','dataRights','privacyReview','dataLineage','retentionControls','evaluation','securityTesting','fallbackPlan','reproducibility','moatEvidence','unitEconomics','vendorResilience','customerProof'];
  numeric.forEach(k => raw[k] = Number(raw[k]));
  return raw;
}

function render(result) {
  $('score').textContent = result.score;
  $('tier').textContent = `${result.tier} risk`;
  $('decision').textContent = result.decision;
  $('scoreRing').style.setProperty('--score', `${result.score * 3.6}deg`);

  $('categoryBars').innerHTML = Object.entries(result.categories).map(([name, score]) => `
    <div class="bar-row"><div><span>${name}</span><strong>${score}</strong></div><div class="track"><i style="width:${score}%"></i></div></div>
  `).join('');

  $('flags').innerHTML = result.flags.length ? result.flags.slice(0, 5).map(f => `
    <article class="flag"><span class="severity ${f.severity}">${f.severity}</span><div><strong>${f.title}</strong><p>${f.detail}</p><small>${f.question}</small></div></article>
  `).join('') : '<p class="good">No material rule-based red flags triggered.</p>';

  $('strengths').innerHTML = result.strengths.length
    ? result.strengths.map(s => `<p class="strength">${s}</p>`).join('')
    : '<p class="muted">No category scored above the strength threshold yet.</p>';

  $('copyMemo').disabled = false;
  $('downloadJson').disabled = false;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  lastInput = values();
  lastResult = window.KleinModel.scoreCompany(lastInput);
  render(lastResult);
  $('outputPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

$('loadSample').addEventListener('click', () => {
  const sample = {
    companyName: 'Northstar AI', coreAI: 'yes', highImpact: 'yes', regulated: 'yes',
    aiInventory: '50', humanOversight: '0', monitoring: '50', incidentResponse: '0', documentation: '50',
    dataRights: '50', privacyReview: '0', dataLineage: '50', retentionControls: '50',
    evaluation: '50', securityTesting: '0', fallbackPlan: '50', reproducibility: '50',
    moatEvidence: '50', unitEconomics: '50', vendorResilience: '0', customerProof: '100'
  };
  Object.entries(sample).forEach(([key, value]) => {
    const el = form.elements[key];
    if (el) el.value = value;
  });
  form.requestSubmit();
});

$('copyMemo').addEventListener('click', async () => {
  if (!lastResult) return;
  await navigator.clipboard.writeText(lastResult.memo);
  const old = $('copyMemo').textContent;
  $('copyMemo').textContent = 'Copied';
  setTimeout(() => $('copyMemo').textContent = old, 1200);
});

$('downloadJson').addEventListener('click', () => {
  if (!lastResult) return;
  const payload = { generatedAt: new Date().toISOString(), input: lastInput, result: lastResult };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${(lastInput.companyName || 'company').toLowerCase().replace(/[^a-z0-9]+/g,'-')}-kleinos-diligence.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});
