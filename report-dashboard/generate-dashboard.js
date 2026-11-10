const fs = require('fs');
const path = require('path');

// Load Results Data
const jsonPath = path.join(__dirname, '..', 'test-results', 'results.json');
if (!fs.existsSync(jsonPath)) {
  console.error(`Error: File not found at ${jsonPath}`);
  process.exit(1);
}

const rawData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const reportGeneratedAt = new Date().toLocaleString();

const envMetadata = rawData.config?.metadata?.environments || {
  Sakani: 'Pre-Prod',
  Digitar: 'STG',
  Sayal: 'Pre-Prod'
};
const globalEnv = rawData.config?.metadata?.environment || process.env.TEST_ENV || 'Pre-Prod';

function formatDuration(ms) {
  if (!ms || ms <= 0) return '0s';
  const totalSeconds = ms / 1000;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = (totalSeconds % 60).toFixed(1);

  if (hours > 0) return `${hours}h ${minutes > 0 ? minutes + 'm ' : ''}${seconds}s`.trim();
  if (minutes > 0) return `${minutes}m ${seconds}s`.trim();
  return `${seconds}s`;
}

function extractAllTests(suites, parentAnnotations = [], inheritedDescribe = '') {
  let testItems = [];

  for (const suite of suites) {
    const currentAnnotations = [...parentAnnotations, ...(suite.annotations || [])];

    let currentDescribe = inheritedDescribe;
    if (suite.title) {
      currentDescribe = suite.title;
    }

    if (suite.specs) {
      for (const spec of suite.specs) {
        const specAnnotations = [...currentAnnotations, ...(spec.annotations || [])];

        let finalSuiteTitle = spec.suiteTitle || currentDescribe || suite.title || 'General Suite';

        if (spec.tests && spec.tests.length > 0) {
          for (const test of spec.tests) {
            testItems.push({
              suiteTitle: finalSuiteTitle,
              specTitle: spec.title,
              testObj: test,
              annotations: [...specAnnotations, ...(test.annotations || [])]
            });
          }
        } else {
          testItems.push({
            suiteTitle: finalSuiteTitle,
            specTitle: spec.title,
            testObj: { status: spec.ok ? 'passed' : 'skipped', results: [] },
            annotations: specAnnotations
          });
        }
      }
    }

    if (suite.suites && suite.suites.length > 0) {
      testItems = testItems.concat(
        extractAllTests(suite.suites, currentAnnotations, currentDescribe)
      );
    }
  }

  return testItems;
}

function getProductName(annotations) {
  if (annotations && Array.isArray(annotations)) {
    for (const a of annotations) {
      if (a.product) return a.product;
      if (a.Product) return a.Product;
      if ((a.type === 'product' || a.type === 'Product') && (a.description || a.value)) {
        return a.description || a.value;
      }
      if (a.type === 'tag' && a.description) {
        const cleanTag = a.description.replace(/^@/, '');
        if (!/^p[0-4]$/i.test(cleanTag)) {
          return cleanTag.charAt(0).toUpperCase() + cleanTag.slice(1);
        }
      }
    }
  }
  return 'Sakani';
}

function getEnvironmentName(annotations, productKey) {
  if (annotations && Array.isArray(annotations)) {
    for (const a of annotations) {
      if (a.env || a.environment) return a.env || a.environment;
      if ((a.type === 'env' || a.type === 'environment') && (a.description || a.value)) {
        return a.description || a.value;
      }
    }
  }
  return envMetadata[productKey] || globalEnv;
}

function isCriticalTest(annotations) {
  if (!annotations || !Array.isArray(annotations)) return false;
  return annotations.some(a =>
    a.type === 'critical' ||
    a.type === 'Critical' ||
    a.critical === true ||
    (a.type === 'tag' && a.description && a.description.toLowerCase().includes('p1'))
  );
}

function stripAnsi(str) {
  if (!str) return '';
  return str.replace(/\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])/g, '');
}

