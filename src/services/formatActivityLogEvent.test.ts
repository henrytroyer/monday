import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatActivityLogEvent } from './formatActivityLogEvent.ts';

const context = {
  boardId: '123',
  boardName: 'Applications Test Board',
  userNamesById: new Map([
    ['42', 'Sarah Chen'],
    ['37733546', 'Henry Troyer'],
  ]),
  boardRole: 'applications' as const,
};

const contactsContext = {
  boardId: '2463183745',
  boardName: 'Contacts',
  userNamesById: new Map([['37733546', 'Henry Troyer']]),
  boardRole: 'contacts' as const,
};

describe('formatActivityLogEvent', () => {
  it('formats create_pulse events with real actor name in the summary', () => {
    const event = formatActivityLogEvent(
      {
        id: '1',
        event: 'create_pulse',
        entity: 'pulse',
        user_id: '42',
        created_at: '2026-03-01T10:00:00.000Z',
        data: JSON.stringify({ pulse_id: '99', pulse_name: 'Alex Rivera' }),
      },
      context,
    );

    assert.equal(event.summary, 'Sarah Chen created "Alex Rivera"');
    assert.equal(event.category, 'created');
    assert.equal(event.actorName, 'Sarah Chen');
    assert.equal(event.entityId, '99');
    assert.equal(event.navigateTo?.page, 'applications');
    assert.equal(event.boardName, 'Applications');
    assert.equal(event.undoable, true);
    assert.equal(event.undo?.kind, 'delete_item');
  });

  it('formats update_column_value with who, field, and before/after', () => {
    const event = formatActivityLogEvent(
      {
        id: '2',
        event: 'update_column_value',
        entity: 'pulse',
        user_id: '42',
        created_at: '2026-03-02T10:00:00.000Z',
        data: JSON.stringify({
          pulse_id: '99',
          pulse_name: 'Alex Rivera',
          column_id: 'status',
          column_type: 'color',
          column_title: 'Status',
          previous_value: { label: { text: 'Applied' } },
          value: { label: { text: 'Approved' } },
        }),
      },
      context,
    );

    assert.equal(
      event.summary,
      'Sarah Chen updated Status on "Alex Rivera"',
    );
    assert.equal(event.detail, 'Applied → Approved');
    assert.equal(event.category, 'updated');
    assert.equal(event.undoable, true);
    assert.equal(event.undo?.kind, 'restore_column');
    assert.equal(event.undo?.columnId, 'status');
  });

  it('formats Henry Troyer Type change on Ada Stoltzfus with dropdown values', () => {
    const event = formatActivityLogEvent(
      {
        id: 'ada-type',
        event: 'update_column_value',
        entity: 'pulse',
        user_id: '37733546',
        created_at: '2026-07-20T10:00:00.000Z',
        data: JSON.stringify({
          previous_value: {
            chosenValues: [
              { name: 'Parents', id: 11 },
              { name: 'Volunteer', id: 4 },
            ],
          },
          previous_textual_value: 'Parents, Volunteer',
          pulse_name: 'Ada Stoltzfus',
          pulse_id: 11576346672,
          column_id: 'type1',
          column_title: 'Type',
          column_type: 'dropdown',
          value: {
            chosenValues: [{ name: 'Volunteer', id: 4 }],
          },
        }),
      },
      contactsContext,
    );

    assert.equal(
      event.summary,
      'Henry Troyer updated Type on "Ada Stoltzfus"',
    );
    assert.equal(event.detail, 'Parents, Volunteer → Volunteer');
    assert.equal(event.actorName, 'Henry Troyer');
    assert.equal(event.undoable, true);
    assert.deepEqual(event.undo?.previousValueRaw, {
      chosenValues: [
        { name: 'Parents', id: 11 },
        { name: 'Volunteer', id: 4 },
      ],
    });
  });

  it('formats move_pulse_from_group with nested pulse and group objects', () => {
    const event = formatActivityLogEvent(
      {
        id: '3',
        event: 'move_pulse_from_group',
        entity: 'pulse',
        user_id: '-4',
        created_at: '2026-03-03T10:00:00.000Z',
        data: JSON.stringify({
          source_group: { id: 'g1', title: 'Ready for Placement' },
          dest_group: { id: 'g2', title: 'Confirmed Location' },
          pulse: { name: 'Travis Stoltzfoos', id: 11910339528 },
          pulse_id: 11910339528,
        }),
      },
      context,
    );

    assert.equal(
      event.summary,
      'Automation moved "Travis Stoltzfoos" to Confirmed Location',
    );
    assert.equal(
      event.detail,
      'From Ready for Placement → Confirmed Location',
    );
    assert.equal(event.actorName, 'Automation');
    assert.equal(event.isAutomation, true);
    assert.equal(event.undoable, true);
    assert.equal(event.undo?.kind, 'move_group');
    assert.equal(event.undo?.sourceGroupId, 'g1');
  });

  it('formats delete_pulse events', () => {
    const event = formatActivityLogEvent(
      {
        id: '4',
        event: 'delete_pulse',
        entity: 'pulse',
        user_id: '42',
        created_at: '2026-03-04T10:00:00.000Z',
        data: JSON.stringify({ pulse_id: '99', pulse_name: 'Alex Rivera' }),
      },
      context,
    );

    assert.equal(event.summary, 'Sarah Chen deleted "Alex Rivera"');
    assert.equal(event.category, 'deleted');
    assert.equal(event.undoable, false);
  });

  it('formats create_update comment events in plain language', () => {
    const event = formatActivityLogEvent(
      {
        id: '5',
        event: 'create_update',
        entity: 'pulse',
        user_id: '42',
        created_at: '2026-03-05T10:00:00.000Z',
        data: JSON.stringify({ pulse_id: '99', pulse_name: 'Alex Rivera' }),
      },
      context,
    );

    assert.equal(event.summary, 'Sarah Chen added a note on "Alex Rivera"');
    assert.equal(event.category, 'comment');
  });

  it('parses nanosecond created_at timestamps', () => {
    const event = formatActivityLogEvent(
      {
        id: '6',
        event: 'create_pulse',
        entity: 'pulse',
        user_id: '42',
        created_at: '1740823200000000000',
        data: JSON.stringify({ pulse_name: 'Test User' }),
      },
      context,
    );

    assert.equal(event.occurredAt, new Date(1740823200000).toISOString());
  });

  it('never surfaces Monday pulse jargon in unknown events', () => {
    const event = formatActivityLogEvent(
      {
        id: '7',
        event: 'some_unknown_event',
        entity: 'pulse',
        user_id: '42',
        created_at: '2026-03-06T10:00:00.000Z',
        data: JSON.stringify({ pulse_name: 'Alex Rivera' }),
      },
      context,
    );

    assert.equal(event.summary, 'Sarah Chen updated "Alex Rivera"');
    assert.ok(!event.summary.toLowerCase().includes('pulse'));
  });

  it('labels system user -4 as Automation and flags isAutomation', () => {
    const event = formatActivityLogEvent(
      {
        id: '8',
        event: 'create_pulse',
        entity: 'pulse',
        user_id: '-4',
        created_at: '2026-03-07T10:00:00.000Z',
        data: JSON.stringify({ pulse_name: 'Alex Rivera' }),
      },
      context,
    );

    assert.equal(event.actorName, 'Automation');
    assert.equal(event.isAutomation, true);
    assert.ok(!event.actorName.startsWith('User '));
  });

  it('formats timerange column changes', () => {
    const event = formatActivityLogEvent(
      {
        id: '9',
        event: 'update_column_value',
        entity: 'pulse',
        user_id: '42',
        created_at: '2026-03-08T10:00:00.000Z',
        data: JSON.stringify({
          pulse_name: 'Joshua Yoder',
          pulse_id: '1',
          column_id: 'timeline4',
          column_title: 'Arrival/Departure Date',
          column_type: 'timerange',
          previous_value: { from: '2026-06-01', to: '2026-08-22' },
          value: { from: '2026-06-01', to: '2026-08-12' },
        }),
      },
      context,
    );

    assert.equal(
      event.summary,
      'Sarah Chen updated Arrival/Departure Date on "Joshua Yoder"',
    );
    assert.equal(
      event.detail,
      '2026-06-01 – 2026-08-22 → 2026-06-01 – 2026-08-12',
    );
  });
});
