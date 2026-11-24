// Daily calorie target formula (REQ-406, WI-070).
import { dailyCalorieTarget } from '../../src/profile/calorieTarget';

describe('dailyCalorieTarget', () => {
  it('gives the REQ-406 example: female, 32, 163 cm, 68.4 kg, lose -> 1,434.45 rounded to 1,434', () => {
    expect(dailyCalorieTarget({ sex: 'female', age: 32, heightCm: 163, weightKg: 68.4, goal: 'lose' })).toBe(1434);
  });

  it('adds 5 for male instead of subtracting 161, and applies gain and maintain', () => {
    // base = 800 + 1125 - 150 + 5 = 1780; x1.4 = 2492
    expect(dailyCalorieTarget({ sex: 'male', age: 30, heightCm: 180, weightKg: 80, goal: 'maintain' })).toBe(2492);
    expect(dailyCalorieTarget({ sex: 'male', age: 30, heightCm: 180, weightKg: 80, goal: 'gain' })).toBe(2792);
    expect(dailyCalorieTarget({ sex: 'male', age: 30, heightCm: 180, weightKg: 80, goal: 'lose' })).toBe(1992);
    // the same person as female: base 1614; x1.4 = 2259.6 -> 2260
    expect(dailyCalorieTarget({ sex: 'female', age: 30, heightCm: 180, weightKg: 80, goal: 'maintain' })).toBe(2260);
  });

  it('rounds to the nearest whole kcal', () => {
    // base = 600 + 1000 - 125 - 161 = 1314; x1.4 = 1839.6 -> 1840
    expect(dailyCalorieTarget({ sex: 'female', age: 25, heightCm: 160, weightKg: 60, goal: 'maintain' })).toBe(1840);
    // base = 605 + 1000 - 125 - 161 = 1319; x1.4 = 1846.6 -> 1847; lose -> 1346.6 -> 1347
    expect(dailyCalorieTarget({ sex: 'female', age: 25, heightCm: 160, weightKg: 60.5, goal: 'lose' })).toBe(1347);
  });

  it('can go to 0 or below for lose weight at the low end of the ranges (refused by PUT /profile)', () => {
    // base = 300 + 625 - 500 - 161 = 264; x1.4 = 369.6; -500 = -130.4 -> -130
    expect(dailyCalorieTarget({ sex: 'female', age: 100, heightCm: 100, weightKg: 30, goal: 'lose' })).toBe(-130);
    expect(dailyCalorieTarget({ sex: 'female', age: 100, heightCm: 100, weightKg: 30, goal: 'maintain' })).toBe(370);
  });
});
