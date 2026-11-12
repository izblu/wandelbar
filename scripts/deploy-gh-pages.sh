#!/usr/bin/env bash
# Veröffentlicht einen Build auf dem Branch gh-pages (läuft in GitHub Actions).
#
# Aufruf: bash scripts/deploy-gh-pages.sh <build-ordner> <ziel>
#   ziel "root"    -> Wurzel von gh-pages; der Ordner preview/ bleibt erhalten
#   ziel "preview" -> Ordner preview/ von gh-pages; die Wurzel bleibt unverändert
#
# Nutzt die Zugangsdaten, die actions/checkout im Repo hinterlegt.
set -euo pipefail

build_dir="$(realpath "$1")"
target="$2"
site_dir="$(mktemp -d)"
rmdir "$site_dir"
work_branch="gh-pages-deploy"
repo_dir="$(pwd)"

cleanup() {
  git -C "$repo_dir" worktree remove --force "$site_dir" >/dev/null 2>&1 || true
  git -C "$repo_dir" branch -D "$work_branch" >/dev/null 2>&1 || true
}
trap cleanup EXIT

if git fetch --depth 1 origin gh-pages; then
  git worktree add -B "$work_branch" "$site_dir" FETCH_HEAD
else
  echo "gh-pages existiert noch nicht und wird neu angelegt."
  git worktree add --orphan -b "$work_branch" "$site_dir"
fi

case "$target" in
  root)
    # Alles außer .git, preview/ und .nojekyll ersetzen, damit keine alten Dateien liegen bleiben.
    find "$site_dir" -mindepth 1 -maxdepth 1 \
      ! -name .git ! -name preview ! -name .nojekyll -exec rm -rf {} +
    cp -a "$build_dir/." "$site_dir/"
    ;;
  preview)
    rm -rf "$site_dir/preview"
    mkdir -p "$site_dir/preview"
    cp -a "$build_dir/." "$site_dir/preview/"
    ;;
  *)
    echo "Unbekanntes Ziel: $target" >&2
    exit 1
    ;;
esac

# Ohne diese Datei würde GitHub Pages Jekyll anwenden und Dateien mit _ ausblenden.
touch "$site_dir/.nojekyll"

cd "$site_dir"
git add --all
if git diff --cached --quiet; then
  echo "Keine Änderungen zu veröffentlichen."
  exit 0
fi

git -c user.name="github-actions[bot]" \
  -c user.email="41898282+github-actions[bot]@users.noreply.github.com" \
  commit --quiet -m "Veröffentlichung ($target) von ${GITHUB_SHA:-lokal}"
git push origin HEAD:refs/heads/gh-pages
echo "Veröffentlicht: $target"
