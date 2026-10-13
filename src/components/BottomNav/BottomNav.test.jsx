import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from '@jest/globals'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import BottomNav from './BottomNav'

function CurrentPath() {
  return <p data-testid="path">{useLocation().pathname}</p>
}

function renderBar(path = '/find-a-ride', props = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BottomNav {...props} />
      <Routes>
        <Route path="*" element={<CurrentPath />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BottomNav', () => {
  it('offers the three destinations', () => {
    renderBar()

    expect(
      screen.getAllByRole('button').map((button) => button.textContent),
    ).toEqual(['Find', 'My Rides', 'Offer'])
  })

  it.each([
    ['Find', '/find-a-ride'],
    ['My Rides', '/my-rides'],
    ['Offer', '/offer-a-ride'],
  ])('navigates to %s', async (label, path) => {
    const user = userEvent.setup()
    renderBar('/somewhere-else')

    await user.click(screen.getByRole('button', { name: label }))

    expect(screen.getByTestId('path')).toHaveTextContent(path)
  })

  it.each([
    ['/find-a-ride', 'Find'],
    ['/my-rides', 'My Rides'],
    ['/offer-a-ride', 'Offer'],
  ])('marks the tab for %s as the current page', (path, label) => {
    renderBar(path)

    expect(screen.getByRole('button', { name: label })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it('marks nothing current on a page it does not own', () => {
    renderBar('/somewhere-else')

    screen.getAllByRole('button').forEach((button) => {
      expect(button).not.toHaveAttribute('aria-current')
    })
  })

  it('places the account control given to it beside the destinations', () => {
    renderBar('/find-a-ride', {
      profile: <button type="button">Profile</button>,
    })

    expect(
      screen.getAllByRole('button').map((button) => button.textContent),
    ).toEqual(['Find', 'My Rides', 'Offer', 'Profile'])
  })
})
