/**
 * Claude Artifacts System for Component Development
 * Provides utilities and patterns for generating components with Claude
 */

import { z } from 'zod'

// Artifact request schema
export const ArtifactRequestSchema = z.object({
  type: z.enum(['component', 'api', 'schema', 'hook', 'utility']),
  name: z.string().min(1),
  description: z.string().min(10),
  requirements: z.array(z.string()).min(1),
  context: z.object({
    framework: z.string().default('Next.js 14'),
    ui_library: z.string().default('shadcn/ui'),
    database: z.string().default('Supabase'),
    language: z.string().default('TypeScript')
  }).optional(),
  dependencies: z.array(z.string()).optional(),
  examples: z.array(z.string()).optional()
})

export type ArtifactRequest = z.infer<typeof ArtifactRequestSchema>

// Component template schema
export const ComponentTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(['search', 'data-display', 'forms', 'navigation', 'analytics', 'communication']),
  description: z.string(),
  prompt_template: z.string(),
  requirements: z.array(z.string()),
  technical_notes: z.array(z.string()).optional(),
  example_usage: z.string().optional()
})

export type ComponentTemplate = z.infer<typeof ComponentTemplateSchema>

/**
 * Pre-defined component templates for common use cases
 */
export const COMPONENT_TEMPLATES: ComponentTemplate[] = [
  {
    id: 'search-component',
    name: 'Business Search Component',
    category: 'search',
    description: 'Google Places API integration with results table and export',
    prompt_template: `Create a business search component with Google Places API integration.

Requirements:
- {{requirements}}

Technical Context:
- Framework: {{framework}}
- Database: Supabase with tables 'searches', 'companies'
- API: Google Places API available at /api/places/search
- Authentication: Supabase Auth with user session management
- UI: shadcn/ui components with Tailwind CSS

Component Structure:
1. Search form with input validation
2. Results display with sorting and filtering  
3. Selection management with bulk actions
4. Export functionality with CSV generation
5. Loading and error states
6. Responsive layout

Create as a single TypeScript artifact with comprehensive functionality and proper error handling.`,
    requirements: [
      'Industry, city, and state inputs with validation',
      'Results table with selection checkboxes',
      'Save search functionality with Supabase persistence',
      'Export to CSV with proper formatting',
      'Loading states and error handling',
      'Responsive design with mobile support'
    ],
    technical_notes: [
      'Use Google Places Text Search API',
      'Implement rate limiting for API calls',
      'Cache results to minimize API usage',
      'Handle API errors gracefully'
    ]
  },
  {
    id: 'data-table',
    name: 'Advanced Data Table',
    category: 'data-display',
    description: 'Reusable data table with sorting, filtering, and export capabilities',
    prompt_template: `Create a reusable data table component with advanced features.

Requirements:
- {{requirements}}

Technical Specifications:
- TypeScript generics for type safety
- shadcn/ui table components as base
- TanStack Table for advanced functionality
- Virtualization for large datasets
- Customizable column definitions

Features:
1. Column sorting (asc/desc/none)
2. Global and column-specific filtering
3. Multi-row selection with checkboxes
4. Bulk actions toolbar
5. Pagination controls
6. Export options (CSV, JSON)
7. Responsive layout with horizontal scroll
8. Empty state illustrations

Create with comprehensive TypeScript types and proper error handling.`,
    requirements: [
      'Generic TypeScript implementation for any data type',
      'Column configuration with sorting, filtering, and custom renderers',
      'Pagination with configurable page sizes',
      'Search functionality across all columns',
      'Row selection with bulk actions',
      'Export functionality (CSV, JSON)',
      'Loading and empty states',
      'Responsive design with mobile optimization'
    ]
  },
  {
    id: 'report-generator',
    name: 'AI Report Generation System',
    category: 'analytics',
    description: 'OpenAI-powered report generation with multiple tiers',
    prompt_template: `Create a comprehensive report generation system with OpenAI integration.

Requirements:
- {{requirements}}

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

Provide complete implementation with professional styling and comprehensive error handling.`,
    requirements: [
      'Two-tier system: ENHANCED and BI reports',
      'Zod schema validation for all data structures',
      'OpenAI GPT-4 integration with prompt templates',
      'JSON schema validation and HTML rendering',
      'Template variable system with proper escaping',
      'Error handling and fallback report generation',
      'PDF generation setup (HTML to PDF)'
    ]
  },
  {
    id: 'dashboard-layout',
    name: 'Responsive Dashboard Layout',
    category: 'navigation',
    description: 'Complete dashboard layout with sidebar navigation',
    prompt_template: `Create a responsive dashboard layout with sidebar navigation.

Requirements:
- {{requirements}}

Technical Implementation:
- Next.js 14 App Router compatibility
- Supabase Auth integration
- Role-based navigation (USER/ADMIN routes)
- Mobile-first responsive design
- Accessibility compliance (ARIA labels, keyboard nav)

Components Structure:
1. Sidebar navigation with icons and labels
2. Header with user menu and global actions
3. Main content wrapper with proper spacing
4. Breadcrumb component with dynamic routes
5. Mobile menu overlay with animations
6. User profile dropdown
7. Notification system integration

Provide complete implementation with TypeScript, proper routing, and responsive behavior.`,
    requirements: [
      'Responsive sidebar with collapsible mobile menu',
      'Navigation with active states and role-based visibility',
      'Header with user profile, notifications, and search',
      'Main content area with proper spacing and containers',
      'Breadcrumb navigation system',
      'Loading states for async content',
      'Error boundaries for robust error handling'
    ]
  },
  {
    id: 'form-builder',
    name: 'Dynamic Form Builder',
    category: 'forms',
    description: 'Schema-driven form generation with validation',
    prompt_template: `Create a dynamic form builder with validation and submission handling.

Requirements:
- {{requirements}}

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

Create comprehensive form system with type-safe schema definitions and robust error handling.`,
    requirements: [
      'Schema-driven form generation from JSON configurations',
      'Comprehensive field types (text, email, phone, select, multi-select, date, etc.)',
      'Real-time validation with error display',
      'Conditional field visibility based on other field values',
      'File upload with progress and validation',
      'Form state management with auto-save drafts',
      'Accessibility compliance and keyboard navigation'
    ]
  },
  {
    id: 'email-campaign',
    name: 'Email Campaign Manager',
    category: 'communication',
    description: 'Complete email campaign management system',
    prompt_template: `Create an email campaign management system with template editor.

Requirements:
- {{requirements}}

Technical Implementation:
- React-based visual editor
- Block-based template system
- Variable injection with validation
- HTML/CSS generation optimized for email clients
- Template storage in Supabase
- Real-time preview with device simulation

Campaign Features:
1. Campaign creation wizard
2. Target audience selection with filtering
3. Email template editor with blocks
4. Variable substitution for personalization
5. Schedule and automation setup
6. A/B testing configuration
7. Performance analytics and reporting
8. Integration with email service (Resend)

Provide complete campaign management system with professional email templates.`,
    requirements: [
      'Campaign creation and management interface',
      'Email template editor with drag-and-drop blocks',
      'Target audience selection and segmentation',
      'Variable substitution system for personalization',
      'Scheduling and automation features',
      'Performance analytics and tracking',
      'A/B testing capabilities',
      'Integration with email sending service'
    ]
  }
]

