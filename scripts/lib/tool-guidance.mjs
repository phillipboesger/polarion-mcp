/**
 * Hand-written lead descriptions for tools whose generated OpenAPI summary is
 * too generic for an agent to pick the right tool ("Returns a list of
 * instances.", "Returns fields for the specified resource.", or a bare
 * "See more in the REST API User Guide" link). Glama's TDQS graded most of
 * these tools B/C; siblings sharing the same generic summary are covered too.
 *
 * Each value replaces only the lead of the description: the text before the
 * first generated note (`Scope:`, `Cardinality:`, `Effect:`, `Tip:`), which
 * `enrich-tool-metadata.mjs` keeps appending unchanged. Replacing with the same
 * text is a no-op, so the pass stays idempotent across regenerations.
 *
 * Facts here come from the Polarion OpenAPI spec (response content types,
 * 202 + `jobs` responses, request body schemas) and from how `executor.ts`
 * reads responses: it never sets an axios `responseType`, so an
 * `application/octet-stream` body reaches the agent as UTF-8-decoded text.
 *
 * @type {Record<string, string>}
 */

const TEXT_BODY_CAVEAT =
  'The file body is returned as UTF-8 text: plain-text files (TXT, CSV, XML, JSON, HTML) are readable, but binary files (images, PDF, Office) arrive garbled.';

function attachmentContent(owner, metadataTool, listTool) {
  return `Downloads the raw file content of one ${owner} attachment. ${TEXT_BODY_CAVEAT} Use this only when you need the file's bytes; for its metadata (fileName, contentType, size, author) call \`${metadataTool}\`, and to discover attachment IDs call \`${listTool}\`.`;
}

function fieldsMetadata(owner, extra = '') {
  return `Returns the field definitions that apply to one specific ${owner}, keyed by field ID: each field's label and type kind (primitive such as \`string\`/\`date\`/\`text/html\`, list, structure, or enumeration with its enum name), including the custom fields configured for its type. Use it before writing to the ${owner} to learn which field keys and value types are valid.${extra} For the project-wide definitions of a resource type without a concrete instance, use \`getProjectFieldsMetadata\`; for global defaults, \`getGlobalFieldsMetadata\`.`;
}

function relationship(owner, siblingPost, siblingPatch, siblingDelete) {
  return `Returns the resource identifiers linked from one ${owner} through a single named relationship, as JSON:API linkage (\`{type, id}\` entries) without the related resources' attributes. \`relationshipId\` is the relationship's name, not an entry ID. Use this to inspect one relationship cheaply; to read the ${owner} with its related resources embedded, call its get tool with \`include\` instead. To change the relationship, use \`${siblingPost}\` (add), \`${siblingPatch}\` (replace), or \`${siblingDelete}\` (remove).`;
}

function attachmentPatch(owner, listTool, contentTool) {
  return `Updates one existing ${owner} attachment: its metadata (e.g. \`title\`) via \`requestBody.resource\`, and optionally replaces the stored file by passing base64-encoded bytes in \`requestBody.content\`. The attachment keeps its ID. Use this to rename or re-upload a file that already exists; to add a new file use \`${listTool}\`, and to read the current file use \`${contentTool}\`.`;
}

function attachmentPost(owner, patchTool, listTool) {
  return `Uploads one or more new files as attachments of a ${owner} in a single multipart request: \`requestBody.resource.data\` holds one metadata entry (\`fileName\`, optional \`title\`) per file, and \`requestBody.files\` holds the base64-encoded file bytes in the same order (or match them via each entry's \`lid\`). Returns the created attachment IDs. Use this to add files; to change an existing attachment use \`${patchTool}\`, and to list what is already attached use \`${listTool}\`.`;
}

const ENUM_FIELD_HINT = '`fieldId` must be an enumeration-typed field (e.g. `status`, `severity`, or a custom enum field).';

