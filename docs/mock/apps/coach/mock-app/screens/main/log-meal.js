import { pageHead, badge, table, esc } from '../../shared/components.js?v=1';
import { input, select, radios, button } from '../../shared/form.js?v=1';

export const meta = { code: 'S07', name: 'Log a meal', side: 'main', icon: 'parcel', roles: ['user'] };

export function render({ data }) {
  const l = data.mealLog ?? { items: [] };
  const last = l.items[l.items.length - 1] ?? {};
  const rows = l.items.map((i) => [esc(i.food), `${i.grams} g`, `${i.kcal} kcal`]);
  return `${pageHead('Log meal', `<small class="note">${esc(data.today)}</small>`)}
  ${l.saved ? `<p>${badge(`${l.type} saved for today`, 'good')}</p>` : ''}
  <div class="card"><div class="row">
    ${radios('Meal', 'meal', ['Breakfast', 'Lunch', 'Dinner', 'Snack'], l.type)}
    ${select('Food', ['Rolled oats', 'Banana', 'Milk', 'Paneer'], last.food, { toast: 'The food would be chosen from the food library.' })}
    ${input('Amount (g)', last.grams, { type: 'number', toast: 'Amount is entered in grams (DB design: meal_log_items.amount_g).' })}
    ${button('+ Add food', { toast: 'The food would be added to this meal.' })}
  </div></div>
  ${table(['Food', 'Amount', 'Calories'], rows)}
  ${l.saved ? '' : `<div class="actions">${button('Save', { action: 'save-meal', primary: true })}</div>`}
  <p class="note">Target: logging a meal takes under 30 seconds (G2).
    <button class="link" data-not-defined="How the 30-second target is measured is not defined (REQ-417 open question).">How measured?</button></p>`;
}
