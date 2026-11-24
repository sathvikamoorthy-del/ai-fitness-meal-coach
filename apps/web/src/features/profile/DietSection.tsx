// "Diet and allergies" section of the Profile screen (REQ-407, WI-071, mock.md): a separate section with its own Save
// (q1). Diet is optional and can be cleared (q2). Allergy names are trimmed, spelling kept, duplicates refused ignoring
// case (q3), 1 to 50 characters, at most 20 (q4). Adding or removing a tag changes nothing until Save.
import React, { KeyboardEvent, useEffect, useState } from 'react';
import {
  Alert, AlertDescription, Box, Button, Flex, FormControl, FormErrorMessage, FormLabel, Heading, HStack, Input, Radio,
  RadioGroup, Stack, Tag, TagCloseButton, TagLabel, Text, Wrap, WrapItem
} from '@chakra-ui/react';
import { authFetch } from '../../app/authFetch';
import { addAllergy, checkAllergies, Diet, DIET_OPTIONS } from './dietRules';

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

async function readJson(res: Response): Promise<any> {
  try { return await res.json(); } catch { return null; }
}

export function DietSection() {
  const [diet, setDiet] = useState<Diet | null>(null);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ diet?: string; allergies?: string }>({});
  const [message, setMessage] = useState<{ status: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const res = await authFetch('/api/profile/diet');
        const data = await readJson(res);
        if (!live) return;
        if (res.status === 200 && data) { setDiet(data.diet ?? null); setAllergies(Array.isArray(data.allergies) ? data.allergies : []); }
        else if (res.status !== 401) setMessage({ status: 'error', text: FALLBACK_MESSAGE });
      } catch {
        if (live) setMessage({ status: 'error', text: FALLBACK_MESSAGE });
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, []);

  const onAdd = () => {
    const r = addAllergy(allergies, input);
    if ('error' in r) { setInputError(r.error); return; }
    setAllergies(r.list);
    setInput('');
    setInputError(null);
    setMessage(null);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } };
  const onRemove = (name: string) => { setAllergies((list) => list.filter((a) => a !== name)); setMessage(null); };

  const onSave = async () => {
    setMessage(null);
    setErrors({});
    const problem = checkAllergies(allergies);
    if (problem) { setErrors({ allergies: problem }); return; }
    setBusy(true);
    try {
      const res = await authFetch('/api/profile/diet', {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ diet, allergies })
      });
      const data = await readJson(res);
      if (res.status === 200 && data) {
        setDiet(data.diet ?? null);
        setAllergies(data.allergies ?? []);
        setMessage({ status: 'success', text: 'Diet and allergies saved' });
      } else if (res.status === 400 && data?.error === 'invalid-diet' && data.fields) {
        setErrors(data.fields);
      } else if (res.status !== 401) {               // 401: authFetch already sent the user to sign-in
        setMessage({ status: 'error', text: FALLBACK_MESSAGE });
      }
    } catch {
      setMessage({ status: 'error', text: FALLBACK_MESSAGE });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box as="section" aria-labelledby="diet-heading" mt={10}>
      <Heading as="h3" size="md" mb={4} id="diet-heading">Diet and allergies</Heading>
      {loading ? <Text>Loading...</Text> : (
        <Stack spacing={4}>
          <FormControl as="fieldset" isInvalid={!!errors.diet}>
            <FormLabel as="legend">Diet</FormLabel>
            <HStack spacing={6}>
              <RadioGroup value={diet ?? ''} onChange={(v) => { setDiet(v as Diet); setMessage(null); }}>
                <Stack direction="row" spacing={6}>
                  {DIET_OPTIONS.map((o) => <Radio key={o.code} value={o.code}>{o.label}</Radio>)}
                </Stack>
              </RadioGroup>
              <Button size="xs" variant="ghost" onClick={() => { setDiet(null); setMessage(null); }} isDisabled={diet === null}>Clear</Button>
            </HStack>
            <FormErrorMessage>{errors.diet}</FormErrorMessage>
          </FormControl>

          <FormControl isInvalid={!!inputError || !!errors.allergies}>
            <FormLabel htmlFor="allergy-input">Allergies</FormLabel>
            {allergies.length > 0 && (
              <Wrap mb={2} aria-label="Allergies list">
                {allergies.map((a) => (
                  <WrapItem key={a}>
                    <Tag size="md" borderRadius="full" variant="subtle">
                      <TagLabel>{a}</TagLabel>
                      <TagCloseButton aria-label={`Remove ${a}`} onClick={() => onRemove(a)} />
                    </Tag>
                  </WrapItem>
                ))}
              </Wrap>
            )}
            <HStack>
              <Input id="allergy-input" value={input} onChange={(e) => { setInput(e.target.value); setInputError(null); }} onKeyDown={onKeyDown} />
              <Button onClick={onAdd}>Add</Button>
            </HStack>
            <FormErrorMessage>{inputError ?? errors.allergies}</FormErrorMessage>
          </FormControl>

          {message && (
            <Alert status={message.status} role={message.status === 'error' ? 'alert' : 'status'}>
              <AlertDescription>{message.text}</AlertDescription>
            </Alert>
          )}
          <Flex justify="flex-end">
            {/* Two Save buttons share the Profile page: this one's accessible name says which section it saves. */}
            <Button colorScheme="teal" onClick={onSave} isLoading={busy} aria-label="Save diet and allergies">Save</Button>
          </Flex>
        </Stack>
      )}
    </Box>
  );
}
