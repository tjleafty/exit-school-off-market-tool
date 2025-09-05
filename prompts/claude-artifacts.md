# Claude-Optimized Component Development Prompts

## Search Component Template

```markdown
# Prompt for Claude:

Create a complete search component for Google Places API integration.

Requirements:
- Industry, city, and state inputs with validation
- Results table with selection checkboxes and bulk operations
- Save search functionality with Supabase persistence
- Export to CSV with proper formatting
- Loading states and error handling
- Responsive design with mobile support
- Rate limiting and API error handling

Technical Context:
- Database: Supabase with tables 'searches', 'companies' 
- API: Google Places API available at /api/places/search
- Authentication: Supabase Auth with user session management
- UI: shadcn/ui components with Tailwind CSS
- State: React hooks with proper error boundaries

Component Structure:
1. Search form with input validation
2. Results display with sorting and filtering
3. Selection management with bulk actions
4. Export functionality with CSV generation
5. Loading and error states
6. Responsive layout

Create as a single artifact with all required TypeScript code, proper error handling, and comprehensive functionality.
```

## Report Generation Template

```markdown
# Prompt for Claude:

Create a comprehensive report generation system with OpenAI integration.

Requirements:
1. Two-tier system: ENHANCED and BI reports
2. Zod schema validation for all data structures
3. OpenAI GPT-4 integration with prompt templates
4. JSON schema validation and HTML rendering
5. Template variable system with proper escaping
6. Error handling and fallback report generation
7. PDF generation setup (HTML to PDF)

Technical Implementation:
- TypeScript with strict type safety
- Zod schemas for validation
- OpenAI API integration with rate limiting
- Template system with variable substitution
- HTML generation with professional styling
- Error boundaries and fallback mechanisms

Components Needed:
- Report schema definitions (Zod)
- AI prompt templates for both tiers
- Report generator class with OpenAI integration
- HTML template engine with variable injection
- React component for report viewing
- PDF generation utilities

Provide complete implementation with:
- Full TypeScript types and interfaces
- Zod validation schemas
- OpenAI prompt templates
- Report generation functions
- HTML rendering with professional styling
- React viewing component with tabs and sections
```

## Data Table Component Template

```markdown
# Prompt for Claude:

Create a reusable data table component with advanced features.

Requirements:
- Generic TypeScript implementation for any data type
- Column configuration with sorting, filtering, and custom renderers
- Pagination with configurable page sizes
- Search functionality across all columns
- Row selection with bulk actions
- Export functionality (CSV, JSON)
- Loading and empty states
- Responsive design with mobile optimization

Technical Specifications:
- TypeScript generics for type safety
- shadcn/ui table components as base
- TanStack Table for advanced functionality
- Virtualization for large datasets
- Customizable column definitions
- Action buttons and context menus
- Keyboard navigation support

Features:
1. Column sorting (asc/desc/none)
2. Global and column-specific filtering
3. Multi-row selection with checkboxes
4. Bulk actions toolbar
5. Pagination controls
6. Export options
7. Responsive layout with horizontal scroll
8. Empty state illustrations

Create with comprehensive TypeScript types and proper error handling.
```

## Dashboard Layout Template

```markdown
# Prompt for Claude:

Create a responsive dashboard layout with sidebar navigation.

Requirements:
- Responsive sidebar with collapsible mobile menu
- Navigation with active states and role-based visibility
- Header with user profile, notifications, and search
- Main content area with proper spacing and containers
- Breadcrumb navigation system
- Loading states for async content
- Error boundaries for robust error handling

Technical Implementation:
- Next.js 14 App Router compatibility
- Supabase Auth integration
- Role-based navigation (USER/ADMIN routes)
- Mobile-first responsive design
- Accessibility compliance (ARIA labels, keyboard nav)
- Dark mode support (optional)

Components Structure:
1. Sidebar navigation with icons and labels
2. Header with user menu and global actions
3. Main content wrapper with proper spacing
4. Breadcrumb component with dynamic routes
5. Mobile menu overlay with animations
6. User profile dropdown
7. Notification system integration

Provide complete implementation with TypeScript, proper routing, and responsive behavior.
```

## Form Builder Template

