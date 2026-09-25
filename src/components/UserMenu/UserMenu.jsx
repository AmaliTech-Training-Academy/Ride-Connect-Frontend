import { useEffect, useRef, useState } from 'react'
import UserAvatar from '../UserAvatar/UserAvatar'
import './UserMenu.css'

function UserMenu({
  initials,
  imageUrl,
  isUploadingImage = false,
  onChangePicture,
  onChangePassword,
  onLogout,
}) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)
  const triggerRef = useRef(null)
  const fileInputRef = useRef(null)

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

  const handleFileChange = (event) => {
    const [file] = event.target.files ?? []
    // Cleared so picking the same file again still fires a change.
    event.target.value = ''
    if (file) onChangePicture?.(file)
  }

  return (
    <div className="user-menu" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        className="user-menu-trigger"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <UserAvatar
          className="user-menu-avatar"
          imageUrl={imageUrl}
          initials={initials}
        />
        {isUploadingImage && (
          <span className="user-menu-avatar-busy" aria-hidden="true">
            <i className="fa-solid fa-spinner fa-spin" />
          </span>
        )}
      </button>

      {/* Outside the popover: the menu closes on click, but the picker still
          needs this input mounted when the file comes back. */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="user-menu-file-input"
        aria-label="Choose a profile picture"
        tabIndex={-1}
        onChange={handleFileChange}
      />

      {open && (
        <div className="user-menu-popover" role="menu">
          <button
            type="button"
            role="menuitem"
            className="user-menu-item"
            disabled={isUploadingImage}
            onClick={() => {
              setOpen(false)
              fileInputRef.current?.click()
            }}
          >
            <i className="fa-solid fa-camera" aria-hidden="true" />
            {isUploadingImage ? 'Uploading picture...' : 'Update profile picture'}
          </button>
          <button
            type="button"
            role="menuitem"
            className="user-menu-item"
            onClick={() => {
              setOpen(false)
              onChangePassword?.(triggerRef.current)
            }}
          >
            <i className="fa-solid fa-key" aria-hidden="true" />
            Change password
          </button>
          <button
            type="button"
            role="menuitem"
            className="user-menu-item user-menu-item-danger"
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
