export const WORK_EMAIL_DOMAIN = 'amalitech.com'
export const MIN_PASSWORD_LENGTH = 8

const WORK_EMAIL_PATTERN = new RegExp(
  `^[^\\s@]+@${WORK_EMAIL_DOMAIN.replace('.', '\\.')}$`,
  'i',
)

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
  } else if (!WORK_EMAIL_PATTERN.test(email.trim())) {
    errors.email = `Please use your @${WORK_EMAIL_DOMAIN} work email`
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
