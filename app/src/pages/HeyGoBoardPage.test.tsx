import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, expect, it, vi } from 'vitest'
import * as api from '../lib/api'
import HeyGoBoardPage from './HeyGoBoardPage'

vi.mock('../lib/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../lib/api')>()),
  bootstrap: vi.fn(),
  getBoard: vi.fn(),
  getDefaultBoardSlug: vi.fn(),
  getIdea: vi.fn(),
  vote: vi.fn(),
  createComment: vi.fn(),
}))
vi.mock('../components/AuthorBadge', () => ({ AuthorBadge: () => <span>Member</span> }))
vi.mock('../components/NewIdeaSheet', () => ({
  NewIdeaSheet: ({ open }: { open: boolean }) =>
    open ? <div role="dialog">Submit a new idea</div> : null,
}))

const idea = {
  id: 1,
  board_id: 1,
  author_id: 1,
  title: 'Clearer pickup points',
  body: 'Explain where to meet.',
  status: 'open',
  score_cache: 4,
  up_count: 5,
  down_count: 1,
  comment_count: 1,
  is_pinned: false,
}
const board = {
  id: 1,
  slug: 'drivers',
  name: 'Driver ideas',
  statuses: [{ key: 'open', allow_votes: true, allow_comments: true }],
}
function mount(path = '/drivers') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/:boardSlug" element={<HeyGoBoardPage />} />
      </Routes>
    </MemoryRouter>,
  )
}
beforeEach(() => {
  vi.resetAllMocks()
  vi.mocked(api.bootstrap).mockResolvedValue({
    user: { id: 1, username: 'Driver', memberships: [] },
  } as unknown as Awaited<ReturnType<typeof api.bootstrap>>)
  vi.mocked(api.getBoard).mockResolvedValue({
    board,
    ideas: [idea],
    tags: [],
    page: 1,
    total_pages: 1,
    is_authenticated: true,
  } as unknown as api.BoardResponse)
  vi.mocked(api.getIdea).mockResolvedValue({
    board,
    idea,
    comments: [{ id: 1, author_id: 2, body: 'A landmark would help.' }],
    is_authenticated: true,
  } as unknown as api.IdeaDetailResponse)
})
it('opens a real discussion and returns to the voting board', async () => {
  mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Clearer pickup points' }))
  expect(await screen.findByText('A landmark would help.')).toBeInTheDocument()
  expect(api.getIdea).toHaveBeenCalledWith('drivers', 1)
  fireEvent.click(screen.getByRole('button', { name: 'Close discussion' }))
  expect(screen.queryByRole('complementary')).not.toBeInTheDocument()
})
it('recovers a stale object-shaped board URL without requesting it', async () => {
  vi.mocked(api.getDefaultBoardSlug).mockResolvedValue({ slug: 'drivers' })
  mount('/%5Bobject%20Object%5D')
  await screen.findByRole('button', { name: 'Clearer pickup points' })
  expect(api.getDefaultBoardSlug).toHaveBeenCalled()
  expect(vi.mocked(api.getBoard).mock.calls.every(([slug]) => slug === 'drivers')).toBe(true)
})
it('opens comments without opening the idea submission form', async () => {
  mount()
  fireEvent.click(await screen.findByRole('button', { name: '1 comments' }))
  expect(await screen.findByRole('textbox', { name: 'Add your thoughts' })).toBeInTheDocument()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
it('prevents duplicate in-flight votes and uses server totals', async () => {
  let finish!: (value: Awaited<ReturnType<typeof api.vote>>) => void
  vi.mocked(api.vote).mockImplementation(
    () =>
      new Promise((resolve) => {
        finish = resolve
      }),
  )
  mount()
  const support = await screen.findByRole('button', { name: 'Support Clearer pickup points' })
  fireEvent.click(support)
  fireEvent.click(support)
  expect(api.vote).toHaveBeenCalledTimes(1)
  finish({ score: 5, my_vote: 'up', up_count: 6, down_count: 1 })
  await waitFor(() => expect(support).toHaveAttribute('aria-pressed', 'true'))
  expect(support).toHaveTextContent('6')
})
it('keeps a comment draft when the server rejects it', async () => {
  vi.mocked(api.createComment).mockRejectedValue(new Error('Comments are temporarily unavailable.'))
  mount()
  fireEvent.click(await screen.findByRole('button', { name: 'Clearer pickup points' }))
  const input = await screen.findByRole('textbox', { name: 'Add your thoughts' })
  fireEvent.change(input, { target: { value: 'Please add a landmark.' } })
  fireEvent.click(screen.getByRole('button', { name: 'Post comment' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Comments are temporarily unavailable.',
  )
  expect(input).toHaveValue('Please add a landmark.')
})
