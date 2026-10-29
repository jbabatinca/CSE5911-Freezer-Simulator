# Training Mode

In User Mode, choose a saved question set under **Training Mode**, then select
**Open set**. Find the requested rack, box, or specimen position in its source
layout. Expand racks and boxes to reach nested targets.

- A correct answer within three attempts earns one point.
- A wrong answer stays on the current question and increments its miss count.
- A question can only be completed by selecting the correct target. After three
  incorrect attempts, the entire set restarts from question one and all progress
  and score are cleared.
- Correct answers are locked. Select **Next question** to continue, or
  **See results** after the last question.
- Completion shows the score, percentage, and total misses. **Run set again**
  clears all progress and scores; **Change set** returns to the picker. Change set
  is also available during a run and when a question set, layout, or target is
  unavailable.

## Shared question target contract

The persisted types are in `src/models/QuestionSet.ts`. A question references a
`targetType` (`rack`, `box`, or `sample`) and a `targetId` from its set's `layoutId`.
For specimen questions, `targetId` is the occupied **position ID**, not the sample
ID: the same specimen may be stored in multiple positions.

`src/services/QuestionTargetService.ts` provides storage-independent functions:

- `getQuestionTargets(layout, targetType)` lists available targets and their labels.
- `resolveQuestionTarget(layout, question)` returns the matching target with its
  shelf, rack, box, and display label, or `null` if it no longer exists.

Both the admin creator and the training runner use this contract. Tests can supply
`SavedLayout` and `QuestionSet` fixtures without needing the admin UI. The runner
also works with real sets saved through the existing creator.

## Verification

Run from the project root:

```sh
npm test -- --run
npx tsc --noEmit
npm run build
```

Resolver, answer-checking, and complete admin-to-user workflow coverage lives in
`test/services/QuestionTargetService.test.ts`,
`test/render/QuestionSetAnswerChecking.test.ts`, and
`test/integration/question-set-workflow.test.ts`.
