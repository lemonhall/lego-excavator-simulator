# ECN-0006: Rapier 物理拆毁升级

## 基本信息

- **ECN 编号**：ECN-0006
- **关联 PRD**：PRD-0004
- **关联 Req ID**：REQ-0004-004，新增 REQ-0004-005
- **发现阶段**：v5 用户验收后
- **日期**：2026-06-30

## 变更原因

v5 的拆卸反馈使用预摆碎块和固定 hash 偏移，虽然满足“可拆”和自动化断言，但用户实际验收认为效果很糟糕。问题根因是碎块没有真实重力、碰撞、冲量和落地过程，无法形成可信的乐高玩具破坏感。

## 变更内容

### 原设计

PRD-0004 的 v5 设计明确“不引入真实重力模拟”，世界层只根据 `damaged` / `detached` 改变碎块位置、旋转和可见性。

### 新设计

v6 引入 Rapier 3D 物理：

- 使用 `@dimforge/rapier3d-compat`。
- 地面使用 fixed collider。
- 挖掘机车身、履带区域和铲斗使用 kinematic collider，跟随现有 Three.js 控制，不重写挖掘机驾驶。
- 拆卸后的乐高碎块使用 dynamic rigid body，接受重力、碰撞和冲量。
- 碎块 transform 每帧从 Rapier body 同步到 Three.js mesh。
- debug 暴露 physics engine、dynamic body 数、kinematic collider 数和至少一个碎块的高度/位移，用于 E2E 验证真实物理在运行。

## 影响范围

- 受影响的 Req ID：REQ-0004-004，新增 REQ-0004-005
- 受影响的 vN 计划：v6-rapier-physics-destruction
- 受影响的测试：`src/game/physics.test.ts`、`src/game/world.test.ts`、`tests/e2e/game.spec.ts`
- 受影响的代码文件：`src/game/physics.ts`、`src/game/app.ts`、`src/game/world.ts`

## 处置方式

- [x] PRD 已同步更新（标注 ECN-0006）
- [x] v6 计划已同步更新
- [x] 追溯矩阵已同步更新
- [ ] 相关测试已同步更新

