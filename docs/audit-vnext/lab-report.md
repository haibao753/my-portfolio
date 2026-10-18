# Phase 0 evidence — Knowledge Lab / rotation experiment / minimal surfaces

## Environment
- Date/time (Asia/Shanghai): 2026-10-18 17:56–18:38
- Chrome: 155.0.8059.82 (HeadlessChrome/155.0.0.0), shared persistent instance on 127.0.0.1:9333
- Live site commit/repo assumption: https://hujinhai.com live site; source clone `my-portfolio` branch `main` commit 677b476 (read-only)
- Viewports tested: 1440×900 (d1440), 768×1024 (t768), 430×932 (m430), 390×844 (m390); states: 浅/深主题、zh/en、reduced-motion（periodic）、弱网/阻断 CDN 未完成（见 Coverage gaps）
- Note on shared state: `localStorage` (`jhlab-theme` / `jhlab-locale`) is shared by the audit Chrome profile; during tests I set `jhlab-locale=en` and `jhlab-theme=dark`. Astro pages after that start in EN/dark. Other agents' evidence may show this contamination; reset via the nav toggles.
- Raw data: `audit/evidence/lab/rotation-d1440.json`, `audit/evidence/lab/lab-fast.json`, `audit/evidence/lab/metrics.json`, per-page baseline `audit/{lab,rotation,classical,periodic}-<vp>/metrics.json`

## Issue evidence

### [LAB-01] `/lab/` 实验索引不完整；首页「交互几何」与 `/lab/` 入口分裂
- **页面/组件**: `/lab/` 知识实验室首页、首页 `#experiments` 区块
- **复现步骤**:
  1. 打开 https://hujinhai.com/lab/ ，枚举全部链接。
  2. 打开 https://hujinhai.com/ ，枚举 `#experiments`/全部链接。
- **当前行为**: `/lab/` 只有一个实验条目，链接仅 `/lab/rotation/`（还有 `/#projects`、`/#experiments` 等导航链接与 `/brief/` 返回链接）；整页没有任何指向 `minimal-surfaces-classical.html` / `minimal-surfaces-periodic.html` 的链接。首页「交互几何」区块链接了两个 legacy 极小曲面实验（`/experiments/minimal-surfaces-classical.html`、`/experiments/minimal-surfaces-periodic.html`）和一个 `/lab/` 入口，但首页 **不** 链接 `/lab/rotation/`（rotationLinks=[]）。结果是两套实验各有独立目录，互不收录。
- **预期行为**: `/lab/` 作为唯一实验索引，应同时列出 rotation 与两个极小曲面实验；首页交互几何区块应能直达 rotation 实验。
- **证据**: `audit/evidence/lab/lab-fast.json`（`lab.links` / `lab.rotationLinks` / `home.experimentLinks` / `home.rotationLinks` / `home.labLinks`）、`audit/evidence/lab/lab-d1440-ia.jpg`、`audit/evidence/lab/home-computing.jpg`、`my-portfolio/src/pages/lab/index.astro:11-49`
- **严重等级**: high
- **可能涉及的源文件**: `my-portfolio/src/pages/lab/index.astro`（只有 `.lab-work` 一个条目）；首页 `#experiments` 区块数据源（`src/data/site.ts` / 首页组件）未收录 `/lab/rotation/`
- **真实浏览器验证**: yes (1440×900, 页面语言为 en（localStorage 残留）, light theme, no reduced-motion)

### [LAB-02] legacy 实验「返回作品列表」指向不存在的锚点 `/#computing`
- **页面/组件**: 两个 `/experiments/minimal-surfaces-*.html` 的右上角退出按钮
- **复现步骤**:
  1. 打开 https://hujinhai.com/experiments/minimal-surfaces-periodic.html
  2. 读取 `.experiment-exit` 的 href；再打开 https://hujinhai.com/ 检查是否存在 `id="computing"` 的元素。
