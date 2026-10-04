import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  it('acepta una configuración mínima de desarrollo', () => {
    const result = validateEnv({ NODE_ENV: 'development' });
    expect(result).toBeDefined();
    expect(result.NODE_ENV).toBe('development');
  });

  it('rechaza JWT_ACCESS_EXPIRES_IN inválido', () => {
    expect(() => validateEnv({ JWT_ACCESS_EXPIRES_IN: 'abc' })).toThrow(/expires_in/i);
  });

  it('rechaza DB_SYNCHRONIZE con un valor no booleano', () => {
    expect(() => validateEnv({ DB_SYNCHRONIZE: 'quizas' })).toThrow(/DB_SYNCHRONIZE/);
  });

  it('rechaza un NODE_ENV inválido', () => {
    expect(() => validateEnv({ NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  describe('modo producción', () => {
    const secure = {
      NODE_ENV: 'production',
      JWT_ACCESS_SECRET: 'secreto-access-seguro',
      JWT_REFRESH_SECRET: 'secreto-refresh-seguro',
      DB_SYNCHRONIZE: 'false',
      CORS_ORIGINS: 'https://app.example.com',
      AI_SERVICE_API_KEY: 'clave-ia-segura',
    };

    it('rechaza secretos JWT por defecto', () => {
      expect(() =>
        validateEnv({
          ...secure,
          JWT_ACCESS_SECRET: 'cambia-este-secreto-access',
          JWT_REFRESH_SECRET: 'cambia-este-secreto-refresh',
        }),
      ).toThrow(/jwt/i);
    });

    it('rechaza DB_SYNCHRONIZE en true', () => {
      expect(() => validateEnv({ ...secure, DB_SYNCHRONIZE: 'true' })).toThrow(/synchronize/i);
    });

    it('rechaza DB_SYNCHRONIZE sin definir', () => {
      expect(() => {
        const { DB_SYNCHRONIZE, ...sinSync } = secure;
        void DB_SYNCHRONIZE;
        validateEnv(sinSync);
      }).toThrow(/synchronize/i);
    });

    it('rechaza CORS_ORIGINS sin definir', () => {
      expect(() => {
        const { CORS_ORIGINS, ...sinCors } = secure;
        void CORS_ORIGINS;
        validateEnv(sinCors);
      }).toThrow(/CORS_ORIGINS/i);
    });

    it('rechaza AI_SERVICE_API_KEY sin definir', () => {
      expect(() => {
        const { AI_SERVICE_API_KEY, ...sinClave } = secure;
        void AI_SERVICE_API_KEY;
        validateEnv(sinClave);
      }).toThrow(/AI_SERVICE_API_KEY/i);
    });

    it('acepta una configuración segura de producción', () => {
      expect(() => validateEnv(secure)).not.toThrow();
    });
  });
});
