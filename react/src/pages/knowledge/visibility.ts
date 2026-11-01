import type { KnowledgeBaseVisibility } from '../../api/knowledge'

// 可见性在列表 / 表单 / 详情三处复用: 文案与标签颜色集中维护,
// 新增一种可见性时只需要改这里(接口类型与 mock 校验也要同步)
export const visibilityOptions: { value: KnowledgeBaseVisibility; label: string }[] = [
  { value: 'private', label: '私有' },
  { value: 'team', label: '团队可见' },
  { value: 'public', label: '公开' },
]

export const visibilityLabel: Record<KnowledgeBaseVisibility, string> = {
  private: '私有',
  team: '团队可见',
  public: '公开',
}

// antd Tag 的预设色: 私有用默认灰, 团队用蓝, 公开用绿
export const visibilityColor: Record<KnowledgeBaseVisibility, string> = {
  private: 'default',
  team: 'blue',
  public: 'green',
}
