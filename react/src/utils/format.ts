// ── 通用格式化工具 ──────────────────────────────────────────
// 知识库原型里多处复用: 文档列表(大小/时间)与上传任务列表(大小)

// 字节数 → 可读大小, 如 358.4 KB / 1.19 MB
export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(2)} MB`
}

// ISO 时间 → "YYYY-MM-DD HH:mm"(本地时区), 非法输入返回占位符
export function formatDateTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '--'
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}
