export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'onboarding-welcome',
    name: 'Onboarding welcome',
    subject: 'Welcome to the team — {{name}}',
    body: `Hi {{firstName}},

Thank you for applying to serve with us on {{timelineLabel}} ({{locationPreference}}).

Your coordinator {{coordinator}} will be in touch soon with next steps.

Blessings,
Volunteer Coordination Team`,
  },
  {
    id: 'pastor-reference-request',
    name: 'Pastor reference request',
    subject: 'Reference request for {{name}}',
    body: `Hello,

We are processing {{name}}'s application to serve on {{timelineLabel}} and would appreciate your pastor reference at your earliest convenience.

If you have questions, please reply to this email.

Thank you,
Volunteer Coordination Team`,
  },
  {
    id: 'missing-documents',
    name: 'Missing documents',
    subject: 'Documents needed — {{name}}',
    body: `Hi {{firstName}},

We're reviewing your application and still need a few items. Please upload or send the outstanding documents as soon as possible.

Location preference: {{locationPreference}}
Term: {{timelineLabel}}

Thank you,
{{coordinator}}`,
  },
  {
    id: 'pre-arrival-reminder',
    name: 'Pre-arrival reminder',
    subject: 'Arrival details — {{timelineLabel}}',
    body: `Hi {{firstName}},

Your term begins soon. Please confirm your travel itinerary and that you have received housing details from your coordinator.

Coordinator: {{coordinator}}
Location: {{locationPreference}}

Safe travels,
Volunteer Coordination Team`,
  },
  {
    id: 'invoice-reminder',
    name: 'Invoice reminder',
    subject: 'Invoice reminder — {{name}}',
    body: `Hi {{firstName}},

This is a friendly reminder that we're still waiting for your program invoice payment before we can finalize onboarding.

Please let us know if you have any questions.

Thank you,
Volunteer Coordination Team`,
  },
  {
    id: 'reference-reminder',
    name: 'Reference reminder (to applicant)',
    subject: 'Reminder: {{referenceTypeLabel}} reference still needed',
    body: `Hi {{firstName}},

We're still waiting for your {{referenceTypeLabel}} reference for your long-term application. Please follow up with them and ask them to complete the form.

Thank you,
Volunteer Coordination Team`,
  },
  {
    id: 'parent-update',
    name: 'Parent update',
    subject: "Update on {{name}}'s application",
    body: `Hello,

We wanted to share a brief update on {{name}}'s volunteer application for {{timelineLabel}}.

Current status: {{status}}

If you have questions, please reply to this email.

Volunteer Coordination Team`,
  },
  {
    id: 'year-end-tax-receipt',
    name: 'Year-end tax receipt (USA)',
    subject: 'Your {{taxYear}} year-end charitable contribution statement',
    body: `Dear {{firstName}},

Thank you for your generous support of {{organizationName}}. This letter confirms your charitable contributions for U.S. federal income tax purposes for calendar year {{taxYear}}.

Contributions received in {{taxYear}}:
{{donationLines}}

Total charitable contributions ({{taxYear}}): {{totalAmount}}

No goods or services were provided in exchange for these contributions.

{{organizationName}}
EIN: {{organizationEin}}
{{organizationAddress}}

Please retain this statement for your tax records. If you have questions, reply to this email.

Blessings,
Development Team`,
  },
];

export function getEmailTemplateById(id: string): EmailTemplate | undefined {
  return EMAIL_TEMPLATES.find((t) => t.id === id);
}

export function getYearEndTaxReceiptTemplate(): EmailTemplate {
  return (
    getEmailTemplateById('year-end-tax-receipt') ?? {
      id: 'year-end-tax-receipt',
      name: 'Year-end tax receipt (USA)',
      subject: 'Your {{taxYear}} year-end charitable contribution statement',
      body: '',
    }
  );
}
