# J.H. Lab vNext — Phase 0 现场审查报告

> 状态：已完成（真实浏览器 + 仓库/部署/性能取证）
> 审查对象：`https://hujinhai.com`（= `haibao753/my-portfolio` `main` @ `677b476`，由 `/deployment.json` 明示 commit 与构建时间核对）
> 审查时间：2026-10-18（Asia/Shanghai）
> 工具：共享 headless Chrome 155（CDP，390×844 / 430×932 / 768×1024 / 1440×900，DPR 1，触摸/滚轮/键盘/网络节流/CDP tracing）
> 证据目录：`web_design/audit/`（本工作区，未入库）；机器可读汇总见 `audit/evidence/{home,brief,lab,forensics}/metrics.json`

---

## 0. 结论速览

1. **线上就是 main**：`/deployment.json` 返回 `commit=677b476…`、`built_at` 比 push 晚 28s；本地 `npm run build` 产物与线上 HTML 仅在 Cloudflare 边缘注入（bot challenge script / insights）上不同。**不存在“线上跑着另一个分支”的情况**；37 个远端实验分支均未合入 main，不能当作现状基线。
2. **Liquid Glass 已在 main 上线**：`assets/optical-engine.js` + `live-homepage-optics.js` + `menu-liquid-optics.js` 在真实浏览器中确实启用了 WebGL 材质（`data-optical-material="liquid-v2"`、`data-live-optics="on"`），不是纯 CSS blur。它需要保留并局部加固，而不是推倒重来。
3. **最严重的问题不是视觉，是信息架构与数据状态**：
   - 每日简报首屏 **CLS 0.16–0.80**（冷/热缓存差异巨大），由“状态行脱离文档流 + 77 张卡片晚到 + 晚到 CSS”叠加造成；LCP 2.1–2.7s。
   - 知识实验室与首页“交互几何”是两套互不相通的入口；`/lab/` 只列旋转实验，两个极小曲面实验被留在了 legacy 页。
   - 3D 知识空间在生产环境默认**没有入口**（仅 `?experimentalGraph=1`），且其位置/颜色/连线不承载任何真实语义；拖动松手会误选节点。
   - 极小曲面 legacy 页完全脱离站点外壳；返回链接 `/#computing` 是**死锚点**；依赖 unpkg CDN 且失败无兜底；无参数读数、无数学解释、无重置视角、reduced-motion 下仍自动旋转。
4. **首页基础质量比预期好**：无横向溢出，无 JS 时内容完整可读，Reduced Motion 下无像素动画且文字完整；移动菜单 open/close 无闪断，GPU 玻璃在菜单打开时生效；视频首页内播放可用（HEAD 探测通过后 3s 内 `readyState=4`）。首页主要问题是**内容层级与卡片个性**，不是可用性缺陷。
5. **性能目标现状**：首页 LCP 0.72–0.84s（本机无节流）达标；**简报 LCP 2.1–2.7s、CLS 严重超标**；旋转实验 LCP 0.79–1.11s、CLS 0；3D/极小曲面存在 GPU/长任务成本，但未发现崩溃或持续掉帧。目标值：LCP≤2.5s、CLS≤0.1、INP≤200ms（以实施后实测为准）。

---

## 1. 审查方法与环境

- **真实浏览器**：共享 headless Chrome（CDP），每个状态单独 target；每次记录 console/exception/failed requests、LCP/CLS/long task/layout-shift sources、页面几何、滚动宽度、截图；动画状态用 `Page.startScreencast` 抽帧。
- **状态矩阵**：初始加载（冷/热）、滚动、hover、触摸/拖拽、菜单开合、卡片/视频展开、返回（history.back）、明暗主题、中英文、200% 缩放、Reduced Motion、弱网、离线、数据请求失败、WebGL 不可用（部分）。
- **仓库/部署**：GitHub API（38 分支、542 commits、compare）、`npm run check/build/verify-build`、live HTML vs 本地 dist 指纹、`/deployment.json`。
- **性能**：CDP `Performance`/`PerformanceObserver`（LCP、CLS、longtask、event timing、JSHeap、DOM nodes、resource timing）；网络无节流（本机）并标注共享 Chrome 竞争导致的抖动。
- **限制如实记录**：GPU trace、Lighthouse、cold-cache P75、真实 Android/iOS 设备未测；共享 Chrome 的 `localStorage` 曾在不同 agent 间串用（已对关键结论复测/清洗 storage）。

