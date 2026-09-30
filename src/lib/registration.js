export const MIN_PASSWORD_LENGTH = 8

/*
 * The email domains allowed to register. This must match the backend's list:
 * the backend is the real gate, and this check only gives quicker feedback.
 * VITE_ALLOWED_EMAIL_DOMAINS (comma-separated) overrides the default.
 */
export const DEFAULT_ALLOWED_EMAIL_DOMAINS = [
  'amalitech.com',
  'amalitechtraining.org',
]

/** "a.com, B.org ,," -> ['a.com', 'b.org']; an empty list means "not set". */
export function parseEmailDomains(value) {
  return String(value ?? '')
    .split(',')
    .map((domain) => domain.trim().replace(/^@/, '').toLowerCase())
    .filter(Boolean)
}

function configuredEmailDomains() {
  const fromEnv = parseEmailDomains(
    globalThis.__VITE_ALLOWED_EMAIL_DOMAINS__ ||
      globalThis.process?.env?.VITE_ALLOWED_EMAIL_DOMAINS,
  )
  return fromEnv.length > 0 ? fromEnv : DEFAULT_ALLOWED_EMAIL_DOMAINS
}

export const ALLOWED_EMAIL_DOMAINS = configuredEmailDomains()

/** The main domain, used for examples such as the email placeholder. */
export const WORK_EMAIL_DOMAIN = ALLOWED_EMAIL_DOMAINS[0]

/** "@a.com", "@a.com or @b.org", "@a.com, @b.org or @c.net". */
export function formatEmailDomains(domains = ALLOWED_EMAIL_DOMAINS) {
  const tagged = domains.map((domain) => `@${domain}`)
  return tagged.length > 1
    ? `${tagged.slice(0, -1).join(', ')} or ${tagged.at(-1)}`
    : (tagged[0] ?? '')
}

/** True when the email is a single address on one of the allowed domains. */
export function isAllowedWorkEmail(email, domains = ALLOWED_EMAIL_DOMAINS) {
  const match = /^[^\s@]+@([^\s@]+)$/.exec(String(email ?? '').trim())
  return Boolean(match) && domains.includes(match[1].toLowerCase())
}

/**
 * Validates the registration form.
 *
 * Returns an object keyed by field name. An empty object means the form is
 * valid, so callers can branch on Object.keys(errors).length.
 */
export function validateRegistration({
  name = '',
  email = '',
  password = '',
  confirmPassword = '',
}) {
  const errors = {}

  if (!name.trim()) {
    errors.name = 'Please enter your full name'
  }

  if (!email.trim()) {
    errors.email = 'Please enter your work email'
  } else if (!isAllowedWorkEmail(email)) {
    errors.email = `Please use your ${formatEmailDomains()} work email`
  }

  if (!password) {
    errors.password = 'Please enter a password'
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
  }

  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm your password'
  } else if (confirmPassword !== password) {
    errors.confirmPassword = "Passwords don't match"
  }

  return errors
}

/**
 * Scores a password from 0 to 4 for the strength meter. This drives a hint,
 * not a rule - only MIN_PASSWORD_LENGTH is actually enforced.
 */
export function passwordStrength(password = '') {
  if (!password) {
    return { score: 0, percent: 0, label: '' }
  }

  let score = 0
  if (password.length >= MIN_PASSWORD_LENGTH) score += 1
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1
  if (/\d/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1

  const labels = [
    '',
    'Too weak',
    'Getting there',
    'Almost there',
    'Strong enough',
  ]

  return { score, percent: (score / 4) * 100, label: labels[score] }
}
