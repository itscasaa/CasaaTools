import { useEffect, useRef } from 'react'

export function usePolling(callback, delay, active = true) {
  const savedCallback = useRef()

  useEffect(() => {
    savedCallback.current = callback
  }, [callback])

  useEffect(() => {
    if (!active || delay === null) return

    function tick() {
      if (savedCallback.current) {
        savedCallback.current()
      }
    }

    const id = setInterval(tick, delay)
    return () => clearInterval(id)
  }, [delay, active])
}
