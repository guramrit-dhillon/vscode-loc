# VS Code Indian Language Packs

A monorepo of VS Code language pack extensions for Indian languages, providing localized UI experiences for VS Code users.

## Packages

| Package | Language | Script | Extension ID |
|---------|----------|--------|--------------|
| [packages/punjabi](./packages/punjabi) | Punjabi (ਪੰਜਾਬੀ) | Gurmukhi | `gdhillon.vscode-loc-punjabi` |
| [packages/hindi](./packages/hindi) | Hindi (हिन्दी) | Devanagari | `gdhillon.vscode-loc-hindi` |

## Installation

Install directly from the VS Code Marketplace or Open VSX:

- **Punjabi**: Search for "Punjabi Language Pack" in VS Code Extensions
- **Hindi**: Search for "Hindi Language Pack" in VS Code Extensions

After installing, VS Code will prompt you to change the display language. You can also set it manually:

1. Open Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
2. Type `Configure Display Language`
3. Select `pa` for Punjabi or `hi` for Hindi

## Development

### Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0

### Setup

```bash
git clone https://github.com/guramrit-dhillon/vscode-loc.git
cd vscode-loc
npm install
```

### Build

```bash
# Build all packages
npm run build

# Build specific package
npm run build:punjabi
npm run build:hindi
```

### Package (create .vsix)

```bash
# Package all extensions
npm run package

# Package specific extension
npm run package --workspace=packages/punjabi
npm run package --workspace=packages/hindi
```

### Lint

```bash
npm run lint
npm run lint:fix
```

## Project Structure

```
vscode-loc/                        ← git repo root
├── references/
│   ├── translations.xlsx          # Source-of-truth spreadsheet (all 18,500+ strings)
│   ├── vscode_translations_fr.json  # Official VS Code French translation (reference)
│   └── vscode_translations_zh.json  # Official VS Code Chinese translation (reference)
└── vscode-loc/                    ← monorepo root (npm workspaces)
    ├── .changeset/                # Changeset version management
    ├── .github/
    │   └── workflows/
    │       ├── ci.yml             # CI: lint, build, package on push/PR
    │       ├── changeset.yml      # Auto-generate changesets from commits
    │       ├── release.yml        # Publish to marketplaces on version tag
    │       └── version.yml        # Manual: bump versions & create release tag
    ├── packages/
    │   ├── punjabi/               # Punjabi language pack
    │   │   ├── src/
    │   │   ├── translations/
    │   │   │   └── main.i18n.json # Generated — do not edit directly
    │   │   └── package.json
    │   └── hindi/                 # Hindi language pack
    │       ├── src/
    │       ├── translations/
    │       │   └── main.i18n.json # Generated — do not edit directly
    │       └── package.json
    ├── scripts/
    │   ├── build-translations.mjs # Compile translations.xlsx → main.i18n.json
    │   ├── merge-translations.mjs # Merge new VS Code keys into translations.xlsx
    │   ├── translate-ai.mjs       # Interactive AI translation (streaming)
    │   ├── translate-batch.mjs    # Bulk AI translation via Batches API
    │   ├── generate-changeset.js  # Auto-generate changesets in CI
    │   └── build-utils.mjs        # Shared build utilities
    ├── package.json               # Monorepo root
    └── tsconfig.json
```

## Translations

The source of truth for all translations is `references/translations.xlsx`. It contains all 18,500+ VS Code UI strings with French and Chinese columns as reference, and editable Punjabi and Hindi columns.

### Editing translations manually

**For contributors** — edit the i18n JSON files directly:

- Punjabi: `packages/punjabi/translations/main.i18n.json`
- Hindi: `packages/hindi/translations/main.i18n.json`

**For maintainers** — the spreadsheet is the canonical source:

1. Open `references/translations.xlsx` in Excel, LibreOffice Calc, or Numbers
2. Use the `french` / `chinese` columns as reference
3. Fill in `punjabi` and/or `hindi` columns
4. Rebuild the extension JSON files:
   ```bash
   npm run translations:build
   ```

### AI-assisted translation

```bash
# Translate all untranslated strings for a language (streaming, saves after each batch)
npm run translations:ai -- --lang punjabi
npm run translations:ai -- --lang hindi

# Bulk batch (50% cheaper, waits for full job to complete)
npm run translations:batch -- --lang punjabi
npm run translations:batch -- --lang hindi --limit 500
```

### Pulling in new VS Code strings

After a VS Code update, new UI strings need to be merged in:

1. Download the latest official translations:
   - French: `vscode_translations_fr.json` → place in `references/`
   - Chinese: `vscode_translations_zh.json` → place in `references/`
2. Merge new keys into the spreadsheet:
   ```bash
   npm run translations:merge
   ```
3. Rebuild extension JSON:
   ```bash
   npm run translations:build
   ```

## Versioning and Releases

This project uses [Changesets](https://github.com/changesets/changesets) for version management. Changesets are auto-generated by CI from conventional commits, or you can create one manually:

```bash
npm run changeset
```

### Release flow

1. Push to `main` → `changeset.yml` auto-generates a changeset from commit messages
2. Run the **Version & Release** workflow manually from GitHub Actions → bumps package versions, commits, and creates a `v*` tag
3. The tag triggers `release.yml` → detects which packages changed, builds VSIXs, creates a GitHub release, and publishes to both VS Code Marketplace and Open VSX

Tags with a pre-release suffix (e.g. `v1.2.0-preview`) are published as pre-release on the marketplace.

## GitHub Actions Secrets

To publish extensions, the following secrets must be configured in the repository:

| Secret | Description |
|--------|-------------|
| `VSCE_PAT` | Personal Access Token for VS Code Marketplace |
| `OVSX_PAT` | Personal Access Token for Open VSX Registry |
| `PAT` | GitHub Personal Access Token (for the version workflow to push tags) |

## Contributing

Contributions are welcome — bug reports, translation corrections, and new language packs.

To contribute translations, edit the relevant `packages/<lang>/translations/main.i18n.json` file and submit a Pull Request.

## License

MIT — see [LICENSE](./LICENSE) for details.
