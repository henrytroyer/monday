import type { ApplicationFormField } from '../types/volunteer';

export const MOCK_APPLICATION_FORM_FIELDS: ApplicationFormField[] = [
  {
    id: 'mock-q-dob',
    question: 'Date of birth',
    answer: 'March 14, 2001',
  },
  {
    id: 'mock-q-citizenship',
    question: 'Citizenship',
    answer: 'United States',
  },
  {
    id: 'mock-q-church',
    question: 'Home church',
    answer: 'Grace Community Church, Portland OR',
  },
  {
    id: 'mock-q-experience',
    question: 'Previous missions or volunteer experience',
    answer:
      'Two-week outreach in Athens (2024); local refugee ministry monthly since 2023.',
  },
  {
    id: 'mock-q-languages',
    question: 'Languages spoken',
    answer: 'English (native), conversational Greek',
  },
  {
    id: 'mock-q-health',
    question: 'Health conditions we should know about',
    answer: 'None',
  },
  {
    id: 'mock-q-emergency',
    question: 'Emergency contact',
    answer: 'Jane Doe (mother) — +1 (555) 201-4402',
  },
];

export const MOCK_PASTOR_REFERENCE_FORM_FIELDS: ApplicationFormField[] = [
  {
    id: 'mock-p-pastor-name',
    question: 'Pastor name',
    answer: 'Rev. Michael Thompson',
  },
  {
    id: 'mock-p-church',
    question: 'Pastor church',
    answer: 'Grace Community Church',
  },
  {
    id: 'mock-p-relationship',
    question: 'How long have you known the applicant?',
    answer: '4 years — member of our youth and missions team',
  },
  {
    id: 'mock-p-character',
    question: 'Character and spiritual maturity',
    answer:
      'John demonstrates consistent faithfulness, humility, and readiness to serve cross-culturally.',
  },
  {
    id: 'mock-p-recommend',
    question: 'Would you recommend this applicant?',
    answer: 'Yes, without reservation',
  },
];

export const MOCK_APPLICATION_FORM_FIELDS_RACHEL: ApplicationFormField[] = [
  {
    id: 'mock-r-dob',
    question: 'Date of birth',
    answer: 'August 2, 2002',
  },
  {
    id: 'mock-r-citizenship',
    question: 'Citizenship',
    answer: 'Germany',
  },
  {
    id: 'mock-r-church',
    question: 'Home church',
    answer: 'Berlin International Church',
  },
  {
    id: 'mock-r-experience',
    question: 'Previous missions or volunteer experience',
    answer: 'University refugee tutoring program (1 year)',
  },
];

export const MOCK_PASTOR_REFERENCE_FORM_FIELDS_RACHEL: ApplicationFormField[] = [
  {
    id: 'mock-r-p-pastor',
    question: 'Pastor name',
    answer: 'Pastor Andreas Weber',
  },
  {
    id: 'mock-r-p-church',
    question: 'Pastor church',
    answer: 'Berlin International Church',
  },
  {
    id: 'mock-r-p-recommend',
    question: 'Would you recommend this applicant?',
    answer: 'Yes',
  },
];
