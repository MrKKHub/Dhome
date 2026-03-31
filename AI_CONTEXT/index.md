<!--
 * @Author: huashikai huashikai@huitongjt.com
 * @Date: 2026-03-31 14:31:41
 * @LastEditors: huashikai huashikai@huitongjt.com
 * @LastEditTime: 2026-03-31 15:58:27
 * @FilePath: /dhome/README.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
Prompt:
请作为一个资深前端架构师，基于以下规范，直接生成一个可以完整编译并运行的 Vue 3 项目代码。要求代码逻辑闭环，包含 Mock 数据，无需额外配置后端。

1. 项目基础配置 (Project Setup)
包管理: pnpm (使用 pnpm-lock.yaml)

技术栈: Vue 3 (Script Setup), Vite, TypeScript, Pinia, Vue Router.

UI 框架: Vant UI 4 (开启自动按需引入).

样式: Tailwind CSS (PostCSS 插件模式).

CSS: Tailwind CSS (用于快速布局).

适配: 标准 375px 设计稿适配方案（使用 postcss-pxtorem 或 Tailwind 移动端类名）。

2. 工程目录结构 (Directory Structure)
请生成以下核心文件：

package.json: 包含所有必要依赖（vue, vant, pinia, vue-router, tailwindcss, lucide-vue-next）。

vite.config.ts: 配置 Vant 插件和路径别名。

tailwind.config.js: 基础配置。

src/main.ts: 项目入口，挂载 Pinia 和 Router。

src/router/index.ts: 包含首页(Home.vue)、详情页(Detail.vue)、发布页(Publish.vue)。

src/store/postStore.ts: 使用 Pinia 管理帖子列表、点赞、收藏状态。

src/views/Home.vue: 带有 Tab 切换（推荐、关注）的信息流页面。

src/components/PostCard.vue: 核心卡片组件，包含：头像、昵称、标题、正文、九宫格图片区、点赞/评论/收藏/分享按钮组。

3. 业务逻辑要求 (Business Logic)
Mock 数据: 在 Store 中内置至少 5 条包含不同图片数量、文字长度的帖子数据。

交互逻辑:

实现“点赞”和“收藏”的本地状态切换逻辑。

实现评论的功能
底部tab栏新增一个“我的”,用于展示个人账户信息及一些基础设置

发布页点击“发布”后，将新帖子通过 Store unshift 到列表首位。

视觉风格: UI/UX Pro Max 风格。卡片圆角 rounded-xl，背景色 bg-slate-50，卡片间距 mb-3，使用 Lucide 图标。

4. 输出格式
请按顺序给出：

package.json: 包含所有必要依赖。

pnpm-workspace.yaml (如果需要): 一般单体项目不需要，但请确保依赖安装指令是 pnpm install。

关键配置文件 (Vite, Tailwind)

核心代码实现: 包括 vite.config.ts, tailwind.config.js, main.ts 以及业务组件。

1. 核心视觉规范 (Visual Tokens)
网格系统 (Layout)：采用 4px/8px 步进系统。页面左右边距固定为 px-4 (16px)，卡片间距 mb-3 (12px)。

柔和阴影 (Elevation)：严禁使用纯黑阴影。使用类似 shadow-[0_8px_30px_rgb(0,0,0,0.04)] 的超淡环境光阴影。

圆角美学 (Radii)：容器使用 rounded-2xl (16px)，按钮使用 rounded-full，头像使用 rounded-full。

排版系统 (Typography)：

标题：text-[17px] font-semibold text-slate-900 leading-snug

正文：text-[15px] text-slate-600 leading-relaxed

辅助信息：text-[12px] text-slate-400

2. 质感与细节 (Material & Polish)
毛玻璃 (Glassmorphism)：顶部导航栏 NavBar 和底部 TabBar 必须使用 bg-white/80 backdrop-blur-md 效果，实现透光感。

边线处理 (Borders)：减少使用粗边框，改用 border-slate-100/50 或仅依靠阴影区分层级。

空状态 (Empty State)：加载或无数据时，使用轻量化的 bg-slate-100 骨架屏动画 (animate-pulse)。

3. 交互动效 (Micro-interactions)
点击反馈：所有可点击元素（卡片、按钮）必须添加 active:scale-[0.97] transition-all duration-200 的缩放反馈。

状态切换：点赞图标激活时，从 text-slate-400 平滑过渡到 text-red-500，并带有轻微的弹跳动画 (animate-bounce 简易版)。

滚动体验：列表开启 overscroll-behavior-y: contain，并确保 Tab 切换时内容区域有淡入淡出 (fade-in) 效果。

4. 配色方案 (Color Palette)
主色：#007AFF (iOS Blue) 或 #6366F1 (Indigo)。

背景：页面底色用 bg-[#F8F9FB]，卡片用 bg-white。

点缀：收藏用黄色 #FFB800，点赞用红色 #FF4D4F。