/**
 * Generate a Claude prompt for component creation
 */
export function generateComponentPrompt(
  templateId: string,
  customRequirements?: string[],
  context?: ArtifactRequest['context']
): string {
  const template = COMPONENT_TEMPLATES.find(t => t.id === templateId)
  
  if (!template) {
    throw new Error(`Template not found: ${templateId}`)
  }

  const requirements = customRequirements || template.requirements
  const framework = context?.framework || 'Next.js 14'
  
  return template.prompt_template
    .replace('{{requirements}}', requirements.map(req => `- ${req}`).join('\n'))
    .replace('{{framework}}', framework)
}

/**
 * Create artifact request from template
 */
export function createArtifactRequest(
  templateId: string,
  options: {
    name?: string
    customRequirements?: string[]
    context?: ArtifactRequest['context']
    dependencies?: string[]
  } = {}
): ArtifactRequest {
  const template = COMPONENT_TEMPLATES.find(t => t.id === templateId)
  
  if (!template) {
    throw new Error(`Template not found: ${templateId}`)
  }

  return {
    type: 'component',
    name: options.name || template.name,
    description: template.description,
    requirements: options.customRequirements || template.requirements,
    context: options.context,
    dependencies: options.dependencies
  }
}

/**
 * Validate artifact request
 */
