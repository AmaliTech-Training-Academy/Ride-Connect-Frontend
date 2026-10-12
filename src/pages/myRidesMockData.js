/**
 * A `GET /api/rides/mine` payload used by the My Rides tests.
 *
 * Built fresh on each call so departures stay relative to "now" - the screen
 * buckets rides by whether they have already departed.
 */

function departureAt(dayOffset, hour, minute) {
  const date = new Date()
  date.setDate(date.getDate() + dayOffset)
  date.setHours(hour, minute, 0, 0)
  return date.toISOString()
}

function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60000).toISOString()
}

const DRIVER_ID = 'a1b2c3d4-1111-2222-3333-444455556666'
const DRIVER_NAME = 'Grace Hopper'

export function buildMyRidesResponse() {
  return {
    success: true,
    message: 'Your rides were fetched successfully',
    data: {
      driving: [
        {
          id: 'driving-1',
          driverId: DRIVER_ID,
          driverName: DRIVER_NAME,
          origin: 'East Legon',
          destination: 'AmaliTech Office',
          routeDescription: 'Meet at the Shell station, silver Corolla',
          departureAt: departureAt(1, 8, 15),
          totalSeats: 4,
          availableSeats: 2,
          status: 'OPEN',
          pendingRequests: [
            {
              id: 'request-1',
              passengerId: 'passenger-id-1',
              passengerName: 'Nana Yeboah',
              createdAt: minutesAgo(8),
            },
            {
              id: 'request-2',
              passengerId: 'passenger-id-2',
              passengerName: 'Kojo Mensah',
              createdAt: minutesAgo(24),
            },
            {
              id: 'request-4',
              passengerId: 'passenger-id-4',
              passengerName: 'Adwoa Frimpong',
              createdAt: minutesAgo(31),
            },
          ],
          confirmedPassengers: [
            {
              id: 'passenger-1',
              passengerId: 'passenger-id-5',
              passengerName: 'Abena Owusu',
            },
            {
              id: 'passenger-2',
              passengerId: 'passenger-id-6',
              passengerName: 'Kofi Asante',
            },
          ],
        },
        {
          id: 'driving-2',
          driverId: DRIVER_ID,
          driverName: DRIVER_NAME,
          origin: 'Adenta',
          destination: 'AmaliTech Office',
          routeDescription: null,
          departureAt: departureAt(2, 7, 45),
          totalSeats: 3,
          availableSeats: 3,
          status: 'OPEN',
          pendingRequests: [],
          confirmedPassengers: [],
        },
        {
          id: 'driving-3',
          driverId: DRIVER_ID,
          driverName: DRIVER_NAME,
          origin: 'Cantonments',
          destination: 'AmaliTech Office',
          routeDescription: null,
          departureAt: departureAt(4, 8, 30),
          totalSeats: 2,
          availableSeats: 1,
          status: 'OPEN',
          pendingRequests: [
            {
              id: 'request-3',
              passengerId: 'passenger-id-3',
              passengerName: 'Esi Ofori',
              createdAt: minutesAgo(42),
            },
          ],
          confirmedPassengers: [
            {
              id: 'passenger-3',
              passengerId: 'passenger-id-7',
              passengerName: 'Yaw Boateng',
            },
          ],
        },
      ],
      joined: [],
      pastAndCancelled: [
        {
          id: 'driving-4',
          driverId: DRIVER_ID,
          driverName: DRIVER_NAME,
          origin: 'Osu',
          destination: 'AmaliTech Office',
          routeDescription: null,
          departureAt: departureAt(-1, 8, 0),
          totalSeats: 3,
          availableSeats: 1,
          status: 'CANCELLED',
          pendingRequests: [],
          confirmedPassengers: [
            {
              id: 'passenger-4',
              passengerId: 'passenger-id-8',
              passengerName: 'Mabel Tetteh',
            },
          ],
        },
        {
          id: 'driving-5',
          driverId: DRIVER_ID,
          driverName: DRIVER_NAME,
          origin: 'Spintex',
          destination: 'AmaliTech Office',
          routeDescription: null,
          departureAt: departureAt(-3, 7, 30),
          totalSeats: 4,
          availableSeats: 2,
          status: 'OPEN',
          pendingRequests: [],
          confirmedPassengers: [
            {
              id: 'passenger-5',
              passengerId: 'passenger-id-9',
              passengerName: 'Akua Addo',
            },
            {
              id: 'passenger-6',
              passengerId: 'passenger-id-10',
              passengerName: 'Kwame Nartey',
            },
          ],
        },
      ],
      joinedPastAndCancelled: [],
    },
  }
}
