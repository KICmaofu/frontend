/** 三种格式的示例模板，供用户下载参考 */

export const JSON_TEMPLATE = `{
  "category": "工业机器人基础",
  "questions": [
    {
      "stem": "工业机器人的自由度是指什么？",
      "type": "single",
      "options": [
        { "key": "A", "text": "机器人手部所能到达的位置数" },
        { "key": "B", "text": "机器人独立运动的坐标轴数" },
        { "key": "C", "text": "机器人关节数量" },
        { "key": "D", "text": "机器人负载能力" }
      ],
      "answer": "B",
      "analysis": "自由度指机器人所具有的独立运动坐标轴数，通常等于关节数。"
    },
    {
      "stem": "下列属于工业机器人常见坐标系的有？",
      "type": "multiple",
      "options": [
        { "key": "A", "text": "基坐标系" },
        { "key": "B", "text": "关节坐标系" },
        { "key": "C", "text": "工具坐标系" },
        { "key": "D", "text": "用户坐标系" }
      ],
      "answer": "ABCD",
      "analysis": "工业机器人常见坐标系包括基坐标系、关节坐标系、工具坐标系和用户坐标系。"
    },
    {
      "stem": "示教编程是工业机器人最常用的编程方式之一。",
      "type": "judge",
      "answer": "T",
      "analysis": "示教编程通过引导机器人记录位姿，是最基础也最常用的编程方式。"
    }
  ]
}
`;

export const CSV_TEMPLATE = `stem,type,options,answer,analysis
工业机器人的自由度是指什么？,single,A.机器人手部所能到达的位置数|B.机器人独立运动的坐标轴数|C.机器人关节数量|D.机器人负载能力,B,自由度指机器人所具有的独立运动坐标轴数，通常等于关节数。
"下列属于工业机器人常见坐标系的有？",multiple,"A.基坐标系|B.关节坐标系|C.工具坐标系|D.用户坐标系",ABCD,工业机器人常见坐标系包括基坐标系、关节坐标系、工具坐标系和用户坐标系。
示教编程是工业机器人最常用的编程方式之一。,judge,T|F,T,示教编程通过引导机器人记录位姿，是最基础也最常用的编程方式。
`;

export const TXT_TEMPLATE = `# 分类：工业机器人基础
# 题型：单选

1. 工业机器人的自由度是指什么？
A. 机器人手部所能到达的位置数
B. 机器人独立运动的坐标轴数
C. 机器人关节数量
D. 机器人负载能力
答案：B
解析：自由度指机器人所具有的独立运动坐标轴数，通常等于关节数。

2. [多选] 下列属于工业机器人常见坐标系的有？
A. 基坐标系
B. 关节坐标系
C. 工具坐标系
D. 用户坐标系
答案：ABCD
解析：工业机器人常见坐标系包括基坐标系、关节坐标系、工具坐标系和用户坐标系。

3. [判断] 示教编程是工业机器人最常用的编程方式之一。
答案：T
解析：示教编程通过引导机器人记录位姿，是最基础也最常用的编程方式。
`;

/** PDF 格式说明（PDF 无法提供二进制模板，改为下载格式说明文本） */
export const PDF_SPEC = `# PDF 题库格式说明

PDF 文件内部排版需符合 TXT 格式规范，系统会用 PDF.js 提取文本后按 TXT 规则解析。

## 排版要求

1. 题目以 "数字." 开头，题型可在题干前用 [单选]/[多选]/[判断] 标注
2. 选项以 A. B. C. D. 开头，每项独占一行
3. "答案：" 行指定答案（多选连写如 ABCD，判断用 T/F）
4. "解析：" 行指定解析
5. 题目之间空一行分隔
6. 可在文件开头用 "# 分类：xxx" "# 题型：单选" 设置全局分类与默认题型

## 示例（在 PDF 中按此排版）

1. 工业机器人的自由度是指什么？
A. 机器人手部所能到达的位置数
B. 机器人独立运动的坐标轴数
C. 机器人关节数量
D. 机器人负载能力
答案：B
解析：自由度指机器人所具有的独立运动坐标轴数，通常等于关节数。

2. [多选] 下列属于工业机器人常见坐标系的有？
A. 基坐标系
B. 关节坐标系
C. 工具坐标系
D. 用户坐标系
答案：ABCD
解析：工业机器人常见坐标系包括基坐标系、关节坐标系、工具坐标系和用户坐标系。

## 注意事项

- 仅支持文本型 PDF；扫描件/图片型 PDF 无法提取文本（暂不支持 OCR）
- PDF 中的表格、复杂分栏可能影响解析准确性，建议使用线性排版
- 推荐优先使用 JSON/CSV/TXT 以获得最稳定解析
`;

export const TEMPLATE_MAP = {
  json: { content: JSON_TEMPLATE, filename: "题库模板.json", mime: "application/json" },
  csv: { content: CSV_TEMPLATE, filename: "题库模板.csv", mime: "text/csv" },
  txt: { content: TXT_TEMPLATE, filename: "题库模板.txt", mime: "text/plain" },
  pdf: { content: PDF_SPEC, filename: "PDF格式说明.txt", mime: "text/plain" },
} as const;

/** 触发文件下载 */
export function downloadTemplate(format: keyof typeof TEMPLATE_MAP) {
  const t = TEMPLATE_MAP[format];
  const blob = new Blob([t.content], { type: `${t.mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = t.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
