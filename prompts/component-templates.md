# Claude Component Development Templates

## Quick Start Templates for Common Components

### Search & Discovery Components

#### Business Search Component
```
Create a business search component for Google Places API with:
- Industry/location filters
- Results table with selection checkboxes  
- Save to database functionality
- CSV export capability
- Loading states and error handling
- Use Supabase for persistence
```

#### Advanced Filters Component  
```
Create an advanced filtering system with:
- Dynamic filter builder with AND/OR logic
- Multiple field types (text, number, date, select)
- Real-time results updating
- Saved filter presets
- Filter history and favorites
```

### Data Display Components

#### Interactive Data Table
```
Create a data table component with:
- Column sorting and filtering
- Row selection and bulk actions
- Pagination and virtual scrolling
- Export functionality (CSV, PDF)
- Responsive design for mobile
- Search across all columns
```

#### Dashboard Charts
```
Create a dashboard chart library with:
- Multiple chart types (bar, line, pie, area)
- Real-time data updates
- Interactive tooltips and legends
- Responsive design
- Export to image/PDF
- Integration with analytics data
```

### Form Components

#### Dynamic Form Builder
```
Create a form builder that generates forms from JSON schema:
- All standard input types
- Conditional field visibility
- Real-time validation with Zod
- File upload with preview
- Multi-step forms with progress
- Auto-save drafts
```

#### Contact Management Form
```
Create a contact management form with:
- Contact information fields
- Company association
- Communication history tracking
- File attachments
- Follow-up reminders
- Integration with CRM data
```

### Communication Components

#### Email Template Editor
```
Create an email template editor with:
- Drag-and-drop block editor
- Variable substitution system
- HTML email generation
- Device preview (mobile/desktop)
- Template library with categories
- A/B testing capabilities
```

#### Campaign Management
```
Create a campaign management system with:
- Campaign creation wizard
- Target audience selection
- Email template integration
- Scheduling and automation
- Performance analytics
- A/B testing results
```

### Analytics & Reporting

#### Report Generator
```
Create a report generation system with:
- Multiple report templates
- Dynamic data binding
- PDF/HTML export options
- Scheduled report delivery
- Custom branding options
- Interactive charts and graphs
```

#### Analytics Dashboard
```
Create an analytics dashboard with:
- KPI cards with trend indicators
- Interactive charts and graphs
- Date range selectors
- Drill-down capabilities
- Export and sharing options
- Real-time data updates
```

## Component Architecture Patterns

### Standard Component Structure
```typescript
// Component Props Interface
interface ComponentProps {
  // Required props
  data: DataType[]
  onAction: (action: ActionType) => void
  
  // Optional props with defaults
  loading?: boolean
  error?: string | null
  className?: string
  
  // Configuration options
  options?: {
    enableSearch?: boolean
    enableExport?: boolean
    pageSize?: number
  }
}

// Component Implementation
export default function Component({ 
  data, 
  onAction, 
  loading = false,
  error = null,
  className = "",
  options = {}
}: ComponentProps) {
  // State management
  const [localState, setLocalState] = useState(initialState)
  
  // Effects and handlers
  useEffect(() => {
    // Component logic
  }, [dependencies])
  
  // Error boundary
  if (error) {
    return <ErrorDisplay error={error} />
  }
  
  // Loading state
  if (loading) {
    return <LoadingSpinner />
  }
  
  // Main component render
  return (
    <div className={cn("component-base", className)}>
      {/* Component content */}
    </div>
  )
}
```

### Error Boundary Pattern
```typescript
interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ComponentType<{ error: Error }>
}

class ComponentErrorBoundary extends React.Component<ErrorBoundaryProps> {
  state = { hasError: false, error: null }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Component error:', error, errorInfo)
  }
  
  render() {
    if (this.state.hasError) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback
      return <FallbackComponent error={this.state.error} />
    }
    
    return this.props.children
  }
}
```

### Loading State Pattern
```typescript
function useAsyncData<T>(
  fetchFn: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    let cancelled = false
    
    async function fetchData() {
      try {
        setLoading(true)
        setError(null)
        const result = await fetchFn()
        
        if (!cancelled) {
          setData(result)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unknown error')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }
    
    fetchData()
    
    return () => {
      cancelled = true
    }
  }, dependencies)
  
  return { data, loading, error, refetch: () => fetchData() }
}
```

## Styling Patterns

### Component Styling with Variants
```typescript
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "underline-offset-4 hover:underline text-primary"
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
        icon: "h-10 w-10"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
)

interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
```

