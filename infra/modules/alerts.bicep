// ==============================================================================
// ClinicWorks - Alerts & Action Groups Module
// ==============================================================================
param actionGroupName string
param alertEmailAddress string
param targetResourceId string

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

// Metric Alert: App High CPU Alert (CpuTime > 240s)
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

// Metric Alert: Document Processing Failure Surge (Http 5xx >= 3)
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

output actionGroupId string = actionGroup.id
