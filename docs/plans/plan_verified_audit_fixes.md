# Implementation plan: verified audit fixes

Status: approved by Phillip on 2026-10-25; implementation delegated to GPT Luna with parent review and integration.

Reviewed on 2026-10-25 against commit `b205b1a`, branch `audit-open-bugs-docs-tests`.

## Objective

Fix the confirmed failures in composite tools, paging, response limits, and authentication checks. Replace misleading test fixtures with cases that reproduce real Polarion behavior. Keep changes small enough to review and revert independently.

## Revalidation and impact

The original twelve finding groups are reproducible, but they have different prerequisites and impact. Two retain high priority. Three should be described as conditional failures or hardening, rather than immediate production security failures. Repeating a later page also requires faulty upstream pagination.

Evidence comes from a fresh, isolated Polarion 2606 container on OrbStack and the built MCP server through the official SDK client, supplemented by controlled HTTP fixtures. No existing Polarion instance was modified. Test credentials were kept outside the repository.

1. **F1, P1 for job execution; P2 for missing document/trace content: confirmed live.** A real `jobs.dummy` job is created with HTTP 202 and singleton `data`; `run_job_and_wait` then reports that no job ID was returned. `first()` only handles arrays. A real Work Item also returns singleton `data`. Incorrect array fixtures hide the defect in `tests/composite-jobs.test.ts`, `tests/composite-documents.test.ts`, and `tests/composite-trace.test.ts`.
2. **F2, P1: confirmed live.** `dry_run: "true"` creates a real dummy job. Boolean `true` previews correctly. Virtual handlers receive unvalidated arguments, and their strict boolean checks fall through on malformed values. The upload helper has the same validation gap, but its current multipart defect described below prevents the tested upload from succeeding. Do not claim that this upload wrote a file; the job execution itself proves the unsafe behavior.
3. **F3, P2 conditional: retained with narrower impact.** A healthy local Polarion accepts the real PAT and rejects an invalid PAT. The false acceptance requires an upstream proxy, SSO redirect, or incorrect endpoint returning HTTP 200 HTML. A controlled HTTP fixture confirms this case. It can create a misleading login/session, but it does not bypass Polarion's authorization of subsequent REST calls.
4. **F4, P3 hardening: downgraded from P2.** With `tokenIpRateLimit: 1`, three invalid Basic requests all return 401. The shim returns before either failed-token limiter runs. This breaks the documented failure budget, but no successful credential guessing or authentication bypass was demonstrated. Rate-limit failed requests before credential validation.
5. **F5, P2: confirmed live.** Two types produce an AND query and zero results; the corresponding OR query returns results. The same construction affects statuses. Only single-value cases are currently tested.
6. **F6, P3 isolation/correctness: downgraded from P2.** Two different caller/instance contexts with the same project ID reuse the first context's field metadata. The effect is incorrect field validation and shared schema information, not access to another user's Work Item content. A standard single-instance deployment with identical field visibility may not notice it. Include the instance and caller in the cache key and bound the cache.
7. **F7, P2: confirmed live for search; confirmed by execution path for REST.** With a valid requirement filter, `page_size: 1, max_items: 3` returns one search result; generated `getWorkItems` returns three. The composite dependency helper calls the single-request executor and misses the server-level pagination wrapper. REST uses the same single-request executor and advertises the same generated pagination argument.
8. **F8, P2 for stale next links; P3 for repeated-page resilience.** Real Polarion omits `links.next` on a final page. After collecting three real results, the merged response still advertises page 3 as next and has no truncation flag. Repeated requests `[1, 2, 2, 2]` were reproduced with a faulty-upstream fixture, not observed from healthy Polarion. Compare each next page with the last fetched page and remove an absent final next link.
9. **F9, P2: confirmed with real API pages, currently masked by another trace defect.** An isolated Work Item with 101 outgoing links returns 100 links on the first page and supplies a next link and total count. After supplying the required relationship fields through a test adapter, the unchanged trace handler returns 100 edges with `truncated: false` and never fetches the root's second page. Without that adapter the current tool loses all edges because it requests no relationship fields. Repair both causes together.
10. **F10, P2: confirmed live.** With a configured text cap of 200 characters, a successful composite search returns 1,083 characters. This demonstrates a cap bypass; it is not a claim that this particular result exceeds the default 100,000-character cap. There is no final virtual-result cap, so larger composites can also exceed that default.
11. **F11, P2: confirmed performance defect.** Both a quote-heavy string and an ordinary JSON list of 900 Work Items, approximately 215,000 characters, exceeded an eight-second subprocess deadline at the default 100,000-character cap. The truncation loop repeatedly slices and stringifies almost the whole candidate. This synchronous work blocks the Node event loop. Performance evidence uses synthetic payloads; it does not require a defective Polarion response.
12. **F12, P3: confirmed documentation defects.** `docs/configuration.md` repeats the confirmation option with conflicting preview requirements. `docs/usage.md`, `docs/features.md`, and `docs/architecture.md` promise complete structured content, although the pagination wrapper intentionally removes items to meet a cap. The existing pagination test already asserts this removal. Correct the documentation while preserving the bounded pagination behavior.

