/**
 * Polarion-specific functionality: resources, prompts, and project configuration management
 *
 * This module provides the "resource" and "prompt" capabilities of the MCP server.
 *
 * Resources:
 * - SDK documentation (online HTML, PDFs)
 * - REST API specifications
 * - Project configurations (cached in memory)
 *
 * Prompts:
 * - Pre-configured workflows for common tasks
 * - Context-aware guidance using project configuration
 * - Multi-step operation templates
 *
 * Project Configuration:
 * - Fetched from Polarion API
 * - Cached in memory for fast access
 * - Contains work item types, custom fields, enumerations, workflows
 * - Used to validate and guide work item operations
 */
import https from 'https';

import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { createRequire } from 'module';
import type { CallToolResult, Resource } from "@modelcontextprotocol/sdk/types.js";
import {
  API_BASE_URL,
  getBearerToken,
  shouldRejectUnauthorized,
  POLARION_RESOURCES,
  LOCAL_SDK_FILES,
} from './config.js';
import type { ProjectConfig } from './types.js';
import { formatApiError } from './utils.js';

// Import pdf-parse using require for compatibility
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

/**
 * SDK directory path for local files
 *
 * This directory contains cached PDF documentation files managed by Git LFS.
 * Using local files provides faster access and offline availability.
 */
const SDK_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'sdk');

/**
 * Project configuration cache
 *
 * Stores project configurations in memory using a Map.
 * Key: projectId (string)
 * Value: ProjectConfig object with work item types, fields, enumerations, etc.
 *
 * Why cache?
 * - Project configs change infrequently
 * - API calls are expensive
 * - AI assistants may need config multiple times per session
 * - Improves response time significantly
 */
const projectConfigCache = new Map<string, ProjectConfig>();

/**
 * Refreshes and caches Polarion project configuration
 *
 * This function fetches comprehensive project configuration from Polarion:
 * 1. Project details (name, ID, etc.)
 * 2. Work item types available in the project
 * 3. Custom fields for each work item type
 * 4. Enumeration values (statuses, priorities, etc.)
 *
 * The fetched configuration is cached in memory for fast access by:
 * - AI assistants when creating/updating work items
 * - Validation logic
 * - Prompt templates
 *
 * @param args - Arguments containing projectId
 * @returns Call tool result with cached configuration and summary
 */
export async function refreshPolarionConfig(args: { projectId: string }): Promise<CallToolResult> {
  const { projectId } = args;

  try {
    // Get bearer token from environment
    const bearerToken = getBearerToken();
    if (!bearerToken) {
      return {
        content: [{
          type: "text",
          text: "Error: BEARER_TOKEN not configured in environment variables"
        }]
      };
    }

    const headers = {
      'Authorization': `Bearer ${bearerToken}`,
      'Accept': 'application/json'
    };

    // Fetch project details
    const projectResponse = await axios.get(
      `${API_BASE_URL}/projects/${projectId}`,
      {
        headers,
        httpsAgent: new https.Agent({
          rejectUnauthorized: shouldRejectUnauthorized()
        })
      }
    );

    // Fetch work item types for the project
    const typesResponse = await axios.get(
      `${API_BASE_URL}/projects/${projectId}/workitems/types`,
      {
        headers,
        httpsAgent: new https.Agent({
          rejectUnauthorized: shouldRejectUnauthorized()
        })
      }
    );

    // Fetch enumerations
    const enumsResponse = await axios.get(
      `${API_BASE_URL}/projects/${projectId}/enumerations`,
      {
        headers,
        httpsAgent: new https.Agent({
          rejectUnauthorized: shouldRejectUnauthorized()
        })
      }
    );

    // Parse and structure the configuration
    const workItemTypes: string[] = [];
    const customFields: Record<string, Array<{ id: string, type: string, values?: string[] }>> = {};

    if (typesResponse.data?.data) {
      for (const typeData of typesResponse.data.data) {
        const typeName = typeData.id || typeData.attributes?.id;
        if (typeName) {
          workItemTypes.push(typeName);
          customFields[typeName] = [];

          // Extract custom field info if available
          if (typeData.attributes?.customFields) {
            for (const field of typeData.attributes.customFields) {
              customFields[typeName].push({
                id: field.id,
                type: field.type,
                values: field.enumValues || field.allowedValues
              });
            }
          }
        }
      }
    }

    // Parse enumerations
    const enumerations: Record<string, Array<{ id: string, name: string }>> = {};
    if (enumsResponse.data?.data) {
      for (const enumData of enumsResponse.data.data) {
        const enumId = enumData.id;
        if (enumId && enumData.attributes?.options) {
          enumerations[enumId] = enumData.attributes.options.map((opt: any) => ({
            id: opt.id,
            name: opt.name || opt.label || opt.id
          }));
        }
      }
    }

    // Create project configuration object
    const config: ProjectConfig = {
      projectId,
      workItemTypes,
      customFields,
      workflows: {}, // Could be extended to fetch workflow info
      enumerations,
      lastUpdated: new Date().toISOString()
    };

    // Cache the configuration
    projectConfigCache.set(projectId, config);

    return {
      content: [{
        type: "text",
        text: `Successfully refreshed configuration for project "${projectId}".\n\n` +
          `Configuration cached and available at resource: polarion://config/${projectId}\n\n` +
          `Summary:\n` +
          `- Work Item Types: ${workItemTypes.length}\n` +
          `- Enumerations: ${Object.keys(enumerations).length}\n` +
          `- Custom Fields: ${Object.values(customFields).reduce((sum, fields) => sum + fields.length, 0)}\n\n` +
          `You can now use this configuration to validate work item creation and updates.\n\n` +
          JSON.stringify(config, null, 2)
      }]
    };

  } catch (error) {
    if (axios.isAxiosError(error)) {
      return {
        content: [{
          type: "text",
          text: `Failed to refresh project configuration: ${formatApiError(error)}`
        }]
      };
    }
    return {
      content: [{
        type: "text",
        text: `Failed to refresh project configuration: ${error}`
      }]
    };
  }
}

