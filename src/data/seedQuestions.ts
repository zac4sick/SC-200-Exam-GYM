import { Question, ImportReviewItem } from '../types';
import { VISUAL_WALKTHROUGHS } from './visualDiagramsData';

export const SEED_QUESTIONS: Question[] = [
  {
    id: 'q-imp-1',
    fingerprint: 'imp-p1-q1-alertinfo-assignedto-kql',
    source: 'Imported',
    type: 'kql_completion',
    domainId: 3,
    topicId: 'd3-t1',
    subtopic: 'Write and optimize KQL queries (where, extend, project, summarize)',
    difficulty: 'Intermediate',
    stem: 'You are investigating unassigned alerts in Microsoft Defender XDR Advanced Hunting. Complete the KQL query below so that it filters for alerts that do not have an assigned analyst and summarizes the total number of alerts by severity.',
    scenarioContext:
      'Extracted from sc-200-questions-answers-only.pdf (Page 1, Question 1). In the source PDF, the KQL completion dropdowns were embedded inside a screenshot image.',
    interactiveSlots: [
      {
        id: 'slot-1',
        label: 'Filter for unassigned alerts',
        codePrefix: 'AlertInfo\n| where ',
        codeSuffix: '(AssignedTo)',
        choices: ['isempty', 'isnotempty', 'isnotnull', 'has_any'],
        correctChoice: 'isempty',
        originalPdfChoice: 'isempty',
      },
      {
        id: 'slot-2',
        label: 'Aggregate alert count by severity',
        codePrefix: '| ',
        codeSuffix: ' AlertCount = count() by Severity',
        choices: ['summarize', 'project', 'extend', 'mv-expand'],
        correctChoice: 'summarize',
        originalPdfChoice: 'summarize',
      },
    ],
    originalAnswerKey: { 'slot-1': 'isempty', 'slot-2': 'summarize' },
    verifiedAnswerKey: { 'slot-1': 'isempty', 'slot-2': 'summarize' },
    extractionAudit: {
      confidence: 'high',
      sourceFileName: 'sc-200-questions-answers-only.pdf',
      sourcePage: 1,
      originalQuestionNumber: '1',
      originalAnswerKey: { 'slot-1': 'isempty', 'slot-2': 'summarize' },
      missingOrAmbiguousFields: [],
      isUsable: true,
      adaptationNote: 'Reconstructed from embedded KQL screenshot on page 1 into interactive KQL dropdown slots.',
      extractedAt: '2026-10-26T20:00:00Z',
    },
    verificationAudit: {
      status: 'verified',
      verifiedAnswerKey: { 'slot-1': 'isempty', 'slot-2': 'summarize' },
      agreesWithOriginal: true,
      documentedBehavior:
        'In Microsoft Defender XDR Advanced Hunting, string columns such as AssignedTo in AlertEvidence/AlertInfo should be checked for empty or null values using isempty(), and aggregations across groups use the summarize operator.',
      verifiedDate: '2026-10-26',
      officialReferences: [
        {
          title: 'isempty() function - Kusto Query Language',
          url: 'https://learn.microsoft.com/en-us/kusto/query/isemptyfunction',
          documentedFeature: 'Returns true if the argument is an empty string or is null.',
          lastUpdated: '2026-08-14',
        },
        {
          title: 'AlertInfo table in the advanced hunting schema',
          url: 'https://learn.microsoft.com/en-us/defender-xdr/advanced-hunting-alertinfo-table',
          documentedFeature: 'Contains alert metadata from Microsoft Defender XDR services, including Severity, Title, and ServiceSource.',
          lastUpdated: '2026-09-10',
        },
      ],
    },
    explanation: {
      whyCorrect:
        '`isempty(AssignedTo)` returns true both when a string column is null and when it contains an empty string `""`, making it the best-practice KQL function for identifying unassigned alerts. The `summarize` operator groups rows by `Severity` and calculates `count()` for each severity tier.',
      whyOthersIncorrect: {
        isnotempty: 'Filters for alerts that already have an analyst assigned, which is the opposite of the requirement.',
        isnotnull: 'Also returns true for non-null strings and does not catch empty string `""` values.',
        project: 'Selects or renames columns row-by-row without performing any group aggregation.',
        extend: 'Adds a calculated column to each row rather than aggregating rows by Severity.',
      },
      examTip:
        'For string columns in KQL, always prefer `isempty()` over `isnull()` because exported or ingested string fields frequently contain `""` (empty string) rather than a database NULL.',
    },
    kqlLearning: {
      tableSchemas: [
        {
          tableName: 'AlertInfo',
          platform: 'Microsoft Defender XDR',
          description: 'Alerts from Microsoft Defender for Endpoint, Office 365, Identity, Cloud Apps, and Sentinel.',
          columns: [
            { name: 'Timestamp', type: 'datetime', description: 'Date and time the alert was generated' },
            { name: 'AlertId', type: 'string', description: 'Unique identifier for the alert' },
            { name: 'Title', type: 'string', description: 'Title of the alert' },
            { name: 'Severity', type: 'string', description: 'Informational, Low, Medium, or High' },
            { name: 'ServiceSource', type: 'string', description: 'Workload that generated the alert' },
            { name: 'AssignedTo', type: 'string', description: 'UPN or name of assigned analyst (if assigned)' },
          ],
        },
      ],
      completeQuery: `AlertInfo\n| where Timestamp > ago(7d)\n| where isempty(AssignedTo)\n| summarize AlertCount = count() by Severity\n| sort by AlertCount desc`,
      operatorBreakdown: [
        {
          lineNumber: 1,
          codeFragment: 'AlertInfo',
          operator: 'Table Reference',
          explanation: 'Selects the AlertInfo table in Defender XDR Advanced Hunting.',
        },
        {
          lineNumber: 2,
          codeFragment: '| where Timestamp > ago(7d)',
          operator: 'where + ago()',
          explanation: 'Filters early by time window to optimize query performance across partitions.',
        },
        {
          lineNumber: 3,
          codeFragment: '| where isempty(AssignedTo)',
          operator: 'isempty()',
          explanation: 'Retains only rows where AssignedTo is either null or an empty string.',
        },
        {
          lineNumber: 4,
          codeFragment: '| summarize AlertCount = count() by Severity',
          operator: 'summarize count() by',
          explanation: 'Aggregates matching unassigned alerts into a count per Severity level.',
        },
      ],
      simulatedOutput: {
        isSimulated: true,
        executionNote: 'Simulated Output — Not executed against a live Microsoft Defender XDR tenant.',
        columns: ['Severity', 'AlertCount'],
        rows: [
          ['Medium', '42'],
          ['Low', '19'],
          ['High', '7'],
          ['Informational', '5'],
        ],
      },
      commonMistakes: [
        'Using `AssignedTo == null` (invalid in KQL; equality checks against null fail—always use `isnull()` or `isempty()`).',
        'Using `extend` instead of `summarize` when asked to produce one summary row per group.',
      ],
    },
    visualWalkthrough: VISUAL_WALKTHROUGHS[0],
  },
  {
    id: 'q-imp-2',
    fingerprint: 'imp-p2-q2-defender-cloud-autoprovisioning-agent',
    source: 'Imported',
    type: 'single_choice',
    domainId: 1,
    topicId: 'd1-t4',
    subtopic: 'Configure Microsoft Defender for Cloud plans, auto-provisioning, and workflow automation',
    difficulty: 'Intermediate',
    stem: 'You have an Azure subscription with Microsoft Defender for Cloud (formerly Azure Defender) enabled for Servers. You review the Defender for Cloud pricing & settings blade and notice that security telemetry from new virtual machines is not being collected automatically because agent auto-provisioning is turned off. What should you do to ensure security telemetry and OS logs are collected automatically from Azure VMs?',
    scenarioContext:
      'Extracted from sc-200-questions-answers-only.pdf (Page 2, Question 2). Note product evolution: Azure Security Center / Azure Defender is now Microsoft Defender for Cloud, and the legacy Log Analytics agent (MMA) was retired in August 2024 in favor of Defender for Servers Direct Onboarding and Azure Monitor Agent (AMA).',
    options: [
      {
        id: 'A',
        label: 'A',
        text: 'Enable auto-provisioning for the Vulnerability assessment for machines extension only.',
      },
      {
        id: 'B',
        label: 'B',
        text: 'Enable auto-provisioning for the Log Analytics agent / Azure Monitor Agent (AMA) and Defender for Endpoint integration in Environment Settings.',
      },
      {
        id: 'C',
        label: 'C',
        text: 'Assign the Security Reader RBAC role to the virtual machine system-assigned managed identities.',
      },
      {
        id: 'D',
        label: 'D',
        text: 'Configure an Azure Policy definition in AuditIfNotExists mode without remediation.',
      },
    ],
    originalAnswerKey: 'B',
    verifiedAnswerKey: 'B',
    extractionAudit: {
      confidence: 'high',
      sourceFileName: 'sc-200-questions-answers-only.pdf',
      sourcePage: 2,
      originalQuestionNumber: '2',
      originalAnswerKey: 'B',
      missingOrAmbiguousFields: [],
      isUsable: true,
      extractedAt: '2026-10-26T20:00:00Z',
    },
    verificationAudit: {
      status: 'disputed',
      verifiedAnswerKey: 'B',
      agreesWithOriginal: true,
      documentedBehavior:
        'While Option B is the intended answer in the PDF, the underlying architecture changed significantly: Microsoft retired the Log Analytics agent (MMA) on August 31, 2024. Microsoft Defender for Servers now uses direct agentless/MDE onboarding by default, and custom OS event collection uses the Azure Monitor Agent (AMA) with Data Collection Rules (DCRs).',
      disagreementExplanation:
        'The original PDF question references the retired "Log Analytics agent for Azure VMs" toggle in Azure Security Center. On the current SC-200 exam, know that Defender for Cloud uses Defender for Endpoint native integration + Azure Monitor Agent (AMA) with Data Collection Rules (DCRs).',
      knownAmbiguitiesOrAssumptions:
        'Legacy exam questions may still mention "Log Analytics agent" in older question banks, whereas live exam items reference Azure Monitor Agent (AMA) and Defender for Servers plans.',
      verifiedDate: '2026-10-26',
      officialReferences: [
        {
          title: 'Enable enhanced security features in Microsoft Defender for Cloud',
          url: 'https://learn.microsoft.com/en-us/azure/defender-for-cloud/enable-enhanced-security',
          documentedFeature: 'Configures Defender plans and auto-provisioning extensions in Environment settings.',
          lastUpdated: '2026-07-22',
        },
        {
          title: 'Migrate from Log Analytics agent to Azure Monitor Agent in Defender for Cloud',
          url: 'https://learn.microsoft.com/en-us/azure/defender-for-cloud/Auto-provisioning-AMA',
          documentedFeature: 'Explains the retirement of MMA and current agentless/MDE + AMA onboarding model.',
          lastUpdated: '2026-06-15',
        },
      ],
    },
    explanation: {
      whyCorrect:
        'In Microsoft Defender for Cloud (Environment Settings → Subscription → Settings & monitoring), enabling monitoring/agent auto-provisioning ensures that newly provisioned VMs automatically receive the required monitoring extensions (MDE unified sensor and/or Azure Monitor Agent).',
      whyOthersIncorrect: {
        A: 'Vulnerability assessment extensions scan for CVEs but do not stream OS security event telemetry.',
        C: 'Security Reader on a VM identity does not install or configure telemetry collection agents.',
        D: 'AuditIfNotExists only reports non-compliance without deploying any extensions.',
      },
      examTip:
        'Remember that Azure Security Center + Azure Defender = Microsoft Defender for Cloud, and the legacy MMA agent is replaced by AMA + Data Collection Rules (DCRs).',
    },
  },
  {
    id: 'q-imp-3',
    fingerprint: 'imp-p2-q3-sentinel-contributor-rbac-role',
    source: 'Imported',
    type: 'single_choice',
    domainId: 1,
    topicId: 'd1-t2',
    subtopic: 'Configure Microsoft Sentinel roles and permissions (Reader, Responder, Contributor, Playbook Operator)',
    difficulty: 'Easy',
    stem: 'You are configuring role-based access control (RBAC) for a new Tier-2 security engineer in Microsoft Sentinel. The engineer must be able to view data, investigate and dismiss incidents, and create and edit analytics rules, workbooks, and hunting queries. They must NOT be able to delete the Log Analytics workspace or assign roles to other users. Following the principle of least privilege, which built-in role should you assign?',
    scenarioContext:
      'Extracted from sc-200-questions-answers-only.pdf (Page 2–3, Question 3).',
    options: [
      {
        id: 'A',
        label: 'A',
        text: 'Microsoft Sentinel Responder',
      },
      {
        id: 'B',
        label: 'B',
        text: 'Microsoft Sentinel Contributor',
      },
      {
        id: 'C',
        label: 'C',
        text: 'Microsoft Sentinel Reader',
      },
      {
        id: 'D',
        label: 'D',
        text: 'Security Administrator in Microsoft Entra ID',
      },
    ],
    originalAnswerKey: 'B',
    verifiedAnswerKey: 'B',
    extractionAudit: {
      confidence: 'high',
      sourceFileName: 'sc-200-questions-answers-only.pdf',
      sourcePage: 3,
      originalQuestionNumber: '3',
      originalAnswerKey: 'B',
      missingOrAmbiguousFields: [],
      isUsable: true,
      extractedAt: '2026-10-26T20:00:00Z',
    },
    verificationAudit: {
      status: 'verified',
      verifiedAnswerKey: 'B',
      agreesWithOriginal: true,
      documentedBehavior:
        'Microsoft Sentinel Contributor can view data, manage incidents, and create/edit workbooks, analytics rules, and hunting queries. Microsoft Sentinel Responder can only view data and manage incidents (assign, dismiss) but cannot create or edit analytics rules.',
      verifiedDate: '2026-10-26',
      officialReferences: [
        {
          title: 'Roles and permissions in Microsoft Sentinel',
          url: 'https://learn.microsoft.com/en-us/azure/sentinel/roles',
          documentedFeature: 'Compares Microsoft Sentinel Reader, Responder, Contributor, and Playbook Operator capabilities.',
          lastUpdated: '2026-09-01',
        },
      ],
    },
    explanation: {
      whyCorrect:
        '**Microsoft Sentinel Contributor** grants all capabilities of Responder (viewing logs, managing/assigning/closing incidents) plus the ability to create and edit analytics rules, workbooks, hunting queries, and data connectors without granting subscription Owner or User Access Administrator rights.',
      whyOthersIncorrect: {
        A: 'Microsoft Sentinel Responder allows managing incidents (assigning, changing status/severity) and viewing data, but CANNOT create or edit analytics rules or workbooks.',
        C: 'Microsoft Sentinel Reader provides read-only access to incidents, logs, and workbooks.',
        D: 'Security Administrator is a Microsoft Entra directory role, whereas Microsoft Sentinel uses Azure RBAC on the Log Analytics workspace resource group.',
      },
      examTip:
        'Memorize the 3-tier Sentinel RBAC ladder: **Reader** (view only) → **Responder** (manage incidents/run playbooks) → **Contributor** (create/edit analytics rules & workbooks). Note: Creating Logic App playbooks themselves also requires **Logic App Contributor**!',
    },
    visualWalkthrough: VISUAL_WALKTHROUGHS[1],
  },
  {
    id: 'q-imp-6',
    fingerprint: 'imp-p4-q6-signinlogs-mvexpand-conditionalaccess',
    source: 'Imported',
    type: 'kql_completion',
    domainId: 3,
    topicId: 'd3-t1',
    subtopic: 'Write and optimize KQL queries (where, extend, project, summarize, arg_max, mv-expand, join kinds)',
    difficulty: 'Difficult',
    stem: 'You need to write a KQL query in Microsoft Sentinel against the SigninLogs table to analyze how many sign-in events triggered each Conditional Access policy over the past 7 days. The ConditionalAccessPolicies column stores a dynamic JSON array of policy objects. Complete the KQL query.',
    scenarioContext:
      'Extracted from sc-200-questions-answers-only.pdf (Page 4–5, Question 6).',
    interactiveSlots: [
      {
        id: 'slot-1',
        label: 'Expand the dynamic JSON array of Conditional Access policies into individual rows',
        codePrefix: 'SigninLogs\n| where TimeGenerated > ago(7d)\n| ',
        codeSuffix: ' ConditionalAccessPolicies',
        choices: ['mv-expand', 'parse-json', 'evaluate bag_unpack', 'project-reorder'],
        correctChoice: 'mv-expand',
        originalPdfChoice: 'mv-expand',
      },
      {
        id: 'slot-2',
        label: 'Count sign-ins grouped by policy displayName',
        codePrefix: '| ',
        codeSuffix: ' SigninCount = count() by tostring(ConditionalAccessPolicies.displayName)',
        choices: ['summarize', 'extend', 'top-nested', 'make-series'],
        correctChoice: 'summarize',
        originalPdfChoice: 'summarize',
      },
    ],
    originalAnswerKey: { 'slot-1': 'mv-expand', 'slot-2': 'summarize' },
    verifiedAnswerKey: { 'slot-1': 'mv-expand', 'slot-2': 'summarize' },
    extractionAudit: {
      confidence: 'high',
      sourceFileName: 'sc-200-questions-answers-only.pdf',
      sourcePage: 4,
      originalQuestionNumber: '6',
      originalAnswerKey: { 'slot-1': 'mv-expand', 'slot-2': 'summarize' },
      missingOrAmbiguousFields: [],
      isUsable: true,
      extractedAt: '2026-10-26T20:00:00Z',
    },
    verificationAudit: {
      status: 'verified',
      verifiedAnswerKey: { 'slot-1': 'mv-expand', 'slot-2': 'summarize' },
      agreesWithOriginal: true,
      documentedBehavior:
        'In SigninLogs, ConditionalAccessPolicies is a dynamic array (or string requiring todynamic/parse_json in some workspaces) where each element represents one evaluated policy. mv-expand flattens the multi-value dynamic array into one row per policy object so properties like ConditionalAccessPolicies.displayName can be grouped with summarize.',
      verifiedDate: '2026-10-26',
      officialReferences: [
        {
          title: 'mv-expand operator - Kusto Query Language',
          url: 'https://learn.microsoft.com/en-us/kusto/query/mv-expandoperator',
          documentedFeature: 'Expands multi-value dynamic arrays or property bags into multiple records.',
          lastUpdated: '2026-08-01',
        },
      ],
    },
    explanation: {
      whyCorrect:
        'A single sign-in event can evaluate multiple Conditional Access policies, stored as a JSON array inside `ConditionalAccessPolicies`. `mv-expand` unnests that array into separate rows—one per policy—allowing `summarize count() by tostring(ConditionalAccessPolicies.displayName)` to count each policy accurately.',
      whyOthersIncorrect: {
        'parse-json': 'Converts a JSON string into a dynamic object, but does not flatten an array of multiple elements into separate rows.',
        'evaluate bag_unpack': 'Unpacks top-level keys of a JSON property bag into columns, but does not expand an array of objects into rows.',
        extend: 'Adds a column to every row instead of aggregating counts by policy name.',
      },
      examTip:
        'Whenever you see a dynamic array column (`ConditionalAccessPolicies`, `AdditionalFields`, `AuthenticationDetails`, `todynamic()`) and need to filter or group by properties inside array elements, think `mv-expand` first!',
    },
    kqlLearning: {
      tableSchemas: [
        {
          tableName: 'SigninLogs',
          platform: 'Microsoft Sentinel',
          description: 'Microsoft Entra ID interactive user sign-in logs ingested into Log Analytics / Sentinel.',
          columns: [
            { name: 'TimeGenerated', type: 'datetime', description: 'Timestamp of the sign-in event' },
            { name: 'UserPrincipalName', type: 'string', description: 'UPN of the signing-in user' },
            { name: 'IPAddress', type: 'string', description: 'Client IP address' },
            { name: 'ResultType', type: 'string', description: '0 for success, or Entra error code' },
            { name: 'ConditionalAccessStatus', type: 'string', description: 'success, failure, or notApplied' },
            { name: 'ConditionalAccessPolicies', type: 'dynamic', description: 'JSON array of CA policies evaluated during sign-in' },
          ],
        },
      ],
      completeQuery: `SigninLogs\n| where TimeGenerated > ago(7d)\n| mv-expand ConditionalAccessPolicies\n| extend PolicyName = tostring(ConditionalAccessPolicies.displayName), PolicyResult = tostring(ConditionalAccessPolicies.result)\n| where isnotempty(PolicyName)\n| summarize SigninCount = count() by PolicyName, PolicyResult`,
      operatorBreakdown: [
        {
          lineNumber: 1,
          codeFragment: 'SigninLogs | where TimeGenerated > ago(7d)',
          operator: 'Time filter',
          explanation: 'Limits scan to the last 7 days of interactive sign-in records.',
        },
        {
          lineNumber: 2,
          codeFragment: '| mv-expand ConditionalAccessPolicies',
          operator: 'mv-expand',
          explanation: 'Turns 1 sign-in row with N policies into N rows (one per policy object).',
        },
        {
          lineNumber: 3,
          codeFragment: 'tostring(ConditionalAccessPolicies.displayName)',
          operator: 'tostring()',
          explanation: 'Casts the dynamic property `.displayName` to a standard string type required by `summarize ... by`.',
        },
        {
          lineNumber: 4,
          codeFragment: '| summarize SigninCount = count() by PolicyName, PolicyResult',
          operator: 'summarize',
          explanation: 'Counts sign-in evaluations grouped by policy name and result.',
        },
      ],
      simulatedOutput: {
        isSimulated: true,
        executionNote: 'Simulated Output — Not executed against a live Microsoft Sentinel workspace.',
        columns: ['PolicyName', 'PolicyResult', 'SigninCount'],
        rows: [
          ['Require MFA for All Users', 'success', '14,820'],
          ['Block Legacy Authentication', 'notApplied', '15,104'],
          ['Require Compliant Device for Finance', 'failure', '28'],
        ],
      },
      commonMistakes: [
        'Forgetting `tostring()` when grouping by a property inside a `dynamic` column (`summarize` requires an explicit scalar type like `tostring()` or `toint()`).',
        'Trying to reference `ConditionalAccessPolicies.displayName` before running `mv-expand` on the array.',
      ],
    },
  },
  {
    id: 'q-imp-7',
    fingerprint: 'imp-p5-q7-defender-for-cloud-workflow-automation-hotspot',
    source: 'Imported',
    type: 'hotspot',
    domainId: 1,
    topicId: 'd1-t4',
    subtopic: 'Configure Microsoft Defender for Cloud plans, auto-provisioning, and workflow automation',
    difficulty: 'Intermediate',
    stem: 'You are configuring Workflow Automation in Microsoft Defender for Cloud to automatically send a customized Microsoft Teams notification whenever a High-severity security alert is generated for your Azure resources. Select the correct configuration options in the Hotspot table below.',
    scenarioContext:
      'Extracted from sc-200-questions-answers-only.pdf (Page 5, Question 7).',
    interactiveSlots: [
      {
        id: 'slot-resource',
        label: 'Azure resource type to create before configuring the Workflow Automation rule',
        choices: [
          'Azure Logic App (with Defender for Cloud trigger)',
          'Azure Automation Runbook',
          'Azure Event Grid Domain',
          'Microsoft Purview Data Loss Prevention Policy',
        ],
        correctChoice: 'Azure Logic App (with Defender for Cloud trigger)',
        originalPdfChoice: 'Azure Logic App (with Defender for Cloud trigger)',
      },
      {
        id: 'slot-trigger',
        label: 'Defender for Cloud data type selected in the Workflow Automation trigger conditions',
        choices: [
          'Security alert (Threat detection alerts)',
          'Regulatory compliance standard state change',
          'Security recommendation',
          'Activity log administrative event',
        ],
        correctChoice: 'Security alert (Threat detection alerts)',
        originalPdfChoice: 'Security alert (Threat detection alerts)',
      },
    ],
    originalAnswerKey: {
      'slot-resource': 'Azure Logic App (with Defender for Cloud trigger)',
      'slot-trigger': 'Security alert (Threat detection alerts)',
    },
    verifiedAnswerKey: {
      'slot-resource': 'Azure Logic App (with Defender for Cloud trigger)',
      'slot-trigger': 'Security alert (Threat detection alerts)',
    },
    extractionAudit: {
      confidence: 'high',
      sourceFileName: 'sc-200-questions-answers-only.pdf',
      sourcePage: 5,
      originalQuestionNumber: '7',
      originalAnswerKey: {
        'slot-resource': 'Azure Logic App (with Defender for Cloud trigger)',
        'slot-trigger': 'Security alert (Threat detection alerts)',
      },
      missingOrAmbiguousFields: [],
      isUsable: true,
      extractedAt: '2026-10-26T20:00:00Z',
    },
    verificationAudit: {
      status: 'verified',
      verifiedAnswerKey: {
        'slot-resource': 'Azure Logic App (with Defender for Cloud trigger)',
        'slot-trigger': 'Security alert (Threat detection alerts)',
      },
      agreesWithOriginal: true,
      documentedBehavior:
        'Workflow automation in Microsoft Defender for Cloud triggers Azure Logic Apps based on three supported connector triggers: Security alerts, Security recommendations, or Regulatory compliance standards.',
      verifiedDate: '2026-10-26',
      officialReferences: [
        {
          title: 'Automate responses to Microsoft Defender for Cloud triggers',
          url: 'https://learn.microsoft.com/en-us/azure/defender-for-cloud/workflow-automation',
          documentedFeature: 'Defines workflow automation rules using Logic Apps for alerts, recommendations, and regulatory compliance.',
          lastUpdated: '2026-07-10',
        },
      ],
    },
    explanation: {
      whyCorrect:
        'Defender for Cloud Workflow Automation executes **Azure Logic Apps** that begin with one of the three Defender for Cloud triggers. To respond to High-severity threat detections, you select **Security alert** as the data type and filter by Alert Severity = High.',
      whyOthersIncorrect: {
        'Azure Automation Runbook': 'Workflow Automation directly invokes Azure Logic Apps (though a Logic App can subsequently call a Runbook).',
        'Regulatory compliance standard state change': 'Triggers on compliance assessment changes (e.g., ISO 27001 / PCI-DSS controls) rather than threat detection alerts.',
      },
      examTip:
        'Both Microsoft Sentinel Playbooks and Microsoft Defender for Cloud Workflow Automations are powered under the hood by **Azure Logic Apps**.',
    },
  },
  {
    id: 'q-imp-10',
    fingerprint: 'imp-p7-q10-litware-case-study-cef-syslog',
    source: 'Imported',
    type: 'case_study',
    domainId: 1,
    topicId: 'd1-t3',
    subtopic: 'Ingest Syslog and Common Event Format (CEF) logs using Linux forwarders and AMA',
    difficulty: 'Difficult',
    caseStudyTitle: 'Case Study: Litware, Inc.',
    caseStudySections: [
      {
        id: 'overview',
        title: 'Overview',
        content:
          'Litware, Inc. is a financial services enterprise migrating its security operations center (SOC) to Microsoft Sentinel and Microsoft Defender XDR. Litware has a main office in Seattle and a branch office in Frankfurt.',
      },
      {
        id: 'environment',
        title: 'Existing Environment',
        content:
          '• Network Appliances: Litware operates third-party perimeter firewalls in Frankfurt that export logs in Common Event Format (CEF) over Syslog (UDP/TCP 514).\n• Linux Log Forwarder: You deploy an Ubuntu Linux VM named `vm-cef-fwd01` in Azure with the Azure Monitor Agent (AMA) and configure a Data Collection Rule (DCR) for CommonSecurityLog.\n• Issue Reported: After configuring the firewall to send CEF messages to `vm-cef-fwd01`, zero events appear in the `CommonSecurityLog` table in Microsoft Sentinel, and the local Syslog daemon on `vm-cef-fwd01` shows connection timeouts from the firewall.',
      },
      {
        id: 'requirements',
        title: 'Technical Requirements',
        content:
          '• You must validate end-to-end CEF log ingestion on `vm-cef-fwd01` and diagnose why incoming Syslog/CEF traffic on port 514 is not reaching the Azure Monitor Agent pipeline.\n• All administrative actions must use built-in diagnostic scripts and follow Microsoft Sentinel best practices.',
      },
    ],
    stem: 'You need to troubleshoot why CEF logs from the Frankfurt perimeter firewalls are not appearing in the CommonSecurityLog table on vm-cef-fwd01. What should you check and validate first on the Linux forwarder?',
    scenarioContext:
      'Extracted from sc-200-questions-answers-only.pdf (Page 7–8, Question 10 — Litware Case Study). Updated to reflect AMA + DCR CEF troubleshooting alongside forwarder daemon and firewall port validation.',
    options: [
      {
        id: 'A',
        label: 'A',
        text: 'Verify that the Linux OS firewall (ufw/iptables) and Azure NSG allow inbound TCP/UDP 514, and confirm rsyslog/syslog-ng is listening on port 514 and forwarding to the AMA local port (28330).',
      },
      {
        id: 'B',
        label: 'B',
        text: 'Recreate the Log Analytics workspace in the Frankfurt Azure region because CommonSecurityLog does not support cross-region Syslog forwarding.',
      },
      {
        id: 'C',
        label: 'C',
        text: 'Enable Windows Event Forwarding (WEF) subscriptions on vm-cef-fwd01.',
      },
      {
        id: 'D',
        label: 'D',
        text: 'Change the destination table in the Data Collection Rule from CommonSecurityLog to DeviceNetworkEvents.',
      },
    ],
    originalAnswerKey: 'A',
    verifiedAnswerKey: 'A',
    extractionAudit: {
      confidence: 'high',
      sourceFileName: 'sc-200-questions-answers-only.pdf',
      sourcePage: 7,
      originalQuestionNumber: '10',
      originalAnswerKey: 'A',
      missingOrAmbiguousFields: [],
      isUsable: true,
      extractedAt: '2026-10-26T20:00:00Z',
    },
    verificationAudit: {
      status: 'verified',
      verifiedAnswerKey: 'A',
      agreesWithOriginal: true,
      documentedBehavior:
        'When ingesting CEF via AMA on a Linux forwarder, the Syslog daemon (rsyslog or syslog-ng) listens on port 514 for incoming network appliance traffic and forwards the logs internally to the Azure Monitor Agent (port 28330). Connection timeouts from the appliance indicate either an NSG/host firewall block on port 514 or the Syslog daemon not listening on external interfaces.',
      verifiedDate: '2026-10-26',
      officialReferences: [
        {
          title: 'Ingest Syslog and CEF messages to Microsoft Sentinel with the Azure Monitor Agent',
          url: 'https://learn.microsoft.com/en-us/azure/sentinel/cef-syslog-ama-overview',
          documentedFeature: 'Describes the Linux log forwarder architecture, rsyslog/syslog-ng listener on port 514, and AMA ingestion into CommonSecurityLog.',
          lastUpdated: '2026-09-12',
        },
      ],
    },
    explanation: {
      whyCorrect:
        'Because the exhibit states that `vm-cef-fwd01` shows connection timeouts from the firewall on port 514, the traffic is blocked before reaching the Syslog daemon or `rsyslog`/`syslog-ng` is not configured to listen on UDP/TCP 514. Validating the NSG, host firewall (`ufw`/`firewalld`), and Syslog daemon listener/forwarding to AMA resolves the ingestion failure.',
      whyOthersIncorrect: {
        B: 'A Linux forwarder can send logs to a Log Analytics workspace in any supported Azure region over HTTPS (443).',
        C: 'Windows Event Forwarding (WEF) is for Windows Events, not Linux Syslog/CEF appliances.',
        D: 'DeviceNetworkEvents is a Microsoft Defender for Endpoint table; CEF appliances always ingest into `CommonSecurityLog`.',
      },
      examTip:
        'Know the table mapping cold: **CEF appliances → `CommonSecurityLog`**, **Standard Linux Syslog → `Syslog`**, **Windows Security Events → `SecurityEvent`**.',
    },
    visualWalkthrough: VISUAL_WALKTHROUGHS[4],
  },
  {
    id: 'q-imp-14',
    fingerprint: 'imp-p10-q14-sentinel-playbook-automation-sequence',
    source: 'Imported',
    type: 'drag_drop',
    domainId: 1,
    topicId: 'd1-t4',
    subtopic: 'Configure Automation Rules and Logic Apps Playbooks (incident triggers, alert triggers, managed identities)',
    difficulty: 'Intermediate',
    stem: 'You want Microsoft Sentinel to automatically isolate a compromised Microsoft Defender for Endpoint device and post a comment to the incident whenever a specific high-severity Analytics Rule generates an incident. Arrange the four implementation steps in the correct chronological order.',
    scenarioContext:
      'Extracted from sc-200-questions-answers-only.pdf (Page 10, Question 14).',
    dragDropPool: [
      {
        id: 'step-playbook',
        text: 'Create an Azure Logic App Playbook using the "Microsoft Sentinel incident" trigger with a System-Assigned Managed Identity.',
      },
      {
        id: 'step-rbac',
        text: 'Assign "Microsoft Sentinel Responder" and Defender API permissions to the Playbook Managed Identity, and grant Sentinel service permissions to the Playbook resource group.',
      },
      {
        id: 'step-automation-rule',
        text: 'Create a Microsoft Sentinel Automation Rule with the "When incident is created" trigger and filter by the Analytics Rule name.',
      },
      {
        id: 'step-action',
        text: 'Add the "Run playbook" action to the Automation Rule and select the deployed Logic App Playbook.',
      },
    ],
    dragDropTargetOrder: ['step-playbook', 'step-rbac', 'step-automation-rule', 'step-action'],
    originalDragDropOrder: ['step-playbook', 'step-rbac', 'step-automation-rule', 'step-action'],
    originalAnswerKey: ['step-playbook', 'step-rbac', 'step-automation-rule', 'step-action'],
    verifiedAnswerKey: ['step-playbook', 'step-rbac', 'step-automation-rule', 'step-action'],
    extractionAudit: {
      confidence: 'high',
      sourceFileName: 'sc-200-questions-answers-only.pdf',
      sourcePage: 10,
      originalQuestionNumber: '14',
      originalAnswerKey: ['step-playbook', 'step-rbac', 'step-automation-rule', 'step-action'],
      missingOrAmbiguousFields: [],
      isUsable: true,
      extractedAt: '2026-10-26T20:00:00Z',
    },
    verificationAudit: {
      status: 'verified',
      verifiedAnswerKey: ['step-playbook', 'step-rbac', 'step-automation-rule', 'step-action'],
      agreesWithOriginal: true,
      documentedBehavior:
        'To trigger a playbook on incident creation in Microsoft Sentinel, the Logic App playbook with the "Microsoft Sentinel incident" trigger must exist and have permissions granted before it can be selected in the "Run playbook" action of an Automation Rule.',
      verifiedDate: '2026-10-26',
      officialReferences: [
        {
          title: 'Create and customize Microsoft Sentinel playbooks',
          url: 'https://learn.microsoft.com/en-us/azure/sentinel/tutorial-respond-threats-playbook',
          documentedFeature: 'Step-by-step workflow for creating an incident-triggered Logic App playbook and attaching it to an automation rule.',
          lastUpdated: '2026-08-19',
        },
      ],
    },
    explanation: {
      whyCorrect:
        'First, build the Logic App Playbook with the **Microsoft Sentinel incident** trigger (1). Second, grant the Managed Identity the required RBAC/API permissions and authorize Microsoft Sentinel on the resource group (2). Third, create the **Automation Rule** scoped to the incident creation trigger and analytics rule condition (3). Fourth, attach the **Run playbook** action to the automation rule (4).',
      whyOthersIncorrect: {
        'Reverse order': 'You cannot select a Playbook inside an Automation Rule until the Playbook exists and Microsoft Sentinel has permission on its resource group.',
      },
      examTip:
        'Remember: Incident-triggered Playbooks are NEVER attached directly inside the Analytics Rule wizard—they are always invoked via an **Automation Rule**!',
    },
    visualWalkthrough: VISUAL_WALKTHROUGHS[1],
  },
  {
    id: 'q-imp-26',
    fingerprint: 'imp-p18-q26-yesno-custom-detection-rule-columns',
    source: 'Imported',
    type: 'yes_no',
    domainId: 3,
    topicId: 'd3-t1',
    subtopic: 'Create and manage Custom Detection Rules from Advanced Hunting queries (Timestamp, ReportId, impacted entities)',
    difficulty: 'Intermediate',
    stem: 'You write an Advanced Hunting query in Microsoft Defender XDR over the DeviceProcessEvents table to detect suspicious certutil.exe downloads. When you click "Create detection rule", the wizard displays an error stating that required columns are missing because your query ends with `| summarize count() by DeviceName`. Evaluate each proposed solution below and select Yes if it resolves the error and allows creating a Custom Detection Rule, or No if it does not.',
    scenarioContext:
      'Extracted from sc-200-questions-answers-only.pdf (Pages 18–19, Questions 26–28 consolidated Yes/No scenario series).',
    yesNoStatements: [
      {
        id: 'stmt-1',
        statement:
          'Solution 1 (Q26): Replace `| summarize count() by DeviceName` with `| project Timestamp, DeviceId, ReportId, FileName, ProcessCommandLine`.',
        correctAnswer: 'Yes',
        originalPdfAnswer: 'Yes',
        explanation:
          'Custom detection rules in Defender XDR require `Timestamp`, `ReportId`, and at least one strongly typed entity identifier column such as `DeviceId`, `DeviceName`, `AccountObjectId`, or `RecipientEmailAddress`.',
      },
      {
        id: 'stmt-2',
        statement:
          'Solution 2 (Q27): Replace `| summarize count() by DeviceName` with `| summarize arg_max(Timestamp, *) by DeviceId`.',
        correctAnswer: 'Yes',
        originalPdfAnswer: 'Yes',
        explanation:
          '`summarize arg_max(Timestamp, *) by DeviceId` preserves all columns from the latest event per DeviceId—including `Timestamp`, `ReportId`, and `DeviceId`—satisfying all custom detection rule requirements.',
      },
      {
        id: 'stmt-3',
        statement:
          'Solution 3 (Q28): Keep `| summarize count() by DeviceName` and change the schedule frequency to Near Real-Time (NRT).',
        correctAnswer: 'No',
        originalPdfAnswer: 'No',
        explanation:
          'Neither scheduled custom detections nor NRT custom detections allow `summarize` clauses that strip `Timestamp` and `ReportId` (in fact, NRT detections do not support `summarize` or `join` at all).',
      },
    ],
    originalAnswerKey: { 'stmt-1': 'Yes', 'stmt-2': 'Yes', 'stmt-3': 'No' },
    verifiedAnswerKey: { 'stmt-1': 'Yes', 'stmt-2': 'Yes', 'stmt-3': 'No' },
    extractionAudit: {
      confidence: 'high',
      sourceFileName: 'sc-200-questions-answers-only.pdf',
      sourcePage: 18,
      originalQuestionNumber: '26-28',
      originalAnswerKey: { 'stmt-1': 'Yes', 'stmt-2': 'Yes', 'stmt-3': 'No' },
      missingOrAmbiguousFields: [],
      isUsable: true,
      extractedAt: '2026-10-26T20:00:00Z',
    },
    verificationAudit: {
      status: 'verified',
      verifiedAnswerKey: { 'stmt-1': 'Yes', 'stmt-2': 'Yes', 'stmt-3': 'No' },
      agreesWithOriginal: true,
      documentedBehavior:
        'To create a Custom Detection Rule in Microsoft Defender XDR, the query must return (1) Timestamp, (2) ReportId, and (3) at least one impacted asset column (e.g., DeviceId, AccountUpn, RecipientEmailAddress). Using arg_max(Timestamp, *) preserves all columns.',
      verifiedDate: '2026-10-26',
      officialReferences: [
        {
          title: 'Create and manage custom detection rules in Microsoft Defender XDR',
          url: 'https://learn.microsoft.com/en-us/defender-xdr/custom-detections-manage',
          documentedFeature: 'Specifies the mandatory columns (Timestamp, ReportId, and entity identifier) for custom detection rules.',
          lastUpdated: '2026-09-18',
        },
      ],
    },
    explanation: {
      whyCorrect:
        'A plain `| summarize count() by DeviceName` drops `Timestamp` and `ReportId`, causing the Custom Detection Rule wizard to fail. Both `| project Timestamp, DeviceId, ReportId, ...` and `| summarize arg_max(Timestamp, *) by DeviceId` retain the mandatory `Timestamp`, `ReportId`, and `DeviceId` columns.',
      whyOthersIncorrect: {
        'Solution 3': 'NRT (Continuous) custom detections have even stricter requirements—they only support a single table and cannot use `join`, `union`, or `summarize`.',
      },
      examTip:
        'The 3 mandatory column categories for Defender XDR Custom Detections are: **`Timestamp` + `ReportId` + 1 Impacted Entity ID (`DeviceId`, `AccountUpn`, `RecipientEmailAddress`, etc.)**.',
    },
    visualWalkthrough: VISUAL_WALKTHROUGHS[3],
  },
  {
    id: 'q-orig-101',
    fingerprint: 'orig-d1-t3-dcr-kql-transformation-custom-table',
    source: 'Original Practice',
    type: 'single_choice',
    domainId: 1,
    topicId: 'd1-t3',
    subtopic: 'Create and transform custom log tables using DCR transformations (KQL ingestion-time parsing)',
    difficulty: 'Intermediate',
    stem: 'Your security team ingests high-volume proxy logs into Microsoft Sentinel via the Azure Monitor Agent (AMA) and a Data Collection Rule (DCR). To reduce ingestion costs and comply with privacy regulations, you must filter out `HealthCheck` debug events and mask the `UserPasswordHash` column BEFORE the data is stored in the Log Analytics workspace. Which mechanism should you configure?',
    options: [
      {
        id: 'A',
        label: 'A',
        text: 'Add an ingestion-time KQL transformation (`transformKql` starting with `source | where EventType != "HealthCheck" | project-away UserPasswordHash`) inside the Data Collection Rule (DCR).',
      },
      {
        id: 'B',
        label: 'B',
        text: 'Create a saved KQL function in the Log Analytics workspace that uses `project-away UserPasswordHash`.',
      },
      {
        id: 'C',
        label: 'C',
        text: 'Configure table-level RBAC in Microsoft Entra ID to hide the column after ingestion.',
      },
      {
        id: 'D',
        label: 'D',
        text: 'Change the table retention period from 90 days to 30 days.',
      },
    ],
    originalAnswerKey: 'A',
    verifiedAnswerKey: 'A',
    extractionAudit: {
      confidence: 'high',
      sourceFileName: 'Original Syllabus Generator',
      sourcePage: 0,
      originalQuestionNumber: 'ORIG-101',
      originalAnswerKey: 'A',
      missingOrAmbiguousFields: [],
      isUsable: true,
      extractedAt: '2026-10-26T20:00:00Z',
    },
    verificationAudit: {
      status: 'verified',
      verifiedAnswerKey: 'A',
      agreesWithOriginal: true,
      documentedBehavior:
        'Data Collection Rules (DCRs) support ingestion-time KQL transformations against the virtual `source` table, enabling filtering out unwanted rows and dropping sensitive columns before data is written or billed as Analytics logs.',
      verifiedDate: '2026-10-26',
      officialReferences: [
        {
          title: 'Transform or customize data at ingestion time in Microsoft Sentinel',
          url: 'https://learn.microsoft.com/en-us/azure/sentinel/configure-data-transformation',
          documentedFeature: 'Uses DCR KQL transformations (`source | where ... | project-away ...`) to filter and mask data prior to storage.',
          lastUpdated: '2026-08-25',
        },
      ],
    },
    explanation: {
      whyCorrect:
        'An ingestion-time KQL transformation inside a **Data Collection Rule (DCR)** runs in the Azure Monitor pipeline against the incoming `source` stream *before* logs are written to the workspace, eliminating both storage of sensitive fields and ingestion charges for dropped rows.',
      whyOthersIncorrect: {
        B: 'Saved KQL functions only filter data at query time; the raw events and sensitive fields are still stored and billed.',
        C: 'RBAC restricts who can read rows/tables after storage; it does not prevent ingestion or reduce volume.',
        D: 'Adjusting retention does not remove debug events at ingestion or mask sensitive fields.',
      },
      examTip:
        'In DCR transformations, the input stream is always referenced using the keyword **`source`** (for example: `source | where Severity != "Debug"`).',
    },
    visualWalkthrough: VISUAL_WALKTHROUGHS[4],
  },
  {
    id: 'q-orig-201',
    fingerprint: 'orig-d2-t2-automatic-attack-disruption-purview-audit',
    source: 'Original Practice',
    type: 'multi_select',
    domainId: 2,
    topicId: 'd2-t2',
    subtopic: 'Manage Automated Investigation and Response (AIR), Action Center pending/history, and Automatic Attack Disruption',
    difficulty: 'Difficult',
    stem: 'Microsoft Defender XDR triggers Automatic Attack Disruption during a human-operated Adversary-in-the-Middle (AiTM) phishing and Business Email Compromise (BEC) attack targeting a finance director. You need to (1) verify what automated containment actions Defender XDR immediately took on the compromised identity, and (2) audit which specific email items in the finance director’s mailbox were read by the attacker during the session. Which TWO actions should you perform?',
    options: [
      {
        id: 'A',
        label: 'A',
        text: 'Open the Incident graph / Action Center History in the Microsoft Defender portal to review the automatic "Contain user" and "Disable user" disruption actions.',
      },
      {
        id: 'B',
        label: 'B',
        text: 'Search the Microsoft Purview Audit log for the `MailItemsAccessed` operation associated with the compromised user and attacker session IP.',
      },
      {
        id: 'C',
        label: 'C',
        text: 'Run `Update-MpSignature` via Live Response on the finance director’s iOS mobile phone.',
      },
      {
        id: 'D',
        label: 'D',
        text: 'Check the `SecurityEvent` table for Windows Event ID 4624 on the Microsoft Exchange Online cloud servers.',
      },
    ],
    originalAnswerKey: ['A', 'B'],
    verifiedAnswerKey: ['A', 'B'],
    extractionAudit: {
      confidence: 'high',
      sourceFileName: 'Original Syllabus Generator',
      sourcePage: 0,
      originalQuestionNumber: 'ORIG-201',
      originalAnswerKey: ['A', 'B'],
      missingOrAmbiguousFields: [],
      isUsable: true,
      extractedAt: '2026-10-26T20:00:00Z',
    },
    verificationAudit: {
      status: 'verified',
      verifiedAnswerKey: ['A', 'B'],
      agreesWithOriginal: true,
      documentedBehavior:
        'Automatic attack disruption in Defender XDR contains or disables compromised user accounts automatically and logs actions in the incident graph and Action Center History. In Microsoft Purview Audit, the `MailItemsAccessed` Exchange mailbox audit event records when mail data is accessed by mail protocols or Graph/OWA.',
      verifiedDate: '2026-10-26',
      officialReferences: [
        {
          title: 'Automatic attack disruption in Microsoft Defender XDR',
          url: 'https://learn.microsoft.com/en-us/defender-xdr/automatic-attack-disruption',
          documentedFeature: 'Details automatic containment actions (Contain user, Disable user, Contain device) and Action Center auditing.',
          lastUpdated: '2026-09-20',
        },
        {
          title: 'Use MailItemsAccessed to investigate compromised mailboxes in Microsoft Purview Audit',
          url: 'https://learn.microsoft.com/en-us/purview/audit-mailitemsaccessed',
          documentedFeature: 'Explains how MailItemsAccessed tracks unauthorized reading/syncing of emails during BEC investigations.',
          lastUpdated: '2026-08-11',
        },
      ],
    },
    explanation: {
      whyCorrect:
        '1. **Action Center History & Incident Graph (A)** displays the automated response actions triggered by Automatic Attack Disruption (such as disabling the account in Entra ID/AD or containing the user from lateral movement).\n2. **`MailItemsAccessed` in Microsoft Purview Audit (B)** is the specific forensic mailbox audit record designed to prove which messages an attacker accessed or synced during a BEC compromise.',
      whyOthersIncorrect: {
        C: 'Live Response `Update-MpSignature` updates antimalware definitions on endpoints and does not audit BEC mailbox access or identity containment.',
        D: 'Exchange Online is a SaaS service; customers do not collect Windows Event ID 4624 from Microsoft’s underlying Exchange Online infrastructure.',
      },
      examTip:
        'For any BEC / compromised mailbox forensic question asking "Which emails did the attacker read?", the answer on SC-200 is **`MailItemsAccessed` in Microsoft Purview Audit**.',
    },
    visualWalkthrough: VISUAL_WALKTHROUGHS[5],
  },
  {
    id: 'q-orig-202',
    fingerprint: 'orig-d2-t3-microsoft-graph-activity-logs-oauth',
    source: 'Original Practice',
    type: 'single_choice',
    domainId: 2,
    topicId: 'd2-t3',
    subtopic: 'Investigate suspicious application and token abuse using Microsoft Graph Activity Logs',
    difficulty: 'Intermediate',
    stem: 'Microsoft Entra ID Protection raises a "Suspicious application" risk alert for a multi-tenant OAuth application (`AppId: 89f1...`). You suspect a threat actor used a stolen service principal token to enumerate all directory users and download sensitive files from SharePoint Online via REST API calls. Which log table in Microsoft Sentinel / Azure Monitor provides the complete HTTP request URIs, HTTP methods (`GET`, `POST`), response status codes, and `AppId` for every Microsoft Graph API call made by this application?',
    options: [
      {
        id: 'A',
        label: 'A',
        text: 'MicrosoftGraphActivityLogs',
      },
      {
        id: 'B',
        label: 'B',
        text: 'AADNonInteractiveUserSignInLogs',
      },
      {
        id: 'C',
        label: 'C',
        text: 'DeviceNetworkEvents',
      },
      {
        id: 'D',
        label: 'D',
        text: 'SecurityAlert',
      },
    ],
    originalAnswerKey: 'A',
    verifiedAnswerKey: 'A',
    extractionAudit: {
      confidence: 'high',
      sourceFileName: 'Original Syllabus Generator',
      sourcePage: 0,
      originalQuestionNumber: 'ORIG-202',
      originalAnswerKey: 'A',
      missingOrAmbiguousFields: [],
      isUsable: true,
      extractedAt: '2026-10-26T20:00:00Z',
    },
    verificationAudit: {
      status: 'verified',
      verifiedAnswerKey: 'A',
      agreesWithOriginal: true,
      documentedBehavior:
        'MicrosoftGraphActivityLogs records audit trail events for all HTTP requests received by the Microsoft Graph service, including RequestUri, RequestMethod, ResponseStatusCode, AppId, UserId, ServicePrincipalId, and IPAddress.',
      verifiedDate: '2026-10-26',
      officialReferences: [
        {
          title: 'Microsoft Graph activity logs overview - Microsoft Entra',
          url: 'https://learn.microsoft.com/en-us/entra/identity/monitoring-health/concept-microsoft-graph-activity-logs',
          documentedFeature: 'Provides HTTP request-level visibility into Microsoft Graph API calls for threat hunting and incident investigation.',
          lastUpdated: '2026-09-05',
        },
      ],
    },
    explanation: {
      whyCorrect:
        '`MicrosoftGraphActivityLogs` captures every API request made to `graph.microsoft.com`, including `RequestUri` (e.g., `/v1.0/users`, `/v1.0/drives/...`), `RequestMethod`, `ResponseStatusCode`, `AppId`, and `ServicePrincipalId`. This allows analysts to determine the exact blast radius of a compromised OAuth app or token.',
      whyOthersIncorrect: {
        B: 'AADNonInteractiveUserSignInLogs shows when a token was issued during authentication, not the specific Graph API endpoints or files accessed afterward.',
        C: 'DeviceNetworkEvents only captures network connections from managed endpoints, not cloud-to-cloud API calls made from an attacker’s external infrastructure.',
        D: 'SecurityAlert contains the high-level alert notification, not the raw HTTP API request logs.',
      },
      examTip:
        'Know the pair: **`AADServicePrincipalSignInLogs`** tells you *when* an app authenticated; **`MicrosoftGraphActivityLogs`** tells you *what API calls* (`RequestUri`) the token actually executed!',
    },
  },
  {
    id: 'q-orig-203',
    fingerprint: 'orig-d2-t4-security-copilot-script-analysis-incident',
    source: 'Original Practice',
    type: 'single_choice',
    domainId: 2,
    topicId: 'd2-t4',
    subtopic: 'Accelerate incident response using Microsoft Security Copilot and agentic AI capabilities',
    difficulty: 'Easy',
    stem: 'While investigating a multi-stage incident in the Microsoft Defender portal, you find a heavily obfuscated Base64-encoded PowerShell command in a process creation alert. Your organization has provisioned Microsoft Security Copilot. What is the most direct built-in capability in the Defender portal to de-obfuscate and explain the command’s behavior without executing it?',
    options: [
      {
        id: 'A',
        label: 'A',
        text: 'Use the Security Copilot "Analyze script" action directly in the alert/process details pane to decode and explain the PowerShell command step by step.',
      },
      {
        id: 'B',
        label: 'B',
        text: 'Execute the encoded PowerShell command on a production domain controller using Live Response to observe its behavior.',
      },
      {
        id: 'C',
        label: 'C',
        text: 'Create an Attack Surface Reduction (ASR) rule in Audit mode.',
      },
      {
        id: 'D',
        label: 'D',
        text: 'Export the incident to a CSV file and upload it to Microsoft Purview eDiscovery.',
      },
    ],
    originalAnswerKey: 'A',
    verifiedAnswerKey: 'A',
    extractionAudit: {
      confidence: 'high',
      sourceFileName: 'Original Syllabus Generator',
      sourcePage: 0,
      originalQuestionNumber: 'ORIG-203',
      originalAnswerKey: 'A',
      missingOrAmbiguousFields: [],
      isUsable: true,
      extractedAt: '2026-10-26T20:00:00Z',
    },
    verificationAudit: {
      status: 'verified',
      verifiedAnswerKey: 'A',
      agreesWithOriginal: true,
      documentedBehavior:
        'Microsoft Security Copilot embedded in the Microsoft Defender portal provides incident summarization, guided responses, KQL query generation, file analysis, and built-in script analysis ("Analyze script") to de-obfuscate malicious PowerShell or CMD scripts.',
      verifiedDate: '2026-10-26',
      officialReferences: [
        {
          title: 'Microsoft Security Copilot in Microsoft Defender',
          url: 'https://learn.microsoft.com/en-us/copilot/security/microsoft-defender-portal',
          documentedFeature: 'Documents Security Copilot embedded experiences in Defender XDR: Summarize incident, Guided response, Script analysis, and KQL assistant.',
          lastUpdated: '2026-10-01',
        },
      ],
    },
    explanation: {
      whyCorrect:
        'Microsoft Security Copilot in Microsoft Defender XDR includes a built-in **Script analysis** feature inside the process tree / alert timeline that automatically decodes Base64 strings, explains each command flag, and highlights indicators of compromise.',
      whyOthersIncorrect: {
        B: 'Never detonate unknown malicious scripts on a production domain controller.',
        C: 'ASR rules prevent or audit exploit behaviors on endpoints; they do not de-obfuscate an existing script in an alert.',
        D: 'Purview eDiscovery searches mailbox/SharePoint content and does not analyze PowerShell code.',
      },
      examTip:
        'On the updated SC-200 syllabus, remember the 5 core embedded **Security Copilot in Defender XDR** skills: **Incident Summary**, **Guided Response**, **Script Analysis**, **File Analysis**, and **Natural Language to KQL in Advanced Hunting**.',
    },
  },
  {
    id: 'q-orig-301',
    fingerprint: 'orig-d3-t1-kql-join-emailevents-deviceprocessevents',
    source: 'Original Practice',
    type: 'kql_completion',
    domainId: 3,
    topicId: 'd3-t1',
    subtopic: 'Select and query Defender XDR Advanced Hunting tables (DeviceProcessEvents, EmailEvents, IdentityLogonEvents)',
    difficulty: 'Difficult',
    stem: 'You are hunting for endpoints where a user received an inbound email containing a PDF or ZIP attachment and subsequently executed a file with the exact same SHA256 hash within 24 hours. Complete the cross-domain Advanced Hunting KQL query below.',
    interactiveSlots: [
      {
        id: 'slot-table',
        label: 'Select the table that stores SHA256 hashes of email attachments',
        codePrefix: '',
        codeSuffix: '\n| where Timestamp > ago(7d)\n| where isnotempty(SHA256)',
        choices: ['EmailAttachmentInfo', 'EmailUrlInfo', 'EmailPostDeliveryEvents', 'CloudAppEvents'],
        correctChoice: 'EmailAttachmentInfo',
      },
      {
        id: 'slot-join',
        label: 'Join with DeviceProcessEvents on matching SHA256 hash',
        codePrefix: '| join kind=',
        codeSuffix: ' (DeviceProcessEvents | where Timestamp > ago(7d)) on SHA256',
        choices: ['inner', 'leftanti', 'rightanti', 'fullouter'],
        correctChoice: 'inner',
      },
    ],
    originalAnswerKey: { 'slot-table': 'EmailAttachmentInfo', 'slot-join': 'inner' },
    verifiedAnswerKey: { 'slot-table': 'EmailAttachmentInfo', 'slot-join': 'inner' },
    extractionAudit: {
      confidence: 'high',
      sourceFileName: 'Original Syllabus Generator',
      sourcePage: 0,
      originalQuestionNumber: 'ORIG-301',
      originalAnswerKey: { 'slot-table': 'EmailAttachmentInfo', 'slot-join': 'inner' },
      missingOrAmbiguousFields: [],
      isUsable: true,
      extractedAt: '2026-10-26T20:00:00Z',
    },
    verificationAudit: {
      status: 'verified',
      verifiedAnswerKey: { 'slot-table': 'EmailAttachmentInfo', 'slot-join': 'inner' },
      agreesWithOriginal: true,
      documentedBehavior:
        'EmailAttachmentInfo stores metadata about files attached to emails (including FileName, FileType, SHA256, and NetworkMessageId). Joining it with DeviceProcessEvents using `join kind=inner ... on SHA256` correlates email attachments that were subsequently executed as processes on endpoints.',
      verifiedDate: '2026-10-26',
      officialReferences: [
        {
          title: 'EmailAttachmentInfo table in the advanced hunting schema',
          url: 'https://learn.microsoft.com/en-us/defender-xdr/advanced-hunting-emailattachmentinfo-table',
          documentedFeature: 'Contains information about files attached to emails processed by Defender for Office 365, including SHA256.',
          lastUpdated: '2026-09-10',
        },
      ],
    },
    explanation: {
      whyCorrect:
        '`EmailAttachmentInfo` is the Defender for Office 365 table that records attachment file names and `SHA256` hashes (whereas `EmailEvents` only records the count of attachments, not their individual hashes). Using `join kind=inner` returns only records where the `SHA256` hash exists in BOTH the email attachment table and `DeviceProcessEvents`.',
      whyOthersIncorrect: {
        EmailUrlInfo: 'Contains URLs embedded in email bodies, not file attachment SHA256 hashes.',
        EmailPostDeliveryEvents: 'Contains post-delivery actions like ZAP or manual admin remediation, not attachment SHA256 hashes.',
        leftanti: 'Returns email attachments that were NEVER executed on any device (non-matching rows on the right).',
      },
      examTip:
        '`EmailEvents` does NOT contain `SHA256` or `Url`! You must query **`EmailAttachmentInfo`** for attachment hashes and **`EmailUrlInfo`** / **`UrlClickEvents`** for URLs, joining back to `EmailEvents` via `NetworkMessageId` if needed.',
    },
    kqlLearning: {
      tableSchemas: [
        {
          tableName: 'EmailAttachmentInfo',
          platform: 'Microsoft Defender XDR',
          description: 'Information about files attached to emails processed by Microsoft Defender for Office 365.',
          columns: [
            { name: 'Timestamp', type: 'datetime', description: 'Time the email was processed' },
            { name: 'NetworkMessageId', type: 'string', description: 'Unique ID for the email message across Office 365 tables' },
            { name: 'SenderFromAddress', type: 'string', description: 'Sender email address' },
            { name: 'RecipientEmailAddress', type: 'string', description: 'Recipient email address' },
            { name: 'FileName', type: 'string', description: 'Attachment file name' },
            { name: 'SHA256', type: 'string', description: 'SHA-256 hash of the attachment file' },
          ],
        },
        {
          tableName: 'DeviceProcessEvents',
          platform: 'Microsoft Defender XDR',
          description: 'Process creation and related events on endpoints protected by Defender for Endpoint.',
          columns: [
            { name: 'Timestamp', type: 'datetime', description: 'Time the process was created' },
            { name: 'DeviceId', type: 'string', description: 'Unique identifier for the device' },
            { name: 'DeviceName', type: 'string', description: 'Fully qualified domain name of the device' },
            { name: 'FileName', type: 'string', description: 'Name of the executed binary' },
            { name: 'ProcessCommandLine', type: 'string', description: 'Command line used to run the process' },
            { name: 'SHA256', type: 'string', description: 'SHA-256 hash of the executed image file' },
          ],
        },
      ],
      completeQuery: `EmailAttachmentInfo\n| where Timestamp > ago(7d) and isnotempty(SHA256)\n| project EmailTime = Timestamp, NetworkMessageId, SenderFromAddress, RecipientEmailAddress, AttachmentName = FileName, SHA256\n| join kind=inner (\n    DeviceProcessEvents\n    | where Timestamp > ago(7d) and isnotempty(SHA256)\n    | project ProcessTime = Timestamp, DeviceId, DeviceName, AccountName, ProcessCommandLine, SHA256\n) on SHA256\n| where ProcessTime between (EmailTime .. (EmailTime + 24h))`,
      operatorBreakdown: [
        {
          lineNumber: 1,
          codeFragment: 'EmailAttachmentInfo | where Timestamp > ago(7d) and isnotempty(SHA256)',
          operator: 'Left Table (Smaller dataset first)',
          explanation: 'Best practice in KQL joins: place the smaller table (`EmailAttachmentInfo`) on the left side of the join.',
        },
        {
          lineNumber: 3,
          codeFragment: '| project EmailTime = Timestamp, ...',
          operator: 'project (Column renaming)',
          explanation: 'Renames `Timestamp` to `EmailTime` before joining so it does not collide with `Timestamp` from `DeviceProcessEvents`.',
        },
        {
          lineNumber: 4,
          codeFragment: '| join kind=inner (...) on SHA256',
          operator: 'join kind=inner',
          explanation: 'Matches every email attachment with process executions sharing the identical `SHA256` hash.',
        },
        {
          lineNumber: 9,
          codeFragment: '| where ProcessTime between (EmailTime .. (EmailTime + 24h))',
          operator: 'between (start .. end)',
          explanation: 'Ensures the process execution occurred within 24 hours after the email was received.',
        },
      ],
      simulatedOutput: {
        isSimulated: true,
        executionNote: 'Simulated Output — Not executed against a live Microsoft Defender XDR tenant.',
        columns: ['EmailTime', 'RecipientEmailAddress', 'AttachmentName', 'DeviceName', 'ProcessTime', 'ProcessCommandLine'],
        rows: [
          ['2026-10-25 09:14:02Z', 'alex.wilber@contoso.com', 'Invoice_Q4_Urgent.exe', 'wkstn-fin-04.contoso.com', '2026-10-25 09:18:44Z', '"C:\\Users\\alex\\Downloads\\Invoice_Q4_Urgent.exe" -silent'],
        ],
      },
      commonMistakes: [
        'Leaving `join` without specifying `kind=inner`! In KQL, the default join flavor is `innerunique`, which deduplicates keys on the left table and can silently drop multiple emails that shared the same attachment hash.',
        'Querying `EmailEvents` for `SHA256`—`EmailEvents` does not have a `SHA256` column.',
      ],
    },
    visualWalkthrough: VISUAL_WALKTHROUGHS[3],
  },
  {
    id: 'q-orig-302',
    fingerprint: 'orig-d3-t2-sentinel-graph-kql-jobs-summary-rules',
    source: 'Original Practice',
    type: 'single_choice',
    domainId: 3,
    topicId: 'd3-t2',
    subtopic: 'Use KQL jobs, summary rule tables, Azure Machine Learning Notebooks (MSTICPy), and Sentinel MCP Server',
    difficulty: 'Intermediate',
    stem: 'Your SOC stores 2 years of verbose firewall and proxy logs in low-cost Archive / Basic log tiers in Microsoft Sentinel. You need to (1) run an asynchronous historical threat-hunting scan over 180 days of archived logs to extract matching IOC records into a new searchable table, and (2) continuously aggregate hourly connection counts into a lightweight table for fast 90-day anomaly dashboards. Which two Microsoft Sentinel features should you use?',
    options: [
      {
        id: 'A',
        label: 'A',
        text: 'Use a Search Job / KQL Job for the asynchronous 180-day archive hunt, and configure Summary Rules to continuously aggregate hourly metrics into a custom summary table.',
      },
      {
        id: 'B',
        label: 'B',
        text: 'Use an NRT (Near-Real-Time) Analytics Rule for the 180-day archive scan, and use Watchlists to store hourly firewall aggregations.',
      },
      {
        id: 'C',
        label: 'C',
        text: 'Use Hunting Livestreams to query archived logs over 180 days.',
      },
      {
        id: 'D',
        label: 'D',
        text: 'Use Microsoft Purview Content Search to query Sentinel Archive tier tables.',
      },
    ],
    originalAnswerKey: 'A',
    verifiedAnswerKey: 'A',
    extractionAudit: {
      confidence: 'high',
      sourceFileName: 'Original Syllabus Generator',
      sourcePage: 0,
      originalQuestionNumber: 'ORIG-302',
      originalAnswerKey: 'A',
      missingOrAmbiguousFields: [],
      isUsable: true,
      extractedAt: '2026-10-26T20:00:00Z',
    },
    verificationAudit: {
      status: 'verified',
      verifiedAnswerKey: 'A',
      agreesWithOriginal: true,
      documentedBehavior:
        'In Microsoft Sentinel, Search jobs / KQL jobs run asynchronous queries across large time ranges and Archive/Data Lake logs, writing results to a `_SRCH` table. Summary rules run scheduled KQL aggregations and store summarized output in custom tables (`_CL`) for fast reporting and long-term analytics.',
      verifiedDate: '2026-10-26',
      officialReferences: [
        {
          title: 'Aggregate Microsoft Sentinel data with summary rules',
          url: 'https://learn.microsoft.com/en-us/azure/sentinel/summary-rules',
          documentedFeature: 'Pre-aggregates high-volume logs on a schedule into custom summary tables for fast querying and lower cost.',
          lastUpdated: '2026-09-15',
        },
        {
          title: 'Run a search job in Microsoft Sentinel',
          url: 'https://learn.microsoft.com/en-us/azure/sentinel/search-job',
          documentedFeature: 'Executes asynchronous historical searches across analytics and archived logs.',
          lastUpdated: '2026-08-29',
        },
      ],
    },
    explanation: {
      whyCorrect:
        '**Search jobs / KQL jobs** are designed specifically for asynchronous, long-range historical hunts across archived logs, writing matching records into a dedicated search results table (`*_SRCH`). **Summary rules** continuously aggregate noisy, high-volume tables (such as firewall or NetFlow logs) into compact summary tables for rapid trend analysis and workbooks.',
      whyOthersIncorrect: {
        B: 'NRT rules run every minute over newly ingested Analytics logs and cannot scan archived data; Watchlists are for static/semi-static lookup tables (e.g., VIP users, terminated employees), not continuous time-series aggregation.',
        C: 'Hunting Livestreams test newly arriving events in real time against an active session query.',
        D: 'Purview Content Search queries Microsoft 365 workloads (Exchange, SharePoint, Teams), not Sentinel Log Analytics tables.',
      },
      examTip:
        'Summary Rules are a key modern SC-200 objective: whenever a scenario asks how to query 90–365 days of high-volume Basic/Auxiliary logs efficiently for dashboards or baseline comparisons, pick **Summary Rules**!',
    },
  },
  {
    id: 'q-ref-301',
    fingerprint: 'ref-d2-t2-mde-live-response-remediate-command',
    source: 'Official Resource Reference',
    type: 'single_choice',
    domainId: 2,
    topicId: 'd2-t2',
    subtopic: 'Execute Live Response commands (getfile, putfile, run, remediation, library scripts)',
    difficulty: 'Easy',
    stem: 'You initiate a Live Response session on a Windows 11 workstation in Microsoft Defender for Endpoint. You confirm that a custom unsigned PowerShell triage script named `Collect-Persistence.ps1` has already been uploaded to the Live Response library, and "Run unsigned scripts" is enabled in Advanced features. Which Live Response console command should you run to execute the script directly from the library?',
    options: [
      {
        id: 'A',
        label: 'A',
        text: 'run Collect-Persistence.ps1',
      },
      {
        id: 'B',
        label: 'B',
        text: 'putfile Collect-Persistence.ps1',
      },
      {
        id: 'C',
        label: 'C',
        text: 'getfile Collect-Persistence.ps1',
      },
      {
        id: 'D',
        label: 'D',
        text: 'remediate file Collect-Persistence.ps1',
      },
    ],
    originalAnswerKey: 'A',
    verifiedAnswerKey: 'A',
    extractionAudit: {
      confidence: 'high',
      sourceFileName: 'Microsoft Learn Official Practice Reference',
      sourcePage: 0,
      originalQuestionNumber: 'MSLEARN-REF-1',
      originalAnswerKey: 'A',
      missingOrAmbiguousFields: [],
      isUsable: true,
      extractedAt: '2026-10-26T20:00:00Z',
    },
    verificationAudit: {
      status: 'verified',
      verifiedAnswerKey: 'A',
      agreesWithOriginal: true,
      documentedBehavior:
        'In Defender for Endpoint Live Response, `run <script_name.ps1>` executes a PowerShell script stored in the Live Response library on the target device.',
      verifiedDate: '2026-10-26',
      officialReferences: [
        {
          title: 'Investigate entities on devices using live response in Microsoft Defender for Endpoint',
          url: 'https://learn.microsoft.com/en-us/defender-endpoint/live-response#live-response-commands',
          documentedFeature: 'Lists all supported Live Response console commands including library, run, putfile, getfile, processes, connections, and remediate.',
          lastUpdated: '2026-09-02',
        },
      ],
    },
    explanation: {
      whyCorrect:
        'The `run` command in a Defender for Endpoint Live Response session executes a PowerShell script that has been uploaded to the Live Response library (`run Collect-Persistence.ps1`).',
      whyOthersIncorrect: {
        B: '`putfile` copies a file from the Live Response library to the device’s local working directory without executing it.',
        C: '`getfile` downloads a file from the endpoint to the analyst’s machine for offline inspection.',
        D: '`remediate` stops/quarantines a malicious file, process, scheduled task, service, or registry key.',
      },
      examTip:
        'Distinguish `putfile` (copies a binary/file from Library to the endpoint disk) vs `run` (executes a `.ps1` script from the Library in memory).',
    },
    visualWalkthrough: VISUAL_WALKTHROUGHS[2],
  },
];

