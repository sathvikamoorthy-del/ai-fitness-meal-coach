import { pageHead, table, esc } from '../../shared/components.js?v=1';

export const meta = { code: 'S08', name: 'Daily calorie and macro summary', side: 'main', icon: 'check', nav: 'Calories', roles: ['user'] };

const macroNd = 'Macro targets (protein, carbs, fat) are not defined; only a daily calorie target is (REQ-418 open question).';
const editNd = 'Whether logged meals can be edited or deleted is not defined (REQ-418 open question).';
const n = (v) => Number(v).toLocaleString('en-GB');

export function render({ data }) {
  const t = data.totals ?? {};
  const target = data.profile?.dailyCalorieTarget ?? 0;
  const pct = target ? Math.min(100, Math.round((t.calories / target) * 100)) : 0;
  const l = data.mealLog ?? { items: [] };
  const rows = l.saved
    ? l.items.map((i) => [esc(l.type), esc(i.food), `${i.grams} g`, i.kcal, i.protein, i.carbs, i.fat,
        `<button class="link" data-not-defined="${editNd}">Edit</button>`])
    : [];
  const macro = (v, label) =>
    `<div class="count"><strong>${v} g</strong><span>${label}</span><br><button class="link" data-not-defined="${macroNd}">target?</button></div>`;
  return `${pageHead('Calories today', `<small class="note">${esc(data.today)}</small>`)}
  <div class="hero"><small>Calories</small><h1>${n(t.calories)} / ${n(target)} kcal</h1>
    <div style="background:rgba(255,255,255,.3);border-radius:6px;height:10px"><div style="background:#fff;border-radius:6px;height:10px;width:${pct}%"></div></div>
    <small>${n(Math.max(0, target - t.calories))} kcal left</small></div>
  <div class="counts">${macro(t.protein, 'Protein')}${macro(t.carbs, 'Carbs')}${macro(t.fat, 'Fat')}</div>
  <div class="card"><strong>Meals logged today</strong>
    ${rows.length ? table(['Meal', 'Food', 'Amount', 'kcal', 'P (g)', 'C (g)', 'F (g)', ''], rows) : '<p class="note">Nothing logged yet.</p>'}
    <p class="note">Totals are the sum of the meals logged today (REQ-418).</p>
  </div>`;
}
