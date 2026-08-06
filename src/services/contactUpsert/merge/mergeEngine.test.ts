import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ContactListItem } from '../../../types/contact';
import { classifyDuplicateGroup } from './classifyGroup';
import { findDuplicateGroupCandidates } from './groupDuplicates';
import {
  applyFieldMergeOverrides,
  buildMergeFieldChoices,
  selectionsToFieldOverrides,
} from './fieldMergeChoices';
import {
  buildFieldMergePlan,
  combineEmails,
} from './fieldMergePlan';
import {
  normalizeEmailForMerge,
  normalizeNameForMerge,
} from './normalize';
import { planMergeRun } from './planRun';
import { pickSurvivor, scoreContact } from './survivorScore';

function contact(
  partial: Partial<ContactListItem> & Pick<ContactListItem, 'id' | 'name'>,
): ContactListItem {
  return {
    email: '—',
    tags: [],
    ...partial,
  };
}

describe('merge normalize', () => {
  it('normalizes email case and whitespace', () => {
    assert.equal(normalizeEmailForMerge('  Gary@Example.COM '), 'gary@example.com');
    assert.equal(normalizeEmailForMerge(''), null);
    assert.equal(normalizeEmailForMerge('—'), null);
  });

  it('normalizes repeated spaces in names case-insensitively', () => {
    assert.equal(
      normalizeNameForMerge('  Gary   Wagler '),
      normalizeNameForMerge('gary wagler'),
    );
    assert.equal(normalizeNameForMerge(''), null);
  });
});

describe('merge grouping and classify', () => {
  it('exact email match with identical names is auto', () => {
    const groups = findDuplicateGroupCandidates([
      contact({
        id: '1',
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        tags: ['donor'],
      }),
      contact({
        id: '2',
        name: 'Ada Lovelace',
        email: 'ADA@example.com',
        tags: ['volunteer'],
      }),
    ]);
    assert.equal(groups.length, 1);
    const classified = classifyDuplicateGroup(groups[0]!);
    assert.equal(classified.disposition, 'auto');
    assert.ok(classified.reasons.includes('EXACT_EMAIL'));
  });

  it('Jennifer/Brooke same email goes to review', () => {
    const groups = findDuplicateGroupCandidates([
      contact({
        id: '1',
        name: 'Jennifer Mast',
        email: 'jennywren77@gmail.com',
        tags: ['donor'],
      }),
      contact({
        id: '2',
        name: 'Brooke Mast',
        email: 'jennywren77@gmail.com',
        tags: ['donor'],
      }),
    ]);
    const classified = classifyDuplicateGroup(groups[0]!);
    assert.equal(classified.disposition, 'review');
    assert.ok(classified.reviewReasons.includes('EXACT_EMAIL_DIFF_NAME'));
  });

  it('Wagler solo vs couple same email goes to review', () => {
    const groups = findDuplicateGroupCandidates([
      contact({
        id: '7119657242',
        name: 'Gary Wagler',
        email: 'garywagler75@gmail.com',
        tags: ['pastor'],
        connectedTo: 'Haley Wagler',
      }),
      contact({
        id: '7119657283',
        name: 'Gary and Becky Wagler',
        email: 'garywagler75@gmail.com',
        tags: ['parent'],
        connectedTo: 'Haley Wagler',
        phone: '555-0100',
      }),
    ]);
    const classified = classifyDuplicateGroup(groups[0]!);
    assert.equal(classified.disposition, 'review');
    assert.ok(classified.reviewReasons.includes('EXACT_EMAIL_DIFF_NAME'));

    // Manual path still prefers richest household survivor.
    const { survivor } = pickSurvivor(groups[0]!.contacts);
    assert.equal(survivor.id, '7119657283');
    const plan = buildFieldMergePlan(
      survivor,
      groups[0]!.contacts.filter((c) => c.id !== survivor.id),
      [
        ...groups[0]!.contacts,
        contact({
          id: '3',
          name: 'Haley Wagler',
          email: 'haley@example.com',
          tags: ['volunteer'],
        }),
      ],
    );
    assert.equal(plan.resultingName, 'Gary and Becky Wagler');
    assert.ok(plan.resultingTags.includes('pastor'));
    assert.ok(plan.resultingTags.includes('parent'));
    assert.equal(plan.willUpdatePastor, true);
    assert.equal(plan.willUpdateParents, true);
  });

  it('spelling variants without exact email are not auto-merged by name', () => {
    const groups = findDuplicateGroupCandidates([
      contact({
        id: '1',
        name: 'Randy Hochstetler',
        email: 'a@example.com',
        tags: ['pastor'],
      }),
      contact({
        id: '2',
        name: 'Randy Hochsteler',
        email: 'b@example.com',
        tags: ['pastor'],
      }),
    ]);
    assert.equal(groups.length, 0);
  });

  it('exact name with same email is auto', () => {
    const groups = findDuplicateGroupCandidates([
      contact({
        id: '1',
        name: 'Paul Lehman',
        email: 'paul@example.com',
      }),
      contact({
        id: '2',
        name: 'Paul Lehman',
        email: 'paul@example.com',
        phone: '555',
      }),
    ]);
    const classified = classifyDuplicateGroup(groups[0]!);
    assert.equal(classified.disposition, 'auto');
  });
});

