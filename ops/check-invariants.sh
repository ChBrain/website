#!/usr/bin/env bash
#
# Origin invariant tripwire for kaihacks.ai - run nightly via cPanel cron.
#
# Checks origin-side file/config state the Cloudflare edge monitor CANNOT see.
# The Worker checks live HTTP from the edge; this checks the filesystem behind
# it. On drift it prints the problems and exits non-zero; on a clean run it is
# silent (prints nothing), so - with the cron's email set - you only ever hear
# from it when something is wrong.
#
# Setup (cPanel -> Cron Jobs):
#   1. Put this file on the host, e.g. ~/ops/check-invariants.sh
#        chmod +x ~/ops/check-invariants.sh
#   2. Set the job's "Cron Email" so its output reaches you.
#   3. Add a daily schedule with the command:
#        bash ~/ops/check-invariants.sh
#
# Paths are overridable if the layout ever changes:
#   PUBLIC_HTML=/home/USER/public_html bash ~/ops/check-invariants.sh
#
# Issue 149 (Phase 4b).

set -u

PUBLIC_HTML="${PUBLIC_HTML:-$HOME/public_html}"
problems=()

require_file() {
  # require_file <path> <description>
  if [ ! -s "$1" ]; then
    problems+=("missing or empty: $1 ($2)")
  fi
}

# 1. Each surface docroot must serve an index - a failed or empty deploy (e.g.
#    an rsync --delete against an empty source) would wipe it.
require_file "$PUBLIC_HTML/main/index.html" "main / apex"
require_file "$PUBLIC_HTML/architecture.kaihacks.ai/index.html" "architecture subdomain"
require_file "$PUBLIC_HTML/cultures.kaihacks.ai/index.html" "cultures subdomain"

# 2. The apex .htaccess fallback, if present, MUST stay host-scoped. An unscoped
#    /main/ rewrite here leaks into the nested subdomain docroots that inherit
#    this file and 404s them - the original incident (issue 148). Cloudflare's
#    edge rule is the primary router now, but this fallback must never regress.
htaccess="$PUBLIC_HTML/.htaccess"
if [ -f "$htaccess" ] && grep -q 'RewriteRule .*/main/' "$htaccess"; then
  if ! grep -q 'HTTP_HOST' "$htaccess"; then
    problems+=("apex .htaccess has a /main/ rewrite WITHOUT an HTTP_HOST guard - would leak into the subdomains (issue 148)")
  fi
fi

# Report: silent on success; print + non-zero on drift (cron mails the output).
if [ "${#problems[@]}" -gt 0 ]; then
  echo "kaihacks origin invariant drift on $(hostname) at $(date -u +%FT%TZ):"
  printf '  - %s\n' "${problems[@]}"
  exit 1
fi
exit 0
