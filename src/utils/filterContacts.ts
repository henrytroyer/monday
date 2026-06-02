import type {
  ContactFilterState,
  ContactListItem,
  ContactTag,
} from '../types/contact';

export function hasActiveContactFilters(filters: ContactFilterState): boolean {
  return filters.searchQuery.trim().length > 0 || filters.tags.length > 0;
}

export function filterContacts(
  contacts: ContactListItem[],
  filters: ContactFilterState,
): ContactListItem[] {
  const query = filters.searchQuery.trim().toLowerCase();

  return contacts.filter((contact) => {
    if (query) {
      const haystack = `${contact.name} ${contact.email}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    if (filters.tags.length > 0) {
      const hasTag = filters.tags.some((tag) => contact.tags.includes(tag));
      if (!hasTag) return false;
    }

    return true;
  });
}

export function countMatchingContacts(
  contacts: ContactListItem[],
  filters: ContactFilterState,
): number {
  return filterContacts(contacts, filters).length;
}

export function toggleContactTag(
  selected: ContactTag[],
  tag: ContactTag,
): ContactTag[] {
  return selected.includes(tag)
    ? selected.filter((t) => t !== tag)
    : [...selected, tag];
}
