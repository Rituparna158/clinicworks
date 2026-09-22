/**
 * Azure Logic Apps Workflow Orchestration Service.
 * Dispatches clinical document processing jobs to the Logic App workflow orchestrator
 * for automated retry handling, quality evaluation, and failure alerts.
 */

export interface LogicAppTriggerPayload {
  documentId: string;
  fileName: string;
  blobName: string;
}

export interface LogicAppExecutionResult {
  success: boolean;
  statusCode?: number;
  data?: unknown;
  error?: string;
}

export async function triggerLogicAppOrchestrator(
  payload: LogicAppTriggerPayload
): Promise<LogicAppExecutionResult> {
  const workflowUrl = process.env['AZURE_LOGIC_APP_WORKFLOW_URL'];

  if (!workflowUrl) {
    console.warn('[LogicAppService] AZURE_LOGIC_APP_WORKFLOW_URL is not configured. Skipping Logic App trigger.');
    return { success: false, error: 'Logic App URL not configured' };
  }

  try {
    console.log(`[LogicAppService] Triggering Logic App for document ${payload.documentId} (${payload.fileName})...`);

    const response = await fetch(workflowUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let parsedData: unknown = null;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      parsedData = responseText;
    }

    console.log(`[LogicAppService] Logic App response status: ${response.status}`);

    return {
      success: response.ok,
      statusCode: response.status,
      data: parsedData,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[LogicAppService] Failed to trigger Logic App for ${payload.documentId}:`, errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
