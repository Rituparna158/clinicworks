param location string
param appServicePlanName string = 'ASP-rgclinicworksdev-9333'
param appServicePlanResourceGroup string = 'rg-clinicworks-dev'
param webAppName string
param dockerImage string = 'clinicworksacr.azurecr.io/clinicworks-api:rituparna'
param appInsightsConnectionString string = ''
param keyVaultName string = 'kv-clinicworks-dev01'

@secure()
param acrPassword string = ''
param acrUsername string = 'clinicworksacr'
param acrServer string = 'https://clinicworksacr.azurecr.io'

param logicAppWorkflowUrl string = ''

param docIntelEndpoint string = 'https://di-clinicworks-dev-centralindia.cognitiveservices.azure.com/'

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
      appSettings: [
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsightsConnectionString
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
        {
          name: 'GEMINI_API_KEY'
          value: '@Microsoft.KeyVault(VaultName=${keyVaultName};SecretName=GEMINI-API-KEY)'
        }
        {
          name: 'GEMINI_MODEL'
          value: 'gemini-3.5-flash-lite'
        }
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'PORT'
          value: '3000'
        }
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
