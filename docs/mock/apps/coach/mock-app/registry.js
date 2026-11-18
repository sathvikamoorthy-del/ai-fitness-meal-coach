// knm-managed: v1 version: 1
// Approved screen modules. Add a line here when a screen is added: CODE: './screens/<side>/<name>.js?v=1'
export const SCREENS = {
  S01: './screens/main/sign-in.js?v=1',
  S02: './screens/main/profile.js?v=1',
  S03: './screens/main/diet.js?v=1',
  S04: './screens/main/workout-plan.js?v=1',
  S05: './screens/main/meal-plan.js?v=1',
  S06: './screens/main/today.js?v=1',
  S07: './screens/main/log-meal.js?v=1',
  S08: './screens/main/summary.js?v=1',
  S09: './screens/main/log-workout.js?v=1',
  S10: './screens/main/weight.js?v=1',
  S11: './screens/main/water.js?v=1'
};

export async function loadScreen(code) {
  const path = SCREENS[code];
  if (!path) throw new Error(`Unknown screen code: ${code}`);
  return import(path);
}
