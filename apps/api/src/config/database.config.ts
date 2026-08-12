import { registerAs } from '@nestjs/config';

export default registerAs('database', () => ({
  type: 'postgres',
  host: process.env.DATABASE_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || process.env.DB_PORT || '5432', 10),
  username: process.env.DATABASE_USER || process.env.DB_USERNAME || 'uplora',
  password: process.env.DATABASE_PASSWORD || process.env.DB_PASSWORD || 'uplora_secret',
  name: process.env.DATABASE_NAME || process.env.DB_NAME || 'uplora_db',

  synchronize: process.env.NODE_ENV === 'development',
  migrationsRun: false,
  logging: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],

  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],

  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,

  extra: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000,
  },
}));
