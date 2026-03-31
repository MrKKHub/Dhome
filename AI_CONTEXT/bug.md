<!--
 * @Author: huashikai huashikai@huitongjt.com
 * @Date: 2026-03-31 15:38:40
 * @LastEditors: huashikai huashikai@huitongjt.com
 * @LastEditTime: 2026-03-31 15:49:57
 * @FilePath: /dhome/AI_CONTEXT/bug.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
## 🐞 Bug 修复与代码鲁棒性规范

### 1. 诊断流程
- 在修复前必须先分析原因：是**逻辑冲突**、**异步竞态**还是**路径配置**问题？
- 优先检查 `try...catch` 异常处理和 `null/undefined` 判空。
- list中为需要修复的问题,结尾处如果标记了finish则表示已修复,可以忽略。

### 2. 修复原则 (Pro Max Quality)
- **无感修复**：修复过程不得破坏原有的 CSS 变量和 Tailwind 类名。
- **防御性编程**：在修复点赞逻辑时，需考虑防抖 (Debounce) 或节流 (Throttle)，防止用户暴力点击。
- **副作用检查**：如果修改了全局 Store，必须确认是否会影响到详情页等其他关联组件。

### 3. 验证要求
- 修复代码后，请给出一段简短的“测试建议”，告诉用户如何验证该 Bug 已被彻底解决。

list:
que1: 首页无法正常上下活动 (finish);
que2: 详情页顶部返回按钮,需要固定在头部,不受页面滑动影响 (finish);
que3: 顶部导航栏无论处在哪个tab时,都需要固定在顶部;



