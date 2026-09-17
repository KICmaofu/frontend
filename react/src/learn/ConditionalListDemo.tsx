import { useState } from 'react'

// ── 条件渲染与列表渲染 ──────────────────────────────────────
// 条件渲染: 根据数据决定"渲不渲染 / 渲染哪一个"
//   ① 三元表达式  条件 ? A : B      二选一
//   ② 逻辑与      条件 && 元素      有则显示,无则隐藏
//   ③ if 守卫     提前 return null  整个组件可有可无
// 列表渲染: 用 map 把数组"翻译"成一排 JSX,每项必须带唯一的 key

// 1. 三元表达式: 两个分支都要显示些内容时用它
function TernaryDemo() {
  const [loggedIn, setLoggedIn] = useState(false)

  return (
    <div className="learn-card">
      {loggedIn ? (
        <p>你好,小明!这里是登录后可见的个人主页</p>
      ) : (
        <p>请先登录,再查看个人主页</p>
      )}
      <div className="learn-row">
        <button type="button" className="learn-btn" onClick={() => setLoggedIn(!loggedIn)}>
          {loggedIn ? '退出登录' : '去登录'}
        </button>
      </div>
    </div>
  )
}

// 2. 逻辑与: 有则显示,无则隐藏
// 注意左侧要有比较运算保证结果是布尔值:
// count 为 0 时 JS 的 0 && x 会得到 0(而不是 false),React 会把数字 0 渲染到页面上
function AndShortCircuitDemo() {
  const [count, setCount] = useState(0)

  return (
    <div className="learn-card">
      <div className="learn-row">
        <button type="button" className="learn-btn" onClick={() => setCount((c) => c + 1)}>
          未读消息 +1(当前 {count})
        </button>
        <button type="button" className="learn-btn" onClick={() => setCount(0)}>
          清零
        </button>
      </div>
      <p>
        错误示范 <code>{'{count && <span>...</span>}'}</code> 的渲染结果:{' '}
        {count && <span className="learn-tag">{count} 条新消息</span>}
      </p>
      <p>
        正确示范 <code>{'{count > 0 && <span>...</span>}'}</code> 的渲染结果:{' '}
        {count > 0 && <span className="learn-tag">{count} 条新消息</span>}
      </p>
      <p>点"清零"对比: 错误示范会孤零零渲染出一个 0,正确示范则什么都不渲染</p>
    </div>
  )
}

// 3. if 守卫 + return null: 适合"整块 UI 可有可无"的场景
function NotificationDot({ unread, onClear }: { unread: number; onClear: () => void }) {
  if (unread === 0) {
    // 组件在渲染前直接退出,页面上不会留下任何痕迹
    return null
  }

  return (
    <div className="learn-row">
      <span className="learn-tag">{unread} 条未读</span>
      <button type="button" className="learn-btn" onClick={onClear}>
        全部已读
      </button>
    </div>
  )
}

function ReturnNullDemo() {
  const [unread, setUnread] = useState(2)

  return (
    <div className="learn-card">
      <button type="button" className="learn-btn" onClick={() => setUnread((u) => u + 1)}>
        收到一条新消息
      </button>
      <NotificationDot unread={unread} onClear={() => setUnread(0)} />
      <p>点"全部已读"后整块 UI 消失: 条件写在组件内部,用 if 提前 return null</p>
    </div>
  )
}

// 4. 列表渲染: map + key
// key 是 React 识别"这一项与上次那一项是不是同一个"的凭证
type Row = { id: number; label: string }

const initialRows: Row[] = [
  { id: 1, label: '第 1 行' },
  { id: 2, label: '第 2 行' },
  { id: 3, label: '第 3 行' },
]

// 渲染逻辑相同,只把 key 换掉,用来对比两种写法的行为差异
function RowList({ rows, useIndexKey = false }: { rows: Row[]; useIndexKey?: boolean }) {
  return (
    <ul>
      {rows.map((row, index) => (
        <li key={useIndexKey ? index : row.id}>
          <span>{row.label}</span>
          <input placeholder="随便输入点内容" />
        </li>
      ))}
    </ul>
  )
}

function KeyCompareDemo() {
  const [rowsByIndex, setRowsByIndex] = useState(initialRows)
  const [rowsById, setRowsById] = useState(initialRows)
  const [resetCount, setResetCount] = useState(0)

  const removeFirst = () => {
    setRowsByIndex((rows) => rows.slice(1))
    setRowsById((rows) => rows.slice(1))
  }

  const reset = () => {
    setRowsByIndex(initialRows)
    setRowsById(initialRows)
    setResetCount((c) => c + 1) // 换 key 强制重建列表,清空不受控输入框里的内容
  }

  return (
    <div className="learn-card">
      <div className="learn-row">
        <button
          type="button"
          className="learn-btn"
          onClick={removeFirst}
          disabled={rowsByIndex.length === 0}
        >
          删除第 1 行
        </button>
        <button type="button" className="learn-btn" onClick={reset}>
          重置
        </button>
      </div>
      <p>
        操作对比: 先在两个列表的输入框里输入点内容, 再点"删除第 1 行"。
        index 作 key 时, 第 2 行会被"顶"上来, 但输入框里还留着你刚才打的内容(张冠李戴);
        id 作 key 时, 第 1 行连同它输入的内容整行消失, 其余行纹丝不动
      </p>
      <p>用 index 作 key(有问题):</p>
      <RowList key={`index-${resetCount}`} rows={rowsByIndex} useIndexKey />
      <p>用数据自带 id 作 key(正确):</p>
      <RowList key={`id-${resetCount}`} rows={rowsById} />
    </div>
  )
}

// 5. 条件渲染与列表渲染的组合: 列表为空时显示占位(空状态)
function EmptyStateDemo() {
  const [tags, setTags] = useState(['React', 'TypeScript'])

  return (
    <div className="learn-card">
      {tags.length === 0 ? (
        <p>暂无标签,点"添加"创建一个</p>
      ) : (
        <div className="learn-row">
          {tags.map((tag) => (
            <span key={tag} className="learn-tag">
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="learn-row">
        <button
          type="button"
          className="learn-btn"
          onClick={() => setTags([...tags, `标签 ${tags.length + 1}`])}
        >
          添加
        </button>
        <button
          type="button"
          className="learn-btn"
          onClick={() => setTags([])}
          disabled={tags.length === 0}
        >
          清空
        </button>
      </div>
    </div>
  )
}

function ConditionalListDemo() {
  return (
    <div className="learn-demo">
      <h3>1. 三元表达式: 两个分支二选一</h3>
      <TernaryDemo />

      <h3>2. 逻辑与: 有则显示,无则隐藏</h3>
      <AndShortCircuitDemo />

      <h3>3. if 守卫 + return null: 整个组件可有可无</h3>
      <ReturnNullDemo />

      <h3>4. 列表渲染: map + key,以及 index 作 key 的坑</h3>
      <KeyCompareDemo />

      <h3>5. 组合场景: 列表为空时显示占位</h3>
      <EmptyStateDemo />

      <h3>6. 小结</h3>
      <div className="learn-card">
        <p>二选一用三元; 有 / 无用逻辑与; 组件级开关用 if 守卫 + return null</p>
        <p>
          逻辑与左侧要保证是布尔值(写 <code>{'count > 0 && ...'}</code>),否则 0 会被渲染出来
        </p>
        <p>列表用 数组.map() 渲染,每项必须有唯一且稳定的 key</p>
        <p>key 优先用数据自带 id; 只有列表不增删、不重排时,index 才能凑合当 key</p>
      </div>
    </div>
  )
}

export default ConditionalListDemo
