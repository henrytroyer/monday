import type { FinancialRecord } from '../types/contact';
import { buildMailtoUrl, mergeEmailTemplate } from './emailMerge';
import { getYearEndTaxReceiptTemplate } from '../data/emailTemplates';

const ORGANIZATION_NAME = 'Field Ministry Partners';
const ORGANIZATION_EIN = '12-3456789';
const ORGANIZATION_ADDRESS = '123 Ministry Way, Portland, OR 97201';

function parseRecordDate(display: string): Date {
  return new Date(display);
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function firstName(name: string): string {
  const stripped = name.replace(/^Rev\.\s+/i, '').trim();
  return stripped.split(/\s+/)[0] ?? name;
}

export function paidDonationsForYear(
  records: FinancialRecord[],
  year: string,
): FinancialRecord[] {
  const yearNum = Number(year);
  return records.filter(
    (record) =>
      record.isPaid !== false &&
      parseRecordDate(record.date).getFullYear() === yearNum,
  );
}

export function buildYearEndDonationReceipt(
  contactName: string,
  year: string,
  records: FinancialRecord[],
): { subject: string; body: string; total: number; currency: string } | null {
  const paid = paidDonationsForYear(records, year);
  if (paid.length === 0) return null;

  const currency = paid[0]?.currency ?? 'USD';
  const total = paid.reduce((sum, record) => sum + record.amount, 0);
  const donationLines = [...paid]
    .sort(
      (a, b) =>
        parseRecordDate(a.date).getTime() - parseRecordDate(b.date).getTime(),
    )
    .map(
      (record) =>
        `  ${record.date} — ${record.description}: ${formatMoney(record.amount, record.currency)}`,
    )
    .join('\n');

  const template = getYearEndTaxReceiptTemplate();
  const merged = mergeEmailTemplate(template.subject, template.body, {
    name: contactName,
    firstName: firstName(contactName),
    taxYear: year,
    totalAmount: formatMoney(total, currency),
    donationLines,
    organizationName: ORGANIZATION_NAME,
    organizationEin: ORGANIZATION_EIN,
    organizationAddress: ORGANIZATION_ADDRESS,
  });

  return {
    subject: merged.subject,
    body: merged.body,
    total,
    currency,
  };
}

export function buildYearEndDonationReceiptMailto(
  contactName: string,
  contactEmail: string,
  year: string,
  records: FinancialRecord[],
): string | null {
  const email = contactEmail.trim();
  if (!email || email === '—') return null;

  const receipt = buildYearEndDonationReceipt(contactName, year, records);
  if (!receipt) return null;

  return buildMailtoUrl(contactEmail, receipt.subject, receipt.body);
}
