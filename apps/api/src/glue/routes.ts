// Scaffold-owned glue file (STORY-105). Modules register at the markers below; do not edit the marked lines by hand.
import { healthRoute } from '../routes/health'; // app route (outside the knm markers)
import { authRoute } from '../routes/auth'; // app route (outside the knm markers)
import { profileRoute } from '../routes/profile'; // app route (outside the knm markers)
import { dietRoute } from '../routes/diet'; // app route (outside the knm markers)
import { exercisesRoute } from '../routes/exercises'; // app route (outside the knm markers)
// knm:imports

export const routes = [
  // knm:entries
  // knm:entries-end
  healthRoute, // app route (outside the knm markers)
  authRoute, // app route (outside the knm markers)
  profileRoute, // app route (outside the knm markers)
  dietRoute, // app route (outside the knm markers)
  exercisesRoute, // app route (outside the knm markers)
];
