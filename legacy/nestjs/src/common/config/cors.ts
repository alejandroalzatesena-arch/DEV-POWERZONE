export const DEFAULT_CORS_ORIGINS = 'http://localhost:4200';

export function parseCorsOrigins(raw?: string): string[] {
  return (raw || DEFAULT_CORS_ORIGINS)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
}
