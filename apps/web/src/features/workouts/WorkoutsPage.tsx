// Workouts screen (REQ-410, WI-073, mock.md): the user's plans newest first, the active one marked, Build my own plan,
// Make active / Open / Edit / Delete (Edit and Delete for manual plans only; AI plans belong to REQ-409). Delete asks first.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  AlertDialog, AlertDialogBody, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogOverlay, Badge, Box,
  Button, Flex, Heading, HStack, Stack, Text
} from '@chakra-ui/react';
import { authFetch } from '../../app/authFetch';
import { planLabel } from './planRules';

export const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';
export const DELETE_QUESTION = 'Delete this plan? This cannot be undone.';

export interface PlanSummary { id: string; source: string; isActive: boolean; createdAt: string }

/** The "Delete this plan?" confirmation, shared with the plan view. */
export function DeletePlanDialog({ isOpen, onCancel, onConfirm, busy }: { isOpen: boolean; onCancel: () => void; onConfirm: () => void; busy?: boolean }) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  return (
    <AlertDialog isOpen={isOpen} leastDestructiveRef={cancelRef} onClose={onCancel}>
      <AlertDialogOverlay>
        <AlertDialogContent>
          <AlertDialogHeader fontSize="lg">Delete plan</AlertDialogHeader>
          <AlertDialogBody>{DELETE_QUESTION}</AlertDialogBody>
          <AlertDialogFooter>
            <Button ref={cancelRef} onClick={onCancel}>Cancel</Button>
            <Button colorScheme="red" onClick={onConfirm} ml={3} isLoading={busy}>Delete</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialogOverlay>
    </AlertDialog>
  );
}

export function WorkoutsPage() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [toDelete, setToDelete] = useState<PlanSummary | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await authFetch('/api/workout-plans');
      let data: any = null;
      try { data = await res.json(); } catch { /* no JSON body */ }
      if (res.status === 200 && Array.isArray(data?.plans)) { setPlans(data.plans); setError(false); }
      else if (res.status !== 401) setError(true);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const act = async (request: () => Promise<Response>, ok: number) => {
    setBusy(true);
    try {
      const res = await request();
      if (res.status !== ok && res.status !== 401) setError(true);
      await load();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };
  const makeActive = (p: PlanSummary) => act(() => authFetch(`/api/workout-plans/${p.id}/activate`, { method: 'POST' }), 200);
  const confirmDelete = async () => {
    if (!toDelete) return;
    await act(() => authFetch(`/api/workout-plans/${toDelete.id}`, { method: 'DELETE' }), 204);
    setToDelete(null);
  };

  return (
    <Box maxW="2xl">
      <Flex justify="space-between" align="center" mb={6}>
        <Heading as="h2" size="lg">Workouts</Heading>
        <Button colorScheme="teal" onClick={() => navigate('/workouts/new')}>Build my own plan</Button>
      </Flex>
      {error && <Text role="alert" color="red.500" mb={4}>{FALLBACK_MESSAGE}</Text>}
      {loading ? <Text>Loading...</Text> : plans.length === 0 ? <Text>No workout plans yet.</Text> : (
        <Stack as="ul" spacing={3} listStyleType="none" aria-label="Workout plans">
          {plans.map((p) => {
            const label = planLabel(p.source, p.createdAt);
            const manual = p.source === 'manual';
            return (
              <Flex as="li" key={p.id} justify="space-between" align="center" borderWidth="1px" borderRadius="md" p={3} wrap="wrap" gap={2}>
                <HStack>
                  <Text fontWeight="semibold">{label}</Text>
                  {p.isActive && <Badge colorScheme="green">Active</Badge>}
                </HStack>
                <HStack spacing={2}>
                  {!p.isActive && <Button size="sm" onClick={() => makeActive(p)} isDisabled={busy} aria-label={`Make ${label} active`}>Make active</Button>}
                  <Button as={RouterLink} to={`/workouts/${p.id}`} size="sm" variant="outline" aria-label={`Open ${label}`}>Open</Button>
                  {manual && <Button as={RouterLink} to={`/workouts/${p.id}/edit`} size="sm" variant="outline" aria-label={`Edit ${label}`}>Edit</Button>}
                  {manual && <Button size="sm" colorScheme="red" variant="outline" onClick={() => setToDelete(p)} isDisabled={busy} aria-label={`Delete ${label}`}>Delete</Button>}
                </HStack>
              </Flex>
            );
          })}
        </Stack>
      )}
      <DeletePlanDialog isOpen={!!toDelete} onCancel={() => setToDelete(null)} onConfirm={confirmDelete} busy={busy} />
    </Box>
  );
}
