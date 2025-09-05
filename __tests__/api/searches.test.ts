import { createMocks } from 'node-mocks-http'
import handler from '@/app/api/searches/route'

describe('/api/searches', () => {
  it('creates a new search', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        industry: 'Restaurants',
        city: 'Seattle',
        state: 'WA',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(201)
    
    const data = JSON.parse(res._getData())
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('id')
  })

  it('validates required fields', async () => {
    const { req, res } = createMocks({
      method: 'POST',
      body: {
        industry: '',
        city: '',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(400)
    
    const data = JSON.parse(res._getData())
    expect(data.success).toBe(false)
    expect(data.error).toContain('validation')
  })

  it('handles database errors', async () => {
    // Mock database error
    jest.mock('@/lib/supabase', () => ({
      createClient: () => ({
        from: () => ({
          insert: () => ({
            select: () => Promise.resolve({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      })
    }))

    const { req, res } = createMocks({
      method: 'POST',
      body: {
        industry: 'Restaurants',
        city: 'Seattle',
        state: 'WA',
      },
    })

    await handler(req, res)

    expect(res._getStatusCode()).toBe(500)
  })
})
