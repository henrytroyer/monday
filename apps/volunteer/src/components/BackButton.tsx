export function BackButton({
  onClick,
  label,
  className,
}: {
  onClick: () => void;
  /** Shown beside the arrow. Omitted on screens that stay icon-only. */
  label?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label ?? 'Back'}
      className={`-ml-2 flex h-11 shrink-0 items-center rounded-full text-crm-heading transition hover:bg-crm-surface ${
        label ? 'gap-1 pr-3 pl-2.5' : 'w-11 justify-center'
      } ${className ?? 'mb-3'}`}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
        <path
          fill="currentColor"
          d="M14.7 5.3a1 1 0 0 1 0 1.4L9.42 12l5.3 5.3a1 1 0 1 1-1.42 1.4l-6-6a1 1 0 0 1 0-1.4l6-6a1 1 0 0 1 1.42 0z"
        />
      </svg>
      {label ? <span className="text-sm font-semibold">{label}</span> : null}
    </button>
  );
}
