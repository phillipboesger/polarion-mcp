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
  request_rejected: { message: 'Polarion token probe GET /metadata: Polarion rejected the request.', action: 'Check API_BASE_URL and the hostname accepted by Polarion or its proxy; an upstream Host allowlist is one possible cause.', retryable: false },
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

export function tokenDiagnostic(category: TokenDiagnosticCategory, upstreamStatus?: number): TokenDiagnostic {
  const { message, action, retryable } = guidance[category];
  return { category, ...(upstreamStatus === undefined ? {} : { upstreamStatus }), retryable, message, action };
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
