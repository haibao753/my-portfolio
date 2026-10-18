# J.H. Lab / hujinhai.com — Phase 0 仓库 · 部署 · 性能取证报告

- 取证时间：2026-10-18 17:54–18:50（Asia/Shanghai）
- 取证者：`repo-forensics`（Team Lead 的 teammate）
- 对象：线上站 `https://hujinhai.com` ⇄ 公开仓库 `https://github.com/haibao753/my-portfolio`（本地 clone 分支 `main`，HEAD `677b476`，depth 30）
- 证据目录：`audit/evidence/forensics/`（`raw/` 原始 API/日志、`live/` 线上页面快照、`run/` 结构化结果、`metrics.json`）
- 写入范围：仅 `audit/evidence/forensics/`、`my-portfolio/dist/`、`my-portfolio/.astro/`；**未改源码、未 commit、未 push、未部署、未重启共享 Chrome**

## 0. 结论速览

| # | 结论 | 置信度 |
|---|---|---|
| 1 | **线上站就是 `main` HEAD `677b476` 的构建产物**：线上 `/deployment.json` 直接写出该 commit，构建时间与仓库 push 时间仅差 28 秒；HTML 对比除 Cloudflare 边缘注入脚本外与本地构建一致 | 高（直接证据） |
| 2 | 远程 **38 个分支**：6 个已并入 main（含 2 个 liquid-glass 分支），31 个含未合并提交；**4 个 PR 仍 open**（#2/#4/#6/#11）。Liquid Glass 已随 2026-10-15 审批进入 main，专项分支本身未合并 | 高（GitHub API compare） |
| 3 | 构建在本机**可复现**：`npm run check` 0 错误（16.6s）、`npm run build` 成功（7.5s）、`verify-build` 全绿（0.09s）；dist 87 文件 / **50.6 MB**（视频 29.98MB + 原图 19.64MB 占绝大部分） | 高（实跑） |
| 4 | 部署链路 = **push main → Cloudflare Workers Builds 自动构建**（dashboard: Build `npm run build`，Deploy `npx wrangler deploy --config wrangler.production.jsonc`）；GitHub Actions 只做校验不部署；`main` 之外被 `scripts/build-cloudflare.mjs` 守卫禁止默认 deploy。凭据：`GITHUB_PAT` 有且 API 可读验证通过；本机**未发现** Cloudflare token/OAuth 落盘 | 高（配置+文档+时间戳） |
| 5 | 性能基线（无节流、共享 Chrome、可能热缓存）：首页很好（LCP 0.72–0.84s、CLS 0、2–4 个 long task）；**/brief/ 是明确瓶颈**：LCP 2.1–2.7s、**CLS 0.70–0.80（严重）**、8 个 long task 合计 1.8–2.2s，数据 JSON 在 load 事件之后才开始拉取，首条新闻 DOM 插入在导航后 **1.6s(桌面)/2.3s(移动)**；/lab/rotation/ 0.79–1.11s；legacy periodic 页依赖 `unpkg.com` 的 three.js，在本环境 0 字节静默失败。**GPU trace 与 Lighthouse 未采集**（会话中断，见 §10），不编造数字 | 中（单次采样+缓存噪声） |

---

## 1. 方法与可复现命令

所有网络只读：GitHub REST API（`node fetch` + `GITHUB_PAT`）、`raw.githubusercontent` 未用到、线上站 HTML 直接 fetch；git 只做本地只读（`remote -v`/`status`/`log`），**未 fetch、未 push**。浏览器侧只 attach 共享 Chrome `127.0.0.1:9333`（见 `_dsh/AUDIT-HARNESS.md`），不新建、不关闭 Chrome 进程。

```powershell
# 0) 仓库/分支/凭据（只读，不打印 secret）
cd my-portfolio; git remote -v; git status --short; git branch -a; git log --oneline -15; git rev-parse HEAD
git config --get-all credential.helper; git config --get user.name
Get-ChildItem env: | Where-Object { $_.Name -match 'GITHUB|GH_|TOKEN|CLOUDFLARE|CF_|WRANGLER' } | Select-Object -ExpandProperty Name
Test-Path "$env:USERPROFILE\.wrangler"; Get-ChildItem "$env:APPDATA\xdg.config\.wrangler" -Force

# 1) GitHub API 分支/PR 取证（读 5000/h，含每个分支 main...branch compare）
node audit/evidence/forensics/tools/github-forensics.mjs

# 2) 构建基线（记录退出码/耗时/dist 体积）
cd my-portfolio
npm run check            # 0 errors, 0 warnings, 13 hints, 16.63s
npm run build            # astro build + copy-legacy, 7.45s
node scripts/verify-build.mjs   # 11 项 OK + 归档 5 期, 0.09s
Get-ChildItem dist -Recurse -File | Measure-Object -Property Length -Sum   # 87 files / 53,060,917 B

# 3) 线上快照 + live vs 本地 dist 指纹对比
node -e "...fetch('https://hujinhai.com/'+path)...' > audit/evidence/forensics/live/*.html"
node audit/evidence/forensics/tools/compare-live-dist.mjs

# 4) 性能基线（CDP，4 页面 × 2 视口，无 CPU/网络节流）
node audit/evidence/forensics/tools/perf-baseline.mjs   # -> run/perf-baseline.json
node audit/evidence/forensics/tools/periodic-recheck.mjs # legacy periodic 页异常复测

# 5) 数据/资产清单 + metrics.json 汇总
node audit/evidence/forensics/tools/collect-inventory.mjs   # -> run/inventory.json
node audit/evidence/forensics/tools/assemble-metrics.mjs    # -> metrics.json
```

