'use client'

import { useEffect, useState } from 'react'

interface NoSSRProps {
  children: React.ReactNode
}

export function NoSSR({ children }: NoSSRProps) {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  if (!isClient) {
    return null
  }

  return <>{children}</>
}