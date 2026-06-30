import type { VolunteerFile } from '../types/volunteer';

const MOCK_PDF_URL =
  'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

export function mockFiles(seed: string): VolunteerFile[] {
  return [
    {
      id: `${seed}-itinerary`,
      name: 'Itinerary.pdf',
      isImage: false,
      url: MOCK_PDF_URL,
    },
    {
      id: `${seed}-passport`,
      name: 'Passport.pdf',
      isImage: false,
      url: MOCK_PDF_URL,
    },
    {
      id: `${seed}-background`,
      name: 'Background-check.pdf',
      isImage: false,
      url: MOCK_PDF_URL,
    },
    {
      id: `${seed}-safeguarding`,
      name: 'Child-safeguarding-certificate.pdf',
      isImage: false,
      url: MOCK_PDF_URL,
    },
    {
      id: `${seed}-reference`,
      name: 'Pastor-reference.pdf',
      isImage: false,
      url: MOCK_PDF_URL,
    },
    {
      id: `${seed}-application`,
      name: 'Application-form.pdf',
      isImage: false,
      url: MOCK_PDF_URL,
    },
  ];
}
