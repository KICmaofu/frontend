import { useEffect, useState } from 'react'

function fetchList(): Promise<string[]> {
  return Promise.resolve(['a'])
}

// 探针 A: 调用 async 函数(内部 finally 里 setState)
function ProbeA() {
  const [list, setList] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const load = async () => {
    try {
      setList(await fetchList())
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load()
  }, [])
  return (
    <p>
      {list.length}
      {loading ? '…' : ''}
    </p>
  )
}

// 探针 B: effect 内联 promise 链
function ProbeB() {
  const [list, setList] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    fetchList()
      .then((data) => setList(data))
      .finally(() => setLoading(false))
  }, [])
  return (
    <p>
      {list.length}
      {loading ? '…' : ''}
    </p>
  )
}

// 探针 C: 内联 async IIFE
function ProbeC() {
  const [list, setList] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    void (async () => {
      try {
        setList(await fetchList())
      } finally {
        setLoading(false)
      }
    })()
  }, [])
  return (
    <p>
      {list.length}
      {loading ? '…' : ''}
    </p>
  )
}

export { ProbeA, ProbeB, ProbeC }
