/**
 * J.H. Lab experiment 001: rotation matrices, independent from the camera.
 * Column vectors; "X then Y" means Ry * Rx, not Rx * Ry.
 * No idle animation loop or external runtime dependency.
 */
type Vec3 = [number, number, number];
type Mat3 = [Vec3, Vec3, Vec3];
type Order = "xy" | "yx";
type Lang = "zh" | "en";
const radians = (deg: number) => deg * Math.PI / 180;
const rx = (deg: number): Mat3 => {const c = Math.cos(radians(deg)), s = Math.sin(radians(deg)); return [[1, 0, 0], [0, c, -s], [0, s, c]];};
const ry = (deg: number): Mat3 => {const c = Math.cos(radians(deg)), s = Math.sin(radians(deg)); return [[c, 0, s], [0, 1, 0], [-s, 0, c]];};
const apply = (m: Mat3, v: Vec3): Vec3 => [
 m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
 m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
 m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]
];
const multiply = (a: Mat3, b: Mat3): Mat3 => {
 const cols: [Vec3, Vec3, Vec3] = [[b[0][0], b[1][0], b[2][0]], [b[0][1], b[1][1], b[2][1]], [b[0][2], b[1][2], b[2][2]]];
 return [0, 1, 2].map(i => cols.map(col => a[i][0] * col[0] + a[i][1] * col[1] + a[i][2] * col[2]) as Vec3) as Mat3;
};
const composition = (x: number, y: number, order: Order): Mat3 =>
 order === "xy" ? multiply(ry(y), rx(x)) : multiply(rx(x), ry(y));