### Additional causes established by live testing

- **N1, P2: missing sparse field selections.** The real 78-part `drivepilot/Requirements/Feasibility Study` returns empty Markdown and an empty outline. A parts list without `fields[document_parts]` has no attributes or relationships, and included Work Items also need their own fields. Link lists similarly omit role and target relationships unless requested. Fixing `first()` alone will not repair either tool. Search summaries also need explicit fields to include their intended titles and statuses.
- **N2, P2: empty structured search is invalid.** With no filters, the builder sends `*`; Polarion responds HTTP 400 with an unparseable query. Omit the query parameter when there are no clauses. A date-filter probe succeeded, so do not redesign date handling on the basis of suspicion.
- **N3, P2: the upload helper cannot upload its file.** Its generated `lid: "1"` produces HTTP 400, `File data not found for lid: '1'`. The same generated attachment operation and bytes succeed with HTTP 201 when the optional `lid` is omitted, using Polarion's order-based matching. A filename-valued `lid` also failed. For this one-file helper, omit `lid`; do not guess a filename-based replacement or change multipart naming globally.

## Scope and constraints

- Apply the fixes below and add regression assertions that fail against the current code.
- Keep `src/tools.ts` generated. No hand edits or unrelated OpenAPI regeneration are needed.
- Keep the existing deployment filters, request-scoped PAT, confirmation behavior, upload path/URL restrictions, and one outer MCP audit/policy event per client call.
- Reuse existing schema compilation, response rendering, and paging utilities. A small shared pagination wrapper is justified by three consumers; a new execution framework is not.
- Preserve CRLF in `docs/configuration.md`, `docs/deployment.md`, and `docs/security.md`.
- This plan does not authorize publishing a release, merging a PR, changing a production instance, or adding new authentication protocols.

## Ordered implementation

### 1. Validate composite inputs before side effects

Files: `src/server.ts`, `src/utils.ts`, `src/executor.ts`, `tests/call-pipeline.test.ts`, `tests/destructive-confirmation.test.ts`, `tests/composite-jobs.test.ts`, `tests/composite-upload.test.ts`.

- Share the existing dry-run normalization rules between generated and virtual calls: boolean values, unambiguous `"true"`/`"false"`, and `1`/`0`. Reject other values.
- Validate virtual arguments against their schemas with fail-closed compilation before entering the handler or selecting a confirmation branch. Reject misspelled top-level arguments consistently; preserve the existing treatment of reserved client metadata and `confirm`.
- Validate the job body and upload target before any job starts or a source file/URL is read.
- Retain the current optional confirmation policy. A normalized safe preview must not need a destructive-write confirmation.
- Test the complete MCP path: boolean/string previews cause zero upstream writes, invalid flags and missing required arguments cause zero writes, and explicit execution causes exactly one write. Cover both mutating composites, including after the multipart repair in step 2.

### 2. Repair composite use of the real API contract

Files: `src/composite-utils.ts`, `src/composite-jobs.ts`, `src/composite-documents.ts`, `src/composite-trace.ts`, `src/composite-upload.ts`, their four `tests/composite-*.test.ts` files, `tests/live/composites.test.mjs` (new), and `tests/live/helpers.mjs` where fixture lifecycle support is needed.

- Make `first()` handle singleton resource objects. Leave collection extraction explicit rather than treating every response as a collection.
- Request the exact fields consumed by document and trace rendering: document-part type/content/heading/level/Work Item relationship, included Work Item title/type/description, and link role/source/target relationships. Request fields for fallback reads too.
- Retain document ordering. Convert normal-part HTML through the existing Markdown converter. Preserve its deliberate treatment of tables.
- Carry the requested historical revision through fallback Work Item reads, preferring an explicit relationship revision where present. Add a regression for historical versus current content.
- Remove the unnecessary `lid` from the single-file upload helper. Verify content bytes and returned filename, not just the name of the delegated tool.
- Replace incorrect singleton array fixtures. Add cases for missing included objects, missing optional content, real field-selected response shapes, and upstream errors.
- Live acceptance: a dummy job yields its ID and is polled; an actual LiveDoc has a nonempty body and outline; a known parent link is returned; a small uploaded attachment can be downloaded byte-for-byte. Ensure test-owned jobs/data are cleaned up or the disposable container is removed.