关键环境事实（影响结论）：`node v24.16.0`、`npm 11.13.0`；本地 clone 只有 `main` 与 `origin/main`（浅克隆，无其它远端分支 refs，故分支关系全部走 API compare）；HTML 压缩传输、`server: cloudflare`、`cf-cache-status: HIT`。

---

## 2. 仓库与分支取证

### 2.1 仓库事实（GitHub API）

| 项 | 值 |
|---|---|
| 仓库 | `haibao753/my-portfolio`，**public**，默认分支 `main` |
| 最近 push | `2026-10-18T05:11:19Z`（= 2026-10-18 13:11 北京时间） |
| main HEAD | `677b47638828f782e5a1e4c113931c0a9cf1d952`，提交时间 `2026-10-18T05:11:18Z`（"Manually refresh global briefing 2026-10-18"） |
| main 提交总量 | API 取到 **542** 个（最早 `2026-10-03T13:56:17Z`），即建站后两周内高频迭代 |
| 远程分支 | **38** 个（`main` + 37 个特性分支） |
| PR | 历史 38 个；**open 4 个**，其余已合并 29 个、关闭未合并 5 个（含 #39 `agent/floating-isle-3d`） |
| 容量 | repo size 45,773 KB（GitHub 统计口径） |
| 第二个仓库 | `haibao753/daily-intelligence-brief`：匿名 API **404**，带 `GITHUB_PAT` **200 且 `private: true`**，`pushed_at 2026-10-18T05:28:41Z` → **私有仓库真实存在、且仍在高频发布**；外部不可读取其代码，只能看到它写入公开仓库的产物（见 §7） |

### 2.2 分支总览（main = 基线）

- **已并入 main（ahead=0，共 6 个）**：`codex/liquid-glass-v2-20261015`、`codex/site-performance-20261015`、`experiment/liquid-glass-3d-optics`、`experiment/live-homepage-optics`、`feat/brief-compact-first-screen-20261016`、`refactor/astro-foundation`。
- **含未合并提交（ahead>0，共 31 个）**。关键分支：

| 分支 | 状态 | ahead | behind | 相对 main 改动文件 | 说明 |
|---|---|---:|---:|---|---|
| `feat/lab-001-rotation-mvp-20261016` | diverged | 29 | 22 | 4 | Lab 001 旋转实验（main 已以 PR #24 另路合并） |
| `experiment/scroll-responsive-glass-rim` | diverged | 24 | 230 | 5（`assets/nav-pixel-rim.js` 新增、`experiments/pixel-optics-*.html` 新增、`SiteNav.astro`） | 2026-10-15 玻璃边缘光学实验，**PR #4 open** |
| `experiment/shared-scene-pixel-optics` | diverged | 14 | 230 | 3 | 共享场景 RGB 像素采样原型 |
| `codex/explorable-studio-20261015` | diverged | 13 | 108 | **25** | 滚动驱动液态玻璃作品集预览，**PR #11 open** |
| `design/refractive-liquid-glass` | diverged | 9 | 276 | 4（`SiteNav.astro`+13/−10、`BaseLayout.astro`、`global.css`、e2e） | 移动菜单液态玻璃重做，**PR #2 open**；main 已用另一版实现（见 2.3） |
| `experiment/optical-engine-v1` | diverged | 1 | 225 | 1（仅 e2e 测试） | 光学引擎实机像素验证 |
| `fix/visible-full-scene-glass-edge` | diverged | 1 | 229 | 1（`SiteNav.astro` +18/−15） | 全屏玻璃边缘对比修复，**PR #6 open** |
| `design/clean-hero-labels-20261016` | diverged | 2 | 18 | 2（`Hero.astro`、`index.astro`） | 其对应 PR #28 **已合并**（分支未删） |
| `design/sci-fi-pixel-headline-v2-20261016` | diverged | 6 | 16 | 3 | 对应 PR #30 已合并（分支未删） |
| `design/remove-hero-lead-20261016` | diverged | 1 | 17 | 1 | 对应 PR #29 已合并（分支未删） |
| `design/simplify-slogan-footer-20261016` | diverged | 3 | 20 | 2 | 对应 PR #26 已合并（分支未删） |
| `feat/knowledge-lab-release-20261016` | diverged | 5 | 16 | 5 | 对应 PR #31 已合并 |
| `feat/knowledge-lab-index-20261016` | diverged | 7 | 19 | 5 | PR #27 **关闭未合并** |
| `feat/real-spatial-graph-20261016` / `feat/spatial-reader-prototype-20261016` | diverged | 7 / 3 | 25 / 26 | 3 / 3 | 3D 空间阅读器原型，相关 PR #17/#20/#21 均关闭未合并 |
| `refactor/astro-foundation` | **behind** | 0 | 293 | — | Astro 迁移基础分支，已完全并入 main |

