import { useState } from 'react'
import usePopover from './usePopover'
import './PickerFields.css'

const HOURS = Array.from({ length: 12 }, (_, index) => index + 1)
const MINUTES = Array.from({ length: 12 }, (_, index) => index * 5)
const PERIODS = ['AM', 'PM']

const pad = (value) => String(value).padStart(2, '0')

/** "HH:MM" (24h) -> { hour: 1-12, minute, period }, or blanks when empty. */
function toParts(value) {
  if (!value) return { hour: null, minute: null, period: 'AM' }
  const [hours, minute] = value.split(':').map(Number)
  return {
    hour: hours % 12 || 12,
    minute,
    period: hours >= 12 ? 'PM' : 'AM',
  }
}

function toValue({ hour, minute, period }) {
  const hours = (hour % 12) + (period === 'PM' ? 12 : 0)
  return `${pad(hours)}:${pad(minute)}`
}

function Column({ label, options, selected, format, onSelect }) {
  return (
    <div className="picker-time-column" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          className={`picker-time-option ${option === selected ? 'is-selected' : ''}`}
          aria-pressed={option === selected}
          onClick={() => onSelect(option)}
        >
          {format(option)}
        </button>
      ))}
    </div>
  )
}

/**
 * A time field with our own hour / minute / AM-PM popover instead of the
 * browser's. `value` is an "HH:MM" 24-hour string.
 */
function TimePickerField({
  id,
  value,
  onChange,
  disabled = false,
  hasError = false,
  placeholder = 'Select a time',
  formatValue = (time) => time,
}) {
  const { isOpen, toggle, close, containerRef, triggerRef } = usePopover()
  const [draft, setDraft] = useState(() => toParts(value))

  const openPicker = () => {
    setDraft(toParts(value))
    toggle()
  }

  // The field updates as soon as an hour and a minute are both picked, so
  // "Done" only closes the popover.
  const update = (changes) => {
    const next = { ...draft, ...changes }
    setDraft(next)
    if (next.hour !== null && next.minute !== null) onChange(toValue(next))
  }

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
        <i className="fa-regular fa-clock" aria-hidden="true" />
      </button>

      {isOpen && (
        <div
          className="picker-popover picker-popover-time"
          role="dialog"
          aria-label="Choose a time"
        >
          <div className="picker-time-columns">
            <Column
              label="Hour"
              options={HOURS}
              selected={draft.hour}
              format={pad}
              onSelect={(hour) => update({ hour })}
            />
            <Column
              label="Minute"
              options={MINUTES}
              selected={draft.minute}
              format={pad}
              onSelect={(minute) => update({ minute })}
            />
            <Column
              label="AM or PM"
              options={PERIODS}
              selected={draft.period}
              format={(period) => period}
              onSelect={(period) => update({ period })}
            />
          </div>
          <div className="picker-footer">
            <button
              type="button"
              className="picker-done"
              onClick={() => close()}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TimePickerField