### 3. Correct structured search and isolate field metadata

Files: `src/composite-search.ts`, `tests/composite-search.test.ts`, `tests/call-pipeline.test.ts`, `tests/live/composites.test.mjs`.

- OR the values within each type/status filter and AND the different filter groups. Preserve escaping and the current single-value semantics.
- Omit `query` for an empty search. Request the intended compact summary fields explicitly.
- Scope metadata by API base URL, caller scope, and project. Use a bounded TTL cache; do not cache metadata lookup failures as valid field sets.
- Test zero/one/multiple alternatives, escaping, empty filters, real search results, caller/instance isolation, TTL expiry, and capacity eviction.
- Keep `max_items` collection work in step 4 so search does not implement a second pagination loop.

### 4. Share and correct automatic pagination

Files: `src/pagination.ts`, `src/tool-execution.ts` (new small transport-independent wrapper), `src/server.ts`, `src/rest-api.ts`, `src/composite-search.ts`, `src/composite-trace.ts`, `tests/pagination.test.ts`, `tests/composite-search.test.ts`, `tests/composite-trace.test.ts`, `tests/http-server.test.ts`, `tests/call-pipeline.test.ts`, `tests/live/composites.test.mjs`.

- Move the existing generated-list orchestration into a shared wrapper around the single-request executor. Use it from generated MCP calls, composite dependencies, and REST routes. Preserve the injectable executor used by REST tests.
- Pass the resolved API base URL, cancellation signal, response limit, and a host-supplied next-page budget callback. Keep MCP pagination's rate-limit checks. REST retains its outer HTTP request limiter. Do not duplicate outer policy/auth/audit work for internal pages.
- Track the last fetched page, reject repeated/backward/malformed next links, and derive only a page number from untrusted links. Keep the configured host/path; real local Polarion advertises links to `localhost` without the mapped port.
- Clear `links.next` when the last page omits it; retain an actual continuation link only when more data exists. Preserve the existing maximum page/item limits and cancellation behavior.
- Page each trace link collection within the graph's node/request bounds. If a safety bound prevents reading more links, report truncation. Do not describe a partial graph as complete. Fetch the root even when `depth: 0`; propagate detail-read errors rather than manufacturing blank successful nodes.
- Test three transports/entry paths against the same fixture, repeat on page 2, omitted versus null final next links, initial pages other than 1, partial-page limits, and cancellation. Test 101 real links with a node cap above 102.

### 5. Make output limiting consistent and bounded in runtime

Files: `src/executor.ts`, `src/server.ts`, `src/tool-execution.ts`, `tests/executor.test.ts`, `tests/pagination.test.ts`, `tests/call-pipeline.test.ts`.

- Replace one-character-at-a-time candidate shrinking with a bounded algorithm, such as binary search over valid Unicode boundaries. Keep the JSON truncation envelope and exact character cap.
- Apply the text cap to final virtual results as well as generated results. Account for formatting and optional untrusted-content annotations so postprocessing does not silently exceed the cap or destroy the protection markers.
- Keep complete structured content for ordinary unpaged generated calls. Preserve the existing bounded structured-content policy for auto-collected pages and its explicit `truncated` marker; document this exception in step 7.
- Test quotes, backslashes, control characters, emoji, minimum cap, composite output, marked output, and already-small responses. Add an isolated performance regression with a generous timeout that the old ordinary-JSON case exceeds, avoiding fragile millisecond assertions.

### 6. Harden token validation and failed Basic request limits

Files: `src/oauth.ts`, `src/mcp-http-server.ts`, `tests/token-check.test.ts`, `tests/oauth-sessions.test.ts`, `tests/mcp-http.test.ts`.

- Require a plausible projects JSON response before treating a successful upstream response as PAT acceptance. Reject HTML, empty bodies, malformed JSON, and JSON errors under a misleading HTTP 200. Keep valid empty project arrays and legitimate JSON media types working.
- Treat an unusable upstream response as unavailable rather than as an invalid PAT, so a proxy fault does not permanently end a refresh login. Keep the existing 401 and 403 distinctions.
- Put the failed-request IP ceiling before Basic credential rejection. Derive the per-client key from the presented Basic client ID where relevant. Count failures once, retain separate clients' budgets, and continue excluding successful token exchanges.
- Add negative HTTP tests for invalid/unknown Basic clients, bad secrets, limit enforcement, and successful exchanges after failures. Retain PKCE, audience, CIMD, and refresh regression coverage.

