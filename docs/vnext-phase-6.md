# J.H. Lab vNext — Phase 6：上线后的设计复盘与「阅读优先」迭代

> 基线：线上 `hujinhai.com`（部署于 Phase 0–5 合并后），本地分支 `vnext/phase-6-reading`
> 日期：2026-10-25（上线 7 天后，简报归档从 5 期增长到 12 期）
> 方法：真实浏览器 CDP（390×844 / 1440×900）+ 真实线上数据 + 本地 preview

## 1. 上线后复盘：数据增长改变了几件事

1. **简报首屏从 85 张卡片增长到 121 张**（“近三天”默认范围），首屏渲染出现 **555ms 长任务**，移动端 LCP 2.2s。
2. **移动端旋转实验的横向对比卡**只露出下一张的一小截，边缘出现孤立的 “02/0” 数字残片，看起来像渲染错误。
3. **滚动时大标题从玻璃导航下方穿过**，在放大标题（如“今日值得读”）上会与 EN/主题按钮混在一起，可读性下降。
4. **极小曲面的说明 dock** 在 390×844 上占掉约 1/4 屏，画布可交互区域被压缩。
5. **知识空间的高度编码没有视觉说明**（图例只有“高度 = 新近”），移动端也没有明确的手势提示。

## 2. Phase 6 实际修改

### A. 简报：分批呈现 + 阅读聚焦 + 预热（`src/lib/brief-reader.ts`、`src/pages/brief/index.astro`、`src/layouts/BaseLayout.astro`）
- **首批只绘制 24 张卡**，其余由滚动哨兵或“继续加载”按钮按 24 张递增；筛选/搜索始终作用于完整 121 条，计数仍显示总数；底部显示“已显示 24 / 121 条”。
- **阅读聚焦**：一次只展开一张卡；其余卡片降至 42% 不透明度（移动端 55%）；打开时把卡片滚到 sticky nav 下方，关闭后焦点回到“展开/收起”按钮。
- **首屏预热**：`BaseLayout` 增加 `<slot name="head">`，简报页在构建期读取 `brief/data/index.json`，预加载 manifest + 最新一期 JSON。
- 首屏高度预留保留（Phase 3），CLS 不回归。

### B. 玻璃导航：可读性与启动成本（`src/components/SiteNav.astro`、`src/layouts/BaseLayout.astro`、`assets/live-homepage-optics.js`）
- 新增 `data-scrolled` 状态：页面离开顶部后，在 GPU 材质之上叠一层 72–82% 的背景色 veil，保留折射但让标签清晰；折叠为 orb 时 veil 自动隐藏。
- GPU 光学初始化从“脚本执行即开始”改为 **浏览器空闲时启动**（`requestIdleCallback`，1.8s 上限），CSS 玻璃先接管；首次采样改为 **先做廉价包围盒过滤**，只对真正经过导航区域的元素做 style 读取。
- 结果：简报首屏长任务从 555–657ms 降到约 277–362ms（headless SwiftShader 会放大 shader 编译成本，真机需复测）；`?opticalEngine=0` 下为 0 长任务。

### C. 旋转实验移动端（`src/pages/lab/rotation/index.astro`）
- 对比卡改为 **整屏宽 + scroll-snap**，不再露出被裁切的下一张残片；A/B 切换改由既有 tabs 控制。

### D. 知识空间（`src/pages/brief/index.astro`）
- 画布左侧增加 **“较新 / 较早”时间轴标注**，把“高度 = 新近”的编码变成可读信息。
- 移动端新增手势提示：“单指拖动旋转 · 双指缩放 · 点按节点阅读”。

### E. 极小曲面移动端（`assets/lab-workspace.js`、`assets/lab-workspace.css`）
- 说明 dock 在移动端默认折叠为“当前曲面 + 状态 + 说明 +”一行（约 72px），点击展开完整数学解释；画布保留更多可视空间。

## 3. 验证（本地 preview，真实 12 期数据）

| 项目 | 结果 |
|---|---|
| 简报首屏 | 24 / 121 张，**CLS 0**，LCP **1.86s**（优化前 2.2s） |
| 继续加载 | 24 → 48（按钮）→ 72（滚动哨兵），计数与筛选正常 |
| 搜索 / 全部归档 | AI → 201（全部归档 409 条）；话题组合仍生效；真实列表更新 |
| 阅读聚焦 | 同时仅 1 张开；其余 23 张 dim；打开后卡片 top≈156px（nav 下方）；关闭后焦点回 toggle |
| 预热 | `<link rel=preload>` 指向 `/brief/data/index.json` + 最新日期 |
| 长任务 | 普通 277–362ms；`opticalEngine=0` 为 0（headless 软件 WebGL 放大，真机待测） |
| 旋转移动端 | 卡片 362px 满宽、页面无横向溢出、无残片 |
| 知识空间 | 时间轴可见、手势提示可见、canvas 正常 |
| 极小曲面移动端 | dock 默认 72px，展开 135px，toggle aria-expanded 正确 |

截图：`audit/evidence/phase6/`（brief-m390-first / brief-reading-d1440 / brief-nav-y40 / rotation-m390-final / knowledge-m390-final / periodic-m390-dock 等）。

## 4. 未完成 / 风险

- 长任务在 headless（SwiftShader）下仍超过 200ms 目标；真机 GPU 可能不同，需真实设备 + CrUX 复测。若真机仍高，下一步按“`/brief/` 移动端默认 CSS 玻璃，`?opticalEngine=2` opt-in”做策略降级，而不是删除 GPU 能力。
- 半自动加载会让首屏 DOM 与总条数不一致（这是设计选择，已在进度条中明示）；播放/打印/无障碍朗读如需完整列表，可加“展开全部”入口。
- Playwright e2e 仍未在本机运行（浏览器版本问题，同 Phase 5）；CI 的 browser acceptance 在 main 上原本就失败。
- 真实 Android/iOS、200% 缩放、Lighthouse 未测。

## 5. 下一步建议

1. 合并本 PR 后，用真实手机复测简报首屏和滚动中的玻璃加载长任务；
2. 若真机长任务仍高，再做 `prefers-reduced-data` / 低端设备策略；
3. 简报阅读可继续做“全文阅读器”形态（从卡片位置过渡到阅读层），但需要与搜索/返回位置一起设计。
