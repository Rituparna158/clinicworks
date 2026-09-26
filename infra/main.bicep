// ==============================================================================
// ClinicWorks - Main Orchestrator (Azure Bicep)
// Target Scope: Resource Group
// Environment: dev
// Location: centralindia
// ==============================================================================
targetScope = 'resourceGroup'

@description('Deployment location for all regional resources')
param location string = 'centralindia'

@description('Environment identifier (dev, staging, prod)')
param envName string = 'dev'

// Resource Names
@description('Fullstack Web App name (Linux Container)')
param webAppName string = 'app-clinicworks-dev-centralindia'

@description('App Service Plan for Web App (Linux B1)')
param appServicePlanName string = 'ASP-rgclinicworksdev-9333'

@description('Resource Group containing the App Service Plan')
param appServicePlanResourceGroup string = 'rg-clinicworks-dev'

@description('Docker Image for Web App')
param dockerImage string = 'clinicworksacr.azurecr.io/clinicworks-api:rituparna'

@description('Azure Function App name')
param functionAppName string = 'func-clinicworks-dev-centralindia'

@description('App Service Plan for Function App (Dynamic Y1)')
param functionAppServicePlanName string = 'ASP-rgclinicworksdevcentralindia-8bfa'

@description('Azure Key Vault name')
param keyVaultName string = 'kv-clinicworks-dev01'

@description('Azure Storage Account name')
param storageAccountName string = 'stclinicworksdev01'

@description('PostgreSQL Flexible Server name')
param postgresServerName string = 'psql-clinicworks-dev-centralindia'

@description('Azure Document Intelligence (Cognitive Services) name')
param docIntelName string = 'di-clinicworks-dev-centralindia'

@description('Application Insights component name')
param appInsightsName string = 'func-clinicworks-dev-centralindia'

@description('Action Group name for alerts')
param actionGroupName string = 'ag-clinicworks-ops-alerts'

@description('DevOps / Ops team alert email address')
param alertEmailAddress string = 'rathrituparna642@gmail.com'

// Secrets (Passed securely from CI/CD, NOT stored in parameters.json)
@description('PostgreSQL Administrator Login')
param dbAdminUser string = 'clinicadmin'

@description('PostgreSQL Administrator Password')
@secure()
param dbAdminPassword string = ''

@description('Azure Container Registry password for Web App image pull')
@secure()
param acrPassword string = ''

@description('Azure Container Registry username')
param acrUsername string = 'clinicworksacr'

@description('Azure Container Registry server URL')
param acrServer string = 'https://clinicworksacr.azurecr.io'

@description('Azure Logic App HTTP trigger URL for document pipeline orchestration')
@secure()
param logicAppWorkflowUrl string = ''

@description('Azure Document Intelligence endpoint URL')
param docIntelEndpoint string = 'https://di-clinicworks-dev-centralindia.cognitiveservices.azure.com/'

// ==============================================================================
// 1. Monitoring (Application Insights)
// ==============================================================================
module monitoring 'modules/monitoring.bicep' = {
  name: 'deploy-monitoring-${envName}'
  params: {
    location: location
    appInsightsName: appInsightsName
  }
}

// ==============================================================================
// 2. Key Vault (RBAC Enabled)
// ==============================================================================
module keyvault 'modules/keyvault.bicep' = {
  name: 'deploy-keyvault-${envName}'
  params: {
    location: location
    keyVaultName: keyVaultName
  }
}

// ==============================================================================
// 3. Storage Account & Blob Containers
// ==============================================================================
module storage 'modules/storage.bicep' = {
  name: 'deploy-storage-${envName}'
  params: {
    location: location
    storageAccountName: storageAccountName
  }
}

// ==============================================================================
// 4. PostgreSQL Flexible Server
// ==============================================================================
module postgres 'modules/postgres.bicep' = {
  name: 'deploy-postgres-${envName}'
  params: {
    location: location
    serverName: postgresServerName
    adminUsername: dbAdminUser
    adminPassword: dbAdminPassword
  }
}

// ==============================================================================
// 5. AI Services (Azure AI Document Intelligence)
// ==============================================================================
module ai 'modules/ai.bicep' = {
  name: 'deploy-ai-${envName}'
  params: {
    location: location
    docIntelName: docIntelName
  }
}

// ==============================================================================
// 6. Web App (Fullstack Linux Container)
// ==============================================================================
module webapp 'modules/webapp.bicep' = {
  name: 'deploy-webapp-${envName}'
  params: {
    location: location
    appServicePlanName: appServicePlanName
    appServicePlanResourceGroup: appServicePlanResourceGroup
    webAppName: webAppName
    dockerImage: dockerImage
    appInsightsConnectionString: monitoring.outputs.appInsightsConnectionString
    keyVaultName: keyVaultName
    logicAppWorkflowUrl: logicAppWorkflowUrl
    docIntelEndpoint: docIntelEndpoint
    acrPassword: acrPassword
    acrUsername: acrUsername
    acrServer: acrServer
  }
}

// ==============================================================================
// 7. Azure Functions (Document Processor)
// ==============================================================================
module functionapp 'modules/functionapp.bicep' = {
  name: 'deploy-functionapp-${envName}'
  dependsOn: [
    storage
  ]
  params: {
    location: location
    appServicePlanName: functionAppServicePlanName
    functionAppName: functionAppName
    storageAccountName: storageAccountName
    appInsightsConnectionString: monitoring.outputs.appInsightsConnectionString
    keyVaultName: keyVaultName
    logicAppWorkflowUrl: logicAppWorkflowUrl
    docIntelEndpoint: docIntelEndpoint
  }
}

// ==============================================================================
// 8. Alerts & Action Groups
// ==============================================================================
module alerts 'modules/alerts.bicep' = {
  name: 'deploy-alerts-${envName}'
  params: {
    actionGroupName: actionGroupName
    alertEmailAddress: alertEmailAddress
    targetResourceId: webapp.outputs.webAppId
  }
}

// ==============================================================================
// Outputs
// ==============================================================================
output webAppUrl string = webapp.outputs.webAppUrl
output webAppPrincipalId string = webapp.outputs.webAppPrincipalId
output functionAppUrl string = functionapp.outputs.functionAppUrl
output functionAppPrincipalId string = functionapp.outputs.functionAppPrincipalId
output postgresFqdn string = postgres.outputs.postgresFqdn
output storageBlobEndpoint string = storage.outputs.primaryBlobEndpoint
output docIntelEndpoint string = ai.outputs.docIntelEndpoint
output keyVaultUri string = keyvault.outputs.keyVaultUri
