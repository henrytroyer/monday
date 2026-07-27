import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  extractSuperMailPayload,
  isSuperMailUpdate,
  mapSuperMailUpdateToEmailMessage,
} from './parseSuperMailUpdate.ts';

const SAMPLE_SUPERMAIL = `<span><u><b>Outgoing SuperMail</b></u></span><br><br><span><b>Sent at:</b> Monday, February 16, 2026, 11:01:41 UTC<br><span><b>from:</b> <a target="_blank" rel="noopener noreferrer">info@i58global.org</a><br><span><b>to:</b> <a target="_blank" rel="noopener noreferrer">terrelseibel02@gmail.com</a></span><br><span><b>Subject:</b> i58Global Child Safeguarding</span><br><span><b>Body:</b></span><br><p class="editor-paragraph"><span>Hello Terrel,</span></p>`;

describe('parseSuperMailUpdate', () => {
  it('detects SuperMail update logs', () => {
    assert.equal(isSuperMailUpdate(SAMPLE_SUPERMAIL), true);
    assert.equal(isSuperMailUpdate('Regular CRM note'), false);
  });

  it('extracts SuperMail payload from update html', () => {
    const payload = extractSuperMailPayload(SAMPLE_SUPERMAIL, {
      fallbackSentAt: '2026-02-16T11:01:41.000Z',
      contactEmails: ['terrelseibel02@gmail.com'],
      creatorEmail: 'info@i58global.org',
    });

    assert.ok(payload);
    assert.equal(payload?.subject, 'i58Global Child Safeguarding');
    assert.equal(payload?.direction, 'outbound');
    assert.equal(payload?.senderEmail, 'info@i58global.org');
    assert.equal(payload?.recipientEmail, 'terrelseibel02@gmail.com');
    assert.match(payload?.body ?? '', /Hello Terrel/);
  });

  it('maps SuperMail update to email message', () => {
    const message = mapSuperMailUpdateToEmailMessage(
      {
        id: '4928080693',
        body: SAMPLE_SUPERMAIL,
        created_at: '2026-02-16T11:01:41.000Z',
        creator: { name: 'Coordinator', email: 'info@i58global.org' },
      },
      {
        contactId: 'contact-1',
        itemId: '11237429554',
        source: 'application',
        sourceLabel: 'Summer 2026',
        contactEmails: ['terrelseibel02@gmail.com'],
      },
    );

    assert.ok(message);
    assert.equal(message?.subject, 'i58Global Child Safeguarding');
    assert.equal(message?.senderEmail, 'info@i58global.org');
    assert.equal(message?.recipientEmail, 'terrelseibel02@gmail.com');
    assert.equal(message?.direction, 'outbound');
    assert.equal(message?.mondayUpdateId, '4928080693');
    assert.match(message?.body ?? '', /Hello Terrel/);
  });
});
