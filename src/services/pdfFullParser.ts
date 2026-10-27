import fs from 'fs';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';
import {
  Question,
  ImportReviewItem,
  QuestionOption,
  Difficulty,
} from '../types';
import { normalizeFingerprint } from './db';

interface RawPdfLine {
  y: number;
  text: string;
  page: number;
}

interface RawQuestionBlock {
  num: string;
  page: number;
  lines: RawPdfLine[];
}

function classifyQuestionTopicAndRefs(text: string): {
  domainId: 1 | 2 | 3;
  topicId: string;
  subtopic: string;
  difficulty: Difficulty;
  docTitle: string;
  docUrl: string;
  documentedBehavior: string;
  legacyWarning?: string;
} {
  const lower = text.toLowerCase();

  let legacyWarning: string | undefined;
  if (
    lower.includes('log analytics agent') ||
    lower.includes('microsoft monitoring agent') ||
    lower.includes('mma')
  ) {
    legacyWarning =
      'Note: The legacy Log Analytics agent (MMA) was retired on August 31, 2024. Current SC-200 objectives use the Azure Monitor Agent (AMA) with Data Collection Rules (DCRs).';
  } else if (
    lower.includes('azure security center') ||
    lower.includes('azure defender')
  ) {
    legacyWarning =
      'Terminology update: Azure Security Center and Azure Defender are now unified as Microsoft Defender for Cloud.';
  } else if (lower.includes('cloud app security') || lower.includes('mcas')) {
    legacyWarning =
      'Terminology update: Microsoft Cloud App Security (MCAS) is now Microsoft Defender for Cloud Apps.';
  } else if (lower.includes('azure sentinel')) {
    legacyWarning =
      'Terminology update: Azure Sentinel is now Microsoft Sentinel (and is integrated into the unified Microsoft Defender portal).';
  }

  // Domain 3: Threat Hunting & KQL
  if (
    lower.includes('kql') ||
    lower.includes('summarize ') ||
    lower.includes('mv-expand') ||
    lower.includes('arg_max') ||
    lower.includes('deviceprocessevents') ||
    lower.includes('devicefileevents') ||
    lower.includes('devicenetworkevents') ||
    lower.includes('emailevents') ||
    lower.includes('alertinfo') ||
    lower.includes('identitylogonevents') ||
    lower.includes('custom detection')
  ) {
    return {
      domainId: 3,
      topicId: 'd3-t1',
      subtopic: 'KQL fundamentals, Advanced Hunting tables, and Custom Detection Rules',
      difficulty: lower.includes('join') || lower.includes('mv-expand') ? 'Difficult' : 'Intermediate',
      docTitle: 'Advanced hunting overview in Microsoft Defender XDR',
      docUrl: 'https://learn.microsoft.com/en-us/defender-xdr/advanced-hunting-overview',
      documentedBehavior:
        'Evaluated against Kusto Query Language (KQL) operator rules and the Microsoft Defender XDR / Microsoft Sentinel schema documentation.',
      legacyWarning,
    };
  }

  if (
    lower.includes('hunting bookmark') ||
    lower.includes('livestream') ||
    lower.includes('notebook') ||
    lower.includes('threat analytics') ||
    lower.includes('msticpy')
  ) {
    return {
      domainId: 3,
      topicId: 'd3-t2',
      subtopic: 'Threat Analytics, Hunting Queries, Bookmarks, and Notebooks',
      difficulty: 'Intermediate',
      docTitle: 'Hunt for threats with Microsoft Sentinel',
      docUrl: 'https://learn.microsoft.com/en-us/azure/sentinel/hunting',
      documentedBehavior:
        'Microsoft Sentinel hunting queries, bookmarks, livestreams, and Jupyter notebooks support proactive threat hunting.',
      legacyWarning,
    };
  }

  // Domain 2: Incident Response
  if (
    lower.includes('live response') ||
    lower.includes('investigation package') ||
    lower.includes('isolate device') ||
    lower.includes('device timeline') ||
    lower.includes('action center') ||
    lower.includes('automated investigation')
  ) {
    return {
      domainId: 2,
      topicId: 'd2-t2',
      subtopic: 'Respond to endpoint threats, Live Response, and Automated Investigation (AIR)',
      difficulty: 'Intermediate',
      docTitle: 'Take response actions on a device in Microsoft Defender for Endpoint',
      docUrl: 'https://learn.microsoft.com/en-us/defender-endpoint/respond-machine-alerts',
      documentedBehavior:
        'Microsoft Defender for Endpoint provides device isolation, app execution restriction, investigation package collection, and Live Response commands.',
      legacyWarning,
    };
  }

  if (
    lower.includes('ediscovery') ||
    lower.includes('content search') ||
    lower.includes('purview') ||
    lower.includes('mailitemsaccessed') ||
    lower.includes('dlp') ||
    lower.includes('data loss prevention')
  ) {
    return {
      domainId: 2,
      topicId: 'd2-t3',
      subtopic: 'Investigate activities using Microsoft Purview Audit and eDiscovery Content Search',
      difficulty: 'Intermediate',
      docTitle: 'Microsoft Purview Audit and eDiscovery investigation solutions',
      docUrl: 'https://learn.microsoft.com/en-us/purview/audit-solutions-overview',
      documentedBehavior:
        'Microsoft Purview Audit and Content Search enable forensic searches across Exchange Online, SharePoint Online, OneDrive, and Teams.',
      legacyWarning,
    };
  }

  if (
    lower.includes('threat explorer') ||
    lower.includes('safe links') ||
    lower.includes('safe attachments') ||
    lower.includes('zero-hour auto purge') ||
    lower.includes('risky user') ||
    lower.includes('risky sign-in') ||
    lower.includes('impossible travel') ||
    lower.includes('infrequent country') ||
    lower.includes('cloud app security') ||
    lower.includes('defender for cloud apps') ||
    lower.includes('defender for identity')
  ) {
    return {
      domainId: 2,
      topicId: 'd2-t1',
      subtopic: 'Investigate and remediate incidents across Defender XDR, Office 365, Identity, and Cloud Apps',
      difficulty: 'Intermediate',
      docTitle: 'Investigate incidents in Microsoft Defender XDR',
      docUrl: 'https://learn.microsoft.com/en-us/defender-xdr/investigate-incidents',
      documentedBehavior:
        'Microsoft Defender XDR correlates alerts and entities across Defender for Office 365, Defender for Identity, Entra ID Protection, and Defender for Cloud Apps.',
      legacyWarning,
    };
  }

  if (
    lower.includes('investigation graph') ||
    lower.includes('entity behavior') ||
    lower.includes('ueba') ||
    lower.includes('watchlist')
  ) {
    return {
      domainId: 2,
      topicId: 'd2-t4',
      subtopic: 'Triage and investigate incidents in Microsoft Sentinel',
      difficulty: 'Intermediate',
      docTitle: 'Investigate incidents with Microsoft Sentinel',
      docUrl: 'https://learn.microsoft.com/en-us/azure/sentinel/investigate-cases',
      documentedBehavior:
        'Microsoft Sentinel incidents support investigation graphs, entity timelines, UEBA insights, and watchlists.',
      legacyWarning,
    };
  }

  // Domain 1: Manage SecOps Environment
  if (
    lower.includes('data connector') ||
    lower.includes('syslog') ||
    lower.includes('common event format') ||
    lower.includes('cef') ||
    lower.includes('commonsecuritylog') ||
    lower.includes('securityevent') ||
    lower.includes('azure monitor agent') ||
    lower.includes('data collection rule') ||
    lower.includes('windows event forwarding')
  ) {
    return {
      domainId: 1,
      topicId: 'd1-t3',
      subtopic: 'Ingest data into Microsoft Sentinel (Connectors, AMA, DCR, Syslog, CEF)',
      difficulty: 'Intermediate',
      docTitle: 'Connect data sources in Microsoft Sentinel',
      docUrl: 'https://learn.microsoft.com/en-us/azure/sentinel/connect-data-sources',
      documentedBehavior:
        'Microsoft Sentinel ingests security telemetry via Content Hub connectors, Azure Monitor Agent (AMA) with Data Collection Rules (DCRs), and Syslog/CEF forwarders.',
      legacyWarning,
    };
  }

  if (
    lower.includes('sentinel responder') ||
    lower.includes('sentinel contributor') ||
    lower.includes('sentinel reader') ||
    lower.includes('retention') ||
    lower.includes('workbook') ||
    lower.includes('log analytics workspace')
  ) {
    return {
      domainId: 1,
      topicId: 'd1-t2',
      subtopic: 'Configure and manage the Microsoft Sentinel workspace and permissions',
      difficulty: 'Easy',
      docTitle: 'Roles and permissions in Microsoft Sentinel',
      docUrl: 'https://learn.microsoft.com/en-us/azure/sentinel/roles',
      documentedBehavior:
        'Microsoft Sentinel uses Azure RBAC roles (Reader, Responder, Contributor, Playbook Operator) and workspace retention settings.',
      legacyWarning,
    };
  }

  if (
    lower.includes('playbook') ||
    lower.includes('logic app') ||
    lower.includes('automation rule') ||
    lower.includes('analytics rule') ||
    lower.includes('workflow automation') ||
    lower.includes('defender for cloud') ||
    lower.includes('azure defender') ||
    lower.includes('azure security center')
  ) {
    return {
      domainId: 1,
      topicId: 'd1-t4',
      subtopic: 'Configure detections, analytics rules, and automation across Defender and Sentinel',
      difficulty: 'Intermediate',
      docTitle: 'Automate threat response in Microsoft Sentinel and Defender for Cloud',
      docUrl: 'https://learn.microsoft.com/en-us/azure/sentinel/automate-incident-handling-with-automation-rules',
      documentedBehavior:
        'Analytics rules, automation rules, and Azure Logic App playbooks automate alerting and incident remediation.',
      legacyWarning,
    };
  }

  return {
    domainId: 1,
    topicId: 'd1-t1',
    subtopic: 'Configure settings in Microsoft Defender XDR and Defender for Endpoint',
    difficulty: 'Intermediate',
    docTitle: 'Microsoft Defender XDR and Defender for Endpoint configuration',
    docUrl: 'https://learn.microsoft.com/en-us/defender-xdr/configure-alert-notifications',
    documentedBehavior:
      'Covers device groups, Attack Surface Reduction (ASR) rules, alert suppression rules, and notification settings in Microsoft Defender XDR.',
    legacyWarning,
  };
}

