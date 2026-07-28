import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isAutomationNoteAuthor,
  shouldSkipNoteHarvest,
} from './noteHarvestSkip';

const SAMPLE_SUPERMAIL = `<span><u><b>Outgoing SuperMail</b></u></span><br><br><span><b>Sent at:</b> Monday, February 16, 2026, 11:01:41 UTC<br><span><b>from:</b> <a>info@i58global.org</a><br><span><b>to:</b> <a>terrelseibel02@gmail.com</a></span><br><span><b>Subject:</b> i58Global Child Safeguarding</span><br><span><b>Body:</b></span><br><p>Hello Terrel,</p>`;

describe('noteHarvestSkip', () => {
  it('detects automation authors case-insensitively', () => {
    assert.equal(isAutomationNoteAuthor('Automation'), true);
    assert.equal(isAutomationNoteAuthor('automation'), true);
    assert.equal(isAutomationNoteAuthor('Jane Doe'), false);
    assert.equal(isAutomationNoteAuthor(null), false);
  });

  it('skips SuperMail / Outgoing Email logs', () => {
    assert.equal(shouldSkipNoteHarvest(SAMPLE_SUPERMAIL, 'Henry'), true);
    assert.equal(
      shouldSkipNoteHarvest('<b>Outgoing Email</b><br>Body here', 'Henry'),
      true,
    );
  });

  it('skips automation-authored free-text updates', () => {
    assert.equal(
      shouldSkipNoteHarvest('Status moved automatically', 'Automation'),
      true,
    );
  });

  it('skips CRM-tagged typed notes from harvest', () => {
    assert.equal(
      shouldSkipNoteHarvest(
        '[CRM_CONTACT_NOTE source=contact]\nTyped note',
        'Henry',
      ),
      true,
    );
    assert.equal(
      shouldSkipNoteHarvest(
        '[CRM_TERM_NOTE timeline=summer-2026]\nTyped term note',
        'Henry',
      ),
      true,
    );
  });

  it('allows human free-text monday updates for note review', () => {
    assert.equal(
      shouldSkipNoteHarvest('Called volunteer about flights', 'Henry'),
      false,
    );
  });
});
