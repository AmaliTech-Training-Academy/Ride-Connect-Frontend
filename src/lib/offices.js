// The backend's office enum. Every ride belongs to one office and starts or
// ends there. `id` is the code sent as `office`, `name` is what people read,
// and `label` is the origin/destination text for the office end of a ride.
export const OFFICES = [
  { id: 'ACCRA', name: 'Accra', label: 'AmaliTech Accra' },
  { id: 'KUMASI', name: 'Kumasi', label: 'AmaliTech Kumasi' },
  { id: 'TAKORADI', name: 'Takoradi', label: 'AmaliTech Takoradi' },
]

function findOffice(officeId) {
  return OFFICES.find((office) => office.id === officeId)
}

export function officeLabel(officeId) {
  return findOffice(officeId)?.label ?? ''
}

export function officeName(officeId) {
  return findOffice(officeId)?.name ?? ''
}

// Words people add around an office's name that don't change which place it is.
const OFFICE_FILLER_WORDS = new Set(['amalitech', 'office', 'the'])

function normalisePlace(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word && !OFFICE_FILLER_WORDS.has(word))
    .join(' ')
}

/**
 * True when typed text names the office itself, e.g. "Accra", "Accra office"
 * or "AmaliTech Accra" for ACCRA. A place in the city, such as "Accra Mall",
 * is not a match.
 */
export function matchesOffice(text, officeId) {
  const office = findOffice(officeId)
  if (!office) return false
  const normalised = normalisePlace(text)
  return normalised !== '' && normalised === normalisePlace(office.name)
}
