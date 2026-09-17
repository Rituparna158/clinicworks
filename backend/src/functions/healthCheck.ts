import type { Request, Response } from 'express';
import { testConnection } from '../database/connection.js';

/**
 * Health check controller for Azure Monitor and uptime checks.
 * Endpoint: GET /api/health
 */
export async function handleHealthCheck(_req: Request, res: Response): Promise<void> {
  const dbHealth = await testConnection();
  const uptimeSeconds = Math.floor(process.uptime());
  const memoryUsage = process.memoryUsage();

  const isHealthy = true; // Service is responding
  const status = isHealthy ? 200 : 503;

  res.status(status).json({
    status: isHealthy ? 'HEALTHY' : 'UNHEALTHY',
    service: 'clinicworks-document-processor',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    database: {
      connected: dbHealth.isHealthy,
      latencyMs: dbHealth.latencyMs,
      error: dbHealth.error ?? null,
    },
    metrics: {
      rssMb: Math.round((memoryUsage.rss / 1024 / 1024) * 100) / 100,
      heapUsedMb: Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMb: Math.round((memoryUsage.heapTotal / 1024 / 1024) * 100) / 100,
    },
  });
}
