import { useState } from 'react'

/**
 * A person's profile picture, or their initials when they have none or the
 * picture fails to load. The caller's class sizes and shapes both, so each
 * screen keeps its own avatar styling.
 */
function UserAvatar({ imageUrl, initials, className }) {
  const [failedUrl, setFailedUrl] = useState(null)

  if (imageUrl && imageUrl !== failedUrl) {
    return (
      <img
        className={className}
        src={imageUrl}
        alt=""
        onError={() => setFailedUrl(imageUrl)}
      />
    )
  }

  return <span className={className}>{initials}</span>
}

export default UserAvatar
