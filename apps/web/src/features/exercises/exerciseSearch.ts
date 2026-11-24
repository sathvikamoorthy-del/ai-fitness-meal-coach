// Exercise search (REQ-408, WI-072): a name matches when it contains the typed text anywhere, ignoring letter case and
// spaces at the ends of the typed text. An empty (or spaces-only) search shows the full list. Matches keep the list's
// order (A-Z from the API).
export interface Exercise { id: string; name: string }

export function filterExercises(list: Exercise[], typed: string): Exercise[] {
  const needle = typed.trim().toLowerCase();
  if (!needle) return list;
  return list.filter((e) => e.name.toLowerCase().includes(needle));
}

export const noMatchMessage = (typed: string) => `No exercises match "${typed.trim()}"`;
