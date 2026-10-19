import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  App as AntdApp,
  Button,
  Card,
  Col,
  Empty,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
} from 'antd'
import type { TableColumnsType } from 'antd'
import { FileTextOutlined } from '@ant-design/icons'
import { fetchDocuments, removeDocument } from '../api/knowledge'
import type { KnowledgeDocument } from '../api/knowledge'
import FileDropzone from '../components/FileDropzone'
import UploadTaskList from '../components/UploadTaskList'
import { useUploadQueue } from '../hooks/useUploadQueue'
import { formatBytes, formatDateTime } from '../utils/format'

// ── 知识库页面原型 ──────────────────────────────────────────
// 一个把各部分串起来的综合页面: 上传 → 文档列表 → 概览统计;
// 数据全部来自 mock 接口(/api/knowledge/*), 走 request.ts 的统一封装
//
// 拆出去的通用组件与逻辑:
//   src/components/FileDropzone.tsx    选择/拖拽文件
//   src/components/UploadTaskList.tsx  文件上传进度条组件(纯展示)
//   src/hooks/useUploadQueue.ts        上传任务状态 + 取消/重试
//
// 演示彩蛋:
//   文件名带"错误"二字 → 上传"解析失败"(可重试);
//   上传中点击"取消" → 请求被 abort, 任务变为"已取消"

// 单文件大小上限(演示限制): 校验逻辑与选择区提示共用同一个数字
const MAX_FILE_SIZE_MB = 5
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024

type StatusFilter = 'all' | KnowledgeDocument['status']

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'ready', label: '可用' },
  { value: 'parsing', label: '解析中' },
]

function KnowledgeBaseDemo() {
  const { message } = AntdApp.useApp()
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([])
  // 首屏就需要拉列表: loading 直接初始为 true, 省去在 effect 里同步 setState
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  // "上传成功后延迟刷新列表"用的定时器(组件卸载时清理)
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 拉取文档列表: 首次进入与上传成功后都会用到
  const loadDocuments = useCallback(async () => {
    try {
      const list = await fetchDocuments()
      setDocuments(list)
    } catch {
      // 拦截器已弹全局错误提示, 这里只需要保证 loading 收尾
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDocuments()
  }, [loadDocuments])

  useEffect(() => {
    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    }
  }, [])

  // 上传队列: 上传成功时把服务端返回的文档(解析中)插到列表头部,
  // 并延迟重新拉一次列表 —— mock 端约 3 秒后完成解析, 状态会变为"可用"
  const { tasks, enqueue, cancelTask, retryTask, removeTask } = useUploadQueue((doc) => {
    setDocuments((prev) => [doc, ...prev])
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current)
    refreshTimerRef.current = setTimeout(() => {
      void loadDocuments()
    }, 3500)
  })

  // 选择文件后: 先做大小校验, 通过的文件进入上传队列
  function handleFiles(files: File[]) {
    const accepted = files.filter((file) => file.size <= MAX_FILE_SIZE)
    const skipped = files.length - accepted.length
    if (skipped > 0) {
      message.warning(`已跳过 ${skipped} 个超过 ${MAX_FILE_SIZE_MB} MB 的文件`)
    }
    if (accepted.length > 0) enqueue(accepted)
  }

  // 删除文档: 服务端确认删除后再同步本地列表
  async function handleDelete(doc: KnowledgeDocument) {
    try {
      await removeDocument(doc.id)
      setDocuments((prev) => prev.filter((item) => item.id !== doc.id))
      message.success(`已删除「${doc.name}」`)
    } catch {
      // 拦截器已提示失败原因
    }
  }

  // 搜索 + 状态筛选: 原型阶段直接在前端过滤;
  // 真实项目文档量大时, 应改成把关键字传给服务端做分页查询
  const visibleDocuments = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return documents.filter((doc) => {
      const nameMatched = kw === '' || doc.name.toLowerCase().includes(kw)
      const statusMatched = statusFilter === 'all' || doc.status === statusFilter
      return nameMatched && statusMatched
    })
  }, [documents, keyword, statusFilter])

  // 概览统计: 全部从列表数据派生, 不额外请求接口
  const stats = useMemo(
    () => ({
      total: documents.length,
      ready: documents.filter((doc) => doc.status === 'ready').length,
      parsing: documents.filter((doc) => doc.status === 'parsing').length,
      totalSize: documents.reduce((sum, doc) => sum + doc.size, 0),
    }),
    [documents],
  )

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
      title: '状态',
      dataIndex: 'status',
      width: 110,
      render: (status: KnowledgeDocument['status']) =>
        status === 'ready' ? (
          <Tag color="success">可用</Tag>
        ) : (
          <Tag color="processing">解析中</Tag>
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
      <h3>1. 概览统计: 从列表数据派生, 不额外请求接口</h3>
      <Row gutter={[12, 12]}>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="文档总数" value={stats.total} suffix="份" />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic
              title="可用"
              value={stats.ready}
              suffix="份"
              valueStyle={{ color: '#16a34a' }}
            />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="解析中" value={stats.parsing} suffix="份" />
          </Card>
        </Col>
        <Col xs={12} md={6}>
          <Card size="small">
            <Statistic title="总容量" value={formatBytes(stats.totalSize)} />
          </Card>
        </Col>
      </Row>

      <h3>2. 上传文档: 拖拽/点选 → 上传任务队列</h3>
      <p className="learn-kb-tip">
        新任务会自动开始上传, 可随时取消、失败后重试。演示彩蛋: 文件名包含"错误"二字会失败;
        上传成功后文档先显示"解析中", 约 3 秒后变为"可用"。
      </p>
      <FileDropzone
        onFiles={handleFiles}
        hint={`支持多选; 单个文件不超过 ${MAX_FILE_SIZE_MB} MB`}
      />
      <UploadTaskList
        tasks={tasks}
        onCancel={cancelTask}
        onRetry={retryTask}
        onRemove={removeTask}
      />

      <h3>3. 文档列表: 搜索筛选 + 删除</h3>
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
      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={visibleDocuments}
        loading={loading}
        pagination={false}
        locale={{
          emptyText: (
            <Empty
              description={
                documents.length === 0 ? '知识库还没有文档, 先上传一份试试' : '没有匹配的文档'
              }
            />
          ),
        }}
      />
    </div>
  )
}

export default KnowledgeBaseDemo
