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
  requestToJoinRide,
  updateRideStatus,
  acceptPassengerRequest,
  declinePassengerRequest,
  withdrawRideRequest,
  rerequestRide,
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

  describe('requestToJoinRide', () => {
    it('posts to the ride requests endpoint and returns the request', async () => {
      const data = {
        id: 'c4d5e6f7-2222-3333-4444-555566667777',
        rideId: 'b3f1c2a0-1e2d-4a3b-9c5e-6f7a8b9c0d1e',
        passengerId: 'd5e6f7a8-3333-4444-5555-666677778888',
        status: 'PENDING',
        createdAt: '2026-09-22T09:12:00.000Z',
      }

      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: async () => ({
          success: true,
          message: 'Request submitted successfully',
          data,
        }),
      })

      const result = await requestToJoinRide(
        'b3f1c2a0-1e2d-4a3b-9c5e-6f7a8b9c0d1e',
      )

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          '/api/rides/b3f1c2a0-1e2d-4a3b-9c5e-6f7a8b9c0d1e/requests',
        ),
        expect.objectContaining({ method: 'POST', credentials: 'include' }),
      )
      expect(result).toEqual(data)
    })

    it('surfaces a duplicate request with its status', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({
          success: false,
          message: 'You have already requested this ride.',
        }),
      })

      await expect(requestToJoinRide('ride-123')).rejects.toMatchObject({
        name: 'RideStatusError',
        status: 409,
        message: 'You have already requested this ride.',
      })
    })

    it('falls back to a generic message on a non-JSON failure', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('Not JSON')
        },
      })

      await expect(requestToJoinRide('ride-123')).rejects.toThrow(
        'Failed to send your request (500)',
      )
    })
  })

  describe('rerequestRide', () => {
    it('patches the rerequest endpoint with the trimmed reason', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          message: 'Request sent again successfully',
          data: { id: 'req-1', status: 'PENDING' },
        }),
      })

      const result = await rerequestRide('ride-1', 'req-1', '  Flexible.  ')

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/rides/ride-1/requests/req-1/rerequest'),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ reason: 'Flexible.' }),
        }),
      )
      expect(result).toEqual({ id: 'req-1', status: 'PENDING' })
    })

    it('surfaces the field error from a 400', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          message: 'The request is invalid',
          data: { fields: { reason: ['A reason is required.'] } },
        }),
      })

      await expect(rerequestRide('ride-1', 'req-1', ' ')).rejects.toThrow(
        'A reason is required.',
      )
    })

    it('carries a 409 status so the screen can explain it', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ message: 'You have already re-requested.' }),
      })

      const error = await rerequestRide('ride-1', 'req-1', 'x').catch((e) => e)

      expect(error).toBeInstanceOf(RideStatusError)
      expect(error.status).toBe(409)
      expect(error.message).toBe('You have already re-requested.')
    })

    it('falls back to a generic message on a non-JSON failure', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('not json')
        },
      })

      await expect(rerequestRide('ride-1', 'req-1', 'x')).rejects.toThrow(
        'Failed to send your request again (500)',
      )
    })
  })

  describe('withdrawRideRequest', () => {
    it('patches the withdraw endpoint and returns the request', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          data: { id: 'req-1', status: 'WITHDRAWN' },
        }),
      })

      const result = await withdrawRideRequest('ride-1', 'req-1')

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/rides/ride-1/requests/req-1/withdraw'),
        expect.objectContaining({ method: 'PATCH' }),
      )
      expect(result).toEqual({ id: 'req-1', status: 'WITHDRAWN' })
    })

    it('throws RideStatusError with the backend message', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => ({ message: 'Request can no longer be withdrawn' }),
      })

      const error = await withdrawRideRequest('ride-1', 'req-1').catch((e) => e)

      expect(error).toBeInstanceOf(RideStatusError)
      expect(error.status).toBe(409)
      expect(error.message).toBe('Request can no longer be withdrawn')
    })

    it('falls back to a generic message on a non-JSON failure', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => {
          throw new Error('not json')
        },
      })

      await expect(withdrawRideRequest('ride-1', 'req-1')).rejects.toThrow(
        'Failed to withdraw your request (500)',
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

    it('sends the reason when the driver gives one', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: { id: 'request-1' } }),
      })

      await declinePassengerRequest('ride-123', 'request-1', '  Car is full  ')

      expect(globalThis.fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          '/api/rides/ride-123/requests/request-1/decline',
        ),
        expect.objectContaining({
          method: 'PATCH',
          body: JSON.stringify({ reason: 'Car is full' }),
        }),
      )
    })

    it('always sends a reason body, since the backend requires one', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, data: {} }),
      })

      await declinePassengerRequest('ride-123', 'request-1', '   ')

      // Trimmed to empty, but still sent so the backend's own validation
      // is the single source of truth.
      expect(globalThis.fetch.mock.calls[0][1].body).toBe(
        JSON.stringify({ reason: '' }),
      )
    })

    it('surfaces the field error from a 400 rather than the generic message', async () => {
      globalThis.fetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          message: 'Validation failed',
          data: { fields: { reason: ['A reason is required.'] } },
        }),
      })

      await expect(
        declinePassengerRequest('ride-123', 'request-1', ''),
      ).rejects.toMatchObject({
        status: 400,
        message: 'A reason is required.',
      })
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
