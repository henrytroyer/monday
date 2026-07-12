import type { EmailCorrespondenceSource } from '../../types/contact';

const sourceStyles: Record<EmailCorrespondenceSource, string> = {
  application: 'rounded-full bg-crm-indigo px-2.5 py-0.5 text-xs font-medium text-white',
  recruitment:
    'rounded-full bg-crm-terracotta px-2.5 py-0.5 text-xs font-medium text-white',
  general:
    'rounded-full bg-crm-taupe/30 px-2.5 py-0.5 text-xs font-medium text-crm-heading',
};

interface EmailSourceBadgeProps {
  source: EmailCorrespondenceSource;
  label: string;
}

export default function EmailSourceBadge({ source, label }: EmailSourceBadgeProps) {
  return (
    <span className={sourceStyles[source]} title={`Source: ${label}`}>
      {label}
    </span>
  );
}
