"""Extract the initial PostgreSQL schema from the historical TypeORM migration.

The committed V1 SQL is the source used by the Spring Boot application. Run
this script only when intentionally regenerating that baseline from the legacy
migration; later schema changes belong in new Flyway migrations.
"""

from pathlib import Path
import re

root = Path(__file__).resolve().parents[1]
source = (root / "src/database/migrations/1770000000000-InitialSchema.ts").read_text(encoding="utf-8")
statements = re.findall(r"await queryRunner\.query\(\s*`(.*?)`\s*,?\s*\);", source.split("public async down")[0], re.S)
if len(statements) < 60:
    raise SystemExit(f"Expected full initial migration; found only {len(statements)} statements")
if any("${" in statement for statement in statements):
    raise SystemExit("Migration contains template interpolation; inspect manually")
target = root / "backend/src/main/resources/db/migration/V1__initial_schema.sql"
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(
    "-- Preserved schema from the initial TypeORM migration.\n"
    "-- Existing databases are baselined at version 1; fresh databases execute this file.\n\n"
    + "\n\n".join(statement.strip().rstrip(";") + ";" for statement in statements)
    + "\n",
    encoding="utf-8",
)
print(f"Wrote {len(statements)} statements to {target}")
