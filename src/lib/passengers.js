import { initialsFrom } from './myRides'

/*
 * The passengers a driver has already accepted, as the Find a Ride card shows
 * them. The backend sends `acceptedPassengers` on each ride in GET /api/rides;
 * `confirmedPassengers` and `passengers` are read too in case it settles on
 * one of those names. Only public details are kept: name, picture, office,
 * and a role or department if one is ever sent.
 */
const PASSENGER_LIST_KEYS = [
  'acceptedPassengers',
  'confirmedPassengers',
  'passengers',
]

function passengerList(ride) {
  for (const key of PASSENGER_LIST_KEYS) {
    if (Array.isArray(ride?.[key])) return ride[key]
  }
  return []
}

/** One passenger, from either a flat record or one nested under `user`. */
function normalisePassenger(entry, index) {
  const person = entry?.user ?? entry ?? {}
  const name = String(
    person.name ?? entry?.passengerName ?? entry?.name ?? '',
  ).trim()
  if (!name) return null

  const image = person.image ?? entry?.passengerImage ?? entry?.image ?? null

  return {
    id: String(
      person.id ?? entry?.passengerId ?? entry?.userId ?? entry?.id ?? index,
    ),
    name,
    image: image || null,
    initials: initialsFrom(name),
    office: person.office ?? entry?.office ?? null,
    role: person.role ?? person.jobTitle ?? person.department ?? null,
  }
}

/**
 * The ride's accepted passengers, tidied for display: unnamed entries are
 * dropped and the same person is never listed twice.
 */
export function normalisePassengers(ride) {
  const seen = new Set()
  return passengerList(ride)
    .map(normalisePassenger)
    .filter((passenger) => {
      if (!passenger || seen.has(passenger.id)) return false
      seen.add(passenger.id)
      return true
    })
}

/** "Ama is riding", "Ama and Kofi are riding", "Ama and 2 others are riding". */
export function describePassengers(passengers) {
  const firstName = (passenger) => passenger.name.split(/\s+/)[0]
  if (passengers.length === 0) return ''
  if (passengers.length === 1) return `${firstName(passengers[0])} is riding`
  if (passengers.length === 2) {
    return `${firstName(passengers[0])} and ${firstName(passengers[1])} are riding`
  }
  const others = passengers.length - 1
  return `${firstName(passengers[0])} and ${others} others are riding`
}
