# Local SDK Documentation (optional)

The MCP server can serve **local Polarion SDK/help PDFs** as `polarion://local/*`
resources (their extracted text).

These PDFs are **Siemens Polarion documentation and are intentionally NOT bundled
in this open-source repository** for licensing reasons. The server works fine
without them; missing files are simply not listed.

## Enabling local SDK documentation

If you have a licensed Polarion installation, copy the corresponding PDFs into
this `sdk/` directory using the **exact file names** below. They are available
from your Polarion server (`/polarion/sdk/doc/...`) or the Polarion help portal.

| Resource `polarion://local/…` | Expected file name in `sdk/`          |
| --------------------------- | ------------------------------------- |
| `admin-user-help`           | `Administrator and User Help.pdf`     |
| `deployment-guide`          | `Deployment and Maintenance Guide.pdf`|
| `feature-matrix`            | `Polarion_2506_Feature Matrix.pdf`    |
| `rest-api-guide`            | `REST API User Guide for Polarion.pdf`|
| `scripting-guide`           | `scripting_guide_and_examples.pdf`    |

The file names are defined in `LOCAL_PDFS` in
[`../src/polarion.ts`](../src/polarion.ts). Only files that are present are
listed as resources; their text is extracted and cut at 200,000 characters.
