export const emailTemplateMap = {
  boardName:
    import.meta.env.VITE_EMAIL_TEMPLATES_BOARD_NAME || 'Email Templates',
  subject: import.meta.env.VITE_EMAIL_TEMPLATE_COL_SUBJECT || 'Subject',
  body: import.meta.env.VITE_EMAIL_TEMPLATE_COL_BODY || 'Body',
  templateId:
    import.meta.env.VITE_EMAIL_TEMPLATE_COL_TEMPLATE_ID || 'Template ID',
} as const;
