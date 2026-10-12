import { useEffect, useRef } from 'react'
import usePopover from './usePopover'
import './PickerFields.css'

/**
 * A dropdown with our own popover list instead of the browser's <select>.
 * `options` is a list of { value, label, hint? }; `value` is the chosen one's
 * value, or '' for none.
 */
function SelectPickerField({
  id,
  value,
  options,
  onChange,
  disabled = false,
  hasError = false,
  placeholder = 'Select an option',
  listLabel = 'Choose an option',
  title,
  icon = 'fa-solid fa-chevron-down',
}) {
  const { isOpen, toggle, close, containerRef, triggerRef } = usePopover()
  const listRef = useRef(null)
  const selected = options.find((option) => option.value === value)

  // Opening moves focus to the chosen option (or the first), so the arrow
  // keys work straight away.
  useEffect(() => {
    if (!isOpen) return
    const items = listRef.current?.querySelectorAll('[role="option"]') ?? []
    const index = Math.max(
      0,
      options.findIndex((option) => option.value === value),
    )
    items[index]?.focus()
  }, [isOpen, options, value])

  const choose = (optionValue) => {
    onChange(optionValue)
    close()
  }

  const handleKeyDown = (event, index) => {
    const items = listRef.current.querySelectorAll('[role="option"]')
    const moveTo = (next) => {
      event.preventDefault()
      items[(next + items.length) % items.length].focus()
    }

    if (event.key === 'ArrowDown') moveTo(index + 1)
    else if (event.key === 'ArrowUp') moveTo(index - 1)
    else if (event.key === 'Home') moveTo(0)
    else if (event.key === 'End') moveTo(items.length - 1)
    else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(options[index].value)
    } else if (event.key === 'Tab') close({ returnFocus: false })
  }

  return (
    <div className="picker" ref={containerRef}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className={`styled-date-field picker-trigger ${hasError ? 'input-error' : ''}`}
        disabled={disabled}
        title={title}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        onClick={toggle}
      >
        <span className={selected ? '' : 'placeholder'}>
          {selected ? selected.label : placeholder}
        </span>
        <i
          className={`${icon} picker-chevron ${isOpen ? 'is-open' : ''}`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          className="picker-popover picker-popover-select"
          role="listbox"
          aria-label={listLabel}
        >
          {options.map((option, index) => {
            const isSelected = option.value === value
            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                tabIndex={-1}
                className={`picker-select-option ${isSelected ? 'is-selected' : ''}`}
                onClick={() => choose(option.value)}
                onKeyDown={(event) => handleKeyDown(event, index)}
              >
                <span className="picker-select-text">
                  <span className="picker-select-label">{option.label}</span>
                  {option.hint && (
                    <span className="picker-select-hint">{option.hint}</span>
                  )}
                </span>
                {isSelected && (
                  <i className="fa-solid fa-check" aria-hidden="true" />
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export default SelectPickerField
