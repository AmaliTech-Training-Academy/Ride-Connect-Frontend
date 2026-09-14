# Testing Guide

This project uses [Jest](https://jestjs.io/) + [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
for component tests. This guide is for anyone adding a new component or feature and
needing to write tests for it — it's meant to be copy-and-adapt, not a spec to memorize.

## 1. Running tests

```bash
npm test              # run the full suite once
npm run test:watch    # re-run on file changes, good for TDD while building a component
npm run test:coverage # same as `npm test`, but prints the coverage table
```

`npm test` always collects coverage (see [`jest.config.cjs`](jest.config.cjs)) and enforces
a **minimum of 80% on branches, functions, lines, and statements** — across the whole `src/`
tree, not per file. If your PR drops the global average below 80% on any of those four
metrics, `npm test` exits non-zero and CI will fail on it.

In practice this means: if you add a new component, it needs a test file with real
assertions before you open a PR — not just a smoke test that renders it once. See
[section 6](#6-what-to-test-for-any-feature) for what "real coverage" should include.

## 2. Where test files go

Tests live **next to the component they test**, not in a separate `__tests__` folder:

```
src/components/LoginForm/
  LoginForm.jsx
  LoginForm.css
  LoginForm.test.jsx   <- here
```

This matches the existing pattern in
[`src/components/PostRideForm/`](src/components/PostRideForm/), which has
`PostRideForm.jsx` sitting right next to
[`PostRideForm.test.jsx`](src/components/PostRideForm/PostRideForm.test.jsx). Jest finds
any `*.test.{js,jsx}` file automatically — no registration needed.

## 3. The render → interact → assert pattern

Every test in this codebase follows the same three-step shape. Use
[`PostRideForm.test.jsx`](src/components/PostRideForm/PostRideForm.test.jsx) as your
reference — it's the real, working example in this repo, not a toy snippet. A trimmed
example from it:

```jsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PostRideForm from './PostRideForm'

it('shows validation errors when required fields are submitted empty', async () => {
  const user = userEvent.setup()

  // 1. RENDER — mount the component like a browser would
  render(<PostRideForm />)

  // 2. INTERACT — do what a real user would do
  await user.click(screen.getByRole('button', { name: 'Post Ride' }))

  // 3. ASSERT — check what the user would actually see
  expect(screen.getByText('Please enter an origin')).toBeInTheDocument()
  expect(screen.getByText('Please enter a departure date')).toBeInTheDocument()
})
```

Don't test implementation details (internal state, private functions, prop values passed
to a child). Test what ends up on the screen and what happens when a user acts on it —
that's what actually breaks when someone refactors the component wrong.

## 4. Finding elements: priority order

Query in this order. Each one down the list is a fallback for when the one above isn't
available — don't skip straight to the bottom just because it's convenient.

| Priority | Query | Use for | Example |
|---|---|---|---|
| 1 (best) | `getByRole` | Buttons, headings, form controls — anything with a real accessibility role | `screen.getByRole('button', { name: 'Post Ride' })` |
| 2 | `getByLabelText` | Form inputs with a `<label>` | `screen.getByLabelText('Origin')` |
| 3 | `getByPlaceholderText` | Inputs that only have a placeholder, no label | `screen.getByPlaceholderText('Starting point')` |
| 4 | `getByText` | Static text, error messages, copy on the page | `screen.getByText("Departure time can't be in the past")` |
| avoid | `getByTestId` / CSS class selectors | Last resort only — when the element genuinely has no accessible name or text | `container.querySelector('.swap-btn')` |

**Why this order:** `getByRole` and `getByLabelText` mirror what a screen reader or a
real user tabbing through the form would find, so a passing test on those actually proves
the UI is usable — not just present in the DOM. `getByTestId` proves nothing about
usability and rots silently if someone renames the class without renaming the test.

If you reach for `getByTestId`, stop and ask: could this element get a proper
`aria-label`, a `<label>`, or visible text instead? Usually yes — and that fix helps
real users too, not just the test.

## 5. Simulating user actions

Two tools, two different jobs:

**`@testing-library/user-event`** — use this by default. It simulates a real user:
clicking focuses the element first, typing fires each keystroke, etc.

```jsx
const user = userEvent.setup() // once per test

await user.type(screen.getByLabelText('Origin'), 'Kumasi')
await user.click(screen.getByRole('button', { name: 'Post Ride' }))
```

**`fireEvent`** (from `@testing-library/react`) — use this only when `user-event` doesn't
handle the input type well. The clearest example in this repo is `<input type="date">`
and `<input type="time">`: typing into them realistically is finicky in jsdom, so
`PostRideForm.test.jsx` sets them directly:

```jsx
import { fireEvent } from '@testing-library/react'

fireEvent.change(screen.getByLabelText('Departure date'), {
  target: { value: '2026-09-20' },
})
```

Default to `user-event`. Reach for `fireEvent` when you hit a specific input type it
doesn't simulate well, not as a general habit.

## 6. What to test for any feature

For any component or feature you write tests for, cover these five things. Not every
test file needs all five in equal depth, but skipping one without a reason is how bugs
ship.

1. **Happy path** — the feature works when used correctly with valid input.
2. **Validation errors** — required fields empty, invalid formats, out-of-range values
   all show the right inline error (see `PostRideForm.test.jsx`'s "shows validation
   errors" and "departure time can't be in the past" tests).
3. **Feature-specific edge cases** — the stuff unique to this feature's logic. For
   `PostRideForm` that's the seat stepper's 1–8 bounds and the swap-origin-destination
   button. For a login form it might be "email with no @", for a listing it might be
   "empty results."
4. **Loading / submitting state** — buttons disable, spinners show, the user can't
   double-submit. `PostRideForm.test.jsx`'s "allows submission with valid data" test
   checks for the `Posting…` state before asserting on success.
5. **Error state** — what the user sees when the action fails (server error banner,
   toast, retry option). If the feature only has a mock backend right now, at minimum
   confirm the error UI renders correctly by driving the component's state into it
   directly (see the note in `PostRideForm.jsx`'s mock submit — the error path is UI-only
   until the real API lands, so test the rendering logic even if it isn't reachable
   through a live user flow yet).

## 7. PRD story → test coverage checklist

These are the acceptance criteria from the PRD — use them as your test-writing checklist
once you build the corresponding feature. Non-functional requirements that apply across
multiple stories: all mutating API calls require an auth token; validation errors must be
shown inline, not as raw error codes/messages from the API; passwords are bcrypt-hashed
server-side.

| Story | Component | Key things to test |
|---|---|---|
| US1 — Register/Login | LoginForm / RegisterForm | Register/login with valid work email + password succeeds; invalid credentials show an error; empty-field validation on both forms; passwords are never sent/stored in plain text client-side; JWT is stored on successful login; no OAuth/SSO flows to test — email/password only |
| US2 — Post a Ride | PostRideForm | ✅ Done — see PostRideForm.test.jsx |
| US3 — Browse/search rides | RideListing | Listing renders all open rides; search/filter by route keyword works; search/filter by date works; listing still renders correctly (and fast) with a large number of rides — PRD requires <3s response even at 500 records; empty state when no rides match a search |
| US4 — Request to join | RideCard / JoinRequest | "Request to Join" triggers a join request; ride's available-seat count decrements on a successful join; button disables/changes state once the ride is full; can't request to join your own posted ride |
| US5 — Manage ride status | RideCard (driver view) | Driver can accept or decline a join request; ride status updates correctly between open / full / cancelled; cancelling a ride updates or removes it from the listing; rides auto-expire (no longer bookable) once their departure time has passed |
| US6 — Personal dashboard | MyRidesDashboard | Two tabs render: "Driving" and "Joined"; rides sort into the correct tab based on the user's relationship to them; accept/decline/cancel actions are available from the dashboard where relevant |
| US7 — In-app notifications (stretch, low priority) | — | Only test this if it actually gets built — it's explicitly out of the 6-week core scope per the PRD |

When you pick up one of these stories, copy the pattern from
[`PostRideForm.test.jsx`](src/components/PostRideForm/PostRideForm.test.jsx): render the
component, interact the way a user would, assert on what's visible — and check this
table plus [section 6](#6-what-to-test-for-any-feature) before you consider the test
suite done.