> 读法：`behind` 很大不是问题——这些分支从 10-14/15 的老 main 切出，之后 main 又前进了 200–290 个提交。真正需要关注的是 **open 的 4 个 PR** 与 **ahead 但已另有实现进入 main 的分支**（脏分支，合入前需 rebase 或关闭）。

### 2.3 Liquid Glass 的谱系（关键结论）

1. **Liquid Glass 已经进入 main，并且线上就是它**：main 源码/资源里存在完整实现——`assets/nav-orb.css`、`assets/nav-orb.js`、`assets/glass-navigation.css/js`、`assets/glass-pointer-light.js`、`assets/optical-engine.js`（16.4KB）、`assets/live-homepage-optics.js`（24.8KB）、`assets/menu-liquid-optics.js`、`assets/scene-media.js`、`assets/signature-pen.js`；首页有 `data-native-optics="full-scene"`、`.native-optic-edge` 四条边等标记；`docs/liquid-glass-3-acceptance.md` 与 `AGENTS.md` 记录业主 **2026-10-15 批准把评审过的 Liquid Glass 预览提升到生产**（含 toolbar 玻璃样式）。
2. **专项实验分支没有合并进 main**：`design/refractive-liquid-glass`（ahead 9 / behind 276）、`experiment/scroll-responsive-glass-rim`（ahead 24）、`experiment/shared-scene-pixel-optics`（ahead 14）、`fix/visible-full-scene-glass-edge`（ahead 1）仍是平行宇宙——main 上的是另一版（更收敛的 CSS + 原生光学）实现。`experiment/liquid-glass-3d-optics`、`experiment/live-homepage-optics`、`codex/liquid-glass-v2-*` 已并入或完全落后（ahead=0）。
3. 4 个 open PR 全是玻璃/实验方向：**#2**（移动菜单折射玻璃）、**#4**（滚动响应下缘玻璃反射）、**#6**（全场景玻璃边缘 RGB 响应）、**#11**（scroll-driven explorable studio 预览，25 个文件）。这些 PR 的 base 都是 main，且 behind 108–230，直接合并冲突风险高。
4. 意味着 vNext 若声称“保留/改进 Liquid Glass”，参考对象应是 **main 上的原生光学实现**，而不是这些未合并的实验分支；实验分支可作为灵感/对照，但不能当作现状。

### 2.4 部署路径取证（细节）

**发布链路（证据：`docs/PREVIEW-DEPLOYMENT.md` 明示为 2026-10-15 Cloudflare dashboard 截图核对过的生产配置 + 时间戳吻合）**

```
git push origin main
   └─> Cloudflare Workers Builds（Git 集成，仓库 haibao753/my-portfolio，production branch = main）
         Build command:  npm run build
         Deploy command: npx wrangler deploy --config wrangler.production.jsonc
   └─> Worker `my-portfolio`（Workers Static Assets）→ custom domain hujinhai.com
         assets.directory = ./dist, not_found_handling = 404-page
```

- **构建产物**：`npm run build` = `astro build`（4 个静态路由：`/`、`/brief/`、`/lab/`、`/lab/rotation/`，另有 `robots.txt`、`sitemap.xml` 端点）**+ `scripts/copy-legacy.mjs`**：把 `assets/`、`images/`、`experiments/`、`brief/data/` 原样拷进 `dist/`，并写 `dist/deployment.json = {version:1, commit: git rev-parse HEAD, built_at}`。Astro 独占 `/brief/index.html`，legacy 脚本只拷 JSON。
- **另一条被守卫的入口**：`wrangler.jsonc` 的 `build.command = node scripts/build-cloudflare.mjs`。该脚本：
  1. `assertWorkerCommand(WRANGLER_COMMAND, branch)`：**只有 `deploy`+`main` 允许生产部署**；其它分支只允许 `versions upload`/`preview`/`dev`/`types`，否则抛错（`tests/build-guard.test.mjs` 有 3 条对应用例）；
  2. `git fetch --no-tags --depth=1 origin +main:refs/remotes/origin/main`（刷新远端引用，避免浅克隆 fast-forward 被拒）；
  3. `node scripts/sync-news-preview.mjs`：从 `origin/main` 的 `brief/data/` 读 JSON 覆盖工作区（**预览环境消息同步，失败即退出 1，不发布过期新闻**）；
  4. `npm run build`。
- **GitHub Actions `.github/workflows/astro-preview.yml` 只校验、不部署**：`npm ci` → `npm run check` → build-guard 测试 → `npm run build:cloudflare`（只 build）→ `node scripts/verify-build.mjs` → 三次 `wrangler ... --dry-run`（preview / branch-preview / 默认 root，最后一个注入 `WORKERS_CI_BRANCH=main`）→ 上传 dist artifact → Playwright Chromium e2e。**没有 deploy step**；dry-run 不部署。
- **预览环境**：`wrangler.preview.jsonc` 是**独立 Worker `jhlab-preview`**（`workers_dev: true`，无生产域名/路由）；`wrangler.branch-preview.jsonc` 沿用生产 Worker 名但只做 branch preview 资产配置；`wrangler.production.jsonc` 用于生产手动 deploy（不含 build.command）。`docs/liquid-glass-3-acceptance.md` 还记录过一个 Cloudflare Pages 预览：`experiment-liquid-glass-3d-o.jhlab-preview.pages.dev`（未在本次验证其存活）。
- **时间戳证据链**：commit 时间 `05:11:18Z` → 仓库 `pushed_at 05:11:19Z` → 线上 `built_at 05:11:46.840Z`（**+28 秒**）→ 线上 `commit = 677b476`。这与“push main 触发自动构建”完全吻合；Cloudflare 构建机只跑 `npm run build`，不需要 Cloudflare token 在仓库里（文档：production API build token **只存在 Cloudflare**）。

