import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ContactListItem } from '../types/contact';
import {
  coupleKeyFromNames,
  isContactCoupleUnit,
  mergeContactsIntoCoupleUnits,
  parseCoupleLabel,
} from './contactCoupleMerge';

function contact(
  partial: Partial<ContactListItem> & Pick<ContactListItem, 'id' | 'name'>,
): ContactListItem {
  return {
    email: '—',
    tags: ['volunteer'],
    ...partial,
  };
}

describe('parseCoupleLabel', () => {
  it('reads Couple: A & B from Connected to', () => {
    const parsed = parseCoupleLabel(
      'Pastor Jane, Couple: Ada Lovelace & Charles Babbage',
    );
    assert.deepEqual(parsed, { a: 'Ada Lovelace', b: 'Charles Babbage' });
  });
});

describe('mergeContactsIntoCoupleUnits', () => {
  it('merges spouse pair into one unit', () => {
    const a = contact({
      id: '1',
      name: 'Ada Lovelace',
      spouseName: 'Charles Babbage',
      connectedTo: 'Couple: Ada Lovelace & Charles Babbage',
    });
    const b = contact({
      id: '2',
      name: 'Charles Babbage',
      spouseName: 'Ada Lovelace',
      connectedTo: 'Couple: Ada Lovelace & Charles Babbage',
    });
    const solo = contact({ id: '3', name: 'Solo Volunteer' });
    const units = mergeContactsIntoCoupleUnits([a, b, solo]);
    assert.equal(units.length, 2);
    const couple = units.find(isContactCoupleUnit);
    assert.ok(couple);
    assert.equal(couple.key, coupleKeyFromNames(a.name, b.name));
    assert.ok(couple.spouse);
  });
});
