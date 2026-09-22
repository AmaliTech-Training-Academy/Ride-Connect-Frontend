import {
  describe,
  expect,
  it,
  jest,
  beforeEach,
  afterEach,
} from '@jest/globals'
import {
  fetchMyRides,
  updateRideStatus,
  acceptPassengerRequest,
  declinePassengerRequest,
  RideStatusError,
} from './rides'

describe('rides service', () => {
  beforeEach(() => {
    globalThis.fetch = jest.fn()
  })

  afterEach(() => {
    delete globalThis.fetch
    jest.restoreAllMocks()
  })

  describe('fetchMyRides', () => {
    it('returns the whole envelope on success', async () => {
      const payload = {
        success: true,
        message: 'Your rides were fetched successfully',
        data: {
          driving: [{ id: 'ride-1' }],
          joined: [],
          pastAndCancelled: [],
          joinedPastAndCancelled: [],
        },
      }

      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => payload,
      })

      const result = await fetchMyRides()

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/rides/mine'),
        expect.objectContaining({ credentials: 'include' }),
      )
      expect(result).toEqual(payload)
    })

    it('throws a RideStatusError carrying a 401 so the caller can sign out', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({ success: false, message: 'Session expired' }),
      })

      await expect(fetchMyRides()).rejects.toMatchObject({
        name: 'RideStatusError',
        status: 401,
        message: 'Session expired',
      })
    })

    it('falls back to a generic message on a non-JSON failure', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
        json: async () => {
          throw new Error('Not JSON')
        },
      })

      await expect(fetchMyRides()).rejects.toThrow(
        'Failed to load your rides (503)',
      )
    })
  })

  describe('updateRideStatus', () => {
    it('successfully updates ride status to CANCELLED', async () => {
      const mockData = {
        id: 'ride-123',
        driverId: 'driver-456',
        status: 'CANCELLED',
        availableSeats: 0,
      }

      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          message: 'Ride status updated successfully',
          data: mockData,
        }),
      })

      const result = await updateRideStatus('ride-123', 'CANCELLED')

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/rides/ride-123/status'),
        expect.objectContaining({
          method: 'PATCH',
          credentials: 'include',
          body: JSON.stringify({ status: 'CANCELLED' }),
        }),
      )
      expect(result).toEqual(mockData)
    })

    it('normalizes lowercase status input to uppercase', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { id: 'ride-123', status: 'FULL', availableSeats: 0 },
        }),
      })

      await updateRideStatus('ride-123', 'full')

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/rides/ride-123/status'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ status: 'FULL' }),
        }),
      )
    })

    it('throws RideStatusError on 403 Forbidden with backend message', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          success: false,
          message: 'Only the driver who owns this ride can change its status.',
        }),
      })

      await expect(updateRideStatus('ride-123', 'CANCELLED')).rejects.toThrow(
        'Only the driver who owns this ride can change its status.',
      )
    })

    it('throws RideStatusError on 409 Conflict', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          success: false,
          message: 'This ride is already FULL.',
        }),
      })

      try {
        await updateRideStatus('ride-123', 'FULL')
        throw new Error('Should have failed')
      } catch (err) {
        expect(err).toBeInstanceOf(RideStatusError)
        expect(err.status).toBe(409)
        expect(err.message).toBe('This ride is already FULL.')
      }
    })

    it('handles non-JSON error response gracefully', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Not JSON')
        },
      })

      await expect(updateRideStatus('ride-123', 'OPEN')).rejects.toThrow(
        'Failed to update ride status (500)',
      )
    })
  })

  describe('acceptPassengerRequest', () => {
    it('successfully calls accept endpoint', async () => {
      const mockData = {
        id: 'request-1',
        status: 'ACCEPTED',
      }

      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          message: 'Request accepted',
          data: mockData,
        }),
      })

      const result = await acceptPassengerRequest('ride-123', 'request-1')

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          '/api/rides/ride-123/requests/request-1/accept',
        ),
        expect.objectContaining({
          method: 'PATCH',
          credentials: 'include',
        }),
      )
      expect(result).toEqual(mockData)
    })

    it('throws RideStatusError when accept fails', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          message: 'No available seats remaining',
        }),
      })

      await expect(
        acceptPassengerRequest('ride-123', 'request-1'),
      ).rejects.toThrow('No available seats remaining')
    })
  })

  describe('declinePassengerRequest', () => {
    it('successfully calls decline endpoint', async () => {
      const mockData = {
        id: 'request-1',
        status: 'DECLINED',
      }

      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          message: 'Request declined',
          data: mockData,
        }),
      })

      const result = await declinePassengerRequest('ride-123', 'request-1')

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          '/api/rides/ride-123/requests/request-1/decline',
        ),
        expect.objectContaining({
          method: 'PATCH',
          credentials: 'include',
        }),
      )
      expect(result).toEqual(mockData)
    })

    it('throws RideStatusError when decline fails', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({
          success: false,
          message: 'Request not found',
        }),
      })

      await expect(
        declinePassengerRequest('ride-123', 'request-1'),
      ).rejects.toThrow('Request not found')
    })
  })
})
