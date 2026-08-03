import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { NavLink } from 'react-router-dom'

import GlobalSearch from './GlobalSearch'

const navigation = [
  { label: 'Home', path: '/' },
  { label: 'Players', path: '/players' },
  { label: 'Rankings', path: '/players/rankings' },
  { label: 'Teams', path: '/teams' },
  { label: 'Fixtures', path: '/fixtures' },
  { label: 'Table', path: '/table' },
]

function getNavClass({ isActive }) {
  return [
    'rounded-md px-3 py-2 text-sm font-semibold transition-colors',
    isActive
      ? 'bg-accent-soft text-accent'
      : 'text-muted hover:bg-surface-hover hover:text-white',
  ].join(' ')
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-base/95 backdrop-blur">
      <div className="mx-auto flex min-h-16 max-w-[1440px] items-center gap-6 px-5">
        <NavLink
          to="/"
          className="font-display text-2xl font-extrabold tracking-tight text-white"
          onClick={() => setMenuOpen(false)}
        >
          PL<span className="text-accent">STATS</span>
        </NavLink>

        <nav className="hidden items-center gap-1 md:flex">
          {navigation.map((item) => (
            <NavLink
  key={item.path}
  to={item.path}
  end
  className={getNavClass}
>
  {item.label}
</NavLink>
          ))}
        </nav>

        <div className="ml-auto hidden items-center md:flex">
          <GlobalSearch />
        </div>

        <button
          type="button"
          className="secondary-button ml-auto h-10 w-10 px-0 md:hidden"
          onClick={() => setMenuOpen((current) => !current)}
          aria-label={
            menuOpen
              ? 'Close navigation menu'
              : 'Open navigation menu'
          }
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-border bg-base px-4 py-4 md:hidden">
          <div className="mb-4 flex justify-center">
            <GlobalSearch />
          </div>

          <nav className="flex flex-col gap-1">
            {navigation.map((item) => (
              <NavLink
  key={item.path}
  to={item.path}
  end
  className={getNavClass}
  onClick={() => setMenuOpen(false)}
>
  {item.label}
</NavLink>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}