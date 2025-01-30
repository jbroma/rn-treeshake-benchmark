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

// Helper function to get bundle path
function getBundlePath(type) {
  return path.join(ARTIFACTS_DIR, type, 'index.bundle');
}

// Helper function to get assets path
function getAssetsPath(type) {
  return path.join(ARTIFACTS_DIR, type, 'assets');
}

// Helper function to create a bundle using Metro or Re.Pack
function createBundle(type, isDev, minify = false) {
  const bundler = type.startsWith('metro') ? 'bundle' : 'webpack-bundle';
  const configFlag = type.includes('-hbc') ? ' --config metro.config.js' : '';
  const minifyFlag = ` --minify ${minify}`;

  exec(
    `npx react-native ${bundler} --platform ios --dev ${isDev} --entry-file index.js ` +
      `--bundle-output ${getBundlePath(type)} ` +
      `--assets-dest ${getAssetsPath(type)}${configFlag}${minifyFlag}`,
    EXPENSIFY_DIR
  );
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

  const bundleTypes = [
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
  ];

  // Create directories for all bundle types
  bundleTypes.forEach((type) => {
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
}

async function measureBundles() {
  console.log('\n📏 Measuring bundle sizes...');
  const bundleTypes = [
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
  ];

  const results = {};
  // First gather all sizes
  for (const type of bundleTypes) {
    const bundlePath = path.join(ARTIFACTS_DIR, type, 'index.bundle');
    const size = measureBundleSize(bundlePath);
    const sizeInMB = Number((size / (1024 * 1024)).toFixed(2));

    results[type] = {
      size: sizeInMB,
      diff: type.startsWith('metro') ? '0.00%' : null,
      type: type.startsWith('metro') ? 'Metro' : 'Re.Pack',
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
    ['metro-dev', 'repack-dev'],
    ['metro-prod', 'repack-prod'],
    ['metro-prod-min', 'repack-prod-min'],
    ['metro-prod-hbc', 'repack-prod-hbc'],
    ['metro-prod-min-hbc', 'repack-prod-min-hbc'],
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
