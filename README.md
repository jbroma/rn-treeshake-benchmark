# React Native Bundle Size Benchmark: Metro vs Re.Pack

This repository contains a benchmarking tool to compare bundle sizes between Metro (React Native's default bundler) and Re.Pack bundlers in various configurations.

## Setup

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

## Running the Benchmark

To run the benchmark, simply execute:

```bash
node bench.js
```

This will create bundles for different configurations and measure their sizes, providing a comprehensive comparison.

## Methodology

The benchmark creates bundles in various configurations for both Metro and Re.Pack bundlers:

### Bundle Types

The benchmark creates bundles in various configurations combining development/production modes, minification, and Hermes Bytecode (HBC) compilation:

- Development bundles (`*-dev`)
- Production bundles (`*-prod`)
- Production minified bundles (`*-prod-min`)
- Production HBC bundles (`*-prod-hbc`)
- Production minified HBC bundles (`*-prod-min-hbc`)

> **Note about HBC bundles**: HBC (Hermes Bytecode) bundles are created by compiling JavaScript bundles into Hermes bytecode format using the Hermes compiler (`hermesc`).

### Measurement Process

1. The tool first cleans the artifacts directory to ensure fresh measurements
2. Creates bundles for each configuration
3. Measures the size of each bundle in megabytes (MB)
4. Calculates the percentage difference between Metro and Re.Pack for each configuration type

## Understanding the Results

The benchmark outputs two types of results:

### 1. Detailed Table

Shows three columns:

- **Bundle Type**: The configuration and bundler used
- **Size (MB)**: Bundle size in megabytes
- **Diff vs Metro**: Percentage difference compared to the Metro equivalent
  - Positive values (+) indicate Re.Pack bundle is larger
  - Negative values (-) indicate Re.Pack bundle is smaller

### 2. Summary

Provides a quick overview of each comparison with:

- 📈 indicating Re.Pack bundle is larger
- 📉 indicating Re.Pack bundle is smaller

## Output Location

All generated bundles are stored in the `artifacts` directory, organized by bundle type:

```
artifacts/
├── metro-dev/
├── metro-prod/
├── metro-prod-min/
├── metro-prod-hbc/
├── metro-prod-min-hbc/
├── repack-dev/
├── repack-prod/
├── repack-prod-min/
├── repack-prod-hbc/
└── repack-prod-min-hbc/
```

Each directory contains:

- `index.bundle`: The generated bundle file
- `assets/`: Directory containing any assets used by the bundle
