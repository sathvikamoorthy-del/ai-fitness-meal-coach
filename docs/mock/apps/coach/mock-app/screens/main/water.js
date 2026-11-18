import { pageHead, esc } from '../../shared/components.js?v=1';
import { input, button } from '../../shared/form.js?v=1';

export const meta = { code: 'S11', name: 'Water intake log', side: 'main', icon: 'activity', roles: ['user'] };

const n = (v) => Number(v).toLocaleString('en-GB');

export function render({ data }) {
  const w = data.water ?? {};
  const target = data.profile?.waterTargetMl ?? 0;
  const pct = target ? Math.min(100, Math.round((w.totalMl / target) * 100)) : 0;
  return `${pageHead('Water', `<small class="note">${esc(data.today)}</small>`)}
  <div class="hero"><small>Water today</small><h1>${n(w.totalMl)} / ${n(target)} ml</h1>
    <div style="background:rgba(255,255,255,.3);border-radius:6px;height:10px"><div style="background:#fff;border-radius:6px;height:10px;width:${pct}%"></div></div></div>
  <div class="card"><div class="row">${input('Amount (ml)', w.amountMl, { type: 'number' })}</div>
    <div class="actions">${button('Add', { action: 'add-water-amount', primary: true })}</div>
    <p class="note">The day's total is the sum of the amounts added today (REQ-420). Target 2,000 ml by default (DB design).</p></div>`;
}
