import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { App as AntdApp, Button, Form, Input, Result, Select, Space, Spin } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import {
  createKnowledgeBase,
  fetchKnowledgeBase,
  updateKnowledgeBase,
} from '../../api/knowledge'
import type { KnowledgeBaseInput, KnowledgeBaseVisibility } from '../../api/knowledge'
import { visibilityOptions } from './visibility'

// ── 知识库表单页(CRUD 中的 C / U) ───────────────────────────
// 新建与编辑共用同一个组件, 由路由参数区分模式:
//   /knowledge-bases/new      → 新建: POST /api/knowledge/bases
//   /knowledge-bases/:id/edit → 编辑: 先 GET 详情回填表单, 提交走 PATCH
//
// 校验规则前后端各写一份: 前端负责即时提示, 后端(mock)负责兜底;
// 提交失败时停留在表单页, 已填内容不丢, 错误提示由拦截器统一弹出

interface KnowledgeBaseFormValues {
  name: string
  // TextArea 未填时是 undefined, 提交前统一转成空字符串
  description?: string
  visibility: KnowledgeBaseVisibility
}

function KnowledgeBaseFormPage() {
  const { id: idParam } = useParams()
  const navigate = useNavigate()
  const { message } = AntdApp.useApp()
  const [form] = Form.useForm<KnowledgeBaseFormValues>()

  // 有 :id 就是编辑模式; 非法编号(如 /abc/edit)按"不存在"处理
  const id = idParam === undefined ? null : Number(idParam)
  const editing = id !== null
  // 非法编号在渲染时就能判定, 不用等 effect 里再 setState
  const invalidId = id !== null && !Number.isInteger(id)
  const [submitting, setSubmitting] = useState(false)
  // 记录"哪个 id 的详情已经回填完 / 拉取失败": 切换编辑对象时,
  // 旧数据不会短暂闪在表单里, 也不会把新 id 误判成失败
  const [loadedId, setLoadedId] = useState<number | null>(null)
  const [failedId, setFailedId] = useState<number | null>(null)
  const loading = editing && !invalidId && loadedId !== id && failedId !== id
  const missing = editing && !invalidId && failedId === id

  useEffect(() => {
    if (id === null || invalidId) return

    // cancelled: 详情还没回来用户就离开页面时, 不再回填 / 改状态
    let cancelled = false
    fetchKnowledgeBase(id)
      .then((base) => {
        if (cancelled) return
        form.setFieldsValue({
          name: base.name,
          description: base.description,
          visibility: base.visibility,
        })
        setLoadedId(id)
      })
      .catch(() => {
        // 拦截器已提示; 详情拉不到就展示"不存在", 而不是留一张空表单
        if (cancelled) return
        setFailedId(id)
      })

    return () => {
      cancelled = true
    }
  }, [id, invalidId, form])

  async function handleFinish(values: KnowledgeBaseFormValues) {
    if (submitting) return
    setSubmitting(true)

    const input: KnowledgeBaseInput = {
      name: values.name.trim(),
      description: values.description?.trim() ?? '',
      visibility: values.visibility,
    }

    try {
      // 编辑与新建只有调用的接口不同, 成功后都跳到详情页看结果
      const saved =
        editing && id !== null
          ? await updateKnowledgeBase(id, input)
          : await createKnowledgeBase(input)
      message.success(editing ? '知识库已更新' : '知识库已创建')
      navigate(`/knowledge-bases/${saved.id}`, { replace: true })
    } catch {
      // 拦截器已提示失败原因, 留在表单页让用户修改后重试
    } finally {
      setSubmitting(false)
    }
  }

  if (missing || invalidId) {
    return (
      <div className="learn-demo">
        <Result
          status="404"
          title="知识库不存在"
          subTitle="它可能已被删除, 或链接中的编号不正确"
          extra={
            <Button type="primary" onClick={() => navigate('/knowledge-bases')}>
              返回列表
            </Button>
          }
        />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="learn-demo">
        <div className="learn-kb-loading">
          <Spin size="large" />
        </div>
      </div>
    )
  }

  return (
    <div className="learn-demo">
      <div className="learn-kb-page-head">
        <div>
          <h3>{editing ? '编辑知识库' : '新建知识库'}</h3>
          <p className="learn-kb-tip">名称必填且不可重名; 描述与可见性可以随时修改。</p>
        </div>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/knowledge-bases')}>
          返回列表
        </Button>
      </div>

      <Form
        className="learn-kb-form"
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        initialValues={{ visibility: 'team' }}
      >
        <Form.Item
          label="名称"
          name="name"
          rules={[
            { required: true, whitespace: true, message: '请输入知识库名称' },
            { max: 40, message: '名称不能超过 40 个字符' },
          ]}
        >
          <Input placeholder="例如: 产品需求资料库" maxLength={40} showCount />
        </Form.Item>

        <Form.Item
          label="描述"
          name="description"
          rules={[{ max: 200, message: '描述不能超过 200 个字符' }]}
        >
          <Input.TextArea
            rows={4}
            placeholder="简单说明这个知识库收录什么内容"
            maxLength={200}
            showCount
          />
        </Form.Item>

        <Form.Item
          label="可见性"
          name="visibility"
          rules={[{ required: true, message: '请选择可见性' }]}
        >
          <Select options={visibilityOptions} />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={submitting}>
              保存
            </Button>
            <Button onClick={() => navigate('/knowledge-bases')}>取消</Button>
          </Space>
        </Form.Item>
      </Form>
    </div>
  )
}

export default KnowledgeBaseFormPage
