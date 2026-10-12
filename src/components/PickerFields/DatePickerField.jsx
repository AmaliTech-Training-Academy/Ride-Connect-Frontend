import { useState } from 'react'
import usePopover from './usePopover'
import './PickerFields.css'

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const pad = (value) => String(value).padStart(2, '0')

function toISO(year, monthIndex, day) {
  return `${year}-${pad(monthIndex + 1)}-${pad(day)}`
}

function todayISO() {
  const now = new Date()
  return toISO(now.getFullYear(), now.getMonth(), now.getDate())
}

/** { year, monthIndex } of the month an ISO date falls in. */
function monthOf(iso) {
  const [year, month] = iso.split('-').map(Number)
  return { year, monthIndex: month - 1 }
}

function shiftMonth({ year, monthIndex }, delta) {
  const date = new Date(year, monthIndex + delta, 1)
  return { year: date.getFullYear(), monthIndex: date.getMonth() }
}

function longLabel(year, monthIndex, day) {
  return new Date(year, monthIndex, day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * A date field with our own calendar popover instead of the browser's.
 * `value` and `min` are `YYYY-MM-DD` strings.
 */
function DatePickerField({
  id,
  value,
  min,
  onChange,
  disabled = false,
  hasError = false,
  placeholder = 'Select a date',
  formatValue = (iso) => iso,
}) {
  const { isOpen, toggle, close, containerRef, triggerRef } = usePopover()
  const today = todayISO()
  const [viewMonth, setViewMonth] = useState(() =>
    monthOf(value || min || today),
  )

  const openPicker = () => {
    // Always open on the chosen date's month, or the earliest allowed one.
    setViewMonth(monthOf(value || min || today))
    toggle()
  }

  const choose = (iso) => {
    onChange(iso)
    close()
  }

  const { year, monthIndex } = viewMonth
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const leadingBlanks = new Date(year, monthIndex, 1).getDay()
  const minMonth = min ? monthOf(min) : null
  const isAtMinMonth =
    minMonth &&
    (year < minMonth.year ||
      (year === minMonth.year && monthIndex <= minMonth.monthIndex))
  const monthTitle = new Date(year, monthIndex, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="picker" ref={containerRef}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={`styled-date-field picker-trigger ${hasError ? 'input-error' : ''}`}
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={openPicker}
      >
        <span className={value ? '' : 'placeholder'}>
          {value ? formatValue(value) : placeholder}
        </span>
        <i className="fa-regular fa-calendar" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          className="picker-popover picker-popover-date"
          role="dialog"
          aria-label="Choose a date"
        >
          <div className="picker-calendar-header">
            <button
              type="button"
              className="picker-nav"
              aria-label="Previous month"
              disabled={isAtMinMonth}
              onClick={() => setViewMonth((month) => shiftMonth(month, -1))}
            >
              <i className="fa-solid fa-chevron-left" aria-hidden="true" />
            </button>
            <span className="picker-calendar-title" aria-live="polite">
              {monthTitle}
            </span>
            <button
              type="button"
              className="picker-nav"
              aria-label="Next month"
              onClick={() => setViewMonth((month) => shiftMonth(month, 1))}
            >
              <i className="fa-solid fa-chevron-right" aria-hidden="true" />
            </button>
          </div>

          <div className="picker-calendar-grid">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday} className="picker-weekday" aria-hidden="true">
                {weekday}
              </span>
            ))}
            {Array.from({ length: leadingBlanks }, (_, index) => (
              <span key={`blank-${index}`} aria-hidden="true" />
            ))}
            {Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1
              const iso = toISO(year, monthIndex, day)
              const isSelected = iso === value
              const isToday = iso === today
              return (
                <button
                  key={iso}
                  type="button"
                  className={[
                    'picker-day',
                    isSelected ? 'is-selected' : '',
                    isToday ? 'is-today' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-label={longLabel(year, monthIndex, day)}
                  aria-pressed={isSelected}
                  aria-current={isToday ? 'date' : undefined}
                  disabled={Boolean(min) && iso < min}
                  onClick={() => choose(iso)}
                >
                  {day}
                </button>
              )
            })}
          </div>

          {(!min || today >= min) && (
            <div className="picker-footer">
              <button
                type="button"
                className="picker-link"
                onClick={() => choose(today)}
              >
                Today
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default DatePickerField
