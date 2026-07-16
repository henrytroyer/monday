import EmailBodyContent from './EmailBodyContent';
import { normalizeNoteBodyForDisplay } from '../../utils/formatMondayNoteBody';
import { renderFormattedEmailBody } from '../../utils/formatEmailBody';

interface NoteBodyContentProps {
  body: string;
  bodyHtml?: string;
}

export default function NoteBodyContent({ body, bodyHtml }: NoteBodyContentProps) {
  if (bodyHtml?.trim()) {
    return (
      <div className="note-body-content text-sm text-crm-text">
        <EmailBodyContent body={body} bodyHtml={bodyHtml} />
      </div>
    );
  }

  const displayBody = normalizeNoteBodyForDisplay(body);

  return (
    <div className="note-body-content email-body-content email-body-content--plain text-sm text-crm-text">
      {renderFormattedEmailBody(displayBody)}
    </div>
  );
}
