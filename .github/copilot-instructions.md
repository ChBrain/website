# website - Copilot Instructions

## Security Finding Workflow

When a security finding (Dependabot, GitHub Advisory, code review, or audit) arrives:

1. **Use the security-finding issue template** to document:
   - Alert source (GitHub, advisory link)
   - Affected components
   - Severity
   - Fix plan

2. **Create a feature branch:** `security/<issue-id>-<slug>`

3. **Implement the fix:**
   - Add explicit `permissions` blocks to workflows
   - Add one-line comments explaining the security rationale
   - Test: `npm test`
   - Verify build: `npm run build`

4. **Open a PR:**
   - Title: `security: [description]`
   - Body: "Fixes #<issue-number>"
   - Link the GitHub alert

5. **Merge to main** → GitHub's scanner rescan → alert auto-closes

**Governance:** See [.github/SECURITY.md](.github/SECURITY.md) for the complete workflow.

---

*Last updated: June 2026*
