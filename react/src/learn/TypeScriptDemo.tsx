import { useRef, useState } from 'react'
import type { ReactNode } from 'react'

// ── TypeScript 进阶: 接口 / 泛型 / 类型断言 / 类型封装 ────────
// 一条主线: 类型是"写给编译器和队友的说明书", 只在编译期存在, 运行时全部抹掉;
// 类型写得越准确, 编辑器能替你提前发现的错误就越多
//
// 四个小节各配一个可运行的小例子, 对照注释阅读效果更好

// ── 1. 接口 interface: 描述"对象长什么样" ────────────────────

// 必选 / 可选(?) / 只读(readonly): 最常用的三个成员修饰符
interface User {
  id: number
  name: string
  email?: string // 可选属性: 允许整个字段缺席
  readonly role: string // 只读属性: 赋值后不允许再改(仅编译期约束)
}

// 接口继承(extends): AdminUser 拥有 User 的全部成员, 再追加自己的
interface AdminUser extends User {
  permissions: string[]
}

// interface 还是 type?
// - 描述对象形状 -> 优先 interface: 能 extends 继承, 同名接口可自动合并声明
// - 需要联合类型或类型运算(如第 3、4 节的 as const、Omit) -> 用 type 别名

const users: (User | AdminUser)[] = [
  { id: 1, name: '小明', email: 'xiaoming@example.com', role: 'member' },
  { id: 2, name: '小红', role: 'member' }, // 省略可选属性 email
  { id: 3, name: '老张', role: 'admin', permissions: ['用户管理', '内容审核'] },
]

// 用 in 运算符收窄联合类型: permissions 是 AdminUser 独有的, 检查它就能区分两种对象
function describeUser(user: User | AdminUser): string {
  if ('permissions' in user) {
    // 进入这个分支后, TS 已把 user 收窄为 AdminUser
    return `${user.name} 管理员(权限: ${user.permissions.join('、')})`
  }
  return `${user.name} 普通用户`
}

function InterfaceSection() {
  return (
    <>
      <div className="learn-card">
        <h4>用户列表: 数据按 User / AdminUser 接口约束</h4>
        <ul>
          {users.map((user) => (
            <li key={user.id}>
              <span>{describeUser(user)}</span>
              {/* email 是可选属性: 缺席时读到 undefined, 用 ?? 给出默认值 */}
              <span className="learn-tag">{user.email ?? '未填邮箱'}</span>
            </li>
          ))}
        </ul>
      </div>
      <p>
        describeUser 用 in 运算符收窄联合类型: 检查到 permissions 就当 AdminUser
        处理。role 声明为 readonly 只是编译期约束, 想真正冻结对象要用 Object.freeze
      </p>
    </>
  )
}

// ── 2. 泛型: 类型也可以当参数传入 ─────────────────────────────

// 泛型函数: T 是类型参数, 调用时从实参自动推导(也可显式写 firstOf<number>(...))
function firstOf<T>(items: T[]): T | undefined {
  return items[0]
}

// 泛型约束(extends): T 至少要"有 length", 否则函数体里访问不到 value.length
function getLength<T extends { length: number }>(value: T): number {
  return value.length
}

// 泛型接口 + 泛型组件: 同一份列表 UI, 适配任意数据类型与任意渲染方式
interface DataListProps<T> {
  items: T[]
  renderItem: (item: T, index: number) => ReactNode
  emptyText?: string
}

function DataList<T>({ items, renderItem, emptyText = '暂无数据' }: DataListProps<T>) {
  if (items.length === 0) {
    return <p>{emptyText}</p>
  }
  return (
    <ul>
      {items.map((item, index) => (
        // 泛型数据没有统一的唯一字段, 静态演示用 index 作 key 即可
        <li key={index}>{renderItem(item, index)}</li>
      ))}
    </ul>
  )
}

function GenericSection() {
  return (
    <>
      <div className="learn-card">
        <h4>泛型函数: 一次定义, 类型随实参推导</h4>
        <p>
          firstOf([10, 20, 30]) 推导出 number | undefined, 结果是 {firstOf([10, 20, 30])}
        </p>
        <p>
          firstOf(['TypeScript', 'React']) 推导出 string | undefined, 结果是{' '}
          {firstOf(['TypeScript', 'React']) ?? '空数组'}
        </p>
        <p>
          getLength 带约束 T extends {'{ length: number }'}: 字符串 {getLength('TypeScript')},
          数组 {getLength([1, 2, 3])}
        </p>
      </div>

      <div className="learn-card">
        <h4>泛型组件 DataList: 数据类型和渲染方式都由调用方决定</h4>
        <p>数据一: string[], 渲染成标签</p>
        <DataList
          items={['JSX', 'Hooks', 'Router']}
          renderItem={(item, index) => (
            <span className="learn-tag">
              {index + 1}. {item}
            </span>
          )}
        />
        <p>数据二: 接口数组, 渲染成文本</p>
        <DataList
          items={users}
          renderItem={(user) => (
            <span>
              {user.name} · {user.role}
            </span>
          )}
        />
      </div>
    </>
  )
}

