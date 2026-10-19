import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash'
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json'
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { usePrefersDark } from '../hooks/usePrefersDark'
import demoMarkdown from './markdown-demo.md?raw'

// ── Markdown 渲染与代码高亮 ─────────────────────────────────
// react-markdown 把 Markdown 文本解析成 React 元素树直接渲染,
// 不经过 dangerouslySetInnerHTML, 天然规避 HTML 注入;
// remark-gfm 是解析阶段的插件, 补上表格 / 任务列表 / 删除线等 GFM 扩展;
// 围栏代码块交给 react-syntax-highlighter(基于 Prism) 着色

// PrismLight 只打包下面注册的语言, 比全量版体积小很多;
// markdown 里用到没注册的语言不会报错, 只是不高亮(按纯文本显示)
SyntaxHighlighter.registerLanguage('tsx', tsx)
SyntaxHighlighter.registerLanguage('json', json)
SyntaxHighlighter.registerLanguage('bash', bash)

// ── 共享组件: Markdown 渲染器(含代码高亮) ───────────────────

function MarkdownView({ markdown }: { markdown: string }) {
  // 高亮主题跟随系统深色模式: 与全站配色在同一套媒体查询下切换
  const dark = usePrefersDark()

  return (
    <div className="learn-md-panel">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        // components: 用自定义渲染替换某个元素的默认实现, 这里只接管 code;
        // 围栏代码块带 language-xxx 类名(来自 ``` 后的语言名):
        // 有语言名 -> 交给 SyntaxHighlighter 着色; 行内代码 -> 保持普通 <code>
        components={{
          code({ className, children }) {
            const match = /language-(\w+)/.exec(className ?? '')
            if (!match) {
              return <code>{children}</code>
            }
            return (
              <SyntaxHighlighter
                language={match[1]}
                style={dark ? oneDark : oneLight}
                // 外层已有 react-markdown 生成的 <pre>, 高亮器外框换成 div 避免 pre 嵌套
                PreTag="div"
                customStyle={{ margin: 0, padding: '14px 16px', borderRadius: 8, fontSize: 13.5 }}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            )
          },
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  )
}

// ── 1. 基础渲染: markdown-demo.md 渲染成页面 ────────────────
// 导入路径加了 ?raw 后缀: Vite 把文件原文当字符串返回,
// 不用改造成 JS 模块, 也不用发网络请求

function BasicSection() {
  return <MarkdownView markdown={demoMarkdown} />
}

// ── 2. 代码高亮: 围栏语言名决定着色规则 ─────────────────────

const codeSamplesMarkdown = `同一套渲染组件, 围栏语言名不同, 着色规则也不同:

\`\`\`tsx
interface Todo { id: number; text: string; done: boolean }

function TodoItem({ todo }: { todo: Todo }) {
  return <li className={todo.done ? 'done' : ''}>{todo.text}</li>
}
\`\`\`

\`\`\`json
{
  "name": "react-markdown",
  "dependencies": { "remark-gfm": "^4.0.1" }
}
\`\`\`

\`\`\`bash
npm install react-markdown remark-gfm react-syntax-highlighter
\`\`\``

function HighlightSection() {
  return <MarkdownView markdown={codeSamplesMarkdown} />
}

// ── 3. 实时编辑: 左边输入, 右边实时重渲染 ───────────────────

function LiveEditorSection() {
  const [source, setSource] = useState(demoMarkdown)

  return (
    <div className="learn-md-split">
      <textarea
        aria-label="Markdown 源码"
        spellCheck={false}
        value={source}
        onChange={(event) => setSource(event.target.value)}
      />
      <MarkdownView markdown={source} />
    </div>
  )
}

// ── 页面装配 ────────────────────────────────────────────────

function MarkdownDemo() {
  return (
    <div className="learn-demo">
      <h3>1. 基础渲染: 一份 Markdown 渲染成页面</h3>
      <BasicSection />

      <h3>2. 代码高亮: 围栏写上语言名, 交给 Prism 着色</h3>
      <HighlightSection />

      <h3>3. 实时编辑: 左边改动, 右边实时渲染</h3>
      <LiveEditorSection />
    </div>
  )
}

export default MarkdownDemo
