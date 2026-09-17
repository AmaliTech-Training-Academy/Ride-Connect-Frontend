function getDateOffset(days) {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export const initialDrivingRides = [
  {
    id: 'driving-1',
    origin: 'East Legon',
    destination: 'AmaliTech Office',
    date: getDateOffset(1),
    time: '08:15',
    status: 'open',
    seatsTotal: 4,
    seatsAvailable: 2,
    pendingRequests: [
      {
        id: 'request-1',
        name: 'Nana Yeboah',
        initials: 'NY',
        requestedMinutesAgo: 8,
      },
      {
        id: 'request-2',
        name: 'Kojo Mensah',
        initials: 'KM',
        requestedMinutesAgo: 24,
      },
      {
        id: 'request-4',
        name: 'Adwoa Frimpong',
        initials: 'AF',
        requestedMinutesAgo: 31,
      },
    ],
    confirmedPassengers: [
      { id: 'passenger-1', name: 'Abena Owusu', initials: 'AO' },
      { id: 'passenger-2', name: 'Kofi Asante', initials: 'KA' },
    ],
  },
  {
    id: 'driving-2',
    origin: 'Adenta',
    destination: 'AmaliTech Office',
    date: getDateOffset(2),
    time: '07:45',
    status: 'open',
    seatsTotal: 3,
    seatsAvailable: 3,
    pendingRequests: [],
    confirmedPassengers: [],
  },
  {
    id: 'driving-3',
    origin: 'Cantonments',
    destination: 'AmaliTech Office',
    date: getDateOffset(4),
    time: '08:30',
    status: 'open',
    seatsTotal: 2,
    seatsAvailable: 1,
    pendingRequests: [
      {
        id: 'request-3',
        name: 'Esi Ofori',
        initials: 'EO',
        requestedMinutesAgo: 42,
      },
    ],
    confirmedPassengers: [
      { id: 'passenger-3', name: 'Yaw Boateng', initials: 'YB' },
    ],
  },
  {
    id: 'driving-4',
    origin: 'Osu',
    destination: 'AmaliTech Office',
    date: getDateOffset(-1),
    time: '08:00',
    status: 'cancelled',
    seatsTotal: 3,
    seatsAvailable: 1,
    pendingRequests: [],
    confirmedPassengers: [
      { id: 'passenger-4', name: 'Mabel Tetteh', initials: 'MT' },
    ],
  },
  {
    id: 'driving-5',
    origin: 'Spintex',
    destination: 'AmaliTech Office',
    date: getDateOffset(-3),
    time: '07:30',
    status: 'open',
    seatsTotal: 4,
    seatsAvailable: 2,
    pendingRequests: [],
    confirmedPassengers: [
      { id: 'passenger-5', name: 'Akua Addo', initials: 'AA' },
      { id: 'passenger-6', name: 'Kwame Nartey', initials: 'KN' },
    ],
  },
]