export const TOOL_GUIDANCE = {
  // --- Enumeration options -------------------------------------------------
  getAvailableEnumOptionsForWorkItem:
    `Returns the enumeration options that may be set on one field of one existing Work Item (ID, name, and presentation such as color/icon), already narrowed by that item's type and any dependent enumerations. ${ENUM_FIELD_HINT} Call it before patchWorkItem to pick a valid value; for the value(s) currently set use \`getCurrentEnumOptionsForWorkItem\`, and for an item that does not exist yet use \`getAvailableEnumOptionsForWorkItemType\`.`,
  getAvailableEnumOptionsForWorkItemType:
    `Returns the enumeration options that may be set on one field for a Work Item type (e.g. \`type=requirement\`), before any concrete item exists. ${ENUM_FIELD_HINT} Pass \`type=~\` for options that apply regardless of type. Call it before postWorkItems to choose valid values; for an existing item use \`getAvailableEnumOptionsForWorkItem\`, which also applies that item's dependent enumerations.`,
  getCurrentEnumOptionsForWorkItem:
    `Returns the enumeration option(s) currently selected in one field of one Work Item, resolved to full option objects (ID, name, color/icon) rather than the bare ID stored on the item. ${ENUM_FIELD_HINT} Use it to display or compare the current value; for the options you could switch to use \`getAvailableEnumOptionsForWorkItem\`.`,
  getAvailableEnumOptionsForDocument:
    `Returns the enumeration options that may be set on one field of one existing Document (ID, name, color/icon), narrowed by that Document's type. ${ENUM_FIELD_HINT} Call it before patchDocument to pick a valid value; for the value(s) currently set use \`getCurrentEnumerationOptionsForDocument\`, and for a Document that does not exist yet use \`getAvailableEnumOptionsForDocumentType\`.`,
  getAvailableEnumOptionsForDocumentType:
    `Returns the enumeration options that may be set on one field for a Document type (e.g. \`type=req_specification\`), before any concrete Document exists. ${ENUM_FIELD_HINT} Pass \`type=~\` for options that apply regardless of type. Call it before postDocuments to choose valid values; for an existing Document use \`getAvailableEnumOptionsForDocument\`.`,
  getCurrentEnumerationOptionsForDocument:
    `Returns the enumeration option(s) currently selected in one field of one Document, resolved to full option objects (ID, name, color/icon) rather than the bare stored ID. ${ENUM_FIELD_HINT} Use it to display or compare the current value; for the options you could switch to use \`getAvailableEnumOptionsForDocument\`.`,

  // --- Fields metadata -----------------------------------------------------
  getFieldsMetadataForWorkItem: fieldsMetadata('Work Item', ' For the allowed values of one enum field, follow up with `getAvailableEnumOptionsForWorkItem`.'),
  getFieldsMetadataForDocument: fieldsMetadata('Document', ' For the allowed values of one enum field, follow up with `getAvailableEnumOptionsForDocument`.'),
  getFieldsMetadataForPlan: fieldsMetadata('Plan'),
  getFieldsMetadataForCollection: fieldsMetadata('Collection'),
  getFieldsMetadataForTestRun: fieldsMetadata('Test Run'),
  getFieldsMetadataForTestRecord: fieldsMetadata('Test Record (one test case execution within a Test Run iteration)'),

  // --- Relationships -------------------------------------------------------
  getWorkItemsRelationships: relationship('Work Item', 'postWorkItemRelationships', 'patchWorkItemRelationships', 'deleteWorkItemsRelationship')
    + ' For Work Item-to-Work Item links with roles, `getLinkedWorkItems` / `getBacklinkedWorkItems` are richer.',
  getCollectionsRelationship: relationship('Collection', 'postCollectionsRelationships', 'patchCollectionsRelationships', 'deleteCollectionsRelationship'),
  getPlanRelationship: relationship('Plan', 'postPlanRelationships', 'patchPlanRelationships', 'deletePlanRelationship'),
  getPageRelationships: relationship('Rich Page', 'postPageRelationships', 'patchPageRelationships', 'deletePageRelationships'),

  // --- Attachment content downloads ---------------------------------------
  getWorkItemAttachmentContent: attachmentContent('Work Item', 'getWorkItemAttachment', 'getWorkItemAttachments'),
  getDocumentAttachmentContent: attachmentContent('Document', 'getDocumentAttachment', 'getDocumentAttachments'),
  getPageAttachmentContent: attachmentContent('Rich Page', 'getPageAttachment', 'getPageAttachments'),
  getTestRecordAttachmentContent: attachmentContent('Test Record', 'getTestRecordAttachment', 'getTestRecordAttachments'),
  getTestStepResultAttachmentContent: attachmentContent('Test Step Result', 'getTestStepResultAttachment', 'getTestStepResultAttachments'),
  getJobResultFileContent:
    `Downloads one result file produced by a finished asynchronous job (e.g. the spreadsheet from getExportExcelTests). ${TEXT_BODY_CAVEAT} Call it only after \`getJob\` reports the job as finished; the job resource lists the available file names. For the job's log instead of its output, use \`getJobLogContent\`.`,
  getAvatar:
    `Downloads the avatar image of one user. ${TEXT_BODY_CAVEAT} Since avatars are images, this is rarely useful to an agent; for a user's name, email, and other profile data use \`getUser\`, and to replace the image use \`updateAvatar\`.`,

  // --- Attachment writes ---------------------------------------------------
  patchWorkItemAttachment: attachmentPatch('Work Item', 'postWorkItemAttachments', 'getWorkItemAttachmentContent'),
  patchDocumentAttachment: attachmentPatch('Document', 'postDocumentItemAttachments', 'getDocumentAttachmentContent'),
  patchPageAttachment: attachmentPatch('Rich Page', 'postPageAttachments', 'getPageAttachmentContent'),
  patchTestRunAttachment: attachmentPatch('Test Run', 'postTestRunAttachments', 'getTestRunAttachmentContent'),
  patchTestStepResultAttachment: attachmentPatch('Test Step Result', 'postTestStepResultAttachments', 'getTestStepResultAttachmentContent'),
  patchTestRecordAttachment: attachmentPatch('Test Record', 'postTestRecordAttachments', 'getTestRecordAttachmentContent'),
  postWorkItemAttachments: attachmentPost('Work Item', 'patchWorkItemAttachment', 'getWorkItemAttachments'),
  postDocumentItemAttachments: attachmentPost('Document', 'patchDocumentAttachment', 'getDocumentAttachments'),
  postPageAttachments: attachmentPost('Rich Page', 'patchPageAttachment', 'getPageAttachments'),
  postTestRunAttachments: attachmentPost('Test Run', 'patchTestRunAttachment', 'getTestRunAttachments'),
  postTestRecordAttachments: attachmentPost('Test Record', 'patchTestRecordAttachment', 'getTestRecordAttachments'),
  postTestStepResultAttachments: attachmentPost('Test Step Result', 'patchTestStepResultAttachment', 'getTestStepResultAttachments'),

  // --- Workflow ------------------------------------------------------------
  getWorkflowActionsForWorkItem:
    'Returns the workflow actions (transitions) possible from one Work Item\'s current status, each with its action ID, name, target status, whether it is available to the calling user (with an `unavailableReason` if not), and the fields, roles, or signatures it requires. Call it before patchWorkItem with `workflowAction` to choose a valid transition; setting `status` directly bypasses workflow conditions and functions.',
  getWorkflowActionsForTestRun:
    'Returns the workflow actions (transitions) possible from one Test Run\'s current status, each with its action ID, name, target status, whether it is available to the calling user (with an `unavailableReason` if not), and the fields, roles, or signatures it requires. Call it before patchTestRun with `workflowAction` to choose a valid transition; for Work Items use `getWorkflowActionsForWorkItem`.',

  // --- OSLC links ----------------------------------------------------------
  getOslcResources:
    'Returns the OSLC resources linked to one Work Item: links to artifacts in other OSLC-capable tools (e.g. Jira, DOORS Next, Teamcenter), each with its URI, label, and link role. Use it to trace cross-tool links; for links to Work Items in this or another Polarion server use `getLinkedWorkItems` or `getExternallyLinkedWorkItems`.',
  deleteOslcResources:
    'Removes one or more OSLC links from a Work Item, identified in `requestBody.data` by their link IDs as returned by `getOslcResources`. Only the link is removed; the artifact in the remote OSLC tool is untouched. To add links use `postOslcResources`; for Polarion-internal links use `deleteLinkedWorkItems`.',
  postOslcResources:
    'Adds one or more OSLC links from a Work Item to artifacts in other OSLC-capable tools: each `requestBody.data` entry gives the remote artifact\'s `uri`, an OSLC link `role` URI (e.g. `http://open-services.net/ns/cm#relatedChangeRequest`), and an optional `label`. Use it for cross-tool traceability; to link Polarion Work Items to each other use `postLinkedWorkItems`, and to list existing OSLC links use `getOslcResources`.',

  // --- Projects ------------------------------------------------------------
  markProject:
    'Registers an existing repository folder as a Polarion project (the inverse of `unmarkProject`): `requestBody` names the repository `location`, the new `projectId`, its `trackerPrefix`, and optionally a `templateId`. Runs as an asynchronous job and returns a `jobs` resource; poll `getJob` until it finishes. Use it to re-attach project data that already exists in the repository; to create a brand-new project use `createProject`.',
  unmarkProject:
    'Removes the Polarion project marker from a project so it no longer appears or works as a project, while its data stays in the repository and can be re-registered later with `markProject`. Runs as an asynchronous job and returns a `jobs` resource; poll `getJob` until it finishes. Use it to retire a project reversibly; to delete the project and its data use `deleteProject`.',
  getProjectTemplates:
    'Returns the project templates available on the server (ID, name, description, whether it is the default, and its parameters), paginated. Call it before `createProject` to choose a valid `templateId`.',

  // --- Documents / pages ---------------------------------------------------
  moveFromDocument:
    'Removes one Work Item from the Document that currently contains it and returns it to the project\'s plain Work Item tracker. The Work Item itself is kept with all its fields and links; only its placement in the Document is removed. Use `moveToDocument` for the reverse.',
  patchRichPage:
    'Updates one Rich Page (wiki-style page): its `title` and/or its HTML `homePageContent`, sent as `requestBody.data.attributes`. Only the attributes you send are changed. Use it to edit page text or metadata; to create a page use `postPages`, and for LiveDoc Documents use `patchDocument` instead.',
  getRepositorySpacePages:
    'Returns the Rich Pages in one space at the repository (server) level, outside any project, paginated and filterable with `query`. Use it for global wiki pages; for pages inside a project space use `getSpacePages`, and for every repository-level page regardless of space use `getGlobalPages`.',

  // --- Test management -----------------------------------------------------
  getExportExcelTests:
    'Starts an asynchronous export of one Test Run\'s test cases to an Excel workbook, optionally filtered with `query`, ordered with `sortBy`, and shaped by an export `template`. Returns a `jobs` resource, not the file: poll `getJob` until finished, then download the workbook with `getJobResultFileContent`. To import results back, use `importExcelTestResults`.',
  getWorkItemApprovals:
    'Returns the approval entries on one Work Item: each approver (user) and their approval status (`waiting`, `approved`, `disapproved`). Use it to check sign-off progress; to add approvers use `postWorkItemApprovals`, and to record a decision use `patchWorkItemApproval`.',
  getWorkItemApproval:
    'Returns one user\'s approval entry on a Work Item, addressed by that user\'s ID: the approver and their status (`waiting`, `approved`, `disapproved`). Use it to check a single approver\'s decision; to record or change it use `patchWorkItemApproval`.',
  getWorkRecords:
    'Returns the work records (time-tracking entries) logged on one Work Item: each with its date, time spent, type, comment, and the user who logged it. Use it to report effort spent on an item; to log time use `postWorkRecords`.',
  getWorkRecord:
    'Returns one work record (time-tracking entry) on a Work Item by its ID: date, time spent, type, comment, and the user who logged it. To remove it use `deleteWorkRecord`.',

  // --- Server / admin ------------------------------------------------------
  getLicense:
    'Returns the server-wide license limits as current count vs. maximum for Work Items, Documents/Pages, and projects, plus links to the default license slots. Use it to check remaining capacity before bulk-creating items or projects; for which user holds which license use `getLicenseAssignments`, and for the slot details `getLicenseSlots`.',
  getLlms:
    'Returns the Large Language Models configured on this Polarion server for its built-in AI features (ID and name), paginated. Call it before `generateCompletion` to pick a valid model; an empty list means no LLM is configured and AI actions will fail.',
  getRole:
    'Returns one global role (e.g. `admin`, `user`) and the users that hold it. Use it to check who has server-wide permissions; project-level roles are not covered by this tool. For a user\'s own profile and roles use `getUser`.',
  getUserGroup:
    'Returns one user group: its ID, name, description, member users, and the global and project roles it grants. Use it to resolve group membership (for example to understand who a group-based assignment or permission covers); for a single user\'s details use `getUser`.',
  getRevision:
    'Returns one repository revision (commit) by its number: author, timestamp, and commit message. Use it to see who changed data at a known revision, e.g. a `revision` value seen on a resource; to search or page through revision history use `getRevisions`.',
  getRevisions:
    'Returns repository revisions (commits) with author, timestamp, and commit message, paginated and filterable with `query`. Use it to audit recent changes across the repository; for one known revision number use `getRevision`.',
};
