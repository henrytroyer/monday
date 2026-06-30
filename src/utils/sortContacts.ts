import type { ContactListItem, ContactSortOption } from '../types/contact';

function compareByCreatedAt(
  a: ContactListItem,
  b: ContactListItem,
  order: 'asc' | 'desc',
): number {
  const aTime = a.createdAt ? Date.parse(a.createdAt) : Number.NaN;
  const bTime = b.createdAt ? Date.parse(b.createdAt) : Number.NaN;
  const aValid = !Number.isNaN(aTime);
  const bValid = !Number.isNaN(bTime);

  if (aValid && bValid) {
    return order === 'desc' ? bTime - aTime : aTime - bTime;
  }
  if (aValid) return -1;
  if (bValid) return 1;
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
}

export function sortContacts(
  contacts: ContactListItem[],
  sortBy: ContactSortOption,
): ContactListItem[] {
  const sorted = [...contacts];

  switch (sortBy) {
    case 'name-desc':
      sorted.sort((a, b) =>
        b.name.localeCompare(a.name, undefined, { sensitivity: 'base' }),
      );
      break;
    case 'date-desc':
      sorted.sort((a, b) => compareByCreatedAt(a, b, 'desc'));
      break;
    case 'date-asc':
      sorted.sort((a, b) => compareByCreatedAt(a, b, 'asc'));
      break;
    case 'name-asc':
    default:
      sorted.sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      );
      break;
  }

  return sorted;
}
