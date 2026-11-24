// "Diet and allergies" section of the Profile screen (REQ-407, WI-071).
import React from 'react';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { renderApp } from '../../../src/testing/render';
import { DietSection } from '../../../src/features/profile/DietSection';
import { ProfilePage } from '../../../src/features/profile/ProfilePage';
import { setToken, useAuthStore } from '../../../src/state/authStore';

const validToken = () => `h.${btoa(JSON.stringify({ sub: 'u1', sid: 's1', exp: Math.floor(Date.now() / 1000) + 3600 }))}.sig`;

let fetchMock: jest.Mock;
let dietReplies: (() => Promise<unknown>)[];
const reply = (status: number, body?: unknown) =>
  dietReplies.push(async () => ({ status, json: async () => { if (body === undefined) throw new Error('no body'); return body; } }));
const putCall = () => fetchMock.mock.calls.find((c) => c[0] === '/api/profile/diet' && c[1]?.method === 'PUT');
const putBody = () => JSON.parse(putCall()![1].body);

const renderSection = () => renderApp(<DietSection />);
const loaded = () => screen.findByRole('button', { name: 'Save diet and allergies' });
const typeAllergy = (value: string) => fireEvent.change(screen.getByLabelText('Allergies'), { target: { value } });
const clickAdd = () => fireEvent.click(screen.getByRole('button', { name: 'Add' }));
const save = () => fireEvent.click(screen.getByRole('button', { name: 'Save diet and allergies' }));
const tags = () => {
  const list = screen.queryByLabelText('Allergies list');
  return list ? within(list).queryAllByRole('listitem').map((li) => li.textContent) : [];
};

beforeEach(() => {
  dietReplies = [];
  fetchMock = jest.fn(async (url: string) => {
    if (url === '/api/profile') return { status: 200, json: async () => ({ profile: null }) };
    const next = dietReplies.shift();
    if (!next) throw new Error(`no reply queued for ${url}`);
    return next();
  });
  (global as any).fetch = fetchMock;
  useAuthStore.getState().reset();
  setToken(validToken());
});

describe('DietSection', () => {
  it('shows the saved diet and allergies when the user returns', async () => {
    reply(200, { diet: 'vegetarian', allergies: ['Egg', 'Peanuts'] });
    renderSection();
    await loaded();
    expect(screen.getByRole('heading', { name: 'Diet and allergies' })).toBeInTheDocument();
    expect(screen.getByLabelText('Vegetarian')).toBeChecked();
    expect(screen.getByLabelText('Non-vegetarian')).not.toBeChecked();
    expect(tags()).toEqual(['Egg', 'Peanuts']);
    expect(fetchMock).toHaveBeenCalledWith('/api/profile/diet', expect.objectContaining({ headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Bearer /) }) }));
  });

  it('starts with no diet and no allergies for a new user', async () => {
    reply(200, { diet: null, allergies: [] });
    renderSection();
    await loaded();
    expect(screen.getByLabelText('Vegetarian')).not.toBeChecked();
    expect(screen.getByLabelText('Non-vegetarian')).not.toBeChecked();
    expect(tags()).toEqual([]);
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
  });

  it('adds a trimmed allergy with the Add button and with Enter, and removes one with x', async () => {
    reply(200, { diet: null, allergies: [] });
    renderSection();
    await loaded();
    typeAllergy('  Peanuts ');
    clickAdd();
    typeAllergy('Milk');
    fireEvent.keyDown(screen.getByLabelText('Allergies'), { key: 'Enter' });
    expect(tags()).toEqual(['Peanuts', 'Milk']);
    expect(screen.getByLabelText('Allergies')).toHaveValue('');
    fireEvent.click(screen.getByRole('button', { name: 'Remove Peanuts' }));
    expect(tags()).toEqual(['Milk']);
    expect(putCall()).toBeUndefined();                         // nothing is saved until Save
  });

  it.each([
    ['a duplicate ignoring case', ['Peanuts'], 'PEANUTS', "'PEANUTS' is already in your list."],
    ['an empty name', [], '   ', 'Allergy names must be 1 to 50 characters.'],
    ['a 51-character name', [], 'x'.repeat(51), 'Allergy names must be 1 to 50 characters.'],
    ['a 21st allergy', Array.from({ length: 20 }, (_, i) => `a${i}`), 'one more', 'You can list at most 20 allergies.']
  ])('refuses %s with its message and does not add it', async (_name, saved, typed, message) => {
    reply(200, { diet: null, allergies: saved });
    renderSection();
    await loaded();
    typeAllergy(typed);
    clickAdd();
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(tags()).toHaveLength(saved.length);
  });

  it('Clear unsets the diet (q2) and Save sends { diet, allergies }', async () => {
    reply(200, { diet: 'vegetarian', allergies: ['Egg'] });
    reply(200, { diet: null, allergies: ['Egg', 'soy'] });
    renderSection();
    await loaded();
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(screen.getByLabelText('Vegetarian')).not.toBeChecked();
    typeAllergy('soy');
    clickAdd();
    save();
    expect(await screen.findByText('Diet and allergies saved')).toBeInTheDocument();
    expect(putBody()).toEqual({ diet: null, allergies: ['Egg', 'soy'] });
  });

  it('choosing a diet and saving shows the answer from the API (sorted list)', async () => {
    reply(200, { diet: null, allergies: [] });
    reply(200, { diet: 'non_vegetarian', allergies: ['Milk', 'soy'] });
    renderSection();
    await loaded();
    fireEvent.click(screen.getByLabelText('Non-vegetarian'));
    typeAllergy('soy'); clickAdd();
    typeAllergy('Milk'); clickAdd();
    save();
    await screen.findByText('Diet and allergies saved');
    expect(putBody()).toEqual({ diet: 'non_vegetarian', allergies: ['soy', 'Milk'] });
    expect(tags()).toEqual(['Milk', 'soy']);
  });

  it('shows the API field message', async () => {
    reply(200, { diet: null, allergies: [] });
    reply(400, { error: 'invalid-diet', fields: { allergies: 'You can list at most 20 allergies.' } });
    renderSection();
    await loaded();
    save();
    expect(await screen.findByText('You can list at most 20 allergies.')).toBeInTheDocument();
  });

  it('shows a generic message when loading or saving fails', async () => {
    reply(500, { error: 'internal-error' });
    dietReplies.push(async () => { throw new Error('offline'); });
    renderSection();
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.');
    save();
    await waitFor(() => expect(putCall()).toBeDefined());
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Please try again.');
  });
});

describe('Profile page with the diet section (q1)', () => {
  it('shows the section below the profile form, each with its own Save', async () => {
    reply(200, { diet: null, allergies: [] });
    renderApp(<ProfilePage />);
    const dietSave = await screen.findByRole('button', { name: 'Save diet and allergies' });
    const profileSave = await screen.findByRole('button', { name: 'Save' });
    expect(profileSave.compareDocumentPosition(dietSave) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Profile' }).compareDocumentPosition(screen.getByRole('heading', { name: 'Diet and allergies' })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
