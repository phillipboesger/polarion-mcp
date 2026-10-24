import { readFile } from 'node:fs/promises';
import Ajv from 'ajv';

const cases = JSON.parse(await readFile(new URL('./cases.json', import.meta.url), 'utf8'));
const schema = JSON.parse(await readFile(new URL('./schema.json', import.meta.url), 'utf8'));
const toolSource = await readFile(new URL('../src/tools.ts', import.meta.url), 'utf8');
const available = new Set([...toolSource.matchAll(/name: "([^"]+)"/g)].map((match) => match[1]));

const validate = new Ajv({ allErrors: true }).compile(schema);
if (!validate(cases)) throw new Error(`Eval cases fail schema validation: ${JSON.stringify(validate.errors)}`);
if (cases.length !== 15) throw new Error('Expected exactly 15 eval cases');
const ids = new Set();
for (const testCase of cases) {
  if (!/^P1-\d{2}$/.test(testCase.id) || ids.has(testCase.id) || testCase.task.length < 10 ||
      typeof testCase.readOnly !== 'boolean' || !Array.isArray(testCase.expectedTools) || !testCase.expectedTools.length) {
    throw new Error(`Invalid eval case: ${testCase.id}`);
  }
  ids.add(testCase.id);
  for (const name of testCase.expectedTools) if (!available.has(name)) throw new Error(`${testCase.id}: unknown tool ${name}`);
}
console.log(`Validated ${cases.length} eval cases and ${available.size} tool names`);
if (process.argv.includes('--validate-only')) process.exit(0);
if (!process.env.EVALS_ANTHROPIC_API_KEY) {
  console.log('agent run skipped');
  process.exit(0);
}
if (!process.env.API_BASE_URL || !process.env.BEARER_TOKEN) throw new Error('API_BASE_URL and BEARER_TOKEN are required for agent runs');

const { toolDefinitionMap } = await import('../build/tools.js');
const { default: Anthropic } = await import('@anthropic-ai/sdk');
const client = new Anthropic({ apiKey: process.env.EVALS_ANTHROPIC_API_KEY });
const tools = [...toolDefinitionMap.values()].map((tool) => ({
  name: tool.name,
  description: tool.description,
  input_schema: tool.inputSchema,
}));
let score = 0;
for (const testCase of cases) {
  const response = await client.messages.create({
    model: process.env.EVALS_MODEL || 'claude-sonnet-4-5-20250929',
    max_tokens: 512,
    tools,
    messages: [{ role: 'user', content: `${testCase.task}\nPolarion base URL: ${process.env.API_BASE_URL}. Use tools only to select the appropriate action; do not execute any tool.` }],
  });
  const selected = response.content.filter((block) => block.type === 'tool_use').map((block) => block.name);
  const correct = selected.some((name) => testCase.expectedTools.includes(name)) &&
    (!testCase.readOnly || selected.every((name) => !['deleteWorkItems', 'deleteAllWorkItems', 'deleteWorkItem'].includes(name)));
  score += Number(correct);
  console.log(`${correct ? 'PASS' : 'FAIL'} ${testCase.id}: ${selected.join(', ') || 'no tool'}`);
}
console.log(`Score: ${score}/${cases.length}`);
if (score !== cases.length) process.exitCode = 1;