// ── 3. 类型断言: 对编译器说"相信我" ──────────────────────────
// 断言家族速览:
// - 值 as 类型:   收窄/转换类型, 不做任何运行时检查
// - 值 as const:  字面量常量断言, 保留字面量类型并加只读
// - 值!:          非空断言, 断言"一定不是 null / undefined"
// - x as unknown as T: 双重断言(先放大再收窄), 最后手段, 能重构就重构
//
// 断言只影响编译期: 数据真错了照样会崩; 更稳的做法是先做运行时检查, 检查通过再断言

interface ParsedUser {
  name: string
  age: number
}

type ParseResult = { ok: true; user: ParsedUser } | { ok: false; error: string }

// JSON.parse 的返回值是 any: 用 as 把它断言成"候选形状", 再用 typeof 逐项做运行时检查
function parseUser(text: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: '不是合法的 JSON 文本' }
  }

  // Partial<T> 把全部字段变成可选: 字段有没有值, 交给下面的检查判断
  const data = raw as Partial<ParsedUser>

  if (typeof data.name !== 'string') {
    return { ok: false, error: `name 期望 string, 实际是 ${typeof data.name}` }
  }
  if (typeof data.age !== 'number') {
    return { ok: false, error: `age 期望 number, 实际是 ${typeof data.age}` }
  }
  // 运行检查通过后, TS 按 typeof 收窄了类型, 这里可以安全地构造结果
  return { ok: true, user: { name: data.name, age: data.age } }
}

// as const: 字面量数组加了这个后缀, 类型从 string[] 变为只读元组,
// 每个元素都是"字面量类型", 再用 typeof + [number] 反推出联合类型
const SIZE_OPTIONS = ['small', 'middle', 'large'] as const
type Size = (typeof SIZE_OPTIONS)[number] // 'small' | 'middle' | 'large'

// Record 要求键必须齐全: 以后给 SIZE_OPTIONS 加一项, 这里会立刻报错提醒补标签
const sizeLabel: Record<Size, string> = { small: '小', middle: '中', large: '大' }

function AssertionSection() {
  const [jsonText, setJsonText] = useState('{"name": "小明", "age": 18}')
  const [result, setResult] = useState<ParseResult | null>(null)
  const [size, setSize] = useState<Size>('middle')
  const jsonRef = useRef<HTMLTextAreaElement>(null)

  return (
    <>
      <div className="learn-card">
        <h4>as 断言: 断言前先做运行时检查, 断言后才能放心用</h4>
        <textarea
          ref={jsonRef}
          className="learn-code-input"
          rows={2}
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
        />
        <div className="learn-row">
          <button type="button" className="learn-btn" onClick={() => setResult(parseUser(jsonText))}>
            解析
          </button>
          <button type="button" className="learn-btn" onClick={() => setJsonText('{"age": "18"}')}>
            填入坏数据
          </button>
          {/* 非空断言 !: 断言 ref.current 一定不为 null。
              事件回调执行时输入框必然已挂载, 所以这里是安全的;
              若元素可能不存在, 应该用 if (node) 收窄, 而不是 ! 硬断言 */}
          <button type="button" className="learn-btn" onClick={() => jsonRef.current!.focus()}>
            聚焦输入框(! 断言)
          </button>
        </div>
        {result &&
          (result.ok ? (
            <p>
              解析成功: name = {result.user.name}, age = {result.user.age}
            </p>
          ) : (
            <p className="learn-error">解析失败: {result.error}</p>
          ))}
      </div>

      <div className="learn-card">
        <h4>as const: 值不拓宽, 从数据反推出字面量联合类型</h4>
        <div className="learn-row">
          {SIZE_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              className={option === size ? 'learn-btn active' : 'learn-btn'}
              onClick={() => setSize(option)}
            >
              {sizeLabel[option]}
            </button>
          ))}
        </div>
        <p>
          当前选中: {sizeLabel[size]}, state 的类型是 Size({SIZE_OPTIONS.join(' | ')}),
          传其他值编译不过
        </p>
      </div>
    </>
  )
}

// ── 4. 类型封装: 一份基础类型, 派生全套配套类型 ────────────────
// 思路: 找到"只写一次"的源头 —— 基础模型只定义一遍, 表单类型、更新类型、
// 分页类型全部由它派生; 源头改了字段, 派生类型自动跟着变, 不会再"改了模型忘改表单"

