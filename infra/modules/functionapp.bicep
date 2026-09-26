// ==============================================================================
// ClinicWorks - Azure Function App Module
// All appSettings declared explicitly so Bicep deployments never wipe
// Key Vault-referenced settings or Node runtime configuration.
// ==============================================================================
param location string
param appServicePlanName string
param functionAppName string
param storageAccountName string
param appInsightsConnectionString string = ''
param keyVaultName string = 'kv-clinicworks-dev01'

// Logic App orchestrator URL (passed from CI/CD or parameters file)
param logicAppWorkflowUrl string = ''

// Document Intelligence endpoint
param docIntelEndpoint string = 'https://di-clinicworks-dev-centralindia.cognitiveservices.azure.com/'

resource appServicePlanFunc 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
    size: 'Y1'
    family: 'Y'
    capacity: 0
  }
  properties: {
    reserved: false
  }
}

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlanFunc.id
    httpsOnly: true
    siteConfig: {
      // -----------------------------------------------------------------------
      // IMPORTANT: This array is a FULL REPLACEMENT in ARM/Bicep.
      // ALL required settings must be declared here. Never remove a setting
      // unless it is intentionally decommissioned.
      // -----------------------------------------------------------------------
      appSettings: [
        // --- Application Insights ---
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsightsConnectionString
        }
        // --- Azure Function Runtime (Required) ---
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};EndpointSuffix=${environment().suffixes.storage};AccountKey=${storageAccount.listKeys().keys[0].value}'
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'node'
        }
        // --- Node.js Version (CRITICAL: must be ~20 for ES Modules + @azure/functions v4) ---
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
        // --- Azure Document Intelligence ---
        {
          name: 'AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT'
          value: docIntelEndpoint
        }
        {
          name: 'AZURE_DOCUMENT_INTELLIGENCE_KEY'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=AZURE-DOCUMENT-INTELLIGENCE-KEY)'
        }
        {
          name: 'AZURE_LOGIC_APP_WORKFLOW_URL'
          value: logicAppWorkflowUrl
        }
        // --- Azure Blob Storage ---
        {
          name: 'AZURE_STORAGE_CONNECTION_STRING'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=AZURE-STORAGE-CONNECTION-STRING)'
        }
        {
          name: 'AZURE_STORAGE_CONTAINER_NAME'
          value: 'clinical-documents'
        }
        // --- PostgreSQL Database ---
        {
          name: 'DB_HOST'
          value: 'psql-clinicworks-dev-centralindia.postgres.database.azure.com'
        }
        {
          name: 'DB_NAME'
          value: 'clinicworks'
        }
        {
          name: 'DB_PASSWORD'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=DB-PASSWORD)'
        }
        {
          name: 'DB_PORT'
          value: '5432'
        }
        {
          name: 'DB_SSL'
          value: 'true'
        }
        {
          name: 'DB_USER'
          value: 'clinicadmin'
        }
        // --- Google Gemini AI ---
        {
          name: 'GEMINI_API_KEY'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=GEMINI-API-KEY)'
        }
        {
          name: 'GEMINI_MODEL'
          value: 'gemini-3.5-flash-lite'
        }
        // --- Node / Runtime ---
        {
          name: 'NODE_ENV'
          value: 'production'
        }
      ]
    }
  }
}

output functionAppId string = functionApp.id
output functionAppPrincipalId string = functionApp.identity.principalId
output functionAppHostName string = functionApp.properties.defaultHostName
output functionAppUrl string = 'https://${functionApp.properties.defaultHostName}'
