# SonarCloud

The `Sonar` workflow runs on pushes to `main` and pull requests. It uploads
coverage from `npm run test:coverage` and waits for the SonarCloud quality gate.
The project uses SonarCloud's default **Sonar way** quality gate. Generated
`src/tools.ts` is excluded from coverage and duplication analysis.

The organization and project key in `sonar-project.properties` are supplied
defaults. Confirm `phillipboesger` and `phillipboesger_polarion-mcp` against the
project's SonarCloud organization and project settings after importing it.

## Enable the scan and gate

1. In SonarCloud, create or import the `polarion-mcp` project under the
   `phillipboesger` organization. Confirm the organization and project key match
   `sonar-project.properties`.
2. In the project **Administration > Analysis Method**, disable **Automatic
   Analysis**. It conflicts with the CI-based analysis in this workflow.
3. Create a SonarCloud analysis token, then add it in the GitHub repository at
   **Settings > Secrets and variables > Actions > New repository secret** with
   the name `SONAR_TOKEN`.
4. In the GitHub repository, open **Settings > Branches** (or the applicable
   ruleset), edit the protection for `main`, and make the **Sonar** check
   required.

Until `SONAR_TOKEN` is configured, and on pull requests from forks, the workflow
prints a notice and skips the scan. Coverage still runs.
