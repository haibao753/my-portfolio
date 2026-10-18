# Phase 0 evidence — Daily Brief `/brief/` + 3D 知识空间

## Environment
- Date/time (Asia/Shanghai): 2026-10-18 17:54–18:42
- Chrome: HeadlessChrome/155.0.8059.82（共享实例 127.0.0.1:9333，`/json/version`）
- Live site commit/repo assumption: 生产站 hujinhai.com；本地仓库 `my-portfolio` main @ 677b476（`src/pages/brief/index.astro` + `src/lib/brief-reader.ts` + `src/lib/spatial-reader.ts` 与线上 HTML 标记一致，线上首页 HTML 已保存为 `audit/evidence/brief/live-brief.html`）
- Viewports tested: 390×844（m390）、430×932（m430，基线矩阵）、768×1024（t768）、1440×900（d1440）；主题 light/dark；语言 zh / en（en 为共享 Chrome profile 残留的 locale 会话下实测）

## Issue evidence

### [BRIEF-01] 首屏 CLS 0.16–0.22：状态行脱离文档流 + 数据后到撑开页面 + 晚到 CSS 顶栏位移
- **页面/组件**: `/brief/` 顶部筛选栏 + 首屏
- **复现步骤**:
  1. 1440×900 打开 `https://hujinhai.com/brief/`（暖缓存）并等待 77 条卡片渲染完成；
  2. 记录 PerformanceObserver `layout-shift`（含 source 节点）与 LCP；
  3. 在 390×844 / 430×932 / 768×1024 重复。
- **当前行为** (observed in browser + measured values): 暖缓存 CLS **d1440 = 0.2182**、**m390 = 0.1759**、m430 = 0.1602、t768 = 0.1886（均 > 0.1 的 "needs improvement" 线）。d1440 三次位移：`0.0547 @847ms`（`#main`/brand/desktop-links/`#brief-filter` 整体上移 12px，来自晚加载的 `nav-orb.css` 改写顶栏）、`0.0003 @1068ms`（筛选胶囊从 437px 变 447px，compact chip 文本由“当天/全部刊期”被 JS 换成“近三天”等）、**`0.1632 @1758ms`**（`.disclaimer` 与 `.site-footer` 被首屏注入的 77 张卡片推出视口）。m390 最大位移 `0.1749 @2280ms`，source 同为 `.disclaimer`/footer。LCP 元素为数据驱动的 `H3.` 文章标题：d1440 1792ms、m390 2300ms；当前 `load` 时状态行 `#status` 还是流内文本，数据到达后 `render()` 给它加 `.is-summary`（CSS：`position:absolute;width:1px;height:1px;clip-path:inset(50%)`）→ 该行瞬间从文档流消失，同时 `#stories` 由空变 77 卡，双重 reflow 集中在同一次 render。
- **预期行为**: 加载前后为文章列表预留空间（骨架/最小高度），状态行切换为绝对定位时不参与布局变化，或先量测再切换；晚到样式导致顶栏位移应在构建期消除（CSS 内联/顺序修正）。
- **证据**: `audit/evidence/brief/probe-d1440-light-zh.json`（shifts.sources）、`audit/evidence/brief/probe-m390-light-zh.json`、`audit/brief-d1440/metrics.json`、`audit/brief-m390/metrics.json`
- **严重等级**: high
- **可能涉及的源文件**: `src/lib/brief-reader.ts` L187-199（`render()` 中 `statusNode.classList.add("is-summary")` 与 `stories.replaceChildren`）、`src/pages/brief/index.astro` L294（`.status.is-summary{position:absolute…}`）、`src/layouts/BaseLayout.astro` + `assets/nav-orb.css?v=5`（晚到顶栏样式）
- **真实浏览器验证**: yes (d1440/m390/m430/t768, light, zh, 默认 motion)

### [BRIEF-02] 点“近三天/近一周”会静默清空已选话题与刊期（筛选互相重置）
- **页面/组件**: 筛选面板 · 时间范围 `#quick-dates`
- **复现步骤**:
  1. 1440×900 打开 `/brief/`，展开筛选面板；
  2. 点话题“国际科技”（total 77→**18**）→ 再点刊期“早报/AM”（18→**12**）；
  3. 点时间范围“近三天”（当前已是选中态）。
