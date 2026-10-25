# Mutation baseline

**Run:** `npm run test:mutation` (duration: 29m56s). It compiles `build-tests/` once and runs one Stryker project per module against the relevant compiled tests, with coverage analysis off, incremental mode enabled, four workers, and a 20-second mutant timeout. Reports are in `reports/mutation/` (HTML, JSON, and clear text; gitignored). The executor project limits mutation to guarded HTTP dispatch (`executeApiTool`, `src/executor.ts:868–960`).

The initial full-suite-per-mutant experiment took 106m28s and produced 1,504 mutant timeouts (out of 2,279 mutants) even with the test compiler and build work repeated per mutant. Those timeouts made the full-suite scores unusable, so the module projects run the already compiled tests that exercise each module. The first incomplete full-suite run's timeout count is retained here as the reason for the scoped design; it is excluded from the baseline scores below.

**Q04 run:** `npm run test:compile`, followed by `MUTATION_MODULE=<module> ./node_modules/.bin/stryker run tests/stryker.config.mjs` for each module (OAuth had a clean run plus two incremental refreshes after the final assertions; sealing had one incremental confirmation). Total compile and mutation wall time was **39m38s**. Projects used four workers, 20-second timeouts, incremental mode, and the module-specific compiled test commands in `tests/stryker.config.mjs`.

## Mutation scores

Scores use **Killed / (Killed + Survived + NoCoverage)**. Timeouts are excluded from the denominator and reported separately.

| Module | Score | Killed | Survived | NoCoverage | Timeout |
|---|---:|---:|---:|---:|---:|
| src/oauth.ts | 72.38% | 174 | 100 | 0 | 88 |
| src/sealed.ts | 64.71% | 33 | 18 | 0 | 0 |
| src/guards.ts | 64.07% | 271 | 152 | 0 | 0 |
| src/tool-filter.ts | 73.42% | 58 | 21 | 0 | 0 |
| src/executor.ts | 86.52% | 77 | 12 | 0 | 0 |

**Totals:** 303 surviving mutants; 88 timeouts.

The OAuth score above is corrected from the original Q03 table, which accidentally included timeouts in its denominator. All scores use **Killed / (Killed + Survived + NoCoverage)**; timeouts are excluded.

## Q04 before and after

| Module | Before | After | Killed | Survived | NoCoverage | Timeout |
|---|---:|---:|---:|---:|---:|---:|
| src/oauth.ts | 72.38% | 82.87% | 208 | 62 | 0 | 92 |
| src/sealed.ts | 64.71% | 88.24% | 45 | 6 | 0 | 0 |
| src/guards.ts | 64.07% | 80.61% | 341 | 82 | 0 | 0 |
| src/tool-filter.ts | 73.42% | 89.87% | 71 | 8 | 0 | 0 |
| src/executor.ts (dispatch slice) | 86.52% | 85.39% | 76 | 13 | 0 | 0 |

The after scores come from the Q04 reports; two OAuth incremental refreshes reused clean-run killed and timeout results, then reran all previously surviving mutants after new assertions. Scores count only killed, survived, and no-coverage mutants. The 92 OAuth timeouts remain separate.

## Q03 surviving mutants (before Q04)

Survivors are grouped by source line. Mutator names with a count include each distinct mutant instance at that line.

### OAuth

These survivors cover access-token and login expiry, Polarion token checks, redirect allowlisting, authorization-code binding, token verification, HTML escaping, and OAuth error paths. Regressions here can change who authenticates, where clients redirect, whether a token is accepted, or how login data is exposed.

