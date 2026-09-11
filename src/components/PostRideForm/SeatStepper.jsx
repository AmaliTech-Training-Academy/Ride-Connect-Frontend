const MIN_SEATS = 1
const MAX_SEATS = 8

function SeatStepper({ value, onChange, disabled }) {
  const decrement = () => {
    if (value > MIN_SEATS) onChange(value - 1)
  }

  const increment = () => {
    if (value < MAX_SEATS) onChange(value + 1)
  }

  return (
    <div className="seat-stepper">
      <div className="seat-stepper-controls">
        <button
          type="button"
          className="seat-stepper-btn"
          onClick={decrement}
          disabled={disabled || value <= MIN_SEATS}
          aria-label="Decrease seats"
        >
          −
        </button>
        <span className="seat-count">{value}</span>
        <button
          type="button"
          className="seat-stepper-btn"
          onClick={increment}
          disabled={disabled || value >= MAX_SEATS}
          aria-label="Increase seats"
        >
          +
        </button>
      </div>

      <div className="seat-icons" aria-hidden="true">
        {Array.from({ length: MAX_SEATS }, (_, index) => (
          <i
            key={index}
            className={`fa-solid fa-user seat-icon ${index < value ? 'active' : ''}`}
          />
        ))}
      </div>
    </div>
  )
}

export default SeatStepper
