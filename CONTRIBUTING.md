# Contributing to VSCode Indian Languages

Thank you for your interest in contributing to the VSCode Indian Languages project! 🙏

## How to Contribute

### Improving Translations

1. Navigate to the language package you want to improve (e.g., `packages/punjabi/` or `packages/hindi/`)
2. Edit the translation file: `translations/main.i18n.json`
3. Ensure translations are accurate and culturally appropriate
4. Test your changes by building and installing the extension

### Adding New Translations

1. Find the VS Code UI strings you want to translate
2. Add them to the appropriate section in `main.i18n.json`
3. Follow the existing JSON structure
4. Keep translations concise and natural

### Adding a New Language

1. Create a new directory under `packages/` with the language name
2. Copy the structure from an existing package (e.g., `punjabi/`)
3. Update all files with the new language information:
   - `package.json`: Update `displayName`, `description`, `languageId`, etc.
   - `README.md`: Update language-specific information
   - `translations/main.i18n.json`: Add translations for the new language
4. Add build scripts to root `package.json`
5. Test thoroughly

### Code Contributions

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes following our code standards
4. Run linting: `npm run lint`
5. Run type checking: `npm run typecheck`
6. Build the project: `npm run build`
7. Commit your changes with clear commit messages
8. Push to your fork and submit a pull request

## Code Standards

### TypeScript
- Use strict TypeScript configuration
- Add explicit type annotations
- Avoid using `any` type
- Document complex functions with JSDoc comments

### ESLint
- Follow the ESLint rules configured in `.eslintrc.json`
- Run `npm run lint:fix` to auto-fix common issues
- Ensure no linting errors before submitting PRs

### Code Style
- Use meaningful variable and function names
- Keep functions small and focused
- Add comments for complex logic
- Follow existing code patterns

## Translation Guidelines

### General Principles
1. **Accuracy**: Ensure translations convey the correct meaning
2. **Clarity**: Use simple, clear language
3. **Consistency**: Use consistent terminology throughout
4. **Cultural Appropriateness**: Consider cultural context
5. **Brevity**: Keep translations concise to fit UI constraints

### Translation Format
```json
{
  "vs/path/to/component": {
    "key.identifier": "Translated text"
  }
}
```

### Common Terms

Maintain consistency when translating common UI terms:
- File → फ़ाइल (Hindi) / ਫਾਈਲ (Punjabi)
- Folder → फ़ोल्डर (Hindi) / ਫੋਲਡਰ (Punjabi)
- Save → सहेजें (Hindi) / ਸੁਰੱਖਿਅਤ ਕਰੋ (Punjabi)
- Open → खोलें (Hindi) / ਖੋਲ੍ਹੋ (Punjabi)

## Testing Your Changes

1. Build the extension: `npm run build`
2. Package the extension: `npm run package`
3. Install the VSIX file in VS Code
4. Test all translated strings in the UI
5. Check for any display issues (text overflow, encoding issues, etc.)

## Pull Request Process

1. Update documentation if needed
2. Add any new translations to the appropriate language files
3. Ensure all tests pass and there are no linting errors
4. Write a clear PR description explaining your changes
5. Link any related issues
6. Be responsive to feedback and questions

## Questions or Need Help?

- Open an issue for bugs or feature requests
- Tag maintainers for urgent questions
- Be respectful and patient

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Respect differing viewpoints and experiences

Thank you for contributing! 🙏
