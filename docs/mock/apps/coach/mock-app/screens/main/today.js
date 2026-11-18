import { pageHead, badge, esc } from '../../shared/components.js?v=1';
import { button } from '../../shared/form.js?v=1';

export const meta = { code: 'S06', name: 'Today checklist', side: 'main', icon: 'home', nav: 'Today', roles: ['user'] };

const dayNd = 'How a plan day (Day 1 to 7) maps to a calendar date is not defined.';

const item = (label, done, attrs) =>
  `<div class="card" style="display:flex;justify-content:space-between;align-items:center;gap:8px">
    <span>${done ? '☑' : '☐'} ${label}</span>
    ${done ? badge('Done', 'good') : `<button class="btn" ${attrs}>Tick</button>`}
  </div>`;

const tickAttrs = (key, label) =>
  key === 'breakfast'
    ? 'data-action="tick-breakfast"'
    : `data-toast="${esc(label)} would be ticked off. Ticking only marks it; it does not create a log (DB design)."`;

export function render({ data }) {
  const c = data.checklist ?? {};
  const w = data.workoutPlan?.days?.[0] ?? { day: '', title: '' };
  const meal = (t) => data.mealPlan?.meals?.find((m) => m.type === t)?.name ?? '';
  return `${pageHead('Today', `<small class="note">${esc(data.today)}</small>`)}
  ${item(`Workout: ${esc(w.day)} · ${esc(w.title)} <button class="link" data-not-defined="${dayNd}">which day?</button>`, c.workout, tickAttrs('workout', 'Workout'))}
  ${['Breakfast', 'Lunch', 'Dinner', 'Snack']
    .map((t) => item(`${t}: ${esc(meal(t))}`, c[t.toLowerCase()], tickAttrs(t.toLowerCase(), t)))
    .join('')}
  <p class="note">Ticking marks an item done; it does not create a log (DB design: checklist_ticks).</p>
  <div class="card"><strong>Log</strong><div class="actions">
    ${button('Log a meal', { action: 'log-meal', goto: 'S07' })}
    ${button('Log a workout', { action: 'log-workout', goto: 'S09' })}
    ${button('Add water', { action: 'add-water', goto: 'S11' })}
    ${button('Add weight', { action: 'add-weight', goto: 'S10' })}
  </div></div>`;
}
