/* Shared experiment workspace shell.
 *
 * The legacy Three.js pages keep their own renderers; this file supplies the
 * J.H. Lab chrome, theme/locale sync, loading + failure states and a common
 * reset-view event. It deliberately does not create a renderer of its own.
 */
(() => {
  "use strict";
  const boot = () => {
  const root = document.documentElement;
  const body = document.body;
  if (!body) return;
  const experiment = body.dataset.labExperiment || "experiment";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const titles = {
    classical: { zh: "经典极小曲面", en: "Classical minimal surfaces" },
    periodic: { zh: "周期极小曲面", en: "Periodic minimal surfaces" }
  };
  const meta = titles[experiment] || { zh: "实验", en: "Experiment" };
  const locale = localStorage.getItem("jhlab-locale") === "en" ? "en" : "zh";
  const theme = localStorage.getItem("jhlab-theme")
    || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  const t = (zh, en) => locale === "en" ? en : zh;
  root.dataset.theme = theme;
  root.lang = locale === "en" ? "en" : "zh-CN";

  // ---- Chrome ---------------------------------------------------------
  const chrome = document.createElement("header");
  chrome.className = "lab-chrome";
  chrome.innerHTML = `
    <a class="lab-back" href="/lab/"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5m7-7-7 7 7 7"/></svg><span>${t("返回实验室", "Back to Lab")}</span></a>
    <span class="lab-title"><small>J.H. LAB / EXPERIMENT ${experiment === "classical" ? "002" : "003"}</small><strong>${t(meta.zh, meta.en)}</strong></span>
    <span class="lab-actions">
      <button type="button" data-lab-reset title="${t("回到初始视角", "Reset the view")}">${t("重置视角", "Reset view")} ↺</button>
      <button type="button" data-lab-help aria-expanded="false" aria-controls="lab-help-panel">${t("操作说明", "Help")} ?</button>
    </span>`;
  body.prepend(chrome);

  const help = document.createElement("div");
  help.className = "lab-help";
  help.id = "lab-help-panel";
  help.hidden = true;
  help.innerHTML = `
    <strong>${t("怎么操作这个实验", "How to use this experiment")}</strong>
    <ul>
      <li>${t("拖拽旋转 · 滚轮或双指缩放", "Drag to rotate · wheel or pinch to zoom")}</li>
      <li>${t("左侧列表切换曲面 / 调整参数", "Use the left panel to switch surfaces or parameters")}</li>
      <li>${t("「重置视角」回到初始相机；不会重置参数", "Reset view returns the camera; parameters stay")}</li>
      <li>${t("键盘 Tab 可到达全部控件", "All controls are keyboard reachable")}</li>
    </ul>
    <p>${t("渲染使用 Three.js，几何生成在本地完成。弱网下加载可能较慢；失败时会显示可重试的回退界面。", "Rendering uses Three.js and generates geometry locally. Loading can be slow on weak networks; failures show a retryable fallback.")}</p>`;
  body.append(help);
  const helpButton = chrome.querySelector("[data-lab-help]");
  helpButton?.addEventListener("click", () => {
    const open = help.hidden;
    help.hidden = !open;
    helpButton.setAttribute("aria-expanded", String(open));
    if (open) help.querySelector("strong")?.setAttribute("tabindex", "-1");
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !help.hidden) {
      help.hidden = true;
      helpButton?.setAttribute("aria-expanded", "false");
      helpButton?.focus();
    }
  });
  chrome.querySelector("[data-lab-reset]")?.addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("jhlab:reset-view"));
  });

  // ---- Loading / failure ---------------------------------------------
  const loading = document.createElement("div");
  loading.className = "lab-loading";
  loading.innerHTML = `
    <div class="lab-loading-card" role="status" aria-live="polite">
      <strong data-lab-loading-title>${t("正在生成曲面", "Building the surface")}</strong>
      <p data-lab-loading-copy>${t("几何在本地计算；首次加载需要一点时间。", "Geometry is computed locally; the first load takes a moment.")}</p>
      <div class="lab-loading-bar" aria-hidden="true"></div>
      <button type="button" data-lab-retry hidden>${t("重试", "Retry")}</button>
    </div>`;
  body.append(loading);
  let ready = false;
  let timeout = 0;
  const retry = loading.querySelector("[data-lab-retry]");
  const showFailure = (message) => {
    if (ready) return;
    window.clearTimeout(timeout);
    loading.classList.remove("is-hidden");
    const title = loading.querySelector("[data-lab-loading-title]");
    const copy = loading.querySelector("[data-lab-loading-copy]");
    if (title) title.textContent = t("这个 3D 实验没能启动", "This 3D experiment could not start");
    if (copy) copy.textContent = message || t("请检查网络或浏览器的 WebGL 支持，然后重试。", "Check your network or WebGL support, then retry.");
    if (retry) retry.hidden = false;
  };
  retry?.addEventListener("click", () => location.reload());
  window.LabWorkspace = {
    get reduced() { return reduce.matches; },
    get theme() { return theme; },
    get locale() { return locale; },
    ready(message) {
      ready = true;
      window.clearTimeout(timeout);
      if (message) {
        const title = loading.querySelector("[data-lab-loading-title]");
        if (title) title.textContent = message;
      }
      loading.classList.add("is-hidden");
    },
    fail: showFailure,
    setStatus(text) {
      const copy = loading.querySelector("[data-lab-loading-copy]");
      if (copy && text) copy.textContent = text;
    }
  };
  // A dependency or geometry that never resolves must not trap the visitor.
  timeout = window.setTimeout(() => {
    if (!ready) showFailure(t("加载超时：可能无法访问 Three.js 资源。请检查网络后重试。", "Timed out: the Three.js resources may be unreachable. Check your network and retry."));
  }, 15000);

  reduce.addEventListener?.("change", () => {
    window.dispatchEvent(new CustomEvent("jhlab:reduced-motion", { detail: reduce.matches }));
  });
  // Keep the canvas comfortable on small devices.
  window.LabWorkspace.maxDpr = matchMedia("(max-width: 760px)").matches ? 1.5 : 1.75;
  };
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot, { once: true });
  } else {
    boot();
  }
})();
