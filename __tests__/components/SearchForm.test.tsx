import { render, screen, fireEvent, waitFor } from '../utils/test-utils'
import { SearchForm } from '@/components/search/SearchForm'

describe('SearchForm', () => {
  it('renders without crashing', () => {
    render(<SearchForm onSubmit={jest.fn()} />)
    expect(screen.getByText('Search for Companies')).toBeInTheDocument()
  })

  it('handles form submission', async () => {
    const mockOnSubmit = jest.fn()
    render(<SearchForm onSubmit={mockOnSubmit} />)
    
    const industryInput = screen.getByLabelText(/industry/i)
    const cityInput = screen.getByLabelText(/city/i)
    const submitButton = screen.getByRole('button', { name: /search/i })
    
    fireEvent.change(industryInput, { target: { value: 'Restaurants' } })
    fireEvent.change(cityInput, { target: { value: 'Seattle' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        industry: 'Restaurants',
        city: 'Seattle',
        state: expect.any(String),
      })
    })
  })

  it('shows validation errors for empty fields', async () => {
    render(<SearchForm onSubmit={jest.fn()} />)
    
    const submitButton = screen.getByRole('button', { name: /search/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/industry is required/i)).toBeInTheDocument()
      expect(screen.getByText(/city is required/i)).toBeInTheDocument()
    })
  })
})