- **当前行为** (measured): total 立即变回 **77**，顶栏 chip 从“国际科技 + 早报”回退为 **“All / All”**，headline 变成 “Last 3 days”。即点一次 range 同时清掉 topic 与 edition，且对**已激活**的 range 也会重新 fetch + 重置。日期按钮 `load()` 亦会重置 `category/selectedRange/selectedEdition`（L310）。
- **预期行为**: 变更任一维度只影响该维度；若确实需要“范围视图重置子筛选”，应显式提示或提供“重置全部”。对已激活 range 的点击应是无操作。
- **证据**: `audit/evidence/brief/fast-interactions.json` → `filters.afterTopic/afterEdition/afterRange`
- **严重等级**: medium
- **可能涉及的源文件**: `src/lib/brief-reader.ts` L325-331（`loadRange()` 中 `category="全部"; selectedEdition="all"`）、L310（`load()` 同样重置）；`src/pages/brief/index.astro` L46-50（quick-dates 按钮）
- **真实浏览器验证**: yes (d1440, en locale, light, 默认 motion)

### [BRIEF-03] 3D「知识空间」在生产环境没有任何入口；其空间位置/颜色不承载语义
- **页面/组件**: `#spatial-experiment` / `#spatial-dialog`（知识空间）
- **复现步骤**:
  1. 1440×900 打开 `https://hujinhai.com/brief/`：`#spatial-experiment.hidden === true`，computed `display:none`（页面任何位置均无“探索空间”入口）；
  2. 改开 `https://hujinhai.com/brief/?experimentalGraph=1`，入口出现，点击打开 dialog（real `:modal`）；
  3. 读取真实节点数据：状态 “1 / 30 · ✦ 重点 · 国际科技”，inspector 标题与列表首卡一致。
- **当前行为** (measured + quoted code): 默认访客完全无法进入 3D。开启后，节点数据来自 `populate()`：`theta=i*2.399963229728653; rad=.35+1.35*Math.sqrt((i+.5)/count); x=cos(theta)*rad; y=(i%5-2)*.24; z=sin(theta)*rad` —— **纯黄金角螺旋按 DOM 下标排布，位置只编码序号，不编码话题/关键词/时间**；可见的 topic 只是 `.news-category` 文本前缀（如 “✦ 重点 · 国际科技”）。颜色：fragment shader 固定 `vec4(.28,.52,.92)`（点）与 `vec4(.37,.52,.70,.42)`（线），不随话题变化；尺寸只有 12/22 两档（选中/未选）。边：`for ids of categoryGroup` 把**同一话题中 DOM 相邻的节点**连成链（非语义关系图）。因此“空间”不是知识图谱，只是按索引排的三维列表。
- **预期行为**: 要么明确标注为实验性视觉浏览并按主题着色/按时间或关键词聚类（让位置有含义），要么在默认 UI 开放入口并说明其语义；不应把“知识空间”伪装成有语义的图谱。
- **证据**: `audit/evidence/brief/fast-interactions.json` → `defaultState.spatialHidden/spatialDisplay`、`fast-visual.json` → `desktop`（dialogRect/status/inspectTitle/footer）、`audit/evidence/brief/fast-3d-dialog.jpg`、`audit/evidence/brief/live-brief.html`（`#spatial-experiment hidden`）
- **严重等级**: medium（功能可发现性）+ 设计语义问题
- **可能涉及的源文件**: `src/lib/spatial-reader.ts` L9-12（`?experimentalGraph=1` 开关）、L39-42（yaw/pitch 旋转）、L54-56（按同话题相邻连边）、L76-81（`populate()` 节点坐标/颜色数据）；`src/pages/brief/index.astro` L66（`hidden`）、L186-223（面板样式）
- **真实浏览器验证**: yes (d1440, zh, light；WebGL canvas 存在、dialog `:modal`、30 节点)

### [BRIEF-04] 3D 空间“拖动旋转”松手会误选中节点（无拖拽阈值）
- **页面/组件**: `.spatial-viewport` 指针事件
- **复现步骤**:
  1. `?experimentalGraph=1` 打开 dialog（初始选中 1/30）；
  2. 在 canvas 中心 pointerdown → 移动 (+60, +10) → pointerup（模拟一次旋转拖动）。
