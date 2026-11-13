import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  FIELD_FEEDBACK_FORM,
  FIELD_INCIDENT_FORM,
  FIELD_SERVICE_WAYS,
  FIELD_TEAM_PHOTOS,
  FIELD_VEHICLE_BOOKING,
} from './fieldService.ts';

describe('field service ways', () => {
  it('names the cards under the schedule bar', () => {
    assert.deepEqual(
      FIELD_SERVICE_WAYS.map((way) => way.title),
      ['Book a Vehicle', 'Camp and Team Photos', 'i58 Feedback', 'Incident Report'],
    );
    assert.equal(
      FIELD_SERVICE_WAYS.find((way) => way.id === 'photos')?.body,
      'Dec 5, 2013 – Dec 31, 2025',
    );
    assert.equal(
      FIELD_SERVICE_WAYS.find((way) => way.id === 'feedback')?.body,
      '-A place where you can submit new ideas, and give feedback for improvement within i58. Your perspective and insights are helpful!!',
    );
    assert.equal(
      FIELD_SERVICE_WAYS.find((way) => way.id === 'vehicle')?.body,
      'Nissan Micra or VW Van',
    );
    assert.match(
      FIELD_SERVICE_WAYS.find((way) => way.id === 'incident')?.body ?? '',
      /verbal or physical aggression/,
    );
  });

  it('keeps the i58 feedback questions', () => {
    assert.equal(FIELD_FEEDBACK_FORM.title, 'i58 Feedback Form');
    assert.match(FIELD_FEEDBACK_FORM.intro[1] ?? '', /confidential and anonymous/);
    assert.deepEqual(FIELD_FEEDBACK_FORM.questions, [
      'Anything in particular that we could improve concerning the organisation of i58?',
      'Anything you think we should change regarding team schedule? More or less planned activities...etc.',
    ]);
  });

  it('keeps the opening of the incident form', () => {
    assert.equal(FIELD_INCIDENT_FORM.title, 'Incident Form');
    assert.match(FIELD_INCIDENT_FORM.intro[0] ?? '', /security officer of EuroRelief/);
    assert.match(FIELD_INCIDENT_FORM.intro[1] ?? '', /mandatory in case of a severe incident/);
    assert.deepEqual(
      FIELD_INCIDENT_FORM.fields.map((field) => [field.id, field.label, field.required]),
      [
        ['email', 'Email', true],
        ['name', 'Please fill out your full name:', true],
      ],
    );
  });

  it('names the camp and team photo album', () => {
    assert.equal(FIELD_TEAM_PHOTOS.title, 'Camp and Team Photos');
    assert.equal(FIELD_TEAM_PHOTOS.range, 'Dec 5, 2013 – Dec 31, 2025');
  });

  it('lists the Greece vehicles, booking lengths, and phone', () => {
    assert.equal(FIELD_VEHICLE_BOOKING.place, 'i58 Greece');
    assert.equal(FIELD_VEHICLE_BOOKING.phoneDisplay, '+30 695 589 0380');
    assert.equal(FIELD_VEHICLE_BOOKING.phoneHref, 'tel:+306955890380');
    assert.deepEqual(
      FIELD_VEHICLE_BOOKING.lengths.map((length) => [length.id, length.label]),
      [
        ['hour-1', '1 hour'],
        ['hour-4', '4 hours'],
      ],
    );
    assert.deepEqual(
      FIELD_VEHICLE_BOOKING.vehicles.map((vehicle) => [
        vehicle.code,
        vehicle.name,
        vehicle.color,
        vehicle.plate,
        vehicle.people,
      ]),
      [
        ['8032', 'Nissan Micra', 'Blue', 'MYH 8032', 5],
        ['8213', 'VW Van', 'Light blue', 'ZHZ 8213', 9],
      ],
    );
  });
});