**证据索引（工作区）**

| 证据 | 路径 |
|---|---|
| 首页 hero 逐帧/矩阵 | `audit/evidence/home/`、`audit/home-*` |
| 简报/3D 交互与 JSON | `audit/evidence/brief/`、`audit/brief-*` |
| 实验室/旋转/极小曲面 | `audit/evidence/lab/`、`audit/{lab,rotation,classical,periodic}-*` |
| 仓库/部署/性能/数据 | `audit/evidence/forensics/` |
| Lead 复核探针 | `audit/evidence/lead/` |

---

## 2. 全局问题（跨页面）

### [G-01] 移动端顶栏在晚到样式下产生布局位移
- 页面/组件：全站导航 `.glass-nav`（`assets/nav-orb.css` 由 `<link>` 异步到达）
- 复现：移动网络冷加载 `/brief/`；观察 700–900ms 时导航高度/位置变化
- 当前：header 高度 60→72px，页面内容整体下移 12px；layout-shift 归因到 `.controls`/`.brief-filter`；单次 0.055
- 预期：导航首帧尺寸即最终尺寸，不因异步 CSS 变化
- 证据：`audit/evidence/brief/report.md#BRIEF-01`、`probe-m390-light-zh.json` 的 `shifts`
- 严重等级：**high**（CLS 主因之一）
- 涉及源文件：`src/components/SiteNav.astro`、`assets/nav-orb.css`、`src/layouts/BaseLayout.astro`
- 验证：yes（m390/m430/t768/d1440）

### [G-02] 导航/菜单材质状态分散且关闭态存在可测量缺口
- 页面/组件：`.glass-nav`、`.mobile-menu`（桌面简报页有菜单按钮）
- 复现：移动端首页滚动后开/关菜单；对比 `data-menu-optics`、焦点与 `hidden` 时序
- 当前：GPU 光学状态正常（`active`），关闭时 310ms 后才 `hidden`，期间 `aria-expanded=false` 但元素仍可被指针命中；关闭后焦点落回 `body`（真实点击场景下按钮可保留焦点，程序化关闭时丢失）；菜单材质与导航材质由两套 CSS/JS 分别维护
- 预期：关闭动画期间不可交互但视觉连续；关闭后焦点回到触发按钮；桌面/移动共用一份材质 token
- 证据：`audit/evidence/lead/home-probes.json`（`menu`）、`audit/evidence/home/hero/*`
- 严重等级：**medium**
- 涉及源文件：`src/layouts/BaseLayout.astro` L84-154、`src/components/SiteNav.astro` L77-107、`assets/menu-liquid-optics.js`
- 验证：yes

### [G-03] 主题/语言状态与动效令牌没有统一来源
- 页面/组件：全站
- 当前：主题与语言逻辑写在 `BaseLayout.astro` 内联脚本；时长/缓动散落在各组件 `<style>`（0.18–0.85s 不等）；Reduced Motion 在每处各自实现，存在遗漏（见 LAB-05、LAB-09）
- 预期：共享 Motion Tokens + 统一 Reduced Motion 兜底；单一主题/语言控制器
- 证据：源码审查 + 各页动画时长抽样；`audit/evidence/lab/report.md#LAB-05`
- 严重等级：**medium**（维护性与一致性）
- 涉及源文件：`src/styles/tokens.css`、`src/layouts/BaseLayout.astro`、各组件
- 验证：yes（行为层：periodic 自动旋转未遵守 RM）