### 2.5 分支守卫与 PR/推送可行性（只读核查，未尝试写操作）

| 检查项 | 结果 |
|---|---|
| `git remote -v` | `origin https://github.com/haibao753/my-portfolio.git`（HTTPS，非 SSH） |
| `credential.helper` | `manager`（Windows Credential Manager 托管） |
| git user | `haibao753 <hujinhai753@gmail.com>` |
| 环境 token **名称** | **`GITHUB_PAT` 存在**（未打印值）；无 `GITHUB_TOKEN`/`GH_TOKEN` |
| GitHub API 鉴权 | `GET /user` → 200，login `haibao753`；rate limit **5000/h（已认证）**，匿名只有 60/h；Fine-grained PAT 无 `x-oauth-scopes` 头 |
| 写权限（push/PR） | **未验证、未尝试**（任务禁止）。读写 JSON/HTML 已足够证明 token 有效；push/PR 还取决于 PAT 是否具备 Contents/Pull requests 写权限 |
| `gh` CLI | 未安装 |
| Cloudflare 凭据 | 环境无 `CLOUDFLARE_*`/`CF_*` 变量；`%APPDATA%\xdg.config\.wrangler` 只有 `logs/` 与 `metrics.json`（遥测），**没有 `default.toml`/OAuth token**；`wrangler whoami` 因工具调用被策略拒绝未能执行 → 本机是否已登录 Cloudflare **未验证**，但证据倾向于“没有” |
| `~/.wrangler` | 不存在 |

**结论**：用 `GITHUB_PAT` 通过 API 创建分支/PR **在技术上大概率可行**（读已证实、token 有效），但本次一律未尝试；生产部署**不能也不应从本机**发起——生产 token 只在 Cloudflare dashboard，且 `AGENTS.md` 规定只有 main 才允许默认 deploy、重大设计变更需业主批准、必须先在预览验证。vNext 交付应走 **feature 分支 + PR + Cloudflare 预览**，而不是直接改生产。

---

## 3. 构建基线（本机可复现性）

| 步骤 | 退出码 | 耗时 | 结果 |
|---|---:|---:|---|
| `npm run check`（astro check，66 文件） | **0** | **16.63s** | **0 errors / 0 warnings / 13 hints**。hints 全在 legacy 资产：`assets/glass-navigation.js`、`assets/lab-orbits.js`、`assets/signature-pen.js` 的 `addListener` 过时 API（ts6385/6387），`assets/optical-engine.js:209` 构造函数建议改 class（ts80002），`assets/transitions.js`、`src/lib/spatial-reader.ts`、`tests/e2e/*` 共 6 处未使用变量（ts6133） |
| `npm run build` | **0** | **7.45s** | Astro 4 页构建 4.05s（Vite 1.96s + client 980ms + 图片优化 889ms）；copy-legacy 成功；日志：`Astro owns /brief/; preserved legacy assets, experiments and /brief/data/*.json.` |
| `node scripts/verify-build.mjs` | **0** | **0.09s** | 11 个必存路径全 OK；新闻归档校验通过：**5 期，最新 2026-10-18**；`index` 日期严格 “newest-first/无重复/格式合法/每期文件存在”；3 张 `data-portfolio-photo` 图片带 `srcset`+`.webp`；canonical/og:url 正确；`/brief/` 挂载节点与主题/语言切换控件存在。日志中 `Brief interactive reader emitted as Astro script bundle.` 是提示不是失败 |
| **dist 体积** | — | — | **87 files / 53,060,917 B = 50.6 MB** |

构建产物要点（clientside bundle 体积，来自 build 日志）：

| chunk | raw | gzip |
|---|---:|---:|
| `_astro/curiosity-renderer.D3-gsXsy.js`（three.js 渲染器） | **462.96 kB** | 117.96 kB |
| `_astro/index.astro…DcYBYQ3C.js` | 22.33 kB | 9.06 kB |
| `_astro/index.astro…Zg4i2wIH.js` | 10.26 kB | 4.42 kB |
| `_astro/CuriositySculpture…CDPZr9BY.js` | 4.38 kB | 2.16 kB |

图片优化（构建时从 `images/` 原图生成 9 个 webp 变体，**原图仍随 legacy copy 进 dist**）：`2.jpg` 9562kB→62kB、`4.jpg` 3757kB→124kB、`5.jpg` 4097kB→91kB、另各 2 个 srcset 小图（12–68kB）。**结论：本机构建可复现、无阻塞**；`build:cloudflare`/`validate`（含 e2e）未跑（前者会 `git fetch origin main`，在 git-protocol 不稳的当前环境无必要；后者耗时且非本阶段必需）。

---

## 4. 线上 vs main 一致性（核心交付）

**结论：线上站 = 本地 main HEAD `677b476` 的构建产物，不存在“线上来自另一个分支/更旧提交”的情况。**

### 4.1 决定性证据

