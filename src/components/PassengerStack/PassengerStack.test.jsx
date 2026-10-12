import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, jest } from '@jest/globals'
import PassengerStack from './PassengerStack'

const person = (id, name, extra = {}) => ({
  id,
  name,
  image: null,
  initials: name
    .split(' ')
    .map((part) => part[0])
    .join(''),
  office: null,
  role: null,
  ...extra,
})

const AMA = person('u1', 'Ama Owusu', {
  image: 'https://img/ama.png',
  office: 'ACCRA',
  role: 'Software Engineer',
})
const KOFI = person('u2', 'Kofi Boateng')
const SIX = [
  AMA,
  KOFI,
  person('u3', 'Esi Mensah'),
  person('u4', 'Yaw Darko'),
  person('u5', 'Akua Asante', { office: 'KUMASI' }),
  person('u6', 'Kwame Nkrumah'),
]

function renderStack(passengers = [AMA, KOFI], props = {}) {
  render(
    <>
      <PassengerStack passengers={passengers} {...props} />
      <button type="button">Elsewhere</button>
    </>,
  )
}

describe('PassengerStack', () => {
  afterEach(() => {
    jest.useRealTimers()
  })

  it('renders nothing when nobody has been accepted', () => {
    const { container } = render(<PassengerStack passengers={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  it("shows each passenger's picture, or their initials", () => {
    renderStack()

    const list = screen.getByRole('list', {
      name: 'Already on this ride: Ama and Kofi are riding',
    })
    const [ama, kofi] = within(list).getAllByRole('button')
    expect(ama).toHaveAccessibleName('Ama Owusu')
    expect(ama.querySelector('img')).toHaveAttribute(
      'src',
      'https://img/ama.png',
    )
    expect(kofi).toHaveTextContent('KB')
    expect(screen.getByText('2 riding')).toBeInTheDocument()
  })

  it('caps the row and counts the rest', () => {
    renderStack(SIX)

    expect(
      screen.getAllByRole('button', { name: /^(?!Elsewhere)/ }),
    ).toHaveLength(5)
    expect(
      screen.getByRole('button', { name: '2 more passengers' }),
    ).toHaveTextContent('+2')
  })

  // Real mouse hovers, on fake timers so the open and close delays can be
  // stepped through.
  const hoverUser = () => {
    jest.useFakeTimers()
    return userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
  }
  const wait = (ms) => act(() => jest.advanceTimersByTime(ms))

  it('opens a profile card on hover after a short pause', async () => {
    const user = hoverUser()
    renderStack()

    await user.hover(screen.getByRole('button', { name: 'Ama Owusu' }))
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    await wait(150)
    const card = screen.getByRole('tooltip')
    expect(card).toHaveTextContent('Ama Owusu')
    expect(card).toHaveTextContent('Software Engineer')
    expect(card).toHaveTextContent('Accra office')
    expect(card).toHaveTextContent('Confirmed passenger')
    expect(card.querySelector('img')).toHaveAttribute(
      'src',
      'https://img/ama.png',
    )
    expect(
      screen.getByRole('button', { name: 'Ama Owusu' }),
    ).toHaveAccessibleDescription(/Ama Owusu/)
  })

  it('ignores a pointer that just passes over', async () => {
    const user = hoverUser()
    renderStack()

    await user.hover(screen.getByRole('button', { name: 'Ama Owusu' }))
    await wait(50)
    await user.hover(screen.getByRole('button', { name: 'Elsewhere' }))
    await wait(500)

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('switches straight to the next person while a card is open', async () => {
    const user = hoverUser()
    renderStack()

    await user.hover(screen.getByRole('button', { name: 'Ama Owusu' }))
    await wait(150)
    await user.hover(screen.getByRole('button', { name: 'Kofi Boateng' }))

    expect(screen.getByRole('tooltip')).toHaveTextContent('Kofi Boateng')
    // No office or role sent: those lines are left out, not shown empty.
    expect(screen.getByRole('tooltip')).not.toHaveTextContent('office')
  })

  it('stays open while the pointer moves into the card, and closes after leaving', async () => {
    const user = hoverUser()
    renderStack()

    await user.hover(screen.getByRole('button', { name: 'Ama Owusu' }))
    await wait(150)
    await user.hover(screen.getByRole('tooltip'))
    await wait(500)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Ama Owusu')

    await user.hover(screen.getByRole('button', { name: 'Elsewhere' }))
    await wait(200)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('opens again on a fresh hover after being closed with Escape', async () => {
    const user = hoverUser()
    renderStack()
    const ama = screen.getByRole('button', { name: 'Ama Owusu' })

    await user.hover(ama)
    await wait(150)
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    await user.hover(screen.getByRole('button', { name: 'Elsewhere' }))
    await wait(200)
    await user.hover(ama)
    await wait(150)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Ama Owusu')
  })

  it('opens on keyboard focus and closes with Escape, keeping focus', async () => {
    const user = userEvent.setup()
    renderStack()

    await user.tab()
    expect(screen.getByRole('tooltip')).toHaveTextContent('Ama Owusu')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ama Owusu' })).toHaveFocus()
  })

  it('closes when focus leaves the row', async () => {
    const user = userEvent.setup()
    renderStack()

    await user.tab()
    await user.tab()
    expect(screen.getByRole('tooltip')).toHaveTextContent('Kofi Boateng')

    await user.tab()
    expect(screen.getByRole('button', { name: 'Elsewhere' })).toHaveFocus()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('toggles on tap, and closes on a tap elsewhere', async () => {
    const user = userEvent.setup()
    renderStack()
    const ama = screen.getByRole('button', { name: 'Ama Owusu' })

    await user.click(ama)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Ama Owusu')
    await user.click(ama)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    await user.click(ama)
    await user.click(screen.getByRole('button', { name: 'Elsewhere' }))
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('lists everyone hidden behind the +N bubble', async () => {
    const user = userEvent.setup()
    renderStack(SIX)

    await user.click(screen.getByRole('button', { name: '2 more passengers' }))

    const card = screen.getByRole('tooltip')
    expect(card).toHaveTextContent('Also on this ride')
    expect(card).toHaveTextContent('Akua Asante')
    expect(card).toHaveTextContent('Kumasi office')
    expect(card).toHaveTextContent('Kwame Nkrumah')
    expect(card).not.toHaveTextContent('Ama Owusu')
  })

  it('aims the card arrow at the avatar that opened it', async () => {
    const user = userEvent.setup()
    renderStack(SIX)

    await user.click(screen.getByRole('button', { name: 'Kofi Boateng' }))
    // Second avatar: one 22px step in, plus half of a 32px avatar.
    expect(
      screen
        .getByRole('tooltip')
        .style.getPropertyValue('--passenger-card-arrow'),
    ).toBe('38px')
  })

  it('names a single extra passenger in the singular', () => {
    renderStack(SIX.slice(0, 5))
    expect(
      screen.getByRole('button', { name: '1 more passenger' }),
    ).toBeInTheDocument()
  })
})
