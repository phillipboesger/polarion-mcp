// Minimal fake Polarion REST API for `--mock` runs and tests. It answers only what the scripted
// demo touches (guard lookups, work item create, read-back) with the same JSON:API shapes as Polarion.
import { createServer } from 'node:http';
import { once } from 'node:events';
import { DEMO } from './common.mjs';

const OPTIONS = {
  type: ['requirement', 'task', 'defect'],
  status: ['draft', 'open', 'approved'],
  priority: ['50.0', '70.0', '90.0'],
  severity: ['normal', 'major', 'blocker'],
};
const STANDARD_FIELDS = ['title', 'type', 'description', 'status', 'priority', 'severity', 'resolution', 'dueDate'];

/** Polarion stores rich text as normalized HTML; mimic that so the read-back is realistic, not byte-identical. */
function normalizeAttributes(attributes) {
  const out = { ...attributes };
  if (out.description?.type === 'text/html') out.description = { type: 'text/html', value: `<p>${out.description.value.replace(/^<p>|<\/p>$/g, '')}</p>` };
  return out;
}

/**
 * Starts the fake on a free loopback port.
 * @param {{ token?: string, customFields?: string[], project?: string }} [options]
 * @returns {Promise<{ baseUrl: string, requests: Array<{method: string, path: string}>, items: Map<string, object>, close: () => Promise<void> }>}
 */
export async function startMockPolarion({ token, customFields = [DEMO.customField], project = DEMO.project } = {}) {
  const items = new Map();
  const requests = [];
  let counter = 0;

  const send = (res, status, body) => {
    const text = body === undefined ? '' : JSON.stringify(body);
    res.writeHead(status, { 'content-type': 'application/json' }).end(text);
  };
  const error = (res, status, title, detail) => send(res, status, { errors: [{ status: String(status), title, detail }] });

  const server = createServer((req, res) => {
    void (async () => {
      const url = new URL(req.url ?? '/', 'http://mock.local');
      const route = url.pathname.replace(/^\/polarion\/rest\/v1/, '');
      requests.push({ method: req.method ?? 'GET', path: route });
      if (token && req.headers.authorization !== `Bearer ${token}`) return error(res, 401, 'Unauthorized', 'Invalid token');
      const chunks = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : undefined;
      const parts = route.split('/').filter(Boolean).map(decodeURIComponent);

      if (req.method === 'GET' && parts[0] === 'projects' && parts[1] === project && parts[2] === 'actions' && parts[3] === 'getFieldsMetadata') {
        return send(res, 200, { data: { type: 'fieldsmetadata', attributes: Object.fromEntries([...STANDARD_FIELDS, ...customFields].map(field => [field, { type: 'string' }])) } });
      }
      if (req.method === 'GET' && parts[0] === 'projects' && parts[1] === project && parts[2] === 'workitems' && parts[3] === 'fields' && parts[5] === 'actions' && parts[6] === 'getAvailableOptions') {
        return send(res, 200, { data: (OPTIONS[parts[4]] ?? []).map(id => ({ type: 'options', id })), links: {} });
      }
      if (req.method === 'POST' && parts[0] === 'projects' && parts[1] === project && parts[2] === 'workitems' && parts.length === 3) {
        const created = (body?.data ?? []).map(item => {
          const id = `${DEMO.trackerPrefix}-${++counter}`;
          items.set(id, { type: 'workitems', id: `${project}/${id}`, attributes: { id, ...normalizeAttributes(item.attributes ?? {}) } });
          return { type: 'workitems', id: `${project}/${id}`, links: { self: `http://${req.headers.host}/polarion/rest/v1/projects/${project}/workitems/${id}` } };
        });
        return send(res, 201, { data: created });
      }
      if (req.method === 'GET' && parts[0] === 'projects' && parts[1] === project && parts[2] === 'workitems' && parts.length === 4) {
        const item = items.get(parts[3]);
        return item ? send(res, 200, { data: item }) : error(res, 404, 'Not Found', `Work item ${parts[3]} not found`);
      }
      return error(res, 404, 'Not Found', `No mock route for ${req.method} ${route}`);
    })().catch(cause => error(res, 500, 'Mock error', String(cause)));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const { port } = server.address();
  return {
    baseUrl: `http://127.0.0.1:${port}/polarion/rest/v1`,
    requests,
    items,
    close: () => new Promise(resolve => { server.close(() => resolve()); server.closeAllConnections?.(); }),
  };
}
