/** Email compose draft types — attachments, signatures, CC/BCC. */

export interface EmailDraftAttachment {
  id: string;
  file: File;
  name: string;
  size: number;
  type: string;
}

export interface EmailSignature {
  id: string;
  name: string;
  html: string;
  isDefault: boolean;
}

export interface EmailComposeMeta {
  cc: string;
  bcc: string;
  replyTo: string;
}

export const EMPTY_COMPOSE_META: EmailComposeMeta = {
  cc: '',
  bcc: '',
  replyTo: '',
};
