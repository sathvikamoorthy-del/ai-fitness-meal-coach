# User can browse and search exercises

Requirement REQ-408 · Feature FEAT-1371 · Decision DEC-443

## Purpose
As a user, I can browse and search the exercise library.

Workout plans (REQ-409, REQ-410) and workout logs (REQ-411) pick exercises from this library (G2).

## Behaviour
- **Library content.** The library holds about 40 exercises from the project's own seed file. No external API is used. An exercise has a name only. Names are unique, ignoring letter case.
- **Seed list.** The list of names is drafted as part of the work item, and the product owner reviews it before it is implemented.
- **Screen.** An "Exercises" screen at `/exercises`, for signed-in users only. It is reached from an **Exercises** link in the signed-in header, next to Sign out.
- **List.** The screen shows every exercise, sorted alphabetically ignoring letter case.
- **Search.** A search box above the list filters it as the user types.
  - An exercise matches when its name contains the typed text anywhere, ignoring letter case and spaces at the start and end of the typed text. For example, "squat" finds "Back squat" and "Goblet squat".
  - Matches keep the alphabetical order.
  - An empty search box (or only spaces) shows the full list again.
- **No match.** When nothing matches, the list is replaced by the message: No exercises match "<typed text>". The typed text is shown trimmed.
- **Read-only.** Users cannot add, edit or delete exercises in this version.

## Acceptance criteria
- A signed-in user can open the Exercises screen from the Exercises link in the header. A signed-out visitor is sent to sign-in.
- The screen lists all exercises from the seed, alphabetically ignoring letter case.
- Typing in the search box shows only exercises whose name contains the typed text, ignoring letter case and spaces at the ends. For example, "SQUAT" and " squat " both find "Back squat".
- Clearing the search box shows the full list again.
- A search with no match shows: No exercises match "<typed text>".
- The library contains about 40 exercises, from a seed list the product owner has reviewed.

## Order
Order: 5 of 24
Depends on: User can sign up and sign in (REQ-404)
Goal served: G2

## Resolved questions
- **Data source and fields** (original open question): answered in the final DB design (`exercises`). The data is seeded from the project's own seed file, about 40 exercises, with no external API. Each exercise has a name only (`name` UNIQUE, COLLATE NOCASE).
- **Search match:** the name contains the typed text anywhere, ignoring letter case and spaces at the ends (product owner, 2026-11-24).
- **Seed list:** about 40 common exercises, drafted as part of the work item and reviewed by the product owner before it is implemented (product owner, 2026-11-24).
- **Placement:** its own Exercises screen at `/exercises`, linked from the signed-in header (product owner, 2026-11-24).
- **Order and empty message:** alphabetical ignoring letter case. The empty search message is: No exercises match "<typed text>" (product owner, 2026-11-24).

## Source documents
- docs/project/source/01-project-brief.md (feature B.5)
- docs/project/intent.md
- docs/project/db_design.md and db_design_tables.csv (exercises)
