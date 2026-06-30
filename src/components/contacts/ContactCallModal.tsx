import { useEffect } from 'react';
import OverlayBackButton from '../layout/OverlayBackButton';
import { formatPhoneE164, formatPhoneTelHref } from '../../utils/phoneFormat';

interface ContactCallModalProps {
  contactName: string;
  phone: string;
  onClose: () => void;
}

export default function ContactCallModal({
  contactName,
  phone,
  onClose,
}: ContactCallModalProps) {
  const telHref = formatPhoneTelHref(phone) ?? '#';
  const whatsappHref = buildWhatsAppUrl(phone);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="contact-call-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/25 backdrop-blur-sm"
        aria-label={`Back to ${contactName}`}
        onClick={onClose}
      />

      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-crm-taupe/20 bg-crm-surface shadow-2xl">
        <div className="border-b border-crm-taupe/20 px-5 py-4">
          <OverlayBackButton backLabel={contactName} onBack={onClose} />
          <h2
            id="contact-call-title"
            className="mt-3 text-lg font-semibold text-crm-heading"
          >
            Call {contactName}
          </h2>
          <p className="mt-1 text-sm text-crm-slate">{phone}</p>
        </div>

        <ul className="space-y-2 p-4">
          <li>
            <a
              href={telHref}
              className="flex items-center gap-4 rounded-xl border border-crm-taupe/20 px-4 py-3 transition hover:border-crm-taupe/28 hover:bg-crm-taupe-50"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-crm-white text-crm-text">
                <PhoneIcon />
              </span>
              <span>
                <span className="block font-medium text-crm-heading">
                  Phone call
                </span>
                <span className="text-sm text-crm-slate">
                  Use your cell service or default phone app
                </span>
              </span>
            </a>
          </li>
          <li>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 rounded-xl border border-crm-taupe/20 px-4 py-3 transition hover:border-emerald-300 hover:bg-emerald-50/50"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <WhatsAppIcon />
              </span>
              <span>
                <span className="block font-medium text-crm-heading">
                  WhatsApp
                </span>
                <span className="text-sm text-crm-slate">
                  Open a WhatsApp call or chat
                </span>
              </span>
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}

function buildWhatsAppUrl(phone: string): string {
  const digits = formatPhoneE164(phone);
  return digits ? `https://wa.me/${digits}` : '#';
}

function PhoneIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
      />
    </svg>
  );
}

function WhatsAppIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
