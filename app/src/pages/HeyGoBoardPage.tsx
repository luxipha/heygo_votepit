import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Plus,
  Search,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AuthorBadge } from '../components/AuthorBadge'
import { HeyGoHeader } from '../components/HeyGoHeader'
import { MarkdownLite } from '../components/MarkdownLite'
import { NewIdeaSheet } from '../components/NewIdeaSheet'
import { createPublicProfileCache } from '../hooks/usePublicProfile'
import { accountPath, getAccountSlug } from '../lib/accountContext'
import type { BoardResponse, Idea, IdeaDetailResponse, User } from '../lib/api'
import {
  accountRoleFor,
  bootstrap,
  createComment,
  getBoard,
  getDefaultBoardSlug,
  getIdea,
  vote,
} from '../lib/api'
import { phaseBlocked } from '../lib/boardPhases'
import { statusAllows } from '../lib/boardStatuses'
import './heygo-board.css'

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

function Status({
  idea,
  board,
}: {
  idea: Idea
  board: BoardResponse['board'] | IdeaDetailResponse['board']
}) {
  const status = board.statuses?.find((item) => item.key === (idea.status_key ?? idea.status))
  const label = status?.label_en || idea.status.replaceAll('_', ' ')
  return <span className={`hg-status hg-status--${idea.status}`}>{label}</span>
}

function Discussion({
  slug,
  id,
  user,
  onClose,
}: {
  slug: string
  id: number
  user: User | null
  onClose: () => void
}) {
  const [data, setData] = useState<IdeaDetailResponse | null>(null)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [reload, setReload] = useState(0)
  const cache = useRef(createPublicProfileCache())
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    heading.current?.focus()
  }, [])
  useEffect(() => {
    void reload
    let current = true
    getIdea(slug, id)
      .then((value) => {
        if (current) {
          setData(value)
          setError('')
        }
      })
      .catch((cause) => {
        if (current) setError(errorMessage(cause))
      })
    return () => {
      current = false
    }
  }, [slug, id, reload])
  async function post(event: React.FormEvent) {
    event.preventDefault()
    if (!draft.trim() || busy || !data) return
    setBusy(true)
    setError('')
    try {
      await createComment(slug, id, draft.trim())
      setDraft('')
      setReload((value) => value + 1)
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setBusy(false)
    }
  }
  const author = (authorId: number) => (
    <AuthorBadge
      boardSlug={slug}
      authorId={authorId}
      currentUserId={user?.id ?? null}
      myAvatarUrl={user?.avatar_url ?? null}
      currentUserRole={accountRoleFor(user, getAccountSlug())}
      currentUserIsOperator={user?.is_operator ?? false}
      cache={cache.current}
    />
  )
  return (
    <aside
      className="hg-discussion"
      aria-label="Proposal discussion"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <header>
        <h2 tabIndex={-1} ref={heading}>
          Discussion
        </h2>
        <button type="button" className="hg-icon" aria-label="Close discussion" onClick={onClose}>
          <X size={22} />
        </button>
      </header>
      {error && (
        <p role="alert" className="hg-error">
          {error}{' '}
          <button type="button" onClick={() => setReload((value) => value + 1)}>
            Retry
          </button>
        </p>
      )}
      {!data ? (
        <p role="status">Loading discussion…</p>
      ) : (
        <>
          <div className="hg-discussion-intro">
            <Status idea={data.idea} board={data.board} />
            <h3>{data.idea.title}</h3>
            {author(data.idea.author_id)}
            <div className="hg-prose">
              <MarkdownLite text={data.idea.body} />
            </div>
            <Link className="hg-text-link" to={accountPath(`/${slug}/idea/${id}`)}>
              Open full proposal
            </Link>
          </div>
          <p className="hg-muted">{data.comments.length} comments</p>
          <ol className="hg-comments">
            {data.comments.map((comment) => (
              <li key={comment.id}>
                {author(comment.author_id)}
                <div className="hg-prose">
                  <MarkdownLite text={comment.body} />
                </div>
              </li>
            ))}
          </ol>
          {data.comments.length === 0 && (
            <p className="hg-muted">Start the conversation with a helpful comment.</p>
          )}
          {data.is_authenticated && user ? (
            statusAllows(
              data.board.statuses,
              data.idea.status_key ?? data.idea.status,
              'comments',
            ) && !data.idea.merged_into_id ? (
              <form onSubmit={post} className="hg-comment-form">
                <label htmlFor="hg-comment">Add your thoughts</label>
                <textarea
                  id="hg-comment"
                  placeholder="What would make this better?"
                  maxLength={2000}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  disabled={busy}
                  required
                />
                <button type="submit" className="hg-primary" disabled={busy || !draft.trim()}>
                  {busy ? 'Posting…' : 'Post comment'}
                </button>
              </form>
            ) : (
              <p className="hg-muted">Comments are closed for this proposal.</p>
            )
          ) : (
            <Link
              className="hg-primary"
              aria-label="Submit an idea"
              to={`/login?r=${encodeURIComponent(accountPath(`/${slug}?idea=${id}`))}`}
            >
              Sign in to join the discussion
            </Link>
          )}
        </>
      )}
    </aside>
  )
}

