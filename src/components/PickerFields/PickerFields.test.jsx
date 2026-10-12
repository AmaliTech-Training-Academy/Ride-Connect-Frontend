import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, jest } from '@jest/globals'
import DatePickerField from './DatePickerField'
import TimePickerField from './TimePickerField'
import SelectPickerField from './SelectPickerField'
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

  // A fixed morning "now", so the default AM/PM doesn't depend on when the
  // tests happen to run.
  const morning = () => new Date(2026, 8, 30, 9, 12)

  it('builds a 24-hour time from hour, minute and PM', async () => {
    const user = userEvent.setup()
    const { onChange } = renderTime({ getNow: morning })

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
    // Focus lands on the chosen hour, ready for the keyboard.
    expect(
      within(
        within(timeDialog()).getByRole('group', { name: 'Hour' }),
      ).getByRole('button', { name: '07' }),
    ).toHaveFocus()

    await user.click(screen.getByRole('button', { name: 'Done' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Departure time')).toHaveFocus()
  })

  it('opens an empty field on the current time without picking it', async () => {
    const user = userEvent.setup()
    // 2:37 PM: the minute rounds up to the next 5-minute step, :40.
    const { onChange } = renderTime({
      getNow: () => new Date(2026, 8, 30, 14, 37),
    })

    await user.click(screen.getByLabelText('Departure time'))
    const column = (name) =>
      within(within(timeDialog()).getByRole('group', { name }))

    const hour = column('Hour').getByRole('button', { name: '02' })
    expect(hour).toHaveFocus()
    expect(hour).toHaveClass('is-now')
    expect(column('Minute').getByRole('button', { name: '40' })).toHaveClass(
      'is-now',
    )
    expect(
      column('AM or PM').getByRole('button', { name: 'PM' }),
    ).toHaveAttribute('aria-pressed', 'true')
    // Only highlighted: nothing is filled in until the driver picks.
    expect(onChange).not.toHaveBeenCalled()
    expect(
      within(timeDialog()).queryAllByRole('button', { pressed: true }),
    ).toHaveLength(1)
  })

  it('keeps late-evening minutes on a pickable step', async () => {
    const user = userEvent.setup()
    renderTime({ getNow: () => new Date(2026, 8, 30, 23, 58) })

    await user.click(screen.getByLabelText('Departure time'))

    expect(
      within(
        within(timeDialog()).getByRole('group', { name: 'Minute' }),
      ).getByRole('button', { name: '55' }),
    ).toHaveClass('is-now')
  })
})

describe('SelectPickerField', () => {
  const OPTIONS = [
    { value: 'ACCRA', label: 'Accra office', hint: 'AmaliTech Accra' },
    { value: 'KUMASI', label: 'Kumasi office' },
    { value: 'TAKORADI', label: 'Takoradi office' },
  ]

  function renderSelect(props = {}) {
    const onChange = jest.fn()
    render(
      <>
        <label htmlFor="office">Office</label>
        <SelectPickerField
          id="office"
          value=""
          options={OPTIONS}
          onChange={onChange}
          placeholder="Select an office"
          listLabel="Choose an office"
          {...props}
        />
        <button type="button">Elsewhere</button>
      </>,
    )
    return { onChange }
  }

  const list = () => screen.getByRole('listbox', { name: 'Choose an office' })

  it('shows the placeholder, then opens our own list with hints', async () => {
    const user = userEvent.setup()
    renderSelect()

    expect(screen.getByLabelText('Office')).toHaveTextContent(
      'Select an office',
    )
    await user.click(screen.getByLabelText('Office'))

    expect(within(list()).getAllByRole('option')).toHaveLength(3)
    expect(within(list()).getByText('AmaliTech Accra')).toBeInTheDocument()
    expect(within(list()).getAllByRole('option')[0]).toHaveFocus()
  })

  it('picks an option by click, closes and returns focus', async () => {
    const user = userEvent.setup()
    const { onChange } = renderSelect()

    await user.click(screen.getByLabelText('Office'))
    await user.click(within(list()).getByRole('option', { name: /Kumasi/ }))

    expect(onChange).toHaveBeenCalledWith('KUMASI')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Office')).toHaveFocus()
  })

  it('marks and focuses the chosen option when reopened', async () => {
    const user = userEvent.setup()
    renderSelect({ value: 'TAKORADI' })

    expect(screen.getByLabelText('Office')).toHaveTextContent('Takoradi office')
    await user.click(screen.getByLabelText('Office'))

    const chosen = within(list()).getByRole('option', { selected: true })
    expect(chosen).toHaveTextContent('Takoradi office')
    expect(chosen).toHaveFocus()
  })

  it('works from the keyboard, wrapping at the ends', async () => {
    const user = userEvent.setup()
    const { onChange } = renderSelect()

    await user.click(screen.getByLabelText('Office'))
    await user.keyboard('{ArrowUp}')
    expect(
      within(list()).getByRole('option', { name: /Takoradi/ }),
    ).toHaveFocus()
    await user.keyboard('{ArrowDown}')
    expect(within(list()).getByRole('option', { name: /Accra/ })).toHaveFocus()
    await user.keyboard('{End}')
    await user.keyboard('{Home}')
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{Enter}')

    expect(onChange).toHaveBeenCalledWith('KUMASI')
  })

  it('picks with Space too', async () => {
    const user = userEvent.setup()
    const { onChange } = renderSelect()

    await user.click(screen.getByLabelText('Office'))
    await user.keyboard(' ')

    expect(onChange).toHaveBeenCalledWith('ACCRA')
  })

  it('closes on Escape, Tab or a click elsewhere without picking', async () => {
    const user = userEvent.setup()
    const { onChange } = renderSelect()

    await user.click(screen.getByLabelText('Office'))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    await user.click(screen.getByLabelText('Office'))
    await user.keyboard('{Tab}')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()

    await user.click(screen.getByLabelText('Office'))
    await user.click(screen.getByRole('button', { name: 'Elsewhere' }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('cannot be opened while disabled', () => {
    renderSelect({ disabled: true, title: 'Locked' })

    expect(screen.getByLabelText('Office')).toBeDisabled()
    expect(screen.getByLabelText('Office')).toHaveAttribute('title', 'Locked')
  })
})
