export type Locale = "zh" | "en";
export type Localized = Record<Locale, string>;
export interface Project {
  id: string;
  category: Localized;
  title: Localized;
  description: Localized;
  href: string;
  action: Localized;
  extra?: { href: string; label: Localized }[];
  /** Short, verifiable facts shown under the description. */
  facts?: { zh: string; en: string }[];
  /** Honest destination label for links that leave the site. */
  external?: boolean;
}
export interface Experiment {
  id: string;
  index: string;
  title: Localized;
  subtitle: Localized;
  href: string;
  kind: "interactive" | "surface" | "canvas";
  duration: Localized;
}
export const navigation = [
  { href: "/#projects", label: { zh: "作品", en: "Works" } },
  { href: "/#mathematics", label: { zh: "数学影像", en: "Mathematics" } },
  { href: "/#gallery", label: { zh: "三维记忆", en: "Gallery" } },
  { href: "/#experiments", label: { zh: "交互几何", en: "Experiments" } },
  { href: "/brief/", label: { zh: "每日简报", en: "Daily Brief" } },
  { href: "/#contact", label: { zh: "联系", en: "Contact" } }
] satisfies {href:string;label:Localized}[];
export const experiments: Experiment[] = [
  {
    id: "rotation",
    index: "001",
    title: { zh: "两次旋转，顺序重要吗？", en: "Does rotation order matter?" },
    subtitle: { zh: "拖动 X / Y 角度，对比两种复合旋转", en: "Drag X / Y angles and compare two compositions" },
    href: "/lab/rotation/",
    kind: "interactive",
    duration: { zh: "约 3 分钟", en: "~3 min" }
  },
  {
    id: "classical",
    index: "002",
    title: { zh: "经典极小曲面", en: "Classical minimal surfaces" },
    subtitle: { zh: "悬链面、螺旋面与 Bonnet 关联族参数 t", en: "Catenoid, helicoid and the Bonnet family parameter t" },
    href: "/experiments/minimal-surfaces-classical.html",
    kind: "surface",
    duration: { zh: "可自由探索", en: "Free exploration" }
  },
  {
    id: "periodic",
    index: "003",
    title: { zh: "周期极小曲面", en: "Periodic minimal surfaces" },
    subtitle: { zh: "Gyroid、Schwarz P / D 与 Neovius", en: "Gyroid, Schwarz P / D and Neovius" },
    href: "/experiments/minimal-surfaces-periodic.html",
    kind: "surface",
    duration: { zh: "可自由探索", en: "Free exploration" }
  }
];
export const projects: Project[] = [
  {
    id:"observation",
    category:{zh:"世界观察",en:"World"},
    title:{zh:"全球资讯观察站",en:"The World, in Focus"},
    description:{zh:"每天读一点世界，追踪公共议题、人工智能与有趣的科研进展。",en:"A daily window into global affairs, AI and curious scientific discoveries."},
    href:"/brief/",action:{zh:"阅读每日简报",en:"Read the Brief"},
    facts:[
      {zh:"AI 辅助整理 · 保留原始来源",en:"AI-assisted · sources kept"},
      {zh:"按日期、刊期、话题与关键词筛选",en:"Filter by date, edition, topic and keyword"}
    ]
  },
  {
    id:"mathematics",
    category:{zh:"数学影像",en:"Mathematics"},
    title:{zh:"让抽象数学可见",en:"Making Math Visible"},
    description:{zh:"用 Manim 和影像，让数学、几何与算法中的奇妙结构动起来。",en:"Animations that bring mathematical structures, geometry and algorithms to life."},
    href:"/#mathematics-video",
    action:{zh:"站内观看数学视频",en:"Watch Videos Here"},
    extra:[{href:"https://space.bilibili.com/1572685586",label:{zh:"浏览 B 站全部投稿",en:"All videos on Bilibili"}}],
    facts:[
      {zh:"2 部站内放映 · 原生播放器",en:"2 on-site films · native player"},
      {zh:"莫比乌斯带 · 群论入门",en:"Möbius strip · group theory"}
    ]
  },
  {
    id:"gallery",
    category:{zh:"三维记忆",en:"Gallery"},
    title:{zh:"把时间留在空间里",en:"Memories in Space"},
    description:{zh:"把摄影、日常与光影收藏进可以漫游的三维空间。",en:"An explorable 3D archive of photographs, light and everyday moments."},
    href:"https://zhengyifan.win/",
    action:{zh:"进入三维相册",en:"Explore the Gallery"},
    external:true,
    facts:[
      {zh:"站外影像馆 · zhengyifan.win",en:"External gallery · zhengyifan.win"},
      {zh:"可漫游的摄影空间",en:"A walkable photographic space"}
    ]
  },
  {
    id:"experiments",
    category:{zh:"交互几何",en:"Interactive Geometry"},
    title:{zh:"让几何成为可以触碰的世界",en:"Geometry You Can Touch"},
    description:{zh:"三个可操作的数学实验：交换旋转顺序、拖动极小曲面参数、在空间里比较姿态。",en:"Three hands-on experiments: swap rotation order, drag minimal-surface parameters, compare orientations in space."},
    href:"/lab/",
    action:{zh:"进入实验目录",en:"Browse the experiments"},
    extra:[{href:"https://entropy-sandbox.pages.dev/",label:{zh:"熵与空间沙盒",en:"Entropy Sandbox"}}],
    facts:[
      {zh:"3 个实验 · 参数可拖动",en:"3 experiments · draggable parameters"},
      {zh:"矩阵与几何同步更新",en:"Matrices and geometry stay in sync"}
    ]
  }
];
export const contact = {email:"aiformath61@gmail.com",wechat:"happy-everyday2932"};
