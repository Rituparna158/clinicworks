import { useAzureMonitor } from '@azure/monitor-opentelemetry';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, '../..');
dotenv.config({ path: path.join(workspaceRoot, '.env') });
dotenv.config();

/* Azure Application Insights OpenTelemetry Telemetry Initializer. Automatically instruments incoming HTTP requests, external dependencies, database queries, and forwards console.log/error to Azure Monitor.*/
export function initTelemetry(): void {
  const connectionString = process.env['APPLICATIONINSIGHTS_CONNECTION_STRING'];

  if (!connectionString) {
    console.log('[AppInsights] APPLICATIONINSIGHTS_CONNECTION_STRING not set — in-app telemetry disabled (local dev mode)');
    return;
  }

  try {
    useAzureMonitor({
      azureMonitorExporterOptions: {
        connectionString,
      },
      instrumentationOptions: {
        console: { enabled: true },
        http: { enabled: true },
      },
    });

    console.log('[AppInsights] Telemetry enabled — streaming to Azure Application Insights via OpenTelemetry');
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[AppInsights] Failed to initialize Application Insights telemetry:', errorMsg);
  }
}

// Auto-initialize when imported at the top of server entry point
initTelemetry();