- **当前行为** (measured): 松手瞬间选中项从 **2 / 30** 跳到 **14 / 30 · 工程与开源**；`pointerup` 未判断本次是否发生拖动，只要落点在 26px 半径内就执行命中测试。用户想“转一下看看”，结果 inspector 文章被换掉。
- **预期行为**: 仅当位移 < ~4px（tap）才做命中测试；拖动结束只旋转不改选中。
- **证据**: `audit/evidence/brief/fast-interactions.json` → `threeD.before/afterRotate/afterDrag`
- **严重等级**: medium
- **可能涉及的源文件**: `src/lib/spatial-reader.ts` L91-94（`pointerdown/pointermove/pointerup`）
- **真实浏览器验证**: yes (d1440, zh, light, WebGL)

### [BRIEF-05] 3D 空间无“重置视图”、无触屏双指缩放；←/→ 按钮同时改选中
- **页面/组件**: 知识空间 footer / 手势
- **复现步骤**: 打开 dialog 后检查全部按钮与手势绑定；在 footer 只有 `←`(data-rotate="-24")、`→`(data-rotate="24") 与说明文字；缩放的唯一入口是 `wheel` 监听。
- **当前行为** (measured + code): 旋转/缩放后没有恢复初始视角（yaw .48 / pitch .22 / zoom 3.5）的控件；`zoom` 只由 `wheel` 改变（`Math.max(2,Math.min(6,zoom±.22))`），**没有任何 pinch / 双指手势处理**；两个方向按钮除了 `turn()` 还调用 `focus(selected±1)`，无法只转不改选中。
- **预期行为**: 提供“重置视图”；触屏支持双指缩放；方向按钮只旋转不改变当前选中文章。
- **证据**: `audit/evidence/brief/fast-visual.json` → `desktop.footer`、`fast-3d-dialog.jpg`
- **严重等级**: medium
- **可能涉及的源文件**: `src/lib/spatial-reader.ts` L82（`turn`）、L90（`[data-rotate]` 绑定 focus+turn）、L95（`wheel` zoom）；`src/pages/brief/index.astro` L69（footer 结构）
- **真实浏览器验证**: yes（按钮/说明 DOM 与 wheel 行为；双指未在触屏设备上实测，仅代码确认）

### [BRIEF-06] 数据加载失败时没有页内重试入口，筛选面板同时变空
- **页面/组件**: 归档加载失败 / 单期加载失败
- **复现步骤**:
  1. 1440×900 打开 `/brief/`；
  2. `Network.setBlockedURLs(['*brief/data/*'])` 后重新加载并等待 2.5s。
- **当前行为** (measured): status = “Archive unavailable. Refresh to retry.”，`#stories` = “Stories are unavailable. Please try again shortly.”，卡片 0、total “—”；**全页可点击的“重试/retry”控件数量 = 0**（`retryButtons:0`）；`#tabs` 与 `#date-options` 均为 0 项，用户即使打开筛选面板也无日期/分类可选，只能刷新整页。单期失败分支（`load()` catch）同样只有文案 “Unable to load. Choose another date or refresh to retry.”，无重试按钮。
- **预期行为**: 提供“重试”按钮（重新 `refreshManifest()` / 重新 `load(date)`），并保留已知日期/分类骨架以便切换。
- **证据**: `audit/evidence/brief/fast-network-fail.jpg`、`audit/evidence/brief/fast-interactions.json` → `failState`（failedRequests 1 条 Fetch 被拦截，console 0 error）
- **严重等级**: medium
- **可能涉及的源文件**: `src/lib/brief-reader.ts` L315-320（`load()` catch）、L422-426（`refreshManifest()` catch）
- **真实浏览器验证**: yes (d1440, light, data 请求全部 block)

### [BRIEF-07] 搜索只覆盖“当前已加载的范围”，默认仅 3 天 77 条，且作用域提示藏在收起的面板里
- **页面/组件**: `#brief-search` 与列表渲染
- **复现步骤**:
  1. 打开 `/brief/`（默认自动选择“近三天”，一次并行拉 3 个 JSON：2026-10-18/17/16），列出 77 卡；
  2. 在面板搜索框依次输入“研究”等词并对比数据 JSON 计算出的期望命中数。
