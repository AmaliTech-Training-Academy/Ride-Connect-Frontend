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
