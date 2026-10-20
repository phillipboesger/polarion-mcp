# Troubleshooting

## HTTP Server Exits Immediately

- HTTP_API_KEY is required. Set it in your environment before starting.

## 401 Errors from Polarion

- Verify BEARER_TOKEN is valid and not expired.
- Confirm API_BASE_URL points to the correct Polarion instance.

## TLS or Certificate Errors

- For self-signed certificates, set NODE_TLS_REJECT_UNAUTHORIZED=0 for trusted internal servers only.

## Tool Not Found

- Use GET /api/tools to list valid tool names.
- Regenerate tools if the Polarion API version changed.

## SDK PDF Not Found

- The PDFs are not bundled; copy them into sdk/ under the names in sdk/README.md. Only present files are listed as resources.

## OpenAPI Generation Fails

- Ensure openapi.json exists at the repo root.
- Re-run download-spec with a valid BEARER_TOKEN.

## Missing Build Output

- Run npm run build to generate build/.

## read_when

- Use this guide when diagnosing setup, auth, or build issues.
