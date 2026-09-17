// 生成用于端到端测试的中文 PDF 题库（用 pdfkit + simhei.ttf 嵌入字体）
import PDFDocument from "pdfkit";
import { createWriteStream } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = join(__dirname, "..", "test-fixtures", "机器人基础.pdf");
import { mkdirSync } from "node:fs";
mkdirSync(join(__dirname, "..", "test-fixtures"), { recursive: true });

const FONT = "C:/Windows/Fonts/simhei.ttf";

const doc = new PDFDocument({ size: "A4", margin: 50 });
doc.registerFont("CN", FONT);
doc.font("CN").fontSize(12);

const stream = createWriteStream(outPath);
doc.pipe(stream);

const lines = [
  "# 分类：工业机器人基础",
  "# 题型：单选",
  "",
  "1. 工业机器人的自由度是指什么？",
  "A. 机器人手部所能到达的位置数",
  "B. 机器人独立运动的坐标轴数",
  "C. 机器人关节数量",
  "D. 机器人负载能力",
  "答案：B",
  "解析：自由度指机器人所具有的独立运动坐标轴数，通常等于关节数。",
  "",
  "2. [多选] 下列属于工业机器人常见坐标系的有？",
  "A. 基坐标系",
  "B. 关节坐标系",
  "C. 工具坐标系",
  "D. 用户坐标系",
  "答案：ABCD",
  "解析：工业机器人常见坐标系包括基坐标系、关节坐标系、工具坐标系和用户坐标系。",
  "",
  "3. [判断] 示教编程是工业机器人最常用的编程方式之一。",
  "答案：T",
  "解析：示教编程通过引导机器人记录位姿，是最基础也最常用的编程方式。",
];

const lineHeight = 20;
let y = doc.y;
for (const ln of lines) {
  if (ln === "") {
    y += lineHeight / 2;
    continue;
  }
  doc.text(ln, 50, y, { lineBreak: false });
  y += lineHeight;
}

doc.end();

stream.on("finish", () => {
  console.log("PDF generated:", outPath);
});
