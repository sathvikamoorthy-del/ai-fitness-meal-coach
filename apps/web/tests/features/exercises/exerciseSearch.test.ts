// Exercise search rule (REQ-408, WI-072): contains, ignoring case and spaces at the ends; order kept.
import { filterExercises, noMatchMessage } from '../../../src/features/exercises/exerciseSearch';

const list = ['Back squat', 'Bench press', 'Goblet squat', 'Incline bench press', 'Pull-up', 'Push-up'].map((name, i) => ({ id: `id${i}`, name }));
const names = (typed: string) => filterExercises(list, typed).map((e) => e.name);

describe('filterExercises', () => {
  it('keeps names that contain the text anywhere, in list order', () => {
    expect(names('squat')).toEqual(['Back squat', 'Goblet squat']);
    expect(names('ench')).toEqual(['Bench press', 'Incline bench press']);
  });

  it('ignores letter case and spaces at the ends', () => {
    expect(names('SQUAT')).toEqual(['Back squat', 'Goblet squat']);
    expect(names('  squat ')).toEqual(['Back squat', 'Goblet squat']);
  });

  it('keeps inner spaces and punctuation as typed', () => {
    expect(names('bench press')).toEqual(['Bench press', 'Incline bench press']);
    expect(names('pull-up')).toEqual(['Pull-up']);
    expect(names('pullup')).toEqual([]);
  });

  it('shows the full list for an empty or spaces-only search', () => {
    expect(filterExercises(list, '')).toBe(list);
    expect(filterExercises(list, '   ')).toBe(list);
  });

  it('returns nothing when no name matches', () => {
    expect(names('zumba')).toEqual([]);
  });
});

describe('noMatchMessage', () => {
  it('quotes the trimmed text', () => {
    expect(noMatchMessage('  zumba ')).toBe('No exercises match "zumba"');
    expect(noMatchMessage('a"b')).toBe('No exercises match "a"b"');
  });
});
