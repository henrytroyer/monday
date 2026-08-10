/**
 * mapFilloutShortTermToBundle.ts — Map a Fillout ST submission to ExtractedApplicationBundle.
 * Uses Fillout question titles (not Monday column titles).
 */

import type { ContactDemographics } from '../../types/contact';
import type { ExtractedApplicationBundle } from '../contactUpsert/extractPeopleFromBoards';

export const FILLOUT_SHORT_TERM_SOURCE_LABEL = 'fillout-short-term';

export interface FilloutQuestionAnswer {
  id?: string;
  name?: string;
  type?: string;
  value?: unknown;
}

export interface FilloutSubmission {
  submissionId: string;
  submissionTime?: string;
  questions?: FilloutQuestionAnswer[];
}

function asTrimmedString(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value).trim();
  }
  return '';
}

function answerByName(
  questions: FilloutQuestionAnswer[] | undefined,
  ...names: string[]
): string {
  if (!questions?.length) return '';
  const targets = names.map((n) => n.trim().toLowerCase());
  for (const q of questions) {
    const name = (q.name || '').trim().toLowerCase();
    if (!name) continue;
    if (targets.includes(name)) {
      return asTrimmedString(q.value);
    }
  }
  return '';
}

function demographicsFromSubmission(
  questions: FilloutQuestionAnswer[] | undefined,
): ContactDemographics | undefined {
  const address = answerByName(questions, 'Street Number and Name');
  const city = answerByName(questions, 'City');
  const state = answerByName(questions, 'State/Providence', 'State');
  const zip = answerByName(questions, 'Postal Code', 'Zip Code', 'Zip');
  const country = answerByName(questions, 'Country');
  const dateOfBirth = answerByName(questions, 'Birthdate');
  if (!address && !city && !state && !zip && !country && !dateOfBirth) {
    return undefined;
  }
  return {
    ...(address ? { address } : {}),
    ...(city ? { city } : {}),
    ...(state ? { state } : {}),
    ...(zip ? { zip } : {}),
    ...(country ? { country } : {}),
    ...(dateOfBirth ? { dateOfBirth } : {}),
  };
}

function spouseDemographicsFromSubmission(
  questions: FilloutQuestionAnswer[] | undefined,
): ContactDemographics | undefined {
  const dateOfBirth = answerByName(questions, 'Spouse Birthdate');
  if (!dateOfBirth) return undefined;
  return { dateOfBirth };
}

/**
 * Build volunteer + optional parent + pastor + spouse bundle from one ST Fillout submission.
 * Spouse when Spouse Name is present (married / couple application). No file assets in v1.
 */
export function mapFilloutShortTermToBundle(
  submission: FilloutSubmission,
): ExtractedApplicationBundle {
  const questions = submission.questions;
  const volunteerName =
    answerByName(questions, 'Your Full Name (No middle name, please)') ||
    answerByName(questions, 'Your First Name Only') ||
    'Volunteer';
  const email = answerByName(questions, 'Your Email');
  const phone = answerByName(questions, 'Phone Number');
  const demographics = demographicsFromSubmission(questions);
  const volunteerGender = answerByName(questions, 'Gender');

  const bundle: ExtractedApplicationBundle = {
    sourceItemId: submission.submissionId,
    sourceLabel: FILLOUT_SHORT_TERM_SOURCE_LABEL,
    volunteer: {
      role: 'volunteer',
      name: volunteerName,
      email: email || undefined,
      phone: phone || undefined,
      tags: ['volunteer'],
      demographics,
      ...(volunteerGender ? { gender: volunteerGender } : {}),
    },
  };

  const parentName = answerByName(questions, 'Parents Names');
  const parentEmail = answerByName(questions, "Parent's Email");
  const parentPhone = answerByName(questions, "Parent's Phone Number");
  if (parentName || parentEmail) {
    bundle.parents = {
      role: 'parent',
      name: parentName || `Parent of ${volunteerName}`,
      email: parentEmail || undefined,
      phone: parentPhone || undefined,
      tags: ['parent'],
    };
  }

  const pastorName = answerByName(
    questions,
    "Pastor's first and last name",
    "Pastor's Full Name",
    "Pastor's Name",
  );
  const pastorEmail = answerByName(questions, "Pastor's Email");
  const pastorPhone = answerByName(questions, "Pastor's Phone");
  const church = answerByName(questions, 'Church Name');
  if (pastorName || pastorEmail) {
    bundle.pastor = {
      role: 'pastor',
      name: pastorName || `Pastor for ${volunteerName}`,
      email: pastorEmail || undefined,
      phone: pastorPhone || undefined,
      tags: ['pastor'],
      church: church || undefined,
    };
  }

  const emergencyName = answerByName(
    questions,
    'Full Name of Emergency Contact',
  );
  const emergencyPhone = answerByName(
    questions,
    'Emergency Contact Phone Number',
  );
  if (emergencyName || emergencyPhone) {
    bundle.emergency = {
      name: emergencyName || undefined,
      phone: emergencyPhone || undefined,
    };
  }

  const spouseName = answerByName(questions, 'Spouse Name');
  const maritalStatus = answerByName(questions, 'Marital Status').toLowerCase();
  const married =
    Boolean(spouseName) ||
    maritalStatus === 'married' ||
    maritalStatus === 'engaged';
  if (spouseName && married) {
    const spouseEmail = answerByName(questions, 'Spouse Email');
    const spousePhone = answerByName(
      questions,
      'Spouse Phone Number',
      'Spouse Phone',
    );
    const spouseGender = answerByName(questions, 'Spouse Gender');
    const spouseDemographics = spouseDemographicsFromSubmission(questions);
    bundle.spouse = {
      role: 'spouse',
      name: spouseName,
      email: spouseEmail || undefined,
      phone: spousePhone || undefined,
      tags: ['volunteer'],
      demographics: spouseDemographics,
      ...(spouseGender ? { gender: spouseGender } : {}),
    };
  }

  return bundle;
}