1. `https://hujinhai.com/deployment.json`（**公开可访问**，由 `copy-legacy.mjs` 在构建时写入）：

   ```json
   {"version":1,"commit":"677b47638828f782e5a1e4c113931c0a9cf1d952","built_at":"2026-10-18T05:11:46.840Z"}
   ```

   本机 clone `git rev-parse HEAD` = 同一 SHA；GitHub API `main` 最新提交 = 同一 SHA（`2026-10-18T05:11:18Z`）。`built_at` 与 push 时间相差 **28 秒**。
2. 本地 `npm run build` 生成的 `dist/deployment.json` 的 `commit` 与线上一字不差，仅 `built_at` 不同（本机 09:58Z）。
3. **HTML 指纹对比**（本地 dist vs 线上抓取）：

| 页面 | 线上字节 | 本地 dist 字节 | 差 | `/_astro` 资源 URL | 环境内联脚本 | 说明 |
|---|---:|---:|---:|---|---|---|
| `/` | 75,274 | 74,336 | **+938** | **6/6 完全相同**，无单边资源 | 6 个 ambient inline script **逐字节相同**；线上多 1 个 921 字符内联脚本 | +938B 就差在这一个 Cloudflare 注入脚本 |
| `/brief/` | 21,366 | 20,428 | **+938** | 3/3 相同 | 同上，线上多同一脚本 | 同上 |
| `/lab/rotation/` | 25,957 | 25,019 | **+938** | 3/3 相同 | 同上，线上多同一脚本 | 同上 |
| legacy `minimal-surfaces-periodic` | 17,208 | 16,786 | +422 | 页面无 `/_astro` | 线上多 cloudflareinsights beacon | 其余差异为 **CRLF→LF** 归一（本地 517 行全带 `\r`，线上无）+ 边缘注入 |
| legacy `minimal-surfaces-classical` | 13,992 | 13,480 | +512 | 同上 | 同上 | 同上 |

4. 线上多出的内联脚本内容 = Cloudflare 机器人管理/挑战平台注入（`window.__CF$cv$params` + `/cdn-cgi/challenge-platform/scripts/jsd/main.js`），**不是仓库代码**；线上还存在 `/cdn-cgi/speculation`、`/cdn-cgi/rum`、`static.cloudflareinsights.com/beacon.min.js` 等边缘产物，本地构建里全都没有。
5. 线上响应头：`server: cloudflare`、`content-encoding: br`、`cache-control: public, max-age=0, must-revalidate`、`cf-cache-status: HIT`、`speculation-rules: "/cdn-cgi/speculation"`；无 HSTS/CSP 等安全头（未配置）。`.html` 后缀被 307 重定向到无后缀 clean URL（如 `/experiments/minimal-surfaces-periodic.html` → `/experiments/minimal-surfaces-periodic`，`/brief` → `/brief/`）——这是 Cloudflare/Workers Assets 行为，不是 Astro 路由差异。

### 4.2 判读

- “线上与本地 main 构建的 HTML 不同”**不构成“线上不是 main”的证据**：差异 100% 可归因于 Cloudflare 边缘注入（home/brief/rotation 恰好 +938B = 挑战脚本；legacy 页为边缘 HTML 归一 + insights beacon）。
- `/assets/*.js`（liquid glass/optics 系列）与 `/_astro/*` 的哈希文件名在线上线下一致，说明 main 上的玻璃/光学实现就是线上实现。
- 只要后续 vNext 从 main 切出就不会丢现状；反过来，**任何“从旧 liquid-glass 分支继续”的方案都会丢失 main 上近 300 个提交的现状**。

---

## 5. 性能基线（线上站，CDP 实测）

### 5.1 方法与环境（重要限制先读）

- 共享 headless Chrome `127.0.0.1:9333`（sandbox 内不能自建 Chrome），每个视口新建 target；`Emulation.setDeviceMetricsOverride` 390×844 / 1440×900，DSF=1，mobile 视口开 touch。
- **无 CPU / 网络节流**（`Network.emulateNetworkConditions` 未启用、CPU throttling 未启用）→ 数字是“桌面级网络+强 CPU”基线，偏乐观；不是 Lighthouse 口径。
- 导航前注入 PerformanceObserver（LCP/CLS/longtask），load 后 settle 2.6s + 0.4s 再采样；每页每视口**单次采样**。
- **共享 Chrome 的持久 profile 可能已被其它 audit teammate 预热缓存**：CDP `PerformanceResourceTiming.transferSize` 出现大量固定值 `300`（缓存占位），`encodedBodySize=0` → **字节数不可用 transferSize，改用 encodedBodySize**，资源字节统计仅对未命中缓存的部分准确。
- 本次会话被中断，**没有采集 Chrome trace，也没有跑 Lighthouse**（见 §10）；下表只有 CDP 指标，没有 GPU/主线程函数级归因。

### 5.2 主表（LCP / CLS / TTFB / long tasks / 内存 / DOM / 资源数）

