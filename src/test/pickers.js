import { screen, within } from '@testing-library/react'

const pad = (value) => String(value).padStart(2, '0')

/** Local `YYYY-MM-DD` for a day `daysAhead` from today. */
export function futureISODate(daysAhead) {
  const date = new Date()
  date.setDate(date.getDate() + daysAhead)
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** The accessible name each calendar day carries, e.g. "Friday, October 2, 2026". */
export function longDateLabel(iso) {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Opens the date field's calendar and picks `iso`, paging months as needed. */
export async function pickDate(user, iso, fieldLabel = 'Departure date') {
  await user.click(screen.getByLabelText(fieldLabel))
  const dialog = screen.getByRole('dialog', { name: 'Choose a date' })
  const name = longDateLabel(iso)

  for (let page = 0; page < 24; page += 1) {
    const day = within(dialog).queryByRole('button', { name })
    if (day) {
      await user.click(day)
      return
    }
    await user.click(within(dialog).getByRole('button', { name: 'Next month' }))
  }
  throw new Error(`No calendar day found for ${iso}`)
}

/** Opens the time field's popover, picks an "HH:MM" (24h) time, then Done. */
export async function pickTime(user, time, fieldLabel = 'Departure time') {
  const [hours, minutes] = time.split(':').map(Number)
  await user.click(screen.getByLabelText(fieldLabel))
  const dialog = screen.getByRole('dialog', { name: 'Choose a time' })
  const column = (name) => within(within(dialog).getByRole('group', { name }))

  await user.click(
    column('Hour').getByRole('button', { name: pad(hours % 12 || 12) }),
  )
  await user.click(column('Minute').getByRole('button', { name: pad(minutes) }))
  await user.click(
    column('AM or PM').getByRole('button', { name: hours >= 12 ? 'PM' : 'AM' }),
  )
  await user.click(within(dialog).getByRole('button', { name: 'Done' }))
}
