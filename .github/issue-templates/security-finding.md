---
name: Security Finding
about: Report or track a security vulnerability, misconfiguration, or advisory
title: "security: [brief description]"
labels: ["security", "triage"]
---

## Alert Source

<!-- Where did this finding originate? (e.g., GitHub Security Advisory, Dependabot, code review, etc.) -->

- **Type:** [e.g., GitHub Actions permissions, dependency vulnerability, CVSS score]
- **Link:** [GitHub alert URL or advisory link]
- **Severity:** [Critical / High / Medium / Low]

## Description

<!-- Explain the security issue, its scope, and why it matters. -->

## Affected Components

<!-- Which files, workflows, dependencies, or services are affected? -->

- [ ] `.github/workflows/...`
- [ ] `src/...`
- [ ] Other: ...

## Least-Privilege Principle

<!-- Describe how the fix adheres to least privilege: minimum permissions, minimal scope, etc. -->

This fix will:

- [ ] Add explicit `permissions` block to limit access
- [ ] Remove unnecessary permissions or scopes
- [ ] Document why each permission is required
- [ ] Follow the principle of least privilege

## Fix Plan

<!-- Outline the remediation steps. Reference relevant ADRs or governance docs if applicable. -->

## PR Workflow

When fixing this finding:

1. Create a feature branch: `security/<issue-id>-<slug>`
2. Implement the fix (test locally, verify build/lint pass)
3. Open a PR linked to this issue
4. Add a one-line comment in the code explaining the security rationale
5. Merge to `main` once approved
6. GitHub's security scanner will rescan and auto-close this issue

**See [.github/SECURITY.md](.github/SECURITY.md) for the complete security finding workflow.**
