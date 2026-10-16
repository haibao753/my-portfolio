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
}
export const navigation = [
  { href: "/#projects", label: { zh: "作品", en: "Works" } },
  { href: "/#mathematics", label: { zh: "数学影像", en: "Mathematics" } },
  { href: "/#gallery", label: { zh: "三维记忆", en: "Gallery" } },
  { href: "/#experiments", label: { zh: "交互几何", en: "Experiments" } },
  { href: "/brief/", label: { zh: "每日简报", en: "Daily Brief" } },
  { href: "/#contact", label: { zh: "联系", en: "Contact" } }
] satisfies {href:string;label:Localized}[];
export const projects: Project[] = [
  {
    id:"observation",
    category:{zh:"01 / 世界观察",en:"01 / World"},
    title:{zh:"全球资讯观察站",en:"The World, in Focus"},
    description:{zh:"每天读一点世界，追踪公共议题、人工智能与有趣的科研进展。",en:"A daily window into global affairs, AI and curious scientific discoveries."},
    href:"/brief/",action:{zh:"阅读每日简报",en:"Read the Brief"}
  },
  {
    id:"mathematics",
    category:{zh:"02 / 数学影像",en:"02 / Mathematics"},
    title:{zh:"让抽象数学可见",en:"Making Math Visible"},
    description:{zh:"用 Manim 和影像，让数学、几何与算法中的奇妙结构动起来。",en:"Animations that bring mathematical structures, geometry and algorithms to life."},
    href:"/#mathematics-video",
    action:{zh:"站内观看数学视频",en:"Watch Videos Here"},
    extra:[{href:"https://space.bilibili.com/1572685586",label:{zh:"浏览 B 站全部投稿",en:"All videos on Bilibili"}}]
  },
  {
    id:"gallery",
    category:{zh:"03 / 三维记忆",en:"03 / Gallery"},
    title:{zh:"把时间留在空间里",en:"Memories in Space"},
    description:{zh:"把摄影、日常与光影收藏进可以漫游的三维空间。",en:"An explorable 3D archive of photographs, light and everyday moments."},
    href:"https://zhengyifan.win/",
    action:{zh:"进入三维相册",en:"Explore the Gallery"}
  },
  {
    id:"experiments",
    category:{zh:"04 / 交互几何",en:"04 / Interactive Geometry"},
    title:{zh:"让几何成为可以触碰的世界",en:"Geometry You Can Touch"},
    description:{zh:"探索极小曲面与交互计算，用代码让想象变得可见。",en:"Play with minimal surfaces, geometry and interactive computing."},
    href:"/experiments/minimal-surfaces-classical.html",
    action:{zh:"探索经典极小曲面",en:"Classical Minimal Surfaces"},
    extra:[
      {href:"/experiments/minimal-surfaces-periodic.html",label:{zh:"周期极小曲面",en:"Periodic Surfaces"}},
      {href:"https://entropy-sandbox.pages.dev/",label:{zh:"熵与空间沙盒",en:"Entropy Sandbox"}}
    ]
  }
];
export const contact = {email:"aiformath61@gmail.com",wechat:"happy-everyday2932"};
