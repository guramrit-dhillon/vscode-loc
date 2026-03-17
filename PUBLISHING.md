# Publishing Setup

This document explains how to set up automated publishing to VSCode Marketplace and OpenVSX.

## Prerequisites

You need to create publisher accounts and access tokens for both marketplaces.

### VSCode Marketplace

1. **Create a Publisher Account**
   - Go to https://marketplace.visualstudio.com/
   - Sign in with your Microsoft account
   - Go to https://marketplace.visualstudio.com/manage
   - Create a new publisher with ID `gdhillon` (or update package.json files with your publisher ID)

2. **Generate Personal Access Token**
   - Go to https://dev.azure.com/
   - Click on your profile → Security → Personal Access Tokens
   - Create a new token with:
     - Name: `VSCode Marketplace Publishing`
     - Organization: All accessible organizations
     - Scopes: Custom defined → Marketplace → Acquire, Manage
   - Copy the token (you won't be able to see it again!)

3. **Add to GitHub Secrets**
   - Go to your GitHub repository → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `VSCODE_MARKETPLACE_TOKEN`
   - Value: Paste your Personal Access Token

### OpenVSX

1. **Create an Account**
   - Go to https://open-vsx.org/
   - Sign in with GitHub

2. **Generate Access Token**
   - Go to https://open-vsx.org/user-settings/tokens
   - Click "Generate New Token"
   - Give it a name and copy the token

3. **Add to GitHub Secrets**
   - Go to your GitHub repository → Settings → Secrets and variables → Actions
   - Click "New repository secret"
   - Name: `OPENVSX_TOKEN`
   - Value: Paste your OpenVSX access token

## Publishing

### Manual Publishing via GitHub Actions

1. Go to Actions tab in your GitHub repository
2. Select either "Publish to VSCode Marketplace" or "Publish to OpenVSX"
3. Click "Run workflow"
4. Select which package to publish (punjabi, hindi, or all)
5. Click "Run workflow"

### Automated Publishing on Tag

When you create a new git tag following semantic versioning (e.g., `v1.0.0`), both workflows will automatically run and publish to both marketplaces.

```bash
# Update version in package.json files first
npm version patch --workspace=packages/punjabi
npm version patch --workspace=packages/hindi

# Create and push tag
git tag v1.0.1
git push origin v1.0.1
```

## Publisher Name

The `publisher` field in package.json is currently set to `gdhillon`. Make sure to:

1. Either create a publisher with this exact name on both marketplaces
2. Or update the `publisher` field in both package.json files to match your actual publisher name

## Testing Locally

Before publishing, you can test packaging locally:

```bash
# Build and package Punjabi extension
npm run package --workspace=packages/punjabi

# Build and package Hindi extension
npm run package --workspace=packages/hindi
```

This will create `.vsix` files that you can install locally in VS Code to test:

1. Open VS Code
2. Go to Extensions view (Ctrl+Shift+X)
3. Click the "..." menu → Install from VSIX
4. Select your `.vsix` file

## Troubleshooting

### "Publisher not found"

Make sure your publisher name matches exactly between package.json and the marketplace publisher account.

### "Extension already exists"

If you've already published a version, you need to increment the version number in package.json before publishing again.

### Token expired

Access tokens can expire. If publishing fails with authentication errors, regenerate the tokens and update GitHub secrets.
