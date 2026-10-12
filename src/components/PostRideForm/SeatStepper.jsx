const MIN_SEATS = 1
const MAX_SEATS = 8

function SeatStepper({ value, onChange, disabled, minSeats = MIN_SEATS }) {
  // While editing, the floor is the number of seats already taken: dropping
  // below it would strand a passenger who has already been accepted.
  const floor = Math.max(MIN_SEATS, minSeats)

  const decrement = () => {
    if (value > floor) onChange(value - 1)
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
          disabled={disabled || value <= floor}
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
