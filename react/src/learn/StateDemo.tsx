import { useState } from 'react'

// ── State 核心用法 ──────────────────────────────────────────
// state = 组件的"记忆",变化时会触发重新渲染
// 铁律: 不要直接修改 state,要用 set 函数传入"新的值"

// 5. 状态提升: 两个兄弟组件要共享同一份数据时,
//    把 state 放到它们最近的共同父组件中,再用 props 传下去
function CounterDisplay({ value }: { value: number }) {
  return <p>兄弟组件 A 里读到的共享值: {value}</p>
}

function CounterControls({ onIncrease }: { onIncrease: () => void }) {
  return (
    <button type="button" className="learn-btn" onClick={onIncrease}>
      兄弟组件 B: 修改共享值
    </button>
  )
}

function LiftedCounter() {
  const [shared, setShared] = useState(0)
  return (
    <div className="learn-card">
      <CounterDisplay value={shared} />
      <CounterControls onIncrease={() => setShared(shared + 1)} />
    </div>
  )
}

function StateDemo() {
  // useState(初始值) 返回 [当前值, 更新函数]
  const [count, setCount] = useState(0)
  const [isVisible, setIsVisible] = useState(true)
  const [todos, setTodos] = useState(['学习 JSX', '学习组件'])
  const [input, setInput] = useState('')
  const [profile, setProfile] = useState({ name: '小明', age: 18 })

  const addTodo = () => {
    if (!input.trim()) return
    setTodos([...todos, input.trim()]) // 数组更新: 创建新数组,而不是 push
    setInput('')
  }

  const removeTodo = (index: number) => {
    setTodos(todos.filter((_, i) => i !== index))
  }

  return (
    <div className="learn-demo">
      <h3>1. useState: 数字</h3>
      <p>count 当前值: {count}</p>
      <div className="learn-row">
        <button type="button" className="learn-btn" onClick={() => setCount(count + 1)}>
          直接 +1
        </button>
        {/* 新值依赖旧值时用函数式更新,多次连续调用也不会丢更新 */}
        <button type="button" className="learn-btn" onClick={() => setCount((c) => c + 1)}>
          函数式 +1
        </button>
        <button type="button" className="learn-btn" onClick={() => setCount((c) => c - 1)}>
          -1
        </button>
        <button type="button" className="learn-btn" onClick={() => setCount(0)}>
          重置
        </button>
      </div>

      <h3>2. useState: 布尔值,控制显示 / 隐藏</h3>
      <button type="button" className="learn-btn" onClick={() => setIsVisible(!isVisible)}>
        {isVisible ? '隐藏' : '显示'}
      </button>
      {isVisible && <p>你看,我是否出现由 state 决定</p>}

      <h3>3. useState: 数组,增删都要返回新数组</h3>
      <div className="learn-row">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="输入待办,按输入框周围的按钮操作"
        />
        <button type="button" className="learn-btn" onClick={addTodo}>
          添加
        </button>
      </div>
      <ul>
        {/* 示例用 index 作 key 便于演示;真实项目中列表会增删时应使用数据自带的唯一 id */}
        {todos.map((todo, index) => (
          <li key={index}>
            {todo}
            <button type="button" className="learn-btn" onClick={() => removeTodo(index)}>
              删除
            </button>
          </li>
        ))}
      </ul>

      <h3>4. useState: 对象,展开旧值只改要改的字段</h3>
      <div className="learn-card">
        <p>
          {profile.name},{profile.age} 岁
        </p>
        <div className="learn-row">
          <button
            type="button"
            className="learn-btn"
            onClick={() => setProfile({ ...profile, age: profile.age + 1 })}
          >
            过生日(+1 岁)
          </button>
          <button
            type="button"
            className="learn-btn"
            onClick={() =>
              setProfile({ ...profile, name: profile.name === '小明' ? '大明' : '小明' })
            }
          >
            改名字
          </button>
        </div>
      </div>

      <h3>5. 状态提升: 兄弟组件共享一份 state</h3>
      <LiftedCounter />
    </div>
  )
}

export default StateDemo
