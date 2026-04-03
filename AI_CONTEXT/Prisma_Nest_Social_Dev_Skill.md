<!--
 * @Author: huashikai huashikai@huitongjt.com
 * @Date: 2026-04-03 10:54:42
 * @LastEditors: huashikai huashikai@huitongjt.com
 * @LastEditTime: 2026-04-03 10:55:15
 * @FilePath: /dhome/AI_CONTEXT/dev.md
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
-->
增量式社交功能开发规范

1. 核心任务目标 (Core Objective)
在不破坏现有功能（Backward Compatibility）的前提下，通过增量更新（Incremental Updates）的方式为「木心」项目实现新的社交业务逻辑。

2. 代码合并原则 (Code Integration Rules)
无损插入：请基于我提供的现有代码进行增量修改。严禁删除或重构任何与当前功能无关的原有逻辑、变量名或 API 接口。在 Service 层中，请新建方法来处理社交逻辑（如 createFollow, sendNotification），不要在原有的 getUser 或 getPosts 方法内直接注入大量逻辑，而是通过扩展的方式调用。

依赖保留：确保文件顶部的 import 和 constructor 中的依赖注入（如 PrismaService）完整保留，不得为了新功能而移除旧依赖。

API 稳定性：现有接口的 URL 路径、请求方式（GET/POST）及返回数据结构必须保持 1:1 兼容。

3. 数据库同步规范 (Database & Prisma)
安全字段：新增字段必须设置为可选 (?) 或提供 @default 值，确保数据库中已有的旧数据不会报错。

双 URL 兼容：在生成数据库变更建议时，必须意识到项目使用的是 Prisma 7 架构，配置需通过 prisma.config.ts 读取 DATABASE_URL 和 DIRECT_URL。

事务处理：涉及多个表更新（如：点赞+1 同时 记录通知）的操作，必须使用 this.prisma.$transaction([...]) 确保数据原子性。

4. 后端健壮性规范 (Backend Robustness)
错误隔离：新功能逻辑必须包裹在独立的 try-catch 块中。即使“发送通知”或“更新计数”失败，也不得阻塞用户的主操作流程。

权限校验：所有涉及个人数据的写操作接口（POST/PATCH/DELETE）必须强制使用 @UseGuards(AtGuard)（或现有 JWT 校验装饰器）。

异步解耦：对于非核心逻辑（如消息通知推送），优先考虑异步执行，提升主接口响应速度。

5. 前端交互规范 (Frontend UX)
状态反馈：任何提交操作必须包含 loading 状态（防止重复点击）和 Toast 成功/失败反馈。

无感刷新：社交操作（如点赞、关注）需实现前端 UI 状态同步，避免用户等待页面整页刷新。

防御式渲染：对于可能为空的字段（如 user.avatar），前端必须实现 Optional Chaining（如 user?.avatar）和默认占位图逻辑。

6. 交互响应要求 (Output Requirement)
代码输出：代码中必须包含中文注释，解释核心逻辑。

操作指引：在提供代码后，必须列出配套的部署步骤（如：1. 执行 SQL；2. generate；3. 重启 PM2）。

7. 防止代码“幻觉” (No Assumptions):

“在修改代码前，请先仔细阅读我提供的 schema.prisma 和现有 Controller。如果新功能与旧逻辑有冲突，请先向我确认，不要擅自覆盖。”