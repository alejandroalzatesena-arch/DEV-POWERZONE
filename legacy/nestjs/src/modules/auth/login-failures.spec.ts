import { LoginFailuresTracker } from './login-failures';

describe('LoginFailuresTracker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('cierra sin bloqueo al inicio', () => {
    const tracker = new LoginFailuresTracker();
    expect(tracker.isLocked('a@b.com')).toBe(0);
  });

  it('bloquea tras 5 intentos fallidos', () => {
    const tracker = new LoginFailuresTracker(5, 60_000, 60_000);
    for (let i = 0; i < 5; i++) tracker.recordFailure('a@b.com');
    expect(tracker.isLocked('a@b.com')).toBeGreaterThan(0);
  });

  it('no bloquea con menos intentos que el máximo', () => {
    const tracker = new LoginFailuresTracker(5, 60_000, 60_000);
    for (let i = 0; i < 4; i++) tracker.recordFailure('a@b.com');
    expect(tracker.isLocked('a@b.com')).toBe(0);
  });

  it('desbloquea cuando vence el lock', () => {
    const tracker = new LoginFailuresTracker(5, 60_000, 60_000);
    for (let i = 0; i < 5; i++) tracker.recordFailure('a@b.com');
    jest.advanceTimersByTime(61_000);
    expect(tracker.isLocked('a@b.com')).toBe(0);
  });

  it('reset() limpia los intentos', () => {
    const tracker = new LoginFailuresTracker(5, 60_000, 60_000);
    tracker.recordFailure('a@b.com');
    tracker.reset('a@b.com');
    expect(tracker.isLocked('a@b.com')).toBe(0);
  });

  it('el contador se reinicia tras la ventana de tiempo', () => {
    const tracker = new LoginFailuresTracker(5, 60_000, 60_000);
    tracker.recordFailure('a@b.com');
    jest.advanceTimersByTime(61_000);
    tracker.recordFailure('a@b.com');
    expect(tracker.isLocked('a@b.com')).toBe(0);
  });
});
