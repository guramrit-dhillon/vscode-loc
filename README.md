# VSCode Indian Languages - Localization Extensions

A monorepo for Visual Studio Code language pack extensions for Indian languages, starting with Punjabi (ਪੰਜਾਬੀ) and Hindi (हिन्दी).

## 📦 Project Structure

This is an npm monorepo with the following structure:

```
vscode-loc/
├── packages/
│   ├── punjabi/          # Punjabi Language Pack
│   └── hindi/            # Hindi Language Pack
├── scripts/              # Shared build utilities
├── package.json          # Root workspace configuration
├── tsconfig.json         # Strict TypeScript configuration
└── .eslintrc.json       # Strict ESLint rules
```

## 🚀 Features

- **NPM Workspaces**: Monorepo structure with npm workspaces for efficient dependency management
- **Strict TypeScript**: Configured with strict type checking for maximum type safety
- **ESLint**: Strict linting rules with TypeScript support
- **ESBuild**: Fast bundling with esbuild for production builds
- **Language Packs**: Modular language pack extensions for each language

## 📋 Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

## 🛠️ Setup

Install dependencies for all packages:

```bash
npm install
```

## 🔨 Building

Build all packages:

```bash
npm run build
```

Build a specific language pack:

```bash
npm run build:punjabi
npm run build:hindi
```

Watch mode for development:

```bash
npm run watch
```

## 🧹 Cleaning

Clean build artifacts from all packages:

```bash
npm run clean
```

## 📝 Linting

Lint all TypeScript files:

```bash
npm run lint
```

Auto-fix linting issues:

```bash
npm run lint:fix
```

## 🔍 Type Checking

Run TypeScript type checking:

```bash
npm run typecheck
```

## 📦 Packaging

Package all extensions as VSIX files:

```bash
npm run package
```

This will create `.vsix` files in each package directory that can be installed in VS Code.

## 🌍 Supported Languages

### Punjabi (ਪੰਜਾਬੀ)
- Language Code: `pa`
- Package: `@vscode-loc/punjabi`
- [Package README](./packages/punjabi/README.md)

### Hindi (हिन्दी)
- Language Code: `hi`
- Package: `@vscode-loc/hindi`
- [Package README](./packages/hindi/README.md)

## 🎯 Usage

1. Build the language pack you want to use
2. Package it as a VSIX file: `npm run package`
3. Install the VSIX file in VS Code: `Extensions > Install from VSIX...`
4. Configure VS Code to use the language:
   - Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (macOS)
   - Type "Configure Display Language"
   - Select the language you installed (e.g., `pa` for Punjabi, `hi` for Hindi)
   - Restart VS Code

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

### Adding a New Language

1. Create a new package directory under `packages/`
2. Copy the structure from an existing language pack
3. Update the language codes and translations
4. Add workspace scripts to root `package.json`

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🔧 Development

### Project Configuration

- **TypeScript**: Strict mode enabled with comprehensive type checking
- **ESLint**: Configured with `@typescript-eslint` for strict linting
- **ESBuild**: Fast bundler for production-ready extensions
- **NPM Workspaces**: Efficient monorepo management

### Scripts Overview

Root-level scripts:
- `build`: Build all packages
- `build:punjabi`: Build Punjabi language pack
- `build:hindi`: Build Hindi language pack
- `watch`: Watch mode for all packages
- `lint`: Lint all TypeScript files
- `lint:fix`: Auto-fix linting issues
- `clean`: Clean all build artifacts
- `typecheck`: Run TypeScript type checking
- `package`: Package all extensions

## 🏗️ Architecture

Each language pack extension:
1. Contains localized UI strings in `translations/main.i18n.json`
2. Registers the language pack via VS Code's localization API
3. Uses ESBuild for fast, optimized bundling
4. Follows strict TypeScript and ESLint rules
5. Can be independently versioned and published

## 📚 Resources

- [VS Code Extension API](https://code.visualstudio.com/api)
- [VS Code Language Packs](https://code.visualstudio.com/docs/getstarted/locales)
- [npm Workspaces](https://docs.npmjs.com/cli/v7/using-npm/workspaces)
