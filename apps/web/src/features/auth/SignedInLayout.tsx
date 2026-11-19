// Header of every signed-in screen (REQ-405, mock.md): the app name and a Sign out button; the page goes below.
// Sign out ends the session on the server and always lands on /signin, even when the request fails.
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Flex, Heading } from '@chakra-ui/react';
import { signOut } from '../../state/authStore';

export function SignedInLayout({ children }: { children?: React.ReactNode }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const onSignOut = async () => {
    setBusy(true);
    await signOut();
    navigate('/signin', { replace: true });
  };

  return (
    <Box>
      <Flex as="header" align="center" justify="space-between" px={4} py={3} borderBottomWidth="1px">
        <Heading as="h1" size="md">AI Fitness &amp; Meal Coach</Heading>
        <Button size="sm" variant="outline" onClick={onSignOut} isLoading={busy}>Sign out</Button>
      </Flex>
      <Box as="main" p={4}>{children}</Box>
    </Box>
  );
}
