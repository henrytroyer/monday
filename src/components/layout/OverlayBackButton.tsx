interface OverlayBackButtonProps {
  backLabel: string;
  onBack: () => void;
  className?: string;
}

export default function OverlayBackButton({
  backLabel,
  onBack,
  className = '',
}: OverlayBackButtonProps) {
  return (
    <button
      type="button"
      onClick={onBack}
      className={`text-sm font-medium text-crm-slate transition hover:text-crm-heading ${className}`}
    >
      ← Back to {backLabel}
    </button>
  );
}
