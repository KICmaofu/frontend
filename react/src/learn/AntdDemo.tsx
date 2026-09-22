import { useState } from 'react'
import {
  App as AntdApp,
  Button,
  Card,
  ConfigProvider,
  Form,
  Input,
  Pagination,
  Select,
  Space,
  Table,
  Tag,
} from 'antd'
import type { FormProps, TableColumnsType } from 'antd'
import enUS from 'antd/locale/en_US'

// ── Ant Design 组件库 ───────────────────────────────────────
// antd 提供现成的企业级 React 组件: 按钮 / 表单 / 表格 / 弹层等,
// 键盘操作、无障碍、加载态、禁用态这些细节都已处理好;
// 用法是"通过 props 声明行为", 数据和状态仍然由 React 自己管理
//
// 全局配置在 src/main.tsx: <ConfigProvider locale={zhCN} theme={...}>
// 本页的提示、确认框、表单校验都基于这份全局配置

// ── 1. 基础组件: Button / Tag ───────────────────────────────

function BasicDemo() {
  // loading 是普通 state: 点击后置 true, 模拟一次耗时操作后再置回 false;
  // 处于 loading 的按钮会自动屏蔽重复点击
  const [loading, setLoading] = useState(false)

  const runMockTask = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 800)
  }

  return (
    <Card size="small">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Space wrap>
          <Button type="primary">主要按钮</Button>
          <Button>默认按钮</Button>
          <Button type="dashed">虚线按钮</Button>
          <Button type="text">文本按钮</Button>
          <Button type="link">链接按钮</Button>
        </Space>

        <Space wrap>
          <Button type="primary" danger>
            危险操作
          </Button>
          <Button type="primary" disabled>
            禁用
          </Button>
          <Button type="primary" size="large">
            Large
          </Button>
          <Button size="small">Small</Button>
          <Button type="primary" loading={loading} onClick={runMockTask}>
            {loading ? '处理中…' : 'loading 防重复点击'}
          </Button>
        </Space>

        <Space wrap>
          <Tag>默认标签</Tag>
          <Tag color="success">已完成</Tag>
          <Tag color="processing">进行中</Tag>
          <Tag color="warning">待开始</Tag>
          <Tag color="error">已逾期</Tag>
        </Space>
      </Space>
    </Card>
  )
}

// ── 2. 数据展示: Table 用 columns + dataSource 描述 ─────────

interface PlanRow {
  key: number
  topic: string
  progress: '已完成' | '进行中' | '待开始'
  owner: string
}

const planRows: PlanRow[] = [
  { key: 1, topic: 'JSX 与函数组件', progress: '已完成', owner: '小明' },
  { key: 2, topic: 'Props 与 State', progress: '已完成', owner: '小明' },
  { key: 3, topic: 'Ant Design 接入', progress: '进行中', owner: '小红' },
  { key: 4, topic: 'Axios 封装与拦截器', progress: '待开始', owner: '小刚' },
]

const progressColor: Record<PlanRow['progress'], string> = {
  已完成: 'success',
  进行中: 'processing',
  待开始: 'default',
}

// columns 描述"有哪些列、每列怎么渲染", dataSource 是数据本身
const planColumns: TableColumnsType<PlanRow> = [
  { title: '学习主题', dataIndex: 'topic' },
  {
    title: '进度',
    dataIndex: 'progress',
    width: 120,
    // 自定义渲染: 把"进度"字段映射成不同颜色的 Tag, 数据本身不用变
    render: (value: PlanRow['progress']) => <Tag color={progressColor[value]}>{value}</Tag>,
  },
  { title: '负责人', dataIndex: 'owner', width: 120 },
]

function TableDemo() {
  return (
    <Card size="small">
      <Table columns={planColumns} dataSource={planRows} size="small" pagination={false} />
    </Card>
  )
}

// ── 3. 反馈组件: message / modal / notification ─────────────

