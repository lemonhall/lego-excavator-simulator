# v7 Plan: Community Model Browser

## Goal

提供一个可审计、离线、可测试的社区模型浏览和投放流程。玩家按 `B` 打开右侧 panel，点击本地精选模型，将模型加载到农场场景中，并能驾驶挖掘机撞碎它。

## PRD Trace

- REQ-0005-001
- REQ-0005-002
- REQ-0005-003
- REQ-0005-004
- REQ-0005-005

## Scope

做：

- 新增 `public/community-models/manifest.json`，定义本地精选模型包。
- 新增 `src/game/communityModels.ts`，封装 manifest 类型、加载、校验、procedural LEGO assembly 构建和实例状态。
- 在 `app.ts` 中新增右侧模型浏览器 panel，按 `B` 开关，点击卡片生成模型。
- 社区模型实例接入现有 Rapier 物理：完整状态 authored transform 稳定，撞击后释放零件并散落。
- debug 暴露 `communityModels`，支持 E2E 验证 panel、实例、状态和物理变化。

不做：

- 不实时联网下载模型。
- 不接 Rebrickable/Mecabricks/LDraw 在线 API。
- 不处理账号、付费模型、远程缩略图、搜索、分页、收藏。
- 不做鼠标拖拽摆放或场景保存。

## Acceptance

1. `npm test -- src/game/communityModels.test.ts` exit 0，并覆盖：
   - manifest 至少 3 个模型。
   - 每个模型有 id/name/category/source/license。
   - 每个模型至少 3 个零件。
   - 模型能构建为带 `communityModelPart` 标记的 procedural LEGO group。
2. `npm run e2e -- tests/e2e/game.spec.ts --project=desktop-chrome --grep "community model browser"` exit 0，并覆盖：
   - 按 `B` 后 panel 可见。
   - panel 至少 3 张模型卡片。
   - panel 展示许可证文本。
   - 再按 `B` 后 panel 隐藏。
3. `npm run e2e -- tests/e2e/game.spec.ts --project=desktop-chrome --grep "spawned community model"` exit 0，并覆盖：
   - 点击模型后 `instanceCount` 增加。
   - `visiblePartCount > 0`。
   - 驾驶挖掘机撞击后实例 `status === "detached"`。
   - Rapier `brokenLinkCount > 0`。
   - 连续采样 moving part 位置变化。
4. `npm test`、`npm run build`、桌面 E2E、`git diff --check` exit 0。

## Files

- `public/community-models/manifest.json`
- `src/game/communityModels.ts`
- `src/game/communityModels.test.ts`
- `src/game/app.ts`
- `src/game/input.ts`
- `src/game/physics.ts`
- `src/game/physics.test.ts`
- `tests/e2e/game.spec.ts`
- `docs/prd/PRD-0005-community-model-browser.md`
- `docs/plan/v7-index.md`
- `docs/plan/v7-community-model-browser.md`

## Steps

1. 文档 Gate：提交 PRD-0005、v7-index 和 v7 计划。
2. TDD Red：新增 `communityModels.test.ts`，验证 manifest、授权字段和 assembly 构建，运行到红。
3. TDD Green：实现本地 manifest 加载、类型校验、procedural LEGO assembly 构建。
4. UI Red：新增 E2E，按 `B` 打开 panel、展示卡片和许可证，运行到红。
5. UI Green：实现右侧 panel、快捷键和点击处理。
6. Spawn Red：新增 E2E，点击模型后要求 debug instanceCount 增加，运行到红。
7. Spawn Green：把模型实例加入 Three 场景，暴露 debug。
8. Physics Red：新增 E2E，撞击生成模型后要求 detached、brokenLinkCount 和 moving sample 变化，运行到红。
9. Physics Green：注册社区模型零件为 breakable assembly parts，撞击后释放并施加冲量。
10. Review Loop：检查追溯、DoD、E2E、编码和残余风险。
11. Ship：提交并推送。

## Risks

- **授权风险**：v7 仅使用本地示例协议和来源说明，不宣称包含第三方付费模型。
- **格式风险**：v7 不直接加载任意 LDraw/Mecabricks 文件，先用项目内部 procedural LEGO manifest 作为稳定中间格式。
- **性能风险**：限制模型零件数量，生成模型按实例注册，避免一次性全场景大量 dynamic body。
- **物理稳定性风险**：完整状态不由 Rapier 写回；受撞击后才切换物理同步，沿用 v6 的 jitter 防护。