describe('survivor scoring', () => {
  it('does not let couple bonus alone beat a much richer solo', () => {
    const couple = contact({
      id: '1',
      name: 'Ann and Bob',
      email: 'x@example.com',
      tags: [],
    });
    const richSolo = contact({
      id: '2',
      name: 'Ann Smith',
      email: 'x@example.com',
      tags: ['volunteer', 'donor', 'parent'],
      phone: '555',
      altEmail: 'y@example.com',
      spouseName: 'Bob',
      connectedTo: 'Kid',
      demographics: {
        address: '1 Main',
        city: 'Town',
        state: 'OH',
        zip: '43000',
        country: 'US',
      },
      profilePhotoUrl: 'https://example.com/a.jpg',
    });
    assert.ok(scoreContact(richSolo).total > scoreContact(couple).total);
    assert.equal(pickSurvivor([couple, richSolo]).survivor.id, '2');
  });

  it('keeps both emails via Alt Email', () => {
    const combined = combineEmails(
      contact({
        id: '1',
        name: 'A',
        email: 'a@example.com',
        altEmail: 'old@example.com',
      }),
      [contact({ id: '2', name: 'A', email: 'b@example.com' })],
    );
    assert.equal(combined.primary, 'a@example.com');
    assert.ok(combined.altEmail?.includes('b@example.com'));
  });

  it('logs scalar conflicts without overwriting', () => {
    const plan = buildFieldMergePlan(
      contact({
        id: '1',
        name: 'A',
        email: 'a@example.com',
        phone: '111',
      }),
      [
        contact({
          id: '2',
          name: 'A',
          email: 'a@example.com',
          phone: '222',
        }),
      ],
    );
    assert.equal(plan.phone, '111');
    assert.ok(plan.conflicts.some((c) => c.field === 'phone'));
  });

  it('field choices flag phone conflict and apply reviewer override', () => {
    const survivor = contact({
      id: '1',
      name: 'A',
      email: 'a@example.com',
      phone: '111',
      tags: ['donor'],
    });
    const loser = contact({
      id: '2',
      name: 'B',
      email: 'a@example.com',
      phone: '222',
      tags: ['volunteer'],
    });
    const choices = buildMergeFieldChoices(survivor, [loser]);
    const phoneChoice = choices.fields.find((f) => f.key === 'phone');
    assert.ok(phoneChoice?.needsChoice);
    assert.equal(phoneChoice?.recommendedValue, '111');

    const nameChoice = choices.fields.find((f) => f.key === 'name');
    assert.ok(nameChoice?.needsChoice);

    assert.equal(choices.tags.needsChoice, true);
    assert.ok(choices.tags.recommendedTags.includes('donor'));
    assert.ok(choices.tags.recommendedTags.includes('volunteer'));

    const plan = buildFieldMergePlan(survivor, [loser]);
    const overridden = applyFieldMergeOverrides(plan, {
      phone: '222',
      resultingName: 'B',
      resultingTags: ['volunteer'],
    });
    assert.equal(overridden.phone, '222');
    assert.equal(overridden.resultingName, 'B');
    assert.deepEqual(overridden.resultingTags, ['volunteer']);
  });

  it('selectionsToFieldOverrides maps UI picks into execute overrides', () => {
    const overrides = selectionsToFieldOverrides({
      fieldValues: {
        name: 'Kept Name',
        email: 'kept@example.com',
        phone: '999',
        city: 'Athens',
      },
      tags: ['pastor', 'parent'],
      pastorSourceId: 'p1',
      parentSourceId: 'p2',
    });
    assert.equal(overrides.resultingName, 'Kept Name');
    assert.equal(overrides.resultingEmail, 'kept@example.com');
    assert.equal(overrides.phone, '999');
    assert.equal(overrides.demographics?.city, 'Athens');
    assert.deepEqual(overrides.resultingTags, ['pastor', 'parent']);
    assert.equal(overrides.pastorSourceId, 'p1');
    assert.equal(overrides.parentSourceId, 'p2');
  });

  it('identical phone values do not need a choice', () => {
    const choices = buildMergeFieldChoices(
      contact({
        id: '1',
        name: 'Same',
        email: 'a@example.com',
        phone: '555',
      }),
      [
        contact({
          id: '2',
          name: 'Same',
          email: 'a@example.com',
          phone: '555',
        }),
      ],
    );
    const phoneChoice = choices.fields.find((f) => f.key === 'phone');
    assert.ok(phoneChoice);
    assert.equal(phoneChoice!.needsChoice, false);
    assert.equal(phoneChoice!.resolvedValue, '555');
  });
});

describe('planMergeRun', () => {
  it('dry planning enqueues reviews and respects high volume', () => {
    const contacts = [
      contact({
        id: '1',
        name: 'Jennifer Mast',
        email: 'shared@example.com',
      }),
      contact({
        id: '2',
        name: 'Brooke Mast',
        email: 'shared@example.com',
      }),
      contact({
        id: '3',
        name: 'Twin A',
        email: 'twin@example.com',
      }),
      contact({
        id: '4',
        name: 'Twin A',
        email: 'twin@example.com',
      }),
    ];
    const planned = planMergeRun(contacts, {
      enqueueReviews: true,
      config: { highVolumeThreshold: 0, reportOnly: true },
    });
    assert.ok(planned.highVolumeTriggered || planned.report.reviewGroupsCreated >= 1);
    assert.ok(
      planned.classified.some((g) =>
        g.reviewReasons.includes('EXACT_EMAIL_DIFF_NAME'),
      ),
    );
  });

  it('max group size sends oversize to review', () => {
    const contacts = Array.from({ length: 12 }, (_, i) =>
      contact({
        id: String(i + 1),
        name: 'Same Person',
        email: 'same@example.com',
      }),
    );
    const planned = planMergeRun(contacts, {
      enqueueReviews: false,
      config: { maxGroupSize: 10, reportOnly: true },
    });
    const group = planned.classified.find((g) =>
      g.reasons.includes('EXACT_EMAIL'),
    );
    assert.ok(group);
    assert.equal(group!.disposition, 'review');
    assert.ok(group!.reviewReasons.includes('OVERSIZE_GROUP'));
  });
});