function FeedbackDemo() {
  // App.useApp() 从上下文里取实例: 弹出来的提示会应用全局主题与中文;
  // 直接 import { message } from 'antd' 用静态方法拿不到上下文, 不推荐
  const { message, modal, notification } = AntdApp.useApp()

  const openConfirm = () => {
    modal.confirm({
      title: '确认删除这条记录?',
      content: '删除后不可恢复(纯演示, 不会真的删东西)',
      okText: '删除',
      okType: 'danger',
      cancelText: '再想想',
      onOk: () =>
        new Promise<void>((resolve) => {
          // onOk 返回 Promise 时, 确认按钮会自动进入 loading, 直到 resolve 才关闭弹窗
          setTimeout(() => {
            message.success('删除成功(演示)')
            resolve()
          }, 800)
        }),
    })
  }

  return (
    <Card size="small">
      <Space wrap>
        <Button onClick={() => message.success('保存成功')}>message: 轻量提示</Button>
        <Button onClick={openConfirm}>modal.confirm: 确认框</Button>
        <Button
          onClick={() =>
            notification.info({
              message: '有新版本可用',
              description: '较长的通知内容适合用 notification, 出现在角落且不打断操作',
            })
          }
        >
          notification: 通知
        </Button>
      </Space>
    </Card>
  )
}

// ── 4. 表单: Form 负责校验与取值 ────────────────────────────

interface SignupValues {
  username: string
  role: string
  intro?: string
}

const roleOptions = [
  { value: 'frontend', label: '前端' },
  { value: 'backend', label: '后端' },
  { value: 'designer', label: '设计师' },
]

function FormSection() {
  const { message } = AntdApp.useApp()
  const [submitted, setSubmitted] = useState<SignupValues | null>(null)

  // 走到 onFinish 说明 rules 校验全部通过, values 就是表单数据
  const onFinish: FormProps<SignupValues>['onFinish'] = (values) => {
    setSubmitted(values)
    message.success('校验通过, 表单已提交')
  }

  return (
    <Card size="small">
      <Form<SignupValues> layout="vertical" onFinish={onFinish} style={{ maxWidth: 400 }}>
        <Form.Item
          name="username"
          label="用户名"
          rules={[
            { required: true, message: '请输入用户名' },
            { min: 2, message: '用户名至少 2 个字符' },
          ]}
        >
          <Input placeholder="直接点提交, 观察校验提示" />
        </Form.Item>

        <Form.Item name="role" label="角色" rules={[{ required: true, message: '请选择角色' }]}>
          <Select placeholder="请选择" options={roleOptions} />
        </Form.Item>

        <Form.Item name="intro" label="简介(选填)">
          <Input.TextArea rows={2} maxLength={50} showCount placeholder="最多 50 字" />
        </Form.Item>

        <Space>
          <Button type="primary" htmlType="submit">
            提交
          </Button>
          <Button htmlType="reset">重置</Button>
        </Space>
      </Form>

      {submitted && (
        <p style={{ marginTop: 12 }}>onFinish 收到的数据: {JSON.stringify(submitted)}</p>
      )}
    </Card>
  )
}

// ── 5. ConfigProvider: 全局配置与"就近覆盖" ─────────────────

function LocaleDemo() {
  return (
    <Card size="small">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <p>main.tsx 配置的全局中文:</p>
          <Pagination defaultCurrent={1} total={50} showSizeChanger />
        </div>
        <div>
          <p>嵌套一个 ConfigProvider 切到英文, 只影响被它包住的组件:</p>
          <ConfigProvider locale={enUS}>
            <Pagination defaultCurrent={1} total={50} showSizeChanger />
          </ConfigProvider>
        </div>
      </Space>
    </Card>
  )
}

// ── 页面装配 ────────────────────────────────────────────────

function AntdDemo() {
  return (
    <div className="learn-demo">
      <h3>1. 基础组件: Button / Tag, 行为由 props 声明</h3>
      <BasicDemo />

      <h3>2. 数据展示: Table 用 columns + dataSource 描述</h3>
      <TableDemo />

      <h3>3. 反馈组件: message / modal / notification</h3>
      <FeedbackDemo />

      <h3>4. 表单: Form 校验规则与提交取值</h3>
      <FormSection />

      <h3>5. ConfigProvider: 全局配置与局部覆盖</h3>
      <LocaleDemo />
    </div>
  )
}

export default AntdDemo
