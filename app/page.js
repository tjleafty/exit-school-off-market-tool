export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">
          Exit School Off-Market Tool
        </h1>
        
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-semibold mb-4">
            B2B Intelligence Platform
          </h2>
          <p className="text-gray-600 mb-6">
            Single-tenant platform with admin-gated onboarding, company discovery, 
            multi-source enrichment, AI reports, and email automation.
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Features</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Company Discovery & Intelligence</li>
                <li>• Multi-source Data Enrichment</li>
                <li>• AI-Generated Reports</li>
                <li>• Email Automation</li>
                <li>• Admin-gated Onboarding</li>
              </ul>
            </div>
            
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Tech Stack</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Next.js 14 (App Router)</li>
                <li>• Supabase (Auth, DB, Storage)</li>
                <li>• Tailwind CSS + shadcn/ui</li>
                <li>• TanStack Query</li>
                <li>• OpenAI GPT-4</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}