| 视口 | 页面 | LCP (ms) | LCP 元素 | CLS | TTFB (ms) | FCP (ms) | long task（次数/合计/最长） | JS heap | DOM 节点 | 资源数 |
|---|---|---:|---|---:|---:|---:|---|---:|---:|---:|
| 390×844 | `/` | **840** | `H2` | **0** | 365 | 840 | 2 / 172ms / 86ms | 4.8 MB | 568 | 16 |
| 390×844 | `/brief/` | **2,748** | `H3` | **0.7044** | 681 | 1,116 | 8 / 1,808ms / 399ms | 5.5 MB | **1,863** | 18 |
| 390×844 | `/lab/rotation/` | 792 | `H1` | 0 | 188 | 792 | 6 / 522ms / 87ms | 4.6 MB | 266 | 12 |
| 390×844 | legacy periodic | 1,472 | `H1` | 0 | 1,230 | 1,472 | 8 / 1,704ms / 213ms | 10.4 MB | 36 | 8 |
| 1440×900 | `/` | **720** | `SPAN.hero-title-line` | **0** | 153 | 720 | 4 / 478ms / 177ms | 4.1 MB | 568 | 13 |
| 1440×900 | `/brief/` | **2,116** | `H3` | **0.7986** | 231 | 596 | 8 / 2,180ms / 470ms | 4.1 MB | **1,863** | 18 |
| 1440×900 | `/lab/rotation/` | 1,108 | `H1` | 0 | 568 | 1,108 | 0 / 0 / 0 | 5.4 MB | 266 | 12 |
| 1440×900 | legacy periodic | 25,688* | `H1` | 0 | 21,265* | 25,688* | 8 / 776ms / 97ms | 9.4 MB | 36 | 6 |

\* periodic@1440 首次采样是**离群异常**（TTFB 21.3s，所有子资源在 21,275ms 才一起开始，疑似网络停摆）；随后同页同视口两次复测：RUN1 TTFB 3,010ms / LCP 3,744ms，RUN2 TTFB 445ms / LCP 1,188ms → **该行不能作为代表性数字**，legacy 页真实 TTFB 波动在 0.4–3.0s。

其余 CDP 计数（首屏执行开销，`Performance.getMetrics`）：首页 390 视口 TaskDuration 825ms / ScriptDuration 250ms / Layout 81 次 / StyleRecalc 98 次；brief 390：Task 664ms / Script 192ms / Layout 13 / StyleRecalc 34；rotation 390：Task 238ms / Script 95ms；periodic 390：Task 544ms / Script 327ms / StyleRecalc 166。

### 5.3 关键发现

1. **`/brief/` 是最大性能问题（且与“核心内容页”定位冲突）**
   - **CLS 0.7044（移动）/ 0.7986（桌面）** —— 远超良好阈值 0.1，属于“严重布局跳动”。偏移发生在数据渲染阶段（具体偏移元素未做归因，需 CLS attribution 复测）。
   - LCP 2.1–2.7s（首页同类指标 0.72–0.84s，差 **3–4 倍**）；LCP 元素是 `H3`（新闻标题），说明首屏要等数据。
   - **8 个 long task，合计 1.8–2.2s，最长 399–470ms** → 主线程在首屏被数据解析+渲染+玻璃/光学脚本连续占用。
   - **数据瀑布（实测，390 视口）**：`/brief/data/index.json` 在 **1,959ms**（导航开始后）才发起，`2026-10-18/17/16` 三个期号 JSON 在 **2,154ms** 并发发起，耗时 165–181ms；`#stories` 容器在 704ms 就存在，但**第一条新闻 DOM 插入在 2,329.6ms**；桌面视口对应 1,150ms → 1,352ms → **1,616.0ms**。即“**brief 列表可见 ≈ 导航后 1.6s（桌面）/ 2.3s（移动）**”（DOM 插入时刻；视觉完全稳定还要更晚）。
   - JSON 体积：`index.json` 111B encoded / 178B decoded；`2026-10-18.json` 13,870B / 34,968B；`2026-10-17.json` 35,123B / 101,252B；`2026-10-16.json` 7,932B / 17,769B（三天期号被**无条件提前加载**，即使只看最新一期）。
2. **首页基线其实很好**：LCP 720–840ms、CLS 0、heap 4.1–4.8MB、DOM 568、资源 13–16 个；页面挂载的 legacy 光学脚本共 8 个（`live-homepage-optics.js` 24.8KB、`optical-engine.js` 16.4KB、`menu-liquid-optics.js`、`signature-pen.js`、`glass-pointer-light.js`、`nav-orb.js?v=3`、`scene-media.js` 等）+ `curiosity-renderer`（gzip 118KB，含 three.js）。后续优化空间主要在 brief 页与 bundle 拆分，不在首页首屏。
3. **`/lab/rotation/` 轻量**：DOM 仅 266、资源 12、桌面 0 个 long task；移动端 6 个 long task 合计 522ms、LCP 792ms，可接受。
4. **legacy minimal-surface 页存在外部依赖脆弱性**：`/experiments/minimal-surfaces-periodic.html` 运行时从 **`https://unpkg.com/three@0.160.0/...`** 加载 three.js（另外 `OrbitControls`）；在本环境这些请求 **2–8ms 返回 0 字节且页面无 console error**（静默失败），页面脚本列表里也看不到它们 → 3D 曲面在这种网络下会静默降级/失效。这既是“legacy 页不能离线/本地稳定预览”的原因，也是外部 CDN 单点依赖风险。
5. **第三方/边缘开销**：Cloudflare 注入的 `cdn-cgi/rum` XHR 在移动 rotation 页耗时 **2,381ms**（beacon 类，非阻塞，但会计入资源耗时）；`static.cloudflareinsights.com/beacon.min.js` 在 legacy 页出现；`/cdn-cgi/speculation` 出现于多页。这些在生产存在、本地预览不存在，对比性能时要扣掉。

