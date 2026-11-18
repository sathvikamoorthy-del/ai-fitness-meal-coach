# User can ask the AI coach

Requirement REQ-424 · Feature FEAT-1387 · Decision DEC-459

## Purpose
As a user, I can ask a fitness or nutrition question in a chat with the AI coach.

Answers everyday questions without medical advice (brief feature 21).

## Behaviour
The user asks a fitness or nutrition question in a chat and gets an answer from the AI coach.

## Acceptance criteria
- The user can send a fitness or nutrition question and receive an answer.
- The conversation is shown in order.
- The coach does not give medical advice.

## Order
Order: 21 of 24
Depends on: User can set profile and fitness goal
Goal served: brief only

## Source documents
- docs/project/source/01-project-brief.md (feature E.21)
- docs/project/intent.md

## Open questions
- How is "no medical advice" enforced and checked (e.g. a refusal message)?
- Which AI provider or model is used?
- Is chat history kept between sessions?