export function validateArtifactRequest(request: unknown): ArtifactRequest {
  return ArtifactRequestSchema.parse(request)
}

/**
 * Get available templates by category
 */
export function getTemplatesByCategory(category?: ComponentTemplate['category']): ComponentTemplate[] {
  if (!category) {
    return COMPONENT_TEMPLATES
  }
  
  return COMPONENT_TEMPLATES.filter(template => template.category === category)
}

/**
 * Search templates by name or description
 */
export function searchTemplates(query: string): ComponentTemplate[] {
  const lowercaseQuery = query.toLowerCase()
  
  return COMPONENT_TEMPLATES.filter(template =>
    template.name.toLowerCase().includes(lowercaseQuery) ||
    template.description.toLowerCase().includes(lowercaseQuery) ||
    template.requirements.some(req => req.toLowerCase().includes(lowercaseQuery))
  )
}

/**
 * Component development best practices
 */
export const DEVELOPMENT_BEST_PRACTICES = {
  typescript: [
    'Use strict TypeScript types for all props and state',
    'Define interfaces for all data structures',
    'Use generic types for reusable components',
    'Implement proper error boundaries'
  ],
  
  performance: [
    'Implement proper memoization with React.memo and useMemo',
    'Use virtual scrolling for large datasets',
    'Optimize bundle size with dynamic imports',
    'Implement proper loading states'
  ],
  
  accessibility: [
    'Follow WCAG 2.1 guidelines',
    'Implement proper ARIA labels',
    'Ensure keyboard navigation support',
    'Test with screen readers'
  ],
  
  testing: [
    'Write unit tests for all business logic',
    'Include integration tests for API interactions',
    'Test error scenarios and edge cases',
    'Implement visual regression tests'
  ],
  
  security: [
    'Validate all inputs with Zod schemas',
    'Sanitize user-generated content',
    'Implement proper authentication checks',
    'Follow OWASP security guidelines'
  ]
}

/**
 * Generate development checklist for component
 */
export function generateDevelopmentChecklist(
  componentType: ComponentTemplate['category']
): string[] {
  const baseChecklist = [
    '✅ TypeScript types and interfaces defined',
    '✅ Error handling implemented',
    '✅ Loading states added',
    '✅ Responsive design implemented',
    '✅ Accessibility compliance checked',
    '✅ Unit tests written',
    '✅ Integration tests added',
    '✅ Performance optimized',
    '✅ Security measures implemented'
  ]

  const categorySpecific: Record<ComponentTemplate['category'], string[]> = {
    'search': [
      '✅ API rate limiting implemented',
      '✅ Search results cached',
      '✅ Export functionality tested',
      '✅ Filter validation added'
    ],
    'data-display': [
      '✅ Virtual scrolling for large datasets',
      '✅ Column sorting and filtering',
      '✅ Export options implemented',
      '✅ Empty states designed'
    ],
    'forms': [
      '✅ Form validation with Zod',
      '✅ Auto-save functionality',
      '✅ File upload handling',
      '✅ Conditional field logic'
    ],
    'navigation': [
      '✅ Route-based active states',
      '✅ Mobile responsive menu',
      '✅ Keyboard navigation',
      '✅ Breadcrumb functionality'
    ],
    'analytics': [
      '✅ Data visualization implemented',
      '✅ Real-time updates',
      '✅ Export capabilities',
      '✅ Performance monitoring'
    ],
    'communication': [
      '✅ Email template validation',
      '✅ Variable substitution',
      '✅ Preview functionality',
      '✅ Delivery tracking'
    ]
  }

  return [...baseChecklist, ...(categorySpecific[componentType] || [])]
}