
param actionGroupName string
param alertEmailAddress string
param targetResourceId string
param functionAppResourceId string = ''
param postgresResourceId string = ''
param appInsightsId string = ''
param webAppUrl string = ''
param location string = 'centralindia'

// 1. Operational Action Group (Email Notifications)
resource actionGroup 'microsoft.insights/actionGroups@2023-01-01' = {
  name: actionGroupName
  location: 'Global'
  properties: {
    groupShortName: 'cwalerts'
    enabled: true
    emailReceivers: [
      {
        name: 'OpsTeam_-EmailAction-'
        emailAddress: alertEmailAddress
        useCommonAlertSchema: true
      }
    ]
  }
}

// 2. Web App: CPU Alert (> 80% / 240s in 5-minute window)
resource cpuAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'alert-app-high-cpu'
  location: 'global'
  properties: {
    description: 'Triggers operational email alert when App Service CPU time exceeds 240s in a 5-minute window.'
    severity: 2
    enabled: true
    scopes: [
      targetResourceId
    ]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'Metric1'
          metricName: 'CpuTime'
          metricNamespace: 'Microsoft.Web/sites'
          operator: 'GreaterThan'
          threshold: 240
          timeAggregation: 'Total'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// 3. Web App: Memory Alert (> 1.4 GB / ~80% of B1 1.75 GB RAM)
resource memoryAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'alert-app-high-memory'
  location: 'global'
  properties: {
    description: 'Triggers alert when App Service memory working set exceeds 1.4 GB (~80% of B1 tier).'
    severity: 2
    enabled: true
    scopes: [
      targetResourceId
    ]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'Metric1'
          metricName: 'AverageMemoryWorkingSet'
          metricNamespace: 'Microsoft.Web/sites'
          operator: 'GreaterThan'
          threshold: 1400000000
          timeAggregation: 'Average'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// 4. Web App: HTTP 5xx Server Error Surge (>= 3 errors)
resource failureSurgeAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = {
  name: 'alert-document-failure-surge'
  location: 'global'
  properties: {
    description: 'Triggers operational email alert when HTTP 5xx server errors reach 3 or more.'
    severity: 1
    enabled: true
    scopes: [
      targetResourceId
    ]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'Metric1'
          metricName: 'Http5xx'
          metricNamespace: 'Microsoft.Web/sites'
          operator: 'GreaterThanOrEqual'
          threshold: 3
          timeAggregation: 'Total'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// 5. Function App: Execution / HTTP 5xx Failures
resource funcFailureAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = if (!empty(functionAppResourceId)) {
  name: 'alert-func-execution-failures'
  location: 'global'
  properties: {
    description: 'Triggers alert when Azure Function throws 5xx errors or runtime crashes.'
    severity: 1
    enabled: true
    scopes: [
      functionAppResourceId
    ]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'Metric1'
          metricName: 'Http5xx'
          metricNamespace: 'Microsoft.Web/sites'
          operator: 'GreaterThanOrEqual'
          threshold: 1
          timeAggregation: 'Total'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// 6. PostgreSQL: Failed Connections Alert
resource postgresFailedConnAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = if (!empty(postgresResourceId)) {
  name: 'alert-postgres-failed-connections'
  location: 'global'
  properties: {
    description: 'Triggers alert when PostgreSQL Flexible Server encounters failed connection attempts.'
    severity: 1
    enabled: true
    scopes: [
      postgresResourceId
    ]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'Metric1'
          metricName: 'connections_failed'
          metricNamespace: 'Microsoft.DBforPostgreSQL/flexibleServers'
          operator: 'GreaterThanOrEqual'
          threshold: 3
          timeAggregation: 'Total'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// 7. Application Insights: Unhandled Exceptions Spike
resource exceptionsAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = if (!empty(appInsightsId)) {
  name: 'alert-appinsights-exceptions'
  location: 'global'
  properties: {
    description: 'Triggers alert when unhandled application exceptions exceed threshold.'
    severity: 2
    enabled: true
    scopes: [
      appInsightsId
    ]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.SingleResourceMultipleMetricCriteria'
      allOf: [
        {
          name: 'Metric1'
          metricName: 'exceptions/count'
          metricNamespace: 'Microsoft.Insights/components'
          operator: 'GreaterThanOrEqual'
          threshold: 5
          timeAggregation: 'Count'
          criterionType: 'StaticThresholdCriterion'
        }
      ]
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

// 8. Multi-region Availability Web Test for /api/health
resource healthWebTest 'Microsoft.Insights/webtests@2022-06-15' = if (!empty(appInsightsId) && !empty(webAppUrl)) {
  name: 'webtest-clinicworks-health'
  location: location
  tags: {
    'hidden-link:${appInsightsId}': 'Resource'
  }
  properties: {
    SyntheticMonitorId: 'webtest-clinicworks-health'
    Name: 'ClinicWorks /api/health Availability Ping'
    Description: 'Pings /api/health endpoint every 5 minutes from multiple geographic locations'
    Enabled: true
    Frequency: 300
    Timeout: 30
    Kind: 'ping'
    RetryEnabled: true
    Locations: [
      {
        Id: 'apac-hk-hkn-azr' // East Asia (Hong Kong)
      }
      {
        Id: 'emea-nl-ams-azr' // West Europe (Amsterdam)
      }
      {
        Id: 'us-va-ash-azr'   // East US (Virginia)
      }
    ]
    Configuration: {
      WebTest: '<WebTest Name="ClinicWorks Health Check" Enabled="True" Timeout="30" Frequency="300" xmlns="http://microsoft.com/schemas/VisualStudio/TeamTest/2010"><Items><Request Method="GET" Guid="a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d" Version="1.1" Url="${webAppUrl}/api/health" /></Items></WebTest>'
    }
  }
}

// 9. Alert when /api/health fails from 2 or more locations
resource availabilityAlert 'Microsoft.Insights/metricAlerts@2018-03-01' = if (!empty(appInsightsId) && !empty(webAppUrl)) {
  name: 'alert-availability-health-check'
  location: 'global'
  properties: {
    description: 'Triggers Severity 0 alert when /api/health endpoint fails from 2 or more geographic locations.'
    severity: 0
    enabled: true
    scopes: [
      appInsightsId
      healthWebTest.id
    ]
    evaluationFrequency: 'PT1M'
    windowSize: 'PT5M'
    criteria: {
      'odata.type': 'Microsoft.Azure.Monitor.WebtestLocationAvailabilityCriteria'
      webTestId: healthWebTest.id
      componentId: appInsightsId
      failedLocationCount: 2
    }
    actions: [
      {
        actionGroupId: actionGroup.id
      }
    ]
  }
}

output actionGroupId string = actionGroup.id
