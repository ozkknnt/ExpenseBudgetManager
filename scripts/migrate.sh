#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required (e.g. postgres://user:pass@host:5432/dbname)" >&2
  exit 1
fi

mapfile -t files < <(find migrations -maxdepth 1 -type f -name "*.sql" | sort)

if [[ ${#files[@]} -eq 0 ]]; then
  echo "No migrations found in migrations/*.sql" >&2
  exit 0
fi

for file in "${files[@]}"; do
  echo "Applying ${file}"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$file"
done
