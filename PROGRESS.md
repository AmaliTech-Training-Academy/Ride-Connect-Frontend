# RideConnect Frontend Progress

## Overview

This document tracks frontend feature progress for RideConnect. It covers what is currently built for Post a Ride and Find a Ride, how the mock data is shaped, and what remains before backend integration.

## Feature: Post a Ride (US2)

### Components

- [`PostRideForm.jsx`](src/components/PostRideForm/PostRideForm.jsx) owns the form state, validation, submit states, navigation hook, and mock submission.
- [`SeatStepper.jsx`](src/components/PostRideForm/SeatStepper.jsx) controls the number of seats from 1 through 8.
- [`RidePreviewCard.jsx`](src/components/PostRideForm/RidePreviewCard.jsx) renders the live preview of the ride being created.

### What it does

The form lets a user enter an origin, destination, optional route description, departure date, departure time, and number of seats. The preview updates as the form changes. The form also supports swapping origin and destination, cancelling to reset the form, and navigating to Find a Ride through the authenticated app shell.

### Client-side validation

- Origin is required.
- Destination is required.
- Departure date is required.
- Departure date cannot be before today.
- Departure time is required.
- When the selected date is today, the departure time cannot be in the past.
- Seats must be between 1 and 8.
- Route description is limited to 200 characters by the textarea `maxLength` and input slicing.

### UI states

1. **Empty/idle:** the initial form is blank except for the default destination `AmaliTech Office` and one seat; the preview shows the instructional placeholder.
2. **Validation errors:** after an invalid submit, inline field errors render and the preview explains that the errors must be fixed.
3. **Submitting:** the submit button shows `Posting…`, inputs and controls are disabled, and the form cannot be submitted again.
4. **Success:** after the mock delay, the preview is marked `NEW` and a `Your ride is live!` toast appears.
5. **Server error:** an error banner can render with `Something went wrong posting your ride. Please try again.` and can be dismissed. The current mock submit does not trigger this path; it is ready for the real request failure path.

### API handoff

Submission is currently mocked in [`PostRideForm.jsx`](src/components/PostRideForm/PostRideForm.jsx), inside `handleSubmit`. After client validation, it sets `status` to `submitting`, waits 1.5 seconds with `setTimeout`, then marks the form successful and logs the values as `Ride posted (mock)`.

The form currently builds this object in state and passes it to the mock callback/log:

```js
{
  origin: '',
  destination: 'AmaliTech Office',
  description: '',
  date: '',
  time: '',
  seats: 1
}
```

At submit time, `origin`, `destination`, `description`, `date`, `time`, and `seats` contain the user's values. There is no API client, auth token, driver ID, or status field added by this component. The real implementation should replace the `setTimeout` block with an authenticated `POST /rides` request, map the response to the success state, and map request failures to the existing error banner. The exact PRD request-body schema is not present in this repository, so whether this six-field payload matches the backend contract cannot be confirmed yet. Confirm the backend's date/time format, seat field name, required destination behavior, and whether the server derives the driver/current user from the auth token.

Dev-only submit controls were already removed from this feature before merge. Post a Ride is clean UI-only code ready for real API wiring.

### Responsive behavior

[`PostRideForm.css`](src/components/PostRideForm/PostRideForm.css) uses a one-column layout by default and switches to a form/preview two-column layout at `min-width: 900px`. Below that breakpoint the form and preview stack vertically for tablet and mobile widths. The origin/destination row also stacks vertically at `max-width: 480px`.

## Feature: Find a Ride (US3)

### Components

- [`FindARide.jsx`](src/pages/FindARide.jsx) renders the page shell, filters, ride cards, empty/error/loading states, request toast, and dev-only state controls.
- [`findARideMockData.js`](src/pages/findARideMockData.js) creates the eight local sample rides.

### What it does

The page displays open colleague rides in a responsive card grid. It includes RideConnect navigation, Find a Ride/My Rides tabs, an Offer a Ride action, notifications/avatar UI, text and date filtering, active filter chips, request-state card variants, and a non-blocking success toast after a mock join request.

### Mock data shape

`createMockRides()` returns an array of objects with these fields:

- `id`: string identifier such as `ride-1`.
- `driverName`: display name of the driver.
- `driverInitials`: initials displayed in the avatar.
- `origin`: starting location.
- `destination`: destination location.
- `description`: optional route/pickup description; it may be an empty string.
- `date`: local generated date represented as an ISO-like `YYYY-MM-DD` string.
- `time`: 24-hour `HH:mm` string such as `07:30`.
- `seatsTotal`: total seats offered by the driver.
- `seatsAvailable`: seats currently shown as available.
- `status`: ride status string. The current examples use `open`; the filter only renders rides whose status is `open`.
- `isOwnRide`: boolean identifying the current user's own ride.
- `requestStatus`: one of `none`, `pending`, or `accepted` in the current examples.

One complete example from the mock data is:

```js
{
  id: 'ride-2',
  driverName: 'Kwame Mensah',
  driverInitials: 'KM',
  origin: 'Kasoa',
  destination: 'AmaliTech Office',
  description: 'Leaving early and taking the coastal road.',
  date: tomorrow,
  time: '06:45',
  seatsTotal: 4,
  seatsAvailable: 1,
  status: 'open',
  isOwnRide: false,
  requestStatus: 'none'
}
```

