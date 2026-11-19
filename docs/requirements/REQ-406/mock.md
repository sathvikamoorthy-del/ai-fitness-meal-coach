# Mock: User can set profile and fitness goal

Profile screen after saving. All six fields are required; units are fixed (cm, kg).

```
+------------------------------------------+
| Profile                       [ Sign out ] |
|------------------------------------------|
| Age           [ 32 ]        13 to 100     |
| Sex           (•) Female  ( ) Male        |
| Height (cm)   [ 163 ]       100 to 250    |
| Weight (kg)   [ 68.4 ]      30 to 300     |
| Goal          (•) Lose weight             |
|               ( ) Gain weight             |
|               ( ) Maintain weight         |
| Fitness level [ Beginner           v ]    |
|               Beginner / Intermediate /   |
|               Advanced                    |
|                              [ Save ]     |
|------------------------------------------|
| Daily calorie target        1,434 kcal    |
| (worked out when the profile is saved;    |
|  1,434.45 rounded to the nearest kcal)    |
+------------------------------------------+
```

Refused save (example):

```
+------------------------------------------+
| Height (cm)   [ 300 ]                     |
|   ! Height must be between 100 and       |
|     250 cm.                               |
| Fitness level [ choose...          v ]    |
|   ! Fitness level is required.            |
+------------------------------------------+
```

Flow:

```
Save --(field missing or out of range)--> refused, message per field
  |
  v
profile saved --> calorie target = (Mifflin-St Jeor x 1.4) -500 lose / +300 gain / 0 maintain,
  |               rounded to the nearest whole kcal
  |
  v
target shown on profile; read by daily summary (REQ-418)

Weight logged later (REQ-419) --> profile weight updated, target NOT recalculated
```
