// Sign-in screen with sign-up on the same form (REQ-404, mock.md). No "Forgot password?" link and no verification step.
// Sign-up shows "Account created" and leaves the visitor signed out; sign-in stores the token and goes to Profile when the
// profile is not complete, otherwise to Today.
import React, { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Alert, AlertDescription, AlertTitle, Box, Button, FormControl, FormHelperText, FormLabel, Heading, HStack, Input, Stack, Text } from '@chakra-ui/react';
import { setToken, useAuthStore } from '../../state/authStore';

export const SESSION_EXPIRED_MESSAGE = 'Session expired, please sign in again.';

export const MIN_PASSWORD_LENGTH = 8;

export const ERROR_MESSAGES: Record<string, string> = {
  'password-too-short': 'Password must be at least 8 characters.',
  'invalid-credentials': 'Email or password is incorrect.',
  'email-taken': 'An account with this email already exists.',
  'invalid-email': 'Enter a valid email address.'
};
const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

async function postJson(url: string, body: unknown): Promise<{ status: number; data: any }> {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  let data: any = null;
  try { data = await res.json(); } catch { /* no JSON body */ }
  return { status: res.status, data };
}

const messageFor = (data: any) => ERROR_MESSAGES[data?.error] ?? FALLBACK_MESSAGE;

export function SignInPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState(false);
  const [busy, setBusy] = useState(false);
  const notice = useAuthStore((s) => s.notice);   // REQ-405: why the user is back here (cleared by a successful sign-in)

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try { await action(); } catch { setError(FALLBACK_MESSAGE); } finally { setBusy(false); }
  };

  const onSignIn = (e?: FormEvent) => {
    e?.preventDefault();
    return run(async () => {
      const { status, data } = await postJson('/api/auth/signin', { email, password });
      if (status !== 200 || typeof data?.token !== 'string') { setCreated(false); setError(messageFor(data)); return; }
      setToken(data.token);
      navigate(data.profileComplete ? '/today' : '/profile', { replace: true });
    });
  };

  const onSignUp = () => run(async () => {
    setCreated(false);
    if (Array.from(password).length < MIN_PASSWORD_LENGTH) { setError(ERROR_MESSAGES['password-too-short']); return; }
    const { status, data } = await postJson('/api/auth/signup', { email, password });
    if (status !== 201) { setError(messageFor(data)); return; }
    setPassword('');
    setCreated(true);
  });

  return (
    <Box maxW="sm" mx="auto" mt={16} px={4}>
      <Heading as="h1" size="lg" mb={6}>AI Fitness &amp; Meal Coach</Heading>
      <form onSubmit={onSignIn} noValidate>
        <Stack spacing={4}>
          {notice === 'session-expired' && !created && (
            <Alert status="info">
              <AlertDescription>{SESSION_EXPIRED_MESSAGE}</AlertDescription>
            </Alert>
          )}
          {created && (
            <Alert status="success" flexDirection="column" alignItems="flex-start">
              <AlertTitle>Account created</AlertTitle>
              <AlertDescription>Sign in with the same email and password.</AlertDescription>
            </Alert>
          )}
          <FormControl>
            <FormLabel htmlFor="signin-email">Email</FormLabel>
            <Input id="signin-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </FormControl>
          <FormControl>
            <FormLabel htmlFor="signin-password">Password</FormLabel>
            <Input id="signin-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <FormHelperText>min. 8 characters</FormHelperText>
          </FormControl>
          {error && <Text role="alert" color="red.500">{error}</Text>}
          <HStack spacing={3}>
            <Button type="submit" colorScheme="teal" isDisabled={busy}>Sign in</Button>
            <Button type="button" variant="outline" isDisabled={busy} onClick={onSignUp}>Sign up</Button>
          </HStack>
        </Stack>
      </form>
    </Box>
  );
}
