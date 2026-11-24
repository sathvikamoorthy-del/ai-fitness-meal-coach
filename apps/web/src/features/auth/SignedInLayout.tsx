// Header of every signed-in screen (REQ-405, mock.md): the app name, an Exercises link (REQ-408) and a Sign out button;
// the page goes below.
// Sign out ends the session on the server and always lands on /signin, even when the request fails.
import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { Box, Button, Flex, Heading, HStack } from '@chakra-ui/react';
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
        <HStack spacing={2}>
          <Button as={RouterLink} to="/exercises" size="sm" variant="ghost">Exercises</Button>
          <Button size="sm" variant="outline" onClick={onSignOut} isLoading={busy}>Sign out</Button>
        </HStack>
      </Flex>
      <Box as="main" p={4}>{children}</Box>
    </Box>
  );
}
