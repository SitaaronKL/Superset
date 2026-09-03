# Shared helpers for the .superset lifecycle scripts. Sourced, not executed.
say()  { printf '\033[1;34m▸\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m!\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m✗\033[0m %s\n' "$*" >&2; exit 1; }

# Absolute path of the main checkout (the first entry in `git worktree list`).
# Inside a Superset worktree this is where env files and sibling repos live.
main_checkout() {
  git worktree list --porcelain 2>/dev/null | head -1 | sed 's/^worktree //'
}

# Copy gitignored env files from the main checkout into this worktree when
# they are missing here. Never overwrites, never commits.
copy_env_from_main() {
  local main; main="$(main_checkout)"
  [ -n "$main" ] && [ "$main" != "$(pwd)" ] || return 0
  local f
  for f in "$main"/.env "$main"/.env.local "$main"/.env.development "$main"/.env.development.local; do
    [ -f "$f" ] || continue
    if [ ! -f "./$(basename "$f")" ]; then
      cp "$f" "./$(basename "$f")"
      say "Copied $(basename "$f") from main checkout"
    fi
  done
}

# npm ci only when node_modules is missing or the lockfile changed.
npm_install_if_needed() {
  local dir="${1:-.}"
  if [ -f "$dir/node_modules/.package-lock.json" ] && \
     cmp -s "$dir/package-lock.json" "$dir/node_modules/.superset-lock" 2>/dev/null; then
    say "$dir: node_modules up to date"
  else
    say "$dir: installing dependencies (npm ci) …"
    (cd "$dir" && npm ci --no-audit --no-fund)
    cp "$dir/package-lock.json" "$dir/node_modules/.superset-lock"
  fi
}