/**
 * Retrieves SDK documentation PDF files and extracts text content
 *
 * This function serves PDF documentation files from the local sdk/ directory
 * and extracts the text content for AI consumption.
 *
 * Available PDFs:
 * - admin-user-help: Administrator and User Help (69 MB)
 * - deployment-guide: Deployment and Maintenance Guide (3.9 MB)
 * - feature-matrix: Polarion Feature Matrix (1.2 MB)
 * - rest-api-guide: REST API User Guide (724 KB) - DEFAULT
 * - scripting-guide: Scripting Guide and Examples (528 KB)
 *
 * Returns the extracted text content so AI assistants can read and understand
 * the documentation directly.
 *
 * @param args - Arguments containing documentId
 * @returns Call tool result with extracted PDF text content
 */
export async function getSdkDocumentation(args: {
  documentId?: string
}): Promise<CallToolResult> {
  try {
    // Map of document IDs to filenames
    const documentMap: Record<string, string> = {
      'admin-user-help': LOCAL_SDK_FILES.ADMIN_USER_HELP,
      'deployment-guide': LOCAL_SDK_FILES.DEPLOYMENT_GUIDE,
      'feature-matrix': LOCAL_SDK_FILES.FEATURE_MATRIX,
      'rest-api-guide': LOCAL_SDK_FILES.REST_API_GUIDE,
      'scripting-guide': LOCAL_SDK_FILES.SCRIPTING_GUIDE_LOCAL
    };

    const documentId = args.documentId || 'rest-api-guide'; // Default to REST API guide
    const filename = documentMap[documentId];

    if (!filename) {
      return {
        content: [{
          type: "text",
          text: `Unknown document ID: ${documentId}\n\n` +
            `Available documents:\n` +
            Object.keys(documentMap).map(id => `- ${id}`).join('\n')
        }]
      };
    }

    // Read the PDF file
    const filePath = path.join(SDK_DIR, filename);
    const fileBuffer = await fs.readFile(filePath);
    const fileStats = await fs.stat(filePath);

    // Extract text from PDF
    console.log(`Extracting text from ${filename}...`);
    const pdfData = await pdfParse(fileBuffer);

    const extractedText = pdfData.text;
    const pageCount = pdfData.numpages;
    const metadata = pdfData.info;

    // Return extracted text content
    return {
      content: [{
        type: "text",
        text: `# ${filename}\n\n` +
          `**Document ID:** ${documentId}\n` +
          `**File Size:** ${(fileStats.size / 1024 / 1024).toFixed(2)} MB\n` +
          `**Pages:** ${pageCount}\n` +
          `**Title:** ${metadata?.Title || 'N/A'}\n` +
          `**Author:** ${metadata?.Author || 'N/A'}\n` +
          `**Subject:** ${metadata?.Subject || 'N/A'}\n\n` +
          `---\n\n` +
          `## Extracted Content\n\n` +
          extractedText
      }]
    };

  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return {
        content: [{
          type: "text",
          text: `PDF file not found. Make sure the SDK files are in the sdk/ directory.\n\n` +
            `Expected path: ${SDK_DIR}\n` +
            `Error: ${error}\n\n` +
            `Try running: git lfs pull`
        }]
      };
    }
    return {
      content: [{
        type: "text",
        text: `Failed to retrieve SDK documentation: ${error}`
      }]
    };
  }
}

