export interface EmailTemplate {
  /** monday.com item id */
  id: string;
  /** Stable slug used in send flows (Template ID column) */
  templateId: string;
  name: string;
  subject: string;
  body: string;
}

export type EmailTemplateInput = Pick<
  EmailTemplate,
  'name' | 'subject' | 'body' | 'templateId'
>;

/** Output from SuperMail mining before seeding to monday board */
export interface MinedEmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  source: 'supermail';
  minedAt: string;
  sendCount: number;
}
