# Mock: User can sign out and sessions expire

Header of every signed-in screen, and the sign-in screen after the session has expired.

```
+------------------------------------------+
| AI Fitness & Meal Coach      [ Sign out ] |
+------------------------------------------+

+--------------------------------+
| AI Fitness & Meal Coach        |
|                                |
|  Session expired, please sign  |
|  in again.                     |
|                                |
| Email    [__________________]  |
| Password [__________________]  |
|                                |
|   [ Sign in ]   [ Sign up ]    |
+--------------------------------+
```

Flow:

```
Sign in --> session starts, expires at sign-in + 7 days (fixed)
   |
   +-- Sign out ---------------> session ended at once --> sign-in screen
   |
   +-- request after 7 days ---> refused --> sign-in screen
   |                              "Session expired, please sign in again"
   v
Sign in again --> new 7-day session
```
