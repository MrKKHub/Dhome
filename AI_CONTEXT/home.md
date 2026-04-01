<!--
 * @Author: huashikai huashikai@huitongjt.com
 * @Date: 2026-04-01 14:04:08
 * @LastEditors: huashikai huashikai@huitongjt.com
 * @LastEditTime: 2026-04-01 14:04:37
 * @FilePath: /dhome/AI_CONTEXT/home.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
## 🚀 迭代记录：Home Feed 单列治愈版 (Warm Edition)

### 1. 核心布局重构 (Layout)
- **瀑布流停用**: 将双列瀑布流重构为**单列垂直排列**，每次只专注显示一条心情。
- **卡片边距**: 单列卡片应占据主要屏幕宽度，建议 `mx-4`（左右留白 16px）。卡片间距增加至 `mb-6`（24px），给予情绪“呼吸空隙”。

### 2. 卡片视觉升级 (Card Visuals - Pro Max Warm)
- **卡片容器圆角**: 增加至 `rounded-[28px]`，极度圆润化。
- **情感化背景图 (Mood Background)**: 
  - 每条心情卡片默认不适用纯白背景。
  - **背景策略**: 根据 `moodTag` 自动加载对应的**低饱和度水彩风**背景图或微噪点纹理。
  - **示例图**: “小确幸”卡片背景若隐若现地加入淡橘色晕染插画。
- **文字层级**: 标题文本改为更温暖的深咖啡色 (`text-[#5C4B4B]`)，行高增加至 `leading-relaxed`，提升阅读时的心理舒适度。
- **交互规范**: 开启卡片整体的 `hover:scale-[1.01]` 微缩放，增加触感。

### 3. 组件关联 (Components)
- 重构页面：`src/views/Home.vue` (重写 List 布局和 PostCard 渲染逻辑)。
- UI 库: 维持 Vant List 的上拉加载功能，但卡片自定义。