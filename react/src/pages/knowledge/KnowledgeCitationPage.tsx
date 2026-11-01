import { useEffect, useRef, useState } from 'react'
import { Button, Empty, Space, Spin, Tag } from 'antd'
import {
  AimOutlined,
  ArrowRightOutlined,
  FileTextOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { fetchDocumentContent, fetchKnowledgeAnswer } from '../../api/knowledge'
import type { CitationSource, DocumentContent, KnowledgeAnswer } from '../../api/knowledge'

// ── 带引用的回答: 来源展示 / 原文定位高亮 / 来源跳转 ─────────
// 页面分成左右两栏:
//   左栏  回答正文 + 引用来源列表; 正文里的 [1] [2] 是可点击的引用编号
//   右栏  原文预览; 点击引用后按 paragraphId 滚动到对应段落,
//         再把来源里的 quote 用 <mark> 精确高亮
//
// "跳转"不是换页, 而是同一页面内的定位跳转: 右栏吸顶, 内容区独立滚动,
// 用户不用离开回答就能对照原文

interface AnswerWithCitationsProps {
  answer: string
  sources: CitationSource[]
  // 当前选中的来源: 让对应的编号保持高亮
  activeId?: string
  onOpen: (source: CitationSource) => void
}

// 把 "…[1]…" 拆成普通文本与可点击编号; [n] 对应 sources[n - 1]
function AnswerWithCitations({ answer, sources, activeId, onOpen }: AnswerWithCitationsProps) {
  return (
    <>
      {answer.split(/(\[\d+\])/g).map((part, index) => {
        const matched = /^\[(\d+)\]$/.exec(part)
        if (!matched) return <span key={index}>{part}</span>

        const source = sources[Number(matched[1]) - 1]
        // 编号找不到来源时按普通文本展示, 避免页面出现无法点击的空号
        if (!source) return <span key={index}>{part}</span>

        return (
          <button
            key={`${source.id}-${index}`}
            type="button"
            className={`learn-cite-ref${activeId === source.id ? ' active' : ''}`}
            aria-label={`查看第 ${matched[1]} 条引用: ${source.documentName} ${source.locator}`}
            title={`${source.documentName} · ${source.locator}`}
            onClick={() => onOpen(source)}
          >
            {matched[1]}
          </button>
        )
      })}
    </>
  )
}

// 段落内精确高亮: 只包住 quote 这一段, 前后文本保持原样
function ParagraphText({ text, quote }: { text: string; quote: string }) {
  const at = quote ? text.indexOf(quote) : -1
  // quote 与正文不一致时退化为整段高亮(active 样式), 至少让用户看到位置
  if (at < 0) return <>{text}</>

  return (
    <>
      {text.slice(0, at)}
      <mark className="learn-cite-mark">{quote}</mark>
      {text.slice(at + quote.length)}
    </>
  )
}

function KnowledgeCitationPage() {
  const [qa, setQa] = useState<KnowledgeAnswer | null>(null)
  const [loadingQa, setLoadingQa] = useState(true)
  const [reloadToken, setReloadToken] = useState(0)

  const [activeSource, setActiveSource] = useState<CitationSource | null>(null)
  const [activeContent, setActiveContent] = useState<DocumentContent | null>(null)
  const [loadingContent, setLoadingContent] = useState(false)

  // 正文按文档 id 缓存: 同一文档的不同来源来回点击时不用重复请求
  const contentCacheRef = useRef(new Map<number, DocumentContent>())
  // 请求序号: 快速点击不同来源时, 只接受最后一次请求的响应
  const requestSeqRef = useRef(0)
  const viewerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    async function loadAnswer() {
      try {
        const data = await fetchKnowledgeAnswer()
        if (!cancelled) setQa(data)
      } catch {
        // 拦截器已提示; qa 保持 null, 页面显示重试占位
      } finally {
        if (!cancelled) setLoadingQa(false)
      }
    }
    void loadAnswer()
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  // 引用跳转: 切换来源 → 必要时拉正文 → 渲染完成后滚动到段落
  async function openSource(source: CitationSource) {
    // 每次点击都换一个新序号; 缓存命中也要换, 让在途的旧请求作废
    const seq = ++requestSeqRef.current
    setActiveSource(source)

    const cached = contentCacheRef.current.get(source.documentId)
    if (cached) {
      setActiveContent(cached)
      setLoadingContent(false)
      return
    }

    setActiveContent(null)
    setLoadingContent(true)
    try {
      const content = await fetchDocumentContent(source.documentId)
      // 用户已经点了别的来源: 丢弃这次响应, 避免内容与高亮错位
      if (seq !== requestSeqRef.current) return
      contentCacheRef.current.set(source.documentId, content)
      setActiveContent(content)
    } catch {
      // 拦截器已提示
    } finally {
      if (seq === requestSeqRef.current) setLoadingContent(false)
    }
  }

  // 等段落和高亮渲染到 DOM 后再滚动, 否则目标节点还不存在
  useEffect(() => {
    if (!activeSource || !activeContent) return
    const frame = requestAnimationFrame(() => {
      const target = viewerRef.current?.querySelector<HTMLElement>(
        `[data-paragraph-id="${activeSource.paragraphId}"]`,
      )
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return () => cancelAnimationFrame(frame)
  }, [activeSource, activeContent])

  function handleReload() {
    if (loadingQa) return
    setLoadingQa(true)
    // 重新加载时清空当前定位, 避免旧来源和新的回答错配
    setActiveSource(null)
    setActiveContent(null)
    setReloadToken((token) => token + 1)
  }

  return (
    <div className="learn-demo">
      <div className="learn-kb-page-head">
        <div>
          <h3>带引用的回答</h3>
          <p className="learn-kb-tip">
            回答里的编号来自知识库文档; 点击编号或来源卡片, 右侧原文会自动滚动定位并高亮引用片段。
          </p>
        </div>
        <Space wrap>
          <span className="learn-kb-sync">
            <span className="learn-kb-sync-dot" />
            来源与原文同步
          </span>
          <Button icon={<ReloadOutlined />} loading={loadingQa} onClick={handleReload}>
            重新加载
          </Button>
        </Space>
      </div>

      {loadingQa && !qa ? (
        <div className="learn-kb-loading">
          <Spin size="large" />
        </div>
      ) : !qa ? (
        <Empty description="示例问答加载失败, 请重新加载" />
      ) : (
        <div className="learn-cite-layout">
          <section className="learn-cite-card">
            <div className="learn-cite-question">
              <Tag color="blue">问题</Tag>
              <span>{qa.question}</span>
            </div>

            <p className="learn-cite-answer-text">
              <AnswerWithCitations
                answer={qa.answer}
                sources={qa.sources}
                activeId={activeSource?.id}
                onOpen={openSource}
              />
            </p>

            <div className="learn-cite-divider" />

            <div className="learn-cite-sources-head">
              <h4>引用来源</h4>
              <span className="learn-cite-sources-count">{qa.sources.length} 条</span>
            </div>

            <ol className="learn-cite-sources">
              {qa.sources.map((source, index) => {
                const active = activeSource?.id === source.id
                return (
                  <li key={source.id}>
                    <button
                      type="button"
                      className={`learn-cite-source${active ? ' active' : ''}`}
                      aria-label={`定位来源 ${index + 1}: ${source.documentName} ${source.locator}`}
                      onClick={() => void openSource(source)}
                    >
                      <span className="learn-cite-source-index">{index + 1}</span>
                      <span className="learn-cite-source-body">
                        <span className="learn-cite-source-title">
                          {source.documentName}
                          <span className="learn-cite-source-locator">{source.locator}</span>
                        </span>
                        <span className="learn-cite-source-quote">“{source.quote}”</span>
                      </span>
                      <span className="learn-cite-source-action">
                        定位 <ArrowRightOutlined />
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </section>

          {/* 原文预览: 吸顶 + 内部滚动; 高亮与滚动定位都在这里发生 */}
          <aside className="learn-cite-viewer" ref={viewerRef}>
            <div className="learn-cite-viewer-head">
              <FileTextOutlined className="learn-cite-viewer-icon" />
              <span className="learn-cite-viewer-title">
                {activeContent?.name ?? activeSource?.documentName ?? '原文预览'}
              </span>
              {activeSource && <Tag color="blue">已定位 · {activeSource.locator}</Tag>}
            </div>

            {loadingContent ? (
              <div className="learn-cite-viewer-loading">
                <Spin />
              </div>
            ) : activeContent ? (
              <div className="learn-cite-viewer-body">
                {activeContent.paragraphs.map((paragraph) => {
                  const active = activeSource?.paragraphId === paragraph.id
                  return (
                    <p
                      key={paragraph.id}
                      data-paragraph-id={paragraph.id}
                      className={`learn-cite-paragraph${active ? ' active' : ''}`}
                    >
                      {active && activeSource ? (
                        <ParagraphText text={paragraph.text} quote={activeSource.quote} />
                      ) : (
                        paragraph.text
                      )}
                    </p>
                  )
                })}
              </div>
            ) : (
              <div className="learn-cite-viewer-empty">
                <AimOutlined />
                <p>点击回答中的编号或左侧来源卡片</p>
                <p>原文会滚动定位到引用段落, 并高亮被引用的原文</p>
              </div>
            )}
          </aside>
        </div>
      )}
    </div>
  )
}

export default KnowledgeCitationPage
