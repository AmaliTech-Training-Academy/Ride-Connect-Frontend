import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, jest } from '@jest/globals'
import DatePickerField from './DatePickerField'
import TimePickerField from './TimePickerField'
import { futureISODate, longDateLabel } from '../../test/pickers'

function renderDate(props = {}) {
  const onChange = jest.fn()
  render(
    <>
      <label htmlFor="date">Departure date</label>
      <DatePickerField id="date" value="" onChange={onChange} {...props} />
      <button type="button">Elsewhere</button>
    </>,
  )
  return { onChange }
}

function renderTime(props = {}) {
  const onChange = jest.fn()
  render(
    <>
      <label htmlFor="time">Departure time</label>
      <TimePickerField id="time" value="" onChange={onChange} {...props} />
    </>,
  )
  return { onChange }
}

const dateDialog = () => screen.getByRole('dialog', { name: 'Choose a date' })
const timeDialog = () => screen.getByRole('dialog', { name: 'Choose a time' })

describe('DatePickerField', () => {
  it('opens our own calendar instead of the browser picker', async () => {
    const user = userEvent.setup()
    renderDate()

    await user.click(screen.getByLabelText('Departure date'))

    expect(dateDialog()).toBeInTheDocument()
    expect(screen.getByLabelText('Departure date')).toHaveAttribute(
      'aria-expanded',
      'true',
    )
  })

  it('picks a day, reports it, closes and returns focus to the field', async () => {
    const user = userEvent.setup()
    const tomorrow = futureISODate(1)
    const { onChange } = renderDate({ min: futureISODate(0) })

    await user.click(screen.getByLabelText('Departure date'))
    let day = within(dateDialog()).queryByRole('button', {
      name: longDateLabel(tomorrow),
    })
    if (!day) {
      await user.click(screen.getByRole('button', { name: 'Next month' }))
      day = screen.getByRole('button', { name: longDateLabel(tomorrow) })
    }
    await user.click(day)

    expect(onChange).toHaveBeenCalledWith(tomorrow)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Departure date')).toHaveFocus()
  })

  it('disables past days and paging back before the earliest month', async () => {
    const user = userEvent.setup()
    renderDate({ min: '2026-09-15', value: '2026-09-20' })

    await user.click(screen.getByLabelText('Departure date'))

    expect(
      screen.getByRole('button', { name: longDateLabel('2026-09-14') }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', { name: longDateLabel('2026-09-15') }),
    ).toBeEnabled()
    expect(
      screen.getByRole('button', { name: 'Previous month' }),
    ).toBeDisabled()
  })

  it('opens on the chosen month and marks the chosen day', async () => {
    const user = userEvent.setup()
    renderDate({ min: '2026-09-01', value: '2026-11-03' })

    await user.click(screen.getByLabelText('Departure date'))

    expect(within(dateDialog()).getByText('November 2026')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: longDateLabel('2026-11-03') }),
    ).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Previous month' }))
    expect(within(dateDialog()).getByText('October 2026')).toBeInTheDocument()
  })

  it('offers a Today shortcut', async () => {
    const user = userEvent.setup()
    const { onChange } = renderDate({ min: futureISODate(0) })

    await user.click(screen.getByLabelText('Departure date'))
    await user.click(screen.getByRole('button', { name: 'Today' }))

    expect(onChange).toHaveBeenCalledWith(futureISODate(0))
  })

  it('closes on Escape and on a click elsewhere', async () => {
    const user = userEvent.setup()
    renderDate()

    await user.click(screen.getByLabelText('Departure date'))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Departure date')).toHaveFocus()

    await user.click(screen.getByLabelText('Departure date'))
    await user.click(screen.getByRole('button', { name: 'Elsewhere' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the formatted value, or the placeholder when empty', () => {
    const { rerender } = render(
      <DatePickerField
        id="date"
        value=""
        onChange={jest.fn()}
        formatValue={() => 'Oct 2, 2026'}
      />,
    )
    expect(screen.getByText('Select a date')).toBeInTheDocument()

    rerender(
      <DatePickerField
        id="date"
        value="2026-10-02"
        onChange={jest.fn()}
        formatValue={() => 'Oct 2, 2026'}
      />,
    )
    expect(screen.getByText('Oct 2, 2026')).toBeInTheDocument()
  })

  it('cannot be opened while disabled', () => {
    renderDate({ disabled: true })

    expect(screen.getByLabelText('Departure date')).toBeDisabled()
  })
})

describe('TimePickerField', () => {
  const pick = async (user, column, name) =>
    user.click(
      within(
        within(timeDialog()).getByRole('group', { name: column }),
      ).getByRole('button', { name }),
    )

  it('builds a 24-hour time from hour, minute and PM', async () => {
    const user = userEvent.setup()
    const { onChange } = renderTime()

    await user.click(screen.getByLabelText('Departure time'))
    await pick(user, 'Hour', '02')
    expect(onChange).not.toHaveBeenCalled()
    await pick(user, 'Minute', '30')
    expect(onChange).toHaveBeenLastCalledWith('02:30')
    await pick(user, 'AM or PM', 'PM')

    expect(onChange).toHaveBeenLastCalledWith('14:30')
  })

  it.each([
    ['12 AM', 'AM', '00:15'],
    ['12 PM', 'PM', '12:15'],
  ])('handles %s correctly', async (_, period, expected) => {
    const user = userEvent.setup()
    const { onChange } = renderTime()

    await user.click(screen.getByLabelText('Departure time'))
    await pick(user, 'AM or PM', period)
    await pick(user, 'Hour', '12')
    await pick(user, 'Minute', '15')

    expect(onChange).toHaveBeenLastCalledWith(expected)
  })

  it('opens with the current time highlighted and closes on Done', async () => {
    const user = userEvent.setup()
    renderTime({ value: '19:45' })

    await user.click(screen.getByLabelText('Departure time'))
    const selected = within(timeDialog())
      .getAllByRole('button', { pressed: true })
      .map((button) => button.textContent)
    expect(selected).toEqual(['07', '45', 'PM'])

    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Departure time')).toHaveFocus()
  })
})
