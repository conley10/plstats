import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <main className="page-container flex min-h-[70vh] flex-col items-center justify-center text-center">
      <p className="section-label mb-4">Error 404</p>

      <h1 className="page-heading mb-4">
        Page not found
      </h1>

      <p className="mb-8 max-w-md text-muted">
        The page you are looking for does not exist or may have been moved.
      </p>

      <Link to="/" className="primary-button">
        Return home
      </Link>
    </main>
  )
}