- **当前行为**: 退出按钮 `href="/#computing"`，text「返回作品列表」，aria-label「返回 J.H. Lab 的交互计算实验」；但首页 DOM 中 `document.querySelector('#computing') === null`（首页交互几何区块实际 id 为 `#experiments`）。点击后只会落到首页顶部/滚动失败，不会到作品列表。classical 页同一个 href（`classical.exitHref = "/#computing"`）。
- **预期行为**: 返回 `/lab/`（知识实验室）或至少 `/#experiments` 的有效锚点。
- **证据**: `audit/evidence/lab/lab-fast.json`（`home.computingText=null`, `legacyChrome.exit.href`, `classical.exitHref`）、`audit/evidence/lab/periodic-d1440-initial.jpg`（右上角按钮）、`my-portfolio/experiments/minimal-surfaces-*.html:66/63`
- **严重等级**: high
- **可能涉及的源文件**: `my-portfolio/experiments/minimal-surfaces-classical.html:66`、`minimal-surfaces-periodic.html:63`（`href="/#computing"`）；首页 section id 在 `src/pages/index.astro` / 首页组件中为 `#experiments`
- **真实浏览器验证**: yes (periodic @1440×900 实测 exit href；home @1440×900 实测无 `#computing`)

### [LAB-03] 两个极小曲面页完全脱离站点外壳（无导航/主题/语言/返回路径固定）
- **页面/组件**: legacy `experiments/*.html`
- **复现步骤**:
  1. 先在任一 Astro 页面把主题设为 dark、语言设为 en（写入 `jhlab-theme=dark`, `jhlab-locale=en`）。
  2. 打开 `minimal-surfaces-periodic.html`（classical 同构），观察外观与 DOM。
- **当前行为**: 无 `.glass-nav`/`nav`/菜单按钮、无主题/语言切换按钮、无 skip-link、无 `meta[name=description]`；`html lang="zh-CN"` 固定、`documentElement.dataset.theme` 为 null、body 背景固定 `rgb(238,241,245)`（classical 固定深色渐变），退出按钮文字固定中文。存储的 dark/en 被完全忽略。两个页面 `<title>` 完全相同：`Three.js · 极小曲面 Minimal Surfaces`。面板与站点视觉语言（圆角玻璃卡、字号体系）不同；在 390 宽下 exit 按钮 131×44、面板 220×199 固定定位。
- **预期行为**: 与站点一致的导航 chrome、主题/语言跟随、可区分的页面标题与描述、明确的返回 Lab 路径。
- **证据**: `audit/evidence/lab/lab-fast.json`（`legacyChrome`、`periodicIgnoresThemeLang`、`classical.title/htmlLang/exitHref`）、`audit/evidence/lab/periodic-d1440-with-dark-en-storage.jpg`、`audit/evidence/lab/classical-d1440-bonnet-fast.jpg`、`audit/evidence/lab/classical-d1440-initial.jpg`、`audit/evidence/lab/periodic-d1440-initial.jpg`
- **严重等级**: medium
- **可能涉及的源文件**: `my-portfolio/experiments/minimal-surfaces-classical.html:1-66`、`minimal-surfaces-periodic.html:1-63`
- **真实浏览器验证**: yes (periodic 在 dark/en localStorage 下重载 @1440×900；classical @1440×900 实测 lang/title/hint)

### [LAB-04] 极小曲面缺少数学解释与参数数值反馈；slider 无可访问名称
- **页面/组件**: classical `#tSlider`（Bonnet 关联族）、periodic 四个曲面按钮
- **复现步骤**:
  1. classical 页点击第 5 个按钮「悬链面 ↔ 螺旋面（Bonnet 关联族）」→ 滑杆出现。
  2. 依次把 t 设为 0 / 0.25 / 0.5 / 0.75 / 1，观察面板与页面是否有当前数值/公式。
