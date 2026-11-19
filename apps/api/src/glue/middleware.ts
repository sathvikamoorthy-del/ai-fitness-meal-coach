// Scaffold-owned glue file (STORY-105). Modules register at the markers below; do not edit the marked lines by hand.
// knm:imports
import { authenticate } from '../auth/authMiddleware'; // knm:module jwt-auth
import { sessionCheck } from '../auth/sessionCheck'; // app middleware (outside the knm markers)

export const middleware = [
  // knm:entries
  { id: 'jwt-auth', handler: authenticate }, // knm:module jwt-auth
  // knm:entries-end
  { id: 'session-check', handler: sessionCheck }, // app middleware (outside the knm markers), runs after jwt-auth (REQ-405)
];
