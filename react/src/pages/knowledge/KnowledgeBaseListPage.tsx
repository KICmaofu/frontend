import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
import {
  DatabaseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons'
import { fetchKnowledgeBases, removeKnowledgeBase } from '../../api/knowledge'
import type { KnowledgeBase, KnowledgeBaseVisibility } from '../../api/knowledge'
import { formatDateTime } from '../../utils/format'
import { visibilityColor, visibilityLabel, visibilityOptions } from './visibility'

// ── 知识库列表页(CRUD 中的 R: 列表) ─────────────────────────
// 数据流与 ChatSessionsDemo 一致: 列表由本页面持有, 写操作先请求 mock,
// 服务端确认成功后再更新本地数据; 失败时列表保持原样, 错误提示由
// request.ts 拦截器统一弹出
//
// 页面上的入口:
//   新建 → /knowledge-bases/new(表单页, 新建模式)
//   名称 → /knowledge-bases/:id(详情页)
//   编辑 → /knowledge-bases/:id/edit(表单页, 编辑模式)
//   删除 → DELETE /api/knowledge/bases/:id

type VisibilityFilter = 'all' | KnowledgeBaseVisibility

const visibilityFilterOptions: { value: VisibilityFilter; label: string }[] = [
  { value: 'all', label: '全部可见性' },
  ...visibilityOptions,
]

function KnowledgeBaseListPage() {
  const navigate = useNavigate()
  const { message } = AntdApp.useApp()
  const [bases, setBases] = useState<KnowledgeBase[]>([])
  // 首屏就要拉列表: loading 直接初始为 true, 省去在 effect 里同步 setState
  const [loading, setLoading] = useState(true)
  const [keyword, setKeyword] = useState('')
  const [visibility, setVisibility] = useState<VisibilityFilter>('all')
  // 正在删除的知识库 id: 只让该行的按钮显示 loading
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const loadBases = useCallback(async () => {
    try {
      const list = await fetchKnowledgeBases()
      setBases(list)
    } catch {
      // 拦截器已弹全局错误提示, 这里只需要保证 loading 收尾
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadBases()
  }, [loadBases])

  // 搜索 + 可见性筛选: 演示阶段直接在前端过滤;
  // 真实项目数据量大时, 应改成把条件传给服务端做分页查询
  const visibleBases = useMemo(() => {
    const kw = keyword.trim().toLowerCase()
    return bases.filter((base) => {
      const keywordMatched =
        kw === '' ||
        base.name.toLowerCase().includes(kw) ||
        base.description.toLowerCase().includes(kw)
      const visibilityMatched = visibility === 'all' || base.visibility === visibility
      return keywordMatched && visibilityMatched
    })
  }, [bases, keyword, visibility])

  // 删除知识库: 服务端确认后再从列表移除, 避免"删失败但界面已经消失"
  async function handleDelete(base: KnowledgeBase) {
    if (deletingId !== null) return
    setDeletingId(base.id)
    try {
      await removeKnowledgeBase(base.id)
      setBases((prev) => prev.filter((item) => item.id !== base.id))
      message.success(`已删除「${base.name}」`)
    } catch {
      // 拦截器已提示失败原因
    } finally {
      setDeletingId(null)
    }
  }

  const columns: TableColumnsType<KnowledgeBase> = [
    {
      title: '名称',
      dataIndex: 'name',
      render: (_, record) => (
        <div>
          <Link className="learn-kb-base-name" to={`/knowledge-bases/${record.id}`}>
            <DatabaseOutlined />
            {record.name}
          </Link>
          <span className="learn-kb-base-desc">{record.description || '暂无描述'}</span>
        </div>
      ),
    },
    {
      title: '可见性',
      dataIndex: 'visibility',
      width: 110,
      render: (value: KnowledgeBaseVisibility) => (
        <Tag color={visibilityColor[value]}>{visibilityLabel[value]}</Tag>
      ),
    },
    {
      title: '文档数',
      dataIndex: 'documentCount',
      width: 90,
      render: (count: number) => `${count} 份`,
    },
    {
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 150,
      render: (iso: string) => formatDateTime(iso),
    },
    {
      title: '操作',
      width: 150,
      render: (_, record) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => navigate(`/knowledge-bases/${record.id}/edit`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="删除这个知识库?"
            description="删除后不可恢复"
            okText="删除"
            okButtonProps={{ danger: true, loading: deletingId === record.id }}
            onConfirm={() => handleDelete(record)}
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <div className="learn-demo">
      <div className="learn-kb-page-head">
        <div>
          <h3>知识库列表</h3>
          <p className="learn-kb-tip">
            管理知识库的名称、描述与可见性; 点击名称进入详情, 右上角可新建。
          </p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/knowledge-bases/new')}
        >
          新建知识库
        </Button>
      </div>

      <Space wrap>
        <Input.Search
          allowClear
          placeholder="搜索名称或描述"
          style={{ width: 240 }}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
        />
        <Select<VisibilityFilter>
          value={visibility}
          onChange={setVisibility}
          options={visibilityFilterOptions}
          style={{ width: 140 }}
        />
      </Space>

      <Table
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={visibleBases}
        loading={loading}
        // 演示数据不多: 前端分页即可; 真实项目把页码一起传给服务端
        pagination={{ pageSize: 8, hideOnSinglePage: true }}
        locale={{
          emptyText: (
            <Empty
              description={
                bases.length === 0 ? '还没有知识库, 点右上角新建一个' : '没有匹配的知识库'
              }
            />
          ),
        }}
      />
    </div>
  )
}

export default KnowledgeBaseListPage
