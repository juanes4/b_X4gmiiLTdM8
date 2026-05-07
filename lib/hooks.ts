import { useState, useEffect, useCallback, useRef } from "react"

export function useFetchData<T>(fetcher: () => Promise<T[]>, errorMessage: string) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const fetcherRef = useRef(fetcher)
  const messageRef = useRef(errorMessage)

  const refetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetcherRef.current())
    } catch (err) {
      setError(err instanceof Error ? err.message : messageRef.current)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { data, loading, error, refetch }
}
