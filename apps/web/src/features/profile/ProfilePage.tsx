// Profile screen (REQ-406, WI-070, mock.md): age, sex, height (cm), weight (kg), goal and fitness level, all required, metric
// only. The form is checked before sending (profileRules.ts); the API is the authority. After saving, the daily calorie target
// worked out by the API is shown, and the user stays here. A target of 0 kcal or less is refused (WI-070 q1): the API's
// message is shown under Goal. The daily water target is not shown in this version.
import React, { FormEvent, useEffect, useState } from 'react';
import {
  Alert, AlertDescription, Box, Button, Divider, Flex, FormControl, FormErrorMessage, FormHelperText, FormLabel, Heading,
  Input, Radio, RadioGroup, Select, Stack, Text
} from '@chakra-ui/react';
import { authFetch } from '../../app/authFetch';
import {
  checkProfile, EMPTY_FORM, FieldErrors, FITNESS_LEVEL_OPTIONS, formatKcal, GOAL_OPTIONS, ProfileField, ProfileForm,
  SEX_OPTIONS, toRequestBody
} from './profileRules';

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

interface ApiProfile {
  age: number | null; sex: string | null; heightCm: number | null; weightKg: number | null;
  goal: string | null; fitnessLevel: string | null; dailyCalorieTarget: number | null;
}

const toForm = (p: ApiProfile): ProfileForm => ({
  age: p.age == null ? '' : String(p.age),
  sex: p.sex ?? '',
  heightCm: p.heightCm == null ? '' : String(p.heightCm),
  weightKg: p.weightKg == null ? '' : String(p.weightKg),
  goal: p.goal ?? '',
  fitnessLevel: p.fitnessLevel ?? ''
});

async function readJson(res: Response): Promise<any> {
  try { return await res.json(); } catch { return null; }
}

export function ProfilePage() {
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [target, setTarget] = useState<number | null>(null);
  const [message, setMessage] = useState<{ status: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await authFetch('/api/profile');
        const data = await readJson(res);
        if (!live) return;
        if (res.status === 200) {
          if (data?.profile) { setForm(toForm(data.profile)); setTarget(data.profile.dailyCalorieTarget ?? null); }
        } else if (res.status !== 401) {
          setMessage({ status: 'error', text: FALLBACK_MESSAGE });
        }
      } catch {
        if (live) setMessage({ status: 'error', text: FALLBACK_MESSAGE });
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, []);

  const set = (field: ProfileField) => (value: string) => setForm((f) => ({ ...f, [field]: value }));

  const onSave = async (e?: FormEvent) => {
    e?.preventDefault();
    setMessage(null);
    const found = checkProfile(form);
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      const res = await authFetch('/api/profile', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(toRequestBody(form))
      });
      const data = await readJson(res);
      if (res.status === 200 && data?.profile) {
        setForm(toForm(data.profile));
        setTarget(data.profile.dailyCalorieTarget ?? null);
        setMessage({ status: 'success', text: 'Profile saved' });
      } else if (res.status === 400 && data?.error === 'invalid-profile' && data.fields) {
        setErrors(data.fields);
      } else if (res.status === 400 && data?.error === 'calorie-target-too-low') {
        setErrors({ goal: data.message ?? FALLBACK_MESSAGE });
      } else if (res.status !== 401) {                 // 401: authFetch already sent the user to sign-in
        setMessage({ status: 'error', text: FALLBACK_MESSAGE });
      }
    } catch {
      setMessage({ status: 'error', text: FALLBACK_MESSAGE });
    } finally {
      setBusy(false);
    }
  };

  const numberField = (field: 'age' | 'heightCm' | 'weightKg', label: string, hint: string, step: string) => (
    <FormControl isInvalid={!!errors[field]}>
      <FormLabel htmlFor={`profile-${field}`}>{label}</FormLabel>
      <Input id={`profile-${field}`} type="number" inputMode="decimal" step={step} value={form[field]} onChange={(e) => set(field)(e.target.value)} />
      {errors[field] ? <FormErrorMessage>{errors[field]}</FormErrorMessage> : <FormHelperText>{hint}</FormHelperText>}
    </FormControl>
  );

  return (
    <Box maxW="md">
      <Heading as="h2" size="lg" mb={6}>Profile</Heading>
      {loading ? <Text>Loading...</Text> : (
        <form onSubmit={onSave} noValidate>
          <Stack spacing={4}>
            {numberField('age', 'Age', '13 to 100', '1')}
            <FormControl as="fieldset" isInvalid={!!errors.sex}>
              <FormLabel as="legend">Sex</FormLabel>
              <RadioGroup value={form.sex} onChange={set('sex')}>
                <Stack direction="row" spacing={6}>
                  {SEX_OPTIONS.map((o) => <Radio key={o.code} value={o.code}>{o.label}</Radio>)}
                </Stack>
              </RadioGroup>
              <FormErrorMessage>{errors.sex}</FormErrorMessage>
            </FormControl>
            {numberField('heightCm', 'Height (cm)', '100 to 250', 'any')}
            {numberField('weightKg', 'Weight (kg)', '30 to 300', 'any')}
            <FormControl as="fieldset" isInvalid={!!errors.goal}>
              <FormLabel as="legend">Goal</FormLabel>
              <RadioGroup value={form.goal} onChange={set('goal')}>
                <Stack spacing={1}>
                  {GOAL_OPTIONS.map((o) => <Radio key={o.code} value={o.code}>{o.label}</Radio>)}
                </Stack>
              </RadioGroup>
              <FormErrorMessage>{errors.goal}</FormErrorMessage>
            </FormControl>
            <FormControl isInvalid={!!errors.fitnessLevel}>
              <FormLabel htmlFor="profile-fitnessLevel">Fitness level</FormLabel>
              <Select id="profile-fitnessLevel" placeholder="choose..." value={form.fitnessLevel} onChange={(e) => set('fitnessLevel')(e.target.value)}>
                {FITNESS_LEVEL_OPTIONS.map((o) => <option key={o.code} value={o.code}>{o.label}</option>)}
              </Select>
              <FormErrorMessage>{errors.fitnessLevel}</FormErrorMessage>
            </FormControl>
            {message && (
              <Alert status={message.status} role={message.status === 'error' ? 'alert' : 'status'}>
                <AlertDescription>{message.text}</AlertDescription>
              </Alert>
            )}
            <Flex justify="flex-end">
              <Button type="submit" colorScheme="teal" isLoading={busy}>Save</Button>
            </Flex>
          </Stack>
        </form>
      )}
      {target !== null && (
        <>
          <Divider my={6} />
          <Flex justify="space-between" align="baseline">
            <Text fontWeight="semibold">Daily calorie target</Text>
            <Text fontWeight="semibold" data-testid="calorie-target">{formatKcal(target)}</Text>
          </Flex>
          <Text fontSize="sm" color="gray.500">Worked out when the profile is saved.</Text>
        </>
      )}
    </Box>
  );
}
