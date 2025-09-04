# Iterative Refinement Prompt Template

The [component/feature] works but needs:
- [specific improvement 1]
- [specific improvement 2]  
- [specific improvement 3]

## Current code: 
[paste code]

## Improve with these specific changes.

## Example Usage:
```
The CompanyCard component works but needs:
- Better error messages for failed enrichment
- Loading skeleton while data is being fetched
- Optimistic updates when enrichment starts
- Keyboard navigation support
- Better visual feedback for different company statuses

Current code:
export function CompanyCard({ company }: { company: Company }) {
  const [isEnriching, setIsEnriching] = useState(false)
  
  const handleEnrich = async () => {
    setIsEnriching(true)
    try {
      await enrichCompany(company.id)
    } catch (error) {
      console.error(error)
    } finally {
      setIsEnriching(false)
    }
  }

  return (
    <Card className="p-4">
      <h3>{company.name}</h3>
      <p>{company.industry}</p>
      <Button onClick={handleEnrich} disabled={isEnriching}>
        {isEnriching ? 'Enriching...' : 'Enrich'}
      </Button>
    </Card>
  )
}

Improve with these specific changes.
```