const allTests = extractAllTests(rawData.suites || []);
const rawProcessedSpecs = [];

allTests.forEach((item, index) => {
  const productKey = getProductName(item.annotations);
  const environmentKey = getEnvironmentName(item.annotations, productKey);
  const isCritical = isCriticalTest(item.annotations);

  let status = 'Skipped';
  let testDurationMs = 0;
  let steps = [];
  let errorMessage = '';
  const lastResult = item.testObj.results?.[item.testObj.results.length - 1];

  if (lastResult) {
    testDurationMs = lastResult.duration || 0;
    if (lastResult.status === 'passed') status = 'Passed';
    else if (lastResult.status === 'failed' || lastResult.status === 'timedOut') status = 'Failed';
    else if (lastResult.status === 'skipped') status = 'Skipped';

    if (status === 'Failed') {
      const rawMsg = lastResult.error?.message ||
        (lastResult.errors && lastResult.errors.map(e => e.message).join('\n')) ||
        'Test execution failed.';
      errorMessage = stripAnsi(rawMsg);
    }

    if (lastResult.steps && Array.isArray(lastResult.steps)) {
      steps = lastResult.steps.map(step => ({
        title: stripAnsi(step.title)
      }));
    }
  } else if (item.testObj.status === 'passed') {
    status = 'Passed';
  }

  rawProcessedSpecs.push({
    id: `tc-${index + 1}`,
    suite: item.suiteTitle || 'General Suite',
    rawSuiteTitle: item.suiteTitle || 'General Suite',
    title: item.specTitle,
    product: productKey,
    environment: environmentKey,
    durationMs: testDurationMs,
    durationStr: formatDuration(testDurationMs),
    status: status,
    isCritical: isCritical,
    steps: steps,
    errorMessage: errorMessage
  });
});

const allProductKeys = Array.from(new Set(rawProcessedSpecs.map(s => s.product || 'Sakani')));
if (allProductKeys.length === 0) allProductKeys.push('Sakani');

function buildProductData(specsList) {
  const productData = {};

  allProductKeys.forEach(pKey => {
    productData[pKey] = {
      product: pKey,
      environment: envMetadata[pKey] || globalEnv,
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      durationMs: 0,
      suitesSet: new Set(),
      specs: []
    };
  });

  specsList.forEach(spec => {
    const pKey = spec.product || 'Sakani';

    if (!productData[pKey]) {
      productData[pKey] = {
        product: pKey,
        environment: spec.environment,
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        durationMs: 0,
        suitesSet: new Set(),
        specs: []
      };
    }

    productData[pKey].environment = spec.environment || productData[pKey].environment;
    productData[pKey].total += 1;
    productData[pKey].durationMs += spec.durationMs;
    if (spec.rawSuiteTitle) productData[pKey].suitesSet.add(spec.rawSuiteTitle);
    if (spec.status === 'Passed') productData[pKey].passed += 1;
    else if (spec.status === 'Failed') productData[pKey].failed += 1;
    else productData[pKey].skipped += 1;
    productData[pKey].specs.push(spec);
  });

  Object.keys(productData).forEach(key => {
    productData[key].formattedDuration = formatDuration(productData[key].durationMs);
    productData[key].suitesCount = productData[key].suitesSet.size;
  });

  return productData;
}

const healthCheckData = buildProductData(rawProcessedSpecs);
const readinessData = buildProductData(rawProcessedSpecs.filter(s => s.isCritical));

const productDropdownOptionsHtml = Object.keys(healthCheckData).map(key => `
  <div onclick="selectProductOption('${key}')" class="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-[#166242] hover:text-white cursor-pointer transition-colors flex items-center justify-between">
    <span>${healthCheckData[key].product}</span>
  </div>
`).join('');

