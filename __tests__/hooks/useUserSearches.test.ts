import { renderHook, waitFor } from '../utils/test-utils'
import { useUserSearches } from '@/hooks/useUserSearches'
import { createMockSupabaseClient } from '../utils/test-utils'

const mockSupabase = createMockSupabaseClient()

jest.mock('@/lib/supabase', () => ({
  createClient: () => mockSupabase,
}))

describe('useUserSearches', () => {
  it('fetches user searches successfully', async () => {
    const mockSearches = [
      { id: '1', industry: 'Restaurants', city: 'Seattle' },
      { id: '2', industry: 'Auto Repair', city: 'Portland' },
    ]

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({ data: mockSearches, error: null }),
    })

    const { result } = renderHook(() => useUserSearches('test-user-id'))

    await waitFor(() => {
      expect(result.current.data).toEqual(mockSearches)
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
    })
  })

  it('handles fetch errors', async () => {
    const mockError = { message: 'Failed to fetch' }

    mockSupabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      then: jest.fn().mockResolvedValue({ data: null, error: mockError }),
    })

    const { result } = renderHook(() => useUserSearches('test-user-id'))

    await waitFor(() => {
      expect(result.current.data).toBeUndefined()
      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeTruthy()
    })
  })
})
