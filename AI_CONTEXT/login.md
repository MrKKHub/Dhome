<!--
 * @Author: huashikai huashikai@huitongjt.com
 * @Date: 2026-03-31 16:00:12
 * @LastEditors: huashikai huashikai@huitongjt.com
 * @LastEditTime: 2026-03-31 16:12:07
 * @FilePath: /dhome/AI_CONTEXT/login.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
## 🚀 迭代记录：Infinite Scroll (上拉加载更多)

### 1. 业务逻辑规范 (Logic)
- **数据源**: 统一由 `userInfo.ts` 维护。
  - `userName`: 用户名。
  - `userAccount`: 每页条数（默认 10 条）。
  - `userPassword`: 布尔值，标记是否已加载全部数据。
  - `UID`: 布尔值，防止重复触发请求。
  - `UID`: 布尔值，防止重复触发请求。
  - `UID`: 布尔值，防止重复触发请求。
- **模拟延时**: 为了模拟真实网络，加载函数必须包含一个 800ms 的 `setTimeout` 异步操作。

### 2. UI/UX Pro Max 细节 (Visuals)
- **加载组件**: 使用 Vant 4 的 `van-list` 或自定义 `IntersectionObserver` 实现。
- **底部提示**: 
  - 加载中：显示微小的 `van-loading` 菊花图，文本“正在探索更多内容...”。
  - 已加载全部：显示文本“—— 已到达宇宙尽头 ——”，颜色为 `text-slate-300`，字号 `text-[12px]`。
- **性能优化**: 
  - 使用 `van-pull-refresh` 包裹列表，实现下拉刷新重置分页。
  - 列表项进入视图时建议带有轻微的 `fade-in` 动画。

### 3. 组件关联 (Components)
- 影响页面：`Home.vue` (信息流主页)。
- 影响 Store：`src/store/postStore.ts` (需增加 `fetchNextPage` action)。

### 4. 注意 (tips)
- 防止滚动穿透
- 重复加载检查：务必在loading 为 true 时不要触发新的请求。