import type { ContactTag } from '../types/contact';

/** Profile card / list pill styling — Recruitment uses terracotta to stand out. */
export function contactTagPillClass(tag: ContactTag): string {
  if (tag === 'recruitment') {
    return 'rounded-full bg-crm-terracotta px-3 py-1 text-sm font-medium text-white';
  }
  return 'rounded-full bg-crm-indigo px-3 py-1 text-sm font-medium text-white';
}

/** Compact list row tag styling. */
export function contactTagListPillClass(tag: ContactTag): string {
  if (tag === 'recruitment') {
    return 'rounded-full bg-crm-terracotta px-2.5 py-0.5 text-xs font-medium text-white';
  }
  return 'rounded-full bg-crm-white px-2.5 py-0.5 text-xs font-medium text-crm-heading';
}

/** Filter chip when selected. */
export function contactTagFilterSelectedClass(tag: ContactTag): string {
  if (tag === 'recruitment') {
    return 'bg-crm-terracotta text-white font-medium ring-1 ring-crm-terracotta/30';
  }
  return 'bg-crm-indigo-50 text-crm-heading font-medium ring-1 ring-crm-indigo/10';
}