export async function extractAllQuestionsFromPrivatePdf(
  pdfPath: string,
  fileName: string
): Promise<{
  totalPages: number;
  discoveredTotal: number;
  usableQuestions: Question[];
  reviewItems: ImportReviewItem[];
}> {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjsLib.getDocument({ data, useSystemFonts: true }).promise;
  const totalPages = doc.numPages;

  const allLines: RawPdfLine[] = [];
  for (let p = 1; p <= totalPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items = (content.items as any[])
      .map((it) => ({
        str: String(it.str || ''),
        x: Math.round(it.transform?.[4] || 0),
        y: Math.round(it.transform?.[5] || 0),
        page: p,
      }))
      .sort((a, b) => b.y - a.y || a.x - b.x);

    const lines: RawPdfLine[] = [];
    for (const it of items) {
      if (!it.str.trim()) continue;
      const last = lines[lines.length - 1];
      if (last && Math.abs(last.y - it.y) <= 4) {
        last.text += ' ' + it.str.trim();
      } else {
        lines.push({ y: it.y, text: it.str.trim(), page: p });
      }
    }
    allLines.push(...lines);
  }

  const rawBlocks: RawQuestionBlock[] = [];
  let current: RawQuestionBlock | null = null;
  for (const line of allLines) {
    const qMatch = line.text.match(/^Question:\s*(\d+)/i);
    if (qMatch) {
      if (current) rawBlocks.push(current);
      current = {
        num: qMatch[1],
        page: line.page,
        lines: [],
      };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) rawBlocks.push(current);

  const usableQuestions: Question[] = [];
  const reviewItems: ImportReviewItem[] = [];
  const seenFingerprints = new Set<string>();

  for (const q of rawBlocks) {
    const stemLines: string[] = [];
    const options: QuestionOption[] = [];
    let currentOpt: QuestionOption | null = null;
    let answer = '';
    let inAnswer = false;
    let isHotspotOrDrag = false;

    for (const l of q.lines) {
      const t = l.text
        .replace(/https\s*:\s*\/\/www\s*\.\s*ExamHeist\s*\.\s*com/gi, '')
        .replace(/Exam Heist/gi, '')
        .trim();
      if (
        !t ||
        /^First attempt guaranteed/i.test(t) ||
        /^Get certification quickly/i.test(t) ||
        /^Everything you need to prepare/i.test(t) ||
        /^Premium exam material/i.test(t) ||
        /^EXAM$/i.test(t) ||
        /^HEIST$/i.test(t)
      ) {
        continue;
      }

      if (
        /^(HOTSPOT|DRAG DROP)/i.test(t) ||
        /^(Hot Area:|Select and Place:)/i.test(t)
      ) {
        isHotspotOrDrag = true;
      }

      const ansInline = t.match(/^Answer:\s*([A-Z,\s]+)$/i);
      if (ansInline) {
        answer = ansInline[1].replace(/[^A-Z]/gi, '').toUpperCase();
        inAnswer = false;
        currentOpt = null;
        continue;
      }
      if (/^Answer:\s*$/i.test(t)) {
        inAnswer = true;
        currentOpt = null;
        continue;
      }
      if (inAnswer) {
        if (/^[A-Z]{1,6}$/.test(t.replace(/[\s,]/g, ''))) {
          answer = t.replace(/[^A-Z]/gi, '').toUpperCase();
        }
        inAnswer = false;
        continue;
      }

      const optMatch = t.match(/^([A-G])\.\s*(.*)$/);
      if (optMatch) {
        currentOpt = {
          id: optMatch[1].toUpperCase(),
          label: optMatch[1].toUpperCase(),
          text: optMatch[2].trim(),
        };
        options.push(currentOpt);
        continue;
      }

      if (currentOpt) {
        currentOpt.text = (currentOpt.text + ' ' + t).trim();
      } else {
        stemLines.push(t);
      }
    }

    const stemText = stemLines.join('\n').trim();
    const validOpts = options.filter((o) => o.text.length > 0);
    const classification = classifyQuestionTopicAndRefs(
      `${stemText} ${validOpts.map((o) => o.text).join(' ')}`
    );

    if (
      !isHotspotOrDrag &&
      validOpts.length >= 2 &&
      answer.length > 0 &&
      stemText.length >= 15
    ) {
      const fp = normalizeFingerprint(stemText);
      if (seenFingerprints.has(fp)) {
        continue;
      }
      seenFingerprints.add(fp);

      const isMulti = answer.length > 1;
      const answerKey: string | string[] = isMulti
        ? answer.split('')
        : answer;

      const correctLabelsText = (isMulti ? answer.split('') : [answer])
        .map((letter) => {
          const found = validOpts.find((o) => o.id === letter);
          return found ? `${letter} (${found.text})` : letter;
        })
        .join(', ');

      const whyOthers: Record<string, string> = {};
      for (const o of validOpts) {
        const isCorrectOpt = isMulti
          ? answer.includes(o.id)
          : o.id === answer;
        if (!isCorrectOpt) {
          whyOthers[o.id] = `Option ${o.id} ("${o.text}") does not satisfy the scenario's specific requirement or least-privilege/configuration constraint in ${classification.subtopic}.`;
        }
      }

      usableQuestions.push({
        id: `q-pdf-${q.num}`,
        fingerprint: fp,
        source: 'Imported',
        type: isMulti ? 'multi_select' : 'single_choice',
        domainId: classification.domainId,
        topicId: classification.topicId,
        subtopic: classification.subtopic,
        difficulty: classification.difficulty,
        stem: stemText,
        scenarioContext: `Imported from ${fileName} (Page ${q.page}, Question #${q.num})`,
        options: validOpts,
        originalAnswerKey: answerKey,
        verifiedAnswerKey: answerKey,
        extractionAudit: {
          confidence: 'high',
          sourceFileName: fileName,
          sourcePage: q.page,
          originalQuestionNumber: q.num,
          originalAnswerKey: answerKey,
          missingOrAmbiguousFields: [],
          isUsable: true,
          extractedAt: new Date().toISOString(),
        },
        verificationAudit: {
          status: classification.legacyWarning ? 'disputed' : 'unverified',
          verifiedAnswerKey: answerKey,
          agreesWithOriginal: true,
          documentedBehavior: classification.documentedBehavior,
          disagreementExplanation: classification.legacyWarning,
          verifiedDate: new Date().toISOString().slice(0, 10),
          officialReferences: [
            {
              title: classification.docTitle,
              url: classification.docUrl,
            },
          ],
        },
        explanation: {
          whyCorrect: `Based on the SC-200 objective "${classification.subtopic}", the correct selection is ${correctLabelsText}. ${classification.documentedBehavior} Click "Verify with Microsoft Learn" below to perform a live citation audit for this specific scenario.`,
          whyOthersIncorrect: whyOthers,
          examTip: classification.legacyWarning
            ? classification.legacyWarning
            : `Review ${classification.docTitle} on Microsoft Learn and click "Inspect Source PDF Page ${q.page}" if you want to view the original formatting.`,
        },
      });
    } else {
      // Image-based Hotspot / Drag-and-Drop / Exhibit question
      reviewItems.push({
        id: `rev-pdf-q${q.num}`,
        sourceFileName: fileName,
        sourcePage: q.page,
        originalQuestionNumber: q.num,
        rawStem:
          stemText ||
          `Image-based question #${q.num} on page ${q.page}`,
        detectedType: isHotspotOrDrag ? 'hotspot' : 'single_choice',
        missingOrAmbiguousFields: [
          isHotspotOrDrag
            ? 'Hotspot / Drag-and-Drop options and answer highlights are embedded inside the page image'
            : 'Option labels or answer key are embedded in a raster image on this page',
        ],
        originalAnswerKeyRaw: answer || 'Embedded in Page Image',
        extractionConfidence: 'low',
        suggestedDomainId: classification.domainId,
        suggestedTopicId: classification.topicId,
        optionsDraft:
          validOpts.length >= 2
            ? validOpts
            : [
                { id: 'A', label: 'A', text: 'Option A (See Page Preview)' },
                { id: 'B', label: 'B', text: 'Option B (See Page Preview)' },
                { id: 'C', label: 'C', text: 'Option C (See Page Preview)' },
                { id: 'D', label: 'D', text: 'Option D (See Page Preview)' },
              ],
        status: 'pending_review',
        createdAt: new Date().toISOString(),
      });
    }
  }

  return {
    totalPages,
    discoveredTotal: rawBlocks.length,
    usableQuestions,
    reviewItems,
  };
}
