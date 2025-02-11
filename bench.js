const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const EXPENSIFY_DIR = path.join(__dirname, 'apps', 'Expensify');
const ARTIFACTS_DIR = path.join(__dirname, 'artifacts');

const BUNDLE_TYPES = [
  // Metro bundles
  'metro-dev',
  'metro-prod',
  'metro-prod-min',
  'metro-prod-hbc',
  'metro-prod-min-hbc',
  // Re.Pack bundles
  'repack-dev',
  'repack-prod',
  'repack-prod-min',
  'repack-prod-hbc',
  'repack-prod-min-hbc',
  // Expo bundles
  'expo-dev',
  'expo-prod',
  'expo-prod-min',
  'expo-prod-hbc',
  'expo-prod-min-hbc',
];

// Helper function to execute commands and handle errors
function exec(command, cwd = EXPENSIFY_DIR, env = {}) {
  try {
    console.log(`\x1b[90m💡 Executing command: ${command}\x1b[0m`);
    return execSync(command, {
      cwd,
      stdio: 'ignore',
      encoding: 'utf-8',
      env: {
        ...process.env,
        ...env,
      },
    });
  } catch (error) {
    console.error(`Error executing command: ${command}`);
    console.error(error);
    process.exit(1);
  }
}

// Helper function to measure bundle size
function measureBundleSize(bundlePath) {
  const stats = fs.statSync(bundlePath);
  return stats.size;
}

// Helper function to ensure directory exists
function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Helper function to clean directory
function cleanDir(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  fs.mkdirSync(dir, { recursive: true });
}

// Helper function to get bundle path
function getBundlePath(type) {
  return path.join(ARTIFACTS_DIR, type, 'index.bundle');
}

function getBundleType(type) {
  if (type.startsWith('metro')) {
    return 'Metro';
  } else if (type.startsWith('expo')) {
    return 'Expo';
  } else if (type.startsWith('repack')) {
    return 'Re.Pack';
  } else {
    throw new Error(`Unknown bundle type: ${type}`);
  }
}

// Helper function to get assets path
function getAssetsPath(type) {
  return path.join(ARTIFACTS_DIR, type, 'assets');
}

// Helper function to create a bundle using Metro or Re.Pack
function createReactNativeBundle(type, isDev, minify = false, env = {}) {
  const bundleCommand = type.startsWith('metro') ? 'bundle' : 'webpack-bundle';

  exec(
    [
      `npx react-native ${bundleCommand}`,
      '--platform ios',
      `--dev ${isDev}`,
      '--entry-file index.js',
      `--bundle-output ${getBundlePath(type)}`,
      `--assets-dest ${getAssetsPath(type)}`,
      `--minify ${minify}`,
      `--reset-cache`,
    ]
      .filter(Boolean)
      .join(' '),
    EXPENSIFY_DIR,
    env
  );
}

// Helper function to create an Expo bundle
function createExpoBundle(type, isDev, minify = false) {
  const outputDir = path.dirname(getBundlePath(type));

  const expoEnv = {
    EXPO_UNSTABLE_METRO_OPTIMIZE_GRAPH: '1',
    EXPO_UNSTABLE_TREE_SHAKING: '1',
  };

  exec(
    [
      'npx expo export .',
      `--platform ios`,
      `--dev ${!!isDev}`,
      `--no-minify ${!minify}`,
      '--no-bytecode',
      `--output-dir ${outputDir}`,
      `--clear`,
    ].join(' '),
    EXPENSIFY_DIR,
    expoEnv
  );

  // find the bundle and move it to the correct location
  const expoBundlePath = path.join(
    outputDir,
    EXPENSIFY_DIR.substring(1),
    'index.js'
  );

  const targetPath = getBundlePath(type);

  if (fs.existsSync(expoBundlePath)) {
    fs.renameSync(expoBundlePath, targetPath);
  }

  // cleanup
  const leftoverDir = path.join(outputDir, 'Users');
  if (fs.existsSync(leftoverDir)) {
    fs.rmdirSync(leftoverDir, { recursive: true });
  }
}

// Helper function to create a bundle
function createBundle(type, isDev, minify) {
  if (type.startsWith('expo')) {
    createExpoBundle(type, isDev, minify);
  } else {
    createReactNativeBundle(type, isDev, minify);
  }
}

// Helper function to create HBC bundle
function createHBCBundle(sourceType, targetType) {
  exec(
    `./node_modules/react-native/sdks/hermesc/osx-bin/hermesc ${getBundlePath(
      sourceType
    )} ` + `-emit-binary -out ${getBundlePath(targetType)} -O -w`,
    EXPENSIFY_DIR
  );
}