export default function HeyGoBoardPage() {
  const { boardSlug } = useParams<{ boardSlug: string }>()
  const [params, setParams] = useSearchParams()
  const [slug, setSlug] = useState(boardSlug ?? '')
  const [data, setData] = useState<BoardResponse | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState(params.get('q') ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [pendingVote, setPendingVote] = useState<number | null>(null)
  const [reload, setReload] = useState(0)
  const cache = useRef(createPublicProfileCache())
  const sort = params.get('sort') ?? 'top'
  const tagId = params.get('tag_id') ? Number(params.get('tag_id')) : undefined
  const page = Math.max(1, Number(params.get('page')) || 1)
  const selected = Number(params.get('idea')) || null
  const search = params.get('q') ?? ''
  const status = params.get('status') ?? undefined
  const generation = useRef(0)
  const navigate = useNavigate()
  useEffect(() => {
    let active = true
    const invalidRoute = boardSlug === '[object Object]'
    setSlug(invalidRoute ? '' : (boardSlug ?? ''))
    setData(null)
    if (!boardSlug || invalidRoute)
      getDefaultBoardSlug()
        .then((value) => {
          if (active) {
            if (invalidRoute) navigate(accountPath(`/${value.slug}`), { replace: true })
            else setSlug(value.slug)
          }
        })
        .catch((cause) => {
          if (active) {
            setError(errorMessage(cause))
            setLoading(false)
          }
        })
    return () => {
      active = false
    }
  }, [boardSlug, navigate])
  useEffect(() => {
    void reload
    let active = true
    bootstrap()
      .then((value) => {
        if (active) {
          setUser(value.user)
          setAuthReady(true)
        }
      })
      .catch((cause) => {
        if (active) setError(errorMessage(cause))
      })
    return () => {
      active = false
    }
  }, [reload])
  useEffect(() => {
    if (typeof slug !== 'string' || !slug || slug === '[object Object]') return
    void reload
    const request = ++generation.current
    setLoading(true)
    setError('')
    getBoard(slug, { sort, tagId, page, q: search, status })
      .then((value) => {
        if (generation.current === request) {
          setData(value)
          setLoading(false)
        }
      })
      .catch((cause) => {
        if (generation.current === request) {
          setError(errorMessage(cause))
          setLoading(false)
        }
      })
    return () => {
      generation.current++
    }
  }, [slug, sort, tagId, page, search, status, reload])
  useEffect(() => {
    setQuery(search)
  }, [search])
  function filter(key: string, value?: string) {
    setParams((previous) => {
      const next = new URLSearchParams(previous)
      if (value) next.set(key, value)
      else next.delete(key)
      if (key !== 'page' && key !== 'idea') next.delete('page')
      return next
    })
  }
  async function cast(idea: Idea, direction: 'up' | 'down') {
    if (pendingVote !== null || !authReady || !data || loading) return
    if (!data.is_authenticated) {
      window.location.assign(
        `/login?r=${encodeURIComponent(accountPath(`/${slug}?idea=${idea.id}`))}`,
      )
      return
    }
    const request = generation.current
    setPendingVote(idea.id)
    setError('')
    try {
      const result = await vote(slug, idea.id, direction)
      if (generation.current === request)
        setData((previous) =>
          previous
            ? {
                ...previous,
                ideas: previous.ideas.map((item) =>
                  item.id === idea.id
                    ? {
                        ...item,
                        my_vote: result.my_vote,
                        score_cache: result.score,
                        up_count: result.up_count,
                        down_count: result.down_count,
                      }
                    : item,
                ),
              }
            : previous,
        )
    } catch (cause) {
      if (generation.current === request) setError(errorMessage(cause))
    } finally {
      setPendingVote(null)
    }
  }
  const boardHref = accountPath(`/${slug}`)
  return (
    <div
      data-theme="light"
      className={`hg-voice ${submitting || selected ? 'hg-voice--overlay' : ''}`}
    >
      <HeyGoHeader
        slug={slug}
        active={status === 'done' ? 'updates' : 'ideas'}
        user={user}
        ready={authReady}
      />
      <div className={`hg-workspace ${selected ? 'hg-workspace--discussion' : ''}`}>
        <main className="hg-main">
          <div className="hg-hero hg-hero--action">
            <div>
              <p className="hg-eyebrow">HEYGO VOICE</p>
              <h1>Your ideas. A better heyGo.</h1>
              <p>Ideas from riders and drivers. A better heyGo for everyone.</p>
            </div>
            <button
              type="button"
              className="hg-primary"
              onClick={() => setSubmitting(true)}
              disabled={
                !data || !authReady || loading || phaseBlocked(data.board.phases, 'submissions')
              }
            >
              <Plus size={21} />
              <span className="hg-submit-desktop">Submit an idea</span>
              <span className="hg-submit-mobile" aria-hidden="true">
                Idea
              </span>
            </button>
          </div>
          {error && (
            <p role="alert" className="hg-error">
              {error}{' '}
              <button type="button" onClick={() => setReload((value) => value + 1)}>
                Retry
              </button>
            </p>
          )}
          <div className="hg-board">
            <nav className="hg-categories" aria-label="Idea categories">
              <button
                type="button"
                aria-current={tagId === undefined ? 'page' : undefined}
                onClick={() => filter('tag_id')}
              >
                All ideas
              </button>
              {data?.tags?.map((tag) => (
                <button
                  type="button"
                  key={tag.id}
                  aria-current={tagId === tag.id ? 'page' : undefined}
                  onClick={() => filter('tag_id', String(tag.id))}
                >
                  <span>{tag.name}</span>
                  <span>{tag.count}</span>
                </button>
              ))}
            </nav>
            <section className="hg-feed" aria-label="Ideas">
              <form
                className="hg-search"
                onSubmit={(event) => {
                  event.preventDefault()
                  filter('q', query.trim())
                }}
              >
                <Search size={20} />
                <input
                  aria-label="Search ideas"
                  placeholder="Search ideas…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
                <button type="submit">Search</button>
              </form>
              <div className="hg-sorts" role="group" aria-label="Sort ideas">
                {[
                  ['top', 'Top'],
                  ['newest', 'Newest'],
                  ['controversial', 'Controversial'],
                ].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    aria-pressed={sort === value}
                    onClick={() => filter('sort', value)}
                  >
                    {label}
                  </button>
                ))}
                {status && (
                  <button type="button" onClick={() => filter('status')}>
                    Clear status filter <X size={14} />
                  </button>
                )}
              </div>
              {loading ? (
                <p role="status" className="hg-loading">
                  Loading ideas…
                </p>
              ) : (
                data && (
                  <>
                    <div className="hg-ideas">
                      {[...data.ideas]
                        .sort((a, b) =>
                          sort === 'top'
                            ? Number(b.is_pinned) - Number(a.is_pinned) ||
                              b.score_cache - a.score_cache
                            : 0,
                        )
                        .map((idea) => {
                          const locked =
                            pendingVote !== null ||
                            !authReady ||
                            phaseBlocked(data.board.phases, 'voting') ||
                            !statusAllows(
                              data.board.statuses,
                              idea.status_key ?? idea.status,
                              'votes',
                            )
                          return (
                            <article
                              key={idea.id}
                              className={`hg-idea ${selected === idea.id ? 'hg-idea--selected' : ''}`}
                            >
                              <Status idea={idea} board={data.board} />
                              <h2>
                                <button
                                  type="button"
                                  onClick={() => filter('idea', String(idea.id))}
                                >
                                  {idea.title}
                                </button>
                              </h2>
                              <p className="hg-excerpt">{idea.body}</p>
                              <div className="hg-author">
                                <AuthorBadge
                                  boardSlug={slug}
                                  authorId={idea.author_id}
                                  currentUserId={user?.id ?? null}
                                  myAvatarUrl={user?.avatar_url ?? null}
                                  currentUserRole={accountRoleFor(user, getAccountSlug())}
                                  currentUserIsOperator={user?.is_operator ?? false}
                                  cache={cache.current}
                                />
                              </div>
                              <div className="hg-idea-actions">
                                <button
                                  type="button"
                                  aria-label={`Support ${idea.title}`}
                                  aria-pressed={idea.my_vote === 'up'}
                                  disabled={locked}
                                  onClick={() => void cast(idea, 'up')}
                                  className="hg-vote hg-vote--up"
                                >
                                  <ArrowUp size={19} />
                                  Support <strong>{idea.up_count}</strong>
                                </button>
                                <button
                                  type="button"
                                  aria-label={`Vote against ${idea.title}`}
                                  aria-pressed={idea.my_vote === 'down'}
                                  disabled={locked}
                                  onClick={() => void cast(idea, 'down')}
                                  className="hg-vote"
                                >
                                  <ArrowDown size={19} />
                                  Against <strong>{idea.down_count}</strong>
                                </button>
                                <button
                                  type="button"
                                  className="hg-comment-link"
                                  onClick={() => filter('idea', String(idea.id))}
                                >
                                  <MessageSquare size={19} />
                                  {idea.comment_count} comments
                                </button>
                              </div>
                            </article>
                          )
                        })}
                    </div>
                    {data.ideas.length === 0 && (
                      <p className="hg-loading">
                        No ideas match these filters. Try another search or submit an idea.
                      </p>
                    )}
                    <footer className="hg-pagination">
                      <span>
                        Page {data.page} of {Math.max(1, data.total_pages)}
                      </span>
                      <button
                        type="button"
                        aria-label="Previous page"
                        disabled={data.page <= 1}
                        onClick={() => filter('page', String(page - 1))}
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        type="button"
                        aria-label="Next page"
                        disabled={data.page >= data.total_pages}
                        onClick={() => filter('page', String(page + 1))}
                      >
                        <ChevronRight size={20} />
                      </button>
                    </footer>
                  </>
                )
              )}
            </section>
          </div>
        </main>
        {selected && slug && (
          <Discussion
            key={`${slug}:${selected}:${user?.id ?? 'guest'}`}
            slug={slug}
            id={selected}
            user={user}
            onClose={() => filter('idea')}
          />
        )}
      </div>
      {slug && (
        <NewIdeaSheet
          open={submitting}
          onClose={() => setSubmitting(false)}
          boardSlug={slug}
          boardHref={boardHref}
          user={user}
        />
      )}
    </div>
  )
}
