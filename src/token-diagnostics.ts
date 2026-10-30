/** Safe, stable explanations for a failed Polarion metadata PAT probe. */
export type TokenDiagnosticCategory =
  | 'invalid_pat'
  | 'permission_denied'
  | 'request_rejected'
  | 'endpoint_missing'
  | 'redirect'
  | 'server_error'
  | 'unexpected_status'
  | 'unusable_response'
  | 'tls_trust'
  | 'dns'
  | 'timeout'
  | 'connection_refused'
  | 'network_error';

export interface TokenDiagnostic {
  category: TokenDiagnosticCategory;
  upstreamStatus?: number;
  retryable: boolean;
  message: string;
  action: string;
}

export type TokenProbeResult = { valid: true } | { valid: false; diagnostic: TokenDiagnostic };

const guidance: Record<TokenDiagnosticCategory, { message: string; action: string; retryable: boolean }> = {
  invalid_pat: { message: 'Polarion token probe GET /metadata: Polarion rejected the token.', action: 'Check whether the PAT is valid and has not been revoked.', retryable: false },
  permission_denied: { message: 'Polarion token probe GET /metadata: Polarion denied access for this token.', action: 'Check that the PAT can access Polarion REST metadata.', retryable: false },
  request_rejected: { message: 'Polarion token probe GET /metadata: Polarion rejected the request.', action: 'Check that API_BASE_URL uses the hostname Polarion and its proxy accept (the address users open in the browser). The server log shows Polarion\'s own message. For the Polarion Docker image, a missing ALLOWED_HOSTS entry is one possible cause.', retryable: false },
  endpoint_missing: { message: 'Polarion token probe GET /metadata: the endpoint was not found.', action: 'Check API_BASE_URL ends in /polarion/rest/v1 and uses the final server address. HTTP/OAuth requires Polarion 2512 or newer.', retryable: false },
  redirect: { message: 'Polarion token probe GET /metadata: the request was redirected.', action: 'Check the configured REST base URL and proxy or login routing.', retryable: false },
  server_error: { message: 'Polarion token probe GET /metadata: Polarion returned a server error.', action: 'Retry later and check Polarion availability.', retryable: true },
  unexpected_status: { message: 'Polarion token probe GET /metadata: Polarion returned an unexpected status.', action: 'Check Polarion and proxy configuration.', retryable: false },
  unusable_response: { message: 'Polarion token probe GET /metadata: the response was not usable JSON metadata.', action: 'Check that the REST endpoint returns valid Polarion metadata JSON.', retryable: false },
  tls_trust: { message: 'Polarion token probe GET /metadata: TLS trust failed.', action: 'Check the certificate hostname and validity dates. Mount the company CA PEM and set NODE_EXTRA_CA_CERTS when needed.', retryable: false },
  dns: { message: 'Polarion token probe GET /metadata: DNS lookup failed.', action: 'Check the Polarion hostname and DNS configuration.', retryable: true },
  timeout: { message: 'Polarion token probe GET /metadata: the request timed out.', action: 'Retry later and check Polarion network availability.', retryable: true },
  connection_refused: { message: 'Polarion token probe GET /metadata: the connection was refused.', action: 'Check that Polarion is available at the configured address.', retryable: true },
  network_error: { message: 'Polarion token probe GET /metadata: a network error occurred.', action: 'Check network access to Polarion and retry.', retryable: true },
};

/** Probe endpoints: /metadata (2512+, no global REST GET needed) and the /projects fallback for older releases. */
export type TokenProbeEndpoint = '/metadata' | '/projects';

export function tokenDiagnostic(category: TokenDiagnosticCategory, upstreamStatus?: number, endpoint: TokenProbeEndpoint = '/metadata'): TokenDiagnostic {
  const entry = guidance[category];
  let { message, action } = entry;
  if (endpoint === '/projects') {
    message = message.replace('GET /metadata', 'GET /projects');
    // Releases before 2512 have no /metadata, so only an ordinary REST read can tell a valid token from an invalid one.
    if (category === 'permission_denied') action = 'This Polarion has no /metadata (before 2512), so the login check reads GET /projects. Allow global REST GET for this user, or upgrade to Polarion 2512 or newer.';
    if (category === 'endpoint_missing') action = 'Neither /metadata nor /projects was found. Check API_BASE_URL ends in /polarion/rest/v1 and that REST is enabled.';
  }
  return { category, ...(upstreamStatus === undefined ? {} : { upstreamStatus }), retryable: entry.retryable, message, action };
}

/** Classifies only stable Axios code fields; never incorporates exception text. */
export function tokenNetworkDiagnostic(error: unknown): TokenDiagnostic {
  const code = error !== null && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (['CERT_AUTHORITY_INVALID', 'CERT_HAS_EXPIRED', 'CERT_NOT_YET_VALID', 'UNABLE_TO_GET_ISSUER_CERT', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'ERR_TLS_CERT_ALTNAME_INVALID', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'SELF_SIGNED_CERT_IN_CHAIN'].includes(code)) return tokenDiagnostic('tls_trust');
  if (['ENOTFOUND', 'EAI_AGAIN', 'ENODATA'].includes(code)) return tokenDiagnostic('dns');
  if (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || code === 'ERR_SOCKET_TIMEOUT') return tokenDiagnostic('timeout');
  if (code === 'ECONNREFUSED') return tokenDiagnostic('connection_refused');
  return tokenDiagnostic('network_error');
}

/**
 * Polarion's own explanation for a refused probe, for the server log only (never
 * returned to callers). Reads the JSON:API error, or the text of a plain/HTML
 * body such as a proxy's Host rejection, and removes the token and control characters.
 */
export function upstreamDetail(data: unknown, token: string): string {
  let raw = '';
  if (typeof data === 'string') raw = (token ? data.split(token).join('[token]') : data).slice(0, 4000).replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]*>/g, ' ');
  else if (data !== null && typeof data === 'object' && 'errors' in data && Array.isArray(data.errors)) {
    const first: unknown = data.errors[0];
    if (first !== null && typeof first === 'object') {
      const { detail, title } = first as { detail?: unknown; title?: unknown };
      raw = typeof detail === 'string' ? detail : typeof title === 'string' ? title : '';
    }
  }
  // eslint-disable-next-line no-control-regex
  const text = (token ? raw.split(token).join('[token]') : raw).replace(/[\u0000-\u001f\u007f-\u009f]+/g, ' ').replace(/\s+/g, ' ').trim();
  return text.slice(0, 200);
}