- **当前行为**: 滑杆出现且可用，内部重建 4.5–7.2ms/次（几何随 t 连续重建），但 **没有任何数值读数**（`document.querySelector('#sliderWrap output') === null`，5 个采样点无一处可读数）；`<label>` 没有 `for` 指向 `#tSlider`、slider 无 `aria-label`（实测 `labelFor:null, ariaLabel:null` → 可访问名称为空）。页面中没有公式/曲面方程/极小曲面性质解释（`hasMath:false`）；periodic 同样无数学解释。滑杆唯一说明是「关联族参数 t (0 = 螺旋面 → 1 = 悬链面)」。
- **预期行为**: 显示当前 t 值与单位/端点含义，说明 Bonnet 变换/极小曲面方程；slider 具备可访问名称与 aria-valuetext。
- **证据**: `audit/evidence/lab/lab-fast.json`（`classical.before/after/sliderUpdates/hasMath`）、`audit/evidence/lab/classical-d1440-bonnet.jpg`、`audit/evidence/lab/classical-d1440-bonnet-fast.jpg`
- **严重等级**: medium
- **可能涉及的源文件**: `my-portfolio/experiments/minimal-surfaces-classical.html:71-75`（`<label>` 无 for、无 output）、`:365-368`（input 仅 rebuild）
- **真实浏览器验证**: yes (classical @1440×900, zh-CN, light, no reduced-motion)

### [LAB-05] 无“重置视角”；自动旋转忽略 `prefers-reduced-motion`
- **页面/组件**: 两个 legacy 页的 OrbitControls 相机
- **复现步骤**:
  1. 在 Chrome DevTools 中设置 `Emulation.setEmulatedMedia` prefers-reduced-motion=reduce，打开 periodic 页。
  2. 等待稳定后间隔 700–900ms 各截一帧，比较像素 hash。
  3. 面板中查找“重置视角/Reset view”控件（含按钮文字与 DOM）。
- **当前行为**: reduced-motion 生效（`matchMedia(...).matches === true`）时场景仍在持续自动旋转：两次截图 hash `0ae62e8d2f45` ≠ `93707bbf9468`、仍然变化；源码中 `controls.autoRotate = true` 且无 reduced-motion 分支。两页均无 reset view 控件（classical `hasReset:false`）。提示文案只有「拖拽旋转 · 滚轮缩放」，未提示触屏双指缩放（`hintHasPinch:false`）。
- **预期行为**: reduced-motion 下停止自动旋转；提供“重置视角”；移动端提示捏合缩放。
- **证据**: `audit/evidence/lab/lab-fast.json`（`reducedMotionPeriodic`、`classical.hasReset`、`legacyChrome.hint/hintHasPinch`）、`audit/evidence/lab/periodic-d1440-reduced-motion.jpg`
- **严重等级**: medium
- **可能涉及的源文件**: `minimal-surfaces-periodic.html:104-111`（autoRotate 且无 reduced-motion 判断）、`minimal-surfaces-classical.html:113-120`；两页均无 reset 按钮
- **真实浏览器验证**: yes (periodic @1440×900 reduced-motion；classical 的 reduced-motion 为源码同构推断，未单独实测)

### [LAB-06] legacy 控制面板触控目标偏小（32–34px 高）
- **页面/组件**: `#panel .btn` 曲面切换按钮
- **复现步骤**: 在 390×844 移动视口打开两个 legacy 页，量取面板按钮 bounding box。
- **当前行为**: periodic 4 个按钮均高 **32px**、宽 190px；classical 面板按钮高 **34px**（第 5 个 Bonnet 项 50px）。均低于 44×44 的触控目标建议；面板在 m390 只占左上角 220×199，但按钮排布密集。
- **预期行为**: 触控目标 ≥44px 或增加行高/间距。
- **证据**: `audit/evidence/lab/lab-fast.json`（`legacyChrome.buttons[].h`、`classical.btnHeights`）、`audit/classical-m390/initial.jpg`、`audit/periodic-m390/initial.jpg`
- **严重等级**: medium
- **可能涉及的源文件**: `minimal-surfaces-periodic.html:33-40`（`.btn` padding 7px 10px, font 12.5px）、`minimal-surfaces-classical.html:33-40`
- **真实浏览器验证**: yes (periodic 按钮尺寸 @1440×900 计算；classical @1440×900; m390 截图与基线 metrics)

