import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JANE_MILLER } from '../mock/fixtures.ts';
import { onboardingFillPercent, resolveOnboardingSteps } from './onboarding.ts';
import { preparationDocumentPdf } from './preparationDocumentPdf.ts';
import { previewHomeStatus } from './previewHomeStepper.ts';
import {
  DOCUMENT_STAGE_CYCLE,
  DOCUMENT_STAGE_LABEL,
  acceptPreparationDocument,
  declinePreparationDocument,
  documentIsAccepted,
  documentProgress,
  documentStage,
  documentStageFill,
  emptyPreparationDocument,
  stepDocumentStage,
  receivePreparationDocument,
  savePreparationDocument,
} from './preparationDocuments.ts';

describe('preparation documents', () => {
  const filled = {
    ...emptyPreparationDocument(),
    name: 'Jane Miller',
    date: '1990-04-02',
    confirmed: 'yes' as const,
  };

  it('fills part of the bubble while the form is in progress and stops short of full', () => {
    assert.equal(documentProgress(emptyPreparationDocument()), 0);
    assert.equal(documentProgress({ ...emptyPreparationDocument(), name: 'Jane Miller' }), 28);
    assert.equal(documentProgress(filled), 85);
  });

  it('marks a submitted document sent and fills the bubble only after it is accepted', () => {
    const sent = savePreparationDocument(JANE_MILLER, 'background_check_sent', {
      ...filled,
      submitted: true,
    });
    const sentStep = resolveOnboardingSteps(sent).find((step) => step.id === 'background_check_sent');
    assert.equal(sentStep?.status, 'waiting');
    assert.equal(onboardingFillPercent(sentStep!), 85);

    const accepted = acceptPreparationDocument(sent, 'background_check_sent');
    const acceptedStep = resolveOnboardingSteps(accepted).find(
      (step) => step.id === 'background_check_sent',
    );
    assert.equal(acceptedStep?.status, 'received');
    assert.equal(onboardingFillPercent(acceptedStep!), 100);
    assert.equal(acceptPreparationDocument(JANE_MILLER, 'flights'), JANE_MILLER);
  });

  it('lets an edited document replace the preparation preview paint', () => {
    const untouched = previewHomeStatus(JANE_MILLER, 3);
    const backgroundPreview = untouched.onboardingSteps?.find(
      (step) => step.id === 'background_check_sent',
    );
    assert.equal(backgroundPreview?.status, 'received');
    assert.equal(onboardingFillPercent(backgroundPreview!), 100);
    assert.equal(documentIsAccepted(untouched, 'background_check_sent'), true);
    assert.equal(
      DOCUMENT_STAGE_LABEL[
        documentStage(undefined, documentIsAccepted(untouched, 'safeguarding_certificate'))
      ],
      'Form accepted',
    );
    assert.equal(untouched.onboardingSteps?.find((step) => step.id === 'flights')?.progress, 40);

    const edited = previewHomeStatus(
      savePreparationDocument(JANE_MILLER, 'background_check_sent', {
        ...emptyPreparationDocument(),
        name: 'Jane Miller',
      }),
      3,
    );
    const background = edited.onboardingSteps?.find((step) => step.id === 'background_check_sent');
    assert.equal(background?.status, 'not_started');
    assert.equal(background?.progress, 28);
    assert.equal(edited.onboardingSteps?.find((step) => step.id === 'flights')?.progress, 40);
  });

  it('names each form stage and fills the bubble only when the form is accepted', () => {
    assert.equal(DOCUMENT_STAGE_LABEL[documentStage(undefined)], 'Fill out this form');
    const started = savePreparationDocument(JANE_MILLER, 'safeguarding_certificate', {
      ...emptyPreparationDocument(),
      name: 'Jane Miller',
    });
    const startedDraft = started.preparationDocuments?.safeguarding_certificate;
    assert.equal(DOCUMENT_STAGE_LABEL[documentStage(startedDraft)], 'Continue filling out this form');

    const sent = savePreparationDocument(started, 'safeguarding_certificate', {
      ...filled,
      submitted: true,
    });
    const sentDraft = sent.preparationDocuments?.safeguarding_certificate;
    assert.equal(DOCUMENT_STAGE_LABEL[documentStage(sentDraft)], 'Form completed & sent');
    assert.equal(
      onboardingFillPercent(
        resolveOnboardingSteps(sent).find((step) => step.id === 'safeguarding_certificate')!,
      ),
      85,
    );

    const received = receivePreparationDocument(sent, 'safeguarding_certificate');
    const receivedDraft = received.preparationDocuments?.safeguarding_certificate;
    assert.equal(DOCUMENT_STAGE_LABEL[documentStage(receivedDraft)], 'Form received by i58');
    assert.equal(
      onboardingFillPercent(
        resolveOnboardingSteps(received).find((step) => step.id === 'safeguarding_certificate')!,
      ),
      85,
    );
    assert.equal(receivePreparationDocument(JANE_MILLER, 'safeguarding_certificate'), JANE_MILLER);

    const kept = savePreparationDocument(received, 'safeguarding_certificate', {
      ...filled,
      submitted: true,
    });
    assert.equal(kept.preparationDocuments?.safeguarding_certificate?.review, 'received');

    const declined = declinePreparationDocument(received, 'safeguarding_certificate');
    assert.equal(
      DOCUMENT_STAGE_LABEL[documentStage(declined.preparationDocuments?.safeguarding_certificate)],
      'Form not accepted',
    );
    assert.equal(
      onboardingFillPercent(
        resolveOnboardingSteps(declined).find((step) => step.id === 'safeguarding_certificate')!,
      ),
      85,
    );
    assert.equal(declinePreparationDocument(sent, 'safeguarding_certificate'), sent);

    const accepted = acceptPreparationDocument(received, 'safeguarding_certificate');
    assert.equal(
      DOCUMENT_STAGE_LABEL[documentStage(accepted.preparationDocuments?.safeguarding_certificate)],
      'Form accepted',
    );
    assert.equal(
      onboardingFillPercent(
        resolveOnboardingSteps(accepted).find((step) => step.id === 'safeguarding_certificate')!,
      ),
      100,
    );
  });

  it('moves the bubble fill with each form stage and fills it only when accepted', () => {
    assert.deepEqual(
      DOCUMENT_STAGE_CYCLE.map((stage) => documentStageFill(stage)),
      [0, 25, 50, 75, 100, 75],
    );
    for (const stage of DOCUMENT_STAGE_CYCLE) {
      assert.notEqual(documentStageFill(stage), documentStageFill(stepDocumentStage(stage, 1)));
    }
  });

  it('cycles every form stage and wraps at both ends', () => {
    assert.equal(stepDocumentStage('start', 1), 'continue');
    assert.equal(stepDocumentStage('continue', 1), 'sent');
    assert.equal(stepDocumentStage('sent', 1), 'received');
    assert.equal(stepDocumentStage('received', 1), 'accepted');
    assert.equal(stepDocumentStage('accepted', 1), 'declined');
    assert.equal(stepDocumentStage('declined', 1), 'start');
    assert.equal(stepDocumentStage('start', -1), 'declined');
  });

  it('puts the submitted answers in a downloadable PDF', () => {
    const pdf = new TextDecoder().decode(
      preparationDocumentPdf('flights', { ...filled, name: 'Athens ATH', submitted: true }),
    );
    assert.match(pdf, /^%PDF-1\.4/);
    assert.match(pdf, /Flights/);
    assert.match(pdf, /Athens ATH/);
    assert.match(pdf, /%%EOF$/);
  });
});