### Responsive Design Pattern
```typescript
// Responsive utilities
const breakpoints = {
  sm: '640px',
  md: '768px', 
  lg: '1024px',
  xl: '1280px'
}

// Component with responsive props
interface ResponsiveGridProps {
  cols: {
    default: number
    sm?: number
    md?: number
    lg?: number
    xl?: number
  }
  gap?: number
  children: React.ReactNode
}

function ResponsiveGrid({ cols, gap = 4, children }: ResponsiveGridProps) {
  const gridCols = {
    default: `grid-cols-${cols.default}`,
    sm: cols.sm ? `sm:grid-cols-${cols.sm}` : '',
    md: cols.md ? `md:grid-cols-${cols.md}` : '',
    lg: cols.lg ? `lg:grid-cols-${cols.lg}` : '',
    xl: cols.xl ? `xl:grid-cols-${cols.xl}` : ''
  }
  
  return (
    <div className={cn(
      'grid',
      `gap-${gap}`,
      Object.values(gridCols).filter(Boolean)
    )}>
      {children}
    </div>
  )
}
```

## Testing Patterns

### Component Testing Template
```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import { Component } from './Component'

// Mock dependencies
vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createClientComponentClient: () => mockSupabase
}))

describe('Component', () => {
  const defaultProps = {
    data: mockData,
    onAction: vi.fn(),
  }
  
  beforeEach(() => {
    vi.clearAllMocks()
  })
  
  it('renders without crashing', () => {
    render(<Component {...defaultProps} />)
    expect(screen.getByRole('main')).toBeInTheDocument()
  })
  
  it('handles user interactions', async () => {
    const user = userEvent.setup()
    const mockOnAction = vi.fn()
    
    render(<Component {...defaultProps} onAction={mockOnAction} />)
    
    await user.click(screen.getByRole('button', { name: /submit/i }))
    
    await waitFor(() => {
      expect(mockOnAction).toHaveBeenCalledWith('submit')
    })
  })
  
  it('displays loading state', () => {
    render(<Component {...defaultProps} loading={true} />)
    expect(screen.getByText(/loading/i)).toBeInTheDocument()
  })
  
  it('displays error state', () => {
    const errorMessage = 'Something went wrong'
    render(<Component {...defaultProps} error={errorMessage} />)
    expect(screen.getByText(errorMessage)).toBeInTheDocument()
  })
})
```

### API Testing Pattern
```typescript
import { setupServer } from 'msw/node'
import { rest } from 'msw'
import { apiClient } from './api-client'

const server = setupServer(
  rest.get('/api/data', (req, res, ctx) => {
    return res(ctx.json({ data: mockData }))
  }),
  
  rest.post('/api/data', (req, res, ctx) => {
    return res(ctx.json({ success: true }))
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('API Client', () => {
  it('fetches data successfully', async () => {
    const result = await apiClient.getData()
    expect(result).toEqual({ data: mockData })
  })
  
  it('handles API errors', async () => {
    server.use(
      rest.get('/api/data', (req, res, ctx) => {
        return res(ctx.status(500), ctx.json({ error: 'Server error' }))
      })
    )
    
    await expect(apiClient.getData()).rejects.toThrow('Server error')
  })
})
```

## Performance Optimization Patterns

### Memoization Pattern
```typescript
import { memo, useMemo, useCallback } from 'react'

// Memoized component
const MemoizedComponent = memo(function Component({ data, onUpdate }) {
  // Memoized expensive calculations
  const processedData = useMemo(() => {
    return data.map(item => expensiveTransform(item))
  }, [data])
  
  // Memoized callbacks
  const handleUpdate = useCallback((id: string) => {
    onUpdate(id)
  }, [onUpdate])
  
  return (
    <div>
      {processedData.map(item => (
        <Item key={item.id} data={item} onUpdate={handleUpdate} />
      ))}
    </div>
  )
})
```

### Virtual Scrolling Pattern
```typescript
import { FixedSizeList as List } from 'react-window'

interface VirtualizedListProps {
  items: any[]
  itemHeight: number
  height: number
  renderItem: (props: any) => React.ReactElement
}

function VirtualizedList({ items, itemHeight, height, renderItem }: VirtualizedListProps) {
  const Row = ({ index, style }: { index: number, style: React.CSSProperties }) => (
    <div style={style}>
      {renderItem({ item: items[index], index })}
    </div>
  )
  
  return (
    <List
      height={height}
      itemCount={items.length}
      itemSize={itemHeight}
    >
      {Row}
    </List>
  )
}
```

## Usage Examples

### Creating a Search Component
```markdown
Create a business search component with the following requirements:
- Search form with industry, city, state inputs
- Google Places API integration at /api/places/search
- Results table with selection checkboxes
- Save selected companies to Supabase
- Export results to CSV
- Loading states and error handling
- Responsive design for mobile

Use the search component template and include proper TypeScript types.
```

### Creating a Dashboard
```markdown
Create a dashboard layout with:
- Collapsible sidebar navigation
- User profile header with dropdown
- Main content area with breadcrumbs
- Role-based navigation (USER/ADMIN)
- Mobile responsive design
- Integration with Supabase Auth

Follow the dashboard layout template pattern.
```