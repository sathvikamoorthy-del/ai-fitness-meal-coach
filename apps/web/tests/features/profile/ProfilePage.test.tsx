// Profile screen (REQ-406, WI-070).
import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { renderApp } from '../../../src/testing/render';
import { ProfilePage } from '../../../src/features/profile/ProfilePage';
import { SignInPage } from '../../../src/features/auth/SignInPage';
import { router } from '../../../src/app/router';
import { setToken, useAuthStore } from '../../../src/state/authStore';

const validToken = () => `h.${btoa(JSON.stringify({ sub: 'u1', sid: 's1', exp: Math.floor(Date.now() / 1000) + 3600 }))}.sig`;
const saved = { age: 32, sex: 'female', heightCm: 163, weightKg: 68.4, goal: 'lose', fitnessLevel: 'beginner', dailyCalorieTarget: 1434 };
const TOO_LOW = 'This goal gives a calorie target that is too low; choose maintain or gain weight.';

let fetchMock: jest.Mock;
const reply = (status: number, body?: unknown) =>
  fetchMock.mockResolvedValueOnce({ status, json: async () => { if (body === undefined) throw new Error('no body'); return body; } });

const renderProfile = () => renderApp(
  <Routes>
    <Route path="/signin" element={<SignInPage />} />
    <Route path="/profile" element={<ProfilePage />} />
  </Routes>,
  { route: '/profile' }
);
const loaded = () => screen.findByRole('button', { name: 'Save' });
const type = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } });
const pick = (label: string) => fireEvent.click(screen.getByLabelText(label));
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save' }));
const fillValid = () => {
  type('Age', '32'); pick('Female'); type('Height (cm)', '163'); type('Weight (kg)', '68.4'); pick('Lose weight');
  fireEvent.change(screen.getByLabelText('Fitness level'), { target: { value: 'beginner' } });
};
const putBody = () => JSON.parse(fetchMock.mock.calls.find((c) => c[1]?.method === 'PUT')[1].body);

beforeEach(() => {
  fetchMock = jest.fn();
  (global as any).fetch = fetchMock;
  useAuthStore.getState().reset();
  setToken(validToken());
});

describe('ProfilePage', () => {
  it('shows the fields, hints and choices of the mock, metric only, with no target or water target yet', async () => {
    reply(200, { profile: null });
    renderProfile();
    await loaded();
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeInTheDocument();
    for (const label of ['Age', 'Height (cm)', 'Weight (kg)', 'Fitness level', 'Female', 'Male', 'Lose weight', 'Gain weight', 'Maintain weight']) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    for (const hint of ['13 to 100', '100 to 250', '30 to 300']) expect(screen.getByText(hint)).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'choose...' })).toBeInTheDocument();
    expect(screen.getAllByRole('option').map((o) => o.textContent)).toEqual(['choose...', 'Beginner', 'Intermediate', 'Advanced']);
    expect(screen.queryByText(/lb|inch|feet|unit/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Daily calorie target')).not.toBeInTheDocument();
    expect(screen.queryByText(/water|2,?000/i)).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/profile', expect.objectContaining({ headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Bearer /) }) }));
  });

  it('shows saved values and the calorie target when the user returns', async () => {
    reply(200, { profile: saved });
    renderProfile();
    await loaded();
    expect(screen.getByLabelText('Age')).toHaveValue(32);
    expect(screen.getByLabelText('Weight (kg)')).toHaveValue(68.4);
    expect(screen.getByLabelText('Female')).toBeChecked();
    expect(screen.getByLabelText('Lose weight')).toBeChecked();
    expect(screen.getByLabelText('Fitness level')).toHaveValue('beginner');
    expect(screen.getByTestId('calorie-target')).toHaveTextContent('1,434 kcal');
  });

  it('refuses empty and out-of-range fields with their messages and sends nothing', async () => {
    reply(200, { profile: null });
    renderProfile();
    await loaded();
    type('Height (cm)', '300');
    save();
    expect(await screen.findByText('Height must be between 100 and 250 cm.')).toBeInTheDocument();
    for (const m of ['Age is required.', 'Sex is required.', 'Weight is required.', 'Goal is required.', 'Fitness level is required.']) {
      expect(screen.getByText(m)).toBeInTheDocument();
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);              // only the initial GET
  });

  it('saves numbers as numbers and shows the new target', async () => {
    reply(200, { profile: null });
    reply(200, { profile: saved, profileComplete: true });
    renderProfile();
    await loaded();
    fillValid();
    save();
    expect(await screen.findByText('Profile saved')).toBeInTheDocument();
    expect(putBody()).toEqual({ age: 32, sex: 'female', heightCm: 163, weightKg: 68.4, goal: 'lose', fitnessLevel: 'beginner' });
    expect(screen.getByTestId('calorie-target')).toHaveTextContent('1,434 kcal');
  });

  it('saving again with changed values shows the recomputed target', async () => {
    reply(200, { profile: saved });
    reply(200, { profile: { ...saved, goal: 'maintain', dailyCalorieTarget: 1934 }, profileComplete: true });
    renderProfile();
    await loaded();
    pick('Maintain weight');
    save();
    await waitFor(() => expect(screen.getByTestId('calorie-target')).toHaveTextContent('1,934 kcal'));
    expect(putBody().goal).toBe('maintain');
  });

  it('shows the API field messages under their fields', async () => {
    reply(200, { profile: null });
    reply(400, { error: 'invalid-profile', fields: { weightKg: 'Weight must be between 30 and 300 kg.' } });
    renderProfile();
    await loaded();
    fillValid();
    save();
    expect(await screen.findByText('Weight must be between 30 and 300 kg.')).toBeInTheDocument();
  });

  it('shows the too-low message under Goal and keeps the old target (WI-070 q1)', async () => {
    reply(200, { profile: saved });
    reply(400, { error: 'calorie-target-too-low', message: TOO_LOW });
    renderProfile();
    await loaded();
    save();
    expect(await screen.findByText(TOO_LOW)).toBeInTheDocument();
    expect(screen.getByTestId('calorie-target')).toHaveTextContent('1,434 kcal');
    expect(screen.queryByText('Profile saved')).not.toBeInTheDocument();
  });

  it('shows a generic message when saving or loading fails', async () => {
    reply(500, { error: 'internal-error' });
    renderProfile();
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.');
    fillValid();
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    save();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.');
  });

  it('a 401 while saving sends the user to sign-in', async () => {
    reply(200, { profile: saved });
    reply(401, { error: 'session-ended' });
    renderProfile();
    await loaded();
    save();
    await waitFor(() => expect(useAuthStore.getState().token).toBeNull());
  });

  it('is the /profile route of the app', () => {
    const route = router.find((r: any) => r.path === '/profile') as any;
    expect(JSON.stringify(Object.keys(route))).toContain('element');
    expect(route.element.props.children.props.children.type).toBe(ProfilePage);
  });
});