### [LAB-07] 依赖第三方 CDN（unpkg）且失败无任何兜底/提示
- **页面/组件**: 两个 legacy 页的 importmap three.js 加载与 `#loading` 状态机
- **复现步骤**:
  1. 正常打开 periodic，记录 resource timing（three.module.js 来源）。
  2. 审计会话中冷启动导航：记录 `performance.now()` 与 `#loading` 透明度采样。
  3. 源码检查 WebGL/import 失败路径。
- **当前行为**: 两页通过 importmap 从 `https://unpkg.com/three@0.160.0/...` 加载 three 与 OrbitControls（resource timing 实测 URL；本次为缓存命中 duration 8ms/2ms、transferSize 0；冷启动一次 Page load 事件耗时 **9.1s**）。periodic 的 `#loading`（「生成曲面中…」）只在首帧 `mesh` 存在后由 `animate()` 隐藏；缓存/网络/WebGL 失败时没有任何超时、错误提示或降级（源码无 catch）。本次一次曲面切换实测 loading 持续 **1993–4399ms**（共享 Chrome 争用下测得，非纯净基线）。classical 页没有 loading 元素，模块未就绪时面板只有标题、没有按钮。
- **预期行为**: 自托管 three.js（或带 SRI/本地回退），加载失败/WebGL 不可用时显示明确错误与替代内容，loading 有超时。
- **证据**: `audit/evidence/lab/lab-fast.json`（`periodicLoad`、`switchPerf`、`legacyChrome`）、`audit/evidence/lab/periodic-d1440-switched.jpg`、源码 `minimal-surfaces-periodic.html:52-57,72-79,497-500`、`minimal-surfaces-classical.html:78-92`
- **严重等级**: medium
- **可能涉及的源文件**: 两页 `<script type="importmap">` + module script 顶部 import；periodic `#loading` 仅在 `animate()` 成功路径隐藏
- **真实浏览器验证**: yes (periodic @1440×900：CDN URL 与 loading 采样)；**未**完成断网/阻断 CDN/WebGL 失败的实测（见 Coverage gaps）

### [LAB-08] 「姿态差距」指标缺单位/范围，解释默认折叠
- **页面/组件**: `/lab/rotation/` 结果区 `#rotation-difference` / `#rotation-note` / `.math-details`
- **复现步骤**:
  1. 打开 https://hujinhai.com/lab/rotation/（默认 X=90°, Y=90°）。
  2. 读取结果区数值与数学解释的展开状态；把 X 依次改为 0°、30°、90°、180°，记录数值。
- **当前行为**: 默认 metric 显示「姿态差距 Difference **2.45**」——无单位、无取值范围；实测该值在 0–2.83 之间（90°+90°→2.45；180°+90°→2.83；0°+任何→0.00；180°+180°→0.00），是 3×3 旋转矩阵的 Frobenius 距离，**不是角度**。唯一解释「数值为 0 表示两种最终姿态完全相同；它不是角度差」位于默认折叠的 `<details>`（`detailsOpen:false`，需点「为什么会这样？展开数学解释」才看到）；`<output>` 无 `aria-label`/`title`，aria-live 会在拖动滑杆时连续播报裸数字。
- **预期行为**: 数值旁直接给出单位/无量纲说明与范围（0–2.83）、“0=姿态相同”的即时说明；或改用可直接解释的角度差（如相对旋转角）。
- **证据**: `audit/evidence/lab/rotation-d1440.json`（`tests.stageDiff`、`tests.differenceExplainer`、`initial`）、`audit/evidence/lab/rotation-d1440-initial.jpg`、`audit/evidence/lab/rotation-d1440-stage2.jpg`、`my-portfolio/src/pages/lab/rotation/index.astro:62-72`
- **严重等级**: medium
- **可能涉及的源文件**: `src/lib/rotation-lab.ts:36-37,208-215`（`norm()` Frobenius）；`src/pages/lab/rotation/index.astro:62,69`（无单位、note 在 details 里）
- **真实浏览器验证**: yes (1440×900, dark theme, zh-CN, no reduced-motion)

