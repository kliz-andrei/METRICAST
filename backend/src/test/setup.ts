process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://metricast:metricast@127.0.0.1:5432/metricast?schema=public';
process.env.JWT_ACCESS_SECRET = 'test-only-access-secret-that-is-longer-than-thirty-two-characters';
process.env.JWT_ACCESS_TTL = '15m';
process.env.JWT_REFRESH_TTL_DAYS = '30';
process.env.PASSWORD_RESET_TTL_MINUTES = '30';
process.env.CORS_ORIGIN = 'http://localhost:5173';
