# Supply chain verification

Tagged releases attach the MCPB bundle with build provenance. The npm package is published with provenance. The Docker publish workflow adds BuildKit SBOM metadata to tagged images, signs the pushed image digest with keyless cosign, and publishes build provenance. These workflows use GitHub's OIDC identity and require no long-lived signing secret.

Verify a published image by digest:

```sh
cosign verify ghcr.io/OWNER/REPOSITORY@sha256:DIGEST \
  --certificate-identity "https://github.com/OWNER/REPOSITORY/.github/workflows/docker-publish.yml@refs/tags/vVERSION" \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com
```

Verify an artifact attestation:

```sh
gh attestation verify polarion-mcp-vVERSION.mcpb --repo OWNER/REPOSITORY
```

Substitute the repository, version, and image digest from the release.
