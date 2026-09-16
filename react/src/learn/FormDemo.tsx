import { useRef, useState } from 'react'
import type { ChangeEvent, FormEvent, MouseEvent } from 'react'

// ── 表单绑定与事件处理 ─────────────────────────────────────
// 受控组件: 表单值由 state 说了算, value + onChange 成对出现, state 是"唯一数据源"
// 非受控组件: 表单值由 DOM 自己保管,需要时用 useRef 去读

// ── 1. 受控组件 ─────────────────────────────────────────────

interface ProfileForm {
  nickname: string
  bio: string
  city: string
  subscribe: boolean
  skills: string[]
}

const initialProfile: ProfileForm = {
  nickname: '',
  bio: '',
  city: 'shanghai',
  subscribe: true,
  skills: [],
}

const skillOptions = ['React', 'TypeScript', 'Vite']

function ControlledForm() {
  const [form, setForm] = useState(initialProfile)

  // 多个字段共用一个更新函数: 接收 Partial 补丁对象,展开合并成新 state
  // 好处是字段名和值的类型一一对应,写错字段编译器会报错
  const updateField = (patch: Partial<ProfileForm>) => {
    setForm({ ...form, ...patch })
  }

  // 复选框组: 勾选加入数组,取消勾选过滤掉
  const toggleSkill = (skill: string, checked: boolean) => {
    setForm({
      ...form,
      skills: checked ? [...form.skills, skill] : form.skills.filter((s) => s !== skill),
    })
  }

  return (
    <div className="learn-card">
      <label className="learn-field">
        昵称(文本输入框: value + onChange)
        <input
          value={form.nickname}
          onChange={(e) => updateField({ nickname: e.target.value })}
          placeholder="值来自 state,输入即同步"
        />
      </label>

      <label className="learn-field">
        简介(textarea 也是 value + onChange)
        <textarea
          value={form.bio}
          onChange={(e) => updateField({ bio: e.target.value })}
          placeholder="试试在这里输入"
          rows={2}
        />
      </label>

      <label className="learn-field">
        城市(select 绑选中项的 value)
        <select value={form.city} onChange={(e) => updateField({ city: e.target.value })}>
          <option value="shanghai">上海</option>
          <option value="beijing">北京</option>
          <option value="guangzhou">广州</option>
        </select>
      </label>

      <label className="learn-checkbox-line">
        <input
          type="checkbox"
          checked={form.subscribe}
          onChange={(e) => updateField({ subscribe: e.target.checked })}
        />
        单个复选框绑 boolean(订阅更新,注意读的是 e.target.checked)
      </label>

      <div className="learn-field">
        <span>复选框组绑数组(会的技能)</span>
        <div className="learn-row">
          {skillOptions.map((skill) => (
            <label key={skill} className="learn-checkbox-line">
              <input
                type="checkbox"
                checked={form.skills.includes(skill)}
                onChange={(e) => toggleSkill(skill, e.target.checked)}
              />
              {skill}
            </label>
          ))}
        </div>
      </div>

      <p>
        state 实时值: 昵称「{form.nickname || '空'}」/ 城市 {form.city} / 订阅{' '}
        {form.subscribe ? '是' : '否'} / 技能 {form.skills.join('、') || '未选'}
      </p>
    </div>
  )
}

// ── 2. 非受控组件 ───────────────────────────────────────────

function UncontrolledForm() {
  // 用 ref 直接拿真实 DOM 节点,提交时再读值;输入过程完全不经过 state
  const nicknameRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [result, setResult] = useState('(还没提交)')

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault() // 阻止浏览器默认的"提交后整页刷新"
    const nickname = nicknameRef.current?.value.trim() ?? ''
    const fileName = fileRef.current?.files?.[0]?.name ?? '未选择'
    setResult(`读取结果: 昵称「${nickname || '空'}」, 文件「${fileName}」`)
  }

  return (
    <form className="learn-form" onSubmit={handleSubmit}>
      <label className="learn-field">
        昵称(初始值用 defaultValue,和 value 不能同时写)
        <input ref={nicknameRef} defaultValue="小明" />
      </label>
      <label className="learn-field">
        文件(file 类型天然只能非受控)
        <input ref={fileRef} type="file" />
      </label>
      <button type="submit" className="learn-btn">
        提交并从 ref 读取
      </button>
      <p>{result}</p>
      <p>
        取舍: 需要实时校验、字段联动、格式化输入时用受控;只是收集数据、或封装第三方 DOM
        库时用非受控代码更少
      </p>
    </form>
  )
}

// ── 3. 事件处理 ─────────────────────────────────────────────

// 日志条目带自增 id: id 是数据本身的稳定标识,比用数组下标做 key 更可靠
interface EventLog {
  id: number
  text: string
}

// 示例按钮放在组件外,避免每次渲染都重建数组
const demoButtons = ['按钮 A', '按钮 B']

