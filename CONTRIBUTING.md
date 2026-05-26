# Contributing to Domain Name Generator

Thank you for your interest in contributing! Here's how to get involved.

## Getting Started

1. **Fork** the repository and clone your fork locally.
2. Follow the [README](README.md) setup instructions to get the project running.
3. Create a new branch for your work:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

- Run `npm run dev` to start the dev server with hot reload.
- Run `npm run lint` before submitting — PRs must pass the ESLint check.
- Keep components small and focused (one concern per file).
- Add or update types; avoid `any` unless absolutely necessary.

## Submitting a Pull Request

1. Push your branch to your fork.
2. Open a Pull Request against the `main` branch of this repository.
3. Fill in the PR template:
   - **What** does this change do?
   - **Why** is it needed?
   - **How** was it tested?
4. PRs are reviewed within a few days. Please be patient and responsive to feedback.

## Reporting Bugs

Open a [GitHub Issue](../../issues/new) with:
- A clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Browser/Node version if relevant

## Feature Requests

Open an Issue with the `enhancement` label. Describe the use case — not just the solution — so we can discuss the best approach together.

## Code Style

- TypeScript everywhere (no `.js` in `src/`)
- Tailwind CSS for styling (avoid inline styles except where necessary)
- Functional React components with hooks
- Keep API secrets in environment variables — never hardcode them

## Questions?

Open a [Discussion](../../discussions) or an Issue and we'll get back to you.
