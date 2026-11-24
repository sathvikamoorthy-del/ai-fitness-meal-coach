# Mock: User can browse and search exercises

Exercises screen at `/exercises`, reached from the Exercises link in the signed-in header. The list is alphabetical ignoring letter case. Search keeps names that contain the typed text, ignoring letter case and spaces at the ends. Exercise names below are examples; the real list is the reviewed seed (about 40).

Full list:

```
+--------------------------------------------------------+
| AI Fitness & Meal Coach        [ Exercises ] [ Sign out ] |
|--------------------------------------------------------|
| Exercises                                              |
| Search [______________________]                        |
|                                                        |
| Back squat                                             |
| Bench press                                            |
| Deadlift                                               |
| Dumbbell row                                           |
| Goblet squat                                           |
| ...                                                    |
+--------------------------------------------------------+
```

Searching "squat":

```
+--------------------------------------------------------+
| Exercises                                              |
| Search [squat_________________]                        |
|                                                        |
| Back squat                                             |
| Goblet squat                                           |
+--------------------------------------------------------+
```

No match:

```
+--------------------------------------------------------+
| Exercises                                              |
| Search [zumba_________________]                        |
|                                                        |
| No exercises match "zumba"                             |
+--------------------------------------------------------+
```

Flow:

```
Header [Exercises] --> /exercises (signed-in only; signed out --> sign-in)
   |
   v
full list, A-Z --type--> names containing the text (any case) --clear--> full list
                              |
                              +-- none --> No exercises match "<text>"
```
