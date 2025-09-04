export default function PublicLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto">
        {children}
      </div>
    </div>
  )
}