import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  collectRoleTagsByEmailFromApplications,
  contactTagsEqual,
  deriveDetailRoleTags,
  enrichContactListRoleTags,
} from './contactRoleTags';
import type { MondayBoardItem } from './mapMondayToCrm';

describe('deriveDetailRoleTags', () => {
  it('merges volunteer + donor when both roles apply', () => {
    assert.deepEqual(
      deriveDetailRoleTags({
        existingTags: ['volunteer'],
        hasVolunteerService: true,
        hasDonations: true,
        isParentByEmail: false,
        isPastorByEmail: false,
      }).sort(),
      ['donor', 'volunteer'],
    );
  });

  it('adds pastor when matched by application pastor email', () => {
    assert.deepEqual(
      deriveDetailRoleTags({
        existingTags: ['donor'],
        hasVolunteerService: false,
        hasDonations: true,
        isParentByEmail: false,
        isPastorByEmail: true,
      }).sort(),
      ['donor', 'pastor'],
    );
  });
});

describe('enrichContactListRoleTags', () => {
  it('assigns parent/pastor/volunteer from application emails', () => {
    const applications = [
      {
        id: 'app-1',
        name: 'Kid Volunteer',
        column_values: [
          {
            id: 'email',
            text: 'kid@example.com',
            value: null,
            type: 'email',
            column: { title: 'Email' },
          },
          {
            id: 'parent',
            text: 'parent@example.com',
            value: null,
            type: 'email',
            column: { title: 'Parent Email' },
          },
          {
            id: 'pastor',
            text: 'pastor@example.com',
            value: null,
            type: 'email',
            column: { title: 'Pastor Email' },
          },
        ],
      },
    ] as unknown as MondayBoardItem[];

    const byEmail = collectRoleTagsByEmailFromApplications(applications);
    assert.deepEqual(byEmail.get('kid@example.com')?.sort(), ['volunteer']);
    assert.deepEqual(byEmail.get('parent@example.com')?.sort(), ['parent']);
    assert.deepEqual(byEmail.get('pastor@example.com')?.sort(), ['pastor']);

    const enriched = enrichContactListRoleTags(
      [
        {
          id: 'c1',
          name: 'Parent Donor',
          email: 'parent@example.com',
          tags: ['donor'],
        },
      ],
      applications,
    );
    assert.deepEqual(enriched[0]!.tags.sort(), ['donor', 'parent']);
  });
});

describe('contactTagsEqual', () => {
  it('ignores order', () => {
    assert.equal(
      contactTagsEqual(['donor', 'volunteer'], ['volunteer', 'donor']),
      true,
    );
  });
});