### [LAB-09] 播放动画期间数值/文案滞后约 660ms；停止会回退到阶段起点
- **页面/组件**: `/lab/rotation/` 播放/停止/分步
- **复现步骤**:
  1. 打开 rotation 实验，点「播放两次旋转」。
  2. 每 ~83ms 采样 `#rotation-xy-vector`、`#rotation-difference`、`#rotation-step-explanation`。
  3. 播放 260ms 时点「停止演示」，对比停止前后状态。
- **当前行为**: 画布从第 0ms 起连续插值旋转，但 DOM 数值与步骤文案在整个第一段 660ms 内保持不变（t=251–585ms 采样仍为 `(0.00,0.00,1.00)`、`0.00`、文案「起点…」），到 t≈669ms 才跳到第一步结果；第二段同理（t≈1422ms 才显示第二步）。播放中「停止」立即回退到当前阶段起点（260ms 时停止 → 姿态/数值回到 stage 0，不是停在中间姿态）；本次未见动画叠加、重复调度或 console 错误（rapid clicks 后 stop 隐藏、aria-disabled 恢复）。
- **预期行为**: 动画期间数值可随动画更新（或至少标注“动画中，数值为阶段值”）；停止应保留当前姿态或明确提示将回退。
- **证据**: `audit/evidence/lab/rotation-d1440.json`（`tests.playTimeline`、`tests.stopMidAnimation`、`tests.changeParamMidAnimation`、`tests.rapidClicks`）
- **严重等级**: low
- **可能涉及的源文件**: `src/lib/rotation-lab.ts:226-277`（animateSegment 只 paint 画布，render() 仅在段末调用）、`:278`（interrupt = cancel + render 回阶段态）
- **真实浏览器验证**: yes (1440×900, zh-CN, no reduced-motion)

### [LAB-10] Rotation 实验 i18n 不完整（ARIA / 画布标签不随语言切换）
- **页面/组件**: `/lab/rotation/` 语言切换后的 aria-label
- **复现步骤**: 打开 rotation 实验，点导航「EN」，读取各控件 aria-label 与 html lang。
- **当前行为**: 正文 `data-locale` 正常切换（h1/按钮/说明/note 均变英文，html lang=en，画布 aria-label 变为英文）；但 **相机按钮** aria-label 仍为「向左/向右转动观察视角」、**overlay canvas** aria-label 仍为中文长句、compare region 仍为「…/ Swipe between…」双语；反向地，zh 页面里两个滑杆 aria-label 固定为英文「X axis angle / Y axis angle」。canvas 内绘制的轴标签 X/Y/Z 与 A·X 等不随语言变化（可接受，但相机/overlay 的 aria 未本地化不可接受）。
- **预期行为**: 所有 aria-label 随语言切换（rotation-lab.ts 中 `isEn()` 已有，可覆盖相机/overlay）。
- **证据**: `audit/evidence/lab/rotation-d1440.json`（`tests.themeLang.langCheck.cameraAria/overlayAria/sliderAria/compareAria`）、`audit/evidence/lab/rotation-d1440-dark-en.jpg`
- **严重等级**: medium
- **可能涉及的源文件**: `src/pages/lab/rotation/index.astro:16-17,42,47,77`（硬编码 aria-label）、`src/lib/rotation-lab.ts:197-198`（只更新两个 canvas 的 aria-label）
- **真实浏览器验证**: yes (1440×900, light theme, en, no reduced-motion)

