import { useEffect, useMemo, useState } from 'react'
import {
  App as AntdApp,
  Button,
  Empty,
  Input,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { FileTextOutlined, LoadingOutlined, ReloadOutlined } from '@ant-design/icons'
import { fetchDocuments, removeDocument } from '../../api/knowledge'
import type { KnowledgeDocument } from '../../api/knowledge'
import BatchUploader from '../../components/BatchUploader'
import { useUploadQueue } from '../../hooks/useUploadQueue'
import { formatBytes, formatDateTime } from '../../utils/format'

// ── 文档列表页: 解析状态实时更新 ───────────────────────────
// 上传成功后文档先进入"解析中", 页面按下面的策略自动更新状态:
//   1. 拉一次列表;
//   2. 如果还有 parsing 文档, 2 秒后再拉; 否则停止(不做无意义的空转);
//   3. 用 setTimeout 串行递归而不是 setInterval —— 上一次请求没回来时
//      不会再发下一次, 避免请求叠加和乱序覆盖;
//   4. 组件卸载 / 手动刷新 / 上传成功后都会重启这个循环(清理旧定时器)。
//
// 轮询只在文档列表页存在期间运行; 用户切走页面后不再占用网络

// 单文件大小上限(与知识库原型页保持一致)
const MAX_FILE_SIZE_MB = 5
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024
// 解析中的轮询间隔: 2 秒足够让状态变化看起来"实时", 又不会给 mock 太大压力
const POLL_INTERVAL_MS = 2000

type StatusFilter = 'all' | KnowledgeDocument['status']

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'ready', label: '可用' },
  { value: 'parsing', label: '解析中' },
]

