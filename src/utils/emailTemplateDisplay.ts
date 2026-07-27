import type { MinedEmailTemplate } from '../types/emailTemplate';
import { MOCK_EMAIL_TEMPLATES } from '../data/emailTemplates';
import { SUPERMAIL_MINED_TEMPLATES } from '../data/supermailTemplates.mined';

export type EmailTemplateWithSource = {
  id: string;
  name: string;
  subject: string;
  body: string;
  source?: 'crm' | 'supermail';
  minedAt?: string;
  sendCount?: number;
};

export function getEmailTemplateSourceLabel(
  source?: EmailTemplateWithSource['source'],
): string {
  if (source === 'supermail') return 'SuperMail';
  return 'CRM';
}

export function getCrmEmailTemplates(): EmailTemplateWithSource[] {
  return MOCK_EMAIL_TEMPLATES.map((template) => ({
    id: template.id,
    name: template.name,
    subject: template.subject,
    body: template.body,
    source: 'crm' as const,
  }));
}

export function getSupermailMinedTemplates(): MinedEmailTemplate[] {
  return SUPERMAIL_MINED_TEMPLATES.map((template) => ({
    ...template,
    minedAt: template.minedAt ?? '',
    sendCount: template.sendCount ?? 0,
  }));
}

export function getSupermailMinedAt(): string | undefined {
  return SUPERMAIL_MINED_TEMPLATES[0]?.minedAt;
}

export function groupEmailTemplates(): {
  crm: EmailTemplateWithSource[];
  supermail: MinedEmailTemplate[];
} {
  return {
    crm: getCrmEmailTemplates(),
    supermail: getSupermailMinedTemplates(),
  };
}

export function formatEmailTemplateOptionLabel(
  template: EmailTemplateWithSource | MinedEmailTemplate,
): string {
  if ('source' in template && template.source === 'supermail') {
    return `${template.name} (SuperMail)`;
  }
  return template.name;
}

export const EMAIL_TEMPLATES: EmailTemplateWithSource[] = getCrmEmailTemplates();
