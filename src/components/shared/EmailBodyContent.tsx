import { isLikelyHtmlBody, sanitizeEmailHtml } from '../../utils/sanitizeEmailHtml';
import { renderFormattedEmailBody } from '../../utils/formatEmailBody';

interface EmailBodyContentProps {
  body: string;
  bodyHtml?: string;
}

export default function EmailBodyContent({ body, bodyHtml }: EmailBodyContentProps) {
  const htmlSource = bodyHtml?.trim() || (isLikelyHtmlBody(body) ? body : '');
  const sanitizedHtml = htmlSource ? sanitizeEmailHtml(htmlSource) : '';

  if (sanitizedHtml) {
    return (
      <div
        className="email-body-content email-body-content--html"
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    );
  }

  return (
    <div className="email-body-content email-body-content--plain">
      {renderFormattedEmailBody(body)}
    </div>
  );
}
