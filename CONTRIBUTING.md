# Contributing to AI README Generator (Frontend)

Thank you for your interest in contributing to the AI README Generator frontend! We welcome contributions from the community to help make this project better.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [How to Contribute](#how-to-contribute)
- [Code Style Guidelines](#code-style-guidelines)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)
- [Security Vulnerabilities](#security-vulnerabilities)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and professional in all interactions.

## Getting Started

Before you begin contributing, please:

1. Read through this guide
2. Check the [README](README.md) for project overview
3. Review existing [issues](https://github.com/Ifihan/ai-readme-generator-fe/issues) and [pull requests](https://github.com/Ifihan/ai-readme-generator-fe/pulls)
4. Join discussions to understand ongoing work

## Development Setup

### Prerequisites

- **Node.js**: v18.19.1 or higher (v20 LTS recommended)
- **npm**: v8.0.0 or higher (or yarn)
- **Git**: For version control
- **Code Editor**: VS Code recommended with Angular extensions

### Setting Up Your Environment

1. **Fork the repository**

2. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/ai-readme-generator-fe.git
   cd ai-readme-generator-fe
   ```

3. **Add upstream remote**

   ```bash
   git remote add upstream https://github.com/Ifihan/ai-readme-generator-fe.git
   ```

4. **Install dependencies**

   ```bash
   npm install
   ```

5. **Run the development server**

   ```bash
   npm start
   # or
   ng serve
   ```

6. **Open your browser**
   ```
   Navigate to http://localhost:4200/
   ```

### Environment Variables

Create a `.env` file based on `.environment.ts` in the environment folder if needed for local development.

## Project Structure

```
ai-readme-generator-fe/
├── src/
│   ├── app/
│   │   ├── core/          # Core functionality (services, guards, interceptors)
│   │   ├── features/      # Feature modules
│   │   ├── shared/        # Shared components, directives, pipes
│   │   └── app.component.ts
│   ├── assets/            # Static assets
│   └── environments/      # Environment configurations
├── .github/               # GitHub templates and workflows
└── README.md
```

## How to Contribute

### Types of Contributions

We welcome various types of contributions:

- **Bug Fixes**: Fix issues in the codebase
- **New Features**: Add new functionality
- **Documentation**: Improve or add documentation
- **UI/UX Improvements**: Enhance user interface and experience
- **Performance Optimization**: Improve application performance
- **Accessibility**: Make the app more accessible
- **Tests**: Add or improve test coverage
- **Translations**: Add internationalization support

### Workflow

1. **Create a new branch**

   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```

2. **Make your changes**

   - Write clean, readable code
   - Follow the code style guidelines
   - Add tests for new features
   - Update documentation as needed

3. **Test your changes**

   ```bash
   npm test           # Run unit tests
   npm run build      # Build the project
   npm run lint       # Check for linting errors
   ```

4. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

5. **Push to your fork**

   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Go to GitHub and create a PR from your fork
   - Fill out the PR template completely
   - Link any related issues

## Code Style Guidelines

### TypeScript/Angular

- Follow the [Angular Style Guide](https://angular.io/guide/styleguide)
- Use TypeScript strict mode
- Use meaningful variable and function names
- Add type annotations for function parameters and return types
- Use interfaces for object shapes
- Prefer `const` over `let`, avoid `var`
- Use arrow functions for callbacks

### Component Guidelines

- Keep components focused and single-purpose
- Use OnPush change detection where possible
- Unsubscribe from observables in `ngOnDestroy`
- Use reactive forms for complex forms
- Follow the container/presentational component pattern

### HTML/Template Guidelines

- Use semantic HTML elements
- Add ARIA attributes for accessibility
- Keep templates readable and maintainable
- Use Angular built-in directives (`*ngIf`, `*ngFor`, etc.)

### CSS/SCSS Guidelines

- Follow BEM naming convention
- Use CSS variables for theming
- Keep styles scoped to components
- Ensure responsive design
- Test in multiple browsers

### Code Formatting

- Use Prettier for code formatting
- Follow ESLint rules
- Use 2 spaces for indentation
- Maximum line length: 100 characters

## Commit Message Guidelines

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```bash
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `build`: Build system or dependency changes
- `ci`: CI/CD configuration changes
- `chore`: Other changes that don't modify src or test files

### Examples

```bash
feat(dashboard): add README history view
fix(api): handle 401 errors correctly
docs(readme): update installation instructions
style(components): format code with prettier
refactor(services): simplify API service logic
perf(rendering): optimize component rendering
test(auth): add unit tests for auth service
```

## Pull Request Process

### Before Submitting

- [ ] Code follows the style guidelines
- [ ] Self-review of your code completed
- [ ] Comments added for complex logic
- [ ] Documentation updated (if applicable)
- [ ] No new warnings or errors
- [ ] Tests added/updated and passing
- [ ] Build succeeds
- [ ] UI tested in multiple browsers (Chrome, Firefox, Safari)
- [ ] Responsive design tested on mobile devices

### PR Requirements

1. **Descriptive Title**: Use conventional commit format
2. **Complete Template**: Fill out all sections of the PR template
3. **Link Issues**: Reference related issues using `Fixes #123` or `Closes #456`
4. **Screenshots**: Add screenshots for UI changes
5. **Testing Evidence**: Describe how you tested the changes
6. **Breaking Changes**: Clearly document any breaking changes

### Review Process

- At least one maintainer approval required
- All CI checks must pass
- Resolve all review comments
- Keep the PR up to date with the main branch
- Be responsive to feedback

### After Merge

- Delete your feature branch
- Update your local repository

```bash
  git checkout main
  git pull upstream main
```

## Reporting Bugs

Found a bug? Please create an issue using the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.yml).

Include:

- Clear description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Screenshots or error logs
- Browser and OS information
- Angular version

## Suggesting Features

Have an idea? Create an issue using the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.yml).

Include:

- Clear description of the feature
- Problem it solves
- Proposed solution
- Alternative solutions considered
- Priority level

## Security Vulnerabilities

**DO NOT** create public issues for security vulnerabilities.

Instead, please report them privately to: **victoriaolusheye@gmail.com**

Include:

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

We will respond as quickly as possible and work with you to address the issue.

## Questions?

If you have questions:

- Check the [documentation](README.md)
- Search [existing issues](https://github.com/Ifihan/ai-readme-generator-fe/issues)
- Create a new issue using the [Question template](.github/ISSUE_TEMPLATE/question.yml)

## Recognition

Contributors will be recognized:

- In the GitHub contributors page
- In release notes for significant contributions

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.

---

Thank you for contributing to AI README Generator! Your efforts help make this project better for everyone. 🚀
