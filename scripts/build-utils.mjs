#!/usr/bin/env node

/**
 * Shared build utilities for all language pack extensions
 */

import { execSync } from 'child_process';
import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const packagesDir = join(process.cwd(), 'packages');

/**
 * Get all package directories
 */
export function getPackages() {
  return readdirSync(packagesDir)
    .filter((name) => {
      const packagePath = join(packagesDir, name);
      return statSync(packagePath).isDirectory();
    })
    .map((name) => ({
      name,
      path: join(packagesDir, name),
    }));
}

/**
 * Build all packages
 */
export function buildAll() {
  const packages = getPackages();
  console.log(`Building ${packages.length} packages...`);

  for (const pkg of packages) {
    console.log(`\nBuilding ${pkg.name}...`);
    try {
      execSync('npm run build', {
        cwd: pkg.path,
        stdio: 'inherit',
      });
      console.log(`✓ ${pkg.name} built successfully`);
    } catch (error) {
      console.error(`✗ Failed to build ${pkg.name}`);
      throw error;
    }
  }
}

/**
 * Clean all packages
 */
export function cleanAll() {
  const packages = getPackages();
  console.log(`Cleaning ${packages.length} packages...`);

  for (const pkg of packages) {
    console.log(`Cleaning ${pkg.name}...`);
    try {
      execSync('npm run clean', {
        cwd: pkg.path,
        stdio: 'inherit',
      });
      console.log(`✓ ${pkg.name} cleaned successfully`);
    } catch (error) {
      console.warn(`⚠ Could not clean ${pkg.name}`);
    }
  }
}

/**
 * Package all extensions
 */
export function packageAll() {
  const packages = getPackages();
  console.log(`Packaging ${packages.length} extensions...`);

  for (const pkg of packages) {
    console.log(`\nPackaging ${pkg.name}...`);
    try {
      execSync('npm run package', {
        cwd: pkg.path,
        stdio: 'inherit',
      });
      console.log(`✓ ${pkg.name} packaged successfully`);
    } catch (error) {
      console.error(`✗ Failed to package ${pkg.name}`);
      throw error;
    }
  }
}

// Run command if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];

  switch (command) {
    case 'build':
      buildAll();
      break;
    case 'clean':
      cleanAll();
      break;
    case 'package':
      packageAll();
      break;
    default:
      console.log('Usage: node build-utils.mjs [build|clean|package]');
      process.exit(1);
  }
}
