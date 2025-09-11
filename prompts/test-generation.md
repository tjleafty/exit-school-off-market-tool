# Test Generation Prompt Template

Generate tests for [component/function].

## Current implementation: 
[paste code]

## Create:
- Unit tests with Jest/Vitest
- Integration tests with MSW (Mock Service Worker)
- E2E tests with Playwright (if applicable)

## Test Requirements:
- Cover happy path and error cases
- Mock Supabase interactions
- Test accessibility
- Test loading states
- Test user interactions

## Example Usage:
```
Generate tests for CompanyCard component.

Current implementation:
export function CompanyCard({ company, onEnrich }: CompanyCardProps) {
  const [isEnriching, setIsEnriching] = useState(false)
  
  const handleEnrich = async () => {
    setIsEnriching(true)
    try {
      await onEnrich(company.id)
      toast.success('Company enriched successfully')
    } catch (error) {
      toast.error('Failed to enrich company')
    } finally {
      setIsEnriching(false)
    }
  }

  return (
    <Card className="p-4">
      <h3>{company.name}</h3>
      <p>{company.industry}</p>
      <Button onClick={handleEnrich} disabled={isEnriching}>
        {isEnriching ? 'Enriching...' : 'Enrich Data'}
      </Button>
    </Card>
  )
}

Create:
- Unit tests for component rendering and interactions
- Tests for loading states and error handling
- Accessibility tests for keyboard navigation
- Integration tests with mocked enrichment API
```