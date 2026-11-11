import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ORG_CHART, ORG_LEGEND, chartEntries, type OrgEntry } from './orgChart.ts';

function byId(id: string): OrgEntry {
  const found = chartEntries().find((entry) => entry.id === id);
  assert.ok(found, id);
  return found;
}

describe('accountability chart', () => {
  it('keeps the vision, mission, title, and site from the chart', () => {
    assert.equal(ORG_CHART.title, 'Accountability Chart');
    assert.equal(ORG_CHART.site, 'www.i58global.org');
    assert.equal(ORG_CHART.vision, 'That the Whole World Would See The Glory of God');
    assert.equal(ORG_CHART.missionLead, 'To recruit, send, and organize relief workers:');
    assert.equal(
      ORG_CHART.missionRest,
      'Empowering them to provide aid and share hope to the refugees in Greece and beyond.',
    );
  });

  it('keeps the color code labels in chart order', () => {
    assert.deepEqual(
      ORG_LEGEND.map((item) => item.label),
      [
        'Board Members',
        'Locations / Teams',
        'Executive Admin Team',
        'Field Projects',
        'Coordinators / Project Leaders',
        'External / Internal Partners',
        'Long Term Workers',
        'Open Roles',
      ],
    );
  });

  it('keeps ministry partners and the board duties', () => {
    assert.deepEqual(ORG_CHART.partners, [
      'Hellenic Ministries (Greece)',
      'Eurorelief (Greece)',
      'CRR (Netherlands)',
      'Interserve (Germany)',
      'Global Nomads (Germany)',
      'Destinations International (USA)',
    ]);
    assert.deepEqual(
      ORG_CHART.board.map((member) => [member.headings[0], member.name, member.open]),
      [
        ['Chief Finance Officer', 'Kirby Waddle', undefined],
        ['Executive PR Director', '(Amos Kauffman)', 'Open Position'],
        ['Recording Secretary', 'Naomi Byler', undefined],
        ['Greece - Executive Field Director', 'Nate Shrock', undefined],
        ['Human Resources', 'John Kauffman', undefined],
        ['Germany - Executive Field Director', 'Henry Troyer', undefined],
        ['Stateside Coordinators', 'Marlin & Amy', undefined],
      ],
    );
    assert.deepEqual(byId('cfo').duties, [
      'Accounts Payable',
      'Accounts Receivable',
      'Profit & Loss Reports',
      'Budgeting',
      'LMA',
    ]);
    assert.deepEqual(byId('implementer').duties, [
      'Lead Board Meetings',
      'Legal Representation',
      "Communications with NGO's",
      'Church Networking',
      'Leads in Problem Solving',
      "Processing Visionary's Ideas",
      'LMA (Lead, Manage & Hold Accountable)',
    ]);
    assert.deepEqual(byId('greece-field-director').duties, [
      'Approve Field Budget',
      'Cascading Messages',
      'Member Care',
      'Interim Director',
      'Liaison',
      'LMA',
    ]);
    assert.deepEqual(byId('stateside-coordinators').duties, [
      'Organize Short Term Teams',
      'Stateside Training & Orientation',
      'LMA',
    ]);
  });

  it('keeps every team, location, and open role', () => {
    const entries = chartEntries();
    const opens = entries.map((entry) => entry.open).filter((label) => label != null);
    assert.deepEqual(
      opens.filter((label) => label === 'Open Position'),
      ['Open Position', 'Open Position'],
    );
    assert.equal(opens.filter((label) => label === 'Open Role').length, 3);
    assert.equal(opens.filter((label) => label === 'Open Roles').length, 6);

    assert.equal(byId('athens').note, '(Malakasa)');
    assert.equal(byId('samos-coordinator').name, 'Nick & Lisa Berringer');
    assert.equal(byId('chad-fonda').name, 'Chad & Fonda Martin');
    assert.equal(byId('chad-fonda').note, '(DNI Partners)');
    assert.equal(byId('twila-rohrer').name, 'Twila Rohrer');
    assert.equal(byId('lesvos-coordinators').name, 'Paul & Marilyn Lehman');
    assert.deepEqual(
      byId('interns-2024').children?.map((person) => person.name),
      ['Joshua Burkholder', 'Eric Burkholder', 'Larisha Musser', 'Tara Hershberger'],
    );
    assert.deepEqual(
      byId('long-term-camp-staff').children?.map((person) => person.name),
      [
        'Sabrina Miller',
        'Cheyanne Miller',
        'Marganitha Guenther',
        'Amanda Fisher',
        'Felicity Nolt',
        'Lesh Martin',
        'Dawn Nolt',
        'Courtney Gingerich',
        'Gilbert Nolt',
        'Kevin Kinsinger',
        'Jordan Beachy',
        'Jason Bender',
      ],
    );
    assert.deepEqual(byId('financial-tracking').headings, [
      'Financial Tracking',
      'Short Term Teams',
    ]);
    assert.equal(byId('poc-couple').headings[0], 'POC/Short term couple');
    assert.equal(byId('short-term-coordination').headings[0], 'Short term Team Coordination');
    assert.equal(byId('alen-liz').name, 'Alen & Liz');
    assert.equal(byId('alen-liz').note, '(InterServe)');
    assert.equal(byId('anna-eims-wolfe').name, 'Anna Eims-Wolfe');
    assert.equal(byId('giessen').headings[0], 'Giessen');
    assert.equal(byId('neustadt').headings[0], 'Neustadt');
    assert.equal(byId('taunustein').headings[0], 'Taunustein');
    assert.equal(byId('exec-admin-leader').headings[0], 'Executive Admin Team Leader');
    assert.equal(byId('exec-admin-leader').name, undefined);
    assert.deepEqual(
      byId('germany-womens').children?.map((person) => person.name),
      ['Susanna Lambright', 'Marta Bergen'],
    );
    assert.equal(byId('rodney-nolt').headings[0], 'Rodney & Dawn Nolt');
    assert.equal(byId('rodney-nolt').note, 'Executive Director for Eurorelief');
    assert.equal(byId('savvas-liaison').note, 'Oasis Project / Greek Liaison');
    assert.equal(byId('member-care-director').open, 'Open Position');
    assert.equal(byId('communications-hr').name, 'Marganitha Guenther');
    assert.equal(byId('stateside-coordinator').name, 'Marlin & Amy Hostetler');
  });
});
