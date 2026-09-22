export interface DocumentAlertPayload {
  documentId: string;
  fileName?: string;
  status: 'Needs Review' | 'Failed' | string;
  errorMessage?: string | null;
  documentType?: string | null;
  measure?: string | null;
  confidenceScore?: number | null;
}

/**
 * Service for dispatching clinical alerts and recording telemetry in Azure Application Insights.
 * Used when a clinical document fails processing or requires physician review.
 */
export async function sendDocumentAlertNotification(payload: DocumentAlertPayload): Promise<void> {
  const timestamp = new Date().toISOString();
  
  // Format clinical alert message
  const alertSummary = `[CLINICAL ALERT ${payload.status.toUpperCase()}] Document: ${payload.documentId} (${payload.fileName ?? 'Unknown File'}) - ${payload.errorMessage ?? payload.measure ?? 'Requires review'}`;
  
  // Log structured diagnostic telemetry for Azure Application Insights & Azure Monitor Alert Rules
  if (payload.status === 'Failed') {
    console.error(`[NotificationService] ${timestamp} ${alertSummary}`, {
      event: 'DocumentProcessingFailed',
      documentId: payload.documentId,
      fileName: payload.fileName,
      error: payload.errorMessage,
    });
  } else {
    console.warn(`[NotificationService] ${timestamp} ${alertSummary}`, {
      event: 'DocumentNeedsReview',
      documentId: payload.documentId,
      fileName: payload.fileName,
      measure: payload.measure,
      confidenceScore: payload.confidenceScore,
    });
  }

  // Ready for webhook / email notification if LOGIC_APP_ALERT_WEBHOOK_URL is configured
  const webhookUrl = process.env['LOGIC_APP_ALERT_WEBHOOK_URL'];
  if (webhookUrl) {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          timestamp,
          source: 'ClinicWorks-FunctionApp',
        }),
      });
    } catch (notifErr) {
      console.warn('[NotificationService] Webhook alert notification skipped or non-fatal:', notifErr);
    }
  }
}