const identity = (): Mat3 => [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const stepMatrix = (x: number, y: number, order: Order, stage: number): Mat3 => {
 if (stage === 0) return identity();
 if (stage === 1) return order === "xy" ? rx(x) : ry(y);
 return composition(x, y, order);
};
// Physically valid intermediate orientations. A segment is either the first
// or second fixed-world-axis operation. Never linearly interpolate matrix cells.
const partialStep = (x: number, y: number, order: Order, segment: 0 | 1, amount: number): Mat3 => {
 const t = Math.max(0, Math.min(1, amount));
 if (segment === 0) return order === "xy" ? rx(x * t) : ry(y * t);
 return order === "xy" ? multiply(ry(y * t), rx(x)) : multiply(rx(x * t), ry(y));
};
const norm = (a: Mat3, b: Mat3): number =>
 Math.sqrt(a.reduce((sum, row, i) => sum + row.reduce((s, v, j) => s + (v - b[i][j]) ** 2, 0), 0));
const MAX_DIFFERENCE = 2 * Math.SQRT2;
const fmt = (v: number) => Math.abs(v) < .005 ? "0.00" : v.toFixed(2);
const fmtVec = (v: Vec3) => "(" + v.map(fmt).join(", ") + ")";

type Camera = {yaw: number; pitch: number};
const camera: Camera = {yaw: .58, pitch: -.31};
const verts: Vec3[] = Array.from({length: 8}, (_, i) => [(i & 1) ? -.72 : .72, (i & 2) ? -.72 : .72, (i & 4) ? -.72 : .72]);
const faces: {ids: number[]; color: string}[] = [
 {ids: [0, 2, 6, 4], color: "#8dbce4"}, {ids: [1, 5, 7, 3], color: "#4d8cb5"},
 {ids: [0, 4, 5, 1], color: "#b5d4e9"}, {ids: [2, 3, 7, 6], color: "#a1c5df"},
 {ids: [0, 1, 3, 2], color: "#d5e5f0"}, {ids: [4, 6, 7, 5], color: "#e6c17a"}
];
function view(v: Vec3): Vec3 {
 const c = Math.cos(camera.yaw), s = Math.sin(camera.yaw);
 const x = c * v[0] + s * v[2], z = -s * v[0] + c * v[2], y = v[1];
 const a = Math.cos(camera.pitch), b = Math.sin(camera.pitch);
 return [x, a * y - b * z, b * y + a * z];
}
type Palette = {x: string; y: string; z: string; face: string; overlayA: string; overlayB: string; text: string};
function palette(): Palette {
 const dark = document.documentElement.dataset.theme === "dark";
 return dark
  ? {x: "#ff9a9f", y: "#6fd8ba", z: "#9cc0ff", face: "#101319", overlayA: "#7db8ef", overlayB: "#f2a75f", text: "#e9eef6"}
  : {x: "#b34f52", y: "#2d806e", z: "#315fa8", face: "#fff", overlayA: "#236ca9", overlayB: "#cc7435", text: "#fff"};
}
function draw(canvas: HTMLCanvasElement, m: Mat3) {
 const ctx = canvas.getContext("2d");
 if (!ctx) return;
 const pal = palette();
 const bounds = canvas.getBoundingClientRect();
 const w = Math.max(1, bounds.width), h = Math.max(1, bounds.height);
 const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
 const pixelW = Math.max(1, Math.round(w * dpr)), pixelH = Math.max(1, Math.round(h * dpr));
 if (canvas.width !== pixelW || canvas.height !== pixelH) {canvas.width = pixelW; canvas.height = pixelH;}
 ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
 // Fit the full cube *and* its local axes/labels within a mobile canvas.
 const size = Math.max(14, Math.min(w * .34, (h - 60) / 3.25));
 const project = (v: Vec3) => {
  const p = view(v); const k = 3.1 / (3.1 - p[2] * .21);
  return {x: w * .5 + p[0] * size * k, y: h * .5 - p[1] * size * k, z: p[2]};
 };
 // Rotate all points using the actual SO(3) matrix, then move only the camera for display.
 const transformed = verts.map(v => project(apply(m, v)));
 const layers = faces.map(f => ({...f, depth: f.ids.reduce((sum, i) => sum + transformed[i].z, 0) / 4}));
 layers.sort((a, b) => a.depth - b.depth);
 ctx.lineWidth = 1.5;
 for (const face of layers) {
  ctx.beginPath();
  face.ids.forEach((id, i) => {const p = transformed[id]; if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);});
  ctx.closePath(); ctx.fillStyle = face.color; ctx.globalAlpha = .84; ctx.fill(); ctx.globalAlpha = 1;
  ctx.strokeStyle = "#26445e"; ctx.stroke();
 }
 const axes: [Vec3, string, string][] = [[[1.25, 0, 0], "X", pal.x], [[0, 1.25, 0], "Y", pal.y], [[0, 0, 1.25], "Z", pal.z]];
 const o = project([0, 0, 0]);
 ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "600 12px system-ui";
 for (const [axis, label, color] of axes) {
  const end = project(apply(m, axis));
  ctx.beginPath(); ctx.moveTo(o.x, o.y); ctx.lineTo(end.x, end.y); ctx.lineWidth = 2.8; ctx.strokeStyle = color; ctx.stroke();
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(end.x, end.y, 4, 0, Math.PI * 2); ctx.fill();
  const labelX = Math.max(18, Math.min(w - 18, end.x + 10));
  const labelY = Math.max(16, Math.min(h - 16, end.y - 11));
  ctx.fillText(label, labelX, labelY);
 }
 // Three labelled face-centre stickers stay on the cube; hide back-facing stickers.
 for (const [normal, label, fill] of [
  [[1, 0, 0], "X", "#ba5555"], [[0, 1, 0], "Y", "#277f6b"], [[0, 0, 1], "Z", "#dc9c35"]
 ] as [Vec3, string, string][]) {
  if (view(apply(m, normal))[2] <= .08) continue;
  const center = project(apply(m, normal.map(v => v * .73) as Vec3));
  ctx.beginPath(); ctx.arc(center.x, center.y, 12, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = "#fff"; ctx.stroke();
  ctx.fillStyle = "#fff"; ctx.font = "700 11px system-ui"; ctx.fillText(label, center.x, center.y + .5);
 }
}
function drawOverlay(canvas: HTMLCanvasElement, a: Mat3, b: Mat3) {
 const ctx = canvas.getContext("2d"); if (!ctx) return;
 const pal = palette();
 const {width: w, height: h} = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 1.5);
 const pixelW = Math.max(1, Math.round(w * dpr)), pixelH = Math.max(1, Math.round(h * dpr));
 if (canvas.width !== pixelW || canvas.height !== pixelH) {canvas.width = pixelW; canvas.height = pixelH;}
 ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
 // Overlay must reserve room for axis-tip arrows and labels on all sides.
 const size = Math.max(14, Math.min(w * .32, (h - 64) / 3.35));
 const project = (v: Vec3) => {const p = view(v), k = 3.1 / (3.1 - p[2] * .21); return [w * .5 + p[0] * size * k, h * .5 - p[1] * size * k] as const;};
 const edges: [[number, number], ...Array<[number, number]>] = [[0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3], [2, 6], [3, 7], [4, 5], [4, 6], [5, 7], [6, 7]];
 // The outline of a cube can coincide after distinct 90-degree rotations
 // because the cube has rotational symmetries. Distinguish *oriented frames*:
 // the directions of both local X and local Z determine an SO(3) orientation.
 for (const [m, color, series] of [[a, pal.overlayA, "A"], [b, pal.overlayB, "B"]] as [Mat3, string, string][]) {
  const pts = verts.map(v => project(apply(m, v)));
  ctx.lineJoin = "round"; ctx.strokeStyle = color; ctx.lineWidth = 1.4; ctx.globalAlpha = .28;
  for (const [i, j] of edges) {ctx.beginPath(); ctx.moveTo(...pts[i]); ctx.lineTo(...pts[j]); ctx.stroke();}
  ctx.globalAlpha = 1;
  const origin = project([0, 0, 0]);
  for (const [axis, label] of [[[1, 0, 0], "X"], [[0, 0, 1], "Z"]] as [Vec3, string][]) {
   const tip = project(apply(m, axis.map(v => v * 1.24) as Vec3));
   const dx = tip[0] - origin[0], dy = tip[1] - origin[1], len = Math.max(1, Math.hypot(dx, dy));
   const ux = dx / len, uy = dy / len, px = -uy, py = ux;
   ctx.beginPath(); ctx.moveTo(...origin); ctx.lineTo(...tip);
   ctx.strokeStyle = color; ctx.lineWidth = label === "Z" ? 4 : 2.5;
   ctx.setLineDash(label === "X" ? [6, 4] : []); ctx.stroke(); ctx.setLineDash([]);
   ctx.beginPath(); ctx.moveTo(tip[0], tip[1]);
   ctx.lineTo(tip[0] - ux * 11 + px * 5, tip[1] - uy * 11 + py * 5);
   ctx.lineTo(tip[0] - ux * 11 - px * 5, tip[1] - uy * 11 - py * 5);
   ctx.closePath(); ctx.fillStyle = color; ctx.fill();
   ctx.font = "700 12px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
   const ox = series === "A" ? -14 : 14, oy = series === "A" ? -13 : 14;
   const lx = Math.max(24, Math.min(w - 24, tip[0] + ox));
   const ly = Math.max(16, Math.min(h - 16, tip[1] + oy));
   ctx.fillText(series + "·" + label, lx, ly);
  }
 }
}
const STRINGS: Record<Lang, Record<string, string>> = {
 zh: {
  canvasXY: "先绕 X 轴后绕 Y 轴旋转后的立方体；拖动改变观察视角",
  canvasYX: "先绕 Y 轴后绕 X 轴旋转后的立方体；拖动改变观察视角",
  overlayAria: "蓝色 A 与橙色 B 的旋转坐标轴对比：Z 为实线，X 为虚线；外框仅用于辅助观察",
  compareAria: "旋转结果对比，手机端可左右滑动。A 为先 X 后 Y，B 为先 Y 后 X。",
  sliderX: "绕 X 轴角度，0 到 180 度",
  sliderY: "绕 Y 轴角度，0 到 180 度",
  cameraLeft: "向左转动观察视角",
  cameraRight: "向右转动观察视角",
  metricAria: "姿态差距：两个最终旋转矩阵之间的 Frobenius 距离，范围 0 到 2.83，0 表示姿态相同，不是角度",
  scaleAria: "姿态差距刻度：0 表示姿态相同，2.83 表示差异最大",
  matrixRx: "绕 X 轴的旋转矩阵 R_X，三行三列，实时更新",
  matrixRy: "绕 Y 轴的旋转矩阵 R_Y，三行三列，实时更新",
  matrixXY: "先 X 后 Y 的复合旋转矩阵 R_Y 乘 R_X，实时更新",
  matrixYX: "先 Y 后 X 的复合旋转矩阵 R_X 乘 R_Y，实时更新",
  predictionGroup: "预测：交换顺序结果是否相同",
  predictedSame: "已记录：你猜“会一样”。点「播放两次旋转」验证。",
  predictedDifferent: "已记录：你猜“会不同”。点「播放两次旋转」验证。"
 },
 en: {
  canvasXY: "3D cube after X then Y; drag to orbit",
  canvasYX: "3D cube after Y then X; drag to orbit",
  overlayAria: "Blue A versus orange B rotation frames: solid Z axes, dashed X axes; the cube outline is only a guide",
  compareAria: "Rotation comparison; swipe on mobile. A is X then Y, B is Y then X.",
  sliderX: "Angle around the X axis, 0 to 180 degrees",
  sliderY: "Angle around the Y axis, 0 to 180 degrees",
  cameraLeft: "Orbit the view to the left",
  cameraRight: "Orbit the view to the right",
  metricAria: "Difference: Frobenius distance between the two final rotation matrices, range 0 to 2.83, 0 means identical orientation, not an angle",
  scaleAria: "Difference scale: 0 means identical orientation, 2.83 is the maximum difference",
  matrixRx: "Rotation matrix R_X around X, three by three, updated live",
  matrixRy: "Rotation matrix R_Y around Y, three by three, updated live",
  matrixXY: "Composite rotation matrix R_Y times R_X for X then Y, updated live",
  matrixYX: "Composite rotation matrix R_X times R_Y for Y then X, updated live",
  predictionGroup: "Prediction: does swapping the order change the result?",
  predictedSame: "Recorded: you predicted “Same”. Hit “Play both rotations” to test it.",
  predictedDifferent: "Recorded: you predicted “Different”. Hit “Play both rotations” to test it."
 }
};
const PREDICTION_KEY = "jhlab-rotation-prediction";
function lang(): Lang { return document.documentElement.lang === "en" ? "en" : "zh"; }