function KnowledgeDocumentListPage() {
  const { message } = AntdApp.useApp()
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([])
  // 首次加载才显示整表 loading; 后续轮询静默更新, 不打断用户浏览
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  // 加一就重启下面的"拉取-等待-再拉取"循环:
  // 手动刷新、上传成功都复用它, 不用额外维护定时器
  const [refreshToken, setRefreshToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    async function pull() {
      try {
        const list = await fetchDocuments()
        if (cancelled) return

        setDocuments(list)
        setLastSyncAt(Date.now())

        // 还有文档在解析: 2 秒后再拉一次; 全部就绪后自然停止轮询
        if (list.some((doc) => doc.status === 'parsing')) {
          timer = setTimeout(() => {
            void pull()
          }, POLL_INTERVAL_MS)
        }
      } catch {
        // 拦截器已提示; 这里停止轮询, 用户可点"刷新"重新开始
      } finally {
        if (!cancelled) {
          setLoading(false)
          setSyncing(false)
        }
      }
    }

    void pull()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [refreshToken])

  // 上传成功: 新文档处于"解析中", 立即重启循环, 让轮询接管后续状态变化
  const { tasks, enqueue, cancelTask, retryTask, removeTask } = useUploadQueue(() => {
    setRefreshToken((token) => token + 1)
  })

  // 选择文件后先做大小校验, 通过的文件进入上传队列
  function handleFiles(files: File[]) {
    const accepted = files.filter((file) => file.size <= MAX_FILE_SIZE)
    const skipped = files.length - accepted.length
    if (skipped > 0) {
      message.warning(`已跳过 ${skipped} 个超过 ${MAX_FILE_SIZE_MB} MB 的文件`)
    }
    if (accepted.length > 0) enqueue(accepted)
  }

  function handleRefresh() {
    if (syncing) return
    setSyncing(true)
    setRefreshToken((token) => token + 1)
  }

  // 删除文档: 服务端确认后再同步本地列表
  async function handleDelete(doc: KnowledgeDocument) {
    try {
      await removeDocument(doc.id)
      setDocuments((prev) => prev.filter((item) => item.id !== doc.id))
      message.success(`已删除「${doc.name}」`)
    } catch {
      // 拦截器已提示失败原因
    }
  }

  // 搜索 + 状态筛选: 演示阶段直接在前端过滤
  const visibleDocuments = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return documents.filter((doc) => {
      const nameMatched = kw === '' || doc.name.toLowerCase().includes(kw)
      const statusMatched = statusFilter === 'all' || doc.status === statusFilter
      return nameMatched && statusMatched
    })
  }, [documents, keyword, statusFilter])

  const parsingCount = useMemo(
    () => documents.filter((doc) => doc.status === 'parsing').length,
    [documents],
  )

  const lastSyncText =
    lastSyncAt === null
      ? '--'
      : new Date(lastSyncAt).toLocaleTimeString('zh-CN', { hour12: false })

  const columns: TableColumnsType<KnowledgeDocument> = [
    {
      title: '名称',
      dataIndex: 'name',
      render: (_, record) => (
        <span className="learn-kb-doc-name">
          <FileTextOutlined className="learn-kb-doc-icon" />
          {record.name}
        </span>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      width: 110,
      render: (size: number) => formatBytes(size),
    },
    {
      title: '解析状态',
      dataIndex: 'status',
      width: 120,
      render: (status: KnowledgeDocument['status']) =>
        status === 'ready' ? (
          <Tag color="success">可用</Tag>
        ) : (
          <Tag color="processing" icon={<LoadingOutlined spin />}>
            解析中
          </Tag>
        ),
    },
    {
      title: '上传时间',
      dataIndex: 'uploadedAt',
      width: 150,
      render: (iso: string) => formatDateTime(iso),
    },
    {
      title: '操作',
      width: 90,
      render: (_, record) => (
        <Popconfirm
          title="删除这份文档?"
          description="删除后将从知识库中移除"
          onConfirm={() => handleDelete(record)}
        >
          <Button type="link" size="small" danger>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <div className="learn-demo">
      <div className="learn-kb-page-head">
        <div>
          <h3>文档列表</h3>
          <p className="learn-kb-tip">
            上传后文档先进入“解析中”, 页面每 2 秒自动拉取一次; 解析完成后无需手动刷新,
            状态会自动变为“可用”。
          </p>
        </div>
        <Space wrap>
          {/* 实时更新指示灯: 还有文档解析中时高亮, 全部就绪后变为普通同步状态 */}
          <span className={`learn-kb-sync${parsingCount > 0 ? ' live' : ''}`}>
            <span className="learn-kb-sync-dot" />
            {parsingCount > 0 ? '实时更新中' : '已同步'} · {lastSyncText}
          </span>
          <Button icon={<ReloadOutlined />} loading={syncing} onClick={handleRefresh}>
            刷新
          </Button>
        </Space>
      </div>

      <BatchUploader
        tasks={tasks}
        hint={`支持多选; 单个文件不超过 ${MAX_FILE_SIZE_MB} MB`}
        onFiles={handleFiles}
        onCancel={cancelTask}
        onRetry={retryTask}
        onRemove={removeTask}
      />

      <div className="learn-kb-doc-toolbar">
        <Space wrap>
          <Input.Search
            allowClear
            placeholder="按名称搜索"
            style={{ width: 220 }}
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <Select<StatusFilter>
            value={statusFilter}
            onChange={setStatusFilter}
            options={statusOptions}
            style={{ width: 130 }}
          />
        </Space>
        <span className="learn-kb-doc-summary">
          共 {documents.length} 份
          {parsingCount > 0 ? ` · ${parsingCount} 份解析中` : ''}
        </span>
      </div>

      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={visibleDocuments}
        loading={loading}
        pagination={{ pageSize: 8, hideOnSinglePage: true }}
        locale={{
          emptyText: (
            <Empty
              description={
                documents.length === 0 ? '还没有文档, 先上传一份试试' : '没有匹配的文档'
              }
            />
          ),
        }}
      />
    </div>
  )
}

export default KnowledgeDocumentListPage
