/**
 * MCP_PROFILE bundles the safety switches so an operator picks one word
 * instead of three settings.
 *
 * - `standard` (default): nothing changes.
 * - `safe`: confirm destructive tools and mark user-authored text as untrusted.
 * - `readonly`: `safe` plus MCP_READ_ONLY, so no tool can write.
 *
 * A single switch that is set explicitly always wins over the profile.
 * Importing this module applies the profile to `process.env`, because the
 * tool filter reads its flags at import time.
 */

export const PROFILES = ['standard', 'safe', 'readonly'] as const;
export type ProfileName = (typeof PROFILES)[number];

const SAFE = { MCP_CONFIRM_DESTRUCTIVE: 'true', MCP_MARK_UNTRUSTED: 'true' } as const;
const DEFAULTS: Record<ProfileName, Record<string, string>> = {
  standard: {},
  safe: { ...SAFE },
  readonly: { ...SAFE, MCP_READ_ONLY: 'true' },
};

/**
 * @param env - Environment to read `MCP_PROFILE` from.
 * @returns The profile name; `standard` when unset or empty.
 * @throws Error for an unknown profile, so a typo never silently weakens a deployment.
 */
export function parseProfile(env: NodeJS.ProcessEnv): ProfileName {
  const value = env.MCP_PROFILE?.trim().toLowerCase();
  if (!value) return 'standard';
  if ((PROFILES as readonly string[]).includes(value)) return value as ProfileName;
  throw new Error(`MCP_PROFILE must be ${PROFILES.join(', ')}, got "${env.MCP_PROFILE?.trim()}"`);
}

/**
 * Fills the switches the profile sets and the operator left unset.
 *
 * @param env - Environment to complete in place.
 * @returns The names of the switches the profile set.
 */
export function applyProfile(env: NodeJS.ProcessEnv): string[] {
  const applied: string[] = [];
  for (const [name, value] of Object.entries(DEFAULTS[parseProfile(env)])) {
    if (env[name]?.trim()) continue;
    env[name] = value;
    applied.push(name);
  }
  return applied;
}

applyProfile(process.env);
