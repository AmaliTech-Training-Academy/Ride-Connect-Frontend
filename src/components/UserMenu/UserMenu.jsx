import { useEffect, useRef, useState } from 'react'
import './UserMenu.css'

function UserMenu({ initials, onLogout }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const handleClickOutside = (event) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target)
      ) {
        setOpen(false)
      }
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div className="user-menu" ref={containerRef}>
      <button
        type="button"
        className="user-menu-trigger"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <span className="user-menu-avatar">{initials}</span>
      </button>
      {open && (
        <div className="user-menu-popover" role="menu">
          <button
            type="button"
            role="menuitem"
            className="user-menu-item"
            onClick={() => {
              setOpen(false)
              onLogout?.()
            }}
          >
            <i
              className="fa-solid fa-arrow-right-from-bracket"
              aria-hidden="true"
            />
            Logout
          </button>
        </div>
      )}
    </div>
  )
}

export default UserMenu
