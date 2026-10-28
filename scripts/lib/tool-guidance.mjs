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
 * reads responses: file downloads are fetched as bytes and returned as
 * image, text or embedded-resource content (see `src/binary.ts`).
 *
 * @type {Record<string, string>}
 */

const DOWNLOAD_NOTE =
  'Images (PNG, JPEG, GIF, WebP) come back as image content, UTF-8 text files as text, and any other file (PDF, Office, ZIP) as an embedded base64 resource; files over 20 MB are refused.';

function attachmentContent(owner, metadataTool, listTool) {
  return `Downloads the raw file content of one ${owner} attachment. ${DOWNLOAD_NOTE} Use this only when you need the file's bytes; for its metadata (fileName, contentType, size, author) call \`${metadataTool}\`, and to discover attachment IDs call \`${listTool}\`.`;
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
  return `Uploads one or more new files as attachments of a ${owner} in a single multipart request: \`requestBody.resource.data\` holds one metadata entry (\`fileName\`, optional \`title\`) per file, and \`requestBody.files\` holds the base64-encoded file bytes at the same array index as each metadata entry. Returns the created attachment IDs. Use this to add files; to change an existing attachment use \`${patchTool}\`, and to list what is already attached use \`${listTool}\`.`;
}

const ENUM_FIELD_HINT = '`fieldId` must be an enumeration-typed field (e.g. `status`, `severity`, or a custom enum field).';

