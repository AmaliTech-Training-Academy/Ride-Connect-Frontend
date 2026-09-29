import { useEffect, useRef, useState } from 'react'

/**
 * Open/close state for a field's popover: closes on a click outside the
 * field or on Escape, and hands focus back to the trigger when it closes.
 */
export default function usePopover() {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)
  const triggerRef = useRef(null)

  const close = ({ returnFocus = true } = {}) => {
    setIsOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }

  useEffect(() => {
    if (!isOpen) return undefined

    const handleMouseDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setIsOpen(false)
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
        triggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return {
    isOpen,
    open: () => setIsOpen(true),
    toggle: () => setIsOpen((current) => !current),
    close,
    containerRef,
    triggerRef,
  }
}