async function createBundles() {
  console.log('🏗️  Creating bundles...\n');

  // Create directories for all bundle types
  BUNDLE_TYPES.forEach((type) => {
    ensureDir(path.join(ARTIFACTS_DIR, type));
    ensureDir(path.join(ARTIFACTS_DIR, type, 'assets'));
  });

  // Create Metro bundles
  console.log('📦 Creating Metro Development bundle...');
  createBundle('metro-dev', true, false);

  console.log('📦 Creating Metro Production bundle...');
  createBundle('metro-prod', false, false);

  console.log('📦 Creating Metro Production Minified bundle...');
  createBundle('metro-prod-min', false, true);

  console.log('📦 Creating Metro Production HBC bundle...');
  createHBCBundle('metro-prod', 'metro-prod-hbc');

  console.log('📦 Creating Metro Production Minified HBC bundle...');
  createHBCBundle('metro-prod-min', 'metro-prod-min-hbc');

  // Create Re.Pack bundles
  console.log('📦 Creating Re.Pack Development bundle...');
  createBundle('repack-dev', true, false);

  console.log('📦 Creating Re.Pack Production bundle...');
  createBundle('repack-prod', false, false);

  console.log('📦 Creating Re.Pack Production Minified bundle...');
  createBundle('repack-prod-min', false, true);

  console.log('📦 Creating Re.Pack Production HBC bundle...');
  createHBCBundle('repack-prod', 'repack-prod-hbc');

  console.log('📦 Creating Re.Pack Production Minified HBC bundle...');
  createHBCBundle('repack-prod-min', 'repack-prod-min-hbc');

  // Create Expo bundles
  console.log('📦 Creating Expo Development bundle...');
  createBundle('expo-dev', true, false);

  console.log('📦 Creating Expo Production bundle...');
  createBundle('expo-prod', false, false);

  console.log('📦 Creating Expo Production Minified bundle...');
  createBundle('expo-prod-min', false, true);

  console.log('📦 Creating Expo Production HBC bundle...');
  createHBCBundle('expo-prod', 'expo-prod-hbc');

  console.log('📦 Creating Expo Production Minified HBC bundle...');
  createHBCBundle('expo-prod-min', 'expo-prod-min-hbc');
}

async function measureBundles() {
  console.log('\n📏 Measuring bundle sizes...');

  const results = {};
  // First gather all sizes
  for (const type of BUNDLE_TYPES) {
    const bundlePath = path.join(ARTIFACTS_DIR, type, 'index.bundle');
    const size = measureBundleSize(bundlePath);
    const sizeInMB = Number((size / (1024 * 1024)).toFixed(2));

    results[type] = {
      size: sizeInMB,
      diff: type.startsWith('metro') ? '0.00%' : null,
      type: getBundleType(type),
      variant: type.includes('-dev')
        ? 'Development'
        : type.includes('-min-hbc')
        ? 'Production Minified (HBC)'
        : type.includes('-min')
        ? 'Production Minified'
        : type.includes('-hbc')
        ? 'Production (HBC)'
        : 'Production',
    };
  }

  // Calculate percentage differences using metro as baseline
  const pairs = [
    ['metro-dev', 'repack-dev', 'expo-dev'],
    ['metro-prod', 'repack-prod', 'expo-prod'],
    ['metro-prod-min', 'repack-prod-min', 'expo-prod-min'],
    ['metro-prod-hbc', 'repack-prod-hbc', 'expo-prod-hbc'],
    ['metro-prod-min-hbc', 'repack-prod-min-hbc', 'expo-prod-min-hbc'],
  ];

  for (const [metro, repack, expo] of pairs) {
    const metroSize = results[metro].size;

    // Calculate Re.Pack diff
    const repackSize = results[repack].size;
    const repackDiffPercent = ((repackSize - metroSize) / metroSize) * 100;
    const repackSign = repackDiffPercent > 0 ? '+' : '';
    results[repack].diff = `${repackSign}${repackDiffPercent.toFixed(2)}%`;

    // Calculate Expo diff
    const expoSize = results[expo].size;
    const expoDiffPercent = ((expoSize - metroSize) / metroSize) * 100;
    const expoSign = expoDiffPercent > 0 ? '+' : '';
    results[expo].diff = `${expoSign}${expoDiffPercent.toFixed(2)}%`;
  }

  // Print results in a more organized way
  console.log('\n📊 Bundle Size Comparison:');

  // Custom formatting for console.table
  const formattedResults = Object.entries(results).map(([key, data]) => ({
    'Bundle Type': `${data.type} ${data.variant}`,
    'Size (MB)': data.size.toFixed(2),
    'Diff vs Metro': data.diff,
  }));

  console.table(formattedResults);

  // Print summary
  console.log('\n📝 Summary:');
  pairs.forEach(([metro, repack, expo]) => {
    const mSize = results[metro].size;
    const rSize = results[repack].size;
    const eSize = results[expo].size;
    const rDiff = results[repack].diff;
    const eDiff = results[expo].diff;
    const variant = results[metro].variant;

    console.log(`\n${variant}:`);
    console.log(
      `${
        rDiff.startsWith('+') ? '📈' : '📉'
      } Re.Pack is ${rDiff} compared to Metro (${rSize.toFixed(
        2
      )}MB vs ${mSize.toFixed(2)}MB)`
    );
    console.log(
      `${
        eDiff.startsWith('+') ? '📈' : '📉'
      } Expo is ${eDiff} compared to Metro (${eSize.toFixed(
        2
      )}MB vs ${mSize.toFixed(2)}MB)`
    );
  });
}

async function main() {
  // Clean and recreate artifacts directory
  console.log('🧹 Cleaning artifacts directory...');
  cleanDir(ARTIFACTS_DIR);
  console.log('📁 Creating artifacts directory...');
  ensureDir(ARTIFACTS_DIR);

  await createBundles();
  await measureBundles();
}

main().catch((error) => {
  console.error('❌ Benchmark failed:', error);
  process.exit(1);
});