/**
 * Lists available Polarion resources
 *
 * Returns all resources that AI assistants can read:
 * 1. Online SDK documentation (HTML pages)
 * 2. REST API specifications (JSON)
 * 3. PDF guides (both online and local cached versions)
 * 4. Database schema documentation
 * 5. Dynamically cached project configurations
 *
 * Resource URIs follow the pattern: polarion://category/resource-name
 *
 * Categories:
 * - sdk: Software Development Kit documentation
 * - docs: User guides and references
 * - guides: PDF documentation
 * - database: Database schema info
 * - local: Locally cached PDFs (faster, offline available)
 * - config: Project-specific configurations
 *
 * @returns Array of Resource objects with URI, name, description, and MIME type
 */
export function listPolarionResources(): Resource[] {
  const resources: Resource[] = [
    // SDK Documentation Resources
    {
      uri: "polarion://sdk/index",
      name: "Polarion SDK Index",
      description: "Main SDK documentation landing page with links to all SDK resources",
      mimeType: "text/html"
    },
    {
      uri: "polarion://sdk/javadoc",
      name: "Polarion Open Java API (Javadoc)",
      description: "Complete Java API documentation for extending Polarion",
      mimeType: "text/html"
    },
    {
      uri: "polarion://sdk/rendering-api",
      name: "Polarion Rendering API (Javadoc)",
      description: "Rendering API documentation for custom rendering extensions",
      mimeType: "text/html"
    },
    {
      uri: "polarion://sdk/scripting-api",
      name: "Polarion Scripting API",
      description: "Scripting API documentation for workflow and automation scripts",
      mimeType: "text/html"
    },
    {
      uri: "polarion://sdk/rest-docs",
      name: "REST API Documentation",
      description: "REST API methods and descriptions",
      mimeType: "text/html"
    },
    {
      uri: "polarion://sdk/rest-spec",
      name: "REST API OpenAPI Specification",
      description: "Complete OpenAPI JSON specification for the Polarion REST API",
      mimeType: "application/json"
    },

    // Siemens Documentation
    {
      uri: "polarion://docs/rest-user-guide",
      name: "REST API User Guide",
      description: "Comprehensive guide on using the Polarion REST API",
      mimeType: "text/html"
    },
    {
      uri: "polarion://docs/work-item-fields",
      name: "Work Item and Index Fields Reference",
      description: "Complete reference for Work Item fields and their usage",
      mimeType: "text/html"
    },
    {
      uri: "polarion://docs/custom-field-types",
      name: "Custom Field Types Reference",
      description: "Documentation on custom field types and configuration",
      mimeType: "text/html"
    },
    {
      uri: "polarion://docs/workflow-functions",
      name: "Scripted Workflow Functions and Conditions",
      description: "Reference for workflow functions and conditions scripting",
      mimeType: "text/html"
    },
    {
      uri: "polarion://docs/velocity-variables",
      name: "Velocity Variables for Active Wiki Pages",
      description: "Available Velocity variables for Wiki page customization",
      mimeType: "text/html"
    },

    // PDF Guides
    {
      uri: "polarion://guides/scripting",
      name: "Scripting Guide & Examples (PDF)",
      description: "Complete scripting guide with practical examples",
      mimeType: "application/pdf"
    },
    {
      uri: "polarion://guides/sdk",
      name: "SDK Guide & Examples (PDF)",
      description: "Complete SDK guide with examples for custom extensions",
      mimeType: "application/pdf"
    },
    {
      uri: "polarion://guides/widget-sdk",
      name: "Widget SDK Guide & Examples (PDF)",
      description: "Widget development guide with examples",
      mimeType: "application/pdf"
    },
    {
      uri: "polarion://guides/rt-sdk",
      name: "Resource Traceability SDK Guide (PDF)",
      description: "Resource Traceability SDK guide with examples",
      mimeType: "application/pdf"
    },

    // Database Documentation
    {
      uri: "polarion://database/tables",
      name: "Database Tables Reference",
      description: "Complete database schema and tables reference",
      mimeType: "text/html"
    },
    {
      uri: "polarion://database/workitem-schema",
      name: "Work Item Database Schema (PDF)",
      description: "Detailed Work Item database schema diagram",
      mimeType: "application/pdf"
    },

    // Local SDK Files (faster access, offline support)
    {
      uri: "polarion://local/admin-user-help",
      name: "Administrator and User Help (PDF) - Local",
      description: "Complete administrator and user help guide (local copy for fast access)",
      mimeType: "application/pdf"
    },
    {
      uri: "polarion://local/deployment-guide",
      name: "Deployment and Maintenance Guide (PDF) - Local",
      description: "Deployment and maintenance guide (local copy for fast access)",
      mimeType: "application/pdf"
    },
    {
      uri: "polarion://local/feature-matrix",
      name: "Polarion 2506 Feature Matrix (PDF) - Local",
      description: "Feature matrix for Polarion version 2506 (local copy for fast access)",
      mimeType: "application/pdf"
    },
    {
      uri: "polarion://local/rest-api-guide",
      name: "REST API User Guide (PDF) - Local",
      description: "Complete REST API user guide (local copy for fast access)",
      mimeType: "application/pdf"
    },
    {
      uri: "polarion://local/scripting-guide",
      name: "Scripting Guide & Examples (PDF) - Local",
      description: "Scripting guide with examples (local copy for fast access)",
      mimeType: "application/pdf"
    }
  ];

  // Add dynamic project config resources if any are cached
  for (const [projectId, config] of projectConfigCache.entries()) {
    resources.push({
      uri: `polarion://config/${projectId}`,
      name: `${projectId} - Project Configuration`,
      description: `Work Item types, custom fields, workflows, and enumerations for project ${projectId}`,
      mimeType: "application/json"
    });
  }

  return resources;
}

