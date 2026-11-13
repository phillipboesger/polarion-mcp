#!/usr/bin/env node
// Creates the demo project and LiveDoc on a THROWAWAY Polarion (idempotent). Refuses non-local URLs unless --i-know.
//
//   POLARION_BASE_URL=http://localhost POLARION_TOKEN=... node scripts/demo/seed.mjs
//
// Custom fields cannot be created through the REST API: the project template must define `asilLevel`
// on the requirement type. The seed checks that and tells you what is missing.
import { DEMO, assertLocalTarget, isMain, parseArgs, restBase } from './lib/common.mjs';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * @param {{ baseUrl: string, token: string, project?: string, iKnow?: boolean, templateId?: string,
 *           fetchImpl?: typeof fetch, log?: (line: string) => void, pollMs?: number, pollAttempts?: number }} options
 * @returns {Promise<{ created: string[], existing: string[], missingCustomField: boolean }>}
 */
export async function runSeed({ baseUrl, token, project = DEMO.project, iKnow = false, templateId = 'empty', fetchImpl = fetch, log = () => {}, pollMs = 2000, pollAttempts = 60 }) {
  assertLocalTarget(baseUrl, iKnow);
  const api = restBase(baseUrl);
  const headers = { authorization: `Bearer ${token}`, accept: 'application/json' };
  const request = (method, route, body) => fetchImpl(`${api}${route}`, {
    method,
    headers: body ? { ...headers, 'content-type': 'application/json' } : headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const exists = async route => {
    const response = await request('GET', route);
    if (response.status === 404) return false;
    if (!response.ok) throw new Error(`GET ${route} failed with HTTP ${response.status}`);
    return true;
  };
  const created = [];
  const existing = [];

  const projectRoute = `/projects/${encodeURIComponent(project)}`;
  if (await exists(projectRoute)) existing.push(`project ${project}`);
  else {
    const response = await request('POST', '/projects/actions/createProject', { projectId: project, trackerPrefix: DEMO.trackerPrefix, templateId });
    if (!response.ok) throw new Error(`createProject failed with HTTP ${response.status} (template "${templateId}"; set DEMO_TEMPLATE_ID to a template of this instance)`);
    for (let attempt = 0; attempt < pollAttempts && !(await exists(projectRoute)); attempt++) await sleep(pollMs);
    if (!(await exists(projectRoute))) throw new Error(`Project ${project} did not appear after createProject`);
    created.push(`project ${project}`);
  }

  const docRoute = `${projectRoute}/spaces/${DEMO.space}/documents/${DEMO.document}`;
  if (await exists(docRoute)) existing.push(`document ${DEMO.space}/${DEMO.document}`);
  else {
    const response = await request('POST', `${projectRoute}/spaces/${DEMO.space}/documents`, {
      data: [{ type: 'documents', attributes: { moduleName: DEMO.document, title: DEMO.documentTitle, type: 'req_specification' } }],
    });
    if (!response.ok) throw new Error(`Creating the LiveDoc failed with HTTP ${response.status}`);
    created.push(`document ${DEMO.space}/${DEMO.document}`);
  }

  const metadata = await request('GET', `${projectRoute}/actions/getFieldsMetadata?resourceType=workitems&targetType=${DEMO.workItemType}`);
  let missingCustomField = true;
  if (metadata.ok) {
    const fields = Object.keys((await metadata.json())?.data?.attributes ?? {});
    missingCustomField = !fields.includes(DEMO.customField);
  }
  if (missingCustomField) log(`WARNING: custom field "${DEMO.customField}" is not defined for ${DEMO.workItemType} in ${project}. Add it in the project administration (Work Items > Custom Fields) before recording.`);
  for (const line of created) log(`created ${line}`);
  for (const line of existing) log(`exists  ${line}`);
  return { created, existing, missingCustomField };
}

async function main() {
  const { flags, values } = parseArgs(process.argv.slice(2));
  const baseUrl = process.env.POLARION_BASE_URL;
  const token = process.env.POLARION_TOKEN ?? '';
  if (!baseUrl || !token) throw new Error('Set POLARION_BASE_URL (e.g. http://localhost) and POLARION_TOKEN.');
  const result = await runSeed({ baseUrl, token, project: values.project ?? DEMO.project, iKnow: flags.has('i-know'), templateId: process.env.DEMO_TEMPLATE_ID ?? 'empty', log: line => console.log(line) });
  if (result.missingCustomField) process.exitCode = 2;
}

if (isMain(import.meta.url)) {
  main().catch(error => { console.error(`seed: ${error.message}`); process.exit(1); });
}
