import { ArrowRight, MessageSquare } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { HeyGoHeader } from '../components/HeyGoHeader'
import { accountPath } from '../lib/accountContext'
import { bootstrap, getRoadmap, type RoadmapResponse, type User } from '../lib/api'
import './heygo-board.css'

export default function HeyGoRoadmapPage() {
  const { boardSlug = '' } = useParams<{ boardSlug: string }>()
  const [data, setData] = useState<RoadmapResponse | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    void retry
    let current = true
    setData(null)
    setError('')
    getRoadmap(boardSlug)
      .then((value) => {
        if (current) setData(value)
      })
      .catch((cause) => {
        if (current) setError(cause instanceof Error ? cause.message : 'Roadmap unavailable.')
      })
    bootstrap()
      .then((value) => {
        if (current) {
          setUser(value.user)
          setReady(true)
        }
      })
      .catch(() => {
        if (current) setReady(true)
      })
    return () => {
      current = false
    }
  }, [boardSlug, retry])
  return (
    <div className="hg-voice">
      <HeyGoHeader slug={boardSlug} active="roadmap" user={user} ready={ready} />
      <main className="hg-main hg-roadmap">
        <div className="hg-hero">
          <p className="hg-eyebrow">HEYGO VOICE · ROADMAP</p>
          <h1>Your feedback, moving forward.</h1>
          <p>Follow the ideas we’re planning, working on and delivering.</p>
          <Link className="hg-text-link" to={accountPath(`/${boardSlug}`)}>
            Explore and vote on ideas <ArrowRight size={16} />
          </Link>
        </div>
        {error && (
          <p role="alert" className="hg-error">
            {error}{' '}
            <button type="button" onClick={() => setRetry((value) => value + 1)}>
              Retry
            </button>
          </p>
        )}
        {!data && !error && <p role="status">Loading roadmap…</p>}
        {data && (
          <div className="hg-roadmap-columns">
            {(['planned', 'in_progress', 'done'] as const).map((key) => (
              <section key={key} aria-label={key.replaceAll('_', ' ')}>
                <header>
                  <span className={`hg-status hg-status--${key}`}>
                    {key === 'planned'
                      ? 'Planned'
                      : key === 'in_progress'
                        ? 'In progress'
                        : 'Completed'}
                  </span>
                  <span className="hg-muted">{data.groups[key].length} ideas</span>
                </header>
                {data.groups[key].length === 0 && (
                  <p className="hg-muted">No ideas in this stage yet.</p>
                )}
                {data.groups[key].map((idea) => (
                  <article className="hg-roadmap-idea" key={idea.id}>
                    <h2>
                      <Link to={accountPath(`/${boardSlug}?idea=${idea.id}`)}>{idea.title}</Link>
                    </h2>
                    <p className="hg-excerpt">{idea.body}</p>
                    <footer>
                      <span>
                        {idea.up_count} support · {idea.down_count} against
                      </span>
                      <Link
                        to={accountPath(`/${boardSlug}?idea=${idea.id}`)}
                        aria-label={`Discuss ${idea.title}`}
                      >
                        <MessageSquare size={16} />
                        {idea.comment_count}
                      </Link>
                    </footer>
                    {idea.target_date && <p className="hg-muted">Target: {idea.target_date}</p>}
                  </article>
                ))}
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
