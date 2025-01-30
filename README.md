# React Native Bundle Size Benchmark

This repository contains a benchmarking tool to compare bundle sizes between Metro (React Native's default bundler) and Re.Pack bundlers in various configurations. The benchmark is performed on [Expensify](https://github.com/Expensify/App), a large open-source React Native application, making it a realistic test case for bundle size comparisons.

The repository includes a fork of Expensify as a git submodule, which has been modified to support both Metro and Re.Pack bundlers simultaneously. This allows for direct comparison of bundle sizes using the same codebase.

## Setup

1. Clone the repository
2. Initialize the git submodules:

```bash
git submodule init
git submodule update
```

3. Navigate into the `apps/Expensify` directory

```bash
cd apps/Expensify
```

4. Install Expensify dependencies:

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

This benchmark uses Expensify's codebase as a real-world test subject. Expensify is a complex React Native application with numerous dependencies and features, making it an excellent candidate for understanding the impact of different bundling strategies in production scenarios.

The benchmark creates bundles in various configurations for both Metro and Re.Pack bundlers:

### Bundle Types

The benchmark creates bundles in various configurations combining development/production modes, minification, and Hermes Bytecode (HBC) compilation:

- Development bundles (`*-dev`)
- Production bundles (`*-prod`)
- Production minified bundles (`*-prod-min`)
- Production HBC bundles (`*-prod-hbc`)
- Production minified HBC bundles (`*-prod-min-hbc`)

> **Note about HBC bundles**: HBC (Hermes Bytecode) bundles are created by compiling JavaScript bundles into Hermes bytecode format using the Hermes compiler (`hermesc`).

## Test Assumptions & Technical Details

To ensure a fair comparison between Metro and Re.Pack, several adjustments were made to the codebase:

1. **Dynamic Imports Handling**

   All dynamic imports in the repository were marked with `webpackMode: eager` magic comment to match Metro's release mode behavior and prevent code-splitting in Re.Pack (Rspack)

2. **Minification Setup**

   `terser-webpack-plugin` was used instead of the built-in `swcJsMinifier` provided by Rspack. This decision was made due to a bug in SWC at the time of the benchmark that prevented generating runtime-valid bundles

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
