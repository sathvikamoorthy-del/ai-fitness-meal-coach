// Build or edit a manual workout plan (REQ-410, WI-073, mock.md): Day 1 to Day 7, exercises from the library (a select,
// A-Z) with sets and reps, Remove, "Rest day" for an empty day. Save plan checks every rule first (planRules.ts), then
// POSTs (new) or PUTs (edit) and returns to /workouts. AI plans and unknown plans cannot be edited here.
import React, { useEffect, useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import {
  Box, Button, Flex, FormControl, FormLabel, Heading, HStack, Input, ListItem, Select, Stack, Text, UnorderedList
} from '@chakra-ui/react';
import { authFetch } from '../../app/authFetch';
import { canAdd, checkPlan, DAYS, DEFAULT_REPS, DEFAULT_SETS, PlanDay } from './planRules';
import { FALLBACK_MESSAGE } from './WorkoutsPage';

interface Exercise { id: string; name: string }
interface Row { exerciseId: string; sets: string; reps: string }   // inputs as typed
type EditorDay = { dayNumber: number; rows: Row[] };

const emptyDays = (): EditorDay[] => Array.from({ length: DAYS }, (_, i) => ({ dayNumber: i + 1, rows: [] }));
const toNumber = (s: string) => (s.trim() === '' ? Number.NaN : Number(s));
const toPlanDays = (days: EditorDay[]): PlanDay[] =>
  days.map((d) => ({ dayNumber: d.dayNumber, exercises: d.rows.map((r) => ({ exerciseId: r.exerciseId, sets: toNumber(r.sets), reps: toNumber(r.reps) })) }));

async function readJson(res: Response): Promise<any> {
  try { return await res.json(); } catch { return null; }
}

export function PlanEditorPage() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [days, setDays] = useState<EditorDay[]>(emptyDays);
  const [picked, setPicked] = useState<Record<number, string>>({});
  const [addError, setAddError] = useState<Record<number, string | null>>({});
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [notEditable, setNotEditable] = useState(false);
  const [busy, setBusy] = useState(false);

  const names = useMemo(() => new Map(library.map((e) => [e.id, e.name])), [library]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const exRes = await authFetch('/api/exercises');
        const exData = await readJson(exRes);
        if (!live) return;
        if (exRes.status === 200 && Array.isArray(exData?.exercises)) setLibrary(exData.exercises);
        else if (exRes.status !== 401) setErrors([FALLBACK_MESSAGE]);
        if (editing) {
          const res = await authFetch(`/api/workout-plans/${id}`);
          const data = await readJson(res);
          if (!live) return;
          if (res.status === 200 && data?.plan?.source === 'manual') {
            setDays(data.plan.days.map((d: any) => ({
              dayNumber: d.dayNumber,
              rows: d.exercises.map((e: any) => ({ exerciseId: e.exerciseId, sets: String(e.sets), reps: String(e.reps) }))
            })));
          } else if (res.status !== 401) {
            setNotEditable(true);
          }
        }
      } catch {
        if (live) setErrors([FALLBACK_MESSAGE]);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [editing, id]);

  const update = (dayNumber: number, change: (rows: Row[]) => Row[]) =>
    setDays((ds) => ds.map((d) => (d.dayNumber === dayNumber ? { ...d, rows: change(d.rows) } : d)));

  const onAdd = (day: EditorDay) => {
    const exerciseId = picked[day.dayNumber] ?? '';
    const problem = canAdd(toPlanDays([day])[0], exerciseId, names);
    setAddError((a) => ({ ...a, [day.dayNumber]: problem }));
    if (problem) return;
    update(day.dayNumber, (rows) => [...rows, { exerciseId, sets: String(DEFAULT_SETS), reps: String(DEFAULT_REPS) }]);
    setPicked((p) => ({ ...p, [day.dayNumber]: '' }));
  };

  const onSave = async () => {
    const planDays = toPlanDays(days);
    const found = checkPlan(planDays, names);
    setErrors(found);
    if (found.length) return;
    setBusy(true);
    try {
      const res = await authFetch(editing ? `/api/workout-plans/${id}` : '/api/workout-plans', {
        method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days: planDays })
      });
      const data = await readJson(res);
      if (res.status === 200 || res.status === 201) navigate('/workouts');
      else if (res.status === 400 && Array.isArray(data?.errors)) setErrors(data.errors);
      else if (res.status === 403 || res.status === 404) setNotEditable(true);
      else if (res.status !== 401) setErrors([FALLBACK_MESSAGE]);
    } catch {
      setErrors([FALLBACK_MESSAGE]);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Text>Loading...</Text>;
  if (notEditable) {
    return (
      <Box>
        <Text mb={4}>This plan cannot be edited.</Text>
        <Button as={RouterLink} to="/workouts" variant="outline">Back to Workouts</Button>
      </Box>
    );
  }

  return (
    <Box maxW="2xl">
      <Heading as="h2" size="lg" mb={6}>{editing ? 'Edit plan' : 'Build my own plan'}</Heading>
      <Stack spacing={6}>
        {days.map((day) => (
          <Box as="section" key={day.dayNumber} aria-label={`Day ${day.dayNumber}`} borderWidth="1px" borderRadius="md" p={3}>
            <Heading as="h3" size="sm" mb={2}>Day {day.dayNumber}</Heading>
            {day.rows.length === 0 ? <Text color="gray.500" mb={2}>Rest day</Text> : (
              <Stack as="ol" spacing={2} mb={3} listStyleType="none">
                {day.rows.map((row, i) => {
                  const name = names.get(row.exerciseId) ?? row.exerciseId;
                  return (
                    <HStack as="li" key={`${row.exerciseId}-${i}`} spacing={3} wrap="wrap">
                      <Text minW="12rem">{i + 1}. {name}</Text>
                      <FormControl w="auto">
                        <HStack>
                          <FormLabel htmlFor={`d${day.dayNumber}-${i}-sets`} m={0}>sets</FormLabel>
                          <Input id={`d${day.dayNumber}-${i}-sets`} aria-label={`Day ${day.dayNumber} ${name} sets`} type="number" w="5rem" size="sm"
                            value={row.sets} onChange={(e) => update(day.dayNumber, (rows) => rows.map((r, j) => (j === i ? { ...r, sets: e.target.value } : r)))} />
                        </HStack>
                      </FormControl>
                      <FormControl w="auto">
                        <HStack>
                          <FormLabel htmlFor={`d${day.dayNumber}-${i}-reps`} m={0}>reps</FormLabel>
                          <Input id={`d${day.dayNumber}-${i}-reps`} aria-label={`Day ${day.dayNumber} ${name} reps`} type="number" w="5rem" size="sm"
                            value={row.reps} onChange={(e) => update(day.dayNumber, (rows) => rows.map((r, j) => (j === i ? { ...r, reps: e.target.value } : r)))} />
                        </HStack>
                      </FormControl>
                      <Button size="sm" variant="ghost" aria-label={`Remove ${name} from Day ${day.dayNumber}`}
                        onClick={() => update(day.dayNumber, (rows) => rows.filter((_, j) => j !== i))}>Remove</Button>
                    </HStack>
                  );
                })}
              </Stack>
            )}
            <HStack>
              <Select aria-label={`Exercise for Day ${day.dayNumber}`} placeholder="Choose an exercise" size="sm" maxW="20rem"
                value={picked[day.dayNumber] ?? ''} onChange={(e) => { setPicked((p) => ({ ...p, [day.dayNumber]: e.target.value })); setAddError((a) => ({ ...a, [day.dayNumber]: null })); }}>
                {library.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </Select>
              <Button size="sm" onClick={() => onAdd(day)} aria-label={`Add to Day ${day.dayNumber}`}>Add</Button>
            </HStack>
            {addError[day.dayNumber] && <Text color="red.500" fontSize="sm" mt={1} role="alert">{addError[day.dayNumber]}</Text>}
          </Box>
        ))}
        {errors.length > 0 && (
          <UnorderedList role="alert" color="red.500" aria-label="Plan problems">
            {errors.map((e) => <ListItem key={e}>{e}</ListItem>)}
          </UnorderedList>
        )}
        <Flex justify="flex-end" gap={3}>
          <Button variant="outline" onClick={() => navigate('/workouts')}>Cancel</Button>
          <Button colorScheme="teal" onClick={onSave} isLoading={busy}>Save plan</Button>
        </Flex>
      </Stack>
    </Box>
  );
}