/**
 * Reads a Polarion resource by URI
 *
 * This function handles different types of resources:
 *
 * 1. Online Documentation:
 *    - Fetches from Polarion/Siemens servers
 *    - Returns HTML or JSON content
 *    - Handles PDF files as base64-encoded blobs
 *
 * 2. Local SDK Files:
 *    - Reads from sdk/ directory
 *    - Provides faster access
 *    - Works offline
 *    - Managed by Git LFS
 *
 * 3. Project Configurations:
 *    - Reads from in-memory cache
 *    - Must be loaded first with refresh_polarion_config tool
 *
 * Resource Content Types:
 * - text/html: Documentation pages
 * - application/json: API specs and configs
 * - application/pdf: PDF guides (returned as base64 blob)
 *
 * @param uri - Resource URI (e.g., "polarion://sdk/javadoc")
 * @returns Resource contents with appropriate MIME type
 */
export async function readPolarionResource(uri: string) {
  // Handle SDK documentation resources
  const docMappings: Record<string, string> = {
    "polarion://sdk/index": POLARION_RESOURCES.SDK_INDEX,
    "polarion://sdk/javadoc": POLARION_RESOURCES.SDK_JAVADOC,
    "polarion://sdk/rendering-api": POLARION_RESOURCES.SDK_RENDERING,
    "polarion://sdk/scripting-api": POLARION_RESOURCES.SDK_SCRIPTING,
    "polarion://sdk/rest-docs": POLARION_RESOURCES.SDK_REST_DOCS,
    "polarion://sdk/rest-spec": POLARION_RESOURCES.SDK_REST_SPEC,
    "polarion://docs/rest-user-guide": POLARION_RESOURCES.REST_USER_GUIDE,
    "polarion://docs/work-item-fields": POLARION_RESOURCES.WORK_ITEM_FIELDS,
    "polarion://docs/custom-field-types": POLARION_RESOURCES.CUSTOM_FIELD_TYPES,
    "polarion://docs/workflow-functions": POLARION_RESOURCES.WORKFLOW_FUNCTIONS,
    "polarion://docs/velocity-variables": POLARION_RESOURCES.VELOCITY_VARIABLES,
    "polarion://guides/scripting": POLARION_RESOURCES.SCRIPTING_GUIDE,
    "polarion://guides/sdk": POLARION_RESOURCES.SDK_GUIDE,
    "polarion://guides/widget-sdk": POLARION_RESOURCES.WIDGET_SDK,
    "polarion://guides/rt-sdk": POLARION_RESOURCES.RT_SDK,
    "polarion://database/tables": POLARION_RESOURCES.DB_TABLES,
    "polarion://database/workitem-schema": POLARION_RESOURCES.WORKITEM_SCHEMA
  };

  if (docMappings[uri]) {
    try {
      const response = await axios.get(docMappings[uri], {
        responseType: uri.endsWith('.pdf') ? 'arraybuffer' : 'text',
        headers: {
          'User-Agent': 'Polarion-MCP-Server/1.0'
        }
      });

      const mimeType = uri.endsWith('.pdf') ? 'application/pdf' :
        uri.endsWith('.json') ? 'application/json' : 'text/html';

      if (mimeType === 'application/pdf') {
        return {
          contents: [{
            uri,
            mimeType,
            blob: Buffer.from(response.data).toString('base64')
          }]
        };
      } else {
        return {
          contents: [{
            uri,
            mimeType,
            text: typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2)
          }]
        };
      }
    } catch (error) {
      throw new Error(`Failed to fetch resource ${uri}: ${error}`);
    }
  }

  // Handle local SDK files
  const localFileMappings: Record<string, string> = {
    "polarion://local/admin-user-help": LOCAL_SDK_FILES.ADMIN_USER_HELP,
    "polarion://local/deployment-guide": LOCAL_SDK_FILES.DEPLOYMENT_GUIDE,
    "polarion://local/feature-matrix": LOCAL_SDK_FILES.FEATURE_MATRIX,
    "polarion://local/rest-api-guide": LOCAL_SDK_FILES.REST_API_GUIDE,
    "polarion://local/scripting-guide": LOCAL_SDK_FILES.SCRIPTING_GUIDE_LOCAL
  };

  if (localFileMappings[uri]) {
    try {
      const filePath = path.join(SDK_DIR, localFileMappings[uri]);
      const fileBuffer = await fs.readFile(filePath);

      return {
        contents: [{
          uri,
          mimeType: "application/pdf",
          blob: fileBuffer.toString('base64')
        }]
      };
    } catch (error) {
      throw new Error(`Failed to read local SDK file ${uri}: ${error}`);
    }
  }

  // Handle project configuration resources
  if (uri.startsWith("polarion://config/")) {
    const projectId = uri.replace("polarion://config/", "");
    const config = projectConfigCache.get(projectId);

    if (config) {
      return {
        contents: [{
          uri,
          mimeType: "application/json",
          text: JSON.stringify(config, null, 2)
        }]
      };
    } else {
      throw new Error(`Project configuration not found for ${projectId}. Use the refresh_polarion_config tool to load it.`);
    }
  }

  throw new Error(`Unknown resource URI: ${uri}`);
}

