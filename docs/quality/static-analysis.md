# Static analysis

Static analysis runs entirely on GitHub; no external service or token is needed.

| Check | Where | What it catches |
|---|---|---|
| CodeQL (`security-and-quality`) | `.github/workflows/security.yml`, also weekly | Injection, SSRF, path traversal, unsafe regexes, and maintainability issues in TypeScript. Results appear under Security > Code scanning. |
| ESLint (`--max-warnings 0`) | `ci.yml` (Lint job) | Type-aware lint errors, floating promises, unused code. |
| Coverage gate | `ci.yml` | Per-module coverage targets (`scripts/check-coverage.mjs`). |
| Gitleaks | `security.yml` | Committed secrets, full history. |
| Dependency review | `security.yml` (pull requests) | New dependencies with known high-severity advisories. |
| `npm audit` | `security.yml` | Known vulnerabilities in production dependencies. |
| actionlint | `security.yml` | Mistakes in workflow files. |

Run locally: `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm audit --omit=dev --audit-level=high`.
