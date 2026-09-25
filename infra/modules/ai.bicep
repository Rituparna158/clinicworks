// ==============================================================================
// ClinicWorks - AI Services (Document Intelligence / OCR) Module
// ==============================================================================
param location string
param docIntelName string

resource docIntelligence 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: docIntelName
  location: location
  sku: {
    name: 'S0'
  }
  kind: 'FormRecognizer'
  properties: {
    customSubDomainName: docIntelName
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
    }
  }
}

output docIntelId string = docIntelligence.id
output docIntelEndpoint string = docIntelligence.properties.endpoint