### [G-04] 错误/空/加载状态在多个页面被压成同一句“暂无内容/加载失败”
- 页面：`/brief/`、3D 空间、极小曲面
- 当前：brief 请求失败只有“Archive unavailable. Refresh to retry.”且无页内重试；极小曲面依赖 CDN 失败时无提示；3D WebGL 失败只改一行状态文字
- 预期：区分 loading / empty / no-result / network-failure / parse-failure，并提供可执行动作
- 证据：`audit/evidence/brief/report.md#BRIEF-06`、`audit/evidence/lab/report.md#LAB-07`
- 严重等级：**high**（数据主功能）
- 涉及源文件：`src/lib/brief-reader.ts` L292-324/L388-427、`experiments/minimal-surfaces-*.html`
- 验证：yes

---

## 3. 首页 `/`

### [HOME-01] Hero 像素显现基本达标，但动画期间可感知“逐字排队”
- 复现：冷加载 1440×900 / 390×844，screencast 前 4s
- 当前：9 个中文字符按非线性 beats 出现，最长 delay≈500ms+；每字 420ms `steps(6)`；动画结束后无残留；无 JS / Reduced Motion 下文字完整、无布局跳动；CLS 0
- 预期：保留逐字显现的“能量感”，但整体收束更短、更不均匀；刷新/语言切换不重播造成闪烁；动画未执行时首帧可读
- 证据：`audit/evidence/home/hero/reveal-m390/`（73 帧）、`reveal-d1440/`（71 帧）、`metric-hero.json`；Lead 复核 no-JS/RM 截图 `audit/evidence/lead/home-m390-nojs.jpg`
- 严重等级：**low**（优化项，不是缺陷）
- 涉及源文件：`src/components/Hero.astro` L16-83
- 验证：yes

### [HOME-02] 四个作品模块视觉语言高度同质
- 复现：桌面滚动四个 `.project`
- 当前：同一张卡、同一套 hover（`translateY(-5px)`+同一边框）、同一种 reveal；“世界观察/数学影像/三维记忆/交互几何”的差异只体现在插图内容；进入站外影像馆、站内视频、实验页的目的地提示不够明确
- 预期：统一组件与运动参数，但每个模块有符合内容性质的主视觉与反馈（阅读感/视频感/摄影感/可操作性），外链明确标示
- 证据：`audit/home-d1440/full.jpg`、`audit/home-m390/initial.jpg`
- 严重等级：**medium**
- 涉及源文件：`src/components/ProjectCard.astro`、`src/components/ProjectVisual.astro`、`src/components/AnimatedCover.astro`
- 验证：yes

### [HOME-03] 滚动“空间深度”效果收益不明确
- 复现：滚动四个作品卡，观察 `--chapter-tilt/--chapter-light/--motion-y`
- 当前：卡片视觉层随滚动 `rotateX(±0.7deg)`、亮度变化、位移 14px；参数多、收益小，且在低端设备上持续触发 rAF 布局读取
- 预期：采用更克制的编辑式出现（A 方案）；保留 ≤10px 的轻微深度作为统一语言
- 证据：`src/components/MotionLayer.astro` L56-82；滚动录屏帧见 `audit/evidence/home/hero/`（页面滚动时）
- 严重等级：**low-medium**（清晰度/性能）
- 涉及源文件：`src/components/MotionLayer.astro`
- 验证：yes（实现审查 + 浏览器滚动）

### [HOME-04] 首页与知识实验室的信息架构分裂
- 复现：对比首页导航“交互几何”、首页 lab-invite、`/lab/` 与两个 legacy 实验链接
- 当前：首页“交互几何”卡直接链 legacy 经典曲面；`/lab/` 只链旋转实验；两处都不完整；用户无法从首页判断“实验目录”在哪里
- 预期：`/lab/` 作为所有实验的唯一目录；首页只负责“入口与预告”，并在卡内列出实验编号
- 证据：`audit/evidence/lab/report.md#LAB-01`、`lab-fast.json`
- 严重等级：**high**
- 涉及源文件：`src/pages/lab/index.astro`、`src/data/site.ts`、`src/pages/index.astro`
- 验证：yes

