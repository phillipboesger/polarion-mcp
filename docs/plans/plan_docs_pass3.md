# Public docs pass 3

## Scope and baseline

Start from origin/main c0bd23d after merged passes #73 and #76. Preserve the Ocean Bright hero, animated background and grouped inline setup. Change public documentation and its checks, with no new dependencies or server runtime changes.

## Implementation

1. Extend `docs/clients.json` and its schema with npm/npx, Docker and Remote URL choices, documented support, defaults, disabled reasons and separate server/client snippets. Generate `docs/clients.md`.
2. Rebuild `docs/index.html`, `docs/site.css`, `docs/setup.js` and `scripts/render-site.mjs`: quiet the hero; add a flow graphic, computed domain counts, five daily conversations, server-aware setup and FAQ/community.
3. Mirror the order and wording in `README.md`. Add `SECURITY.md` pointing to the repository’s enabled private vulnerability reporting.
4. Extend `tests/client-manifest.test.mjs` and `tests/docs-ui/setup.spec.mjs` for counts, examples, every supported mode, disabled reasons, safe URLs, clipboard, deep links, tabs, FAQ, animation and overflow.

## Validation and review

- `npm run check:docs:strict`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:docs-ui`.
- Review screenshots at 1440×900 and 390×844 in `/tmp/sol-docs3/`.
- Compare counts with the runtime toolset classifier and sources with official client documentation.
- Independent Sonnet review found no blockers. Clarified JetBrains’ local Docker stdio option, public HTTPS requirements for cloud APIs and ChatGPT’s exact callback setting. Confirmed the published container tag through the registry.

## Acceptance and rollback

- [x] Hero, capabilities, daily use, setup and FAQ/community appear in the requested order.
- [x] Essential information and 2-4 setup steps remain inline, with unsupported choices explained.
- [x] Generated counts cover each operation once; daily examples use real tools and distinguish previews from approvals.
- [x] No libraries added; configuration, deployment and security reference files retain CRLF.
- [x] Desktop/mobile overflow and required local checks pass.
- PR handoff: one PR with the requested title, left unmerged for owner review.

Revert the documentation commit to restore the previous page. Transport/auth differences and generated drift are covered by source notes, schema validation and browser checks. These documented client paths do not substitute for testing each provider account or network deployment.