| Source | Mutator(s) | Behavior at risk |
|---|---|---|
| [src/oauth.ts:43] | ArithmeticOperator | 1 survivor(s) can change: const ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000; |
| [src/oauth.ts:46] | ArithmeticOperator | 1 survivor(s) can change: const PENDING_LOGIN_TTL_MS = 10 * 60 * 1000; |
| [src/oauth.ts:120] | StringLiteral | 1 survivor(s) can change: headers: { Authorization: 'Bearer ${token}', Accept: 'application/json' }, |
| [src/oauth.ts:121] | ObjectLiteral | 1 survivor(s) can change: params: { 'page[size]': 1 }, |
| [src/oauth.ts:122] | ObjectLiteral | 1 survivor(s) can change: httpsAgent: new https.Agent({ rejectUnauthorized: shouldRejectUnauthorized() }), |
| [src/oauth.ts:126] | ConditionalExpression, EqualityOperator | 2 survivor(s) can change: if (response.status >= 200 && response.status < 300) return true; |
| [src/oauth.ts:129] | OptionalChaining ×6, StringLiteral | 7 survivor(s) can change: const detail = String(response.data?.errors?.[0]?.detail ?? response.data?.errors?.[0]?.title ?? '') |
| [src/oauth.ts:131] | StringLiteral | 1 survivor(s) can change: console.error('[WARN] Polarion token check failed: HTTP ${response.status}${detail ? ' - ${detail}' : ''}'); |
| [src/oauth.ts:135] | BlockStatement | 1 survivor(s) can change: } catch (error) { |
| [src/oauth.ts:136] | StringLiteral | 1 survivor(s) can change: console.error('[WARN] Polarion token check failed: ${error instanceof Error ? error.message : String(error)}'); |
| [src/oauth.ts:137] | StringLiteral | 1 survivor(s) can change: return 'unavailable'; |
| [src/oauth.ts:142] | StringLiteral ×2 | 2 survivor(s) can change: const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']); |
| [src/oauth.ts:155] | MethodExpression, StringLiteral | 2 survivor(s) can change: return entry.endsWith('/') ? loopbackAnyPort(new URL(entry)).href : entry; |
| [src/oauth.ts:164] | ConditionalExpression | 1 survivor(s) can change: if (LOOPBACK_HOSTS.has(url.hostname)) url.port = ''; |
| [src/oauth.ts:221] | LogicalOperator, MethodExpression, StringLiteral | 3 survivor(s) can change: const name = JSON.stringify(client.client_name ?? '').slice(0, 100); |
| [src/oauth.ts:222] | MethodExpression | 1 survivor(s) can change: const uris = JSON.stringify(client.redirect_uris).slice(0, 300); |
| [src/oauth.ts:223] | StringLiteral | 1 survivor(s) can change: console.error('[WARN] Refused client registration ${name}: redirect URIs ${uris} not on the allowlist'); |
| [src/oauth.ts:224] | StringLiteral | 1 survivor(s) can change: throw new InvalidClientMetadataError('redirect_uri is not allowed by this server'); |
| [src/oauth.ts:233] | ArithmeticOperator | 1 survivor(s) can change: client_id_issued_at: Math.floor(Date.now() / 1000), |
| [src/oauth.ts:244] | MethodExpression | 1 survivor(s) can change: return uris.length > 0 && uris.every(uri => isRedirectAllowed(String(uri), this.redirectAllowlist)); |
| [src/oauth.ts:266] | StringLiteral | 1 survivor(s) can change: .replace(/&/g, '&amp;') |
| [src/oauth.ts:269] | StringLiteral | 1 survivor(s) can change: .replace(/"/g, '&quot;') |
| [src/oauth.ts:270] | StringLiteral | 1 survivor(s) can change: .replace(/'/g, '&#39;'); |
| [src/oauth.ts:280] | StringLiteral | 1 survivor(s) can change: res.set('Cache-Control', 'no-store'); |
| [src/oauth.ts:400] | StringLiteral | 1 survivor(s) can change: ${error ? '<p class="error" role="alert">${escapeHtml(error)}</p>' : ''} |
| [src/oauth.ts:462] | StringLiteral | 1 survivor(s) can change: clientName: client.client_name ?? 'This MCP client', |
| [src/oauth.ts:467] | OptionalChaining | 1 survivor(s) can change: scopes: params.scopes?.length ? params.scopes : [POLARION_SCOPE], |
| [src/oauth.ts:485] | ArrayDeclaration, StringLiteral | 2 survivor(s) can change: this.beginLogin({ flow: 'gpt', clientId, clientName: 'ChatGPT', redirectUri, state, scopes: [POLARION_SCOPE] }, res); |
| [src/oauth.ts:493] | CallExpression | 1 survivor(s) can change: this.sweep(); |
| [src/oauth.ts:494] | ConditionalExpression, EqualityOperator | 2 survivor(s) can change: if (this.pendingLogins.size >= MAX_PENDING_LOGINS) { |
| [src/oauth.ts:517] | EqualityOperator | 1 survivor(s) can change: if (!pending \|\| pending.expiresAt < Date.now()) { |
| [src/oauth.ts:518] | CallExpression | 1 survivor(s) can change: this.pendingLogins.delete(loginId); |
| [src/oauth.ts:519] | StringLiteral | 1 survivor(s) can change: return { ok: false, reason: 'This login has expired. Start again from your MCP client.' }; |
| [src/oauth.ts:524] | Regex | 1 survivor(s) can change: polarionToken = polarionToken.replace(/\s+/g, ''); |
| [src/oauth.ts:525] | BlockStatement, ConditionalExpression | 2 survivor(s) can change: if (!polarionToken) { |
| [src/oauth.ts:526] | BooleanLiteral, ObjectLiteral, StringLiteral | 3 survivor(s) can change: return { ok: false, reason: 'Enter your Polarion Personal Access Token.', pending: retry }; |
| [src/oauth.ts:529] | BlockStatement, ConditionalExpression, StringLiteral | 3 survivor(s) can change: if (check === 'unavailable') { |
| [src/oauth.ts:530] | BooleanLiteral, ObjectLiteral, StringLiteral | 3 survivor(s) can change: return { ok: false, reason: 'Polarion could not be reached to check the token. Try again in a moment.', pending: retry }; |
| [src/oauth.ts:547] | CallExpression | 1 survivor(s) can change: this.pendingLogins.delete(loginId); |
| [src/oauth.ts:553] | ConditionalExpression | 1 survivor(s) can change: if (pending.state) target.searchParams.set('state', pending.state); |
| [src/oauth.ts:564] | ConditionalExpression ×3, EqualityOperator | 4 survivor(s) can change: if (!entry \|\| entry.flow !== 'mcp' \|\| !entry.codeChallenge \|\| entry.expiresAt < Date.now() \|\| entry.clientId !== clie |
| [src/oauth.ts:565] | StringLiteral | 1 survivor(s) can change: throw new InvalidGrantError('Invalid authorization code'); |
| [src/oauth.ts:571] | CallExpression | 1 survivor(s) can change: this.codes.delete(authorizationCode); |
| [src/oauth.ts:572] | StringLiteral | 1 survivor(s) can change: throw new InvalidGrantError('Invalid authorization code'); |
| [src/oauth.ts:596] | ConditionalExpression | 1 survivor(s) can change: if (redirectUri !== undefined && !safeEqual(redirectUri, entry.redirectUri)) { |
| [src/oauth.ts:597] | StringLiteral | 1 survivor(s) can change: throw new InvalidGrantError('Redirect URI does not match the authorization request'); |
| [src/oauth.ts:614] | StringLiteral | 1 survivor(s) can change: throw new InvalidGrantError('Redirect URI does not match the authorization request'); |
| [src/oauth.ts:630] | ConditionalExpression ×3, EqualityOperator | 4 survivor(s) can change: if (!entry \|\| entry.flow !== flow \|\| entry.expiresAt < Date.now() \|\| entry.clientId !== clientId) { |
| [src/oauth.ts:631] | StringLiteral | 1 survivor(s) can change: throw new InvalidGrantError('Invalid authorization code'); |
| [src/oauth.ts:659] | StringLiteral | 1 survivor(s) can change: throw new InvalidGrantError('Invalid refresh token'); |
| [src/oauth.ts:664] | StringLiteral | 1 survivor(s) can change: throw new ServerError('Polarion could not be reached to renew the login; try again later'); |
| [src/oauth.ts:668] | StringLiteral | 1 survivor(s) can change: throw new InvalidGrantError('Polarion no longer accepts the token behind this login'); |
| [src/oauth.ts:684] | ArithmeticOperator | 1 survivor(s) can change: expires_in: Math.floor(ACCESS_TOKEN_TTL_MS / 1000), |
| [src/oauth.ts:685] | StringLiteral | 1 survivor(s) can change: scope: login.scopes.join(' '), |
| [src/oauth.ts:696] | BlockStatement | 1 survivor(s) can change: async verifyAccessToken(token: string): Promise<AuthInfo> { |
| [src/oauth.ts:698] | BooleanLiteral, ConditionalExpression, StringLiteral | 3 survivor(s) can change: if (!entry) throw new InvalidTokenError('Invalid or expired access token'); |
| [src/oauth.ts:699] | ObjectLiteral | 1 survivor(s) can change: return { |
| [src/oauth.ts:703] | ArithmeticOperator | 1 survivor(s) can change: expiresAt: Math.floor(entry.e / 1000), |
| [src/oauth.ts:704] | ObjectLiteral | 1 survivor(s) can change: ...(entry.r ? { resource: new URL(entry.r) } : {}), |
| [src/oauth.ts:705] | ObjectLiteral | 1 survivor(s) can change: extra: { polarionToken: entry.p }, |
| [src/oauth.ts:725] | EqualityOperator | 1 survivor(s) can change: return entry && entry.e > Date.now() ? entry : undefined; |
| [src/oauth.ts:729] | BlockStatement | 1 survivor(s) can change: private sweep(): void { |
| [src/oauth.ts:731] | CallExpression, ConditionalExpression ×2, EqualityOperator ×2 | 5 survivor(s) can change: for (const [key, entry] of this.pendingLogins) if (entry.expiresAt < now) this.pendingLogins.delete(key); |
| [src/oauth.ts:732] | CallExpression, ConditionalExpression ×2, EqualityOperator ×2 | 5 survivor(s) can change: for (const [key, entry] of this.codes) if (entry.expiresAt < now) this.codes.delete(key); |

### Sealing

These survivors cover the sealed-token prefix, secret validation and key derivation, payload encryption, malformed-token rejection, HMAC, and constant-time comparison. Regressions can weaken token authenticity or let malformed values pass.

| Source | Mutator(s) | Behavior at risk |
|---|---|---|
| [src/sealed.ts:15] | StringLiteral | 1 survivor(s) can change: export const SEALED_PREFIX = 'pmcp1.'; |
| [src/sealed.ts:29] | BlockStatement | 1 survivor(s) can change: export function isSealed(value: string): boolean { |
| [src/sealed.ts:30] | MethodExpression | 1 survivor(s) can change: return value.startsWith(SEALED_PREFIX); |
| [src/sealed.ts:44] | BlockStatement, ConditionalExpression, EqualityOperator | 3 survivor(s) can change: if (secret.length < MIN_SECRET_LENGTH) { |
| [src/sealed.ts:45] | StringLiteral | 1 survivor(s) can change: throw new Error('MCP_TOKEN_SECRET must be at least ${MIN_SECRET_LENGTH} characters long'); |
| [src/sealed.ts:47] | StringLiteral | 1 survivor(s) can change: this.key = createHash('sha256').update('seal:${secret}').digest(); |
| [src/sealed.ts:48] | StringLiteral | 1 survivor(s) can change: this.macKey = createHash('sha256').update('mac:${secret}').digest(); |
| [src/sealed.ts:60] | StringLiteral | 1 survivor(s) can change: const ciphertext = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]); |
| [src/sealed.ts:72] | ConditionalExpression | 1 survivor(s) can change: if (!value.startsWith(head)) return undefined; |
| [src/sealed.ts:74] | ArithmeticOperator, ConditionalExpression, EqualityOperator | 3 survivor(s) can change: if (raw.length <= IV_BYTES + TAG_BYTES) return undefined; |
| [src/sealed.ts:81] | BlockStatement | 1 survivor(s) can change: } catch { |
| [src/sealed.ts:94] | StringLiteral | 1 survivor(s) can change: return createHmac('sha256', this.macKey).update(value).digest('base64url'); |
| [src/sealed.ts:105] | BlockStatement | 1 survivor(s) can change: export function safeEqual(a: string, b: string): boolean { |
| [src/sealed.ts:108] | ConditionalExpression | 1 survivor(s) can change: if (left.length !== right.length) return false; |

### Write guards

These survivors cover cache bounds and invalidation, Polarion response parsing and pagination, custom-field allowlists, and user-reference validation. Regressions can let invalid writes through or block valid writes.

| Source | Mutator(s) | Behavior at risk |
|---|---|---|
| [src/guards.ts:81] | ConditionalExpression, EqualityOperator | 2 survivor(s) can change: if (cache.size >= MAX_CACHE_ENTRIES) { |
| [src/guards.ts:83] | CallExpression, ConditionalExpression ×2, EqualityOperator ×2 | 5 survivor(s) can change: for (const [k, v] of cache) if (v.expiresAt <= now) cache.delete(k); |
| [src/guards.ts:85] | ConditionalExpression | 1 survivor(s) can change: if (cache.size < MAX_CACHE_ENTRIES) break; |
| [src/guards.ts:89] | CallExpression | 1 survivor(s) can change: cache.delete(key); |
| [src/guards.ts:101] | StringLiteral | 1 survivor(s) can change: const marker = '::${projectId}/${workItemId}::'; |
| [src/guards.ts:102] | ConditionalExpression | 1 survivor(s) can change: for (const key of _optionsCache.keys()) if (key.includes(marker)) _optionsCache.delete(key); |
| [src/guards.ts:114] | ArrayDeclaration, ConditionalExpression ×2, LogicalOperator | 4 survivor(s) can change: if (!responseData \|\| typeof responseData !== 'object') return []; |
| [src/guards.ts:116] | ArrayDeclaration, ConditionalExpression | 2 survivor(s) can change: if (!Array.isArray(data)) return []; |
| [src/guards.ts:117] | MethodExpression | 1 survivor(s) can change: return data |
| [src/guards.ts:118] | ConditionalExpression ×2, LogicalOperator | 3 survivor(s) can change: .map((entry) => (entry && typeof entry === 'object' ? (entry as { id?: unknown }).id : undefined)) |
| [src/guards.ts:119] | ConditionalExpression | 1 survivor(s) can change: .filter((id): id is string => typeof id === 'string'); |
| [src/guards.ts:149] | StringLiteral | 1 survivor(s) can change: const scope = target.workItemId ? '${target.projectId}/${target.workItemId}' : '${target.projectId}::type=${target.type}'; |
| [src/guards.ts:152] | EqualityOperator | 1 survivor(s) can change: if (cached && cached.expiresAt > Date.now()) { |
| [src/guards.ts:165] | StringLiteral | 1 survivor(s) can change: url: '${requestContext.baseUrl}/projects/${encodeSegment(target.projectId)}/workitems/fields/${encodeSegment(field)}/actions/ |
| [src/guards.ts:174] | EqualityOperator | 1 survivor(s) can change: for (let page = 1; page <= MAX_OPTION_PAGES; page++) { |
| [src/guards.ts:177] | OptionalChaining | 1 survivor(s) can change: if (!(response.data as { links?: { next?: unknown } } \| undefined)?.links?.next) break; |
| [src/guards.ts:197] | ConditionalExpression, StringLiteral | 2 survivor(s) can change: if (typeof value !== 'string' \|\| value === '') continue; |
| [src/guards.ts:206] | StringLiteral | 1 survivor(s) can change: 'Retry once Polarion is reachable, or omit '${field}' from this write.', |
| [src/guards.ts:211] | ConditionalExpression, EqualityOperator, StringLiteral ×2 | 4 survivor(s) can change: const optionList = result.options.size > 0 ? [...result.options].join(', ') : '(none returned -- this field may not be a vali |
| [src/guards.ts:270] | StringLiteral ×4 | 4 survivor(s) can change: 'type', 'title', 'status', 'severity', 'priority', 'resolution', 'description', |
| [src/guards.ts:271] | StringLiteral ×6 | 6 survivor(s) can change: 'dueDate', 'hyperlinks', 'initialEstimate', 'remainingEstimate', 'resolvedOn', 'timeSpent', |
| [src/guards.ts:274] | StringLiteral ×5 | 5 survivor(s) can change: 'autoSuspect', 'homePageContent', 'moduleName', 'outlineNumbering', 'renderingLayouts', |
| [src/guards.ts:275] | StringLiteral ×3 | 3 survivor(s) can change: 'status', 'structureLinkRole', 'title', 'type', 'usesOutlineNumbering', |
| [src/guards.ts:278] | StringLiteral ×6 | 6 survivor(s) can change: 'allowedTypes', 'calculationType', 'capacity', 'color', 'defaultEstimate', 'description', |
| [src/guards.ts:279] | StringLiteral ×6 | 6 survivor(s) can change: 'dueDate', 'estimationField', 'finishedOn', 'homePageContent', 'id', 'isTemplate', 'name', |
| [src/guards.ts:280] | StringLiteral ×6 | 6 survivor(s) can change: 'previousTimeSpent', 'prioritizationField', 'sortOrder', 'startDate', 'startedOn', 'status', |
| [src/guards.ts:281] | StringLiteral | 1 survivor(s) can change: 'useReportFromTemplate', |
| [src/guards.ts:283] | ArrayDeclaration, StringLiteral ×3 | 4 survivor(s) can change: collections: new Set(['description', 'id', 'name']), |
| [src/guards.ts:284] | ArrayDeclaration | 1 survivor(s) can change: testruns: new Set([ |
| [src/guards.ts:285] | StringLiteral ×7 | 7 survivor(s) can change: 'finishedOn', 'groupId', 'homePageContent', 'id', 'idPrefix', 'isTemplate', 'keepInHistory', |
| [src/guards.ts:286] | StringLiteral ×6 | 6 survivor(s) can change: 'query', 'selectTestCasesBy', 'status', 'title', 'type', 'useReportFromTemplate', |
| [src/guards.ts:288] | ArrayDeclaration, StringLiteral ×5 | 6 survivor(s) can change: testrecords: new Set(['comment', 'duration', 'executed', 'result', 'testCaseRevision']), |
| [src/guards.ts:311] | ArrayDeclaration, ConditionalExpression ×2, LogicalOperator | 4 survivor(s) can change: if (!responseData \|\| typeof responseData !== 'object') return []; |
| [src/guards.ts:313] | ConditionalExpression ×3, LogicalOperator ×2 | 5 survivor(s) can change: if (!data \|\| typeof data !== 'object' \|\| Array.isArray(data)) return []; |
| [src/guards.ts:315] | ConditionalExpression | 1 survivor(s) can change: if (!attributes \|\| typeof attributes !== 'object' \|\| Array.isArray(attributes)) return []; |
| [src/guards.ts:365] | BlockStatement, ConditionalExpression | 2 survivor(s) can change: if (!standardKeys) { |
| [src/guards.ts:370] | BooleanLiteral, ObjectLiteral, StringLiteral | 3 survivor(s) can change: return { ok: false, reason: 'Internal error: unknown resourceType '${target.resourceType}' for ${target.scopeLabel}.' }; |
| [src/guards.ts:381] | LogicalOperator, StringLiteral ×2 | 3 survivor(s) can change: : '${callerCacheScope()}::${requestContext.baseUrl}::${target.projectId}::fields::${target.resourceType}::${target.type ?? "~ |
| [src/guards.ts:385] | ConditionalExpression, EqualityOperator | 2 survivor(s) can change: if (cached && cached.expiresAt > Date.now()) { |
| [src/guards.ts:390] | StringLiteral | 1 survivor(s) can change: method: 'GET', |
| [src/guards.ts:396] | StringLiteral | 1 survivor(s) can change: method: 'GET', |
| [src/guards.ts:409] | StringLiteral ×2 | 2 survivor(s) can change: 'Cannot verify custom field keys (${candidateKeys.join(', ')}) for ${target.scopeLabel}: ' + |
| [src/guards.ts:411] | StringLiteral | 1 survivor(s) can change: 'invisible to the UI. Ask the user to confirm these field ids exist for this type.', |
| [src/guards.ts:421] | StringLiteral | 1 survivor(s) can change: 'Refusing the write -- an unknown key persists silently, invisible to the UI. ' + |
| [src/guards.ts:422] | StringLiteral | 1 survivor(s) can change: 'Retry once Polarion is reachable.', |
| [src/guards.ts:436] | StringLiteral | 1 survivor(s) can change: 'Unknown field key(s) ${unknownKeys.join(', ')} for ${target.scopeLabel}. ' + |
| [src/guards.ts:437] | StringLiteral ×2 | 2 survivor(s) can change: 'Other field ids this type has: ${knownCustomFields.join(', ') \|\| '(none)'}.', |
| [src/guards.ts:457] | ArrayDeclaration ×2 | 2 survivor(s) can change: const entries = Array.isArray(relationshipData) ? relationshipData : relationshipData ? [relationshipData] : []; |
| [src/guards.ts:458] | MethodExpression | 1 survivor(s) can change: return entries |
| [src/guards.ts:459] | ConditionalExpression ×2, LogicalOperator | 3 survivor(s) can change: .map((e) => (e && typeof e === 'object' ? (e as { id?: unknown; type?: unknown }) : null)) |
| [src/guards.ts:460] | ConditionalExpression ×4, LogicalOperator ×2 | 6 survivor(s) can change: .filter((e): e is { id: string; type: string } => !!e && e.type === 'users' && typeof e.id === 'string') |
| [src/guards.ts:486] | ConditionalExpression | 1 survivor(s) can change: if (userIds.size === 0) return { ok: true }; |
| [src/guards.ts:491] | ConditionalExpression ×2, EqualityOperator ×2 | 4 survivor(s) can change: if (cached && cached.expiresAt > Date.now()) continue; |
| [src/guards.ts:494] | StringLiteral | 1 survivor(s) can change: method: 'GET', |
| [src/guards.ts:501] | ArithmeticOperator, ObjectLiteral | 2 survivor(s) can change: cacheSet(_userExistsCache, cacheKey, { expiresAt: Date.now() + cacheTtlMs }); |
| [src/guards.ts:503] | ConditionalExpression, LogicalOperator, OptionalChaining | 3 survivor(s) can change: if (axios.isAxiosError(error) && error.response?.status === 404) { |
| [src/guards.ts:527] | ArithmeticOperator, ConditionalExpression, EqualityOperator ×2 | 4 survivor(s) can change: if (slash > 0 && slash < id.length - 1) { |

### Tool filter

These survivors cover environment flag parsing, tool allowlists, read-only annotations, empty or unknown filters, and output-schema omission. Regressions can expose the wrong tools or advertise incorrect schemas.

| Source | Mutator(s) | Behavior at risk |
|---|---|---|
| [src/tool-filter.ts:38] | Regex | 1 survivor(s) can change: if (/^(1\|true\|yes\|on)$/i.test(text)) return true; |
| [src/tool-filter.ts:39] | Regex ×2 | 2 survivor(s) can change: if (text === '' \|\| /^(0\|false\|no\|off)$/i.test(text)) return false; |
| [src/tool-filter.ts:51] | Regex | 1 survivor(s) can change: const allow = raw ? raw.split(/[\s,]+/).filter(Boolean) : undefined; |
| [src/tool-filter.ts:53] | OptionalChaining | 1 survivor(s) can change: if (raw && allow?.length === 0) throw new Error('MCP_TOOLS="${raw}" lists no tool names'); |
| [src/tool-filter.ts:70] | OptionalChaining | 1 survivor(s) can change: .filter(([name, def]) => (!allow \|\| allow.has(name)) && (!filter.readOnly \|\| def.annotations?.readOnlyHint === true)) |
| [src/tool-filter.ts:73] | ArrayDeclaration | 1 survivor(s) can change: return { tools: kept, unknown: (filter.allow ?? []).filter(name => !tools.has(name)) }; |
| [src/tool-filter.ts:77] | BlockStatement, ConditionalExpression ×2, EqualityOperator ×2 | 5 survivor(s) can change: if (filtered.unknown.length > 0) { |
| [src/tool-filter.ts:78] | StringLiteral ×2 | 2 survivor(s) can change: console.error('[WARN] MCP_TOOLS names unknown tools, ignored: ${filtered.unknown.join(', ')}'); |
| [src/tool-filter.ts:82] | StringLiteral | 1 survivor(s) can change: throw new Error('The tool filter (MCP_TOOLS, MCP_READ_ONLY) leaves no tools; check the names in MCP_TOOLS'); |
| [src/tool-filter.ts:84] | BlockStatement, ConditionalExpression ×2, EqualityOperator | 4 survivor(s) can change: if (filtered.tools.size !== toolDefinitionMap.size) { |
| [src/tool-filter.ts:85] | StringLiteral | 1 survivor(s) can change: console.error('[INFO] Tool filter: ${filtered.tools.size}/${toolDefinitionMap.size} tools enabled'); |
| [src/tool-filter.ts:92] | StringLiteral | 1 survivor(s) can change: export const omitOutputSchema = parseFlag('MCP_OMIT_OUTPUT_SCHEMA', process.env.MCP_OMIT_OUTPUT_SCHEMA); |

### Executor dispatch slice

These survivors cover optional request bodies, dry-run authorization redaction, option-cache invalidation after writes, and download metadata. Regressions can leak credentials or send/format the wrong request.

| Source | Mutator(s) | Behavior at risk |
|---|---|---|
| [src/executor.ts:877] | ConditionalExpression | 1 survivor(s) can change: ...(requestBodyData !== undefined && { data: requestBodyData }), // Request body (if applicable) |
| [src/executor.ts:925] | ObjectLiteral | 1 survivor(s) can change: const redactedHeaders = { ...headers }; |
| [src/executor.ts:926] | ConditionalExpression, StringLiteral | 2 survivor(s) can change: if ('authorization' in redactedHeaders) redactedHeaders.authorization = '[REDACTED]'; |
| [src/executor.ts:950] | StringLiteral | 1 survivor(s) can change: console.error('[INFO] Executing tool "${toolName}": ${config.method} ${config.url}'); |
| [src/executor.ts:954] | ArrayDeclaration, BlockStatement | 2 survivor(s) can change: for (const target of enumTargets ?? []) { |
| [src/executor.ts:955] | CallExpression, ConditionalExpression ×2 | 3 survivor(s) can change: if (target.workItemId) invalidateWorkItemOptions(target.projectId, target.workItemId); |
| [src/executor.ts:959] | StringLiteral | 1 survivor(s) can change: const fileName = String(readArg(validatedArgs, 'attachmentId', nameMap) ?? readArg(validatedArgs, 'filename', nameMap) ?? '') |
| [src/executor.ts:960] | StringLiteral | 1 survivor(s) can change: return downloadResult(response.data, String(response.headers['content-type'] ?? ''), requestUrl, fileName); |

## Q04 surviving mutants and equivalent cases

After Q04, the survivor counts are OAuth 62 (92 timeouts separately), sealing 6, guards 82, tool filter 8, and executor slice 13. High-risk survivors remain around OAuth code binding and guard response parsing. No production source was changed and no survivor exposed a confirmed behavior bug.

| Source | Mutator(s) | Why the survivor matters |
|---|---|---|
| [src/oauth.ts:564] | ConditionalExpression ×3, EqualityOperator | MCP challenge lookup still has surviving mutations around code presence, flow, expiry, challenge presence, and client binding. A regression could bypass PKCE or bind a code to the wrong client. |
| [src/oauth.ts:630] | ConditionalExpression ×3, EqualityOperator | GPT redemption still has surviving mutations around code presence, flow, expiry, and client binding. These checks isolate the no-PKCE GPT flow. |
| [src/oauth.ts:596] | ConditionalExpression | A surviving redirect comparison mutation could let a code be exchanged using a different callback. |
| [src/oauth.ts:725] | EqualityOperator | The access-token exact-expiry boundary remains unpinned; acceptance still requires an unexpired sealed payload. |
| [src/oauth.ts:731–732] | ConditionalExpression, EqualityOperator, CallExpression | Sweeping expired pending logins and codes still has survivors. Entry-point checks independently reject expired credentials; sweep survivors can affect memory retention and exact-boundary cleanup. |
| [src/guards.ts:114–119, 311–315] | ConditionalExpression, LogicalOperator, ArrayDeclaration, MethodExpression | Malformed Polarion response shapes may still be interpreted differently by option and field parsers. Guards must refuse writes when a lookup cannot be parsed. |
| [src/guards.ts:457–460] | ArrayDeclaration, MethodExpression, ConditionalExpression, LogicalOperator | Relationship extraction still has survivors for object/array shapes and user type/id filtering; invalid user references must remain fail-closed. |
| [src/guards.ts:81–89, 152, 385, 491, 501, 503] | Cache and error-path operators | Cache eviction, TTL boundaries, 404 handling, and error conversion still have survivors. Future changes must preserve bounded caches and refusals on missing or unresolvable users. |
| [src/sealed.ts:60, 72, 74, 81] | StringLiteral, ConditionalExpression, ArithmeticOperator, BlockStatement | Reviewed equivalent cases are listed below: default UTF-8 encoding, rejected foreign ciphertext, empty ciphertext reaching JSON parsing, and an empty catch still return no payload. |
| [src/tool-filter.ts:51, 53, 77–84, 92] | Regex, OptionalChaining, ConditionalExpression, EqualityOperator, StringLiteral | Remaining cases are parser, logging, or error-message equivalences below; empty-filter startup still throws. |
| [src/executor.ts:877, 925–926, 954–955, 959–960] | ConditionalExpression, ObjectLiteral, StringLiteral, ArrayDeclaration, BlockStatement, CallExpression | Remaining dispatch survivors include optional body inclusion, redaction, cache invalidation after writes, and download formatting. |

### Equivalent mutants skipped for follow-up

Equivalent cases remain included in the raw survivor counts above; they were skipped as test-writing targets because they do not alter the security behavior under test.

- `src/sealed.ts:60` — omitting explicit `utf8` uses Node's default UTF-8 string encoding.
- `src/sealed.ts:72,74,81` — the alternate prefix guard still requires a valid GCM tag and kind-bound AAD; allowing zero-length ciphertext through the fast guard ends in JSON parse failure, and the catch returns `undefined`.
- `src/guards.ts:117,458` — replacements only remove TypeScript type assertions from the same response mapping expressions.
- `src/guards.ts:390,396,494` — an omitted Axios `method` defaults to `GET`, preserving the guard lookup request.
- `src/guards.ts:197,206,211,409,411,421–422,436–437` — message text and empty-option wording change, but each path still returns `ok: false` and blocks the write.
- `src/tool-filter.ts:51` — removing `+` from the separator regex can create empty split entries, which `.filter(Boolean)` removes before returning the allowlist.
- `src/tool-filter.ts:53` — when `raw` is truthy, `allow` is always assigned from `raw.split()`, so optional chaining does not affect the condition.
- `src/tool-filter.ts:77–84,92` — warning/info conditions and text, empty-filter error wording, and flag error labels affect diagnostics only; the filter still warns or throws and exposes the same tools.
- `src/executor.ts:950` — the execution log text does not change request authorization or whether guarded dispatch runs.

Other survivors remain in the scores and are not classified as equivalent. OAuth code binding, redirect comparison, and expiry boundaries, plus fail-closed guard parsing, remain visible above. All six sealing survivors were reviewed as equivalent.

## Weak tests rewritten

- `tests/http-client.test.ts:34–47` — now asserts PATCH rejects and GET/DELETE retry to a 200 response before checking attempt counts.
- `tests/mcp-sessions.test.ts:30–42,70–82` — the activity test now parses each JSON-RPC response and checks version, id, and the tools list.
- `tests/oauth-redirect-allowlist.test.ts:118–133` — the pre-allowlist setup now validates registration, HTML content type, no-store header, login id, and the displayed return host.

No assertion-free tests, mock-only tautologies, or snapshots of test output were found in `tests/*.test.ts`.
