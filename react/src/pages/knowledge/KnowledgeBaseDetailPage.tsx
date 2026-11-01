import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  App as AntdApp,
  Button,
  Descriptions,
  Popconfirm,
  Space,
  Spin,
  Tag,
} from 'antd'
import { ArrowLeftOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons'
import { fetchKnowledgeBase, removeKnowledgeBase } from '../../api/knowledge'
import type { KnowledgeBase } from '../../api/knowledge'
import { formatDateTime } from '../../utils/format'
import { visibilityColor, visibilityLabel } from './visibility'

// ── 知识库详情页(CRUD 中的 R: 单条 + D 入口) ─────────────────
// 按路由参数 GET /api/knowledge/bases/:id 拉单条数据;
// 编辑跳到表单页, 删除成功后返回列表页
//
// 详情与列表各自请求接口: 刷新详情页时不必先加载整张列表,
// 也便于以后给详情页单独加权限、文档列表等数据

function KnowledgeBaseDetailPage() {
  const { id: idParam } = useParams()
  const navigate = useNavigate()
  const { message } = AntdApp.useApp()
  // 记录"哪个 id 的详情已经返回": 与当前路由不一致时就是"加载中";
  // base 为 null 表示接口明确返回失败(知识库不存在)
  const [result, setResult] = useState<{ id: number; base: KnowledgeBase | null } | null>(null)
  const [deleting, setDeleting] = useState(false)

  const id = idParam === undefined ? null : Number(idParam)
  // 编号缺失或非法时, 渲染阶段就能判定"不存在", 不用发请求
  const invalidId = id === null || !Number.isInteger(id)
  const loading = !invalidId && result?.id !== id
  const base = !invalidId && result?.id === id ? result.base : null

  useEffect(() => {
    if (id === null || invalidId) return

    // cancelled: 快速切换 / 离开页面时, 旧响应不再写入状态
    let cancelled = false
    fetchKnowledgeBase(id)
      .then((data) => {
        if (!cancelled) setResult({ id, base: data })
      })
      .catch(() => {
        // 拦截器已提示; 记下失败, 下面显示"不存在"
        if (!cancelled) setResult({ id, base: null })
      })

    return () => {
      cancelled = true
    }
  }, [id, invalidId])

  async function handleDelete() {
    if (!base || deleting) return
    setDeleting(true)
    try {
      await removeKnowledgeBase(base.id)
      message.success(`已删除「${base.name}」`)
      // replace: 返回列表时不再回到已删除的详情页
      navigate('/knowledge-bases', { replace: true })
    } catch {
      // 拦截器已提示
    } finally {
      setDeleting(false)
    }
  }

  if (!invalidId && loading) {
    return (
      <div className="learn-demo">
        <div className="learn-kb-loading">
          <Spin size="large" />
        </div>
      </div>
    )
  }

  if (invalidId || !base) {
    return (
      <div className="learn-demo">
        <div className="learn-kb-page-head">
          <div>
            <h3>知识库详情</h3>
            <p className="learn-kb-tip">没有找到对应的知识库, 它可能已被删除。</p>
          </div>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/knowledge-bases')}>
            返回列表
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="learn-demo">
      <div className="learn-kb-page-head">
        <div>
          <Button
            type="link"
            size="small"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/knowledge-bases')}
          >
            返回列表
          </Button>
          <h3>{base.name}</h3>
          <p className="learn-kb-tip">
            创建于 {formatDateTime(base.createdAt)} · 最近更新 {formatDateTime(base.updatedAt)}
          </p>
        </div>
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => navigate(`/knowledge-bases/${base.id}/edit`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="删除这个知识库?"
            description="删除后不可恢复"
            okText="删除"
            okButtonProps={{ danger: true, loading: deleting }}
            onConfirm={handleDelete}
          >
            <Button danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      </div>

      <Descriptions bordered size="middle" column={{ xs: 1, sm: 1, md: 2 }}>
        <Descriptions.Item label="知识库名称">{base.name}</Descriptions.Item>
        <Descriptions.Item label="可见性">
          <Tag color={visibilityColor[base.visibility]}>{visibilityLabel[base.visibility]}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="文档数">{base.documentCount} 份</Descriptions.Item>
        <Descriptions.Item label="知识库编号">#{base.id}</Descriptions.Item>
        <Descriptions.Item label="创建时间">{formatDateTime(base.createdAt)}</Descriptions.Item>
        <Descriptions.Item label="更新时间">{formatDateTime(base.updatedAt)}</Descriptions.Item>
        <Descriptions.Item label="描述" span={2}>
          <p className="learn-kb-detail-desc">{base.description || '暂无描述'}</p>
        </Descriptions.Item>
      </Descriptions>
    </div>
  )
}

export default KnowledgeBaseDetailPage
