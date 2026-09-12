function EyeIcon({ hidden }) {
  return (
    <svg className="eye-icon" viewBox="0 0 24 24" aria-hidden="true">
      {hidden ? (
        <path d="m3 3 18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.8 10.8 0 0 1 12 5c5.2 0 9 5 9 7s-3.8 7-9 7a9.8 9.8 0 0 1-4.5-1.1M5.2 8.2C3.8 9.5 3 11 3 12c0 2 3.8 7 9 7" />
      ) : (
        <>
          <path d="M3 12c0-2 3.8-7 9-7s9 5 9 7-3.8 7-9 7-9-5-9-7Z" />
          <circle cx="12" cy="12" r="2.5" />
        </>
      )}
    </svg>
  )
}

export default EyeIcon
