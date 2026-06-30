import { useMemo, useState } from 'react';

interface VolunteerStatusSelectProps {
  volunteerId: string;
  value: string;
  options: readonly string[];
  onChange: (volunteerId: string, newStatus: string) => void | Promise<void>;
  disabled?: boolean;
}

export default function VolunteerStatusSelect({
  volunteerId,
  value,
  options,
  onChange,
  disabled = false,
}: VolunteerStatusSelectProps) {
  const [saving, setSaving] = useState(false);

  const selectOptions = useMemo(() => {
    const merged = new Set(options);
    if (value.trim()) merged.add(value);
    return Array.from(merged);
  }, [options, value]);

  const handleChange = async (newStatus: string) => {
    if (newStatus === value || saving || disabled) return;

    setSaving(true);
    try {
      await onChange(volunteerId, newStatus);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <select
        aria-label="Application status"
        value={value}
        disabled={disabled || saving}
        onChange={(e) => void handleChange(e.target.value)}
        className="max-w-[11rem] cursor-pointer truncate rounded-full border-0 bg-crm-white px-3 py-1 text-sm text-crm-text outline-none ring-1 ring-crm-taupe/20 transition hover:ring-crm-taupe/40 focus:ring-2 focus:ring-crm-slate/30 disabled:cursor-wait disabled:opacity-60"
      >
        {selectOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
