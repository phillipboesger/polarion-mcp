import { createHash } from 'node:crypto';

export interface Principal {
  id: string;
  [key: string]: unknown;
}

export type PolicyDecision = { action: 'allow' } | { action: 'deny'; reason: string } | { action: 'requireConfirmation' };

export interface PolicyHook {
  beforeCall(input: { tool: string; args: Record<string, unknown>; user: Principal; readOnly: boolean; destructive: boolean }): Promise<PolicyDecision> | PolicyDecision;
}

export interface AuditEvent {
  timestamp: string;
  correlationId: string;
  tool: string;
  argsHash: string;
  userIdHash: string;
  outcome: 'success' | 'error' | 'denied' | 'confirmation-required';
  durationMs: number;
}

export interface AuditSink {
  record(event: AuditEvent): Promise<void> | void;
}

export interface AuthProvider {
  validateRequest(input: { bearerToken?: string; userScope?: string }): Promise<Principal> | Principal;
}

export interface InstanceResolver {
  resolve(principal: Principal): Promise<{ apiBaseUrl: string }> | { apiBaseUrl: string };
}

export interface PolarionExtensions {
  policyHook: PolicyHook;
  auditSink: AuditSink;
  authProvider: AuthProvider;
  instanceResolver: InstanceResolver;
}

export function createDefaultExtensions(apiBaseUrl: string): PolarionExtensions {
  return {
    policyHook: { beforeCall: () => ({ action: 'allow' }) },
    auditSink: { record: () => undefined },
    authProvider: { validateRequest: ({ userScope }) => ({ id: userScope ?? 'anonymous' }) },
    instanceResolver: { resolve: () => ({ apiBaseUrl }) },
  };
}

export function hashAuditValue(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(value) ?? 'undefined').digest('hex');
}