### [HOME-05] 视频播放器首帧/关闭体验可用，但缺少加载反馈与标题层级
- 复现：移动端点开“莫比乌斯带”，等待 1.5–3s；关闭
- 当前：封面→播放器过渡连续；HEAD 探测通过后插入 `<video>`，3s 内 `readyState=4`；加载期间只有封面大图，无 spinner/进度；移动端标题被截断（`text-overflow: ellipsis`）；关闭后焦点回卡片、滚动位置保留（实测 scrollY 3332 不变）
- 预期：首帧不跳（已有 16/9 容器），加载态明确；标题完整可读；关闭后焦点/滚动保持
- 证据：`audit/evidence/lead/home-m390-video.jpg`、`home-m390-video-late.jpg`、`audit/evidence/lead/home-probes.json`
- 严重等级：**low-medium**
- 涉及源文件：`src/components/BilibiliStudio.astro` L73-121
- 验证：yes

---

## 4. 每日简报 `/brief/`

### [BRIEF-01] 首屏 CLS 0.16–0.80（冷加载）
- 复现：冷缓存加载 `/brief/`（390×844 / 1440×900）；观察 layout-shift sources
- 当前：三个叠加来源——① `#status` 在 `render()` 被加 `.is-summary`（`position:absolute`），同时注入 77 张卡，footer/disclaimer 被推下（单次 0.163）；② 通知/导航 CSS 晚到导致顶栏位移（0.055）；③ 工具栏 chip 文本宽度变化（0.001）。热缓存下 0.16–0.22，冷缓存可达 0.70–0.80
- 预期：首屏高度稳定；骨架占位与实际卡片同高；状态行不参与布局跳变；`CLS≤0.1`
- 证据：`audit/evidence/brief/report.md#BRIEF-01`、`audit/evidence/brief/probe-*.json`、`audit/evidence/forensics/run/perf-baseline.json`
- 严重等级：**blocker**
- 涉及源文件：`src/lib/brief-reader.ts` L187-256、`src/pages/brief/index.astro` L294、`src/components/SiteNav.astro`
- 验证：yes（四视口 + 冷/热）

### [BRIEF-02] 时间范围切换会静默清空话题与刊期
- 复现：选择“国际科技”（18）→“早报”（12）→点“近三天”
- 当前：结果回到 77，分类与刊期被重置为“全部/全部刊期”；且已激活范围再次点击仍重新请求
- 预期：范围变更只改变时间维度，保留用户主动选择的话题/刊期/搜索；同值操作不重复请求
- 证据：`audit/evidence/brief/report.md#BRIEF-02`
- 严重等级：**high**
- 涉及源文件：`src/lib/brief-reader.ts` L310、L325-331、L381-386
- 验证：yes

### [BRIEF-03] 知识空间默认无入口，且空间编码无语义
- 复现：正常打开 `/brief/`（无 query）；再以 `?experimentalGraph=1` 打开
- 当前：默认 `#spatial-experiment` 带 `hidden` 且 CSS `display:none`，用户看不到“探索空间”；打开后位置为黄金角螺旋（`theta=i*2.399…`，radius 仅按 index），颜色固定为一种蓝，边=同话题 DOM 相邻节点；没有主题聚类、时间编码或可解释连线
- 预期：生产入口可见；位置/颜色/连线可解释（主题聚类、时间、来源关联），明确数据局限；不得伪造关系
- 证据：`audit/evidence/brief/report.md#BRIEF-03`、`audit/evidence/lead/brief-3d-d1440.jpg`、`src/lib/spatial-reader.ts` L76-80
- 严重等级：**high**
- 涉及源文件：`src/lib/spatial-reader.ts`、`src/pages/brief/index.astro` L66/L69
- 验证：yes

### [BRIEF-04] 3D 拖动旋转松手会误选节点
- 复现：打开知识空间，按住画布拖动 60px 后松手
- 当前：`pointerup` 不做位移阈值判断，直接按落点最近节点聚焦；实测选中从 11/30 跳到其他节点
- 预期：拖动只旋转；点击（位移<阈值）才选择
- 证据：`audit/evidence/brief/report.md#BRIEF-04`、`audit/evidence/lead/probes.json`/`brief-3d-click.jpg`
- 严重等级：**medium**
- 涉及源文件：`src/lib/spatial-reader.ts` L91-94
- 验证：yes