/**
 * Gets available Polarion prompts
 *
 * Prompts are pre-configured workflows that guide AI assistants through
 * complex multi-step operations.
 *
 * Available Prompts:
 *
 * 1. create-work-item:
 *    - Guides through work item creation
 *    - Uses project configuration for validation
 *    - Shows available types and fields
 *
 * 2. search-work-items:
 *    - Helps construct Lucene queries
 *    - References field documentation
 *    - Formats search results
 *
 * 3. update-work-item:
 *    - Fetches current work item
 *    - Validates changes against project config
 *    - Constructs proper PATCH request
 *
 * @returns Array of prompt definitions with arguments
 */
export function getPolarionPrompts() {
  return [
    {
      name: "create-work-item",
      description: "Guide to create a properly configured Work Item with project-specific fields",
      arguments: [
        { name: "projectId", description: "The project ID", required: true }
      ]
    },
    {
      name: "search-work-items",
      description: "Guide to search Work Items with proper query syntax and field filtering",
      arguments: [
        { name: "projectId", description: "The project ID", required: true }
      ]
    },
    {
      name: "update-work-item",
      description: "Guide to update a Work Item with validation against project configuration",
      arguments: [
        { name: "projectId", description: "The project ID", required: true },
        { name: "workItemId", description: "The Work Item ID", required: true }
      ]
    }
  ];
}