### [LAB-11] 深色主题下 canvas 轴标签对比度不足
- **页面/组件**: `/lab/rotation/` 两个对比 canvas 的轴标签/面标记
- **复现步骤**: 在 rotation 页切到 dark 主题（或初始为 dark 时），读取 `.outcome` 背景色并取 canvas 内硬编码文字颜色计算对比度。
- **当前行为**: dark 主题 `.outcome` 背景 `rgb(32,33,38)`；canvas 轴标签硬编码 `#b34f52`（X）、`#2d806e`（Y）、`#315fa8`（Z），12px 文字。对比度：X ≈ **3.18:1**、Y ≈ **3.39:1**、Z ≈ **2.55:1**，均低于 WCAG AA 4.5:1（画布不会随主题换色，light 主题下正常）。深色截图可见标签发闷。
- **预期行为**: canvas 绘制读取主题 token，深色下提高标签亮度/换色。
- **证据**: `audit/evidence/lab/rotation-d1440-dark.jpg`、`audit/evidence/lab/rotation-d1440-initial.jpg`、`audit/evidence/lab/rotation-d1440.json`（`tests.themeLang.before/dark.cardBg`）
- **严重等级**: medium
- **可能涉及的源文件**: `src/lib/rotation-lab.ts:81,93-101`（硬编码颜色）、`draw()` 中 `ctx.fillText` 字号 12px
- **真实浏览器验证**: yes (1440×900 dark theme；背景色为浏览器实测，字色来自源码常量)

## Non-issues / verified-ok
- **控制→画布/矩阵同步正确（rotation）**: 10 组角度（0/0、0/90、90/0、90/90、15/15、45/30、180/90、180/180、30/60、120/150）的 `#angle-x-value/#angle-y-value`、两个 Z 向量、姿态差距全部与独立四元数参考实现逐项一致（10/10 match），画布非空（每 canvas >19k 非透明像素）。证据 `audit/evidence/lab/rotation-d1440.json` `tests.syncMatrix`。
- **滑杆输入→DOM 延迟**: 20 次连续 input，DOM 文本更新 min 0.5ms / median 0.8ms / max 1.1ms；到下一帧 median 16.6ms（正常一帧）。无 stale 数字（最后一次值总与计算值一致）。证据同上 `tests.inputLatency`。
- **阶段语义一致**: 三个步骤按 reduced-motion 立即切换时（0/1/2）向量与差距分别对应 identity/单旋转/复合旋转，`aria-pressed` 同步，note 文案对应阶段。证据 `audit/evidence/lab/rotation-d1440.json` `tests.steps`（0/1/2 全部正确）与 `tests.stageDiff` 中 stage=1/2 行（stage=0 行为动画未完成时的中间读数，非缺陷；`tests.steps[0]` 为准）。
- **动画生命周期无泄漏/叠加**: 参数中途修改会取消动画（stop 隐藏、阶段回退、数值=阶段值）；快速连点 replay/step/stop 后仅一个终态、`aria-disabled` 与 stop 可见性恢复、无 console 错误。证据同上 `changeParamMidAnimation`、`rapidClicks`。
- **叠影对比可用**: 打开后 overlay canvas 有内容（4120 非透明像素）、panel 1120×380、图例 A/B 完整、`aria-expanded` 正确切换、关闭后 `hidden` 恢复。证据同上 `tests.overlay`、`audit/evidence/lab/rotation-d1440-overlay.jpg`。
- **相机按钮与拖拽有效**: 相机按钮点击后画布像素 hash 改变；模拟 pointer 拖拽后 hash 改变且页面 `scrollY=0`（canvas 的 `touch-action:none`，桌面拖拽不滚动页面）。证据同上 `tests.cameraAndDrag`。
- **键盘可达**: 从 skip-link 到 nav、语言/主题按钮、返回链接、重置、两个滑杆、details summary、三个步骤按钮均可 Tab 到达，`focus-visible` 为 2px 实线 outline（rgb(128,181,255)）；滑杆 ArrowRight 可改值并同步 output/向量。证据同上 `tests.keyboard`、`audit/evidence/lab/rotation-d1440-keyboard-focus.jpg`。
- **/lab/ 与 rotation 页无横向溢出/CLS**: 4 个视口 `scrollWidth == viewport width`（375/390 等），CLS 0；rotation 页 d1440 docH 1983、m390 docH 1376，无页面级滚动异常。证据 `audit/{lab,rotation}-<vp>/metrics.json`、`audit/evidence/lab/rotation-m390-initial.jpg`。
- **m390/m430 双画布布局**: 对比区在移动端是横向 `overflow-x:auto` 滚动区（`.compare-grid` flex + scroll-snap），第二张 outcome 卡在视口外（right=692 @390 宽），文档 scrollWidth 仍为 390（无页面溢出）；有 mobile-view-tabs 与滑动切换，两画布不同屏但可达。证据 `audit/rotation-m390/metrics.json`、`audit/rotation-m430/metrics.json`、`audit/evidence/lab/rotation-m390-full.jpg`。
- **periodic 正常加载/切换功能可用**: 4 个曲面按钮生效、active 跟随最后点击、loading 能在完成后隐藏、快速连点 12 次后无 console 错误、最终 active=Neovius 与最后点击一致。证据 `audit/evidence/lab/lab-fast.json` `switchPerf`。
- **classical 滑杆连续更新**: t=0→1 每次 input 均在 4.5–7.2ms 内完成几何重建，无异常/console 错误。证据同上 `classical.sliderUpdates`。
- **站点主题/语言在 Astro 页面（/lab/、/lab/rotation/）工作正常**: 切 EN 后 data-locale 显隐正确、htmllang=en；切 dark 后 `--card` 变 `rgb(32,33,38)`；rotation 文案/note/step 说明均本地化（仅 aria 有残留，见 LAB-10）。证据 `audit/evidence/lab/rotation-d1440.json` `themeLang`、`lab-d1440-dark.jpg`、`lab-d1440-en.jpg`。

