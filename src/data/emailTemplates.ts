import type { EmailTemplate } from '../types/emailTemplate';
import { COMMUNICATIONS_IMPORTED_TEMPLATES } from './communicationsDocs.imported';

/** Fallback templates for mock mode — synced from Communications docs via import script. */
export const MOCK_EMAIL_TEMPLATES: EmailTemplate[] =
  COMMUNICATIONS_IMPORTED_TEMPLATES.map((template) => ({
    id: template.id,
    templateId: template.id,
    name: template.name,
    subject: template.subject,
    body: template.body,
  }));

export function getEmailTemplateById(
  templates: EmailTemplate[],
  id: string,
): EmailTemplate | undefined {
  return templates.find((t) => t.id === id || t.templateId === id);
}

export function getYearEndTaxReceiptTemplate(
  templates: EmailTemplate[],
): EmailTemplate | undefined {
  return getEmailTemplateById(templates, 'year-end-tax-receipt');
}