export const TOOL_GUIDANCE = {
  // --- Low-scoring tools: identity, global pages and job downloads --------
  getCurrentUser:
    'Returns the Polarion user represented by the bearer token or active session, including that user’s profile fields. The result depends on the credentials used for this request and is not an arbitrary user lookup; use `getUser` with a user ID to inspect another profile. A 403 means the credentials cannot read this endpoint, not that authentication failed.',
  getGlobalPages:
    'Lists Rich Pages across repository spaces, subject to the signed-in user’s global repository read permissions; returns an empty page when no matching pages are visible. Use `getSpacePages` for a known space, `getRepositorySpacePages` for one repository space, or `getPages` for a project space. Follow pagination links or use `max_items` to cap collection.',
  getSpacePages:
    'Lists Rich Pages in the specified project space and returns the paginated JSON:API page collection. Requires a project ID and space ID visible to the signed-in user. Use `getGlobalPages` for pages across repository spaces or `getRepositorySpacePages` for a repository-level space outside projects.',
  getJobLogContent:
    'Downloads the plain-text execution log for one asynchronous Polarion job. Call after `getJob` reports a terminal state because a running job may have an incomplete log; `jobId` comes from the `jobs` resource returned by the operation that started it. Use `getJobResultFileContent` for produced files instead of logs.',
  getTestRunAttachmentContent:
    'Downloads one Test Run attachment and returns its file bytes as image, text, or embedded-resource content. ' + DOWNLOAD_NOTE + ' Use `getTestRunAttachment` for metadata or `getTestRunAttachments` to list available attachment IDs; read the attachment only when its contents are needed.',
  getBacklinkedWorkItems:
    'Returns Work Items with an incoming link to the specified Work Item, paginated. Use `getLinkedWorkItems` for outgoing links, `getExternallyLinkedWorkItem` for links to another Polarion server, or `getWorkItemsRelationships` for raw relationship linkage without linked item details.',
  getExternallyLinkedWorkItem:
    'Returns Work Items linked to the specified item in another Polarion server, using the external-link relationship. Use `getLinkedWorkItems` or `getBacklinkedWorkItems` for links within this server and `getWorkItemsRelationships` for raw relationship identifiers.',
  updateAvatar:
    'Replaces one user avatar image using the supplied image content. ' + DOWNLOAD_NOTE + ' The request changes the stored avatar for the specified user and requires permission to update that profile. Use `getAvatar` to retrieve the current image; use `patchUser` for profile fields such as name or email.',
  getTestStepResults:
    'Lists the execution results for steps in one Test Record, including result values and step references. Requires the project, Test Run, iteration, and Test Record identifiers. Use `getTestSteps` for the Test Case definition or `getTestRun` for overall execution status.',
  getMetadata:
    'Returns server-wide Polarion REST metadata available to REST API users. Use this for global field/configuration definitions; use `getProjectFieldsMetadata` for a project’s effective resource fields and `getFieldsMetadataForWorkItem` for fields on a specific Work Item.',
  // --- Low-scoring workflow distinctions ---------------------------------
  getTestRunAttachment:
    'Returns metadata for one attachment on a Test Run, including its file name and content type. Use `getTestRunAttachmentContent` to download the bytes or `getTestRunAttachments` to list attachments.',
  getTestRunAttachments:
    'Lists attachment metadata on one Test Run. Use `getTestRunAttachment` for one known attachment ID and `getTestRunAttachmentContent` to read its file bytes.',
  deleteProject:
    'Permanently deletes a Polarion project and its project data, including contained resources; this cannot be recovered through the API. Requires project deletion permission. Use `dry_run` to preview the request, and use `unmarkProject` when the project data should remain in the repository.',
  createProject:
    'Creates a new Polarion project and returns the created project resource. Supply a unique project ID and any required template configuration; the signed-in user must have project creation permission. Use `getProjectTemplates` first when selecting a template, or `markProject` to register existing repository data as a project.',
  executeJob:
    'Starts a Polarion asynchronous job and returns its `jobs` resource; this response means the job was accepted, not that it finished. Poll `getJob` with the returned job ID, then use `getJobLogContent` or `getJobResultFileContent` after completion. Use `run_job_and_wait` when bounded polling and a log tail are preferred.',
  importExcelTestResults:
    'Imports test results from an Excel file into the specified Test Run and changes its execution data. The file must match the expected Polarion export/import format and the user must have permission to update the run. Use `getExportExcelTests` to create a compatible workbook; use `importWordDocument` for Word-based document import.',
  importWordDocument:
    'Imports a Word document as a Polarion LiveDoc, creating or updating document content according to the request options. Requires project and space access plus a valid Word file; use `postDocuments` to create a LiveDoc from JSON:API data or `importExcelTestResults` for test-result spreadsheets.',
  // --- Document operation routing ----------------------------------------
  moveToDocument:
    'Moves one existing Work Item from the project tracker into a LiveDoc and returns the move result. Requires the Work Item and target document to be writable. Use `moveFromDocument` to return an item to the tracker or `moveWorkItemsToDocument` to move a batch.',
  moveWorkItemsToDocument:
    'Moves a batch of existing Work Items from the project tracker into a LiveDoc. Provide the target document and the Work Item IDs in the request body; all items must be accessible and the document writable. Use `moveToDocument` for a single item or `moveFromDocument` to remove one from a document.',
  moveDocumentParts:
    'Reorders or relocates parts within a LiveDoc using the requested part IDs and target position. Read current part IDs with `getDocumentParts` first; use `overwriteDocumentParts` only when replacing the document structure rather than moving existing parts.',
  overwriteDocumentParts:
    'Replaces the parts of a LiveDoc with the supplied part list. This can remove or replace existing content, so read the current structure with `getDocumentParts` and use `dry_run` before writing. Use `moveDocumentParts` to reposition existing parts while retaining their identities.',
  mergeDocumentToMaster:
    'Merges the selected branched LiveDoc content into its master document and returns the merge job/result. Requires a valid branch/master relationship and write access to the master. Use `branchDocument` to create a branch, or `moveDocumentParts` for edits within one document.',
  copyDocument:
    'Copies one LiveDoc into a target project and space, creating a new document while leaving the source unchanged. Supply the target location and new document name in `requestBody`; omit target project/space only when the operation should remain in the source location. Use `branchDocument` when the copy must retain branch lineage.',
  branchDocument:
    'Creates a branched LiveDoc and returns an asynchronous `jobs` resource. `requestBody.documentConfigurations` identifies the source and optional target project, space, and document name; omit target project/space to branch within the source project and space. Requires read access to the source and write access to the target; poll `getJob` for completion. Use `copyDocument` when branch lineage is not needed.',
  branchDocuments:
    'Creates branches for multiple source LiveDocs and returns an asynchronous `jobs` resource. Each `documentConfigurations` entry supplies a source and may specify its own target; omitted targets stay with the source location. Requires source read and target write permissions; poll `getJob` for completion. Use `branchDocument` for one document.',
  // --- Collection lifecycle ----------------------------------------------
  closeCollection:
    'Closes one Collection, changing its lifecycle state while retaining its contents. Requires permission to update the Collection. Use `reopenCollection` to make a closed Collection active again, or `reuseCollection` when continuing its contents as a new cycle.',
  reopenCollection:
    'Reopens one previously closed Collection so it can be used again. Requires permission to update the Collection. Use `closeCollection` to close an active one or `reuseCollection` to start a new cycle while preserving the earlier state.',
  reuseCollection:
    'Starts a new use cycle for one Collection while retaining the existing collection history. Requires a valid Collection and update permission. Use `reopenCollection` to reactivate the same closed cycle or `copyCollection` when a separate Collection is needed.',
  // --- Comments, relationships and approval routing ----------------------
  postComments:
    'Creates comments on the specified Work Item or resource using the request body and returns the created comment resources. The target must be writable by the signed-in user. Use `getComments` to list comments and `postDocumentComments` or `postPageComments` for comments on those specific resource families.',
  postDocumentComments:
    'Creates comments on one LiveDoc and returns the created comment resources. Requires write access to the document. Use `getDocumentComments` to read document comments; use `postComments` for Work Item comments.',
  postPageComments:
    'Creates comments on one Rich Page and returns the created comment resources. Requires write access to the page. Use `postComments` for Work Item comments or `postDocumentComments` for LiveDocs.',
  patchDocumentComment:
    'Updates the text or supported attributes of one comment on a LiveDoc. Requires permission to edit that comment. Use `patchComment` for a Work Item comment and `patchPageComment` for a Rich Page comment.',
  patchPageComment:
    'Updates the text or supported attributes of one comment on a Rich Page. Requires permission to edit that comment. Use `patchComment` for a Work Item comment or `patchDocumentComment` for a LiveDoc comment.',
  patchComment:
    'Updates one comment on a Work Item and returns the updated comment resource. Requires permission to edit that comment. Use `patchDocumentComment` or `patchPageComment` for comments on those resource families.',
  getComments:
    'Lists comments associated with one Work Item. Use `getDocumentComments` for a LiveDoc, `getPageComments` for a Rich Page, or `getTestRunComments` for a Test Run.',
  patchWorkItemApproval:
    'Updates one approver’s decision on a Work Item approval entry. Use the approver’s user ID as the approval identifier; the user must be allowed to record the decision. Read the entry with `getWorkItemApproval` and use `patchWorkItemApprovals` only when changing multiple approvals.',
  patchWorkItemApprovals:
    'Updates multiple approval entries on one Work Item using the supplied approval list. Requires permission for each requested decision. Use `getWorkItemApprovals` to inspect current entries and `patchWorkItemApproval` for one approver.',
  postWorkItemApprovals:
    'Adds approval entries for users on one Work Item. Provide approver user IDs in the request body; the signed-in user must have permission to configure approvals. Use `getWorkItemApprovals` to inspect existing entries and `patchWorkItemApproval` to record a decision.',
  postWorkRecords:
    'Creates time-tracking work records for one Work Item and returns the created entries. Each request-body record must include valid work-record attributes such as date and time spent; the user must have permission to log effort. Use `getWorkRecords` to inspect entries and `deleteWorkRecord` to remove an incorrect record.',
  deleteCollectionsRelationship:
    'Removes the named relationship from one Collection; the related resource itself is not deleted. Read current links with `getCollectionsRelationship`; use `postCollectionsRelationships` to add links or `patchCollectionsRelationships` to replace the relationship set.',
  deletePlanRelationship:
    'Removes the named relationship from one Plan without deleting the related resource. Read current links with `getPlanRelationship`; use `postPlanRelationships` to add links or `patchPlanRelationships` to replace them.',
  deleteWorkItemsRelationship:
    'Removes one named JSON:API relationship from a Work Item; this edits linkage and does not delete related Work Items. Use `getWorkItemsRelationships` to inspect raw linkage or linked-work-item tools for link roles and related item details.',
  deletePage:
    'Permanently deletes one Rich Page and its content; this cannot be undone through this API. Requires page deletion permission. Use `dry_run` to preview the request or `patchRichPage` to edit without deleting.',
  deleteLicenseSlots:
    'Deletes specified license slots from the Polarion server. This is a server-wide administrative change requiring license administration permission. Read current assignments with `getLicenseSlots` and capacity with `getLicense` before removal.',
  deleteTestRecord:
    'Deletes one Test Record execution in a Test Run iteration, not the Test Case definition. Use `getTestRecords` to identify the record and `patchTestRecord` when only its values should change.',
  deleteTestRecordTestParameter:
    'Removes one parameter value from a Test Record execution without deleting the record or Test Case. Use `getTestRecordTestParameters` to inspect values and `patchTestRecordTestParameters` to change rather than remove them.',
  patchCollections:
    'Updates one Collection’s attributes from the supplied JSON:API request body. Use `patchCollectionsRelationships` for linkage changes or `postCollections` to create another Collection.',
  patchCollectionsRelationships:
    'Replaces relationship linkage on one Collection with the supplied relationship data. Read existing links with `getCollectionsRelationship`; use `postCollectionsRelationships` to add links without replacing the full set.',
  patchDocument:
    'Updates attributes of one LiveDoc using its JSON:API request body; only supplied attributes change. Rich text uses `{type: "text/html", value: "<p>…</p>"}`. Use `patchDocumentParts` for structured body parts or `patchRichPage` for a wiki page.',
  patchLicense:
    'Updates the server license configuration from the supplied request body. This is a global administrative change requiring license administration permission. Inspect capacity with `getLicense` and assignments with `getLicenseSlots` first.',
  patchPageRelationships:
    'Replaces relationship linkage on one Rich Page. Read links with `getPageRelationships`; use `postPageRelationships` to add links without replacing the existing set.',
  patchPlan:
    'Updates one Plan’s attributes from the supplied JSON:API request body. Use `patchPlanRelationships` for linkage changes or `postPlans` to create a Plan.',
  patchProject:
    'Updates one Polarion project’s attributes from the supplied JSON:API request body. Requires project administration permission. Use `getProject` to inspect current values and `deleteProject` only to remove the project.',
  patchUser:
    'Updates profile attributes for one user from the supplied JSON:API request body. Requires permission to edit that user; use `getUser` to inspect the profile and `updateAvatar` for the image.',
  postBacklinkedWorkItems:
    'Creates incoming Work Item links to the specified target from the Work Items in the request body. Supply valid project-scoped IDs and link roles. Use `postLinkedWorkItems` for outgoing links or `getBacklinkedWorkItems` to inspect incoming links.',
  postCollections:
    'Creates Collections from the supplied JSON:API resource data and returns the created resources. Requires project permission to create Collections. Use `getCollections` to list existing ones or `patchCollections` to update one.',
  postCollectionsRelationships:
    'Adds relationship links to one Collection without replacing its other links. Provide JSON:API linkage; use `getCollectionsRelationship` to inspect the set or `patchCollectionsRelationships` to replace it.',
  postDocumentParts:
    'Adds structured parts to a LiveDoc and returns the created parts. Use valid LiveDoc part types and read existing content with `getDocumentParts` first; use `overwriteDocumentParts` only when replacing the full structure.',
  postExternallyLinkedWorkItems:
    'Creates links from a Work Item to items in another Polarion server using external references. Use `postLinkedWorkItems` for links within this server and `getExternallyLinkedWorkItem` to inspect external links.',
  postPageRelationships:
    'Adds relationship links to one Rich Page while preserving existing linkage. Provide JSON:API relationship data; inspect links with `getPageRelationships` or use `patchPageRelationships` to replace the set.',
  postPages:
    'Creates Rich Pages in the specified project space from JSON:API resource data and returns the new page resources. Requires write access to the project and space. Use `getSpacePages` for project pages or `getGlobalPages` for repository-wide pages.',
  postPlanRelationships:
    'Adds relationship links to one Plan while retaining existing links. Provide JSON:API linkage; use `getPlanRelationship` to inspect the set or `patchPlanRelationships` to replace it.',
  postProjectTestParameterDefinitions:
    'Creates Test Parameter Definitions for a project. Supply each definition’s name and supported attributes; use `getProjectTestParameterDefinitions` to inspect existing definitions and `patchProjectTestParameterDefinitions` to update them.',
  postTestRecords:
    'Creates Test Record executions in a Test Run iteration from the supplied case references and result data. Use `getTestRecords` to inspect executions or `postTestStepResults` to add step-level outcomes.',
  postTestRunComments:
    'Creates comments on one Test Run and returns the created comment resources. Requires write access to the run. Use `getTestRunComments` to list them or `postComments` for Work Item comments.',
  postTestRunParameterDefinitions:
    'Creates parameter definitions for one Test Run. Use `getTestRunParameterDefinitions` to inspect the current set and `patchTestRunParameterDefinitions` to update it.',
  postTestRunTestParameters:
    'Creates Test Parameter values for a Test Run and iteration. Values must match the run’s parameter definitions; use `getTestRunTestParameters` to inspect values and `patchTestRunTestParameters` to update them.',
  postTestStepResults:
    'Creates execution results for Test Steps in a Test Record. Use `getTestSteps` for the Test Case definition and `getTestStepResults` to read recorded outcomes.',
  postTestSteps:
    'Creates Test Steps on a Test Case and returns them. Use `getTestSteps` to read the current sequence and `patchTestSteps` to update existing steps.',
  postUsers:
    'Creates Polarion user accounts from the supplied user resource data. Requires user administration permission and valid unique user IDs. Use `getUser` to inspect an account or `patchUser` to update one.',
  postWorkItemRelationships:
    'Adds relationship linkage to one Work Item while preserving existing relationships. Provide JSON:API linkage; inspect it with `getWorkItemsRelationships` or use `patchWorkItemRelationships` to replace it.',
  // --- Whole-list replacement (verified on Polarion 2606) -------------------
  patchGlobalEnumeration:
    'Replaces the entire option list of one global Enumeration: options missing from `requestBody` are deleted, not merged. Read the current list with `getGlobalEnumeration` first and send every option you want to keep.',
  patchProjectEnumeration:
    'Replaces the entire option list of one Enumeration in a project: options missing from `requestBody` are deleted, not merged. Read the current list with `getProjectEnumeration` first and send every option you want to keep.',
  patchGlobalCustomFields:
    'Replaces the entire list of global Custom Fields for one resource type and target type: fields missing from `requestBody` are deleted, not merged. Read the current list with `getGlobalCustomFields` first and send every field you want to keep.',
  patchCustomField:
    'Replaces the entire list of Custom Fields of one project for one resource type and target type: fields missing from `requestBody` are deleted, not merged. Read the current list with `getProjectCustomFields` first and send every field you want to keep.',
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
    `Downloads one result file produced by a finished asynchronous job (e.g. the spreadsheet from getExportExcelTests). ${DOWNLOAD_NOTE} Call it only after \`getJob\` reports the job as finished; the job resource lists the available file names. For the job's log instead of its output, use \`getJobLogContent\`.`,
  getAvatar:
    `Downloads the avatar image of one user. ${DOWNLOAD_NOTE} Since avatars are images, this is rarely useful to an agent; for a user's name, email, and other profile data use \`getUser\`, and to replace the image use \`updateAvatar\`.`,

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
