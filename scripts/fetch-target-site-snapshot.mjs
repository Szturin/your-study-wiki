import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseUrl = "https://zhentiqiang.com";
const pageUrl = `${baseUrl}/kaoyan/math`;
const outDir = path.join(process.cwd(), "research", "target-site-snapshot", new Date().toISOString().slice(0, 10));

const defaultHeaders = {
  "User-Agent": "Study-Wiki-Wall research snapshot/0.1",
  Accept: "text/html,application/json,text/plain,*/*",
};

async function ensureDir(filePath) {
  await mkdir(path.dirname(filePath), { recursive: true });
}

async function saveText(relativePath, content) {
  const filePath = path.join(outDir, relativePath);
  await ensureDir(filePath);
  await writeFile(filePath, content, "utf8");
}

async function saveJson(relativePath, value) {
  await saveText(relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

async function fetchText(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...defaultHeaders,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText} -> ${url}`);
  }

  return response.text();
}

async function fetchJson(url, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...defaultHeaders,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText} -> ${url}`);
  }

  return response.json();
}

function findAsset(html, pattern) {
  const match = html.match(pattern);
  return match ? new URL(match[0], baseUrl).toString() : null;
}

async function main() {
  const html = await fetchText(pageUrl);
  await saveText("page/index.html", html);

  const assetMap = {
    "assets/index.js": findAsset(html, /\/static\/js\/index\.js\?v=[^"'\\s]+/),
    "assets/login.js": findAsset(html, /\/static\/js\/login\.js\?v=[^"'\\s]+/),
    "assets/index.css": findAsset(html, /\/static\/css\/index\.css\?v=[^"'\\s]+/),
  };

  for (const [relativePath, url] of Object.entries(assetMap)) {
    if (!url) continue;
    const content = await fetchText(url);
    await saveText(relativePath, content);
  }

  const apiPayloads = {
    "api/bootstrap.json": await fetchJson(`${baseUrl}/api/bootstrap`),
    "api/papers-group-8.json": await fetchJson(`${baseUrl}/api/papers/8`),
    "api/knowledge-tree-group-8.json": await fetchJson(`${baseUrl}/api/knowledge_tree/8`),
    "api/question-info-665.json": await fetchJson(`${baseUrl}/api/question_info/665`),
    "api/papergroup-stats-8.json": await fetchJson(`${baseUrl}/api/papergroup_stats/8`),
    "api/question-stats-665.json": await fetchJson(`${baseUrl}/api/question_stats/665`),
    "api/videos-665.json": await fetchJson(`${baseUrl}/api/videos/665`),
    "api/comments-665.json": await fetchJson(`${baseUrl}/api/comments/665`),
    "api/questions-batch-sample.json": await fetchJson(`${baseUrl}/api/questions/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question_ids: [665, 663, 664] }),
    }),
  };

  for (const [relativePath, payload] of Object.entries(apiPayloads)) {
    await saveJson(relativePath, payload);
  }

  await saveJson("meta.json", {
    capturedAt: new Date().toISOString(),
    pageUrl,
    savedAssets: Object.entries(assetMap)
      .filter(([, value]) => Boolean(value))
      .map(([relativePath, url]) => ({ relativePath, url })),
    savedApis: Object.keys(apiPayloads),
    note: "Public-surface research snapshot only. Do not treat this folder as product source code.",
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
