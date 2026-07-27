import type { EmailTemplate } from '../data/emailTemplates';
import {
  EMAIL_TEMPLATES,
  getCrmEmailTemplates,
  getSupermailMinedAt,
  getSupermailMinedTemplates,
} from '../data/emailTemplates';

export function getEmailTemplateSourceLabel(
  source: EmailTemplate['source'],
): string {
  if (source === 'supermail') return 'SuperMail';
  return 'CRM';
}

export function groupEmailTemplates(): {
  crm: EmailTemplate[];
  supermail: EmailTemplate[];
} {
  return {
    crm: getCrmEmailTemplates(),
    supermail: getSupermailMinedTemplates(),
  };
}

export function formatEmailTemplateOptionLabel(template: EmailTemplate): string {
  if (template.source === 'supermail') {
    return `${template.name} (SuperMail)`;
  }
  return template.name;
}

export { EMAIL_TEMPLATES, getSupermailMinedAt };
