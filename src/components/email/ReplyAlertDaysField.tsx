interface ReplyAlertDaysFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

/** Staff choose how long a volunteer message can sit unanswered before it is flagged. */
export default function ReplyAlertDaysField({
  id,
  value,
  onChange,
}: ReplyAlertDaysFieldProps) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-crm-heading">
        Alert if no reply
      </label>
      <div className="mt-2 flex items-center gap-2">
        <input
          id={id}
          type="number"
          min={0}
          step={1}
          inputMode="numeric"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="—"
          className="w-24 rounded-xl border border-crm-taupe/20 bg-crm-white px-3 py-2 text-sm outline-none focus:border-crm-slate focus:ring-2 focus:ring-crm-taupe/20"
        />
        <span className="text-sm text-crm-slate">days without a response</span>
      </div>
      <p className="mt-1 text-xs text-crm-slate">
        Leave blank when no reply is needed. The volunteer portal flags this
        message once that many days pass without a response.
      </p>
    </div>
  );
}
