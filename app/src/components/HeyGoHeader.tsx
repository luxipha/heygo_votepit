import { Lightbulb, Map as MapIcon, Megaphone } from 'lucide-react'
import { Link } from 'react-router-dom'
import { accountPath, getAccountSlug } from '../lib/accountContext'
import { accountRoleFor, type User } from '../lib/api'

export function HeyGoHeader({
  slug,
  active,
  user,
  ready,
}: {
  slug: string
  active: 'ideas' | 'roadmap' | 'updates' | 'none'
  user: User | null
  ready: boolean
}) {
  const safeSlug = typeof slug === 'string' && slug !== '[object Object]' ? slug : ''
  const home = accountPath(`/${safeSlug}`)
  return (
    <header className="hg-topbar">
      <Link to={home} className="hg-brand" aria-label="heyGo Voice">
        <img src="/heygo-logo.png" alt="heyGo — Fair rides." />
      </Link>
      <nav aria-label="Main navigation">
        <Link to={home} aria-current={active === 'ideas' ? 'page' : undefined}>
          <Lightbulb className="hg-mobile-nav-icon" size={21} aria-hidden="true" />
          <span>Ideas</span>
        </Link>
        <Link
          to={safeSlug ? accountPath(`/${safeSlug}/roadmap`) : accountPath('/')}
          aria-current={active === 'roadmap' ? 'page' : undefined}
        >
          <MapIcon className="hg-mobile-nav-icon" size={21} aria-hidden="true" />
          <span>Roadmap</span>
        </Link>
        <Link to={`${home}?status=done`} aria-current={active === 'updates' ? 'page' : undefined}>
          <Megaphone className="hg-mobile-nav-icon" size={21} aria-hidden="true" />
          <span>Updates</span>
        </Link>
      </nav>
      <div className="hg-account">
        {ready ? (
          user ? (
            <>
              <Link to={accountPath('/profile')}>{user.username || 'My profile'}</Link>
              {(user.is_admin ||
                ['owner', 'admin', 'moderator'].includes(
                  accountRoleFor(user, getAccountSlug()) ?? '',
                )) &&
                safeSlug && <Link to={accountPath(`/admin/boards/${safeSlug}`)}>Manage board</Link>}
            </>
          ) : (
            <Link to={`/login?r=${encodeURIComponent(home)}`}>Sign in</Link>
          )
        ) : (
          <span>Loading account…</span>
        )}
      </div>
    </header>
  )
}
