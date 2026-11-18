import { pageHead, badge, esc } from '../../shared/components.js?v=1';
import { select, button } from '../../shared/form.js?v=1';

export const meta = { code: 'S05', name: 'AI meal plan', side: 'main', icon: 'parcel', nav: 'Meals', roles: ['user'] };

export function render({ data }) {
  const m = data.mealPlan ?? {};
  const d = data.diet ?? {};
  const allergies = (d.allergies ?? []).join(', ');
  const fits = `<p class="note">Fits: ${esc(d.type)}; avoids ${esc(allergies || 'nothing')}; goal ${esc(data.profile?.goal)}.</p>`;
  const meals = (m.meals ?? [])
    .map(
      (x) => `<div class="card"><small class="note">${esc(x.type)}</small><br><strong>${esc(x.name)}</strong>
      <p class="note">${esc(x.description)}</p>
      <button class="btn" data-spec-code="S15">Swap with AI</button></div>`
    )
    .join('');
  return `${pageHead('AI meal plan')}
  <div class="card"><div class="row">
    ${select('Plan for', ['Day', 'Week'], m.period, { toast: 'The plan period would change (the user chooses day or week when asking, DB design).' })}
    ${m.generated
      ? button('Regenerate', { notDefined: 'Whether the user can regenerate the AI meal plan is not defined.' })
      : button('Generate', { action: 'generate-meal', primary: true })}
  </div></div>
  ${m.generated
    ? `<p>${badge('AI plan · saved', 'good')} ${badge(d.type + ' only', 'good')}${allergies ? ' ' + badge('No ' + allergies, 'good') : ''}</p>${fits}${meals}
       <p><button class="link" data-not-defined="Whether the meal plan must meet the daily calorie target, and the calories of each planned meal, are not defined (REQ-413 open question).">Calories of this plan?</button></p>
       <div class="actions"><button class="btn" data-spec-code="S16">Grocery list</button><button class="btn" data-spec-code="S17">Food library</button></div>`
    : `<div class="card"><p>No meal plan yet.</p>${fits}
       <button class="link" data-not-defined="Which AI provider or model is used is not defined (REQ-413 open question).">Which AI?</button></div>`}`;
}
