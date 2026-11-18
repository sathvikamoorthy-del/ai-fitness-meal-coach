import { pageHead, badge, esc } from '../../shared/components.js?v=1';
import { input, select, radios, button } from '../../shared/form.js?v=1';

export const meta = { code: 'S02', name: 'Profile and goal', side: 'main', icon: 'people', nav: 'Profile', roles: ['user'] };

const n = (v) => Number(v).toLocaleString('en-GB');

export function render({ data }) {
  const p = data.profile ?? {};
  const d = data.diet ?? {};
  return `${pageHead('Profile', button('Sign out', { toast: 'Sign out would end the session and return to Sign in (REQ-405).' }))}
  <div class="card">
    ${p.saved ? `<p>${badge('Saved', 'good')}</p>` : ''}
    <div class="row">
      ${input('Age', p.age, { type: 'number', notDefined: 'Allowed ranges for age, height and weight are not defined (REQ-406 open question).' })}
      ${radios('Sex', 'sex', ['Female', 'Male'], p.sex, { toast: 'Sex is an input to the daily calorie target (DB design: profiles.sex).' })}
      ${input('Height (cm)', p.heightCm, { type: 'number' })}
      ${input('Weight (kg)', p.weightKg, { type: 'number' })}
      ${radios('Goal', 'goal', ['Lose weight', 'Gain weight', 'Maintain weight'], p.goal)}
      ${select('Fitness level', ['Beginner', 'Intermediate', 'Advanced'], p.fitnessLevel)}
    </div>
    <div class="actions">${button('Save', { action: 'save-profile', primary: true })}</div>
  </div>
  ${p.saved
    ? `<div class="card"><div class="kv">
      <div><span>Daily calorie target</span><strong>${n(p.dailyCalorieTarget)} kcal</strong></div>
      <div><span>Daily water target</span><strong>${n(p.waterTargetMl)} ml</strong></div>
    </div><p class="note">Target = Mifflin-St Jeor × 1.4, −500 to lose, +300 to gain; set on save (DB design).</p></div>`
    : ''}
  <div class="card">
    <strong>Diet and allergies</strong>
    <p class="note">${d.saved ? `${esc(d.type)}; allergies: ${esc((d.allergies ?? []).join(', ') || 'none')}` : 'Not set yet.'}</p>
    ${button('Diet and allergies', { action: 'open-diet', goto: 'S03' })}
  </div>`;
}
