import { pageHead, badge, esc } from '../../shared/components.js?v=1';
import { button } from '../../shared/form.js?v=1';

export const meta = { code: 'S04', name: 'AI weekly workout plan', side: 'main', icon: 'activity', nav: 'Workouts', roles: ['user'] };

export function render({ data }) {
  const w = data.workoutPlan ?? {};
  const p = data.profile ?? {};
  const head = pageHead(
    'AI workout plan',
    w.generated
      ? button('Regenerate', { notDefined: 'Whether the user can regenerate or edit the AI workout plan is not defined (REQ-409 open question).' })
      : button('Generate', { action: 'generate-workout', primary: true })
  );
  const basis = `<p class="note">Based on: ${esc(p.goal)}, ${esc(p.fitnessLevel)}. Every exercise comes from the exercise library.</p>`;
  const body = w.generated
    ? `<p>${badge('AI plan · saved', 'good')}</p>${(w.days ?? [])
        .map(
          (d) =>
            `<div class="card"><strong>${esc(d.day)} · ${esc(d.title)}</strong>${
              d.exercises.length ? `<ul>${d.exercises.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : '<p class="note">Rest day</p>'
            }</div>`
        )
        .join('')}`
    : `<div class="card"><p>No workout plan yet.</p><p class="note">Generate asks the AI for a week of workouts.</p>
       <button class="link" data-not-defined="Which AI provider or model is used is not defined (REQ-409 open question).">Which AI?</button></div>`;
  return `${head}${basis}${body}
  <div class="card"><div class="actions">
    <button class="btn" data-spec-code="S12">Exercise library</button>
    <button class="btn" data-spec-code="S13">Build my own plan</button>
    <button class="btn" data-spec-code="S14">History and records</button>
  </div></div>`;
}
