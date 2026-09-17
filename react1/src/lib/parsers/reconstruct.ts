/** pdfjs 文本项的最小结构（用于行重建，避免直接依赖 pdfjs 内部类型） */
export interface TextItemLike {
  str: string;
  transform?: number[]; // [a,b,c,d,e,f]，e=x，f=y
  width?: number;
  height?: number;
  hasEOL?: boolean;
}

interface PlainPart {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Band {
  topY: number;
  bottomY: number;
  maxH: number;
  parts: PlainPart[];
  /** 是否由多个伪行带合并而成（表格窄单元格内换行） */
  multi: boolean;
}

/**
 * 普通单带拼接：按 x 排序，根据水平间距插入空格。
 */
function joinPlainParts(parts: PlainPart[]): string {
  const ps = [...parts].sort((a, b) => a.x - b.x);
  let s = "";
  let prevEnd = -Infinity;
  for (const p of ps) {
    if (s === "") {
      s = p.str;
    } else {
      const gap = p.x - prevEnd;
      const needsSpace = gap > 0.5 && !/\s$/.test(s) && !/^\s/.test(p.str);
      s += needsSpace ? " " + p.str : p.str;
    }
    prevEnd = p.x + p.w;
  }
  return s.replace(/[ \t]{2,}/g, " ").trim();
}

/**
 * 列感知拼接（用于合并后的多带组）：
 * 表格窄单元格内换行会把同一单元格拆成上下多个片段（如 "101 C" → "10"/"C"/"1"），
 * 这些片段 x 范围高度重叠。按 x 聚簇，簇内属于同一单元格，纵向按自上而下顺序直接拼接；
 * 不同簇为不同单元格，以空格分隔。
 */
function joinMergedParts(parts: PlainPart[], maxH: number): string {
  const tol = maxH * 0.6;
  const cells: { left: number; right: number; strs: string[] }[] = [];
  for (const p of parts) {
    const cell = cells.find((c) => p.x < c.right + tol && p.x + p.w > c.left - tol);
    if (cell) {
      cell.strs.push(p.str);
      cell.left = Math.min(cell.left, p.x);
      cell.right = Math.max(cell.right, p.x + p.w);
    } else {
      cells.push({ left: p.x, right: p.x + p.w, strs: [p.str] });
    }
  }
  cells.sort((a, b) => a.left - b.left);
  return cells
    .map((c) => c.strs.join(""))
    .join(" ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * 将 pdfjs 提取的散乱文本项重排为按行组织的纯文本。
 * Pass 1: 按 Y 坐标聚成“紧带”（基线微差的项归为一带）。
 * Pass 2: 表格窄单元格内换行会把同一视觉行拆成多个 Y 带
 *         （带距远小于行距，如 "201" 被拆为 "20"/"1" 两带），
 *         按页内带距的双簇分布自适应合并，恢复完整的行；
 *         合并组内再按 x 聚簇做列感知拼接，还原单元格内容。
 * 纯函数，无副作用，便于单元测试。
 */
export function reconstructLines(items: TextItemLike[]): string {
  const texts: PlainPart[] = items
    .filter((it) => it && typeof it.str === "string" && it.str.trim().length > 0)
    .map((it) => ({
      str: it.str,
      x: it.transform?.[4] ?? 0,
      y: it.transform?.[5] ?? 0,
      w: it.width ?? 0,
      h: it.height && it.height > 0 ? it.height : 10,
    }));
  if (texts.length === 0) return "";

  // 页面坐标系：Y 越大越靠上，故按 Y 降序实现自上而下阅读
  texts.sort((a, b) => b.y - a.y || a.x - b.x);

  // Pass 1：紧密分带
  const bands: Band[] = [];
  for (const t of texts) {
    const last = bands[bands.length - 1];
    if (last && Math.abs(last.topY - t.y) <= last.maxH * 0.5) {
      last.parts.push(t);
      last.bottomY = Math.min(last.bottomY, t.y);
      last.maxH = Math.max(last.maxH, t.h);
    } else {
      bands.push({ topY: t.y, bottomY: t.y, maxH: t.h, parts: [t], multi: false });
    }
  }

  // Pass 2：自适应合并伪行带
  if (bands.length > 2) {
    const gaps: number[] = [];
    for (let i = 1; i < bands.length; i++) gaps.push(bands[i - 1].bottomY - bands[i].topY);
    const hs = texts.map((t) => t.h).sort((a, b) => a - b);
    const medianH = hs[hs.length >> 1] || 10;
    // 显著小于字高的带距是窄单元格内换行产生的伪行带（如 "101 C" 拆成 "10"/"C"/"1"）；
    // 正常行距 ≥ 字高。取小簇最大值与下一个正常间距的中点作合并阈值。
    const norm = gaps.map((g) => Math.max(g, 0));
    const small = norm.filter((g) => g < medianH * 0.9);
    const rest = norm.filter((g) => g >= medianH * 0.9).sort((a, b) => a - b);
    const gSmall = small.length ? Math.max(...small) : 0;
    const gNext = rest[0];
    // 需同时满足：伪行带足够多、小簇显著小于字高、且存在明确的正常行距
    //（小于 2.5× 字高，排除仅剩页边距的情况；≥1.35× 小簇，排除间距连续无分界的情况）
    if (
      small.length >= 2 &&
      Math.min(...small) < medianH * 0.75 &&
      gNext !== undefined &&
      gNext < medianH * 2.5 &&
      gNext >= gSmall * 1.35
    ) {
      const thr = (gSmall + gNext) / 2;
      const merged: Band[] = [];
      for (const b of bands) {
        const last = merged[merged.length - 1];
        if (last && last.bottomY - b.topY < thr) {
          last.parts.push(...b.parts);
          last.bottomY = Math.min(last.bottomY, b.bottomY);
          last.maxH = Math.max(last.maxH, b.maxH);
          last.multi = true;
        } else {
          merged.push({ topY: b.topY, bottomY: b.bottomY, maxH: b.maxH, parts: [...b.parts], multi: false });
        }
      }
      bands.length = 0;
      bands.push(...merged);
    }
  }

  return bands
    .map((band) => (band.multi ? joinMergedParts(band.parts, band.maxH) : joinPlainParts(band.parts)))
    .filter((l) => l.length > 0)
    .join("\n");
}
