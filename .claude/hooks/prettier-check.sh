#!/usr/bin/env bash
# Claude Code PreToolUse hook: blocks GitHub push tools when content
# isn't prettier-clean. Closes the loophole where the agent bypasses
# local git (and therefore .husky) by pushing directly via the
# github MCP API.
#
# Activated by .claude/settings.json on:
#   - mcp__github__push_files
#   - mcp__github__create_or_update_file
#
# Exits:
#   0  -> allow tool call
#   2  -> block tool call (Claude shows the stderr message)
#
# Behavior on missing local prettier: skip silently (CI is still the
# backstop). This avoids false blocks on fresh sandboxes where
# `npm install` hasn't run yet.

set -e
cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

PRETTIER="./node_modules/.bin/prettier"
[ -x "$PRETTIER" ] || exit 0

INPUT="$(cat)"
TOOL="$(echo "$INPUT" | jq -r '.tool_name')"

case "$TOOL" in
  mcp__github__push_files)
    PATHS=$(echo "$INPUT" | jq -r '.tool_input.files[].path')
    ;;
  mcp__github__create_or_update_file)
    PATHS=$(echo "$INPUT" | jq -r '.tool_input.path')
    ;;
  *) exit 0 ;;
esac

FAILED=""
while IFS= read -r p; do
  [ -n "$p" ] || continue
  case "$p" in
    *.astro|*.css|*.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.json|*.md|*.yml|*.yaml) ;;
    *) continue ;;
  esac

  if [ "$TOOL" = "mcp__github__push_files" ]; then
    CONTENT=$(echo "$INPUT" | jq -r --arg p "$p" '.tool_input.files[] | select(.path==$p) | .content')
  else
    CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content')
  fi

  if ! printf "%s" "$CONTENT" | "$PRETTIER" --check --stdin-filepath "$p" >/dev/null 2>&1; then
    FAILED="$FAILED\n  - $p"
  fi
done <<<"$PATHS"

if [ -n "$FAILED" ]; then
  printf "BLOCKED: prettier --check failed for:%b\n" "$FAILED" >&2
  printf "Run prettier --write on the affected file(s) and re-push.\n" >&2
  exit 2
fi

exit 0
