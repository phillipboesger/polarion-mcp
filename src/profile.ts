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
 * @returns The profile name, or undefined when the value is not a known profile.
 */
function lookupProfile(env: NodeJS.ProcessEnv): ProfileName | undefined {
  const value = env.MCP_PROFILE?.trim().toLowerCase();
  if (!value) return 'standard';
  return (PROFILES as readonly string[]).includes(value) ? value as ProfileName : undefined;
}

/**
 * @param env - Environment to read `MCP_PROFILE` from.
 * @returns The profile name; `standard` when unset or empty.
 * @throws Error for an unknown profile. Startup entry points call this so a typo
 *   stops the server instead of silently weakening a deployment.
 */
export function parseProfile(env: NodeJS.ProcessEnv): ProfileName {
  const profile = lookupProfile(env);
  if (profile) return profile;
  throw new Error(`MCP_PROFILE must be ${PROFILES.join(', ')}, got "${env.MCP_PROFILE?.trim()}"`);
}

/**
 * Fills the switches the profile sets and the operator left unset. An unknown
 * profile sets nothing and never throws here: importing this module must not
 * fail. The startup path calls {@link parseProfile} and refuses to run.
 *
 * @param env - Environment to complete in place.
 * @returns The names of the switches the profile set.
 */
export function applyProfile(env: NodeJS.ProcessEnv): string[] {
  const profile = lookupProfile(env);
  if (!profile) return [];
  const applied: string[] = [];
  for (const [name, value] of Object.entries(DEFAULTS[profile])) {
    if (env[name]?.trim()) continue;
    env[name] = value;
    applied.push(name);
  }
  return applied;
}

applyProfile(process.env);
