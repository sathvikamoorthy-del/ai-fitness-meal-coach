// Exercises screen (REQ-408, WI-072, mock.md): the library A-Z, filtered as the user types (contains, ignoring case);
// no match shows: No exercises match "<typed text>". Read-only. The list is loaded once; a 401 is handled by authFetch.
import React, { useEffect, useMemo, useState } from 'react';
import { Box, FormControl, FormLabel, Heading, Input, List, ListItem, Text } from '@chakra-ui/react';
import { authFetch } from '../../app/authFetch';
import { Exercise, filterExercises, noMatchMessage } from './exerciseSearch';

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

export function ExercisesPage() {
  const [all, setAll] = useState<Exercise[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await authFetch('/api/exercises');
        let data: any = null;
        try { data = await res.json(); } catch { /* no JSON body */ }
        if (!live) return;
        if (res.status === 200 && Array.isArray(data?.exercises)) setAll(data.exercises);
        else if (res.status !== 401) setError(true);
      } catch {
        if (live) setError(true);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, []);

  const shown = useMemo(() => filterExercises(all, search), [all, search]);
  const searching = search.trim() !== '';

  return (
    <Box maxW="md">
      <Heading as="h2" size="lg" mb={6}>Exercises</Heading>
      <FormControl mb={4}>
        <FormLabel htmlFor="exercise-search">Search</FormLabel>
        <Input id="exercise-search" type="search" value={search} onChange={(e) => setSearch(e.target.value)} autoComplete="off" />
      </FormControl>
      {loading ? <Text>Loading...</Text>
        : error ? <Text role="alert" color="red.500">{FALLBACK_MESSAGE}</Text>
        : searching && shown.length === 0 ? <Text role="status">{noMatchMessage(search)}</Text>
        : (
          <List aria-label="Exercises" spacing={1}>
            {shown.map((e) => <ListItem key={e.id}>{e.name}</ListItem>)}
          </List>
        )}
    </Box>
  );
}
