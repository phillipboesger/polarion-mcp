/**
 * Configuration constants for the MCP Polarion REST server
 *
 * This file centralizes all configuration settings, including:
 * - Server identification (name and version)
 * - API endpoint configuration
 * - Authentication settings
 * - Documentation resource URLs
 * - Local SDK file references
 *
 * Environment Variables:
 * - API_BASE_URL: Base URL for the Polarion REST API (must point at your own instance)
 * - BEARER_TOKEN: Authentication token for API requests
 */

import dotenv from 'dotenv';

// Load environment variables from .env file
// This allows configuration without modifying code
dotenv.config();

/**
 * Server configuration
 * These values identify this MCP server to AI assistants
 */
export const SERVER_NAME = "polarion-rest-api";
export const SERVER_VERSION = "v1";

/**
 * API Base URL - configurable via environment variable
 *
 * This is the root URL for all Polarion REST API requests.
 * Default: placeholder host (https://polarion.example.com/polarion/rest/v1)
 *
 * You MUST set the API_BASE_URL environment variable to your own instance:
 * export API_BASE_URL="https://your-polarion-server.com/polarion/rest/v1"
 */
export const API_BASE_URL = process.env.API_BASE_URL || "https://polarion.example.com/polarion/rest/v1";

/**
 * Get Bearer token from environment
 *
 * Bearer tokens are used for authentication with the Polarion REST API.
 * The token should be set in the BEARER_TOKEN environment variable.
 *
 * How to obtain a Bearer token:
 * 1. Log in to your Polarion instance
 * 2. Navigate to your user profile settings
 * 3. Generate a Personal Access Token (PAT)
 * 4. Set it as an environment variable: export BEARER_TOKEN="your-token-here"
 *
 * @returns The bearer token if set, undefined otherwise
 */
export function getBearerToken(): string | undefined {
  return process.env.BEARER_TOKEN;
}

/**
 * Get SSL certificate verification setting from environment
 *
 * By default, Node.js validates SSL certificates. For internal servers
 * with self-signed certificates, you may need to disable this verification.
 *
 * WARNING: Only disable SSL verification for trusted internal servers.
 * This makes connections vulnerable to man-in-the-middle attacks.
 *
 * To disable SSL verification, set: export NODE_TLS_REJECT_UNAUTHORIZED="0"
 *
 * @returns false if SSL verification should be disabled, true otherwise
 */
export function shouldRejectUnauthorized(): boolean {
  return process.env.NODE_TLS_REJECT_UNAUTHORIZED !== '0';
}

/**
 * Get base Polarion URL (without /rest/v1)
 *
 * This extracts the base Polarion URL from the API_BASE_URL.
 * For example: "https://polarion.example.com/polarion/rest/v1"
 * becomes: "https://polarion.example.com/polarion"
 *
 * @returns The base Polarion URL
 */
export function getPolarionBaseUrl(): string {
  // Remove /rest/v1 from the end of API_BASE_URL
  return API_BASE_URL.replace(/\/rest\/v1\/?$/, '');
}

/**
 * Polarion SDK and Documentation Resources
 *
 * This object contains URLs to various Polarion documentation resources.
 * These are used by the resource handlers to provide documentation to AI assistants.
 *
 * Resource Categories:
 * - SDK_*: Software Development Kit documentation for extending Polarion
 * - DB_*: Database schema and table references
 * - REST_*: REST API guides and specifications
 * - WORK_ITEM_*: Work item configuration and field references
 * - WORKFLOW_*: Workflow scripting and automation
 * - VELOCITY_*: Wiki page customization with Velocity templates
 *
 * Note: Some URLs point to demo/testdrive instances, others to official Siemens docs
 */
export const POLARION_RESOURCES = {
  // SDK Documentation
  SDK_INDEX: "https://almdemo.polarion.com/polarion/sdk/index.html",
  SDK_JAVADOC: "https://almdemo.polarion.com/polarion/sdk/doc/javadoc/index.html",
  SDK_RENDERING: "https://almdemo.polarion.com/polarion/sdk/doc/javadoc-rendering/index.html",
  SDK_SCRIPTING: "https://almdemo.polarion.com/polarion/sdk/doc/scripting-api/index.html",
  SDK_REST_DOCS: "https://testdrive.polarion.com/polarion/sdk/doc/rest/index.html",
  SDK_REST_SPEC: "https://testdrive.polarion.com/polarion/sdk/doc/rest/polarionrest.json",

  // Siemens Documentation
  REST_USER_GUIDE: "https://docs.sw.siemens.com/en-US/doc/230235217/PL20230412292748000.polarion_help_sc.xid2134849/xid2134871",
  WORK_ITEM_FIELDS: "https://docs.plm.automation.siemens.com/content/polarion/19.1/help/en_US/user_and_administration_help/reference/user_reference/work_items/work_item_and_index_fields.html",
  CUSTOM_FIELD_TYPES: "https://docs.sw.siemens.com/en-US/doc/230235217/PL20190701144002440.xid1465510/xid1554316",
  WORKFLOW_FUNCTIONS: "https://docs.plm.automation.siemens.com/content/polarion/19.1/help/en_US/user_and_administration_help/reference/administration_reference/scripted_workflow_functions_and_conditions.html",
  VELOCITY_VARIABLES: "https://docs.plm.automation.siemens.com/content/polarion/19.1/help/en_US/user_and_administration_help/reference/administration_reference/velocity_variables_for_active_wiki_pages.html",

  // PDFs and Guides
  SCRIPTING_GUIDE: "https://testdrive.polarion.com/polarion/sdk/doc/scripting_guide_and_examples.pdf",
  SDK_GUIDE: "https://testdrive.polarion.com/polarion/sdk/doc/sdk.pdf",
  WIDGET_SDK: "https://testdrive.polarion.com/polarion/sdk/doc/widget-sdk.pdf",
  RT_SDK: "https://testdrive.polarion.com/polarion/sdk/doc/rt-sdk.pdf",

  // Database
  DB_TABLES: "https://testdrive.polarion.com/polarion/sdk/doc/database/TablesReferenceIndex.html",
  WORKITEM_SCHEMA: "https://testdrive.polarion.com/polarion/sdk/doc/database/WorkItemDBSchema.pdf"
};

/**
 * Local SDK Files (stored in sdk/ directory for offline access)
 *
 * These files are cached locally to provide:
 * - Faster access (no network requests)
 * - Offline availability
 * - Reduced load on Polarion servers
 *
 * Note: These large PDF files are managed by Git LFS (Large File Storage)
 * to avoid bloating the repository size.
 */
export const LOCAL_SDK_FILES = {
  ADMIN_USER_HELP: "Administrator and User Help.pdf",
  DEPLOYMENT_GUIDE: "Deployment and Maintenance Guide.pdf",
  FEATURE_MATRIX: "Polarion_2506_Feature Matrix.pdf",
  REST_API_GUIDE: "REST API User Guide for Polarion.pdf",
  SCRIPTING_GUIDE_LOCAL: "scripting_guide_and_examples.pdf"
};
