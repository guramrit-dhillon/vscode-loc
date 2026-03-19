#!/usr/bin/env node
/**
 * Release script: build, package, and publish all extensions to
 * VS Code Marketplace and Open VSX Registry.
 *
 * Called by changesets/action after version bumps are applied.
 * Required env vars: VSCE_PAT, OVSX_PAT
 */

import { execSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(new URL('.', import.meta.url).pathname, '..');
const PACKAGES_DIR = join(ROOT, 'packages');

function run(cmd, opts = {}) {
  console.log(`\n> ${cmd}`);
  execSync(cmd, { stdio: 'inherit', ...opts });
}

function getPackages() {
  return readdirSync(PACKAGES_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => ({ name: d.name, dir: join(PACKAGES_DIR, d.name) }));
}

function findVsix(pkgDir) {
  const files = readdirSync(pkgDir).filter((f) => f.endsWith('.vsix'));
  if (files.length === 0) throw new Error(`No .vsix found in ${pkgDir}`);
  return join(pkgDir, files[0]);
}

async function main() {
  const vsceToken = process.env.VSCE_PAT;
  const ovsxToken = process.env.OVSX_PAT;

  if (!vsceToken && !ovsxToken) {
    console.warn('Warning: Neither VSCE_PAT nor OVSX_PAT is set. Skipping publish.');
    return;
  }

  const packages = getPackages();
  console.log(`\nFound packages: ${packages.map((p) => p.name).join(', ')}`);

  for (const pkg of packages) {
    console.log(`\n=== Publishing ${pkg.name} ===`);

    // Verify package.json exists
    const pkgJson = join(pkg.dir, 'package.json');
    if (!existsSync(pkgJson)) {
      console.warn(`  Skipping ${pkg.name}: no package.json`);
      continue;
    }

    // Build and package
    run(`npm run build`, { cwd: pkg.dir });
    run(`npm run package`, { cwd: pkg.dir });

    const vsix = findVsix(pkg.dir);
    console.log(`  VSIX: ${vsix}`);

    // Publish to VS Code Marketplace
    if (vsceToken) {
      console.log(`  Publishing to VS Code Marketplace...`);
      run(`npx vsce publish --packagePath "${vsix}" --pat "${vsceToken}"`, { cwd: pkg.dir });
      console.log(`  Published ${pkg.name} to VS Code Marketplace`);
    } else {
      console.warn(`  VSCE_PAT not set — skipping VS Code Marketplace`);
    }

    // Publish to Open VSX
    if (ovsxToken) {
      console.log(`  Publishing to Open VSX...`);
      run(`npx ovsx publish "${vsix}" -p "${ovsxToken}"`, { cwd: pkg.dir });
      console.log(`  Published ${pkg.name} to Open VSX`);
    } else {
      console.warn(`  OVSX_PAT not set — skipping Open VSX`);
    }
  }

  console.log('\nRelease complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
