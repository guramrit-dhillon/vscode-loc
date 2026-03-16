import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const watch = process.argv.includes('--watch');

/**
 * @type {esbuild.BuildOptions}
 */
const buildOptions = {
  entryPoints: ['src/extension.ts'],
  bundle: true,
  outfile: 'dist/extension.js',
  external: ['vscode'],
  format: 'cjs',
  platform: 'node',
  target: 'node18',
  sourcemap: true,
  minify: !watch,
  logLevel: 'info',
};

async function copyTranslations() {
  const translationsDir = join(__dirname, 'dist', 'translations');
  if (!existsSync(translationsDir)) {
    mkdirSync(translationsDir, { recursive: true });
  }

  const translationsSource = join(__dirname, 'translations', 'main.i18n.json');
  const translationsTarget = join(translationsDir, 'main.i18n.json');

  if (existsSync(translationsSource)) {
    copyFileSync(translationsSource, translationsTarget);
    console.log('Copied translations to dist/');
  }
}

async function build() {
  try {
    if (watch) {
      const ctx = await esbuild.context(buildOptions);
      await ctx.watch();
      console.log('Watching for changes...');
    } else {
      await esbuild.build(buildOptions);
      await copyTranslations();
      console.log('Build completed successfully');
    }
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

build();
