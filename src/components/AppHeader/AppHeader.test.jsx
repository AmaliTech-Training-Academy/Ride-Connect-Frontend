import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, jest } from '@jest/globals'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import AppHeader from './AppHeader'

function CurrentPath() {
  return <p data-testid="path">{useLocation().pathname}</p>
}

function renderHeader(path = '/find-a-ride', props = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppHeader userInitials="AO" onLogout={jest.fn()} {...props} />
      <Routes>
        <Route path="*" element={<CurrentPath />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('AppHeader', () => {
  it.each([
    ['/find-a-ride', 'Find a Ride'],
    ['/my-rides', 'My Rides'],
  ])('marks the tab for %s as the current page', (path, label) => {
    renderHeader(path)

    expect(screen.getByRole('button', { name: label })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  it.each([
    ['Find a Ride', '/find-a-ride'],
    ['My Rides', '/my-rides'],
    ['Offer a Ride', '/offer-a-ride'],
  ])('navigates to %s', async (label, path) => {
    const user = userEvent.setup()
    renderHeader('/some-other-page')

    await user.click(screen.getByRole('button', { name: label }))

    expect(screen.getByTestId('path')).toHaveTextContent(path)
  })

  it('goes home from the brand', async () => {
    const user = userEvent.setup()
    renderHeader('/my-rides')

    await user.click(screen.getByRole('button', { name: /RideConnect/ }))

    expect(screen.getByTestId('path')).toHaveTextContent('/find-a-ride')
  })

  it('shows the viewer initials and logs out from the account menu', async () => {
    const user = userEvent.setup()
    const onLogout = jest.fn()
    renderHeader('/find-a-ride', { onLogout })

    expect(screen.getByText('AO')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Account menu' }))
    await user.click(screen.getByRole('menuitem', { name: /logout/i }))

    expect(onLogout).toHaveBeenCalled()
  })
})
