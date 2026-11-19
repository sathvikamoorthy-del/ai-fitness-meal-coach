// Scaffold-owned glue file (STORY-105). Modules register at the markers below; do not edit the marked lines by hand.
import React from 'react'; // app routes (outside the knm markers)
import { Navigate } from 'react-router-dom'; // app routes (outside the knm markers)
import { SignInPage } from '../features/auth/SignInPage'; // app route (outside the knm markers)
import { RequireAuth } from '../features/auth/RequireAuth'; // app route (outside the knm markers)
// knm:imports

export const router = [
  // knm:entries
  // knm:entries-end
  { id: 'home', path: '/', element: <Navigate to="/signin" replace /> }, // app route (outside the knm markers)
  { id: 'signin', path: '/signin', element: <SignInPage /> }, // app route (outside the knm markers)
  // Placeholders until REQ-406 (Profile) and the Today requirement fill these screens.
  { id: 'profile', path: '/profile', element: <RequireAuth><p>Profile</p></RequireAuth> }, // app route (outside the knm markers)
  { id: 'today', path: '/today', element: <RequireAuth><p>Today</p></RequireAuth> }, // app route (outside the knm markers)
];
