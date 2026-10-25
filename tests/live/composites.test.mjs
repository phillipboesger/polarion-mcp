// Real Polarion regression coverage for the virtual composite tools. All writes
// use uniquely titled fixtures in LIVE_PROJECT and are removed in after().
import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PROJECT, call, connectStdio, json } from "./helpers.mjs";

const createdItems = [];
const tag = `mcp-live-${randomUUID()}`;
const parseComposite = (result) => JSON.parse(result.text);

async function createItems(client, entries) {
  const ids = [];
  for (let offset = 0; offset < entries.length; offset += 50) {
    const batch = entries.slice(offset, offset + 50);
    const result = await call(client, "postWorkItems", {
      projectId: PROJECT,
      requestBody: { data: batch.map(({ type = "task", title }) => ({ type: "workitems", attributes: { type, title } })) },
    });
    assert.equal(result.isError, false, result.thrown ?? result.text);
    const returned = json(result.text).data;
    for (const resource of returned) {
      const id = resource.id.split("/").at(-1);
      ids.push(id);
      createdItems.push(id);
    }
    assert.equal(returned.length, batch.length, "Polarion did not create the full fixture batch");
  }
  return ids;
}

async function createItem(client, type, title) {
  return (await createItems(client, [{ type, title }]))[0];
}

async function namedJobs(client, name) {
  const result = await call(client, "getJobs", {
    page_size_: 100,
    page_number_: 1,
    max_items: 1000,
    fields: { jobs: "name,jobId,state,status" },
  });
  assert.equal(result.isError, false, result.thrown ?? result.text);
  const data = result.structured?.data ?? json(result.text).data;
  return data.filter((job) => job.attributes?.name === name || job.attributes?.jobId === name);
}

async function attachmentsFor(client, workItemId, fileName) {
  const result = await call(client, "getWorkItemAttachments", {
    projectId: PROJECT,
    workItemId,
    fields: { workitem_attachments: "fileName,title,length" },
  });
  assert.equal(result.isError, false, result.thrown ?? result.text);
  const data = result.structured?.data ?? json(result.text).data;
  return data.filter((attachment) => attachment.attributes?.fileName === fileName);
}

