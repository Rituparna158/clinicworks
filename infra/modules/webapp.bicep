// ==============================================================================
// ClinicWorks - Web App (Container Fullstack Platform) Module
// All 22 appSettings declared explicitly so Bicep deployments never wipe
// manually-configured or Key Vault-referenced settings.
// ==============================================================================
param location string
param appServicePlanName string = 'ASP-rgclinicworksdev-9333'
param appServicePlanResourceGroup string = 'rg-clinicworks-dev'
param webAppName string
param dockerImage string = 'clinicworksacr.azurecr.io/clinicworks-api:rituparna'
param appInsightsConnectionString string = ''
param keyVaultName string = 'kv-clinicworks-dev01'

// ACR credentials (passed from CI/CD secrets - never hardcoded)
@secure()
param acrPassword string = ''
param acrUsername string = 'clinicworksacr'
param acrServer string = 'https://clinicworksacr.azurecr.io'

// Logic App orchestrator URL (passed from CI/CD or parameters file)
param logicAppWorkflowUrl string = ''

// Document Intelligence endpoint
param docIntelEndpoint string = 'https://di-clinicworks-dev-centralindia.cognitiveservices.azure.com/'

// Reference the existing App Service Plan in rg-clinicworks-dev
resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' existing = {
  name: appServicePlanName
  scope: resourceGroup(appServicePlanResourceGroup)
}

resource webApp 'Microsoft.Web/sites@2023-12-01' = {
  name: webAppName
  location: location
  kind: 'app,linux,container'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOCKER|${dockerImage}'
      alwaysOn: false
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
        // --- Azure Document Intelligence ---
        {
          name: 'AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT'
          value: docIntelEndpoint
        }
        {
          name: 'AZURE_DOCUMENT_INTELLIGENCE_KEY'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=AZURE-DOCUMENT-INTELLIGENCE-KEY)'
        }
        // --- Azure Logic App Orchestrator ---
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
        // --- Docker / ACR Credentials ---
        {
          name: 'DOCKER_REGISTRY_SERVER_PASSWORD'
          value: acrPassword
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_URL'
          value: acrServer
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_USERNAME'
          value: acrUsername
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
        {
          name: 'PORT'
          value: '3000'
        }
        // --- App Service Container Settings ---
        {
          name: 'WEBSITE_HEALTHCHECK_MAXPINGFAILURES'
          value: '10'
        }
        {
          name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE'
          value: 'false'
        }
        {
          name: 'WEBSITES_PORT'
          value: '3000'
        }
      ]
    }
  }
}

output webAppId string = webApp.id
output webAppPrincipalId string = webApp.identity.principalId
output appServicePlanId string = appServicePlan.id
output webAppHostName string = webApp.properties.defaultHostName
output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
