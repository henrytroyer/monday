import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PipelineSection, Volunteer } from '../types/volunteer';
import { filterPipeline, filterSectionsBySearch } from './filterApplications';

const coupleVolunteer: Volunteer = {
  id: '12112990677',
  name: 'Arlen & Sharon Fisher',
  locationPreference: 'Lesvos',
  location: 'Athens',
  status: 'Housing Confirmed',
  timelineId: 'summer-2026-a',
  couplePreview: {
    displayName: 'Arlen & Sharon Fisher',
    primaryFirstName: 'Arlen',
    primaryEmail: 'arlen.fisher@example.com',
    partnerName: 'Sharon Fisher',
    partnerFirstName: 'Sharon',
    partnerEmail: 'singlovesmile99@gmail.com',
  },
};

const pipeline: PipelineSection[] = [
  {
    stage: 'Confirmed Location',
    volunteers: [coupleVolunteer],
  },
];

describe('filterPipeline couple search', () => {
  it('matches spouse first name', () => {
    const result = filterPipeline(pipeline, {
      locations: [],
      timelineIds: [],
      searchQuery: 'Sharon',
    });
    assert.equal(result[0]?.volunteers.length, 1);
  });

  it('matches spouse email', () => {
    const result = filterPipeline(pipeline, {
      locations: [],
      timelineIds: [],
      searchQuery: 'singlovesmile99@gmail.com',
    });
    assert.equal(result[0]?.volunteers.length, 1);
  });

  it('does not match unrelated query', () => {
    const result = filterPipeline(pipeline, {
      locations: [],
      timelineIds: [],
      searchQuery: 'Loretta',
    });
    assert.equal(result.length, 0);
  });
});

describe('filterSectionsBySearch', () => {
  const sections = [
    {
      stage: 'Inquiry',
      volunteers: [coupleVolunteer],
    },
    {
      stage: 'Empty',
      volunteers: [] as Volunteer[],
    },
  ];

  it('keeps empty stages when the query is blank', () => {
    const result = filterSectionsBySearch(sections, '  ');
    assert.equal(result.length, 2);
  });

  it('drops empty stages after a matching name filter', () => {
    const result = filterSectionsBySearch(sections, 'Sharon');
    assert.equal(result.length, 1);
    assert.equal(result[0]?.stage, 'Inquiry');
    assert.equal(result[0]?.volunteers.length, 1);
  });

  it('drops all stages when nothing matches', () => {
    const result = filterSectionsBySearch(sections, 'Loretta');
    assert.equal(result.length, 0);
  });
});
