import type { EmailDraftAttachment } from '../../types/emailCompose';
import ProfessionalEmailComposer, {
  type EmailComposerMode,
} from './ProfessionalEmailComposer';

interface EmailComposePanelProps {
  subject: string;
  body: string;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  mergeContext?: Record<string, string>;
  disabled?: boolean;
  insertMode?: 'token' | 'value';
  mode?: EmailComposerMode;
  attachments?: EmailDraftAttachment[];
  onAttachmentsChange?: (attachments: EmailDraftAttachment[]) => void;
  cc?: string;
  bcc?: string;
  onCcChange?: (value: string) => void;
  onBccChange?: (value: string) => void;
  layout?: 'split' | 'stacked';
}

export default function EmailComposePanel(props: EmailComposePanelProps) {
  return (
    <ProfessionalEmailComposer
      {...props}
      layout={props.layout ?? (props.mode === 'template' ? 'stacked' : 'split')}
      showExtendedHeaders={props.mode !== 'template'}
    />
  );
}
