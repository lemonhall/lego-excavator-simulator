# ECN-0008: Swarm Performance Budget

## 基本信息

- **ECN 编号**：ECN-0008
- **关联 PRD**：PRD-0007
- **关联 Req ID**：新增 REQ-0007-007
- **发现阶段**：v9 M3 稳定目标场
- **日期**：2026-07-10

## 变更原因

27 个真实 LDraw `radar-truck` 全部加载后，用户实测帧率仍然很低。现有 REQ-0007-003 只锁定数量、来源和间距，REQ-0007-006 只锁定碎片回收与物理懒注册，没有定义稳态 CPU/GPU 预算，因此“27 个目标存在”不能证明目标场可玩。

## 变更内容

新增 REQ-0007-007：保留 27 个真实 LDraw 目标、巡逻、驾驶和破坏行为；完整目标的稳态帧路径不得遍历模型树；renderer DPR 上限为 1.5 且关闭 `preserveDrawingBuffer`；debug 暴露真实 rAF 帧率、帧耗时、renderer 统计、缓存命中/重建和稳态遍历计数；用户当前机器在全部目标加载后的五秒窗口达到稳定 55 FPS 或更高。

## 影响范围

- 受影响的 Req ID：REQ-0007-003、REQ-0007-006、新增 REQ-0007-007
- 受影响的 vN 计划：v9-shooter-swarm-feel
- 受影响的测试：`src/game/communityRuntime.test.ts`、`src/game/performance.test.ts`、`src/game/app.test.ts`、`tests/e2e/game.spec.ts`
- 受影响的代码文件：`src/game/communityRuntime.ts`、`src/game/performance.ts`、`src/game/app.ts`

## 处置方式

- [x] PRD 已同步更新并标注 ECN-0008
- [x] v9 计划已同步更新
- [x] 追溯矩阵已同步更新
- [x] 相关测试已按 TDD Red → Green 实施
