#!/usr/bin/env bash
# Builds a preview of every open pull request labelled `preview` into dist/preview/pr-<n>/
# (docs/previews.md). Called by .github/workflows/pages.yml after main is built into dist/.
# Only branches of this repository are built (never forks: their code would run on the site).
# Previews are guest only (no account server) and keep their own copy of saved data
# (src/core/preview.ts). A preview that fails to build is left out; main still deploys.
set -uo pipefail

repo="${GITHUB_REPOSITORY:?}"
prs=$(gh pr list --repo "$repo" --label preview --state open --limit 50 \
  --json number,headRefName,isCrossRepository \
  --jq '.[] | select(.isCrossRepository | not) | "\(.number) \(.headRefName)"')

mkdir -p dist/preview
index="dist/preview/index.html"
{
  echo '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width">'
  echo '<title>iggyuoso previews</title><body style="font-family:system-ui;padding:16px;background:#08070d;color:#eee">'
  echo '<h1>iggyuoso previews</h1><ul>'
} > "$index"

while read -r num branch; do
  [ -z "${num:-}" ] && continue
  name="pr-$num"
  echo "::group::Preview $name ($branch)"
  dir="$RUNNER_TEMP/$name"
  if git fetch --depth 1 origin "refs/heads/$branch" \
    && git worktree add --detach "$dir" FETCH_HEAD \
    && (cd "$dir" && npm ci --no-audit --no-fund && VITE_PREVIEW="$name" npm run build); then
    rm -rf "dist/preview/$name"
    cp -r "$dir/dist" "dist/preview/$name"
    echo "<li><a href=\"$name/\" style=\"color:#ff7aa8\">#$num</a> $branch</li>" >> "$index"
    echo "Built $name"
  else
    echo "::warning::Preview $name ($branch) did not build; left out"
  fi
  echo "::endgroup::"
done <<< "$prs"

echo '</ul><p><a href="../" style="color:#ff7aa8">Main site</a></p></body>' >> "$index"
