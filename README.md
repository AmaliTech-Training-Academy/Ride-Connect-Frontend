# RideConnect Frontend

RideConnect Frontend is the Vite + React client for a work-commuter ride-sharing application. The current codebase implements the registration and login screens, a mock authentication service, and a placeholder post-login ride-list destination.

## Documentation

This document is the project documentation for the frontend repository. It is written to help a new contributor understand the project purpose, running commands, folder structure, feature flow, validation rules, testing expectations, and the current authentication mock contract used by the UI.

## 1. Project Overview

RideConnect allows colleagues to coordinate work commutes by posting and finding rides. The current frontend milestone focuses on the user journey for:

- creating a work account with an `@amalitech.com` email
- logging in with an email and password
- receiving validation feedback for missing or invalid fields
- seeing a placeholder screen after authentication succeeds

The app is intentionally organized so that the UI screens remain independent from the backend transport layer. Authentication behavior is described through the service file in `src/services/auth.js` and can be replaced with a live API once the backend contract is available.

## 2. Stack and Dependencies

The application uses:

- React 19
- Vite 8
- JavaScript
- Jest and React Testing Library
- CSS styling per page/component

The repository dependency list is managed in `package.json`.

## 3. Repository Structure

```text
Ride-Connect-Frontend/
├── package.json
├── vite.config.js
├── README.md
├── TESTING.md
├── src/
│   ├── App.jsx
│   ├── main.jsx
│   ├── components/
│   ├── lib/
│   ├── pages/
│   ├── services/
│   └── test/
└── public/
```

## 4. Application Flow

The main route is managed in `src/App.jsx`:

1. The default screen renders the registration screen.
2. If the user clicks the login action, the app switches to the login screen.
3. On successful registration or login, the app passes the user object to the screen update callback.
4. The post-login path currently redirects to a placeholder ride list screen.

The UI flow is intentionally simple and displays the implemented screens without requiring a real backend service.

## 5. Screens and UI Responsibilities

### 5.1 Register Screen

Source: `src/pages/RegisterScreen.jsx`

The register screen collects:

- `name`
- `email`
- `password`
- `confirmPassword`

It performs the following validation actions:

- full name is required
- email must be a valid `@amalitech.com` address
- password must be at least 8 characters
- `confirmPassword` must match the password value
- duplicate email errors must route the user to a login prompt

The screen is also responsible for showing the password strength meter feedback.

### 5.2 Login Screen

Source: `src/pages/LoginScreen.jsx`

The login screen collects:

- `email`
- `password`

It renders:

- inline field validation
- a password visibility toggle
- an invalid credentials error banner

### 5.3 Ride List Placeholder

Source: `src/pages/RideListScreen.jsx`

This screen is a placeholder destination. It confirms that a successful login or register flow has a route after authentication, while the real ride listing experience remains a future feature.

## 6. Authentication Service Contract

Source: `src/services/auth.js`

The authentication layer currently provides a mock implementation that simulates backend behavior locally.

The service exports:

- `registerUser({ name, email, password })`
- `loginUser({ email, password })`
- `DuplicateEmailError`
- `InvalidCredentialsError`

The mock service stores accounts in an in-memory `Map` and uses a short `LATENCY_MS` delay to simulate a network request. This behavior is intentionally limited to the frontend demonstration layer. It does not store or hash passwords in a secure backend manner.

When the backend provides the actual service endpoints, the service file should be updated to perform real HTTP requests using the same public contract. The expected client-side payload for registration is:

```json
{
  "name": "Full Name",
  "email": "you@amalitech.com",
  "password": "password123"
}
```

The expected auth flow for the mock service currently covers only email/password logic. Better Auth or any other authentication library should be integrated by the backend team and reflected here in the front-end service adapter layer.

## 7. Validation and Business Rules

The validation helper in `src/lib/registration.js` implements the current business rules:

- `WORK_EMAIL_DOMAIN = 'amalitech.com'`
- form fields must satisfy email and password constraints
- password strength returns a score from 0 to 4 for UI feedback only

The validation rules must remain aligned with the backend requirements. The frontend currently validates the work email domain and the minimum password length before submission.

## 8. Environment Configuration

Vite-based environment variables should be stored in a root-level `.env` file:

```text
Ride-Connect-Frontend/.env
```

A typical variable name is:

```env
VITE_API_BASE_URL=http://localhost:3000
```

The frontend service should read from `import.meta.env.VITE_API_BASE_URL` when the real backend URL is available.

## 9. Local Setup

Clone the repository:

```bash
git clone <repo-url>
cd Ride-Connect-Frontend
```

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

The app runs locally at:

```text
http://localhost:5173/
```

## 10. Available Scripts

The repository scripts in `package.json` are:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "test": "jest --runInBand",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

## 11. Testing Strategy

Testing is provided through Jest and React Testing Library. Tests are expected to live alongside the component or screen they verify. The repository also has `TESTING.md` as the detailed testing guide.

The test environment expects real-render behavior, not implementation detail checks. The `src/test/setup.js` file and `jest.config.cjs` files configure the environment.

The project enforces a minimum global coverage threshold of 80% across the following measures:

- branch
- function
- line
- statement

## 12. Contribution and Branch Workflow

The repository uses a branch-oriented development model. Before switching branches, the worktree should be clean:

```bash
git status
```

A local branch can be switched with:

```bash
git checkout <branch-name>
```

or:

```bash
git switch <branch-name>
```

The current repository remote is:

```text
git@github.com:AmaliTech-Training-Academy/Ride-Connect-Frontend.git
```

A contributor should avoid forcing branch divergence into a local workspace without first checking the local repository status.

## 13. Current Status and Roadmap

The current frontend implementation contains:

- registration screen
- login screen
- validation utilities
- mock auth service
- placeholder ride-list page

The following features are still represented by placeholder behavior and future work:

- real ride posting
- ride browsing and filtering
- backend integration
- session handling with token or cookie persistence
- complete ride request and join logic

## 14. Backend Integration Guidance

When the backend team provides endpoints, the frontend should store them in the auth service layer rather than directly in UI screens. The service file to update is `src/services/auth.js`.

A consistent integration shape is:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`

The exact contract should be agreed with the backend team. The payload shape should continue to align with the UI contract already used by the forms and validation rules.

## 15. Troubleshooting

Common steps while working locally:

- confirm `npm install` ran successfully
- verify a clean `git status` before branch switching
- check that the Vite dev server starts on port 5173
- ensure `.env` variables are named with the `VITE_` prefix

If backend endpoints are unavailable, the UI continues to rely on the mock service in `src/services/auth.js` and the tests remain isolated from live backend behavior.
