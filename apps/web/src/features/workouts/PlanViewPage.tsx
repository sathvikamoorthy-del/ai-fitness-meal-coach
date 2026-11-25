// One workout plan (REQ-410, WI-073, mock.md): its label and Active badge, Day 1 to Day 7 with "Back squat 3 × 8 · ..."
// or "Rest day", Edit for manual plans and Delete for every plan (REQ-409 q2: AI plans can be deleted, not edited).
// Delete asks first, then returns to /workouts.
import React, { useEffect, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import { Badge, Box, Button, Flex, Heading, HStack, Stack, Text } from '@chakra-ui/react';
import { authFetch } from '../../app/authFetch';
import { planLabel } from './planRules';
import { DeletePlanDialog, FALLBACK_MESSAGE } from './WorkoutsPage';

interface PlanDetail {
  id: string; source: string; isActive: boolean; createdAt: string;
  days: { dayNumber: number; exercises: { exerciseId: string; name: string; sets: number; reps: number }[] }[];
}

export function PlanViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [status, setStatus] = useState<'loading' | 'ok' | 'missing' | 'error'>('loading');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await authFetch(`/api/workout-plans/${id}`);
        let data: any = null;
        try { data = await res.json(); } catch { /* no JSON body */ }
        if (!live) return;
        if (res.status === 200 && data?.plan) { setPlan(data.plan); setStatus('ok'); }
        else if (res.status === 404) setStatus('missing');
        else if (res.status !== 401) setStatus('error');
      } catch {
        if (live) setStatus('error');
      }
    })();
    return () => { live = false; };
  }, [id]);

  const onDelete = async () => {
    setBusy(true);
    try {
      const res = await authFetch(`/api/workout-plans/${id}`, { method: 'DELETE' });
      if (res.status === 204) { navigate('/workouts'); return; }
      if (res.status !== 401) setStatus('error');
    } catch {
      setStatus('error');
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  if (status === 'loading') return <Text>Loading...</Text>;
  if (status === 'missing') return <Box><Text mb={4}>This plan was not found.</Text><Button as={RouterLink} to="/workouts" variant="outline">Back to Workouts</Button></Box>;
  if (status === 'error' || !plan) return <Text role="alert" color="red.500">{FALLBACK_MESSAGE}</Text>;

  const manual = plan.source === 'manual';
  return (
    <Box maxW="2xl">
      <Flex justify="space-between" align="center" mb={6} wrap="wrap" gap={2}>
        <HStack>
          <Heading as="h2" size="lg">{planLabel(plan.source, plan.createdAt)}</Heading>
          {plan.isActive && <Badge colorScheme="green">Active</Badge>}
        </HStack>
        <HStack>
          {manual && <Button as={RouterLink} to={`/workouts/${plan.id}/edit`} size="sm" variant="outline">Edit</Button>}
          <Button size="sm" colorScheme="red" variant="outline" onClick={() => setConfirming(true)}>Delete</Button>
        </HStack>
      </Flex>
      <Stack as="ol" spacing={2} listStyleType="none" aria-label="Plan days">
        {plan.days.map((d) => (
          <HStack as="li" key={d.dayNumber} align="baseline" spacing={4}>
            <Text fontWeight="semibold" minW="4rem">Day {d.dayNumber}</Text>
            <Text color={d.exercises.length ? undefined : 'gray.500'}>
              {d.exercises.length ? d.exercises.map((e) => `${e.name} ${e.sets} × ${e.reps}`).join(' · ') : 'Rest day'}
            </Text>
          </HStack>
        ))}
      </Stack>
      <Button as={RouterLink} to="/workouts" variant="link" mt={6}>Back to Workouts</Button>
      <DeletePlanDialog isOpen={confirming} onCancel={() => setConfirming(false)} onConfirm={onDelete} busy={busy} />
    </Box>
  );
}