### [BRIEF-05] 知识空间缺少重置视角/双指缩放，方向键同时改选中
- 复现：旋转/缩放后无法回到初始视角；移动端无双指缩放；按 ←/→ 查看
- 当前：wheel 缩放 2–6，无 reset；点 footer 按钮同时改选中并旋转；没有 hover 预览
- 预期：明确的“重置视角”；触屏双指缩放；点击选中与视角操作分离；hover 预览
- 证据：`audit/evidence/brief/report.md#BRIEF-05`
- 严重等级：**medium**
- 涉及源文件：`src/lib/spatial-reader.ts` L90-96
- 验证：yes

### [BRIEF-06] 数据失败无页内重试
- 复现：Network.setBlockedURLs 阻断 `/brief/data/*` 后加载
- 当前：显示“Archive unavailable. Refresh to retry.”；日期按钮、分类、重试控件均为 0；无法在页内恢复
- 预期：错误态给出“重试”按钮与原因，筛选器不失效；区分 404/解析失败/断网
- 证据：`audit/evidence/brief/report.md#BRIEF-06`
- 严重等级：**high**
- 涉及源文件：`src/lib/brief-reader.ts` L315-323、L422-426
- 验证：yes

### [BRIEF-07] 搜索只覆盖已加载范围，作用域提示不可见
- 复现：默认加载（近三天 77 条）后搜索；再打开筛选面板查看搜索标签
- 当前：搜索只在 `current`（当前日期或范围）内匹配，标题/摘要/来源/why/details/research 均参与；命中数与列表实时一致（实测 6.1ms，AI→33）；但“搜索已加载简报/loaded issues”提示只在展开面板内，收起后不可见；跨归档（5 期）不可搜
- 预期：搜索范围明确可见；跨刊期能力由数据 schema 决定（当前 JSON 可支持按需加载全部日期，但需控制成本）；防抖 120–200ms；清除与空结果明确
- 证据：`audit/evidence/brief/report.md#BRIEF-07`、`audit/evidence/lead/probes.json`（`search`）
- 严重等级：**medium**
- 涉及源文件：`src/lib/brief-reader.ts` L274-290、L180-186
- 验证：yes

### [BRIEF-08] 移动端隐藏结果计数；桌面端重复显示同一状态
- 当前：m390 下 `.brief-count` 被隐藏，搜索后看不到命中数；桌面顶栏 chip 与展开面板控件是同一状态的两种呈现，点击 chip 只是“打开面板”
- 预期：移动端至少保留 compact 计数（如“33/77”）；桌面顶栏 chip 直接就地切换或明确为“摘要+入口”，不制造两套控件
- 证据：`audit/evidence/brief/report.md#BRIEF-08`、`probe-m390-light-zh.json`
- 严重等级：**low-medium**
- 涉及源文件：`src/pages/brief/index.astro` L297-313、`src/lib/brief-reader.ts` L91-100
- 验证：yes

### [BRIEF-09] 阅读展开的空间/焦点管理不足
- 当前：`展开阅读` 使卡片 367→509px，相邻卡片位移无动画；关闭按钮仍在卡片顶部；展开区里的原文信息又藏一层 `<details>`；无滚动/焦点管理；77 卡首渲染长任务 477–485ms
- 预期：展开/关闭有空间对应关系（卡片原位扩展或阅读层从卡片位置过渡），焦点回到触发按钮，外围视觉安静
- 证据：`audit/evidence/brief/report.md#BRIEF-09`
- 严重等级：**medium**
- 涉及源文件：`src/lib/brief-reader.ts` L198-255
- 验证：yes

---

## 5. 知识实验室 `/lab/` 与旋转实验 `/lab/rotation/`

