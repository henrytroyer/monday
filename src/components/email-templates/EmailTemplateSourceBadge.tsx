import type { EmailTemplate } from '../../data/emailTemplates';
import { getEmailTemplateSourceLabel } from '../../utils/emailTemplateDisplay';

interface EmailTemplateSourceBadgeProps {
  source?: EmailTemplate['source'];
}

export default function EmailTemplateSourceBadge({
  source,
}: EmailTemplateSourceBadgeProps) {
  const label = getEmailTemplateSourceLabel(source);
  const isSupermail = source === 'supermail';

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
        isSupermail
          ? 'bg-violet-100 text-violet-800'
          : 'bg-crm-taupe-100 text-crm-slate'
      }`}
    >
      {label}
    </span>
  );
}
