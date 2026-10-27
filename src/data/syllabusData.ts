import { SyllabusDomain } from '../types';

export const SYLLABUS_LAST_VERIFIED_DEFAULT = '2026-10-26';
export const OFFICIAL_STUDY_GUIDE_URL =
  'https://learn.microsoft.com/en-us/credentials/certifications/resources/study-guides/sc-200';
export const OFFICIAL_CERTIFICATION_PAGE_URL =
  'https://learn.microsoft.com/en-us/credentials/certifications/security-operations-analyst/';

export const INITIAL_SYLLABUS_DOMAINS: SyllabusDomain[] = [
  {
    id: 1,
    title: 'Manage a security operations environment',
    weightMin: 40,
    weightMax: 45,
    normalizedWeight: 0.425,
    description:
      'Configure settings, permissions, data ingestion, detections, alert tuning, and automation across Microsoft Defender XDR, Defender for Endpoint, Defender for Cloud, and Microsoft Sentinel.',
    topics: [
      {
        id: 'd1-t1',
        domainId: 1,
        code: '1.1',
        title: 'Configure settings in Microsoft Defender XDR and Defender for Endpoint',
        description:
          'Configure Defender XDR portal integration, email notifications, alert tuning, suppression, correlation, device groups, Attack Surface Reduction (ASR) rules, and advanced endpoint features.',
        officialUrl:
          'https://learn.microsoft.com/en-us/defender-xdr/configure-alert-notifications',
        lastVerifiedDate: SYLLABUS_LAST_VERIFIED_DEFAULT,
        subtopics: [
          {
            id: 'd1-t1-s1',
            title: 'Configure Microsoft Defender XDR environment, unified RBAC, and service integrations',
            keywords: ['Defender XDR', 'Unified RBAC', 'Siemens', 'Defender for Cloud Apps', 'Service connections'],
          },
          {
            id: 'd1-t1-s2',
            title: 'Configure alert notifications, alert tuning, suppression rules, and incident correlation',
            keywords: ['Alert tuning', 'Suppression rules', 'Email notifications', 'Incident correlation'],
          },
          {
            id: 'd1-t1-s3',
            title: 'Manage Microsoft Defender for Endpoint device groups, permissions, and advanced features',
            keywords: ['Device groups', 'Live Response settings', 'Automated investigation levels', 'Tamper protection'],
          },
          {
            id: 'd1-t1-s4',
            title: 'Configure endpoint security policies, Attack Surface Reduction (ASR) rules, and indicators (IoCs)',
            keywords: ['ASR rules', 'Audit mode', 'Block mode', 'File hashes', 'IP/URL indicators'],
          },
        ],
      },
      {
        id: 'd1-t2',
        domainId: 1,
        code: '1.2',
        title: 'Configure and manage the Microsoft Sentinel workspace and permissions',
        description:
          'Design and configure Microsoft Sentinel workspaces, onboarding to the Defender portal, RBAC roles, data retention, archival/restore, and workbooks.',
        officialUrl:
          'https://learn.microsoft.com/en-us/azure/sentinel/roles',
        lastVerifiedDate: SYLLABUS_LAST_VERIFIED_DEFAULT,
        subtopics: [
          {
            id: 'd1-t2-s1',
            title: 'Configure Microsoft Sentinel workspace, multi-workspace architecture, and Defender portal onboarding',
            keywords: ['Log Analytics workspace', 'Unified SOC portal', 'Azure Lighthouse', 'Cross-workspace'],
            isNewOrUpdated2025: true,
          },
          {
            id: 'd1-t2-s2',
            title: 'Configure Microsoft Sentinel roles and permissions (Reader, Responder, Contributor, Playbook Operator)',
            keywords: ['Microsoft Sentinel Responder', 'Microsoft Sentinel Contributor', 'Logic App Contributor', 'Resource Group RBAC'],
          },
          {
            id: 'd1-t2-s3',
            title: 'Configure data retention, Archive tier, Basic logs, Analytics logs, and Content Hub solutions',
            keywords: ['Interactive retention', 'Total retention', 'Basic logs', 'Content Hub', 'Workbooks'],
          },
        ],
      },
      {
        id: 'd1-t3',
        domainId: 1,
        code: '1.3',
        title: 'Ingest data into Microsoft Sentinel',
        description:
          'Connect Microsoft and third-party data sources using Content Hub connectors, Azure Monitor Agent (AMA), Data Collection Rules (DCRs), Windows Security Events, WEF, Syslog, CEF, Diagnostic Settings, and custom tables.',
        officialUrl:
          'https://learn.microsoft.com/en-us/azure/sentinel/connect-data-sources',
        lastVerifiedDate: SYLLABUS_LAST_VERIFIED_DEFAULT,
        subtopics: [
          {
            id: 'd1-t3-s1',
            title: 'Configure data connectors for Microsoft 365, Microsoft Entra ID, Defender XDR, and Azure Diagnostic Settings',
            keywords: ['SigninLogs', 'AuditLogs', 'AzureActivity', 'Defender XDR connector', 'Bi-directional sync'],
          },
          {
            id: 'd1-t3-s2',
            title: 'Configure Windows Security Events collection via Azure Monitor Agent (AMA), Data Collection Rules (DCR), and WEF',
            keywords: ['Azure Monitor Agent', 'AMA', 'DCR', 'SecurityEvent', 'WindowsForwardedEvents', 'XPath queries'],
          },
          {
            id: 'd1-t3-s3',
            title: 'Ingest Syslog and Common Event Format (CEF) logs using Linux forwarders and AMA',
            keywords: ['Syslog', 'CommonSecurityLog', 'CEF', 'rsyslog', 'syslog-ng', 'Log forwarder'],
          },
          {
            id: 'd1-t3-s4',
            title: 'Create and transform custom log tables using DCR transformations (KQL ingestion-time parsing)',
            keywords: ['Custom tables', 'DCR transformation', 'Ingestion-time KQL', 'Codeless Connector Platform (CCP)'],
          },
        ],
      },
      {
        id: 'd1-t4',
        domainId: 1,
        code: '1.4',
        title: 'Configure detections, analytics rules, and automation across Defender XDR and Sentinel',
        description:
          'Create scheduled, NRT, threat intelligence, and anomaly rules in Sentinel; map to MITRE ATT&CK; build custom detections in Defender XDR; and orchestrate automation rules and Logic Apps playbooks.',
        officialUrl:
          'https://learn.microsoft.com/en-us/azure/sentinel/detect-threats-built-in',
        lastVerifiedDate: SYLLABUS_LAST_VERIFIED_DEFAULT,
        subtopics: [
          {
            id: 'd1-t4-s1',
            title: 'Create and tune Microsoft Sentinel Analytics Rules (Scheduled, NRT, Fusion, Threat Intelligence, ML Anomalies)',
            keywords: ['Scheduled query rule', 'Near-real-time (NRT)', 'Entity mapping', 'Alert grouping', 'Event grouping'],
          },
          {
            id: 'd1-t4-s2',
            title: 'Assess and map detection coverage using the MITRE ATT&CK matrix in Microsoft Sentinel',
            keywords: ['MITRE ATT&CK', 'Tactics and techniques', 'Simulated coverage', 'Active analytics rules'],
          },
          {
            id: 'd1-t4-s3',
            title: 'Configure Automation Rules and Logic Apps Playbooks (incident triggers, alert triggers, managed identities)',
            keywords: ['Automation rules', 'Playbooks', 'Logic Apps', 'Microsoft Sentinel Responder', 'Automated remediation'],
          },
          {
            id: 'd1-t4-s4',
            title: 'Configure Microsoft Defender for Cloud plans, auto-provisioning, and workflow automation',
            keywords: ['Defender for Cloud', 'Workflow automation', 'Security alerts', 'Regulatory compliance', 'Defender for Servers'],
          },
        ],
      },
    ],
  },
  {
    id: 2,
    title: 'Respond to security incidents',
    weightMin: 35,
    weightMax: 40,
    normalizedWeight: 0.375,
    description:
      'Triage, investigate, contain, and remediate cross-domain incidents across endpoints, identities, email, cloud apps, Microsoft Purview, and Microsoft Sentinel, including AI-assisted investigations.',
    topics: [
      {
        id: 'd2-t1',
        domainId: 2,
        code: '2.1',
        title: 'Investigate and remediate incidents in Microsoft Defender XDR, Office 365, Identity, and Cloud Apps',
        description:
          'Triage unified incidents, analyze attack graphs, investigate phishing/malicious attachments in Defender for Office 365, identity compromises in Entra ID and Defender for Identity, and shadow IT/OAuth apps in Defender for Cloud Apps.',
        officialUrl:
          'https://learn.microsoft.com/en-us/defender-xdr/investigate-incidents',
        lastVerifiedDate: SYLLABUS_LAST_VERIFIED_DEFAULT,
        subtopics: [
          {
            id: 'd2-t1-s1',
            title: 'Triage and investigate unified incidents, attack stories, alerts, and assets in Microsoft Defender XDR',
            keywords: ['Incident graph', 'Attack story', 'Alert queue', 'Classification', 'Assign incident'],
          },
          {
            id: 'd2-t1-s2',
            title: 'Investigate email threats, Threat Explorer, Email Entity page, ZAP, and Submissions in Defender for Office 365',
            keywords: ['Threat Explorer', 'Zero-hour auto purge (ZAP)', 'Safe Links', 'Safe Attachments', 'Soft delete'],
          },
          {
            id: 'd2-t1-s3',
            title: 'Investigate compromised identities across Microsoft Entra ID Protection and Defender for Identity',
            keywords: ['Risky users', 'Risky sign-ins', 'Lateral movement paths', 'Pass-the-Hash', 'Confirm user compromised'],
          },
          {
            id: 'd2-t1-s4',
            title: 'Investigate cloud app activity, OAuth app permissions, and session/activity policies in Defender for Cloud Apps',
            keywords: ['Activity log', 'OAuth app governance', 'Impossible travel', 'Ransomware activity policy', 'App connectors'],
          },
        ],
      },
      {
        id: 'd2-t2',
        domainId: 2,
        code: '2.2',
        title: 'Respond to endpoint threats, Automated Investigation (AIR), and Attack Disruption',
        description:
          'Use device timelines, Live Response, investigation packages, device isolation, Action Center, Automated Investigation and Response (AIR), and Automatic Attack Disruption.',
        officialUrl:
          'https://learn.microsoft.com/en-us/defender-endpoint/respond-machine-alerts',
        lastVerifiedDate: SYLLABUS_LAST_VERIFIED_DEFAULT,
        subtopics: [
          {
            id: 'd2-t2-s1',
            title: 'Analyze device timelines, process trees, and collect investigation packages in Defender for Endpoint',
            keywords: ['Device timeline', 'Collect investigation package', 'Isolate device', 'Restrict app execution'],
          },
          {
            id: 'd2-t2-s2',
            title: 'Execute Live Response commands (getfile, putfile, run, remediation, library scripts)',
            keywords: ['Live Response', 'library', 'putfile', 'run', 'remediate file', 'Unsigned script setting'],
          },
          {
            id: 'd2-t2-s3',
            title: 'Manage Automated Investigation and Response (AIR), Action Center pending/history, and Automatic Attack Disruption',
            keywords: ['Action Center', 'Pending actions', 'Automatic attack disruption', 'Contain user', 'Disable user'],
            isNewOrUpdated2025: true,
          },
        ],
      },
      {
        id: 'd2-t3',
        domainId: 2,
        code: '2.3',
        title: 'Investigate activities using Microsoft Purview Audit, eDiscovery, and Microsoft Graph Logs',
        description:
          'Search unified audit logs in Microsoft Purview Audit (Standard and Premium), execute Content Search in eDiscovery, and analyze Microsoft Graph activity logs for API-driven attacks.',
        officialUrl:
          'https://learn.microsoft.com/en-us/purview/audit-solutions-overview',
        lastVerifiedDate: SYLLABUS_LAST_VERIFIED_DEFAULT,
        subtopics: [
          {
            id: 'd2-t3-s1',
            title: 'Investigate user and admin actions with Microsoft Purview Audit (MailItemsAccessed, Send, SearchQueryInitiated)',
            keywords: ['Purview Audit', 'Audit (Standard)', 'Audit (Premium)', 'MailItemsAccessed', 'Audit retention policies'],
          },
          {
            id: 'd2-t3-s2',
            title: 'Perform Content Search and eDiscovery investigations across Exchange, SharePoint, OneDrive, and Teams',
            keywords: ['Content Search', 'KeyQL', 'eDiscovery', 'Hold', 'Export search results'],
          },
          {
            id: 'd2-t3-s3',
            title: 'Investigate suspicious application and token abuse using Microsoft Graph Activity Logs',
            keywords: ['MicrosoftGraphActivityLogs', 'ServicePrincipalRiskEvents', 'OAuth token abuse', 'AppId correlation'],
            isNewOrUpdated2025: true,
          },
        ],
      },
      {
        id: 'd2-t4',
        domainId: 2,
        code: '2.4',
        title: 'Manage incident response in Microsoft Sentinel and AI-assisted Security Copilot investigations',
        description:
          'Investigate incidents in Sentinel using investigation graphs, entity timelines, tasks, and comments, and leverage Microsoft Security Copilot and agentic AI for incident summarization, KQL translation, and script analysis.',
        officialUrl:
          'https://learn.microsoft.com/en-us/azure/sentinel/investigate-cases',
        lastVerifiedDate: SYLLABUS_LAST_VERIFIED_DEFAULT,
        subtopics: [
          {
            id: 'd2-t4-s1',
            title: 'Triage and investigate incidents in Microsoft Sentinel (Investigation graph, entities, tasks, watchlists)',
            keywords: ['Investigation graph', 'Incident tasks', 'Watchlists', 'SearchKey', 'Entity behavior (UEBA)'],
          },
          {
            id: 'd2-t4-s2',
            title: 'Accelerate incident response using Microsoft Security Copilot and agentic AI capabilities',
            keywords: ['Microsoft Security Copilot', 'Incident summary', 'Guided response', 'Script analysis', 'Promptbooks', 'Agentic AI'],
            isNewOrUpdated2025: true,
          },
        ],
      },
    ],
  },
  {
    id: 3,
    title: 'Perform threat hunting',
    weightMin: 20,
    weightMax: 25,
    normalizedWeight: 0.20,
    description:
      'Write and optimize KQL queries for Advanced Hunting and Microsoft Sentinel, create custom detection rules, interpret Threat Analytics, and use hunting graphs, blast radius, KQL jobs, summary rules, notebooks, and Sentinel MCP Server.',
    topics: [
      {
        id: 'd3-t1',
        domainId: 3,
        code: '3.1',
        title: 'KQL fundamentals, Advanced Hunting tables, and Custom Detection Rules',
        description:
          'Select appropriate Defender XDR Advanced Hunting and Sentinel tables, write KQL with filtering, joins, mv-expand, summarize, and time windows, optimize queries, and build custom detection rules.',
        officialUrl:
          'https://learn.microsoft.com/en-us/defender-xdr/advanced-hunting-overview',
        lastVerifiedDate: SYLLABUS_LAST_VERIFIED_DEFAULT,
        subtopics: [
          {
            id: 'd3-t1-s1',
            title: 'Select and query Defender XDR Advanced Hunting tables (DeviceProcessEvents, EmailEvents, IdentityLogonEvents, CloudAppEvents, AlertInfo, AlertEvidence)',
            keywords: ['DeviceProcessEvents', 'DeviceNetworkEvents', 'EmailEvents', 'EmailAttachmentInfo', 'AlertInfo', 'AlertEvidence'],
          },
          {
            id: 'd3-t1-s2',
            title: 'Write and optimize KQL queries (where, extend, project, summarize, arg_max, mv-expand, join kinds, let, bin, ago)',
            keywords: ['where', 'summarize', 'mv-expand', 'join kind=inner', 'join kind=leftanti', 'arg_max', 'bin()', 'has_any'],
          },
          {
            id: 'd3-t1-s3',
            title: 'Create and manage Custom Detection Rules from Advanced Hunting queries (Timestamp, ReportId, impacted entities)',
            keywords: ['Custom detection rules', 'Timestamp', 'ReportId', 'DeviceId', 'AccountObjectId', 'NRT frequency'],
          },
        ],
      },
      {
        id: 'd3-t2',
        domainId: 3,
        code: '3.2',
        title: 'Threat Analytics, Hunting Queries, Bookmarks, Sentinel Graph, and Advanced Hunting Capabilities',
        description:
          'Interpret Threat Analytics reports, run Sentinel hunting queries, bookmarks, and livestreams, analyze blast radius with Sentinel Graph, and use KQL jobs, summary rule tables, notebooks, and Sentinel MCP Server.',
        officialUrl:
          'https://learn.microsoft.com/en-us/azure/sentinel/hunting',
        lastVerifiedDate: SYLLABUS_LAST_VERIFIED_DEFAULT,
        subtopics: [
          {
            id: 'd3-t2-s1',
            title: 'Interpret Microsoft Defender XDR Threat Analytics reports, exposure posture, and mitigation recommendations',
            keywords: ['Threat Analytics', 'Analyst report', 'Impacted assets', 'Prevented email attempts', 'Secure Score exposure'],
          },
          {
            id: 'd3-t2-s2',
            title: 'Perform proactive hunting in Microsoft Sentinel using Hunting Queries, Bookmarks, and Livestreams',
            keywords: ['Hunting bookmarks', 'Livestream', 'Promote bookmark to incident', 'Hunting metrics'],
          },
          {
            id: 'd3-t2-s3',
            title: 'Analyze entity relationships and blast radius using Hunting Graphs and Sentinel Graph',
            keywords: ['Sentinel Graph', 'Blast radius', 'Attack path analysis', 'Hunting graph'],
            isNewOrUpdated2025: true,
          },
          {
            id: 'd3-t2-s4',
            title: 'Use KQL jobs, summary rule tables, Azure Machine Learning Notebooks (MSTICPy), and Sentinel MCP Server',
            keywords: ['KQL jobs', 'Summary rules', 'Search jobs', 'Jupyter Notebooks', 'MSTICPy', 'Sentinel MCP Server'],
            isNewOrUpdated2025: true,
          },
        ],
      },
    ],
  },
];
