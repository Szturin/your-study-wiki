import { mkdirSync, writeFileSync } from "node:fs";

const key = process.env.WALL_PASSPHRASE;
if (!key) throw new Error("WALL_PASSPHRASE required");
mkdirSync("tmp/english-qa", { recursive: true });
const origin = "http://localhost:3096/your-study-wiki/";
const targets = await (await fetch("http://127.0.0.1:9223/json/list")).json();
const target = targets.find(item => item.type === "page" && (item.url === "about:blank" || item.url.startsWith("http://localhost:3097/your-study-wiki/") || item.url.startsWith(origin)));
if (!target) throw new Error("No isolated browser page");
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
let nextId = 0;
const pending = new Map();
socket.onmessage = ({ data }) => {
  const message = JSON.parse(data);
  if (!message.id) return;
  const handler = pending.get(message.id);
  if (handler) { pending.delete(message.id); handler(message); }
};
function send(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`${method} timeout`)); }, 20000);
    pending.set(id, message => { clearTimeout(timeout); if (message.error) reject(new Error(message.error.message)); else resolve(message.result); });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const response = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
  return response.result.value;
}
async function until(expression) {
  for (let i = 0; i < 60; i++) {
    const value = await evaluate(expression);
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  const detail = await evaluate("({text:document.body.innerText.slice(0,500),scripts:document.scripts.length})");
  throw new Error(`UI did not reach expected state: ${expression}; ${JSON.stringify(detail)}`);
}
await send("Page.enable");
await send("Runtime.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1360, height: 900, deviceScaleFactor: 1, mobile: false });
await send("Page.navigate", { url: "about:blank" });
await new Promise(resolve => setTimeout(resolve, 250));
await send("Page.navigate", { url: `${origin}#local-key=${encodeURIComponent(key)}` });
await until("document.querySelector('.study-portal .portal-subject-english') !== null");
await evaluate("document.querySelector('.global-settings-trigger').click()");
await until("document.querySelector('.global-settings-panel') !== null");
await evaluate("document.querySelectorAll('.global-setting-options')[0].children[1].click(); document.querySelectorAll('.global-setting-options')[3].children[1].click()");
await until("document.querySelector('.sync-widget')?.dataset.display === 'compact'");
await evaluate("document.querySelectorAll('.global-setting-options')[3].children[2].click()");
await until("document.querySelector('.sync-widget')?.hidden === true");
await evaluate("document.querySelectorAll('.global-setting-options')[3].children[1].click()");
await until("document.querySelector('.sync-widget')?.hidden === false");
const modelOptions = await evaluate("document.querySelectorAll('#writing-model option').length");
const portalDark = await evaluate("getComputedStyle(document.querySelector('.study-portal')).backgroundColor");
const portalShot = await send("Page.captureScreenshot", { format: "png" });
writeFileSync("tmp/english-qa/portal-dark.png", Buffer.from(portalShot.data, "base64"));
await evaluate("document.querySelector('.global-settings-trigger').click(); document.querySelector('.portal-subject-signal').click()");
await until("document.querySelector('.wall-app') !== null");
const signalDark = await evaluate("getComputedStyle(document.querySelector('.wall-app')).backgroundColor");
const signalShot = await send("Page.captureScreenshot", { format: "png" });
writeFileSync("tmp/english-qa/signal-dark.png", Buffer.from(signalShot.data, "base64"));
await evaluate("localStorage.setItem('english-reading-preferences-v1', JSON.stringify({theme:'dark',size:20,spacing:'relaxed',width:'normal'})); window.dispatchEvent(new Event('study-record-restored')); document.querySelector('.wall-tree-chapter').click()");
await until("document.querySelector('.wall-question') !== null");
const questionFont = await evaluate("getComputedStyle(document.querySelector('.wall-question')).fontSize");
const imageViewer = await evaluate("Boolean(document.querySelector('.wall-question-image'))");
const questionImageWidth = imageViewer ? await evaluate("document.querySelector('.wall-question-image').naturalWidth") : 0;
let viewerImageWidth = 0;
if (imageViewer) {
  await evaluate("document.querySelector('.wall-image-zoom-trigger').click()");
  await until("document.querySelector('.wall-image-viewer') !== null");
  await until("document.querySelector('.wall-image-viewer img')?.naturalWidth > 0");
  viewerImageWidth = await evaluate("document.querySelector('.wall-image-viewer img').getBoundingClientRect().width");
  await evaluate("document.querySelector('.wall-image-viewer-close').click()");
}
const questionShot = await send("Page.captureScreenshot", { format: "png" });
writeFileSync("tmp/english-qa/signal-question-dark.png", Buffer.from(questionShot.data, "base64"));
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const signalMobileOverflow = await evaluate("document.documentElement.scrollWidth > innerWidth");
const signalMobileShot = await send("Page.captureScreenshot", { format: "png" });
writeFileSync("tmp/english-qa/signal-question-mobile.png", Buffer.from(signalMobileShot.data, "base64"));
await send("Emulation.setDeviceMetricsOverride", { width: 1360, height: 900, deviceScaleFactor: 1, mobile: false });
await evaluate("document.querySelector('.wall-practice-header .wall-quiet').click()");
await until("document.querySelector('.wall-portal-return')?.offsetParent !== null");
await evaluate("document.querySelector('.wall-portal-return').click()");
await until("document.querySelector('.portal-subject-english') !== null");
await evaluate("document.querySelector('.portal-subject-english').click()");
await until("document.querySelector('.portal-english-links') !== null");
await evaluate("document.querySelector('.portal-english-links button').click()");
await until("document.querySelectorAll('.english-article-list button').length > 0");
const articles = await evaluate("document.querySelectorAll('.english-article-list button').length");
await evaluate("document.querySelector('.global-settings-trigger').click()");
await until("document.querySelector('.global-settings-panel') !== null");
await evaluate("document.querySelectorAll('.global-setting-options button')[1].click()");
const dark = await evaluate("document.querySelector('.english-workspace').classList.contains('is-dark')");
const desktop = await send("Page.captureScreenshot", { format: "png" });
writeFileSync("tmp/english-qa/desktop.png", Buffer.from(desktop.data, "base64"));
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const mobile = await send("Page.captureScreenshot", { format: "png" });
writeFileSync("tmp/english-qa/mobile.png", Buffer.from(mobile.data, "base64"));
const overflow = await evaluate("document.documentElement.scrollWidth > innerWidth");
await evaluate("document.querySelector('.global-settings-trigger').click(); document.querySelectorAll('.english-subnav button')[1].click()");
await until("document.querySelectorAll('.english-question').length > 0");
const question = await evaluate("document.querySelector('.english-question h2').textContent");
await evaluate("localStorage.setItem('english-reading-answers-v1', JSON.stringify({'2000-T1-Q11':{choice:'C'}})); window.dispatchEvent(new Event('study-record-restored'))");
await until("document.querySelector('.english-question .english-options button.selected b')?.textContent === 'C'");
const stayedInQuestions = await evaluate("document.querySelector('.english-subnav button[aria-selected=true]')?.textContent === '题目与选项'");
await evaluate("document.querySelector('.english-back').click()");
await until("document.querySelector('.portal-english-links') !== null");
await evaluate("document.querySelectorAll('.portal-english-links button')[1].click()");
await until("document.querySelector('.english-writing') !== null");
const templates = await evaluate("document.querySelectorAll('.english-subnav button').length");
const methodSections = await evaluate("document.querySelectorAll('.english-method-section').length");
const writingOverflow = await evaluate("document.documentElement.scrollWidth > innerWidth");
const writingMobile = await send("Page.captureScreenshot", { format: "png" });
writeFileSync("tmp/english-qa/writing-mobile.png", Buffer.from(writingMobile.data, "base64"));
await evaluate("document.querySelector('.english-back').click()");
await until("document.querySelector('.portal-english-links') !== null");
await evaluate("document.querySelectorAll('.portal-english-links button')[2].click()");
await until("document.querySelectorAll('.english-knowledge').length > 0");
const knowledge = await evaluate("document.querySelectorAll('.english-knowledge').length");
console.log(JSON.stringify({ articles, question: question.slice(0, 70), mobileOverflow: overflow, signalMobileOverflow, dark, portalDark, signalDark, questionFont, questionImageWidth, viewerImageWidth, modelOptions, stayedInQuestions, writingTabs: templates, methodSections, writingOverflow, knowledge }));
socket.close();
