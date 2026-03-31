<!--
 * @Author: huashikai huashikai@huitongjt.com
 * @Date: 2026-03-31 16:00:12
 * @LastEditors: huashikai huashikai@huitongjt.com
 * @LastEditTime: 2026-03-31 17:17:32
 * @FilePath: /dhome/AI_CONTEXT/login.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->

## 🔐 迭代记录：Authentication (登录与注册)

### 1. 业务逻辑规范 (Logic)
- **状态管理**: 在 `src/store/userStore.ts` 中维护 `isLoggedIn`、`userInfo` 和 `token`。
- **表单校验**: 
  - 用户名/账号校验。
  - 密码强度校验（至少 6 位，包含数字/字母）。
- **Loading 集成**: 
  - 提交按钮点击后进入 `loading` 状态（禁用重复点击）。
  - 使用全局或局部 `van-loading` 遮罩，模拟后端验证过程（800ms 延时）。
- **路由守卫**: 登录成功后自动跳转至 `redirect` 页面或首页；未登录用户访问“发布”页应拦截并跳转至登录页。

### 2. UI/UX Pro Max 设计规范 (Visuals)
- **页面布局**: 采用“大标题 + 极简表单”结构。
  - 顶部返回按钮：`backdrop-blur` 效果。
  - 欢迎语：`text-2xl font-bold text-slate-900 mb-2`。
- **输入框组件**: 
  - 移除传统边框，使用 `bg-slate-50` 作为输入框背景。
  - 聚焦时（Focus）：背景色变为白色，并带有微弱的主色调阴影 `shadow-blue-50`。
- **提交按钮**: 
  - 宽度 `w-full`，高度 `h-12`，圆角 `rounded-full`。
  - 使用主色渐变或纯色沉浸式设计。
- **交互动效**: 
  - 登录/注册切换采用 `slide-left/right` 平滑过渡。
  - 校验失败时，输入框带有轻微的红色震动提醒。

### 3. 组件关联 (Components)
- 页面：`Login.vue` (包含注册切换逻辑)。
- 影响 Store：`src/store/userStore.ts`。
- UI 依赖：Vant 4 的 `Field`, `Button`, `CellGroup`, `Toast`。