### [LAB-01] 实验目录不完整、入口分裂（同 HOME-04）
- `/lab/` 只列 rotation；首页“交互几何”只列两个 legacy 曲面实验；没有任何页面同时列出三个实验
- 证据：`audit/evidence/lab/report.md#LAB-01`、`lab-fast.json`
- 严重等级：**high**；源文件：`src/pages/lab/index.astro`、`src/pages/index.astro`、`src/data/site.ts`
- 验证：yes

### [LAB-02] legacy 返回链接是死锚点
- 复现：任意极小曲面页点“返回作品列表”
- 当前：`href="/#computing"`，首页不存在 `#computing`（实际为 `#experiments`），落回页面顶部
- 证据：`audit/evidence/lab/report.md#LAB-02`
- 严重等级：**high**；源文件：`experiments/minimal-surfaces-classical.html` L66、`minimal-surfaces-periodic.html` L63
- 验证：yes

### [LAB-03] legacy 页脱离站点外壳
- 当前：无导航/主题/语言/skip-link/meta description；`lang=zh-CN` 固定；dark/en 存储被忽略；页面 title 两页相同；返回按钮固定中文；classical 深色、periodic 浅色两套视觉
- 证据：`audit/evidence/lab/report.md#LAB-03`、`audit/evidence/lab/periodic-d1440-with-dark-en-storage.jpg`
- 严重等级：**medium**；源文件：两个 legacy HTML
- 验证：yes

### [LAB-04] 极小曲面缺参数读数与数学解释
- 当前：classical 的 t 滑杆无 output/aria-label；periodic 参数不可见；无曲面方程/关联族解释
- 证据：`audit/evidence/lab/report.md#LAB-04`、`rotation-d1440` 无关；`classical-d1440-bonnet.jpg`
- 严重等级：**medium**；源文件：legacy HTML slider 区
- 验证：yes

### [LAB-05] 无重置视角；Reduced Motion 下仍自动旋转
- 复现：periodic 开启 `prefers-reduced-motion: reduce`，两次截图 hash 不同；无 reset 控件
- 严重等级：**medium**；源文件：legacy HTML OrbitControls 配置
- 验证：yes（reduced-motion 单次截图对比）

### [LAB-06] legacy 控件触控目标 32–34px
- 当前：面板按钮高度 32–34px，`input[type=range]` 无 44px 触控高度；移动端 390 下可点但偏小
- 严重等级：**medium**；源文件：legacy HTML `.btn` / range
- 验证：yes

### [LAB-07] 依赖 unpkg CDN，失败无兜底
- 当前：`three` 与 addons 从 `unpkg.com` 以 importmap 加载；失败时页面只剩面板与“生成曲面中…”，无错误说明；无超时/重试/本地回退；periodic 的“生成曲面中…”在 1.99–4.40s 切换后可能持续显示
- 证据：`audit/evidence/lab/report.md#LAB-07`、`audit/evidence/forensics/report.md` §6.2（0-byte silent failures）
- 严重等级：**high**（弱网/区域网络下整页不可用）
- 源文件：legacy HTML importmap + `three` 导入
- 验证：部分（CDN 失败场景未完全复现，标注 coverage gap）

### [LAB-08] 姿态差距指标无单位/范围
- 当前：`2.45` 无单位；实际是旋转矩阵 Frobenius 距离，范围 0–2.83（实测 0/0.10/0.56/2.45/2.83）；“不是角度差”默认折叠在 details
- 证据：`audit/evidence/lab/report.md#LAB-08`、`rotation-d1440.json`
- 严重等级：**medium**；源文件：`src/pages/lab/rotation/index.astro` L62/L68-72、`src/lib/rotation-lab.ts` L36-39
- 验证：yes

### [LAB-09] 播放期间 DOM 数值滞后、停止回退
- 当前：画布连续插值，但 `output`/差距/说明只在段末更新（动画 660ms 内数值仍为起点值）；点停止回到阶段起点而不是停在当前画面
- 严重等级：**low-medium**；源文件：`src/lib/rotation-lab.ts` L226-278
- 验证：yes

