"""Compare Spring controller routes with the preserved NestJS OpenAPI contract."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
legacy = json.loads((ROOT / "postman/powerzone-openapi.json").read_text(encoding="utf-8-sig"))
expected = {(method.upper(), path) for path, methods in legacy["paths"].items()
            for method in methods if method.upper() in {"GET", "POST", "PUT", "PATCH", "DELETE"}}
actual = set()
for source in (ROOT / "backend/src/main/java").rglob("*Controller.java"):
    data = source.read_text(encoding="utf-8")
    base_match = re.search(r'@RequestMapping\("([^"]+)"\)', data)
    base = base_match.group(1) if base_match else ""
    for method, suffix in re.findall(r'@(Get|Post|Put|Patch|Delete)Mapping(?:\("([^"]*)"\))?', data):
        path = base + suffix
        path = re.sub(r'\{[^}]+\}', '{id}', path)
        actual.add((method.upper(), path))
normalize = lambda x: (x[0], re.sub(r'\{[^}]+\}', '{id}', x[1]))
missing = sorted({normalize(x) for x in expected} - actual)
extra = sorted(actual - {normalize(x) for x in expected})
print(f"Legacy: {len(expected)} operations; Spring: {len(actual)} operations")
if missing:
    print("Missing:")
    for route in missing:
        print(" ", *route)
if extra:
    print("Additional:")
    for route in extra:
        print(" ", *route)
raise SystemExit(1 if missing else 0)
