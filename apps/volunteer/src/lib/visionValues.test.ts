import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CORE_VALUE_NAMES,
  CORE_VALUES_BACKDROP,
  CORE_VALUES_CHILDREN,
  CORE_VALUES_LIBRARY,
  CORE_VALUES_MARK,
  CORE_VALUE_STATEMENTS,
  MISSION_VISION_MARK,
  VISION_VALUES_PHOTO,
} from './visionValues.ts';

describe('vision and values copy', () => {
  it('uses the field photo and the source marks', () => {
    assert.equal(VISION_VALUES_PHOTO, '/brand/volunteer.jpg');
    assert.equal(MISSION_VISION_MARK, '/brand/mission-vision.png');
    assert.equal(CORE_VALUES_MARK, '/brand/core-values.png');
    assert.equal(CORE_VALUES_LIBRARY, '/brand/core-values-library.png');
    assert.equal(CORE_VALUES_CHILDREN, '/brand/core-values-children.png');
    assert.equal(CORE_VALUES_BACKDROP, '/brand/core-values-backdrop.png');
  });

  it('names the six core values in wheel order and keeps the four written statements', () => {
    assert.deepEqual(
      [...CORE_VALUE_NAMES],
      ['Honesty', 'Integrity', 'Trust', 'Focus', 'Faith', 'Passion'],
    );
    assert.deepEqual(
      CORE_VALUE_STATEMENTS.map((item) => item.title),
      ['Walk of Faith', 'Kingdom Passion', 'Forward Focus', 'Integrity'],
    );
    assert.match(CORE_VALUE_STATEMENTS[0]!.body, /open doors of global refugee needs/);
    assert.match(CORE_VALUE_STATEMENTS[1]!.body, /God's people worldwide/);
    assert.match(CORE_VALUE_STATEMENTS[1]!.body, /extend Christ's love/);
    assert.match(CORE_VALUE_STATEMENTS[2]!.body, /future Kingdom tasks/);
    assert.match(CORE_VALUE_STATEMENTS[2]!.body, /accommodate growth/);
    assert.match(CORE_VALUE_STATEMENTS[3]!.body, /truth and love/);
  });
});