### [LAB-10/11] Rotation i18n 与深色对比度
- 当前：切 EN 后相机按钮、overlay canvas 的 aria-label 仍中文；zh 下滑杆 aria 仍英文；深色下 canvas 轴标签颜色对 `rgb(32,33,38)` 对比度 2.55–3.39:1
- 严重等级：**low-medium**；源文件：`src/pages/lab/rotation/index.astro` L42/L77、`src/lib/rotation-lab.ts` 绘制颜色
- 验证：yes

### 已验证正常（不要重做）
- rotation 控制→矩阵/向量/差距与独立四元数参考 10/10 一致；DOM 延迟 median 0.8ms/max 1.1ms；中途改参数正确取消，无叠加动画；键盘可达；overlay 正常；4 视口无页面级横向溢出、CLS 0；console 0 错误。
- Astro 页面主题/语言切换正常；brief 搜索逻辑正确、真实更新列表、XSS 安全；移动工具栏（日期+展开）符合目标；面板打开不 reflow；无横向溢出。

---

## 6. 性能基线（线上，CDP，本机无节流）

| 页面 | 视口 | LCP | CLS | 长任务 | 备注 |
|---|---|---|---|---|---|
| `/` | 390×844 | 3.47s* | 0 | 489/317/99ms | *含共享 Chrome 竞争；无节流复测 0.72–0.84s |
| `/` | 1440×900 | 0.72–0.84s | 0 | 2–4 个 | 静态/字体/玻璃首帧 |
| `/brief/` | 390×844 | 2.1–2.7s | **0.16–0.80** | 8 个，合计约 1.8–2.2s | 数据后到；首卡 1.6s(d)/2.3s(m) |
| `/lab/rotation/` | 1440×900 | 0.79–1.11s | 0 | — | 2D canvas，无 3D |
| `/experiments/minimal-surfaces-periodic.html` | 1440×900 | — | — | 帧均 18.9ms，p95 33.3ms | OrbitControls 自动旋转 + 持续渲染；依赖 unpkg |

**结论**：首页达标；简报是唯一系统性的 CWV 失败点；极小曲面的持续 rAF 与 legacy 依赖需要在 Phase 5 统一处理。

---

## 7. 基于审查的实施清单（调整后的 Phase Plan）

### Phase 1 — 全局设计系统（保玻璃、补一致性）
- [ ] `src/styles/tokens.css`：新增 Motion Tokens（press 110 / hover 150 / filter 280 / nav 340 / card 400 / page 480；easing `editorial`/`spring`/`exit`）与 Reduced Motion 全局覆盖
- [ ] 新增 `src/lib/motion.ts`：可中断动画包装、IntersectionObserver reveal、焦点返回、`prefersReducedMotion`
- [ ] `BaseLayout.astro`：主题/语言/菜单控制器收敛；关闭动画期间 `inert`，关闭后焦点回触发按钮；菜单样式与导航共用材质变量；修 G-01（把关键导航尺寸写进首屏 CSS，或把 `nav-orb.css` 改为内联/预加载）
- [ ] `SiteNav.astro`：桌面 hover 100–160ms、局部高光跟随（已有 `glassPointerFor`，补 CSS 变量与离开恢复）、移动触摸局部亮度；不破坏 `data-live-optics` GPU 状态
- [ ] 为 Phase 1 建立视觉回归基线（before/after 截图）

### Phase 2 — 首页 Editorial Discovery
- [ ] Hero 保留签名与非线性显现；缩短总时长、降低 glint；刷新不重播；RM/no-JS 仍完整（HOME-01）
- [ ] `ProjectCard/ProjectVisual` 重构：统一展示骨架 + 四种个性主视觉（数据流/视频帧/摄影/可拖拽线框），统一运动参数、统一外链标识；交互几何卡内嵌实验编号列表（LAB-01/HOME-02/HOME-04）
- [ ] `MotionLayer`：切到克制的编辑式 reveal（A），移除 rotateX 与滚动亮度驱动，保留 ≤10px 深度；避免每帧布局读取
- [ ] 首页 lab-invite 改为“实验目录（3 个实验）”；与 `/lab/` 建立清晰层级
- [ ] 视频播放器：加载 spinner/进度、标题不截断、关闭焦点/滚动（HOME-05）
- [ ] 验收：首次进入/滚动/操作/返回稳定；CLS 0；LCP 不退化；RM/no-JS 通过

