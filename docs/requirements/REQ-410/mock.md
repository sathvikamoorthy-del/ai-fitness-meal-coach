# Mock: User can build a workout plan

Workouts screen at `/workouts`, reached from the Workouts link in the signed-in header. Plans have exactly seven days (Day 1 to Day 7). Sets are 1–10, reps 1–100, at most 15 exercises a day, the same exercise once per day. Exercise names come from the library (REQ-408).

Workouts (plan list):

```
+------------------------------------------------------------------+
| AI Fitness & Meal Coach      [ Workouts ] [ Exercises ] [ Sign out ] |
|------------------------------------------------------------------|
| Workouts                                    [ Build my own plan ] |
|                                                                  |
| My plan · 24 Nov 2026          Active        [ Open ] [ Edit ] [ Delete ] |
| My plan · 20 Nov 2026                 [ Make active ] [ Open ] [ Edit ] [ Delete ] |
+------------------------------------------------------------------+

No plans yet:  "No workout plans yet."   [ Build my own plan ]
```

Building or editing a plan:

```
+------------------------------------------------------------------+
| Build my own plan                                                |
|                                                                  |
| Day 1                                                            |
|   1. Back squat          sets [ 3 ]  reps [ 8 ]     [ Remove ]   |
|   2. Bench press         sets [ 3 ]  reps [ 10 ]    [ Remove ]   |
|   Exercise [ search the library...   v ] [ Add ]                 |
| Day 2   Rest day                                                 |
|   Exercise [ search the library...   v ] [ Add ]                 |
| ...                                                              |
| Day 7   Rest day                                                 |
|   Exercise [ search the library...   v ] [ Add ]                 |
|                                                                  |
|                                       [ Cancel ]   [ Save plan ] |
+------------------------------------------------------------------+
```

Refused save (examples):

```
Day 1: Sets must be a whole number from 1 to 10.
Day 3: Back squat is already in this day.
Day 5: A day can have at most 15 exercises.
Add at least one exercise to the plan.
```

Viewing a plan:

```
+------------------------------------------------------------------+
| My plan · 24 Nov 2026   Active                   [ Edit ] [ Delete ] |
| Day 1   Back squat 3 x 8 · Bench press 3 x 10                     |
| Day 2   Rest day                                                 |
| ...                                                              |
| Day 7   Rest day                                                 |
+------------------------------------------------------------------+
```

Delete:

```
+-----------------------------------------+
| Delete this plan? This cannot be undone. |
|                     [ Cancel ] [ Delete ] |
+-----------------------------------------+
```

Flow:

```
Header [Workouts] --> /workouts (signed-in only)
  [Build my own plan] --> Day 1-7 editor --[Save plan]--> rules OK?
       no  --> message naming the day; nothing saved
       yes --> plan saved, becomes Active (previous Active -> inactive) --> list
  [Make active] --> that plan Active, previous inactive
  [Edit] --> editor --[Save plan]--> saved, active status unchanged
  [Delete] --> confirm --> deleted (if it was Active: no active plan)
```
