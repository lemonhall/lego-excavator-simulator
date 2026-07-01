# PRD-0007: LEGO Shooter Swarm

## Vision

玩家应在更大的 LEGO 盒型世界里，清楚看到建筑工小人手持加特林，按住左键打出密集曳光弹幕。场景不再只有三个目标，而是默认布满可破坏 LDraw/LEGO 物件、简单追击怪物和会巡逻的车辆。目标被击毁后应先炸成砖块并保留短暂爽感，再按 TTL 从世界里回收，避免高射速和大量碎块拖垮性能。

## Requirements

### REQ-0007-001: 可见的过肩加特林

- **动机**：玩家必须一眼看出小人正在使用加特林，而不是只有子弹从身体附近冒出来。
- **范围**：重做玩家武器挂载，使 `playerGatlingGun` 在第三人称过肩视角中位于右肩/右手前方，包含 6 管枪管组、机匣、握把、弹链或电池包、枪口节点和旋转枪管组。
- **非目标**：不要求下载第三方 minigun MOC 文件；若继续使用本地 brick-built fallback，必须在 docs/debug 中明确标注为可追溯灵感而非社区模型文件。
- **验收口径**：world test 能找到 `playerGatlingGun`、`playerGatlingBarrelCluster`、`playerWeaponMuzzle`，且枪口位于玩家局部坐标前方 `z < -0.8`；E2E debug `weapon.hasGatlingGun === true` 且 `weapon.barrelCount === 6`。

### REQ-0007-002: 加特林弹幕视觉

- **动机**：M134/Minigun 的视觉特征是 6 管高速输出、密集曳光线束、轻微散布和枪口火光，不是低速水珠。
- **范围**：projectile 逻辑支持每发记录 barrel lane、spread 和 tracer 起止点；视觉用短寿命 elongated tracer/capsule 或 line streak 表现弹幕；枪口火光和火星随 firing 触发；debug 暴露 `tracerVisualCount`、`barrelLaneCount`、`projectileVisualKind`。
- **非目标**：不做真实弹道下坠、弹药、过热、后坐力曲线或逐发真实模型。
- **验收口径**：weapon unit test 验证持续 firing 后使用至少 3 个 barrel lane 且方向存在散布；app/E2E 验证 `projectileVisualKind === "tracer-streak"`，且不再使用 `sphere-bead`。

### REQ-0007-003: 默认稳定目标场

- **动机**：360x360 空场只有三个模型过于单调，但过多重型 LDraw 实例会造成卡顿。
- **范围**：启动后分批自动生成不少于 27 个可射击目标实例；当前只复用现有真实 LDraw catalog 中的 `radar-truck`，通过确定性的颜色变体增加多样性，辅以已有 farm destructibles；实例彼此拉开距离，形成前进路线。
- **非目标**：不做在线社区搜索下载、不做场景保存、不伪造未下载社区模型。
- **验收口径**：E2E debug `communityModels.instanceCount >= 27`，`communityModels.modelFormat === "ldraw"`，实例 `modelId` 全部为 `radar-truck`，`colorVariantIndex` 至少出现两个值，实例间最小距离不小于 28。

### REQ-0007-004: 社区敌人资产预留

- **动机**：射击游戏最终需要活目标，但不能用手捏占位模型冒充 LEGO 社区模型。
- **范围**：保留 enemy 纯逻辑模块和测试作为后续接入真实 LDraw/OMR 敌人资产的基础；本轮运行时不生成手捏紫色敌人。
- **非目标**：不做手捏怪物、不做复杂寻路、攻击玩家、玩家生命值、波次 UI 或敌人动画美术大改。
- **验收口径**：unit test 验证 enemy 纯逻辑可移动/受击；E2E 验证运行时没有手捏 enemy debug/视觉，默认可射击对象来自 LDraw community/farm destructibles。

### REQ-0007-005: 车辆自动巡逻

- **动机**：社区车辆既能驾驶，也应该在无人驾驶时成为动态目标/障碍。
- **范围**：默认生成的 `radar-truck` 社区实例在未被玩家驾驶且未 detached 时低速巡逻，轮子按行驶距离旋转；玩家进入驾驶后停止巡逻并交给玩家控制。
- **非目标**：不做碰撞避障 AI、交通规则或复杂路线编辑。
- **验收口径**：unit test 验证 patrol delta 会改变 vehicle 位置和 heading；E2E 验证无人驾驶车辆位置变化且 `vehicles.patrolCount >= 2`。

### REQ-0007-006: 碎片 TTL 回收

- **动机**：高射速和大量目标会产生大量碎块，必须有性能上限。
- **范围**：被击毁后的 community/farm/enemy 碎片保留 3 秒，然后隐藏或移除视觉并停止同步；debug 暴露 active/removed debris 计数；projectile 和 tracer 继续使用短 TTL/上限。
- **非目标**：不要求本轮彻底释放 Rapier 内部所有刚体；若物理引擎不支持安全 remove，本轮至少隐藏对象、停止视觉同步并记录限制。
- **验收口径**：unit/E2E 验证目标 detached 后一段时间内 visible debris 存在，超过 TTL 后 `cleanup.removedDebrisCount > 0` 且 active debris 不持续增长。

## Source Notes

- M134/Minigun 公开资料显示其为 6 管电驱机枪，常见射速约每分钟数千发。v9 采用 “multi-lane tracer streak + spread + muzzle flash” 作为游戏化表达。
- LDraw/OMR 是本项目可追溯 LEGO brick model 的优先格式。v9 不把本地临时几何体冒充社区模型；新增默认实例只复用 manifest 中已记录 sourceUrl/license/attribution 的 LDraw 模型。
