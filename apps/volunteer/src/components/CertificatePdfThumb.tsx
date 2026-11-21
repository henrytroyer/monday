/** The small PDF page shown on the Sterling and Kaya upload screens. */
export function CertificatePdfThumb({
  kaya = false,
  compact = false,
}: {
  kaya?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded border border-[#d7d7d7] bg-white shadow-sm ${compact ? 'h-11 w-8' : 'h-28 w-20'}`}
    >
      <div className="flex h-full flex-col justify-between bg-white p-1">
        <div className="space-y-1">
          <div className="h-0.5 w-full bg-[#e6e6e6]" />
          <div className="h-0.5 w-4/5 bg-[#e6e6e6]" />
          <div className="h-0.5 w-full bg-[#e6e6e6]" />
        </div>
        <p className={`text-[8px] font-bold tracking-wide ${kaya ? 'text-[#F76D36]' : 'text-[#ff4700]'}`}>
          PDF
        </p>
      </div>
    </div>
  );
}