### Phase 3 — Daily Brief 高效阅读工具
- [ ] 单一筛选状态源（date/range/edition/topic/query + 数据态），`loadRange` 不重置话题/刊期（BRIEF-02）；同值不重复请求
- [ ] 首屏骨架（与卡片同高）+ 状态行不参与布局 + 预加载关键 CSS/字体（BRIEF-01, G-01）；目标 CLS≤0.1
- [ ] 移动端保留 compact 计数；桌面端 chip 与面板去重（BRIEF-08）
- [ ] 搜索防抖 140ms、范围提示常驻、跨刊期能力按数据量决定（默认当前范围 + “搜索全部 5 期”按需加载）（BRIEF-07）
- [ ] 数据态区分 loading/empty/no-result/network/parse，页内重试（BRIEF-06, G-04）
- [ ] 阅读展开：高度动画/空间对应、焦点与滚动保持、原文信息升级到一级展开（BRIEF-09）
- [ ] 验收：数据功能正确、自动更新管线不动、搜索真实更新列表、0 长任务 >200ms（或给出原因）

### Phase 4 — 知识探索
- [ ] 3D 空间生产入口默认可见，语义化布局：按 topic 聚类、按时间半径、同 topic/同 source 可解释连线、颜色=topic；图例与局限说明（BRIEF-03）
- [ ] 交互：hover 预览、点击选择、拖拽阈值、重置视角、双指缩放、键盘左右选择、关闭退出（BRIEF-04/05）
- [ ] 列表↔空间双向定位：节点→文章并高亮/滚动；“在空间中定位”入口；关闭后恢复筛选与滚动（BRIEF-05/03）
- [ ] WebGL 不可用/低性能设备回退列表；DPR 上限、不可见时停绘、资源释放
- [ ] Rotation 实验：桌面左参数/中画布/右结果与数学；移动画布优先、参数折叠到下方；补矩阵显示、差距指标定义（0–2.83, Frobenius）、播放期间数值同步、停止停在当前帧、预测引导（LAB-08/09、C5.1-5.4）
- [ ] `/lab/` 成为唯一实验目录，列出 rotation + classical + periodic（LAB-01）

### Phase 5 — 实验统一与全面验证
- [ ] 两个 legacy 页接入统一 lab 工作台外壳（返回 `/lab/`、标题、主题/语言、重置视角、帮助；去掉死锚点）（LAB-02/03）
- [ ] 参数读数/数学解释/加载进度/超时/WebGL 失败回退；`three` 本地化或固定版本+CSP 友好回退（LAB-04/07）
- [ ] 触控目标 ≥44px、Reduced Motion 关闭自动旋转、DPR≤1.5、页面隐藏停绘、dispose 几何/材质/renderer（LAB-05/06）
- [ ] 性能复测（LCP/CLS/INP、GPU/长任务、内存），前后对比；移动端 390/430 回归
- [ ] 全站回归：`npm run check`、`npm run build`、`verify-build`、Playwright e2e（若环境允许）、视觉对比
- [ ] 每个 Phase 独立分支 + PR（含问题证据/变更文件/验证结果/前后截图/性能数据）

---

## 8. 复核与后续

- 本报告中的每个 “验证：yes” 项均有本工作区 `audit/` 下的截图/录屏帧/JSON 或 console 记录；未完成项在对应 agent 报告 `Coverage gaps` 中列明，不得当作已修复或已证实。
- 数据管线、URL、邮件/微信、站外链接、既有 Liquid Glass GPU 材质均视为**不可破坏资产**；任何改动需在 PR 中证明未回归。
- 部署需要用户授权；本地改动只进入分支与 PR，不直接覆盖线上。