function EventDemo() {
  const [log, setLog] = useState<EventLog[]>([])
  const [keyword, setKeyword] = useState('')
  const nextLogId = useRef(1) // 自增 id 计数器: 不参与渲染,用 ref 跨渲染保存

  const appendLog = (text: string) => {
    // 只保留最近 5 条;每条日志带上唯一 id
    setLog((prev) => [...prev.slice(-4), { id: nextLogId.current++, text }])
  }

  // 类型标注规则: 事件名<绑定元素的 DOM 类型>
  // 鼠标 MouseEvent、输入 ChangeEvent、表单提交 FormEvent,都从 'react' 里 import type
  const handleOuterClick = (e: MouseEvent<HTMLDivElement>) => {
    // target = 实际被点到的元素; currentTarget = 绑定监听器的元素(始终是外层 div)
    const target = e.target as HTMLElement // React 里 target 类型是 EventTarget,读属性要先断言
    appendLog(`外层收到点击: target=${target.tagName}, currentTarget=${e.currentTarget.tagName}`)
  }

  const handleBubbleClick = (e: MouseEvent<HTMLButtonElement>) => {
    appendLog(`普通按钮被点击: currentTarget=${e.currentTarget.tagName}`)
  }

  const handleStopClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation() // 阻止冒泡: 事件不再传给父元素
    appendLog('stopPropagation 按钮被点击: 外层收不到')
  }

  const handleLinkClick = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault() // 阻止默认行为: 链接不再跳转
    appendLog('链接被点击: preventDefault 拦住了跳转')
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setKeyword(e.target.value)
    appendLog(`onChange: 输入值 = ${e.target.value}`)
  }

  // 需要传参时,包一层箭头函数;直接写 onClick={handleItemClick('A')} 会在渲染时立即执行
  const handleItemClick = (label: string) => {
    appendLog(`点了「${label}」`)
  }

  return (
    <div className="learn-card">
      <div className="learn-hotarea" onClick={handleOuterClick}>
        <p>外层容器(绑了 onClick,观察事件冒泡)</p>
        <div className="learn-row">
          <button type="button" className="learn-btn" onClick={handleBubbleClick}>
            普通按钮(会冒泡到外层)
          </button>
          <button type="button" className="learn-btn" onClick={handleStopClick}>
            stopPropagation 按钮
          </button>
        </div>
      </div>

      <div className="learn-row">
        <input value={keyword} onChange={handleChange} placeholder="输入观察 onChange" />
        <a href="https://react.dev" onClick={handleLinkClick}>
          一个点了不跳转的链接
        </a>
        {demoButtons.map((label) => (
          <button
            key={label}
            type="button"
            className="learn-btn"
            onClick={() => handleItemClick(label)}
          >
            {label}
          </button>
        ))}
      </div>

      {log.length === 0 && <p>操作提示(点击上面的元素,这里会记录事件日志)</p>}
      <ul>
        {log.map((item) => (
          <li key={item.id}>{item.text}</li>
        ))}
      </ul>
    </div>
  )
}

// ── 4. 表单提交流程 ─────────────────────────────────────────

interface SignupForm {
  username: string
  email: string
  agree: boolean
}

type SignupErrors = Partial<Record<keyof SignupForm, string>>

const emptySignup: SignupForm = { username: '', email: '', agree: false }

function validateSignup(form: SignupForm): SignupErrors {
  const errors: SignupErrors = {}
  if (!form.username.trim()) {
    errors.username = '用户名不能为空'
  } else if (form.username.trim().length < 2) {
    errors.username = '用户名至少 2 个字符'
  }
  if (!form.email.trim()) {
    errors.email = '邮箱不能为空'
  } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
    errors.email = '邮箱格式不正确'
  }
  if (!form.agree) {
    errors.agree = '需要先勾选同意条款'
  }
  return errors
}

function SignupFormDemo() {
  const [form, setForm] = useState(emptySignup)
  const [errors, setErrors] = useState<SignupErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  const updateField = (patch: Partial<SignupForm>) => {
    setForm({ ...form, ...patch })
    setErrors({}) // 输入时先清掉旧错误,提交时再重新校验
  }

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault() // ① 阻止整页刷新,SPA 表单的第一步

    const nextErrors = validateSignup(form) // ② 校验
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      setMessage('校验没通过,请检查表单')
      return
    }

    setSubmitting(true) // ③ 提交: 真实项目这里是 await fetch(...),用 loading 防重复点击
    setMessage('')
    setTimeout(() => {
      setSubmitting(false)
      setMessage(`提交成功,欢迎 ${form.username}!`)
      setForm(emptySignup) // ④ 重置表单为初始状态
    }, 800)
  }

  return (
    <form className="learn-form" onSubmit={handleSubmit} noValidate>
      <label className="learn-field">
        用户名
        <input
          value={form.username}
          onChange={(e) => updateField({ username: e.target.value })}
          placeholder="必填,至少 2 个字符"
        />
        {errors.username && <span className="learn-error">{errors.username}</span>}
      </label>

      <label className="learn-field">
        邮箱
        <input
          value={form.email}
          onChange={(e) => updateField({ email: e.target.value })}
          placeholder="必填,需符合邮箱格式"
        />
        {errors.email && <span className="learn-error">{errors.email}</span>}
      </label>

      <label className="learn-checkbox-line">
        <input
          type="checkbox"
          checked={form.agree}
          onChange={(e) => updateField({ agree: e.target.checked })}
        />
        我已阅读并同意条款
      </label>
      {errors.agree && <span className="learn-error">{errors.agree}</span>}

      <div className="learn-row">
        <button type="submit" className="learn-btn" disabled={submitting}>
          {submitting ? '提交中…' : '提交表单'}
        </button>
        <button
          type="button"
          className="learn-btn"
          onClick={() => {
            setForm(emptySignup)
            setErrors({})
            setMessage('')
          }}
        >
          重置
        </button>
      </div>

      {message && <p>{message}</p>}
    </form>
  )
}

// ── 页面装配 ────────────────────────────────────────────────

function FormDemo() {
  return (
    <div className="learn-demo">
      <h3>1. 受控组件: value + onChange 覆盖各类表单元素</h3>
      <ControlledForm />

      <h3>2. 非受控组件: 用 useRef 在提交时读值</h3>
      <UncontrolledForm />

      <h3>3. 事件处理: 事件类型标注、事件对象、冒泡与默认行为</h3>
      <EventDemo />

      <h3>4. 表单提交流程: 阻止默认 → 校验 → 提交 → 重置</h3>
      <SignupFormDemo />
    </div>
  )
}

export default FormDemo
