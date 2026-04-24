var API_URL = window.location.protocol === 'file:' ? 'http://localhost:3000/bfhl' : '/bfhl';

const inputEl = document.getElementById('data-input');
const btnSubmit = document.getElementById('btn-submit');
const btnExample = document.getElementById('btn-example');
const btnClear = document.getElementById('btn-clear');
const btnText = document.getElementById('btn-text');
const btnLoader = document.getElementById('btn-loader');
const errorBox = document.getElementById('error-box');
const errorMsg = document.getElementById('error-msg');
const resultsSection = document.getElementById('results');
const identityBlock = document.getElementById('identity-block');
const statsRow = document.getElementById('stats-row');
const hierarchyList = document.getElementById('hierarchy-list');
const invalidList = document.getElementById('invalid-list');
const duplicateList = document.getElementById('duplicate-list');
const rawJson = document.getElementById('raw-json');

const EXAMPLE = 'A->B, A->C, B->D, C->E, E->F, X->Y, Y->Z, Z->X, P->Q, Q->R, G->H, G->H, G->I, hello, 1->2, A->';

btnSubmit.addEventListener('click', handleSubmit);

btnExample.addEventListener('click', function () {
  inputEl.value = EXAMPLE;
  errorBox.hidden = true;
});

btnClear.addEventListener('click', function () {
  inputEl.value = '';
  errorBox.hidden = true;
  resultsSection.hidden = true;
});

inputEl.addEventListener('keydown', function (e) {
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') handleSubmit();
});

async function handleSubmit() {
  var raw = inputEl.value.trim();
  if (!raw) {
    showError('Please enter some data first.');
    return;
  }

  errorBox.hidden = true;
  setLoading(true);

  try {
    var dataArray = parseInput(raw);
    var res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: dataArray })
    });

    if (!res.ok) {
      var err = await res.json().catch(function () { return {}; });
      throw new Error(err.error || 'Server returned ' + res.status);
    }

    var result = await res.json();
    renderResults(result);
  } catch (err) {
    showError(err.message || 'Could not connect to the API.');
  } finally {
    setLoading(false);
  }
}

function parseInput(raw) {
  var trimmed = raw.trim();
  if (trimmed.startsWith('[')) {
    try {
      var parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch (e) {}
  }
  return trimmed.split(/[,\n]+/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 0; });
}

function renderResults(data) {
  resultsSection.hidden = false;

  identityBlock.innerHTML =
    '<div class="identity-row">' +
    idItem('User ID', data.user_id) +
    idItem('Email', data.email_id) +
    idItem('Roll No', data.college_roll_number) +
    '</div>';

  var s = data.summary || {};
  statsRow.innerHTML =
    '<div class="stat-card trees"><div class="stat-value">' + s.total_trees + '</div><div class="stat-label">Trees</div></div>' +
    '<div class="stat-card cycles"><div class="stat-value">' + s.total_cycles + '</div><div class="stat-label">Cycles</div></div>' +
    '<div class="stat-card root"><div class="stat-value">' + esc(s.largest_tree_root || '—') + '</div><div class="stat-label">Largest Root</div></div>';

  hierarchyList.innerHTML = (data.hierarchies || []).map(function (h) {
    var cyclic = h.has_cycle === true;
    var cls = cyclic ? 'hierarchy-card cyclic' : 'hierarchy-card';
    var badge = cyclic
      ? '<span class="hc-badge cycle-badge">Cycle</span>'
      : '<span class="hc-badge tree-badge">Tree</span>';
    var depth = cyclic ? '' : '<span>Depth: ' + h.depth + '</span>';
    var body = cyclic
      ? '<div class="cycle-msg">⟳ Cyclic group — no tree structure</div>'
      : '<div class="tree-view">' + renderTree(h.tree) + '</div>';

    return '<div class="' + cls + '">' +
      '<div class="hc-header">' +
      '<div class="hc-root">' + esc(h.root) + '</div>' +
      '<div class="hc-info"><h4>Root: ' + esc(h.root) + '</h4>' + depth + '</div>' +
      badge +
      '</div>' +
      '<div class="hc-body">' + body + '</div>' +
      '</div>';
  }).join('');

  invalidList.innerHTML = renderTags(data.invalid_entries, 'invalid');
  duplicateList.innerHTML = renderTags(data.duplicate_edges, 'duplicate');
  rawJson.textContent = JSON.stringify(data, null, 2);
  resultsSection.scrollIntoView({ behavior: 'smooth' });
}

function renderTree(obj) {
  if (!obj || typeof obj !== 'object') return '';
  var keys = Object.keys(obj).sort();
  return keys.map(function (key) {
    var children = obj[key];
    var childKeys = children ? Object.keys(children) : [];
    var isLeaf = childKeys.length === 0;
    var leafCls = isLeaf ? ' leaf' : '';
    var childHTML = isLeaf ? '' : renderTree(children);
    return '<div class="tree-node' + leafCls + '"><div class="tree-node-label">' + esc(key) + '</div>' + childHTML + '</div>';
  }).join('');
}

function renderTags(arr, type) {
  if (!arr || arr.length === 0) return '<span class="tag none">None</span>';
  return arr.map(function (v) { return '<span class="tag ' + type + '">' + esc(v) + '</span>'; }).join('');
}

function idItem(label, value) {
  return '<div class="identity-item"><span class="label">' + label + '</span><span class="value">' + esc(value || '—') + '</span></div>';
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorBox.hidden = false;
}

function setLoading(on) {
  btnSubmit.disabled = on;
  btnText.hidden = on;
  btnLoader.hidden = !on;
}

function esc(str) {
  var d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
