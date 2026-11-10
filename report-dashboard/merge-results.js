const fs = require('fs');
const path = require('path');

// Resolve directories relative to the project root
const rootDir = process.cwd();
const historyDir = path.join(rootDir, 'report-dashboard/test-reports-history');
const outputDir = path.join(rootDir, 'test-results');

if (!fs.existsSync(historyDir)) {
  console.error(`❌ Directory not found: ${historyDir}`);
  console.error('Please run your Playwright tests first to generate historical result files.');
  process.exit(1);
}

// Read and sort files chronologically using internal Playwright start times
const rawFiles = fs.readdirSync(historyDir).filter(f => f.endsWith('.json'));

if (rawFiles.length === 0) {
  console.error('❌ No JSON result files found in test-reports-history.');
  process.exit(1);
}

const parsedFiles = rawFiles.map(file => {
  const filePath = path.join(historyDir, file);
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return {
      file,
      data,
      startTime: new Date(data.stats?.startTime || 0).getTime()
    };
  } catch (err) {
    console.warn(`⚠️ Could not parse ${file}: ${err.message}`);
    return null;
  }
}).filter(Boolean);

parsedFiles.sort((a, b) => a.startTime - b.startTime);

const testMap = new Map(); // Key: Unique spec key, Value: { spec, suiteName, annotations, file }
let baseConfig = null;
let earliestStartTime = null;

// Helper to extract clean suite name
function getCleanSuiteName(filePath) {
  if (!filePath) return 'Default Suite';
  return path.basename(filePath).replace(/\.(spec|test)\.[jt]sx?$/i, '').replace(/\.[jt]sx?$/i, '');
}

// Recursive function to traverse Playwright suite hierarchy while preserving annotations
function processSuites(suites, parentAnnotations = [], parentSuiteTitle = '', currentFilePath = '') {
  for (const suite of suites) {
    const filePath = suite.file || currentFilePath;
    const currentAnnotations = [...parentAnnotations, ...(suite.annotations || [])];
    
    let currentSuiteTitle = parentSuiteTitle;
    if (suite.file) {
      currentSuiteTitle = getCleanSuiteName(suite.file);
    } else if (suite.title) {
      currentSuiteTitle = suite.title;
    }

    if (suite.specs) {
      for (const spec of suite.specs) {
        const specSuiteName = currentSuiteTitle || 'Default Suite';
        // Precise unique key using spec.id or combination of file path + title
        const uniqueKey = spec.id || `${filePath}::${spec.title}`;
        const combinedAnnotations = [...currentAnnotations, ...(spec.annotations || [])];

        testMap.set(uniqueKey, { 
          spec: {
            ...spec,
            annotations: combinedAnnotations,
            file: spec.file || filePath
          }, 
          suiteName: specSuiteName,
          file: filePath
        });
      }
    }

    if (suite.suites) {
      processSuites(suite.suites, currentAnnotations, currentSuiteTitle, filePath);
    }
  }
}

// Process all parsed history files in order (oldest to newest)
parsedFiles.forEach(({ data, startTime }) => {
  if (data.suites && Array.isArray(data.suites)) {
    processSuites(data.suites);
  }

  if (!baseConfig && data.config) {
    baseConfig = data.config;
  }

  if (startTime && (!earliestStartTime || startTime < earliestStartTime)) {
    earliestStartTime = startTime;
  }
});

// Reconstruct Playwright suites grouped by original suite title to keep metadata intact
const suitesMap = new Map();

for (const { spec, suiteName, file } of testMap.values()) {
  if (!suitesMap.has(suiteName)) {
    suitesMap.set(suiteName, {
      title: suiteName,
      file: file,
      specs: []
    });
  }
  suitesMap.get(suiteName).specs.push(spec);
}

const mergedSuites = Array.from(suitesMap.values());

const mergedResults = {
  config: baseConfig || {},
  stats: {
    startTime: earliestStartTime ? new Date(earliestStartTime).toISOString() : new Date().toISOString()
  },
  suites: mergedSuites
};

// Ensure output directory exists and write results.json
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'results.json');
fs.writeFileSync(outputPath, JSON.stringify(mergedResults, null, 2));

console.log(`✅ Successfully updated dataset with ${testMap.size} unique test case(s) across ${parsedFiles.length} run(s).`);
console.log(`📁 Saved output to: ${outputPath}`);