interface Task {
  id: number
  title: string
  done: boolean
  createdAt: string
}

// Omit: 新建表单不需要 id 和 createdAt 这两个"系统字段"
type TaskDraft = Omit<Task, 'id' | 'createdAt'>

// Partial + Omit: 更新时"想改哪个字段就传哪个", 不传的字段保持原样
type TaskPatch = Partial<Omit<Task, 'id' | 'createdAt'>>

// Record: 键必须来自联合类型且一个都不能少, 漏写或写错键都会在编译期报错
type TaskAction = 'create' | 'toggle' | 'remove'
const taskActionLabel: Record<TaskAction, string> = {
  create: '新建',
  toggle: '切换完成',
  remove: '删除',
}

// 泛型封装: 分页是典型的"骨架 + 泛型内容"结构, 换个 T 就能复用于任何列表接口
interface PageResult<T> {
  list: T[]
  total: number
}

function paginate<T>(items: T[], page: number, pageSize: number): PageResult<T> {
  const start = (page - 1) * pageSize
  return { list: items.slice(start, start + pageSize), total: items.length }
}

const PAGE_SIZE = 3

const initialTasks: Task[] = [
  { id: 1, title: '读完 interface 与 type 的区别', done: true, createdAt: '10-01' },
  { id: 2, title: '写一个泛型函数', done: false, createdAt: '10-02' },
  { id: 3, title: '给接口加上可选与只读属性', done: false, createdAt: '10-03' },
  { id: 4, title: '用工具类型派生 TaskPatch', done: false, createdAt: '10-04' },
  { id: 5, title: '把分页逻辑封装成泛型函数', done: false, createdAt: '10-05' },
]

function TaskBoard() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [page, setPage] = useState(1)

  // 新增: 入参限定为 TaskDraft, 调用方根本拿不到 id / createdAt,
  // 系统字段的生成全部收在封装内部
  const addTask = () => {
    const draft: TaskDraft = { title: `新任务 ${tasks.length + 1}`, done: false }
    const next: Task[] = [...tasks, { ...draft, id: Date.now(), createdAt: '今天' }]
    setTasks(next)
    setPage(Math.ceil(next.length / PAGE_SIZE))
  }

  // 更新: 入参限定为 TaskPatch, 只传要改的字段, 不传的字段保持原样
  const patchTask = (id: number, patch: TaskPatch) => {
    setTasks((prev) => prev.map((task) => (task.id === id ? { ...task, ...patch } : task)))
  }

  const pageCount = Math.max(1, Math.ceil(tasks.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const { list, total } = paginate(tasks, current, PAGE_SIZE)

  return (
    <div className="learn-card">
      <h4>任务面板: 新增只收 TaskDraft, 更新只收 TaskPatch</h4>
      <ul>
        {list.map((task) => (
          <li key={task.id}>
            <label className="learn-checkbox-line">
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => patchTask(task.id, { done: !task.done })}
              />
              <span style={{ textDecoration: task.done ? 'line-through' : 'none' }}>
                {task.title}
              </span>
            </label>
            <span className="learn-tag">{task.createdAt}</span>
          </li>
        ))}
      </ul>

      <div className="learn-row">
        <button type="button" className="learn-btn" onClick={addTask}>
          新增一条
        </button>
        <button
          type="button"
          className="learn-btn"
          disabled={current <= 1}
          onClick={() => setPage(current - 1)}
        >
          上一页
        </button>
        <button
          type="button"
          className="learn-btn"
          disabled={current >= pageCount}
          onClick={() => setPage(current + 1)}
        >
          下一页
        </button>
      </div>

      <p>
        分页由泛型 paginate 计算: 第 {current} / {pageCount} 页, 共 {total} 条;
        动作标签由 Record 约束: {taskActionLabel.create} / {taskActionLabel.toggle} /{' '}
        {taskActionLabel.remove}
      </p>
      <p>
        {'本项目中的同类封装: request.ts 的 ApiResponse<T> / request<T>(), '}
        {'todo.ts 的 TodoItem / Profile, routes.ts 的 LearnRoute, 可对照源码阅读'}
      </p>
    </div>
  )
}

// ── 页面装配 ────────────────────────────────────────────────

function TypeScriptDemo() {
  return (
    <div className="learn-demo">
      <h3>1. 接口 interface: 描述对象形状</h3>
      <InterfaceSection />

      <h3>2. 泛型: 类型当参数, 一份代码适配多种数据</h3>
      <GenericSection />

      <h3>3. 类型断言: as / as const / 非空 !</h3>
      <AssertionSection />

      <h3>4. 类型封装: 一份基础类型, 派生全套配套类型</h3>
      <TaskBoard />
    </div>
  )
}

export default TypeScriptDemo
