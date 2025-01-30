const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const EXPENSIFY_DIR = path.join(__dirname, 'apps', 'Expensify');
const ARTIFACTS_DIR = path.join(__dirname, 'artifacts');

// Helper function to execute commands and handle errors
function exec(command, cwd = EXPENSIFY_DIR) {
  try {
    return execSync(command, {
      cwd,
      stdio: 'ignore',
      encoding: 'utf-8',
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

async function createBundles() {
  console.log('🏗️  Creating bundles...\n');

  const bundleTypes = [
    'metro-dev',
    'metro-prod',
    'metro-prod-hbc',
    'repack-dev',
    'repack-prod',
    'repack-prod-hbc',
  ];

  // Create directories for all bundle types
  bundleTypes.forEach((type) => {
    ensureDir(path.join(ARTIFACTS_DIR, type));
    ensureDir(path.join(ARTIFACTS_DIR, type, 'assets'));
  });

  // Metro bundles
  console.log('📦 Creating Metro bundles...');
  exec(
    `npx react-native bundle --platform ios --dev true --entry-file index.js --bundle-output ${path.join(
      ARTIFACTS_DIR,
      'metro-dev',
      'index.bundle'
    )} --assets-dest ${path.join(ARTIFACTS_DIR, 'metro-dev', 'assets')}`,
    EXPENSIFY_DIR
  );
  exec(
    `npx react-native bundle --platform ios --dev false --entry-file index.js --bundle-output ${path.join(
      ARTIFACTS_DIR,
      'metro-prod',
      'index.bundle'
    )} --assets-dest ${path.join(ARTIFACTS_DIR, 'metro-prod', 'assets')}`,
    EXPENSIFY_DIR
  );

  // Re.Pack bundles
  console.log('📦 Creating Re.Pack bundles...');
  exec(
    `npx react-native webpack-bundle --platform ios --dev true --entry-file index.js --bundle-output ${path.join(
      ARTIFACTS_DIR,
      'repack-dev',
      'index.bundle'
    )} --assets-dest ${path.join(ARTIFACTS_DIR, 'repack-dev', 'assets')}`,
    EXPENSIFY_DIR
  );
  exec(
    `npx react-native webpack-bundle --platform ios --dev false --entry-file index.js --bundle-output ${path.join(
      ARTIFACTS_DIR,
      'repack-prod',
      'index.bundle'
    )} --assets-dest ${path.join(ARTIFACTS_DIR, 'repack-prod', 'assets')}`,
    EXPENSIFY_DIR
  );

  // Create HBC bundles from prod bundles
  console.log('📦 Creating HBC bundles...');

  // Metro HBC bundle
  exec(
    `./node_modules/react-native/sdks/hermesc/osx-bin/hermesc ${path.join(
      ARTIFACTS_DIR,
      'metro-prod',
      'index.bundle'
    )} -emit-binary -out ${path.join(
      ARTIFACTS_DIR,
      'metro-prod-hbc',
      'index.bundle'
    )} -O -w`,
    EXPENSIFY_DIR
  );

  // Re.Pack HBC bundle
  exec(
    `./node_modules/react-native/sdks/hermesc/osx-bin/hermesc ${path.join(
      ARTIFACTS_DIR,
      'repack-prod',
      'index.bundle'
    )} -emit-binary -out ${path.join(
      ARTIFACTS_DIR,
      'repack-prod-hbc',
      'index.bundle'
    )} -O -w`,
    EXPENSIFY_DIR
  );
}

async function measureBundles() {
  console.log('\n📏 Measuring bundle sizes...');
  const bundleTypes = [
    'metro-dev',
    'metro-prod',
    'metro-prod-hbc',
    'repack-dev',
    'repack-prod',
    'repack-prod-hbc',
  ];

  const results = {};
  // First gather all sizes
  for (const type of bundleTypes) {
    const bundlePath = path.join(ARTIFACTS_DIR, type, 'index.bundle');
    const size = measureBundleSize(bundlePath);
    const sizeInMB = Number((size / (1024 * 1024)).toFixed(2));

    results[type] = {
      size: sizeInMB,
      diff: type.startsWith('metro') ? '0.00%' : null, // Will be filled for repack bundles
      type: type.startsWith('metro') ? 'Metro' : 'Re.Pack',
      variant: type.includes('-dev')
        ? 'Development'
        : type.includes('-hbc')
        ? 'Production (HBC)'
        : 'Production',
    };
  }

  // Calculate percentage differences using metro as baseline
  const pairs = [
    ['metro-dev', 'repack-dev'],
    ['metro-prod', 'repack-prod'],
    ['metro-prod-hbc', 'repack-prod-hbc'],
  ];

  for (const [metro, repack] of pairs) {
    const metroSize = results[metro].size;
    const repackSize = results[repack].size;
    const diffPercent = ((repackSize - metroSize) / metroSize) * 100;
    const sign = diffPercent > 0 ? '+' : '';
    results[repack].diff = `${sign}${diffPercent.toFixed(2)}%`;
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
  pairs.forEach(([metro, repack]) => {
    const mSize = results[metro].size;
    const rSize = results[repack].size;
    const diff = results[repack].diff;
    const variant = results[metro].variant;
    const emoji = diff.startsWith('+') ? '📈' : '📉';
    console.log(
      `${emoji} ${variant}: Re.Pack is ${diff} compared to Metro (${rSize.toFixed(
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
