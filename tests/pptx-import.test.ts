import test from "node:test";
import assert from "node:assert/strict";
import JSZip from "jszip";
import { parsePptx } from "../lib/academy/pptx";
import { quizToMarkdown } from "../lib/academy/pptx-import";
import { parseQuizContent } from "../lib/academy/quiz-format";

const shape = (ph: string | null, texts: string[]) => `
<p:sp><p:nvSpPr><p:cNvPr id="1" name="x"/><p:cNvSpPr/><p:nvPr>${ph ? `<p:ph type="${ph}"/>` : ""}</p:nvPr></p:nvSpPr>
<p:txBody><a:p>${texts.map((t) => `<a:r><a:t>${t}</a:t></a:r>`).join("")}</a:p></p:txBody></p:sp>`;

const slideXml = (titlePh: string, title: string[], body: string[]) =>
  `<?xml version="1.0"?><p:sld><p:cSld><p:spTree>${shape(titlePh, title)}${shape("body", body)}</p:spTree></p:cSld></p:sld>`;

async function makePptx(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file("ppt/slides/slide1.xml", slideXml("title", ["Safety &amp; Orientation"], ["Hard hats required", "Sign in daily"]));
  zip.file("ppt/slides/slide2.xml", slideXml("title", ["PPE Rules"], ["Wear gloves", "Wear goggles"]));
  zip.file("ppt/slides/slide10.xml", slideXml("title", ["Wrap Up"], ["Questions?"]));
  zip.file("ppt/notesSlides/notesSlide2.xml", `<p:spTree>${shape("body", ["Emphasize glove ratings"])}${shape("sldNum", ["2"])}</p:spTree>`);
  return zip.generateAsync({ type: "nodebuffer" });
}

test("parsePptx extracts ordered slides with titles, bullets, notes and entities decoded", async () => {
  const slides = await parsePptx(await makePptx());
  assert.equal(slides.length, 3);
  assert.equal(slides[0].index, 1);
  assert.equal(slides[0].title, "Safety & Orientation");
  assert.deepEqual(slides[0].bullets, ["Hard hats required", "Sign in daily"]);
  assert.equal(slides[2].index, 10);
  assert.equal(slides[1].notes, "Emphasize glove ratings");
  assert.equal(slides[0].notes, "");
});

test("parsePptx rejects non-zip input with a clear error", async () => {
  await assert.rejects(() => parsePptx(Buffer.from("not a zip")), /\.pptx/);
});

test("quizToMarkdown round-trips through the LMS grader format", () => {
  const md = quizToMarkdown("PPE Quiz", 80, [
    { question: "Which item is required?", options: ["Sandals", "Gloves", "Shorts"], correctIndex: 1, explanation: "Gloves protect hands" },
    { question: "Where do you sign in?", options: ["Trailer", "Roof", "Office", "Gate"], correctIndex: 3 },
  ]);
  const parsed = parseQuizContent(md);
  assert.equal(parsed.title, "PPE Quiz");
  assert.equal(parsed.passingScore, 80);
  assert.equal(parsed.questions.length, 2);
  assert.equal(parsed.questions[0].correctAnswer, 1);
  assert.equal(parsed.questions[0].options.length, 3);
  assert.equal(parsed.questions[0].explanation, "Gloves protect hands");
  assert.equal(parsed.questions[1].correctAnswer, 3);
});

test("quizToMarkdown clamps an out-of-range correctIndex instead of emitting an ungradeable quiz", () => {
  const md = quizToMarkdown("Edge", 70, [{ question: "Q?", options: ["a", "b"], correctIndex: 9 }]);
  const parsed = parseQuizContent(md);
  assert.equal(parsed.questions[0].correctAnswer, 1);
});
