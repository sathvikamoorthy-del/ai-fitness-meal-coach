import { pageHead, badge } from '../../shared/components.js?v=1';
import { input, button } from '../../shared/form.js?v=1';

export const meta = { code: 'S01', name: 'Sign up and sign in', side: 'main', icon: 'exit', bare: true, roles: ['user'] };

export function render({ data }) {
  const a = data.account ?? {};
  return `${pageHead('AI Fitness & Meal Coach')}
  <div class="card">
    ${a.created
      ? `<p>${badge('Account created', 'good')}</p><p class="note">Sign in with the same email and password.</p>`
      : `<p class="note">Create an account, or sign in if you have one.</p>`}
    <div class="row">
      ${input('Email', a.email, { type: 'email', toast: 'Email would be entered.' })}
      ${input('Password', a.password, { type: 'password', notDefined: 'Password rules (length, characters) are not defined (REQ-404 open question).' })}
    </div>
    <div class="actions">
      ${button('Sign in', { action: 'sign-in', primary: !!a.created, goto: 'S02' })}
      ${button('Sign up', { action: 'sign-up', primary: !a.created })}
    </div>
    <p><button class="link" data-not-defined="Password reset and email verification are not defined (REQ-404 open question).">Forgot password?</button></p>
  </div>
  <p class="note">A wrong password is refused (REQ-404).</p>`;
}
