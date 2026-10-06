/**
 * Bloqueo de login por intentos fallidos (protección contra fuerza bruta).
 * In-memory por proceso: suficiente para un gimnasio mononodo.
 */
export class LoginFailuresTracker {
  private readonly attempts = new Map<
    string,
    { count: number; firstAt: number; lockedUntil: number }
  >();

  constructor(
    private readonly maxAttempts = 5,
    private readonly windowMs = 15 * 60 * 1000,
    private readonly lockMs = 15 * 60 * 1000,
  ) {}

  /**
   * Devuelve los segundos restantes de bloqueo (0 si no está bloqueado).
   */
  isLocked(email: string): number {
    const rec = this.attempts.get(email);
    if (!rec) return 0;
    if (rec.lockedUntil > Date.now()) {
      return Math.ceil((rec.lockedUntil - Date.now()) / 1000);
    }
    if (Date.now() - rec.firstAt > this.windowMs || rec.lockedUntil > 0) {
      this.attempts.delete(email);
    }
    return 0;
  }

  recordFailure(email: string): void {
    const now = Date.now();
    let rec = this.attempts.get(email);
    if (!rec || now - rec.firstAt > this.windowMs) {
      rec = { count: 0, firstAt: now, lockedUntil: 0 };
      this.attempts.set(email, rec);
    }
    rec.count += 1;
    if (rec.count >= this.maxAttempts) {
      rec.lockedUntil = now + this.lockMs;
    }
  }

  reset(email: string): void {
    this.attempts.delete(email);
  }
}
