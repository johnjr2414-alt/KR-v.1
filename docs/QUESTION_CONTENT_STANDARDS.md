# Question Content Standards

**Phase:** 25.1  
**Scope:** Structural quality rules for the educational question bank.  
**Status:** Active for validation. Human factual review is not claimed by these rules.

This document separates two checks:

1. **Structural validation** decides whether a record can be stored and loaded. `QuestionValidator` performs it. A failure rejects that record. Existing bundled questions are not rewritten to satisfy new optional fields.
2. **Content advisories** describe authoring gaps for a person to review. `assessQuestionContent` reports them. An advisory does not change the question, does not reject it, and does not decide whether the answer is factually correct.

The game does not invent citations. The game does not mark a question as expert-reviewed.

---

## Required structural fields

| Field | Rule |
| --- | --- |
| `id` | Stable lowercase slug or UUID. Letters, digits, and single hyphens. Length 1–64. Examples: `elem-math-001`, `550e8400-e29b-41d4-a716-446655440000`. Spaces, uppercase, and underscores are rejected. |
| `subject` | One of the existing `SubjectId` values. |
| `topic` | Non-empty string. |
| `educationalTier` | One of the existing `EducationalTier` values. |
| `difficulty` | Integer from 1 through 5. |
| `type` | `multiple-choice`, `identification`, or `essay`. |
| `question` | Non-empty prompt text. |
| `timeLimit` | Whole seconds from 1 through 600. |
| `baseMasteryExp` | Positive number. |
| `status` | `draft`, `published`, or `archived`. Publication status is not a factual review. |

## Type-specific answers

| Type | Rule |
| --- | --- |
| Multiple choice | At least two choices. Each choice has a non-empty `choiceId` and text. Choice ids are unique. Choice text is unique after trimming and lowercasing. `correctAnswer` must match a `choiceId`. |
| Identification | At least one non-empty answer in `correctAnswer` or `acceptedAnswers`. Each alias is a non-empty string of at most 120 characters. Aliases that match each other after trimming and lowercasing are rejected. An alias that only repeats the canonical answer is allowed and reported as a redundant-alias advisory. The stored text is not rewritten. |
| Essay | `expectedAnswer` is a non-empty model answer or grading reference. |

## Optional metadata

These fields may be omitted. Omission does not fail structural validation, and loaders do not fill them in.

| Field | When present | When absent |
| --- | --- | --- |
| `subtopic` | Non-empty string, at most 80 characters. | Advisory: `subtopic-not-recorded`. |
| `explanation` | Non-empty string, at most 2000 characters. Shown after the player answers. | Advisory: `missing-explanation`. This is an authoring gap, not a statement that the answer is wrong. |
| `source` | Author-supplied `{ label, locator? }`. `label` is required and non-empty. `locator` is an optional page, section, or URL stored as text. Nothing is fetched or verified. | Advisory: `source-not-recorded`. A missing source is not treated as a citation. |
| `reviewStatus` | `unreviewed`, `author-checked`, or `needs-revision`. | Treated as unreviewed. Advisory: `review-pending`. |

`author-checked` means an author recorded that they checked the item. It is not expert certification.

There is no `expert-approved` status. Supplying one fails structural validation.

## Timer guidance

| Band | Meaning |
| --- | --- |
| 1–600 whole seconds | Structurally valid. |
| 5–180 seconds | Recommended playable band. |
| Outside 5–180, still inside 1–600 | Structurally valid, with advisory `timer-outside-recommended`. |
| `0`, negatives, fractions, `NaN`, or values above 600 | Structurally invalid. |

## What these rules do not do

- They do not rewrite bundled JSON or saved questions.
- They do not change a correct answer, difficulty, or explanation automatically.
- They do not decide factual accuracy. That remains a human review.
- They do not add sources to questions that do not already have one.

Bundled questions that predate this standard remain loadable when they already satisfy the structural rules. Their missing source and review labels stay as advisories.
