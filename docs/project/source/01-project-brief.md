# Project brief: AI Fitness & Meal Coach

## Overview
AI Fitness & Meal Coach is a web app where a user sets a fitness goal and gets AI workout plans and meal plans. The user logs workouts, meals, weight and water, and sees progress over time.

## Who it is for
Individual users who want a simple plan and daily tracking. One user per account. There are no gyms, trainers or organisations.

## Goals, ranked
1. A user can sign in, set a profile and goal, and get an AI plan.
2. Logging workouts and meals takes less than 30 seconds.
3. Daily calories and weekly progress are always correct.
4. The app can be deployed (Express, Turso).

## Non-goals
- No payments or subscriptions.
- No wearable or device integration.
- No social feed or sharing between users.
- No mobile app.
- No medical advice.

## Stack
Node full stack (Express), Turso database, a web frontend, a backend and an API.

## Features

### A. Account
1. **Sign up and sign in.** A user creates an account and signs in with email and password.
2. **Sign out and session handling.** A user can sign out; the session ends after a set time.
3. **Profile.** The user enters age, height, weight and goal (lose, gain or maintain weight).
4. **Dietary preferences and allergies.** The user sets vegetarian or non-vegetarian and lists allergies.

### B. Workouts
5. **Exercise library.** The user browses and searches exercises.
6. **Create a workout plan.** The user builds a plan with days, exercises, sets and reps.
7. **Log a workout session.** The user records what they did in a session.
8. **AI weekly workout plan.** The AI proposes a week of workouts from the goal and fitness level.
9. **Workout history and personal records.** The user sees past sessions and best lifts.

### C. Meals and nutrition
10. **Food library.** The user browses foods with calories, protein, carbs and fat.
11. **Log a meal.** The user records breakfast, lunch, dinner and snacks.
12. **Daily calorie and macro summary.** The user sees totals for the day against the target.
13. **AI meal plan.** The AI proposes a day or a week of meals that fit the goal and preferences.
14. **AI meal swap.** The user asks the AI to replace a meal they do not like.
15. **Grocery list.** The app builds a grocery list from the meal plan.

### D. Tracking
16. **Weight log.** The user records weight over time.
17. **Water intake log.** The user records water drunk each day.
18. **Body measurements log.** The user records measurements such as waist and chest.
19. **Progress charts.** The user sees charts of weight, calories and workouts.
20. **Weekly report.** The AI writes a short summary of the user's week.

### E. Coach and motivation
21. **Ask the AI coach.** The user asks a fitness or nutrition question in a chat.
22. **Goals and streaks.** The user sets goals and sees streaks of logged days.
23. **Reminders list.** The user sees today's workout and meals as a checklist.

### F. Extra
24. **Export my data.** The user downloads their logs as a CSV file.
