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
  console.log('Creating bundles...');

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
  console.log('\nCreating Metro bundles...');
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
  console.log('\nCreating Re.Pack bundles...');
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
  console.log('\nCreating HBC bundles...');

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
  console.log('\nMeasuring bundle sizes...');
  const bundleTypes = [
    'metro-dev',
    'metro-prod',
    'metro-prod-hbc',
    'repack-dev',
    'repack-prod',
    'repack-prod-hbc',
  ];

  const results = {};
  for (const type of bundleTypes) {
    const bundlePath = path.join(ARTIFACTS_DIR, type, 'index.bundle');
    const size = measureBundleSize(bundlePath);
    results[type] = {
      size,
      sizeInMB: (size / (1024 * 1024)).toFixed(2),
    };
  }

  console.log('\nResults:');
  console.table(results);
}

async function main() {
  // Clean and recreate artifacts directory
  console.log('Cleaning artifacts directory...');
  cleanDir(ARTIFACTS_DIR);
  console.log('Creating artifacts directory...');
  ensureDir(ARTIFACTS_DIR);

  await createBundles();
  await measureBundles();
}

main().catch((error) => {
  console.error('Benchmark failed:', error);
  process.exit(1);
});