const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Sakani Test Automation Dashboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    html, body {
      overflow-y: scroll !important;
      -ms-overflow-style: scrollbar !important;
      scrollbar-width: auto !important;
    }
    ::-webkit-scrollbar {
      display: block !important;
      width: 10px !important;
      height: 10px !important;
    }
    ::-webkit-scrollbar-track {
      background: #f1f5f9 !important;
    }
    ::-webkit-scrollbar-thumb {
      background: #cbd5e1 !important;
      border-radius: 4px !important;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: #166242 !important;
    }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 min-h-screen p-6 font-sans">
  <div class="max-w-7xl mx-auto space-y-6">
    
    <header class="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-200 gap-4">
      <div>
        <h1 class="text-2xl font-bold tracking-wide" style="color: #166242;">Sakani Automation Test Dashboard</h1>
      </div>

      <!-- Product Filter Dropdown -->
      <div class="relative inline-block text-left w-full sm:w-auto min-w-[220px]" id="productDropdownContainer">
        <button id="productDropdownBtn" onclick="toggleDropdown('productDropdownMenu')" class="w-full bg-[#166242] hover:bg-[#125036] text-white font-semibold text-sm rounded-xl px-4 py-2 border-2 border-slate-200/60 focus:outline-none focus:ring-2 focus:ring-emerald-600/40 cursor-pointer transition-all shadow-sm flex items-center justify-between gap-2.5">
          <div class="flex items-center gap-2 truncate">
            <svg class="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 6h10M3 10h8M3 14h6M3 18h4M17 6v12m0 0l-3-3m3 3l3-3"></path>
            </svg>
            <span class="truncate">Product: <strong id="productDropdownSelected" class="font-bold">${Object.keys(healthCheckData)[0] || 'Sakani'}</strong></span>
          </div>
          <svg class="w-3.5 h-3.5 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div id="productDropdownMenu" class="hidden absolute left-0 right-0 w-full mt-1.5 rounded-xl shadow-lg bg-white border border-slate-200 ring-1 ring-black ring-opacity-5 z-50 overflow-hidden">
          ${productDropdownOptionsHtml}
        </div>
      </div>
    </header>

    <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h2 class="text-sm font-bold tracking-wide" style="color: #166242;">Assessment Scope</h2>
        <p class="text-xs text-slate-500 mt-0.5">Filter metrics by critical tests (Readiness) or full suite (Health Check)</p>
      </div>
      <div class="flex items-center gap-3">
        <button id="btnReadiness" onclick="setExecutionMode('readiness')" class="px-5 py-2 text-xs font-bold rounded-lg transition-all border border-emerald-700 text-emerald-800 bg-white hover:bg-emerald-50 shadow-sm">
          Readiness
        </button>
        <button id="btnHealthCheck" onclick="setExecutionMode('health')" class="px-5 py-2 text-xs font-bold rounded-lg transition-all border border-emerald-700 bg-[#166242] text-white shadow-sm">
          Health Check
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <p class="text-xs font-bold text-slate-500 tracking-wider">Total Test Cases</p>
        <p id="totalExecuted" class="text-3xl font-extrabold text-slate-900 mt-2">0</p>
      </div>

      <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <p class="text-xs font-bold text-emerald-600 tracking-wider">Passed</p>
        <p id="passedCount" class="text-3xl font-extrabold text-emerald-600 mt-2">0</p>
      </div>

      <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <p class="text-xs font-bold text-rose-600 tracking-wider">Failed</p>
        <p id="failedCount" class="text-3xl font-extrabold text-rose-600 mt-2">0</p>
      </div>

      <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <p class="text-xs font-bold text-amber-600 tracking-wider">Skipped</p>
        <p id="skippedCount" class="text-3xl font-extrabold text-amber-600 mt-2">0</p>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
        <h2 class="text-base font-bold mb-2" style="color: #166242;">Execution Ratio</h2>
        
        <div class="relative flex items-center justify-center h-48">
          <canvas id="statusChart"></canvas>
        </div>

        <div id="customLegend" class="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-slate-100"></div>
      </div>

      <div class="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
        <h2 class="text-base font-bold mb-4" style="color: #166242;">Test Run Information</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          
          <div class="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <p class="text-slate-500 text-xs font-bold">Total Test Suites Executed</p>
            <p id="suitesScopeValue" class="font-semibold text-slate-800 mt-1">0</p>
          </div>

          <div class="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <p class="text-slate-500 text-xs font-bold">Product Scope</p>
            <p id="productScopeValue" class="font-semibold text-slate-800 mt-1">-</p>
          </div>

          <div class="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <p class="text-slate-500 text-xs font-bold">Environment</p>
            <p id="environmentValue" class="font-semibold text-slate-800 mt-1">Pre-Prod</p>
          </div>

          <div class="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <p class="text-slate-500 text-xs font-bold">Total Duration</p>
            <p id="tagDurationValue" class="font-semibold text-indigo-600 mt-1">0s</p>
          </div>

          <div class="sm:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
            <p class="text-slate-500 text-xs font-bold">Report Generated At</p>
            <p class="font-semibold text-slate-800 mt-1">${reportGeneratedAt}</p>
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <h2 class="text-base font-bold" style="color: #166242;">Test Cases (<span id="tableTagTitle">-</span>)</h2>
        
        <!-- Filters Container -->
        <div class="flex flex-wrap items-center gap-3">
          
          <!-- Suite Filter Dropdown -->
          <div class="relative inline-block text-left w-full sm:w-auto min-w-[200px]" id="suiteDropdownContainer">
            <button id="suiteDropdownBtn" onclick="toggleDropdown('suiteDropdownMenu')" class="w-full bg-[#166242] hover:bg-[#125036] text-white font-semibold text-sm rounded-xl px-4 py-2 border-2 border-slate-200/60 focus:outline-none focus:ring-2 focus:ring-emerald-600/40 cursor-pointer transition-all shadow-sm flex items-center justify-between gap-2.5">
              <div class="flex items-center gap-2 truncate">
                <svg class="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 6h10M3 10h8M3 14h6M3 18h4M17 6v12m0 0l-3-3m3 3l3-3"></path>
                </svg>
                <span class="truncate">Suite: <strong id="suiteDropdownSelected" class="font-bold">All Suites</strong></span>
              </div>
              <svg class="w-3.5 h-3.5 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div id="suiteDropdownMenu" class="hidden absolute left-0 right-0 w-full mt-1.5 rounded-lg shadow-lg bg-white border border-slate-200 ring-1 ring-black ring-opacity-5 z-50 overflow-hidden max-h-60 overflow-y-auto">
            </div>
          </div>

          <!-- Status Filter Dropdown -->
          <div class="relative inline-block text-left w-full sm:w-auto min-w-[180px]" id="statusDropdownContainer">
            <button id="statusDropdownBtn" onclick="toggleDropdown('statusDropdownMenu')" class="w-full bg-[#166242] hover:bg-[#125036] text-white font-semibold text-sm rounded-xl px-4 py-2 border-2 border-slate-200/60 focus:outline-none focus:ring-2 focus:ring-emerald-600/40 cursor-pointer transition-all shadow-sm flex items-center justify-between gap-2.5">
              <div class="flex items-center gap-2 truncate">
                <svg class="w-4 h-4 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 6h10M3 10h8M3 14h6M3 18h4M17 6v12m0 0l-3-3m3 3l3-3"></path>
                </svg>
                <span class="truncate">Status: <strong id="statusDropdownSelected" class="font-bold">All</strong></span>
              </div>
              <svg class="w-3.5 h-3.5 text-white shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div id="statusDropdownMenu" class="hidden absolute left-0 right-0 w-full mt-1.5 rounded-lg shadow-lg bg-white border border-slate-200 ring-1 ring-black ring-opacity-5 z-50 overflow-hidden">
              <div onclick="selectStatusOption('all', 'All')" class="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-[#166242] hover:text-white cursor-pointer transition-colors">All</div>
              <div onclick="selectStatusOption('passed', 'Passed')" class="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-[#166242] hover:text-white cursor-pointer transition-colors">Passed</div>
              <div onclick="selectStatusOption('failed', 'Failed')" class="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-[#166242] hover:text-white cursor-pointer transition-colors">Failed</div>
              <div onclick="selectStatusOption('skipped', 'Skipped')" class="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-[#166242] hover:text-white cursor-pointer transition-colors">Skipped</div>
            </div>
          </div>

        </div>

      </div>

      <!-- Container for dynamic Suite Tables -->
      <div id="suitesContainer" class="space-y-6"></div>
    </div>

  </div>

  <script>
    const healthCheckData = ${JSON.stringify(healthCheckData, null, 2)};
    const readinessData = ${JSON.stringify(readinessData, null, 2)};
    
    let currentMode = 'health';
    let currentStatusFilter = 'all';
    let currentSuiteFilter = 'all';
    let selectedProductKey = "${Object.keys(healthCheckData)[0] || 'Sakani'}";
    let chartInstance = null;

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    function toggleDropdown(menuId) {
      const menu = document.getElementById(menuId);
      const isHidden = menu.classList.contains('hidden');
      closeAllDropdowns();
      if (isHidden) {
        menu.classList.remove('hidden');
      }
    }

    function closeAllDropdowns() {
      const pMenu = document.getElementById('productDropdownMenu');
      const sMenu = document.getElementById('statusDropdownMenu');
      const suiteMenu = document.getElementById('suiteDropdownMenu');
      if (pMenu) pMenu.classList.add('hidden');
      if (sMenu) sMenu.classList.add('hidden');
      if (suiteMenu) suiteMenu.classList.add('hidden');
    }

    document.addEventListener('click', function(event) {
      const pContainer = document.getElementById('productDropdownContainer');
      const sContainer = document.getElementById('statusDropdownContainer');
      const suiteContainer = document.getElementById('suiteDropdownContainer');
      if ((!pContainer || !pContainer.contains(event.target)) && 
          (!sContainer || !sContainer.contains(event.target)) &&
          (!suiteContainer || !suiteContainer.contains(event.target))) {
        closeAllDropdowns();
      }
    });

    function selectProductOption(key) {
      selectedProductKey = key;
      document.getElementById('productDropdownSelected').innerText = key;
      
      if (currentMode === 'readiness') {
        currentMode = 'health';
        const btnReadiness = document.getElementById('btnReadiness');
        const btnHealthCheck = document.getElementById('btnHealthCheck');
        if (btnHealthCheck && btnReadiness) {
          btnHealthCheck.className = "px-5 py-2 text-xs font-bold rounded-lg transition-all border border-emerald-700 bg-[#166242] text-white shadow-sm";
          btnReadiness.className = "px-5 py-2 text-xs font-bold rounded-lg transition-all border border-emerald-700 text-emerald-800 bg-white hover:bg-emerald-50 shadow-sm";
        }
      }

      currentStatusFilter = 'all';
      document.getElementById('statusDropdownSelected').innerText = 'All';

      currentSuiteFilter = 'all';
      document.getElementById('suiteDropdownSelected').innerText = 'All Suites';

      closeAllDropdowns();
      renderDashboard(selectedProductKey);
    }

    function selectStatusOption(value, label) {
      currentStatusFilter = value;
      document.getElementById('statusDropdownSelected').innerText = label;
      closeAllDropdowns();
      renderDashboard(selectedProductKey);
    }

    function selectSuiteOption(value, label) {
      currentSuiteFilter = value;
      document.getElementById('suiteDropdownSelected').innerText = label;
      closeAllDropdowns();
      renderDashboard(selectedProductKey);
    }

    function toggleSteps(stepRowId, btn) {
      const stepRow = document.getElementById(stepRowId);
      if (!stepRow) return;

      const isHidden = stepRow.classList.contains('hidden');
      if (isHidden) {
        stepRow.classList.remove('hidden');
        btn.innerText = 'Hide steps';
        btn.className = "w-32 inline-block py-1.5 text-xs font-semibold rounded-md border border-emerald-700 bg-[#166242] text-white hover:bg-[#125036] transition-all shadow-sm text-center";
      } else {
        stepRow.classList.add('hidden');
        btn.innerText = 'Show steps';
        btn.className = "w-32 inline-block py-1.5 text-xs font-semibold rounded-md border border-emerald-700 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-all shadow-sm text-center";
      }
    }

    function setExecutionMode(mode) {
      currentMode = mode;
      const btnReadiness = document.getElementById('btnReadiness');
      const btnHealthCheck = document.getElementById('btnHealthCheck');

      if (mode === 'readiness') {
        btnReadiness.className = "px-5 py-2 text-xs font-bold rounded-lg transition-all border border-emerald-700 bg-[#166242] text-white shadow-sm";
        btnHealthCheck.className = "px-5 py-2 text-xs font-bold rounded-lg transition-all border border-emerald-700 text-emerald-800 bg-white hover:bg-emerald-50 shadow-sm";
      } else {
        btnHealthCheck.className = "px-5 py-2 text-xs font-bold rounded-lg transition-all border border-emerald-700 bg-[#166242] text-white shadow-sm";
        btnReadiness.className = "px-5 py-2 text-xs font-bold rounded-lg transition-all border border-emerald-700 text-emerald-800 bg-white hover:bg-emerald-50 shadow-sm";
      }

      currentSuiteFilter = 'all';
      document.getElementById('suiteDropdownSelected').innerText = 'All Suites';

      renderDashboard(selectedProductKey);
    }

    function renderDashboard(productKey) {
      const activeDataMap = currentMode === 'readiness' ? readinessData : healthCheckData;
      const availableKeys = Object.keys(activeDataMap);
      const targetKey = activeDataMap[productKey] ? productKey : availableKeys[0];
      const data = activeDataMap[targetKey] || {
        product: targetKey || selectedProductKey,
        environment: 'Pre-Prod',
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        formattedDuration: '0s',
        suitesCount: 0,
        specs: []
      };

      const total = data.total || 0;
      const passed = data.passed || 0;
      const failed = data.failed || 0;
      const skipped = data.skipped || 0;

      document.getElementById("totalExecuted").innerText = total;
      document.getElementById("passedCount").innerText = passed;
      document.getElementById("failedCount").innerText = failed;
      document.getElementById("skippedCount").innerText = skipped;
      document.getElementById("tableTagTitle").innerText = data.product;

      document.getElementById("suitesScopeValue").innerText = data.suitesCount || 0;
      document.getElementById("productScopeValue").innerText = data.product;
      document.getElementById("environmentValue").innerText = data.environment || 'Pre-Prod';
      document.getElementById("tagDurationValue").innerText = data.formattedDuration || '0s';

      const suiteMenu = document.getElementById("suiteDropdownMenu");
      const uniqueSuites = Array.from(new Set((data.specs || []).map(s => s.suite || 'General Suite')));
      
      let suiteMenuHtml = '<div onclick="selectSuiteOption(\\'all\\', \\'All Suites\\')" class="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-[#166242] hover:text-white cursor-pointer transition-colors">All Suites</div>';
      uniqueSuites.forEach(sName => {
        const escapedName = escapeHtml(sName);
        suiteMenuHtml += '<div onclick="selectSuiteOption(\\'' + escapedName + '\\', \\'' + escapedName + '\\')" class="px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-[#166242] hover:text-white cursor-pointer transition-colors">' + escapedName + '</div>';
      });
      suiteMenu.innerHTML = suiteMenuHtml;

      if (currentSuiteFilter !== 'all' && !uniqueSuites.includes(currentSuiteFilter)) {
        currentSuiteFilter = 'all';
        document.getElementById('suiteDropdownSelected').innerText = 'All Suites';
      }

      const container = document.getElementById("suitesContainer");
      container.innerHTML = "";

      const filteredSpecs = (data.specs || []).filter(spec => {
        const matchesStatus = (currentStatusFilter === 'all') || 
                              (currentStatusFilter === 'passed' && spec.status === 'Passed') || 
                              (currentStatusFilter === 'failed' && spec.status === 'Failed') || 
                              (currentStatusFilter === 'skipped' && spec.status === 'Skipped');
        
        const matchesSuite = (currentSuiteFilter === 'all') || (spec.suite === currentSuiteFilter);

        return matchesStatus && matchesSuite;
      });

      if (filteredSpecs.length === 0) {
        container.innerHTML = '<div class="py-6 text-center text-slate-400 font-medium">No test cases found for this scope.</div>';
      } else {
        const groupedBySuite = {};
        filteredSpecs.forEach(spec => {
          const sName = spec.suite || 'General Suite';
          if (!groupedBySuite[sName]) groupedBySuite[sName] = [];
          groupedBySuite[sName].push(spec);
        });

        Object.keys(groupedBySuite).forEach(suiteName => {
          const specsInSuite = groupedBySuite[suiteName];

          let rowsHtml = '';
          specsInSuite.forEach(spec => {
            let statusBadgeClass = "bg-amber-100 text-amber-800 border-amber-300";
            if (spec.status === "Passed") statusBadgeClass = "bg-emerald-100 text-emerald-800 border-emerald-300";
            if (spec.status === "Failed") statusBadgeClass = "bg-rose-100 text-rose-800 border-rose-300";

            const hasSteps = spec.steps && spec.steps.length > 0;
            const hasDetails = hasSteps || (spec.status === 'Failed' && spec.errorMessage);
            const stepRowId = 'steps-' + spec.id;

            const actionCellHtml = hasDetails 
              ? '<button onclick="toggleSteps(\\'' + stepRowId + '\\', this)" class="w-32 inline-block py-1.5 text-xs font-semibold rounded-md border border-emerald-700 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 transition-all shadow-sm text-center">Show steps</button>'
              : '<span class="text-xs text-slate-400 font-medium">No details</span>';

            rowsHtml += '<tr class="hover:bg-slate-50 transition-colors">' +
              '<td class="py-3.5 px-4 font-medium text-slate-900 break-words whitespace-normal w-[53%]">' + escapeHtml(spec.title) + '</td>' +
              '<td class="py-3.5 px-4 text-slate-600 font-mono text-xs text-center break-words whitespace-normal w-[15%]">' + spec.durationStr + '</td>' +
              '<td class="py-3.5 px-4 text-center w-[15%]"><span class="inline-block px-2.5 py-1 text-xs font-semibold border rounded-full ' + statusBadgeClass + '">' + spec.status + '</span></td>' +
              '<td class="py-3.5 px-4 text-center w-[17%]">' + actionCellHtml + '</td>' +
            '</tr>';

            if (hasDetails) {
              const stepsListHtml = spec.steps.map((step, idx) => '<li class="py-1.5 border-b border-slate-200 last:border-0"><span class="text-slate-800 font-medium break-words whitespace-normal"><strong class="text-emerald-800 font-bold mr-1.5">Step ' + (idx + 1) + ':</strong> ' + escapeHtml(step.title) + '</span></li>').join('');

              const failureReasonHtml = spec.status === 'Failed' && spec.errorMessage ? '<div class="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-md"><p class="text-xs font-bold text-rose-800 mb-1 flex items-center gap-1"><svg class="w-4 h-4 inline shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Failure Reason</p><pre class="text-xs text-rose-900 font-mono whitespace-pre-wrap break-words bg-rose-100/50 p-2 rounded max-h-60 overflow-y-auto">' + escapeHtml(spec.errorMessage) + '</pre></div>' : '';

              rowsHtml += '<tr id="' + stepRowId + '" class="hidden bg-slate-100/70 border-b border-slate-200"><td colspan="4" class="py-3 px-6"><div class="bg-white rounded-lg border border-slate-200 p-3 shadow-inner">' + failureReasonHtml + (hasSteps ? '<p class="text-xs font-bold text-slate-700 mb-2 pb-1 border-b border-slate-100">Execution Steps</p><ul class="space-y-0.5">' + stepsListHtml + '</ul>' : '') + '</div></td></tr>';
            }
          });

          const suiteTableHtml = '<div class="space-y-2">' +
            '<h3 class="text-sm font-bold text-slate-800 px-1">' + escapeHtml(suiteName) + '</h3>' +
            '<div class="overflow-x-auto border border-slate-200 rounded-xl">' +
              '<table class="w-full text-left text-sm text-slate-700 table-fixed">' +
                '<thead class="bg-slate-100 text-slate-500 text-xs font-bold border-b border-slate-200">' +
                  '<tr>' +
                    '<th class="py-3 px-4 font-bold w-[53%]">Test Case</th>' +
                    '<th class="py-3 px-4 font-bold w-[15%] text-center">Duration</th>' +
                    '<th class="py-3 px-4 font-bold w-[15%] text-center">Status</th>' +
                    '<th class="py-3 px-4 font-bold w-[17%] text-center">Test Steps</th>' +
                  '</tr>' +
                '</thead>' +
                '<tbody class="divide-y divide-slate-200">' + rowsHtml + '</tbody>' +
              '</table>' +
            '</div>' +
          '</div>';

          container.insertAdjacentHTML('beforeend', suiteTableHtml);
        });
      }

      const passedPct = total > 0 ? ((passed / total) * 100).toFixed(1) + '%' : '0.0%';
      const failedPct = total > 0 ? ((failed / total) * 100).toFixed(1) + '%' : '0.0%';
      const skippedPct = total > 0 ? ((skipped / total) * 100).toFixed(1) + '%' : '0.0%';

      const legendContainer = document.getElementById('customLegend');
      legendContainer.innerHTML = '<div class="flex flex-col items-center text-center"><div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-[#10B981] inline-block"></span><span class="text-xs font-semibold" style="color: #166242;">Passed</span></div><span class="text-sm font-bold text-slate-900 mt-0.5">' + passedPct + '</span></div>' +
        '<div class="flex flex-col items-center text-center"><div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-[#EF4444] inline-block"></span><span class="text-xs font-semibold" style="color: #166242;">Failed</span></div><span class="text-sm font-bold text-slate-900 mt-0.5">' + failedPct + '</span></div>' +
        '<div class="flex flex-col items-center text-center"><div class="flex items-center gap-1.5"><span class="w-3 h-3 rounded-sm bg-[#F59E0B] inline-block"></span><span class="text-xs font-semibold" style="color: #166242;">Skipped</span></div><span class="text-sm font-bold text-slate-900 mt-0.5">' + skippedPct + '</span></div>';

      if (chartInstance) chartInstance.destroy();

      const ctx = document.getElementById('statusChart').getContext('2d');
      chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Passed', 'Failed', 'Skipped'],
          datasets: [{
            data: [passed, failed, skipped],
            backgroundColor: ['#10B981', '#EF4444', '#F59E0B'],
            borderWidth: 2,
            borderColor: '#FFFFFF'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: function(context) {
                  const label = context.label || '';
                  const value = context.raw || 0;
                  const totalVal = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = totalVal > 0 ? ((value / totalVal) * 100).toFixed(1) + '%' : '0.0%';
                  return label + ': ' + value + ' (' + percentage + ')';
                }
              }
            }
          },
          cutout: '60%'
        }
      });
    }

    setExecutionMode('health');
  </script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'dashboard.html'), htmlContent);
console.log('✅ Dashboard generated successfully.');