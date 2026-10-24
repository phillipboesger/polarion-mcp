import { GENERATED_FROM_POLARION_VERSION } from './generated-from.js';

export interface VersionCheckOptions {
  apiBaseUrl: string;
  bearerToken?: string;
  logger: Pick<Console, 'warn'>;
  fetchImpl?: typeof fetch;
}

export function compareVersions(serverVersion: string, generatedVersion = GENERATED_FROM_POLARION_VERSION): 'older' | 'newer' | 'equal' | 'unparseable' {
  const parts = (value: string) => {
    const version = value.match(/\d+/g)?.map(Number);
    // Polarion's REST metadata reports product versions such as 3.25.12,
    // while release labels use 2506/2606. Normalize both to release labels.
    if (version?.length && version[0] < 10 && version.length > 1 && version[1] >= 20) return [version[1], 6];
    if (version?.length === 1 && version[0] >= 2000) return [Math.floor(version[0] / 100), version[0] % 100];
    return version;
  };
  const server = parts(serverVersion); const generated = parts(generatedVersion);
  if (!server?.length || !generated?.length) return 'unparseable';
  for (let i = 0; i < Math.max(server.length, generated.length); i++) {
    const delta = (server[i] ?? 0) - (generated[i] ?? 0);
    if (delta < 0) return 'older';
    if (delta > 0) return 'newer';
  }
  return 'equal';
}

export async function checkPolarionVersion(options: VersionCheckOptions): Promise<void> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    try {
      const response = await (options.fetchImpl ?? fetch)(`${options.apiBaseUrl.replace(/\/$/, '')}/metadata`, {
        headers: options.bearerToken ? { Authorization: `Bearer ${options.bearerToken}` } : {}, signal: controller.signal, redirect: 'error',
      });
      if (!response.ok) return;
      const data = await response.json() as { data?: { attributes?: { version?: unknown } } };
      const version = data.data?.attributes?.version;
      if (typeof version !== 'string') return;
      const relation = compareVersions(version);
      if (relation === 'older' || relation === 'newer') options.logger.warn(`[WARN] Polarion server version ${version} is ${relation} than the generated tool surface (${GENERATED_FROM_POLARION_VERSION}); REST operation compatibility may differ.`);
    } finally { clearTimeout(timer); }
  } catch { /* Compatibility checks must never interrupt a tool call. */ }
}

export function createVersionCheck(options: VersionCheckOptions): () => void {
  let started = false;
  return () => {
    if (started) return;
    started = true;
    void checkPolarionVersion(options);
  };
}