describe("composite tools against disposable Polarion data", () => {
  let client;

  before(async () => {
    client = await connectStdio();
  });

  after(async () => {
    if (!client) return;
    const cleanupErrors = [];
    for (let offset = 0; offset < createdItems.length; offset += 50) {
      const batch = createdItems.slice(offset, offset + 50);
      const result = await call(client, "deleteWorkItems", {
        projectId: PROJECT,
        requestBody: { data: batch.map((id) => ({ type: "workitems", id: `${PROJECT}/${id}` })) },
      });
      if (result.isError) cleanupErrors.push(result.text.slice(0, 300));
    }
    await client.close();
    assert.deepEqual(cleanupErrors, [], "failed to remove test-owned Work Items");
  });

  test("run_job_and_wait previews and rejects malformed inputs without creating jobs, then executes once", async () => {
    const labels = ["boolean-preview", "string-preview", "invalid-flag", "missing-body", "execute-once"]
      .map((part) => `${tag}-${part}`);
    for (const name of labels) assert.equal((await namedJobs(client, name)).length, 0, `job ${name} already exists`);

    const requestBody = { jobId: "jobs.dummy", name: labels[0], params: { sleepMillis: "1" }, scope: "system" };
    const booleanPreview = await call(client, "run_job_and_wait", { requestBody, dry_run: true });
    assert.equal(booleanPreview.isError, false, booleanPreview.thrown ?? booleanPreview.text);
    assert.match(booleanPreview.text, /"dryRun":true/);
    assert.equal((await namedJobs(client, labels[0])).length, 0, "boolean preview created a real job");

    const stringPreview = await call(client, "run_job_and_wait", {
      requestBody: { ...requestBody, name: labels[1] }, dry_run: "true",
    });
    assert.equal(stringPreview.isError, false, stringPreview.thrown ?? stringPreview.text);
    assert.match(stringPreview.text, /"dryRun":true/);
    assert.equal((await namedJobs(client, labels[1])).length, 0, "string preview created a real job");

    const invalid = await call(client, "run_job_and_wait", {
      requestBody: { ...requestBody, name: labels[2] }, dry_run: "maybe",
    });
    assert.equal(invalid.isError, true, "an invalid dry_run value must be rejected");
    assert.equal((await namedJobs(client, labels[2])).length, 0, "invalid dry_run created a real job");

    const missing = await call(client, "run_job_and_wait", { dry_run: false });
    assert.equal(missing.isError, true, "a missing job body must be rejected");
    assert.equal((await namedJobs(client, labels[3])).length, 0);

    const execution = await call(client, "run_job_and_wait", {
      requestBody: { ...requestBody, name: labels[4] }, confirm: true, max_wait_seconds: 30,
    });
    assert.equal(execution.isError, false, execution.thrown ?? execution.text);
    const completed = parseComposite(execution);
    assert.ok(completed.jobId, "the composite must return the real Polarion job ID");
    assert.ok(["OK", "finished", "completed", "done"].includes(String(completed.status).toLowerCase()) || completed.status === "OK",
      `dummy job did not reach a terminal successful status: ${completed.status}`);
    const jobs = await namedJobs(client, labels[4]);
    assert.equal(jobs.length, 1, `explicit execution created ${jobs.length} matching jobs instead of one`);
    assert.equal(jobs[0].id, completed.jobId, "the composite returned a different job than Polarion recorded");
  });

  test("read_document_markdown and read_document_section return real LiveDoc headings and body", async () => {
    const args = { projectId: "drivepilot", spaceId: "Requirements", document: "Feasibility Study" };
    const document = await call(client, "read_document_markdown", args);
    assert.equal(document.isError, false,
      `Missing expected LiveDoc fixture drivepilot/Requirements/Feasibility Study: ${document.thrown ?? document.text}`);
    const rendered = parseComposite(document);
    assert.ok(typeof rendered.markdown === "string" && rendered.markdown.trim().length > 0,
      "the LiveDoc body is empty; check document-part sparse field selection");
    assert.ok(Array.isArray(rendered.outline) && rendered.outline.length > 0,
      "the LiveDoc outline has no headings; check document-part sparse field selection");

    const firstHeading = rendered.outline[0];
    const section = await call(client, "read_document_section", { ...args, heading_path: firstHeading.path });
    assert.equal(section.isError, false, section.thrown ?? section.text);
    const sectionResult = parseComposite(section);
    assert.deepEqual(sectionResult.headingPath, firstHeading.path);
    assert.ok(sectionResult.markdown.trim().length > 0, "selected LiveDoc section has no rendered body");
  });

  test("trace_links includes the known parent edge and detail fields, including the depth-zero root", async () => {
    const rootTitle = `${tag}-trace-child`;
    const parentTitle = `${tag}-trace-parent`;
    const [rootId, parentId] = await createItems(client, [
      { type: "task", title: rootTitle }, { type: "requirement", title: parentTitle },
    ]);
    const linked = await call(client, "postLinkedWorkItems", {
      projectId: PROJECT,
      workItemId: rootId,
      requestBody: { data: [{ type: "linkedworkitems", attributes: { role: "parent" }, relationships: { workItem: { data: { type: "workitems", id: `${PROJECT}/${parentId}` } } } }] },
    });
    assert.equal(linked.isError, false, linked.thrown ?? linked.text);

    const trace = await call(client, "trace_links", { projectId: PROJECT, workItemId: rootId, direction: "down", depth: 2, node_cap: 20 });
    assert.equal(trace.isError, false, trace.thrown ?? trace.text);
    const graph = parseComposite(trace);
    assert.ok(graph.edges.some((edge) => edge.from === `${PROJECT}/${rootId}` && edge.to === `${PROJECT}/${parentId}` && edge.role === "parent"),
      "trace omitted the known parent edge");
    const parentNode = graph.nodes.find((node) => node.id === `${PROJECT}/${parentId}`);
    assert.ok(parentNode, "trace omitted the parent node");
    assert.equal(parentNode.title, parentTitle);
    assert.equal(parentNode.type, "requirement");
    assert.ok(typeof parentNode.status === "string" && parentNode.status.length > 0, "trace node omitted the selected status field");

    const zeroDepth = await call(client, "trace_links", { projectId: PROJECT, workItemId: rootId, direction: "down", depth: 0 });
    assert.equal(zeroDepth.isError, false, zeroDepth.thrown ?? zeroDepth.text);
    const rootOnly = parseComposite(zeroDepth);
    assert.deepEqual(rootOnly.nodes.map((node) => node.id), [`${PROJECT}/${rootId}`], "depth 0 must still return the root detail");
    assert.deepEqual(rootOnly.edges, []);
  });

  test("search_work_items handles empty queries, OR alternatives, summaries, and max_items across pages", async () => {
    const title = `${tag}-search-fixture`;
    const ids = await createItems(client, [
      { type: "requirement", title }, { type: "task", title }, { type: "task", title },
    ]);

    const empty = await call(client, "search_work_items", { projectId: PROJECT });
    assert.equal(empty.isError, false, `empty structured search was rejected: ${empty.thrown ?? empty.text}`);
    const emptyResult = parseComposite(empty);
    assert.ok(Array.isArray(emptyResult.results), "empty search must return a result collection");

    const alternatives = await call(client, "search_work_items", {
      projectId: PROJECT, types: ["requirement", "task"], filters: [{ field: "title", value: title }], max_items: 10,
    });
    assert.equal(alternatives.isError, false, alternatives.thrown ?? alternatives.text);
    const summaries = parseComposite(alternatives).results;
    const foundIds = new Set(summaries.map((item) => item.id.split("/").at(-1)));
    assert.ok(ids.every((id) => foundIds.has(id)), "multi-type OR search omitted one or more seeded Work Items");
    assert.ok(summaries.some((item) => item.type === "requirement"), "OR search returned no requirement");
    assert.ok(summaries.some((item) => item.type === "task"), "OR search returned no task");
    for (const summary of summaries.filter((item) => ids.includes(item.id.split("/").at(-1)))) {
      assert.equal(summary.title, title);
      assert.equal(typeof summary.status, "string", "search summary omitted the selected status field");
    }

    const paged = await call(client, "search_work_items", {
      projectId: PROJECT, types: ["requirement", "task"], filters: [{ field: "title", value: title }], page_size: 1, max_items: 3,
    });
    assert.equal(paged.isError, false, paged.thrown ?? paged.text);
    const pagedResults = parseComposite(paged).results;
    assert.equal(pagedResults.length, 3, `max_items returned ${pagedResults.length} result(s) from the first page only`);
    assert.deepEqual(new Set(pagedResults.map((item) => item.id.split("/").at(-1))), new Set(ids));
  });

  test("trace_links collects more than one Polarion link page or marks the graph truncated", async () => {
    const entries = Array.from({ length: 102 }, (_, index) => ({
      type: "task", title: `${tag}-fanout-${String(index).padStart(3, "0")}`,
    }));
    const [rootId, ...targetIds] = await createItems(client, entries);
    for (let offset = 0; offset < targetIds.length; offset += 50) {
      const batch = targetIds.slice(offset, offset + 50);
      const links = await call(client, "postLinkedWorkItems", {
        projectId: PROJECT,
        workItemId: rootId,
        requestBody: { data: batch.map((id) => ({
          type: "linkedworkitems", attributes: { role: "relates_to" },
          relationships: { workItem: { data: { type: "workitems", id: `${PROJECT}/${id}` } } },
        })) },
      });
      assert.equal(links.isError, false, links.thrown ?? links.text);
    }

    const trace = await call(client, "trace_links", { projectId: PROJECT, workItemId: rootId, direction: "down", depth: 2, node_cap: 200 }, { timeout: 240_000, maxTotalTimeout: 240_000 });
    assert.equal(trace.isError, false, trace.thrown ?? trace.text);
    const graph = parseComposite(trace);
    const complete = graph.edges.length === 101 && graph.nodes.length === 102;
    assert.ok(complete || graph.truncated === true,
      `trace returned ${graph.edges.length} edges and ${graph.nodes.length} nodes with truncated=false; expected all 101 links or an honest truncation marker`);
  });

  test("upload_attachment previews and rejects malformed calls without attachments, then preserves filename and bytes", async () => {
    const workItemId = await createItem(client, "task", `${tag}-upload-target`);
    const dir = await mkdtemp(path.join(os.tmpdir(), "polarion-mcp-upload-"));
    const uploadClient = await connectStdio({ MCP_UPLOAD_ROOTS: dir });
    const fileName = `${tag}.txt`;
    const payload = Buffer.from(`live attachment payload ${tag}\n`, "utf8");
    const filePath = path.join(dir, fileName);
    await writeFile(filePath, payload);
    const callUpload = (extra) => call(uploadClient, "upload_attachment", {
      target: { type: "work_item", projectId: PROJECT, id: workItemId }, filePath, fileName, ...extra,
    });
    try {
      assert.equal((await attachmentsFor(uploadClient, workItemId, fileName)).length, 0);
      const booleanPreview = await callUpload({ dry_run: true });
      assert.equal(booleanPreview.isError, false, booleanPreview.thrown ?? booleanPreview.text);
      assert.match(booleanPreview.text, /"wouldUpload":true/);
      assert.equal((await attachmentsFor(uploadClient, workItemId, fileName)).length, 0, "boolean preview uploaded an attachment");

      const stringPreview = await callUpload({ dry_run: "true" });
      assert.equal(stringPreview.isError, false, stringPreview.thrown ?? stringPreview.text);
      assert.match(stringPreview.text, /"wouldUpload":true/);
      assert.equal((await attachmentsFor(uploadClient, workItemId, fileName)).length, 0, "string preview uploaded an attachment");

      const invalidFlag = await callUpload({ dry_run: "maybe" });
      assert.equal(invalidFlag.isError, true, "malformed dry_run flag must be rejected");
      assert.equal((await attachmentsFor(uploadClient, workItemId, fileName)).length, 0, "invalid flag uploaded an attachment");

      const noTarget = await call(uploadClient, "upload_attachment", { filePath, fileName });
      assert.equal(noTarget.isError, true, "upload without target must be rejected");
      assert.equal((await attachmentsFor(uploadClient, workItemId, fileName)).length, 0, "missing target created an attachment");

      const uploaded = await callUpload({});
      assert.equal(uploaded.isError, false, uploaded.thrown ?? uploaded.text);
      assert.match(uploaded.text, /Status: 201/, "one-file upload must return Polarion HTTP 201");
      const matches = await attachmentsFor(uploadClient, workItemId, fileName);
      assert.equal(matches.length, 1, "explicit upload must create exactly one matching attachment");
      assert.equal(matches[0].attributes.fileName, fileName);
      const attachmentId = matches[0].id.split("/").at(-1);
      const downloaded = await call(uploadClient, "getWorkItemAttachmentContent", { projectId: PROJECT, workItemId, attachmentId });
      assert.equal(downloaded.isError, false, downloaded.thrown ?? downloaded.text);
      const embedded = downloaded.content.find((part) => part.type === "resource")?.resource;
      const binary = downloaded.content.find((part) => part.type === "image");
      const text = downloaded.content.find((part) => part.type === "text" && part.text !== downloaded.text)?.text;
      let actual;
      if (embedded?.blob) actual = Buffer.from(embedded.blob, "base64");
      else if (embedded?.text !== undefined) actual = Buffer.from(embedded.text, "utf8");
      else if (binary?.data) actual = Buffer.from(binary.data, "base64");
      else if (text !== undefined) {
        const body = text.replace(/^API Response \(Status: 200\):\s*/, "");
        actual = Buffer.from(body, "utf8");
      }
      assert.ok(actual, "download returned no readable bytes");
      assert.deepEqual(actual, payload, "downloaded attachment bytes differ from the source file");
    } finally {
      await uploadClient.close();
      await rm(dir, { recursive: true, force: true });
    }
  });
});
