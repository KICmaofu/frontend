// 临时解析器测试：用 esbuild 把真实源码打包后跑 JSON/CSV/TXT 三种模板
import { build } from "esbuild";
import { mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "node_modules", ".tmp");
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, "parsers-bundle.mjs");
const reconFile = join(outDir, "reconstruct-bundle.mjs");

await build({
  entryPoints: [join(__dirname, "..", "src", "lib", "parsers", "index.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: outFile,
  logLevel: "silent",
});

await build({
  entryPoints: [join(__dirname, "..", "src", "lib", "parsers", "reconstruct.ts")],
  bundle: true,
  format: "esm",
  platform: "node",
  outfile: reconFile,
  logLevel: "silent",
});

const { parseFileText } = await import(pathToFileURL(outFile).href);
const { reconstructLines } = await import(pathToFileURL(reconFile).href);

const JSON_CONTENT = `{"category":"工业机器人基础","questions":[{"stem":"工业机器人的自由度是指什么？","type":"single","options":[{"key":"A","text":"机器人手部所能到达的位置数"},{"key":"B","text":"机器人独立运动的坐标轴数"},{"key":"C","text":"机器人关节数量"},{"key":"D","text":"机器人负载能力"}],"answer":"B","analysis":"自由度指机器人所具有的独立运动坐标轴数，通常等于关节数。"},{"stem":"下列属于工业机器人常见坐标系的有？","type":"multiple","options":[{"key":"A","text":"基坐标系"},{"key":"B","text":"关节坐标系"},{"key":"C","text":"工具坐标系"},{"key":"D","text":"用户坐标系"}],"answer":"ABCD","analysis":"工业机器人常见坐标系包括基坐标系、关节坐标系、工具坐标系和用户坐标系。"},{"stem":"示教编程是工业机器人最常用的编程方式之一。","type":"judge","answer":"T","analysis":"示教编程通过引导机器人记录位姿，是最基础也最常用的编程方式。"}]}`;

const CSV_CONTENT = `stem,type,options,answer,analysis
工业机器人的自由度是指什么？,single,A.机器人手部所能到达的位置数|B.机器人独立运动的坐标轴数|C.机器人关节数量|D.机器人负载能力,B,自由度指机器人所具有的独立运动坐标轴数，通常等于关节数。
"下列属于工业机器人常见坐标系的有？",multiple,"A.基坐标系|B.关节坐标系|C.工具坐标系|D.用户坐标系",ABCD,工业机器人常见坐标系包括基坐标系、关节坐标系、工具坐标系和用户坐标系。
示教编程是工业机器人最常用的编程方式之一。,judge,T|F,T,示教编程通过引导机器人记录位姿，是最基础也最常用的编程方式。`;

const TXT_CONTENT = `# 分类：工业机器人基础
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
解析：示教编程通过引导机器人记录位姿，是最基础也最常用的编程方式。`;

let pass = 0, fail = 0;
function check(name, cond, detail = "") {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}  ${detail}`); }
}

for (const [fmt, content, fname] of [
  ["JSON", JSON_CONTENT, "机器人基础.json"],
  ["CSV", CSV_CONTENT, "机器人基础.csv"],
  ["TXT", TXT_CONTENT, "机器人基础.txt"],
]) {
  console.log(`\n=== ${fmt} 解析 ===`);
  let result;
  try {
    result = parseFileText(fname, content);
  } catch (e) {
    console.log(`  ✗ 解析抛错: ${e.message}`);
    fail += 10;
    continue;
  }
  check("题目数=3", result.questions.length === 3, `实际 ${result.questions.length}`);
  check("分类正确", fmt === "CSV" ? result.file.category === "机器人基础" : result.file.category === "工业机器人基础", `实际 "${result.file.category}"`);
  check("格式正确", result.file.format === fname.split(".").pop(), `实际 ${result.file.format}`);

  const q1 = result.questions[0];
  check("Q1题干", q1.stem.includes("自由度"), q1.stem);
  check("Q1题型=single", q1.questionType === "single", q1.questionType);
  check("Q1选项数=4", q1.options.length === 4, `${q1.options.length}`);
  check("Q1选项A正确", q1.options[0].key === "A" && q1.options[0].text.includes("位置数"), JSON.stringify(q1.options[0]));
  check("Q1答案=B", q1.answer === "B", q1.answer);
  check("Q1解析存在", q1.analysis.length > 0, q1.analysis);

  const q2 = result.questions[1];
  check("Q2题型=multiple", q2.questionType === "multiple", q2.questionType);
  check("Q2答案=ABCD", q2.answer === "ABCD", q2.answer);

  const q3 = result.questions[2];
  check("Q3题型=judge", q3.questionType === "judge", q3.questionType);
  check("Q3选项=T/F", q3.options.length === 2 && q3.options[0].key === "T" && q3.options[1].key === "F", JSON.stringify(q3.options));
  check("Q3答案=T", q3.answer === "T", q3.answer);

  check("警告数=0", result.warnings.length === 0, JSON.stringify(result.warnings));
}

// =====================
// PDF 文本重建测试
// 模拟 pdfjs 从 PDF 提取出的散乱文本项（带坐标，顺序被打乱），
// 验证 reconstructLines 能重排为可被 parseTxt 正确解析的行式文本。
// =====================
console.log(`\n=== PDF 文本重建 ===`);

// 构造一行的文本项（可拆成多段）。y 为基线 Y，segs=[[x, str], ...]
function line(y, segs) {
  return segs.map(([x, str]) => {
    // 中文按 12 单位/字、ASCII 按 6 单位/字估算宽度
    const w = [...str].reduce((s, c) => s + (c.charCodeAt(0) > 127 ? 12 : 6), 0);
    return { str, transform: [1, 0, 0, 1, x, y], x, y, width: w, height: 12 };
  });
}

const pdfItems = [
  ...line(750, [[50, "# 分类：工业机器人基础"]]),
  ...line(730, [[50, "# 题型：单选"]]),
  // 题干拆成两段（坐标连续，模拟同一词的相邻字符），验证不会插入多余空格
  ...line(690, [[50, "1. 工业机器"], [116, "人的自由度是指什么？"]]),
  ...line(670, [[50, "A. 机器人手部所能到达的位置数"]]),
  ...line(650, [[50, "B. 机器人独立运动的坐标轴数"]]),
  ...line(630, [[50, "C. 机器人关节数量"]]),
  ...line(610, [[50, "D. 机器人负载能力"]]),
  ...line(590, [[50, "答案：B"]]),
  ...line(570, [[50, "解析：自由度指机器人所具有的独立运动坐标轴数，通常等于关节数。"]]),
  ...line(530, [[50, "2. [多选] 下列属于工业机器人常见坐标系的有？"]]),
  ...line(510, [[50, "A. 基坐标系"]]),
  ...line(490, [[50, "B. 关节坐标系"]]),
  ...line(470, [[50, "C. 工具坐标系"]]),
  ...line(450, [[50, "D. 用户坐标系"]]),
  ...line(430, [[50, "答案：ABCD"]]),
  ...line(410, [[50, "解析：工业机器人常见坐标系包括基坐标系、关节坐标系、工具坐标系和用户坐标系。"]]),
  ...line(370, [[50, "3. [判断] 示教编程是工业机器人最常用的编程方式之一。"]]),
  ...line(350, [[50, "答案：T"]]),
  ...line(330, [[50, "解析：示教编程通过引导机器人记录位姿，是最基础也最常用的编程方式。"]]),
];

// 打乱顺序模拟 pdfjs 非顺序输出
const shuffled = [...pdfItems].sort(() => Math.random() - 0.5);
const reconText = reconstructLines(shuffled);

check("重建非空", reconText.length > 0);
check("行数合理(>=18)", reconText.split("\n").length >= 18, `${reconText.split("\n").length} 行`);
check("含题干1", reconText.includes("1. 工业机器人的自由度是指什么？"), reconText.split("\n")[2]);
check("含答案B", reconText.includes("答案：B"));
check("题干2多选标记保留", reconText.includes("[多选]"));
check("顺序自上而下", reconText.indexOf("1. 工业") < reconText.indexOf("2. [多选]") && reconText.indexOf("2. [多选]") < reconText.indexOf("3. [判断]"), "题号顺序错误");

// 间距测试：两段有明显 X 间距时应插入空格（对应 PDF 中的真实空格）
const gapText = reconstructLines([
  { str: "A.", transform: [1, 0, 0, 1, 50, 700], x: 50, y: 700, width: 12, height: 12 },
  { str: "选项一", transform: [1, 0, 0, 1, 80, 700], x: 80, y: 700, width: 36, height: 12 },
]);
check("X间距→插入空格", gapText === "A. 选项一", `"${gapText}"`);

// 重建文本走 parseTxt
const pdfResult = parseFileText("机器人基础.txt", reconText);
check("PDF重建→解析题数=3", pdfResult.questions.length === 3, `${pdfResult.questions.length}`);
check("PDF→Q1答案=B", pdfResult.questions[0].answer === "B", pdfResult.questions[0].answer);
check("PDF→Q2题型=multiple", pdfResult.questions[1].questionType === "multiple", pdfResult.questions[1].questionType);
check("PDF→Q2答案=ABCD", pdfResult.questions[1].answer === "ABCD", pdfResult.questions[1].answer);
check("PDF→Q3题型=judge", pdfResult.questions[2].questionType === "judge", pdfResult.questions[2].questionType);
check("PDF→Q3答案=T", pdfResult.questions[2].answer === "T", pdfResult.questions[2].answer);
check("PDF→Q3选项=T/F", pdfResult.questions[2].options.length === 2 && pdfResult.questions[2].options[0].key === "T", JSON.stringify(pdfResult.questions[2].options));
check("PDF→警告数=0", pdfResult.warnings.length === 0, JSON.stringify(pdfResult.warnings));

// =====================
// PDF 前缀符号兼容测试
// 验证 txt 解析器能正确处理选项行/题干行前带 □、☐ 等 PDF 符号
// =====================
console.log(`\n=== PDF 前缀符号兼容 ===`);

const PREFIX_TXT = `# 分类：工业基础

□1. 工业机器人的自由度是指什么？
□A. 机器人手部所能到达的位置数
□B. 机器人独立运动的坐标轴数
□C. 机器人关节数量
□D. 机器人负载能力
□答案：B
□解析：自由度指机器人所具有的独立运动坐标轴数。

☐2. [多选] 下列属于工业机器人常见坐标系的有？
☐A. 基坐标系
☐B. 关节坐标系
☐C. 工具坐标系
☐D. 用户坐标系
☐答案：ABCD
☐解析：工业机器人常见坐标系包括基坐标系、关节坐标系等。

○3. [判断] 示教编程是工业机器人最常用的编程方式之一。
○答案：T
○解析：示教编程通过引导机器人记录位姿。`;

const prefixResult = parseFileText("前缀符号测试.txt", PREFIX_TXT);
check("前缀符号→题数=3", prefixResult.questions.length === 3, `${prefixResult.questions.length}`);
check("前缀符号→Q1题干", prefixResult.questions[0].stem.includes("自由度"), prefixResult.questions[0].stem);
check("前缀符号→Q1选项数=4", prefixResult.questions[0].options.length === 4, `${prefixResult.questions[0].options.length}`);
check("前缀符号→Q1选项A正确", prefixResult.questions[0].options[0].key === "A", prefixResult.questions[0].options[0].key);
check("前缀符号→Q1答案=B", prefixResult.questions[0].answer === "B", prefixResult.questions[0].answer);
check("前缀符号→Q2题型=multiple", prefixResult.questions[1].questionType === "multiple", prefixResult.questions[1].questionType);
check("前缀符号→Q2答案=ABCD", prefixResult.questions[1].answer === "ABCD", prefixResult.questions[1].answer);
check("前缀符号→Q3题型=judge", prefixResult.questions[2].questionType === "judge", prefixResult.questions[2].questionType);
check("前缀符号→Q3答案=T", prefixResult.questions[2].answer === "T", prefixResult.questions[2].answer);
check("前缀符号→警告数=0", prefixResult.warnings.length === 0, JSON.stringify(prefixResult.warnings));

console.log(`\n=========================`);
console.log(`PASS: ${pass}  FAIL: ${fail}`);
process.exit(fail > 0 ? 1 : 0);
