import type { InputHTMLAttributes } from 'react';

export function TextField({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = props.id ?? props.name;
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-crm-heading" htmlFor={id}>
      {label}
      <input
        {...props}
        id={id}
        className="min-h-12 rounded-xl border border-sand bg-white px-3 py-3 text-base font-normal text-crm-text outline-none placeholder:text-crm-slate/70 focus:border-navy focus:ring-2 focus:ring-navy/15"
      />
    </label>
  );
}
