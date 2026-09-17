import dotenv from 'dotenv';
import pg from 'pg';
import type { DatabaseConfig } from '../types/database.types.js';

dotenv.config();

const { Pool } = pg;

export function getDatabaseConfig(): DatabaseConfig {
  return {
    host: process.env['DB_HOST'] ?? 'localhost',
    port: Number(process.env['DB_PORT'] ?? 5432),
    database: process.env['DB_NAME'] ?? 'clinicworks',
    user: process.env['DB_USER'] ?? 'postgres',
    password: process.env['DB_PASSWORD'] ?? 'postgres',
    ssl: process.env['DB_SSL'] === 'true',
    maxConnections: 10,
  };
}

let pool: pg.Pool | null = null;
let isConnected = false;

export function getPool(): pg.Pool {
  if (!pool) {
    const config = getDatabaseConfig();
    pool = new Pool({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: config.maxConnections ?? 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 3000, // Quick timeout so fallback can engage if DB is offline
    });

    pool.on('error', (err: Error) => {
      console.warn('[Database] Unexpected connection pool error:', err.message);
      isConnected = false;
    });
  }
  return pool;
}

export async function testConnection(): Promise<{ isHealthy: boolean; latencyMs: number; error?: string }> {
  const currentPool = getPool();
  const startTime = Date.now();
  try {
    const client = await currentPool.connect();
    try {
      await client.query('SELECT 1');
      isConnected = true;
      return { isHealthy: true, latencyMs: Date.now() - startTime };
    } finally {
      client.release();
    }
  } catch (err: unknown) {
    isConnected = false;
    const message = err instanceof Error ? err.message : String(err);
    return { isHealthy: false, latencyMs: Date.now() - startTime, error: message };
  }
}

export function isDbConnected(): boolean {
  return isConnected;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    isConnected = false;
  }
}
