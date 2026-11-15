'use strict';

const { formatClock } = require('../public/js/clock');

describe('local clock formatter', () => {
  test('formats an instant in Kolkata time rather than UTC', () => {
    const instant = new Date('2026-11-15T07:17:00.000Z');

    expect(formatClock(instant, 'Asia/Kolkata')).toBe('Sun, 15 Nov · 12:47 PM');
  });
});