## Coverage gaps
- **极曲面加载/失败场景未完成实测**: 原计划用 CDP `Network.setBlockedURLs` 阻断 unpkg、用 `addScriptToEvaluateOnNewDocument` 覆盖 `getContext` 模拟 WebGL 不可用、以及 `WEBGL_lose_context` 模拟上下文丢失；因共享 Chrome 在多 agent 并发下 `Runtime.evaluate/Input.dispatchTouchEvent` 超时（`CDP timeout`），这三组探针在保存前中断，故 LAB-07 的“失败兜底缺失”仅有源码+加载时序证据，未取得断网/无 WebGL 截图（不得作为已复现缺陷引用）。
- **rotation 移动端交互**: 390/430 下仅完成布局测量与截图；触摸拖动 vs 页面滚动的实测 touch dispatch 超时未完成；200% 缩放未实测。
- **rotation reduced-motion**: 未单独实测（源码显示 play/goTo 在 reduced 下立即跳到终态，属推断）；只实测了 legacy periodic 的 reduced-motion 自动旋转。
- **内存/GPU 生命周期**: classical/periodic 多次参数变化的 JSHeap/长任务/几何 dispose 未完成（探针中断）；rotation 2D canvas 无 WebGL 上下文问题。
- **弱网（限速）**：未完成（探针中断）；仅有共享 Chrome 争用下的加载时长（不可作纯净性能基线）。
- **深色主题 canvas 标签对比度**为浏览器实测背景色 + 源码字色的计算结果，未做像素级实测（画布文字抗锯齿影响取色）。
- 共享 Chrome 的 localStorage 被本会话写入 `jhlab-locale=en` / `jhlab-theme=dark`，其他 agent 的 Astro 页面证据可能显示 EN/dark；需重置。
