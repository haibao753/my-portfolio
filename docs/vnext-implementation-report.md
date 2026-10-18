# J.H. Lab vNext — 实施报告（Phase 0–5）

> 基线：`main` @ `677b476`（线上 `hujinhai.com` 当前部署提交，由 `/deployment.json` 核对）
> 分支：`vnext/phase-0-audit` → `phase-1-design-system` → `phase-2-homepage` → `phase-3-brief` → `phase-4-knowledge` → `phase-5-surfaces`（堆叠 PR，每个阶段独立可审查）
> 本地验证：`npx astro check` 0 errors / 0 warnings；`npm run build` 成功；共享 headless Chrome CDP 交互探针；本地 `astro preview`。
> 性能数字均为本机 CDP 测量，不是线上承诺；线上部署未执行（等待授权）。

## PR（堆叠，按序合并）

| Phase | PR | Head → Base |
|---|---|---|
| 0 现场审查 | [#40](https://github.com/haibao753/my-portfolio/pull/40) | `vnext/phase-0-audit` → `main` |
| 1 设计系统 | [#41](https://github.com/haibao753/my-portfolio/pull/41) | `vnext/phase-1-design-system` → `phase-0-audit` |
| 2 首页 | [#42](https://github.com/haibao753/my-portfolio/pull/42) | `vnext/phase-2-homepage` → `phase-1-design-system` |
| 3 简报 | [#43](https://github.com/haibao753/my-portfolio/pull/43) | `vnext/phase-3-brief` → `phase-2-homepage` |
| 4 知识探索 | [#44](https://github.com/haibao753/my-portfolio/pull/44) | `vnext/phase-4-knowledge` → `phase-3-brief` |
| 5 实验统一 | [#45](https://github.com/haibao753/my-portfolio/pull/45) | `vnext/phase-5-surfaces` → `phase-4-knowledge` |

> 合并顺序：40 → 41 → 42 → 43 → 44 → 45。各 PR base 为上一阶段分支；合并后可对 `main` 再做一次最终回归。

## 0. 结论

- **Phase 0 的问题清单已按序落地**：CLS 的主要来源、筛选状态互斥、3D 无入口/无语义、旋转实验的教学缺口、极小曲面脱离站点外壳与死锚点，均有对应代码修改与浏览器复核。
- 未改动：URL、每日简报 JSON schema、私有数据管线、邮箱/微信、站外链接、既有 Liquid Glass GPU 引擎。
- 未执行：Cloudflare 部署、线上流量切换、真实 Android/iOS 设备验收（本机无设备）。

## 1. 各阶段变更

### Phase 0 — 现场审查（`vnext/phase-0-audit`）
- 新增 `docs/ux-audit-vnext.md`（完整问题清单、复现步骤、证据、源文件、严重等级）。
- 新增 `docs/audit-vnext/`（简报/实验室/取证原始报告与机器可读 metrics，工作区 `audit/` 中保留截图与录屏帧）。
- 确证：**线上 = main HEAD**；37 个实验分支未合入；`daily-intelligence-brief` 为私有仓库；Liquid Glass 已上线且真实启用 WebGL。

### Phase 1 — 设计系统（`vnext/phase-1-design-system`）
- `src/styles/tokens.css`：新增 `--nav-height` 与 Motion Tokens（press 110 / hover 150 / filter 280 / nav 340 / card 400 / page 480 ms，editorial/exit/spring easing），Reduced Motion 自动降为 1ms。
- 新增 `src/lib/motion.ts`：可中断动画、IntersectionObserver 编辑式 reveal、焦点返回、`prefersReducedMotion`；内容在 JS 前可见。
- `BaseLayout.astro` / `SiteNav.astro`：
  - 关闭菜单时面板 `inert` 保持，焦点回到触发按钮；`inert`/`pointer-events` 防止关闭动画期间误触。
  - 导航高度全站统一为 58px，消除简报页 `nav-orb.css` 晚到时 12px 位移。
  - 指针光跟随（注册 `--glass-light-x/y`，鼠标/触摸一致；GPU 层仍由原光学引擎驱动，未退化为纯 CSS blur）。
  - 所有 hover/press 时长改用 token。
- 验证：本地桌面/移动 nav 高度稳定；菜单开合、焦点返回；GPU canvas 仍为 `liquid-v2`（`data-live-optics=on`）。

### Phase 2 — 首页（`vnext/phase-2-homepage`）
- Hero 保留原像素显现（已满足 Non-linear/可降级/无 CLS），未重写。
- `ProjectCard.astro` / `ProjectVisual.astro` 重构：
  - 统一外壳 + 编号/事实行/外链标签；四个模块拥有不同主视觉与反馈：阅读数据流（世界观察）、真实视频封面（数学影像）、照片堆叠（三维记忆）、**可拖动 Bonnet 族线框 canvas**（交互几何，`t` 随指针变化）。
  - 交互几何卡内嵌 3 个实验的目录（001 rotation / 002 classical / 003 periodic），与 `/lab/` 形成两层结构。
- `MotionLayer.astro`：reveal 改为克制的 18px/480ms 编辑式；滚动深度降为 ≤8px 位移与 ±0.35° 倾斜，去掉亮度驱动；Reduced Motion 全部关闭。
- `BilibiliStudio.astro`：加载 spinner、`aria-busy`、移动端标题两行不截断、错误文案保留；关闭焦点/滚动保持原行为。
- `site.ts`：新增 `experiments` 数据源；导航 URL 未改（保留 `/#experiments`），交互几何主链接改为 `/lab/`（局部实验链接仍在卡内，全部原 URL 可访问）。
- 验证（本地 1440/390）：CLS 0、无横向溢出、四卡可交互动画、悬停/焦点、视频弹层打开关闭正常、console 0 错误。

### Phase 3 — 每日简报（`vnext/phase-3-brief`）
- `brief-reader.ts` 重写为**单一筛选状态 + 单一 render 路径**：
  - 日期/范围/刊期/话题/搜索互相保留；范围切换不再静默清空话题/刊期；同值范围不重复请求。
  - 搜索防抖 140ms；实时更新真实列表；范围提示常驻；新增“搜索全部归档”按需加载 5 期（不改变数据管线）。
  - 状态区分：`loading / ready / empty-issue / empty-search / empty-filter / error`；错误态提供页内重试；筛选面板新增“重置”。
  - 首次加载使用与卡片同节奏的 skeleton；`#status` 不再绝对定位，首屏 CLS 来源消除。
  - 移动端顶栏保持“日期 + 展开”两个控件；结果计数与范围显示在状态行（不再只在展开面板里）。
- 阅读展开：外层改为 `grid-template-rows` 空间展开动画；展开/关闭时保持触发按钮焦点；原文信息与论文研究档案仍在展开区内（保留既有 research 渲染与安全校验）。
- 实测（本地 cold-ish, m390/d1440）：**CLS 0（m390）/ 0.0056（d1440）**（首屏预留 stories 高度，disclaimer/footer 不再进入首屏后位移）；0 大 layout shift、68–77 卡正常；搜索即时输入 400ms 内更新（含防抖）；范围+话题组合保留；断网重试后可恢复；无 console 错误。

### Phase 4 — 知识探索（`vnext/phase-4-knowledge`）
- `spatial-reader.ts` 重写：
  - 生产环境**默认显示“探索空间”入口**（不再依赖 `?experimentalGraph=1`）。
  - 语义布局：**颜色=主题，半径/角度=主题聚类，高度=当前列表新近顺序，连线=同主题时间相邻或同来源**；UI 明确说明“不做语义模型推断”。
  - 交互：hover tooltip、拖拽阈值（≥8px 只旋转不选点）、点击节点、←/→ 节点、滚轮/双指缩放、重置视角、关闭返回焦点。
  - 节点→文章：关闭对话框、滚动并展开对应文章；列表↔空间指向同一 DOM 卡片。
  - 性能/降级：DPR≤1.5、无空闲动画循环、ResizeObserver、WebGL 失败显示可读回退；关闭后不重建 renderer。
- Rotation 实验（team 交付 + Lead 复核）：
  - 桌面变为真正工作台：左参数/步骤/预测，中间两个画布**首屏可见**，右侧/下方结果、Frobenius 度量定义与 0–2.83 刻度、四个 3×3 矩阵（RX/RY/RY·RX/RX·RY）。
  - 播放期间 DOM 数值与画布同步；**停止停在当前帧**；参数修改取消动画；两种顺序共享时间轴。
  - 新增可跳过预测“交换顺序结果一样吗？”；i18n/ARIA 与深色 canvas 标签对比度修正；Reduced Motion 不播长动画。
- `/lab/` 成为唯一实验目录：保留 001 主视觉，新增全部 3 个实验列表（URL 未变）。
- 验证：CDP 矩阵/向量与独立计算一致；预测、播放/停止、重置、语言切换、无 console 错误；桌面 1440 首屏含画布；无横向溢出。

### Phase 5 — 实验统一与性能（`vnext/phase-5-surfaces`）
- 新增共享 `assets/lab-workspace.css/js`：
  - 统一实验外壳：返回 `/lab/`（修复 `/#computing` 死锚点）、实验名、重置视角、帮助、主题/语言同步、加载/失败/重试状态、15s 超时兜底。
  - 触控目标 ≥38–44px；Reduced Motion 关闭自动旋转（并监听变化）；DPR 上限（移动 1.5 / 桌面 1.75）。
- 两个 legacy 页：
  - Three.js 改为**动态导入 + try/catch**：CDN/WebGL 失败显示明确回退与重试，不再永久卡在“生成曲面中…”。
  - classical：Bonnet `t` 实时数值（滑杆下方 + 底部读数）、数学解释与曲面族说明、几何 dispose、页面隐藏暂停渲染、主题背景色。
  - periodic：曲面名称/方程/解释随切换更新、移动端降分辨率（38 vs 48）、生成状态、几何 dispose、页面隐藏暂停、透明背景适配明暗主题。
- 验证（本地）：classical ready 1.7s (d) / 1.4s (m)；periodic ready 0.85s (d) / 0.76s (m)；chrome/主题/加载隐藏/无 console 错误/无横向溢出；`astro check` 与 build 通过。

## 2. 性能变化（本机 CDP，无节流，非线上承诺）

| 指标/页面 | Before（Phase 0） | After（本地 vNext） |
|---|---|---|
| `/brief/` CLS | 0.16–0.80（冷/热） | **0.0056（d1440）/ 0（m390）**；skeleton + 首屏高度预留 |
| `/brief/` 首屏状态 | 数据后到 + 状态行脱离文档流 | 固定状态行 + skeleton；footer/disclaimer 首屏不再位移 |
| `/#` 首页 | LCP 0.72–0.84s，CLS 0 | LCP 0.5–0.9s 级（本地），CLS 0；四卡新视觉 |
| `/lab/rotation/` | 画布首屏不可见 | 画布出现在首屏（top≈338px @1440×900），无 CLS |
| minimal surfaces | 无加载/失败兜底，死锚点 | 明确 loading/ready/fail/retry；ready 0.8–1.7s（本地） |
| 简报数据请求 | 串行-ish + render 卡顿 | 并行/取消旧请求；骨架与真实列表衔接 |

> 上述 after 数字来自本机 `astro preview` + 共享 Chrome；线上需要通过 Cloudflare 预览/部署后复测。Phase 0 的线上基线数字见 `docs/ux-audit-vnext.md`。

## 3. 已知限制 / 未完成

- **Playwright e2e**：本机缓存浏览器版本（1228/1223）与 lockfile 期望（1248）不一致；`npx playwright install chromium` 正在下载，若完成会补跑。当前以 CDP 探针覆盖核心交互；PR 中不把未运行的测试标记为通过。
- 真实 Android/iOS 设备、200% 浏览器缩放、Lighthouse 正式分数：未测（Phase 0 已列 coverage gap）。
- 跨刊期搜索为按需加载（5 期 JSON 并行），未做全文索引/服务端搜索；数据 schema 未改。
- 2D/3D 画布在极低端设备上的帧率只做了 DPR 与暂停策略，没有设备农场数据。
- 知识空间的“来源连线”只在同来源重复时出现；当前数据中较少，属于诚实呈现而非缺陷。
- 视觉细节（知识空间点位密度、极小曲面移动端面板占位）仍可在真实设备验收后微调。

## 4. 发布与回滚

1. 本分支不直接部署；请先审阅 PR 与本地预览。
2. 需要授权后才能合并到 `main` 并触发 Cloudflare Workers Builds。部署前建议在独立 Preview Worker 验证 `/`、`/brief/`、`/lab/rotation/`、两个 `/experiments/` 页面、`/brief/data/*.json`。
3. 回滚：`main` 上各 Phase 独立可 revert；数据管线、URL、资产未改，回滚风险低。
4. 验收清单见 `docs/ux-audit-vnext.md` §7 与各 Phase PR 描述。
