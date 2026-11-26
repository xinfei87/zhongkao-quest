/**
 * 用 GitHub REST API 部署站点，不依赖 git。
 * 用法：
 *   $env:GH_TOKEN="ghp_xxx"; $env:GH_REPO="zhongkao-quest"; node scripts/deploy-github.mjs
 * 可选：GH_OWNER 指定账号（默认取当前令牌用户）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKEN = process.env.GH_TOKEN;
const REPO = process.env.GH_REPO || 'zhongkao-quest';
const API = 'https://api.github.com';

if (!TOKEN) {
  console.error('缺少 GH_TOKEN 环境变量');
  process.exit(1);
}

async function api(pathname, { method = 'GET', body, raw = false } = {}) {
  const res = await fetch(API + pathname, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: raw ? 'application/vnd.github+json' : 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'zhongkao-quest-deploy',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  if (!res.ok) {
    const err = new Error(`${method} ${pathname} -> ${res.status}: ${typeof data === 'string' ? data : data?.message}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const SKIP_DIRS = new Set(['_source', 'node_modules', '.git', '.trae']);
function walk(dir, base = '') {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    const st = fs.statSync(full);
    if (st.isDirectory()) out.push(...walk(full, rel));
    else if (st.isFile()) out.push(rel);
  }
  return out;
}

async function main() {
  const me = await api('/user');
  const owner = process.env.GH_OWNER || me.login;
  console.log(`账号：${me.login}，仓库：${owner}/${REPO}`);

  // 1. 建仓库（已存在就跳过）
  try {
    await api(`/repos/${owner}/${REPO}`);
    console.log('仓库已存在，直接更新内容');
  } catch (e) {
    if (e.status !== 404) throw e;
    await api('/user/repos', {
      method: 'POST',
      body: {
        name: REPO,
        description: '每日一关 · 初三基础闯关学习平台',
        private: false,
        has_issues: true,
        has_wiki: false,
        auto_init: false,
      },
    });
    console.log('已创建公开仓库');
  }

  // 2. 空仓库没有 commit 时不能建 blob，先用 Contents API 落下第一个提交
  const repoInfo = await api(`/repos/${owner}/${REPO}`);
  const branch = repoInfo.default_branch || 'main';
  let needInit = false;
  try {
    await api(`/repos/${owner}/${REPO}/git/ref/heads/${branch}`);
  } catch (e) {
    if (e.status === 404 || e.status === 409) needInit = true;
    else throw e;
  }
  if (needInit) {
    await api(`/repos/${owner}/${REPO}/contents/.nojekyll`, {
      method: 'PUT',
      body: { message: 'init', content: Buffer.from('\n').toString('base64'), branch },
    });
    console.log(`已初始化 ${branch} 分支`);
  }

  // 3. 逐文件建 blob，再一次性建 tree
  const files = walk(ROOT);
  console.log(`准备上传 ${files.length} 个文件…`);
  const tree = [];
  for (const rel of files) {
    const buf = fs.readFileSync(path.join(ROOT, rel));
    const blob = await api(`/repos/${owner}/${REPO}/git/blobs`, {
      method: 'POST',
      body: { content: buf.toString('base64'), encoding: 'base64' },
    });
    tree.push({ path: rel, mode: '100644', type: 'blob', sha: blob.sha });
    process.stdout.write(`  ${rel}\n`);
  }

  const treeRes = await api(`/repos/${owner}/${REPO}/git/trees`, {
    method: 'POST',
    body: { tree },
  });

  // 3. 建提交并指向 main（已存在则基于旧 head 追加）
  let parents = [];
  try {
    const ref = await api(`/repos/${owner}/${REPO}/git/ref/heads/${branch}`);
    parents = [ref.object.sha];
  } catch (e) {
    if (e.status !== 404 && e.status !== 409) throw e;
  }

  const commit = await api(`/repos/${owner}/${REPO}/git/commits`, {
    method: 'POST',
    body: {
      message: `deploy: 每日一关 ${new Date().toISOString().slice(0, 10)}`,
      tree: treeRes.sha,
      parents,
    },
  });

  if (parents.length) {
    await api(`/repos/${owner}/${REPO}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      body: { sha: commit.sha, force: false },
    });
  } else {
    await api(`/repos/${owner}/${REPO}/git/refs`, {
      method: 'POST',
      body: { ref: `refs/heads/${branch}`, sha: commit.sha },
    });
  }
  console.log('代码已推送：', commit.sha.slice(0, 7));

  // 4. 打开 Pages（优先 Actions，失败则退回分支部署）
  let mode = 'actions';
  try {
    await api(`/repos/${owner}/${REPO}/pages`, {
      method: 'POST',
      body: { build_type: 'workflow' },
    });
    console.log('Pages 已启用（GitHub Actions 发布）');
  } catch (e) {
    if (e.status === 409) {
      console.log('Pages 之前已启用');
    } else {
      mode = 'branch';
      await api(`/repos/${owner}/${REPO}/pages`, {
        method: 'POST',
        body: { source: { branch, path: '/' } },
      }).catch(async (e2) => {
        if (e2.status === 409) return;
        throw e2;
      });
      console.log('Pages 已启用（分支发布）');
    }
  }

  // 5. 触发一次工作流（分支部署则跳过）
  if (mode === 'actions') {
    try {
      await api(`/repos/${owner}/${REPO}/actions/workflows/deploy.yml/dispatches`, {
        method: 'POST',
        body: { ref: branch },
      });
      console.log('已触发部署工作流');
    } catch (e) {
      console.warn('工作流触发失败（可稍等 push 自动触发）：', e.message);
    }
  }

  console.log(`\n站点地址：https://${owner.toLowerCase()}.github.io/${REPO}/`);
  console.log('首次发布通常需要 1~3 分钟，稍后刷新即可。');
}

main().catch((e) => {
  console.error('\n部署失败：', e.message);
  process.exit(1);
});
