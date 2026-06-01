# Security Policy

## Reporting Security Findings

If you discover a security vulnerability, misconfiguration, or advisory affecting the website:

1. **GitHub Dependabot / Security Advisory** - GitHub will auto-notify via email and the Security tab
2. **Code review or audit** - Create an issue using the [security-finding template](.github/issue-templates/security-finding.md)
3. **Responsible disclosure** - Contact security@chbrain.de with details; do not open a public issue initially

## Security Finding Workflow

Every security finding must be attached to a PR before it's resolved. This ensures:

- Audit trail of who fixed it and when
- Peer review of the remediation
- Clear documentation of the security rationale
- Verification that the fix reaches main

### Process

1. **GitHub raises an alert** (e.g., Dependabot, Security tab, code scanning)
2. **Open an issue** using the [security-finding](.github/issue-templates/security-finding.md) template
   - Link the GitHub alert
   - Describe scope and severity
   - Outline the fix plan
3. **Create a feature branch:** `security/<issue-id>-<slug>`
4. **Implement the fix**
   - Test locally: `npm test`
   - Verify build: `npm run build`
   - Add a one-line comment explaining the security rationale
5. **Open a PR**
   - Title: `security: [description]`
   - Body: Reference the issue: "Fixes #<number>"
   - Link the GitHub alert in the PR body
6. **Merge to main** once approved
7. **GitHub's scanner will rescan** → alert auto-closes when the fix reaches main

### Example: Adding Explicit Workflow Permissions

**Issue:** GitHub alert: "Workflow `deploy-production.yml` lacks explicit permissions block"

**Branch:** `security/github-actions-permissions-deploy`

**PR Title:** `security(deploy): add explicit permissions to deploy-production.yml workflow`

**Code change:**

```yaml
# Explicit permissions follow the principle of least privilege.
# This workflow deploys the site, so it needs to read repository contents.
permissions:
  contents: read
```

**Result:** After merge, GitHub's security scanner will verify the fix and auto-close the alert.

## Least-Privilege Principle

All security fixes must adhere to least privilege:

- **GitHub Actions workflows** should declare explicit `permissions` blocks at the workflow or job level
- **Permissions should be read-only** unless the workflow specifically needs to write (e.g., `pull-requests: write` for automated PRs)
- **Each permission must be documented** with a comment explaining why it's needed
- **Remove unused scopes** (e.g., if a workflow doesn't publish, don't include `packages: write`)

## Permissions Reference

**Common permissions for website workflows:**

| Permission               | Use Case                                           |
| ------------------------ | -------------------------------------------------- |
| `contents: read`         | Checkout repo, run tests, read files               |
| `contents: write`        | Push commits, create tags (release workflows only) |
| `pull-requests: write`   | Create or update PRs (automation workflows)        |
| `packages: read`         | Install from GitHub Packages                       |
| `security-events: write` | CodeQL analysis workflow                           |
| `actions: read`          | Read workflow metadata (CodeQL)                    |

## Governance

- **Branch naming:** Follow `security/<issue-id>-<slug>` pattern
- **Commit message:** Use `security: ...` prefix (or `fix(security): ...` if fixing an existing feature)
- **PR review:** At least one approval before merge
- **Automation:** GitHub Actions validate the fix; PRs may be auto-merged if they pass all checks (configure in repo settings if desired)

## References

- [GitHub Actions Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [Principle of Least Privilege](https://en.wikipedia.org/wiki/Principle_of_least_privilege)
- [OWASP: Authorization](https://owasp.org/www-community/attacks/Authorization_attack)

---

**Last updated:** June 2026