```markdown
# Prompt for Claude:

Create a dynamic form builder with validation and submission handling.

Requirements:
- Schema-driven form generation from JSON configurations
- Comprehensive field types (text, email, phone, select, multi-select, date, etc.)
- Real-time validation with error display
- Conditional field visibility based on other field values
- File upload with progress and validation
- Form state management with auto-save drafts
- Accessibility compliance and keyboard navigation

Technical Stack:
- React Hook Form for form state management
- Zod for schema validation
- TypeScript for type safety
- shadcn/ui form components
- File upload with drag-and-drop support
- Integration with Supabase for data persistence

Form Features:
1. Dynamic field rendering from schema
2. Real-time validation with debouncing
3. Conditional logic for field visibility/requirements
4. File upload with preview and validation
5. Multi-step form support with progress indication
6. Auto-save functionality with local storage backup
7. Submission with loading states and error handling
8. Success/error feedback with proper messaging

Create comprehensive form system with type-safe schema definitions and robust error handling.
```

## Email Template Builder

```markdown
# Prompt for Claude:

Create an email template system with drag-and-drop editor capabilities.

Requirements:
- Visual email template editor with drag-and-drop blocks
- Pre-built template library for different use cases
- Variable substitution system for personalization
- HTML email generation with cross-client compatibility
- Preview functionality with different device sizes
- Template versioning and management
- Integration with email sending service (Resend)

Technical Implementation:
- React-based visual editor
- Block-based template system
- Variable injection with validation
- HTML/CSS generation optimized for email clients
- Template storage in Supabase
- Real-time preview with device simulation
- Export to HTML with inline CSS

Editor Features:
1. Drag-and-drop block editor (text, image, button, spacer)
2. Template library with categorized templates
3. Variable system with validation and preview
4. Device preview (desktop, tablet, mobile)
5. Template versioning and history
6. Collaboration features (comments, sharing)
7. A/B testing setup for template variants
8. Integration with campaign management

Provide complete email editor with professional templates and cross-client compatibility.
```

## API Integration Helper

```markdown
# Prompt for Claude:

Create a comprehensive API integration helper system.

Requirements:
- Generic API client with request/response interceptors
- Automatic retry logic with exponential backoff
- Rate limiting and quota management
- Error handling with typed error responses
- Request caching with configurable TTL
- TypeScript integration with generated types
- Logging and monitoring integration

Technical Features:
- Axios-based HTTP client with interceptors
- TypeScript generics for type-safe requests
- Automatic token refresh for authentication
- Request deduplication for identical calls
- Circuit breaker pattern for failing services
- Comprehensive error typing and handling

API Features:
1. Automatic authentication header injection
2. Request/response logging with sanitization
3. Retry logic with configurable strategies
4. Rate limiting with queue management
5. Response caching with invalidation
6. Error boundary integration
7. Loading state management
8. Optimistic updates support

Create robust API layer with proper error handling, caching, and monitoring capabilities.
```

## Usage Instructions

### For Claude Artifacts:
1. Copy the relevant prompt template
2. Customize requirements based on specific needs
3. Provide additional context about existing codebase
4. Request complete implementation in single artifact
5. Specify any additional technical constraints

### For Component Development:
1. Always include TypeScript types and interfaces
2. Implement proper error boundaries and loading states
3. Follow accessibility best practices
4. Use consistent styling with design system
5. Include comprehensive testing considerations

### For API Integration:
1. Validate all inputs with Zod schemas
2. Implement proper error handling for all scenarios
3. Include rate limiting and retry logic
4. Log important events for debugging
5. Follow security best practices for data handling

## Best Practices

### Code Quality:
- Use TypeScript strict mode
- Implement comprehensive error handling
- Follow SOLID principles
- Write self-documenting code
- Include proper logging and monitoring

### Performance:
- Implement virtualization for large datasets
- Use proper memoization for expensive calculations
- Optimize bundle size with code splitting
- Implement proper caching strategies
- Monitor and optimize Core Web Vitals

### Security:
- Validate all inputs on client and server
- Implement proper authentication checks
- Sanitize all user-generated content
- Follow OWASP security guidelines
- Regular security audits and updates

### Accessibility:
- Follow WCAG 2.1 guidelines
- Implement proper ARIA labels
- Ensure keyboard navigation
- Test with screen readers
- Provide proper focus management

### Testing:
- Unit tests for all business logic
- Integration tests for API endpoints
- End-to-end tests for critical user flows
- Performance testing for large datasets
- Security testing for authentication flows