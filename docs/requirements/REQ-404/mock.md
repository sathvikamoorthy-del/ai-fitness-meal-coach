# Mock: User can sign up and sign in

Sign-in screen, and the same screen right after a successful sign-up. There is no "Forgot password?" link and no email verification step.

```
+--------------------------------+      +--------------------------------+
| AI Fitness & Meal Coach        |      | AI Fitness & Meal Coach        |
|                                |      |                                |
| Email    [__________________]  |      |  [ Account created ]           |
| Password [__________________]  |      |  Sign in with the same email   |
|          min. 8 characters     |      |  and password.                 |
|                                |      |                                |
|   [ Sign in ]   [ Sign up ]    |      | Email    [__________________]  |
+--------------------------------+      | Password [__________________]  |
                                        |                                |
                                        |   [ Sign in ]   [ Sign up ]    |
                                        +--------------------------------+
```

Flow:

```
Sign up --(password < 8 chars)--> refused, stay on form
   |
   v
"Account created" on sign-in screen (not signed in)
   |
   v
Sign in --(wrong password)--> refused
   |
   +-- profile not complete --> Profile
   +-- profile complete ------> Today
```