export const INITIAL_REVIEW_QUEUE_ITEMS: ImportReviewItem[] = [
  {
    id: 'rev-p12-q17',
    sourceFileName: 'sc-200-questions-answers-only.pdf',
    sourcePage: 12,
    originalQuestionNumber: '17',
    rawStem:
      'HOTSPOT - You have a Microsoft Sentinel workspace. You need to configure a data connector based on the architecture diagram shown in the exhibit. Select the correct options in the answer area.',
    detectedType: 'hotspot',
    missingOrAmbiguousFields: [
      'Hotspot answer dropdown labels were partially cropped in the page 12 raster image',
      'Requires manual review of page 12 exhibit before adding to usable practice pool',
    ],
    originalAnswerKeyRaw: 'See page 12 image highlight',
    extractionConfidence: 'low',
    suggestedDomainId: 1,
    suggestedTopicId: 'd1-t3',
    optionsDraft: [
      { id: 'A', label: 'A', text: 'Azure Monitor Agent (AMA) with Data Collection Rule' },
      { id: 'B', label: 'B', text: 'Taxii Threat Intelligence Connector' },
      { id: 'C', label: 'C', text: 'Microsoft Defender XDR Connector' },
      { id: 'D', label: 'D', text: 'Syslog via Linux Forwarder' },
    ],
    status: 'pending_review',
    createdAt: '2026-10-26T20:00:00Z',
  },
];
