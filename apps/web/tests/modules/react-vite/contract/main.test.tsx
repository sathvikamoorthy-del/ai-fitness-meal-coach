/** @jest-environment jsdom */
import { act } from 'react-dom/test-utils';

describe('entry point contract', () => {
  it('mounts the app into #root when it is imported, and mount() can target another element', async () => {
    document.body.innerHTML = '<div id="root"></div><div id="other"></div>';
    await act(async () => { await import('../../../../src/main'); });
    // Adapted in WI-045: '/' redirects to the sign-in screen (it was 'Page not found' while the scaffold had no routes).
    expect(document.getElementById('root')!.textContent).toMatch(/Sign in/);
    const { mount } = await import('../../../../src/main');
    await act(async () => { mount(document.getElementById('other')); });
    expect(document.getElementById('other')!.textContent).toMatch(/Sign in/);
  });

  it('mount() does nothing without an element', async () => {
    const { mount } = await import('../../../../src/main');
    expect(mount(null)).toBeNull();
  });
});
