import { pageHead, badge, esc } from '../../shared/components.js?v=1';
import { input, radios, button } from '../../shared/form.js?v=1';

export const meta = { code: 'S03', name: 'Dietary preferences and allergies', side: 'main', icon: 'people', roles: ['user'] };

const listNd = 'Whether allergies are free text or chosen from a list is not defined (REQ-407 open question).';

export function render({ data }) {
  const d = data.diet ?? {};
  const chips = (d.allergies ?? [])
    .map((a) => `<button class="badge" data-toast="${esc(a)} would be removed from allergies.">${esc(a)} ✕</button>`)
    .join(' ');
  return `${pageHead('Diet and allergies')}
  <div class="card">
    ${d.saved ? `<p>${badge('Saved with the profile', 'good')}</p>` : ''}
    <div class="row">
      ${radios('Diet', 'diet', ['Vegetarian', 'Non-vegetarian'], d.type)}
      <div class="field"><span>Allergies</span><div>${chips || '<span class="note">None</span>'}</div></div>
      ${input('Add an allergy', '', { placeholder: 'e.g. shellfish', notDefined: listNd })}
    </div>
    <div class="actions">
      ${button('Add', { notDefined: listNd })}
      ${button('Save', { action: 'save-diet', primary: true })}
    </div>
  </div>`;
}