/**
 * Gets a specific Polarion prompt with customized content
 *
 * This function generates context-aware prompt messages based on:
 * - Requested prompt type
 * - Provided arguments (projectId, workItemId, etc.)
 * - Cached project configuration (if available)
 *
 * The generated prompt includes:
 * - Step-by-step instructions
 * - Relevant tool calls
 * - Project-specific information (types, fields, enumerations)
 * - Links to documentation resources
 *
 * @param name - Prompt name (e.g., "create-work-item")
 * @param args - Prompt arguments (projectId, workItemId, etc.)
 * @returns Prompt content with description and messages
 */
export function getPolarionPrompt(name: string, args?: Record<string, unknown>) {
  if (name === "create-work-item") {
    const projectId = args?.projectId as string;
    if (!projectId) {
      throw new Error("projectId argument is required");
    }

    // Try to get cached config or provide generic guidance
    const config = projectConfigCache.get(projectId);
    const configInfo = config ? `

## Project Configuration for ${projectId}:

**Available Work Item Types:**
${config.workItemTypes.map(t => `- ${t}`).join('\n')}

**Custom Fields:**
${Object.entries(config.customFields).map(([type, fields]) =>
      `\n### ${type}:\n${fields.map(f => `- ${f.id} (${f.type})${f.values ? `: ${f.values.join(', ')}` : ''}`).join('\n')}`
    ).join('\n')}

**Enumerations:**
${Object.entries(config.enumerations).map(([enumId, options]) =>
      `\n### ${enumId}:\n${options.map(o => `- ${o.id}: ${o.name}`).join('\n')}`
    ).join('\n')}

Last Updated: ${config.lastUpdated}
` : `

**Note:** Project configuration not cached. Use the \`refresh_polarion_config\` tool to load current project settings, then retry this prompt.
`;

    return {
      description: `Create a Work Item in project ${projectId}`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `I need to create a Work Item in Polarion project "${projectId}". Please:

1. First, check if we have the project configuration cached by reading the resource \`polarion://config/${projectId}\`
2. If not cached, use the \`refresh_polarion_config\` tool to fetch it
3. Show me the available Work Item types and their required/custom fields
4. Guide me through creating a Work Item with proper field values and enumeration options
5. Use the \`postWorkItems\` tool to create the Work Item with a properly formatted JSON:API request body

${configInfo}`
          }
        }
      ]
    };
  }

  if (name === "search-work-items") {
    const projectId = args?.projectId as string;
    if (!projectId) {
      throw new Error("projectId argument is required");
    }

    return {
      description: `Search Work Items in project ${projectId}`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `I need to search for Work Items in Polarion project "${projectId}". Please:

1. Read the REST API documentation resource \`polarion://docs/rest-user-guide\` to understand query syntax
2. Read the Work Item fields reference \`polarion://docs/work-item-fields\` to know available fields
3. Help me construct a proper Lucene query with:
   - Field filters (e.g., type:Requirement, status:open)
   - Text searches
   - Date ranges
   - Logical operators (AND, OR, NOT)
4. Use the \`getWorkItems\` tool with proper query parameters and field filtering
5. Format the results clearly showing key fields like ID, title, status, assignee`
          }
        }
      ]
    };
  }

  if (name === "update-work-item") {
    const projectId = args?.projectId as string;
    const workItemId = args?.workItemId as string;

    if (!projectId || !workItemId) {
      throw new Error("Both projectId and workItemId arguments are required");
    }

    return {
      description: `Update Work Item ${workItemId} in project ${projectId}`,
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `I need to update Work Item ${workItemId} in Polarion project "${projectId}". Please:

1. First, fetch the current Work Item using \`getWorkItem\` tool with projectId="${projectId}" and workItemId="${workItemId}"
2. Check the project configuration resource \`polarion://config/${projectId}\` to validate field types and allowed values
3. Show me the current field values and available update options
4. Help me construct a PATCH request with:
   - Only the fields I want to change
   - Proper JSON:API structure
   - Valid enumeration values from the project config
   - Correct field types (text, date, enum, etc.)
5. Use the \`patchWorkItem\` tool to apply the update
6. Confirm the update by fetching the Work Item again`
          }
        }
      ]
    };
  }

  throw new Error(`Unknown prompt: ${name}`);
}