- **当前行为** (measured): 搜索是**即时同步**的（一次 `input` 事件到渲染完成 **6.1ms**），计数与渲染列表一致（“研究” → 25 条，`total=25`，`cards=25`，与本地按同字段拼接算出的期望 25 完全一致；`Hacker` 11 条、`咖啡机` 1 条），字段覆盖 title/original_title/summary/why/details/source/category + research 段落——**列表真的被更新，不只是标签**。但作用域只有 `current`（默认 3 天 77 条）；归档 `index.json` 里共有 5 个日期（date 按钮 5 个），更早日期必须切日期/范围后搜索，**没有跨归档搜索**。面板标签写作 “搜索当前简报 / Search loaded issues”，而该说明在面板收起时（尤其移动端默认收起）不可见，结果区也无“仅搜索已加载 N 期”的 scope 指示。
- **预期行为**: 结果区显示“在已加载的 3 期 / 77 条中搜索”的作用域提示；或在数据层支持全归档搜索（`index.json` 已列出全部日期，schema 允许）。
- **证据**: `audit/evidence/brief/fast-interactions.json` → `search`（syncMs/expected/status/total/cards）、`fast-search.jpg`；`audit/evidence/brief/probe-d1440-light-zh.json` → `waterfall`（index.json + 3 个日期 JSON）
- **严重等级**: medium
- **可能涉及的源文件**: `src/lib/brief-reader.ts` L180-199（`matchesQuery` 只作用于 `current`）、L274-279（`updateSearch` 无 debounce 直接 render）、L414（初始 `loadRange(3)`）；`src/pages/brief/index.astro` L27-34（面板内搜索框）
- **真实浏览器验证**: yes (d1440, en locale, light)

### [BRIEF-08] 移动端顶栏隐藏了结果计数；桌面端同一状态在顶栏与面板重复出现
- **页面/组件**: `.brief-filter-bar` / `.brief-filter-details`
- **复现步骤**:
  1. 390×844 打开 `/brief/`：可见控件恰为“日期按钮 51×37 + 展开箭头 36×36”，`#compact-category/#compact-range/#compact-edition/.brief-count` 均 `display:none`；
  2. 1440×900 打开：顶栏同时出现“10-18 / 全部 / 近三天 / 全部刊期 / 77 条精选 / 箭头”，面板内又有一份同样的日期/话题/范围/刊期控件与“77 条精选”。
- **当前行为** (measured): 移动端符合“仅日期 + 展开”的规范（verified-ok），但搜索/筛选后**首屏看不到任何结果数**（计数只在面板头部）；桌面端计数出现两次、范围/分类/刊期控件出现两份（顶栏 chip 点击只是 `openFilterAt()` 打开面板，本身不改状态），状态仍一致（每次筛选后 chip 文本同步更新），但视觉与交互上都存在“双重控制”的歧义。
- **预期行为**: 移动端在列表首行保留轻量计数（如“25 条”）；桌面端把顶栏 chip 明确定位为“状态摘要/入口”（例如加下拉图标），或去掉重复计数。
- **证据**: `audit/evidence/brief/fast-visual.json` → `m390.controls`、`audit/evidence/brief/fast-panel-open.jpg`、`audit/evidence/brief/probe-d1440-light-zh.json` → `state.controls`
- **严重等级**: low–medium
- **可能涉及的源文件**: `src/pages/brief/index.astro` L297-313（≤760 隐藏 chip/count）、L244-255（顶栏）、L231-241（面板）；`src/lib/brief-reader.ts` L68-81（`openFilterAt`）、L91-100（`updateCompact`）
- **真实浏览器验证**: yes (m390 + d1440, light/dark)

### [BRIEF-09] 文章展开后关键原文信息仍藏在第二层 `<details>`，且无滚动/焦点管理
- **页面/组件**: `.news-card` 阅读态
- **复现步骤**: 1440×900 点首卡“展开阅读 ↓”。
- **当前行为** (measured): 卡片高 367px → 509px；`aria-expanded="true"`、按钮文案变“Show less ↑”、`.news-reason` 显示；层级为 meta(category · edition · date) → h3 标题 → summary → 展开按钮 → 为什么值得关注 → `details`（默认折叠，内含“原文标题/站内详细解读/研究档案”）→ 来源 + “阅读原始报道 ↗”。即用户展开后仍看不到 `original_title`/原文链接细节，需要再点第二层“展开原文信息与详细解读 ↓”；按钮位于卡片顶部，长文阅读后需滚回顶部收起；展开不自动滚动、不移动焦点。外链存在（`hasOriginalLink:true`）。
- **预期行为**: 阅读态一次性展开“原文信息”层级（或把二级 details 默认 open），收起按钮 sticky；展开时把新内容滚动进视野。
- **证据**: `audit/evidence/brief/fast-interactions.json` → `article`（before/after/expanded/label）
- **严重等级**: low
- **可能涉及的源文件**: `src/lib/brief-reader.ts` L209-243（`is-reading` 切换 + `news-expanded` details）；`src/pages/brief/index.astro` L160-169（阅读态样式）
- **真实浏览器验证**: yes (d1440, en locale, light)

