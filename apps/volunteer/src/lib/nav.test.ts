import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  APPLICATION_PROCESS_TITLE,
  SHORT_TERM_APPLICATION_TITLE,
  FORMS_AND_REFERENCES_TITLE,
  HOPE_IN_ACTION,
  HOPE_IN_ACTION_TAGLINE,
  PORTAL_TAB_LABEL,
  PORTAL_TABS,
  SHORT_TERM_VIEWS,
  I58_MARK,
  GREECE_MAP,
  GERMANY_MAP,
  APPLICATION_PROCESS_PHOTO,
  WORLD_MAP,
  JOURNEY_PLANE,
  VOLUNTEER_PORTAL_TITLE,
} from './nav.ts';

describe('short-term hub labels', () => {
  it('names the files page Forms & References', () => {
    assert.equal(FORMS_AND_REFERENCES_TITLE, 'Forms & References');
  });
});

describe('portal destinations', () => {
  it('keeps the signed-in top nav order', () => {
    assert.deepEqual([...PORTAL_TABS], [
      'home',
      'short-term',
      'long-term',
      'volunteer',
    ]);
    assert.equal(PORTAL_TAB_LABEL.home, 'Home');
    assert.deepEqual([...SHORT_TERM_VIEWS], ['progress', 'documents']);
    assert.equal(APPLICATION_PROCESS_TITLE, 'Application process');
    assert.equal(SHORT_TERM_APPLICATION_TITLE, 'Short-term application');
    assert.equal(HOPE_IN_ACTION, 'Hope in Action');
    assert.equal(HOPE_IN_ACTION_TAGLINE, 'Serving Refugees across Europe');
    assert.equal(VOLUNTEER_PORTAL_TITLE, 'Volunteer Portal');
    assert.equal(I58_MARK, '/brand/i58-mark.png');
    assert.equal(GREECE_MAP, '/brand/greece-map.png');
    assert.equal(GERMANY_MAP, '/brand/germany-map.png');
    assert.equal(APPLICATION_PROCESS_PHOTO, '/brand/application-process.png');
    assert.equal(WORLD_MAP, '/brand/world-map.png');
    assert.equal(JOURNEY_PLANE, '/brand/journey-plane.png?v=4');
  });
});
