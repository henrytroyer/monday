import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { JANE_MILLER, previewStatusForNewAccount } from '../mock/fixtures.ts';
import { PASSPORT_EXAMPLE_SRC } from '../process/passportDetails.ts';
import { COORDINATOR_EMAIL } from './volunteerGuide.ts';
import {
  MOCK_PROFILE_PHOTO,
  MOCK_VOLUNTEER_PHONE,
  NOT_ON_FILE,
  myInfoFor,
} from './myInfo.ts';

describe('my info', () => {
  it('gives the preview volunteer the records she needs on the field', () => {
    const info = myInfoFor(JANE_MILLER);

    assert.equal(info.name, 'Jane Miller');
    assert.equal(info.email, 'jane.miller@example.com');
    assert.equal(info.phone, MOCK_VOLUNTEER_PHONE);
    assert.equal(info.photo, MOCK_PROFILE_PHOTO);
    assert.equal(info.birthday, 'April 14, 1998');
    assert.equal(info.gender, 'Female');
    assert.deepEqual(info.address, ['428 Oak Street', 'Charlotte, NC 28202', 'USA']);
    assert.equal(info.passportPhoto, PASSPORT_EXAMPLE_SRC);
    assert.equal(info.passportNumber, '548291763');
    assert.equal(info.passportExpiration, 'August 18, 2029');
    assert.equal(info.location, 'Lesvos (confirmed)');
    assert.equal(info.term, 'Summer 2026');
    assert.equal(info.length, '3 months');
    assert.equal(info.airport, 'Charlotte (CLT)');
    assert.equal(info.flights?.recordLocator, 'I58-7K2M');
    assert.equal(info.flights?.passenger, 'Jane Miller');
    assert.equal(info.flights?.arrivalFlight, 'Olympic Air OA 221');
    assert.match(info.flights?.arrival ?? '', /Mytilene/);
    assert.equal(info.flights?.returnFlight, 'Olympic Air OA 220');
    assert.equal(info.flights?.legs[0]?.fromCode, 'CLT');
    assert.equal(info.flights?.legs.at(-1)?.toCode, 'CLT');
    assert.deepEqual(
      info.documents.map((document) => document.statusLabel),
      ['On file', 'On file'],
    );
    assert.equal(info.documents[0]?.draft?.name, 'Jane Miller');
    assert.equal(info.contacts[0]?.role, 'Emergency');
    assert.equal(info.contacts[0]?.name, 'Daniel Miller');
    assert.equal(info.contacts[0]?.phone, '(555) 014-7731');
    assert.equal(info.contacts.at(-1)?.email, COORDINATOR_EMAIL);
    assert.match(info.medical, /inhaler/);
    assert.equal(info.languages, 'English');
    assert.equal(info.skills, 'Childcare, Teaching');
    assert.equal(info.family, 'Single. No children are coming with you');
  });

  it('uses saved application answers instead of the preview examples', () => {
    const info = myInfoFor({
      ...JANE_MILLER,
      generalInformation: {
        gender: 'female',
        birthdate: '2001-11-02',
        phone: '7175550199',
        street: '12 King Street',
        city: 'Lancaster',
        state: 'PA',
        postalCode: '17602',
        country: 'USA',
      },
      passportDetails: {
        photoFileName: '',
        passportNumber: '111222333',
        expirationDate: '2030-01-05',
      },
      termOfService: {
        locationPreferences: ['Germany'],
        lengthOfTerm: 'other',
        otherTerm: '6 weeks',
        preferredDates: 'Fall 2026',
        nearbyAirport: 'PHL',
      },
      location: 'Preference not listed',
      otherContacts: {
        churchName: '',
        pastorName: '',
        pastorEmail: '',
        pastorPhone: '',
        parentsNames: '',
        parentEmail: '',
        parentPhone: '',
        emergencyName: 'Ada Miller',
        emergencyEmail: 'ada@example.com',
        emergencyPhone: '7175550100',
        emergencyRelation: ['Parent'],
        accountableName: '',
        accountableEmail: '',
        accountablePhone: '',
        fieldContact: 'no',
        fieldContactName: '',
      },
      spouseApplication: {
        spouseJoining: 'yes',
        name: 'Paul Miller',
        email: 'paul@example.com',
        phone: '7175550188',
        previousVolunteer: 'no',
        lastTermDate: '',
        birthdate: '',
        gender: 'male',
        passportUpdated: '',
        passportPhotoFileName: '',
        passportNumber: '',
        passportExpiration: '',
        updateProfilePhoto: '',
        profilePhotoFileName: '',
        testimony: '',
        languages: [],
        otherLanguage: '',
        skills: [],
        otherSkills: '',
        medical: '',
      },
      historySkillsLanguages: {
        medical: 'Penicillin allergy',
        travelledInternationally: 'yes',
        heardAbout: [],
        friendName: '',
        whyVolunteer: '',
        testimony: '',
        occupation: 'Nurse',
        skills: ['Medical', 'Other'],
        otherSkills: 'Translation',
        leadership: '',
        leadershipExperience: '',
        languages: ['English', 'Arabic'],
        otherLanguage: '',
      },
      familyStatus: {
        maritalStatus: 'married',
        childrenComing: 'yes',
        familyMembers: 'Paul, 29, Male',
      },
      preparationDocuments: {
        background_check_sent: {
          name: 'Jane Miller',
          date: '2001-11-02',
          confirmed: 'yes',
          submitted: true,
          review: 'received',
        },
        safeguarding_certificate: {
          name: 'Jane Miller',
          date: '2026-03-02',
          confirmed: 'yes',
          submitted: true,
          review: 'declined',
        },
      },
    });

    assert.equal(info.phone, '(717) 555-0199');
    assert.equal(info.birthday, 'November 2, 2001');
    assert.deepEqual(info.address, ['12 King Street', 'Lancaster, PA 17602', 'USA']);
    assert.equal(info.passportPhoto, null);
    assert.equal(info.passportNumber, '111222333');
    assert.equal(info.passportExpiration, 'January 5, 2030');
    assert.equal(info.location, 'Germany');
    assert.equal(info.length, '6 weeks');
    assert.equal(info.airport, 'PHL');
    assert.equal(info.documents[0]?.statusLabel, 'Received by i58');
    assert.equal(info.documents[0]?.onFile, false);
    assert.equal(info.documents[1]?.statusLabel, 'Not accepted');
    assert.deepEqual(
      info.contacts.map((contact) => contact.role),
      ['Emergency', 'Spouse', 'i58'],
    );
    assert.equal(info.contacts[1]?.name, 'Paul Miller');
    assert.equal(info.medical, 'Penicillin allergy');
    assert.equal(info.languages, 'English, Arabic');
    assert.equal(info.skills, 'Medical, Translation');
    assert.equal(info.family, 'Married. Paul, 29, Male');
  });

  it('leaves a new volunteer blank instead of showing the preview record', () => {
    const info = myInfoFor(
      previewStatusForNewAccount({ name: 'Sam Lee', email: 'sam@example.com' }),
    );

    assert.equal(info.name, 'Sam Lee');
    assert.equal(info.photo, MOCK_PROFILE_PHOTO);
    assert.equal(info.phone, NOT_ON_FILE);
    assert.equal(info.birthday, NOT_ON_FILE);
    assert.deepEqual(info.address, [NOT_ON_FILE]);
    assert.equal(info.passportNumber, NOT_ON_FILE);
    assert.equal(info.passportPhoto, null);
    assert.equal(info.location, NOT_ON_FILE);
    assert.equal(info.term, NOT_ON_FILE);
    assert.equal(info.length, NOT_ON_FILE);
    assert.equal(info.flights, null);
    assert.equal(info.documents[0]?.statusLabel, NOT_ON_FILE);
    assert.equal(info.documents[0]?.draft, null);
    assert.deepEqual(
      info.contacts.map((contact) => contact.role),
      ['i58'],
    );
    assert.equal(info.medical, NOT_ON_FILE);
  });
});