## Non-issues / verified-ok
- **移动端顶栏结构符合规范**：390×844 仅日期按钮（51×37）+ 展开箭头（36×36），分类/范围/刊期/计数全部 `display:none`；`audit/evidence/brief/fast-visual.json` → `m390.controls`。
- **展开面板不引起重排**：390 与 768 下打开面板前后 `.brief-hero` rect 完全一致（m390 `{x:14,y:66,w:362,h:68}` → 相同），面板为绝对定位浮层；面板完整落在视口内（m390 bottom 710 < 844；d1440 bottom 723 < 900），内容超出时内部可滚动（scrollH 652 > clientH 578）。
- **搜索即时且真实更新列表**：输入“研究”同步 6.1ms 后 total=25、cards=25，与数据文件期望值一致；清空按钮出现/消失正确，清空后恢复 77 卡；特殊字符 `<script>` 只得到 0 结果 + 文案空态（`textContent` 无注入）。
- **空搜索结果态有区分**：查询无结果时显示“No matches. Try another keyword or date range.”，无筛选时显示另一条话题/日期提示（源码 L195-197）。
- **文章展开/收起与可访问性**：`aria-expanded` 正确翻转，按钮文案切换，来源与原文外链存在，`rel="noopener noreferrer"`、`target="_blank"`（源码 L249-251）。
- **3D dialog 基本交互**：`:modal` 打开、WebGL canvas 存在、节点数 30（= 列表前 30 卡）、inspector 首卡标题正确、“←/→”改变选中、`Esc` 关闭后焦点回到 `#spatial-open`、背景列表未被销毁/重排（关闭后 filter 状态与卡片不变，源码未重新 render）。
- **无横向溢出**：四视口 `scrollWidth == innerWidth`（390/430/768/1440），无 offender。
- **无控制台错误/异常**：正常加载与交互全程 `errors=0`、异常 0；失败注入时 console error 也为 0（网络层拦截）。
- **JSON 水合瀑布**：暖缓存下 `index.json` + 3 个日期 JSON 并行，单条约 208–224ms；d1440 页面 load 850ms。
- **双主题/双语可渲染**：dark 截图 `audit/brief-*/dark.jpg`；en locale 下 status/count/range/edition 文案正确英译（“Showing 25 stories”“3 days”“AM”“Both”）。

## Coverage gaps
- **reduced motion**：`Emulation.setEmulatedMedia(prefers-reduced-motion)` 注入后页面内 `matchMedia` 仍返回 false（本次采样失败），仅完成源码核对（面板/卡片 transition 有 reduce 分支，3D 无动画，但未在浏览器标记为 verified）。
- **200% zoom / 系统缩放**：未测（超出本轮时间）。
- **JSON 解析失败**（Fetch 拦截返回损坏 JSON）：仅读源码 catch 分支，未在浏览器注入验证；已用 `Network.setBlockedURLs` 验证网络失败态。
- **空日期/空归档**（"No published issues in this date range"、“尚无归档数据”）：线上数据 5 期均有内容，未构造出该状态。
- **WebGL 失败回退**：未在运行时模拟 `getContext('webgl')` 返回 null；回退文案与方向键路径仅源码确认。
- **3D 触屏双指缩放/单指旋转与页面滚动冲突**：仅代码确认无 pinch 处理器、`.spatial-viewport{touch-action:none}`；未在真实触摸设备（含 390 视口 touch 模拟）完整走查。
- **3D 连续旋转的帧时间/长任务**：只测到加载期长任务（477ms/485ms），未对 drag 期间 rAF 采样。
- **节点→文章后的滚动位置与列表定位**：`scrollIntoView` + 展开的源码确认存在，未逐像素验证“关闭后回到原列表位置”。
- **读屏键盘全链路**（列表 → 面板 → 卡片 → dialog 的聚焦顺序）：只验证了 dialog 关闭焦点回收。
- 430/768 仅跑基线矩阵 + 768 面板开合，未做完整筛选/搜索组合矩阵。
