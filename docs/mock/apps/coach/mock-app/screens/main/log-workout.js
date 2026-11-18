import { pageHead, badge, table, esc } from '../../shared/components.js?v=1';
import { input, button } from '../../shared/form.js?v=1';

export const meta = { code: 'S09', name: 'Log a workout session', side: 'main', icon: 'activity', roles: ['user'] };

export function render({ data }) {
  const w = data.workoutLog ?? { exercises: [] };
  const rows = w.exercises.map((e) => [esc(e.name), e.sets, e.reps, `${e.kg} kg`]);
  return `${pageHead('Log workout')}
  ${w.saved ? `<p>${badge(`Session saved for ${w.date}`, 'good')}</p>` : ''}
  <div class="card"><div class="row">
    ${input('Date', w.date, { toast: 'The session date would be set (one session per date, DB design).' })}
    <button class="link" data-not-defined="Whether a session is pre-filled from today's plan is not defined; here the exercises are entered by hand.">Fill from today's plan?</button>
  </div></div>
  ${table(['Exercise', 'Sets', 'Reps', 'Weight'], rows)}
  <div class="actions">
    ${button('+ Add exercise', { toast: 'An exercise from the library would be added with sets, reps and weight.' })}
    ${w.saved ? '' : button('Save', { action: 'save-workout', primary: true })}
  </div>
  <p class="note">Recorded per exercise: sets, reps and weight in kg (DB design).</p>
  <button class="btn" data-spec-code="S14">History and records</button>`;
}
