param location string
param appServicePlanName string
param functionAppName string
param storageAccountName string
param appInsightsConnectionString string = ''
param keyVaultName string = 'kv-clinicworks-dev01'

param logicAppWorkflowUrl string = ''

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
     
      appSettings: [
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsightsConnectionString
        }
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
        {
          name: 'WEBSITE_NODE_DEFAULT_VERSION'
          value: '~20'
        }
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
        {
          name: 'AZURE_STORAGE_CONNECTION_STRING'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=AZURE-STORAGE-CONNECTION-STRING)'
        }
        {
          name: 'AZURE_STORAGE_CONTAINER_NAME'
          value: 'clinical-documents'
        }
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
        {
          name: 'GEMINI_API_KEY'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=GEMINI-API-KEY)'
        }
        {
          name: 'GEMINI_MODEL'
          value: 'gemini-3.8-flash'
        }
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