### 5.4 未完成项（明确声明，未以估算代替）

| 项 | 状态 | 原因 |
|---|---|---|
| Chrome trace（`Tracing.start`：devtools.timeline,gpu,v8）首页滚动 & rotation 拖拽 | **未采集** | 会话在 trace 阶段前被中断；本报告不提供任何 GPU/帧耗时/函数级数字 |
| Lighthouse（`npx lighthouse`，`/` 与 `/brief/` mobile） | **未运行** | 未尝试：Lighthouse 默认自行启动/接管 Chrome，与“共享 Chrome 不得干扰”冲突；如要跑应使用 `--port=9333` 连接现有实例，但会与其它 audit agent 争用，且需额外时间。**无 Lighthouse 分数可报** |
| 节流口径（4× CPU / Slow 4G） | 未测 | 仅无节流基线 |
| dark mode / reduced-motion / 键盘 / 多语言 下的性能 | 未测 | 本阶段只测默认 light、无 reduced-motion |
| Playwright e2e（`npm run test:e2e`） | 未跑 | 超出取证范围（且会启动浏览器） |

---

## 6. 数据与资产清单

### 6.1 Daily Brief 数据（`brief/data/`，公开、由私有自动化仓库写入）

**索引 `index.json`**：`{version:1, dates:[...], updated_at}`；`dates` newest-first 共 **5 期**：`2026-10-18, 2026-10-17, 2026-10-16, 2026-10-15, 2026-10-14`；`updated_at = 2026-10-18T05:11:18.010453+00:00`，**与 main HEAD 提交时间同一秒** → 该自动化把 JSON 提交进本公开仓库（`pushed_at/updated_at` 双证）。

**期号 `YYYY-MM-DD.json`**：`{version, date, editions, items[]}`；`items[]` 每项 15 个字段：`source_type, verification_status, material_scope, related_coverage, category, source, published, url, title_zh, summary_zh, why_zh, details_zh, original_title, focus, edition`（`edition ∈ {morning, evening}`，`focus` 布尔，`related_coverage` 数组）。**最新一期 2026-10-18：21 条**（首条为 `focus:true` 的 esp32sim Hacker News 线索；每期条数：10-18=21、10-17=47、10-16=9、10-15=8、10-14=12）。

> 第二个仓库 `haibao753/daily-intelligence-brief` 是**私有**（匿名 404 / 认证 200/private=true），外部无法读取其代码/工作流；可公开确证的只有：它持续向 `my-portfolio/brief/data/` 推送上述 schema 的 JSON（`AGENTS.md`：“separate private news automation publishes into brief/data/; do not alter its schema or pipeline”）。**没有任何公开证据**能证明其内部实现或部署形态，vNext 不应假设可改其 pipeline。

### 6.2 资产体积（repo 内，不含 node_modules/.git/dist）

| 目录 | 体积 | 说明 |
|---|---:|---|
| `public/` | **29.34 MB** | 2 个视频：`Video_1792127365800_461.mp4` **16.24MB**、`Video_1792127358357_245.mp4` **12.35MB**（合计 28.59MB）+ 2 张视频封面 jpg ≈0.75MB |
| `images/` | **19.64 MB** | 5 张作品原图：`2.jpg` 9.34MB、`5.jpg` 4.00MB、`4.jpg` 3.67MB、`3.jpg` 2.26MB、`1.jpg` 0.36MB（构建时优化成 webp srcset，但原图仍随 legacy copy 部署） |
| `brief/` | 0.19 MB | 5 期 JSON + index（2026-10-17.json 最大 0.10MB） |
| `assets/` | 0.22 MB | 玻璃/光学/签名等 legacy JS/CSS（`glass-navigation.css` 26KB、`live-homepage-optics.js` 24.7KB、`optical-engine.js` 16.4KB、`nav-orb.css` 4.7KB 等） |
| `src/` | 0.24 MB | Astro 源码（26 个文件） |
| 合计（132 文件） | **52.64 MB** | 构建后 dist 87 文件 / **50.6MB**（视频+原图≈49.6MB 是主体） |

外部链接（首页 HTML 实际出现）：`space.bilibili.com`（个人空间）、`www.bilibili.com/video/`（B 站弹窗）、`zhengyifan.win`、`entropy-sandbox.pages.dev`；legacy periodic 页另有 `unpkg.com`、Cloudflare 注入的 `static.cloudflareinsights.com`。微信联系为页面内复制控件（无外链）。全部 `rel` 行为需在 vNext 保留（`AGENTS.md` 要求 external link rel 属性）。

### 6.3 dist 路由完整性（本地构建）

`/`、`/brief/`、`/lab/`、`/lab/rotation/`、`/experiments/minimal-surfaces-classical`、`/experiments/minimal-surfaces-periodic`、`/experiments/liquid-glass-optics`、`/deployment.json`、`/robots.txt`、`/sitemap.xml`、`/brief/data/index.json` —— **11 项全部存在**（`verify-build.mjs` 亦逐项校验）。

