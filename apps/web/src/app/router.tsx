// Scaffold-owned glue file (STORY-105). Modules register at the markers below; do not edit the marked lines by hand.
import React from 'react'; // app routes (outside the knm markers)
import { Navigate } from 'react-router-dom'; // app routes (outside the knm markers)
import { SignInPage } from '../features/auth/SignInPage'; // app route (outside the knm markers)
import { RequireAuth } from '../features/auth/RequireAuth'; // app route (outside the knm markers)
import { SignedInLayout } from '../features/auth/SignedInLayout'; // app route (outside the knm markers)
import { ProfilePage } from '../features/profile/ProfilePage'; // app route (outside the knm markers)
// knm:imports

export const router = [
  // knm:entries
  // knm:entries-end
  { id: 'home', path: '/', element: <Navigate to="/signin" replace /> }, // app route (outside the knm markers)
  { id: 'signin', path: '/signin', element: <SignInPage /> }, // app route (outside the knm markers)
  // Profile is REQ-406 (WI-070); Today stays a placeholder until its requirement fills it.
  // Signed-in screens get the header with Sign out (REQ-405).
  { id: 'profile', path: '/profile', element: <RequireAuth><SignedInLayout><ProfilePage /></SignedInLayout></RequireAuth> }, // app route (outside the knm markers)
  { id: 'today', path: '/today', element: <RequireAuth><SignedInLayout><p>Today</p></SignedInLayout></RequireAuth> }, // app route (outside the knm markers)
];
