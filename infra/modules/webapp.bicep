// ==============================================================================
// ClinicWorks - Web App (Container Fullstack Platform) Module
// ==============================================================================
param location string
param appServicePlanName string = 'ASP-rgclinicworksdev-9333'
param appServicePlanResourceGroup string = 'rg-clinicworks-dev'
param webAppName string
param dockerImage string = 'clinicworksacr.azurecr.io/clinicworks-api:rituparna'
param appInsightsConnectionString string = ''

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
      appSettings: [
        {
          name: 'WEBSITES_PORT'
          value: '3000'
        }
        {
          name: 'NODE_ENV'
          value: 'production'
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsightsConnectionString
        }
      ]
    }
  }
}

output webAppId string = webApp.id
output appServicePlanId string = appServicePlan.id
output webAppHostName string = webApp.properties.defaultHostName
output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