### 6.4 会阻断/干扰本地预览的因素（vNext 开发前必读）

1. **不要用 `npm run build:cloudflare` 做本地构建**：它会 `git fetch --depth=1 origin main` 并运行 `sync-news-preview.mjs`，在当前“GitHub git 协议极慢/不稳”的环境里可能挂起/失败；本地预览请用 **`npm run build` + `astro preview`**（或 `npm run dev`）。
2. `sync-news-preview.mjs` 强依赖 `origin/main` 引用与 `brief/data/index.json`，缺失即 `exit 1`。
3. **legacy periodic 页依赖 `unpkg.com` 的 three.js**：本环境请求 0 字节、无报错 → 本地/离线预览时 3D 曲面可能静默不渲染；仓库没有该路由的本地 three 副本。
4. **Cloudflare 注入功能在本地不存在**：`/cdn-cgi/*`、challenge-platform、insights beacon、speculation rules、clean-URL 307 都不在 `dist/` 里；本地预览无法复现这些边缘行为，构建产物对比时要扣掉。
5. **路由形态差异**：线上 `.html` 被 307 到无后缀 clean URL，本地 `astro preview` 按字面 `.html` 提供；若 vNext 新增 SPA/客户端路由，需注意线上 Workers Assets 的 `not_found_handling: 404-page`。
6. **图片 webp srcset 是构建期生成**（不入库），`images/*.jpg` 原图是唯一源；legacy 页仍可能引用原图（原图也随 dist 发布）。
7. `dist/deployment.json` 由构建时 `git rev-parse HEAD` 生成；**在非 git 目录/CI 无 .git 环境下构建会失败**（copy-legacy 第 24 行无 try/catch）。

---

## 7. 证据文件索引

| 路径 | 内容 |
|---|---|
| `audit/evidence/forensics/metrics.json` | 机器可读汇总（仓库/部署/构建/live-vs-main/性能/数据/资产/阻断点） |
| `audit/evidence/forensics/raw/branches.json` | 38 个远程分支（name/protected/commit） |
| `audit/evidence/forensics/raw/compares-summary.json` + `raw/compares/*.json` | 每个分支 `compare main...branch`（status/ahead/behind/commits/files） |
| `audit/evidence/forensics/raw/main-commits.json` | main 542 个提交（sha/date/message） |
| `audit/evidence/forensics/raw/pulls.json` | 38 个 PR（4 个 open） |
| `audit/evidence/forensics/raw/repo-meta-auth.json` / `user-auth-repos.json` / `repo-daily-brief-*.json` | 仓库元数据、认证身份、私有 daily-brief 仓库可见性（404 anon / 200 auth） |
| `audit/evidence/forensics/raw/build-baseline.log` | check/build/verify-build 完整输出 + 退出码 + 耗时 + dist 体积 |
| `audit/evidence/forensics/live/*.html` + `*.headers.json` | 线上 6 个页面快照与完整响应头（含 `deployment.json`） |
| `audit/evidence/forensics/run/live-vs-dist.json` | 线上 vs 本地 dist 的逐页哈希/资源/内联脚本/探针对比 |
| `audit/evidence/forensics/run/perf-baseline.json` | 4 页 × 2 视口的原始 CDP 性能数据（含资源瀑布、brief 数据耗时、DOM/heap/longtask） |
| `audit/evidence/forensics/raw/perf-summary.txt` | 上述性能数据的可读摘要 |
| `audit/evidence/forensics/raw/periodic-recheck.txt` | legacy periodic 页 3 次采样（证明 21s TTFB 为离群） |
| `audit/evidence/forensics/run/inventory.json` + `raw/inventory-console.log` | brief schema/期号条数、资产体积、外链、dist 路由 |
| `audit/evidence/forensics/tools/*.mjs` | 全部可复现脚本（github-forensics / compare-live-dist / perf-baseline / periodic-recheck / collect-inventory / assemble-metrics） |

---

## 8. 局限与未完成（对 Lead 的明确交代）

1. **没有 Chrome trace**（首页滚动 GPU/主线程、rotation 拖拽）→ 本报告没有 GPU 帧耗时、raster 成本、top JS 函数归因；这些是 Phase 0 性能建议的缺口，需要时可在共享 Chrome 上补采（脚本可基于 `Tracing.start` + `audit-lib` 续写）。
2. **没有 Lighthouse 分数**（原因见 §5.4），LCP/CLS/TBT 只用 CDP 口径；与 Lighthouse 数字不可直接比较。
3. 性能为**单次采样、无节流、可能热缓存**：绝对值偏乐观；CLS 0.70+ 与 brief 的 1.6–2.3s 首条可见是稳健的方向性结论，但精确 P75 需多次采样+冷缓存+节流。
4. `periodic` legacy 页 TTFB 波动大（0.4–21s），仅能定性；其 `unpkg` 失败原因（CORS/网络/取消）未逐请求取证。
5. 未验证 Cloudflare dashboard 当前配置（无权限）；生产部署链路依据 `docs/PREVIEW-DEPLOYMENT.md`（2026-10-15 截图核对记录）+ 线上 `deployment.json` 时间戳推断，**未做过任何部署操作**。
6. 未运行 e2e、未测 dark/reduced-motion/i18n 下的性能与可访问性（不属本任务）。
