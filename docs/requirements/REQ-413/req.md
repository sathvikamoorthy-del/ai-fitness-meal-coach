# User gets an AI meal plan

Requirement REQ-413 · Feature FEAT-1376 · Decision DEC-448

## Purpose
As a user, I can get a day or a week of meals proposed by the AI that fit my goal and preferences.

Getting an AI plan is the top goal of the app (G1).

## Behaviour
The AI proposes a day or a week of meals that fit the user's goal and dietary preferences.

## Acceptance criteria
- A user with a saved goal and preferences can ask for an AI meal plan.
- A vegetarian user gets only vegetarian meals.
- No meal contains an ingredient the user lists as an allergy.
- The plan is saved and shown again when the user returns.

## Order
Order: 10 of 24
Depends on: User can set dietary preferences and allergies
Goal served: G1

## Source documents
- docs/project/source/01-project-brief.md (feature C.13)
- docs/project/intent.md

## Open questions
- Does the plan cover a day or a week, and who chooses?
- Which AI provider or model is used?
- Must the plan meet a calorie target, and how is it computed?
