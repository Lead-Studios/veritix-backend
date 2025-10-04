# TODO List for Debugging tsconfig.json Errors

## Plan Breakdown
- [x] Step 1: Fix supertest import in `test/app.e2e-spec.ts` by changing to default import to resolve call signature error.
- [x] Step 2: Add type assertions (`as unknown as AuthRequest`) to the `req` mocks in the `create` and `findAll` tests in `src/modules/event/event.controller.spec.ts` to satisfy the `AuthRequest` interface without altering logic.
- [x] Step 3: Verify fixes by running `npx tsc --noEmit` to ensure no compilation errors.
- [x] Step 4: Run `npm run test` to confirm unit and E2E tests pass without issues.
- [x] Step 5: Update this TODO.md with completion status and close the task.
