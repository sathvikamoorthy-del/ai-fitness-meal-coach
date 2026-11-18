import { pageHead, badge, table, esc } from '../../shared/components.js?v=1';
import { input, button } from '../../shared/form.js?v=1';

export const meta = { code: 'S10', name: 'Weight log', side: 'main', icon: 'activity', roles: ['user'] };

const targetNd = 'Whether a new weight also recomputes the daily calorie target is not defined (the target is set when the profile is saved).';

export function render({ data }) {
  const w = data.weight ?? { entries: [] };
  const entries = w.added ? [{ date: '18 Nov 2026', kg: w.newKg }, ...w.entries] : w.entries;
  return `${pageHead('Weight')}
  ${w.added
    ? `<p>${badge('Weight added', 'good')}</p><p class="note">Profile weight is now ${esc(data.profile?.weightKg)} kg (DB design: copied from the latest log).
       <button class="link" data-not-defined="${targetNd}">Calorie target?</button></p>`
    : ''}
  <div class="card"><div class="row">
    ${input('Weight (kg)', w.newKg, { type: 'number' })}
    ${input('Date', '18 Nov 2026', { toast: 'The date of the entry would be set.' })}
  </div>
  ${w.added ? '' : `<div class="actions">${button('Add', { action: 'save-weight', primary: true })}</div>`}</div>
  ${table(['Date', 'Weight'], entries.map((e) => [esc(e.date), `${e.kg} kg`]))}
  <div class="actions"><button class="btn" data-spec-code="S19">Progress charts</button></div>`;
}