`tomorrow` is generated at runtime by adding one day to the current local date. The backend response will need to preserve or be mapped to these assumptions, especially date timezone semantics, time format, ID type, status values, and whether available seats are returned directly or calculated from bookings.

### Card variant logic

The card logic in [`FindARide.jsx`](src/pages/FindARide.jsx) uses these combinations:

- **Default:** `isOwnRide: false`, `requestStatus: 'none'`, `status: 'open'`, and `seatsAvailable` greater than 1. It shows the Open badge and Request to Join button.
- **Low-seat warning:** any open non-own ride with `seatsAvailable === 1`. It adds the amber border and warning seat text. The request action still follows the request status.
- **Pending request:** `isOwnRide: false` and `requestStatus: 'pending'`. It shows the static Request pending pill instead of a button.
- **Already joined:** `isOwnRide: false` and `requestStatus: 'accepted'`. It shows the static `You're in` pill.
- **Own ride:** `isOwnRide: true`. It takes precedence for the action and status display, showing the tinted card, Your ride badge, and Manage button.

The current render order means an own ride with another request status still displays as an own ride, and a one-seat ride can also be pending or accepted while retaining its low-seat styling.

### Search and filter logic

- The search input trims and lowercases the entered term, then performs a case-insensitive partial match against `origin` or `destination`.
- The date dropdown sets `selectedDate` to a specific `YYYY-MM-DD` value or an empty value for Any date.
- Today and Tomorrow set the same date state as the dropdown. Clicking the already active pill clears the date filter.
- Search and date conditions combine with an AND operation. Only rides with `status === 'open'` are included in the filtered result.
- When either filter is active, removable chips show the search term and/or selected date, along with a Clear filters action.
- The subtitle count uses `filteredRides.length`, so it reflects the currently visible filtered rides.

### API handoff

The mock import is at the top of [`FindARide.jsx`](src/pages/FindARide.jsx):

```js
import { createMockRides } from './findARideMockData'
```

The component initializes local state with `createMockRides()` and has a TODO immediately above that state identifying the future `GET /rides` integration. Replace the local initializer with an authenticated request, set the returned rides into `rides`, and map request/loading/failure results to the existing `loadState` values (`loaded`, `loading`, and `error`). The request-to-join button currently only changes the local ride's `requestStatus` to `pending`; it needs a real join-request endpoint and server response handling.

The mock shape is close to the display model expected by the PRD, but the real response contract is not available in this repository. Open questions to resolve with the backend include whether the response uses these exact field names, whether `id` is a string or numeric ID, whether `date` and `time` are separate values or a timestamp, how the current user's own ride and request status are represented, and whether `seatsAvailable` is returned or derived. A response adapter is likely safer than coupling the UI directly to the API shape.

Dev-only state controls for **loading**, **error**, **no rides**, and **reset data** are intentionally still present behind the Dev states button. Unlike Post a Ride, they should remain during backend integration and be removed only after the real API states have been verified.

### Responsive behavior

[`FindARide.css`](src/pages/FindARide.css) uses a three-column grid by default, two columns at `max-width: 950px`, and one stacked column at `max-width: 680px`. The filter bar uses three columns on wide screens and stacks its search, date, and quick-filter controls vertically at the mobile breakpoint.

## Shared / Infrastructure

- Tests use Jest and React Testing Library. See [`TESTING.md`](TESTING.md) for the repository testing workflow, query conventions, coverage requirements, and story checklist.
- `npm run test:coverage` was attempted on 2026-09-14 but did not produce coverage because Jest found both `jest.config.js` and `jest.config.cjs` and stopped before running tests. Coverage status is therefore currently unavailable until the duplicate configuration is resolved or an explicit config strategy is adopted.
- Post a Ride was merged into `develop` in commit `bf0a633`.
- Find a Ride currently exists on branch `feat/RID-5-find-ride` in commit `f499fa9`; it is not merged into `develop` at the time this document was written. The `develop` branch currently contains the authenticated routing commit `a1f0aea`, but not the Find a Ride commit.

## Known gaps / not yet built

- **US1 Login/Register:** the basic frontend screens exist from separate teammate work, but production authentication, JWT/token storage, and backend integration are not part of this Post a Ride/Find a Ride work.
- **US4 Request to join backend logic:** Find a Ride only changes `requestStatus` locally and displays a mock toast. There is no authenticated join-request API, seat decrement, full-ride handling, duplicate-request prevention, or server confirmation.
- **US5 Manage ride status:** the own-ride Manage button is UI-only. Accept/decline requests, open/full/cancelled transitions, cancellation, and ride expiry are not implemented.
- **US6 Personal dashboard:** there is no real My Rides dashboard with Driving and Joined tabs or server-backed sorting/actions. The current My Rides navigation callback returns to the post-ride screen as a temporary placeholder.
- Find a Ride has no dedicated test file yet, so its filters, card variants, dev states, and request toast still need interaction coverage once the duplicate Jest/Babel configuration issue is cleaned up.
- Neither feature has a real backend response adapter, API error contract, auth-token handling, or end-to-end integration test.