### 7. Align documentation and close the test gaps

Files: `docs/configuration.md`, `docs/security.md`, `docs/usage.md`, `docs/features.md`, `docs/architecture.md`, `docs/extensions.md`, `docs/live-tests.md`, `scripts/check-docs.mjs`, `tests/check-docs.test.ts`.

- Remove the duplicated confirmation option. State that confirmation on the first call is accepted and a preceding preview is recommended, not enforced.
- Document composite input validation, automatic collection across supported entry paths, text caps, and the paginated structured-content exception accurately.
- Correct the claim that the virtual registry is empty by default when the normal server registers built-in composites. Correct the live-test schedule description from weekly to nightly, matching the current workflow.
- Add a small duplicate-configuration-entry check to the docs gate. Use behavior tests for semantic guarantees; do not attempt natural-language correctness analysis in the docs checker.
- Update README or the generated website only if a user-facing setup statement there changes. Do not introduce an unrelated website redesign.

## Delivery and verification

Suggested review boundaries: three commits or PRs, in order. First, input safety and real composite API contracts (steps 1-2). Second, search, paging, caches, and limits (steps 3-5). Third, authentication hardening and final documentation reconciliation (steps 6-7). Update relevant documentation with each behavior change; do not postpone it solely to the last boundary.

Before each boundary, run its focused regression tests, then lint/typecheck/build and the normal suite. Before final handoff, run:

```sh
npm run typecheck
npm run lint
npm run build
npm test
npm run test:coverage
npm run test:e2e
npm run check:docs:strict
npm run check:rest-coverage
npm run check:package
```

Run build/test/package commands sequentially: `npm pack` triggers a build, and some tests temporarily replace `build/index.js`.

Run the extended live suite on disposable 2506 and 2606 instances through the existing CI matrix. This revalidation exercised 2606 only. Run focused OAuth/executor mutation projects when those modules change, with the existing thresholds. Browser docs tests are needed if generated setup/website content changes. No Java, plugin, or frontend production code is planned, so Java/UI test-autopilot workflows are not applicable.

The unchanged baseline has 496 passing tests and passed the previous coverage, E2E, packaging, lint/typecheck, and docs checks. The fresh 2606 instance passed all 11 existing live tests. Those live tests can still pass because the read sweep tolerates tool errors and the suite lacks assertions for composite body/outline/graph/job/upload behavior. The added live cases must assert successful behavior and actual content, not merely absence of SDK exceptions.

## Acceptance criteria

- [x] Invalid or preview composite inputs produce no Polarion writes; explicit valid execution happens once.
- [x] Real singleton job and Work Item responses are read correctly.
- [x] A real LiveDoc renders body and headings; a known link and its details appear in the trace.
- [x] A one-file upload returns success and preserves the bytes and filename.
- [x] Empty structured search works; type/status alternatives produce OR semantics and usable summaries.
- [x] Field metadata is isolated by instance/caller/project and remains bounded.
- [x] Generated MCP, composite search, and REST honor `max_items` across real pages.
- [x] Finished collections have no stale next link; malformed or repeating pagination stops safely.
- [x] A graph with more than one link page is complete within its bounds or explicitly truncated.
- [x] Generated and composite text respects the configured cap without excessive synchronous work.
- [x] HTML/proxy responses do not establish a valid PAT; valid JSON projects still do.
- [x] Failed Basic token requests reach the documented limiter and successes do not consume its failure budget.
- [x] Negative regressions fail against the pre-fix behavior; the full suite and 2506/2606 live checks pass after fixes.
- [x] Documentation matches the implemented contracts and protected CRLF files retain their line endings.

## Risks and rollback

- New validation may reject inputs that were previously ignored. Normalize only the known safe compatibility cases and give actionable argument errors.
- Shared pagination can accidentally widen a filter, double-charge a budget, or duplicate audit events. Keep the wrapper below outer policy/auth/audit and test deployment filtering and accounting explicitly.
- Document revision and sparse-field mistakes can mix historical/current content or silently omit descriptions. Use real captured response shapes and point-in-time live assertions.
- Truncation changes can invalidate structured schemas or Unicode. Preserve existing result shapes and test final serialized size.
- Auth changes can reject legitimate empty-project responses or terminate logins during an outage. Preserve empty arrays and transient-error handling.
- Revert each review boundary independently if its acceptance checks fail. Do not use a global authentication/validation bypass as rollback. No deployment or database migration is required for this source-level repair.