function initialize() {
 const root = document.querySelector<HTMLElement>("#rotation-lab"); if (!root) return;
 const first = root.querySelector<HTMLCanvasElement>("#rotation-xy");
 const second = root.querySelector<HTMLCanvasElement>("#rotation-yx");
 const ax = root.querySelector<HTMLInputElement>("#angle-x"), ay = root.querySelector<HTMLInputElement>("#angle-y");
 const xval = root.querySelector<HTMLElement>("#angle-x-value"), yval = root.querySelector<HTMLElement>("#angle-y-value");
 const v1 = root.querySelector<HTMLElement>("#rotation-xy-vector"), v2 = root.querySelector<HTMLElement>("#rotation-yx-vector");
 const difference = root.querySelector<HTMLElement>("#rotation-difference");
 const note = root.querySelector<HTMLElement>("#rotation-note");
 const stageNote = root.querySelector<HTMLElement>("#rotation-step-explanation");
 const overlay = root.querySelector<HTMLCanvasElement>("#rotation-overlay");
 const overlayPanel = root.querySelector<HTMLElement>("#rotation-overlay-panel");
 const overlayToggle = root.querySelector<HTMLButtonElement>("#rotation-overlay-toggle");
 const replay = root.querySelector<HTMLButtonElement>("#rotation-replay");
 const stop = root.querySelector<HTMLButtonElement>("#rotation-stop");
 const scaleFill = root.querySelector<HTMLElement>("#rotation-difference-fill");
 const scale = root.querySelector<HTMLElement>(".metric-scale");
 const comparison = root.querySelector<HTMLElement>("#rotation-comparison");
 const cameraLeft = root.querySelector<HTMLButtonElement>("#rotation-camera-left");
 const cameraRight = root.querySelector<HTMLButtonElement>("#rotation-camera-right");
 const prediction = root.querySelector<HTMLElement>("#rotation-prediction");
 const predButtons = [...root.querySelectorAll<HTMLButtonElement>("[data-rotation-prediction]")];
 const predFeedback = root.querySelector<HTMLElement>("#rotation-prediction-feedback");
 const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
 let stage = 2;
 let generation = 0;
 let stopSegment: (() => void) | null = null;
 let playing = false;
 let currentFrame: {a: Mat3; b: Mat3} | null = null;
 if (!first || !second || !ax || !ay || !xval || !yval || !v1 || !v2 || !difference || !note) return;
 const viewButtons = [...root.querySelectorAll<HTMLButtonElement>("[data-rotation-view]")];
 const markView = (index: number) => viewButtons.forEach(button => {
  button.setAttribute("aria-pressed", String(Number(button.dataset.rotationView) === index));
 });
 viewButtons.forEach(button => button.addEventListener("click", () => {
  const index = Number(button.dataset.rotationView);
  markView(index);
  if (comparison) comparison.scrollTo({
   left: index === 0 ? 0 : comparison.scrollWidth - comparison.clientWidth,
   behavior: reduce.matches ? "instant" : "smooth"
  });
 }));
 comparison?.addEventListener("scroll", () => {
  const end = comparison.scrollWidth - comparison.clientWidth;
  if (end > 3) markView(comparison.scrollLeft / end > .5 ? 1 : 0);
 }, {passive: true});

 const matrixTables: [HTMLElement | null, string][] = [
  [root.querySelector("#matrix-rx"), "rx"], [root.querySelector("#matrix-ry"), "ry"],
  [root.querySelector("#matrix-xy"), "xy"], [root.querySelector("#matrix-yx"), "yx"]
 ];
 const matrixCells = new Map<string, HTMLElement[]>();
 for (const [table, key] of matrixTables) {
  if (!table) continue;
  const cells = [...table.querySelectorAll<HTMLElement>("td")];
  if (cells.length === 9) matrixCells.set(key, cells);
 }
 const setMatrix = (key: string, m: Mat3) => {
  const cells = matrixCells.get(key);
  if (!cells) return;
  let i = 0;
  for (const row of m) for (const value of row) cells[i++].textContent = fmt(value);
 };
 const updateNumerics = (a: Mat3, b: Mat3, x: number, y: number) => {
  v1.textContent = fmtVec(apply(a, [0, 0, 1]));
  v2.textContent = fmtVec(apply(b, [0, 0, 1]));
  const d = norm(a, b);
  difference.textContent = fmt(d);
  if (scaleFill) scaleFill.style.width = Math.min(100, d / MAX_DIFFERENCE * 100).toFixed(1) + "%";
  setMatrix("rx", rx(x)); setMatrix("ry", ry(y)); setMatrix("xy", a); setMatrix("yx", b);
 };
 const applyLabels = () => {
  const L = STRINGS[lang()];
  first.setAttribute("aria-label", L.canvasXY);
  second.setAttribute("aria-label", L.canvasYX);
  ax.setAttribute("aria-label", L.sliderX);
  ay.setAttribute("aria-label", L.sliderY);
  overlay?.setAttribute("aria-label", L.overlayAria);
  comparison?.setAttribute("aria-label", L.compareAria);
  cameraLeft?.setAttribute("aria-label", L.cameraLeft);
  cameraLeft?.setAttribute("title", L.cameraLeft);
  cameraRight?.setAttribute("aria-label", L.cameraRight);
  cameraRight?.setAttribute("title", L.cameraRight);
  difference.setAttribute("aria-label", L.metricAria);
  scale?.setAttribute("aria-label", L.scaleAria);
  root.querySelector("#matrix-rx")?.setAttribute("aria-label", L.matrixRx);
  root.querySelector("#matrix-ry")?.setAttribute("aria-label", L.matrixRy);
  root.querySelector("#matrix-xy")?.setAttribute("aria-label", L.matrixXY);
  root.querySelector("#matrix-yx")?.setAttribute("aria-label", L.matrixYX);
  prediction?.querySelector(".prediction-options")?.setAttribute("aria-label", L.predictionGroup);
  if (predFeedback && !predFeedback.hidden) {
   const choice = readPrediction();
   predFeedback.textContent = choice === "same" ? L.predictedSame : choice === "different" ? L.predictedDifferent : "";
  }
 };
 const updatePlaybackControls = () => {
  if (stop) stop.hidden = !playing;
  replay?.setAttribute("aria-disabled", String(playing));
 };
 const paint = (a: Mat3, b: Mat3) => {
  currentFrame = {a, b};
  draw(first, a); draw(second, b);
  if (overlay && !overlayPanel?.hidden) drawOverlay(overlay, a, b);
 };
 const render = () => {
  applyLabels();
  const x = Number(ax.value), y = Number(ay.value);
  xval.textContent = x + "°"; yval.textContent = y + "°";
  const a = stepMatrix(x, y, "xy", stage), b = stepMatrix(x, y, "yx", stage);
  paint(a, b);
  updateNumerics(a, b, x, y);
  root.querySelectorAll<HTMLButtonElement>("[data-rotation-step]").forEach(button => {
   button.setAttribute("aria-pressed", String(Number(button.dataset.rotationStep) === stage));
  });
  if (stageNote) stageNote.textContent = (lang() === "en"
   ? ["Start: both cubes have the same orientation.", "Step 1: left rotates around X, right around Y.", "Step 2: left adds Y, right adds X. Compare their final orientations."][stage]
   : ["起点：两个立方体姿态完全相同。", "第一步：左侧先绕 X 轴，右侧先绕 Y 轴。", "第二步：左侧再绕 Y 轴，右侧再绕 X 轴。"][stage]);
  const d = norm(a, b);
  note.textContent = stage === 0
   ? (lang() === "en" ? "Both paths start from the same pose. Continue to the first rotation." : "两条路径从相同姿态出发。点击「第一次旋转」继续。")
   : stage === 1
   ? (lang() === "en" ? "The paths now differ because you performed different first operations. Continue to test whether swapping both operations changes the final result." : "目前两侧做的是不同的第一次操作。继续完成第二次旋转，才能比较交换顺序的最终结果。")
   : d < .0001
   ? (lang() === "en" ? "These settings produce the same orientation. Try two nonzero angles." : "当前角度下两种顺序结果相同。试试两个非零角度。")
   : (lang() === "en" ? "Changing the order changes the final 3D orientation. Compare the labelled faces." : "交换旋转顺序改变了最终姿态。观察立方体上不同颜色的面标记。");
 };
 // Cancel outstanding frames and pending asynchronous steps before another
 // user action changes the target. No idle animation loop is ever scheduled.
 const cancel = () => {
  generation++;
  stopSegment?.();
  stopSegment = null;
  playing = false;
  updatePlaybackControls();
 };
 // Each animation frame paints the cube *and* refreshes the numeric readouts so
 // the two can never disagree; Stop freezes the current intermediate frame.
 const animateSegment = (segment: 0 | 1, forward: boolean): Promise<boolean> => new Promise(resolve => {
  let start: number | null = null, raf = 0, finished = false;
  const finish = (ok: boolean) => {
   if (finished) return;
   finished = true;
   if (raf) cancelAnimationFrame(raf);
   stopSegment = null;
   resolve(ok);
  };
  stopSegment = () => finish(false);
  const tick = (time: number) => {
   if (finished) return;
   if (start === null) start = time;
   const progress = Math.min(1, (time - start) / 660);
   const eased = progress * progress * (3 - 2 * progress);
   const amount = forward ? eased : 1 - eased;
   const x = Number(ax.value), y = Number(ay.value);
   const a = partialStep(x, y, "xy", segment, amount), b = partialStep(x, y, "yx", segment, amount);
   paint(a, b);
   updateNumerics(a, b, x, y);
   if (progress < 1) raf = requestAnimationFrame(tick);
   else finish(true);
  };
  raf = requestAnimationFrame(tick);
 });
 const goTo = async (target: number) => {
  cancel();
  if (reduce.matches) {stage = target; render(); return;}
  const token = generation;
  while (stage !== target) {
   const forward = target > stage;
   const segment = (forward ? stage : stage - 1) as 0 | 1;
   if (!await animateSegment(segment, forward) || token !== generation) return;
   stage += forward ? 1 : -1;
   render();
  }
 };
 const play = async () => {
  dismissPrediction();
  cancel();
  stage = 0; render();
  if (reduce.matches) {stage = 2; render(); return;}
  const token = generation;
  playing = true;
  updatePlaybackControls();
  for (const segment of [0, 1] as const) {
   if (!await animateSegment(segment, true) || token !== generation) return;
   stage = segment + 1;
   render();
  }
  if (token === generation) {
   playing = false;
   updatePlaybackControls();
  }
 };
 // Stop keeps the current intermediate frame instead of snapping back.
 const interrupt = () => {cancel();};
 const readPrediction = (): string | null => {
  try { return sessionStorage.getItem(PREDICTION_KEY); } catch { return null; }
 };
 const savePrediction = (value: string) => {
  try { sessionStorage.setItem(PREDICTION_KEY, value); } catch {}
 };
 const dismissPrediction = () => {
  if (!prediction || prediction.hidden) return;
  prediction.hidden = true;
  if (!readPrediction()) savePrediction("play");
 };
 const showPrediction = (choice: string | null) => {
  if (!prediction) return;
  const answered = choice === "same" || choice === "different";
  prediction.hidden = false;
  for (const button of predButtons) button.hidden = answered;
  if (predFeedback) {
   predFeedback.hidden = !answered;
   if (answered) predFeedback.textContent = chooseFeedback(choice);
  }
 };
 const chooseFeedback = (choice: string | null): string => {
  const L = STRINGS[lang()];
  return choice === "same" ? L.predictedSame : choice === "different" ? L.predictedDifferent : "";
 };
 const initialPrediction = readPrediction();
 if (initialPrediction === "skip" || initialPrediction === "play") prediction?.setAttribute("hidden", "");
 else if (initialPrediction === "same" || initialPrediction === "different") showPrediction(initialPrediction);
 predButtons.forEach(button => button.addEventListener("click", () => {
  const choice = button.dataset.rotationPrediction || "skip";
  savePrediction(choice);
  if (choice === "skip") {if (prediction) prediction.hidden = true;}
  else showPrediction(choice);
 }));
 replay?.addEventListener("click", () => {if (!playing) void play();});
 stop?.addEventListener("click", interrupt);
 ax.addEventListener("input", () => {cancel(); render();});
 ay.addEventListener("input", () => {cancel(); render();});
 root.querySelectorAll<HTMLButtonElement>("[data-rotation-step]").forEach(button => button.addEventListener("click", () => {void goTo(Number(button.dataset.rotationStep));}));
 root.querySelectorAll<HTMLButtonElement>("[data-rotation-preset]").forEach(button => button.addEventListener("click", () => {
  cancel();
  ax.value = button.dataset.rotationPreset === "same" ? "0" : "90";
  ay.value = "90";
  stage = 2; render();
 }));
 overlayToggle?.addEventListener("click", () => {
  if (!overlayPanel) return;
  overlayPanel.hidden = !overlayPanel.hidden;
  overlayToggle.setAttribute("aria-expanded", String(!overlayPanel.hidden));
  if (!overlayPanel.hidden) applyLabels();
  if (currentFrame) paint(currentFrame.a, currentFrame.b); else render();
 });
 root.querySelector<HTMLButtonElement>("#rotation-reset")?.addEventListener("click", () => {
  cancel(); ax.value = "90"; ay.value = "90"; camera.yaw = .58; camera.pitch = -.31; stage = 2; render();
 });
 cameraLeft?.addEventListener("click", () => {camera.yaw -= .24; if (currentFrame) paint(currentFrame.a, currentFrame.b); else render();});
 cameraRight?.addEventListener("click", () => {camera.yaw += .24; if (currentFrame) paint(currentFrame.a, currentFrame.b); else render();});
 for (const canvas of [first, second]) {
  let pointer: {id: number; x: number; y: number} | null = null;
  canvas.addEventListener("pointerdown", event => {
   if (event.pointerType === "mouse" && event.button !== 0) return;
   pointer = {id: event.pointerId, x: event.clientX, y: event.clientY}; canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", event => {
   if (!pointer || event.pointerId !== pointer.id) return;
   camera.yaw += (event.clientX - pointer.x) * .009; camera.pitch = Math.max(-1.2, Math.min(1.2, camera.pitch + (event.clientY - pointer.y) * .007));
   pointer.x = event.clientX; pointer.y = event.clientY;
   if (currentFrame) paint(currentFrame.a, currentFrame.b); else render();
  });
  const end = () => {pointer = null;};
  canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
 }
 const resizer = new ResizeObserver(() => {
  if (currentFrame) paint(currentFrame.a, currentFrame.b); else render();
 });
 resizer.observe(first); resizer.observe(second);
 if (overlay) resizer.observe(overlay);
 new MutationObserver(() => {
  if (playing || stopSegment) cancel();
  render();
 }).observe(document.documentElement, {attributes: true, attributeFilter: ["lang", "data-theme"]});
 reduce.addEventListener?.("change", () => {
  if (reduce.matches) {cancel(); render();}
 });
 document.addEventListener("visibilitychange", () => {if (document.hidden) cancel();});
 updatePlaybackControls();
 render();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, {once: true}); else initialize();
export {};
