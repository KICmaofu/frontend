// ── JSX 核心用法 ────────────────────────────────────────────
// 核心心智模型: JSX 就是"可以写 HTML 的 JavaScript"
// 用 {} 插入 JS 表达式,返回值用 () 包裹

const fruits = ['苹果', '香蕉', '橙子', '葡萄']

// 条件渲染写法三: if 提前 return,适合分支较复杂的场景
function ScoreBadge({ score }: { score: number }) {
  if (score < 60) {
    return <p>不及格: {score} 分</p>
  }
  return <p>及格: {score} 分</p>
}

function JsxDemo() {
  const name = 'React'
  const version = 19
  const isLoggedIn = true
  const user = { nickname: '小明', age: 18 }

  return (
    <div className="learn-demo">
      {/* 这是 JSX 里写注释的方法: 花括号包住 JS 注释 */}

      <h3>1. 表达式插值</h3>
      <p>
        花括号里可以放任意 JS 表达式: 变量 {name}、运算 {1 + 2}、属性{' '}
        {user.nickname}:{user.age}、字符串拼接 {'v' + version}
      </p>

      <h3>2. 条件渲染(三种写法)</h3>
      {/* 写法一: 三元表达式,二选一 */}
      <p>{isLoggedIn ? '欢迎回来!' : '请先登录'}</p>
      {/* 写法二: && 短路,条件为真才渲染(注意左侧别用数字 0,0 会被渲染出来) */}
      <p>{isLoggedIn && '这段文字只在 isLoggedIn 为 true 时出现'}</p>
      {/* 写法三: if 提前 return,见上方 ScoreBadge 组件 */}
      <ScoreBadge score={88} />
      <ScoreBadge score={42} />

      <h3>3. 列表渲染: map + key</h3>
      <ul>
        {fruits.map((fruit) => (
          <li key={fruit}>{fruit}</li>
        ))}
      </ul>

      <h3>4. 属性: class 写作 className, style 接收对象</h3>
      <span className="learn-tag" style={{ fontWeight: 600 }}>
        className 代替 class, style 属性名用驼峰: fontSize 而不是 font-size
      </span>

      <h3>5. 空值不会渲染</h3>
      <p>
        null / undefined / true / false 都会被忽略: [{null}][{undefined}][
        {true}][{false}]
      </p>

      <h3>6. Fragment: 打包多个元素但不产生多余 DOM</h3>
      <>
        <p>用 &lt;&gt;...&lt;/&gt; 包裹多个并列元素</p>
        <p>打开浏览器开发者工具,看不到额外节点</p>
      </>
    </div>
  )
}

export default JsxDemo
