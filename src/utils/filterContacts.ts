import type {
  ContactFilterState,
  ContactListItem,
  ContactTag,
} from '../types/contact';

export function hasActiveContactFilters(filters: ContactFilterState): boolean {
  return (
    filters.searchQuery.trim().length > 0 ||
    filters.tags.length > 0 ||
    filters.sortBy !== 'name-asc'
  );
}

export function filterContacts(
  contacts: ContactListItem[],
  filters: ContactFilterState,
): ContactListItem[] {
  const query = filters.searchQuery.trim().toLowerCase();

  return contacts.filter((contact) => {
    if (query) {
      const haystack = [
        contact.name,
        contact.email,
        contact.altEmail,
        contact.phone,
        contact.spouseName,
        contact.connectedTo,
        contact.pastorName,
        contact.searchHints,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }

    // AND semantics: contact must have every selected tag
    // (e.g. Volunteer + Donor → only dual-tagged contacts).
    // Email is irrelevant — no-email contacts still match by tag.
    if (filters.tags.length > 0) {
      const hasAllTags = filters.tags.every((tag) =>
        contact.tags.includes(tag),
      );
      if (!hasAllTags) return false;
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
