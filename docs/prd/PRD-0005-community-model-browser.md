# PRD-0005: 社区模型浏览器

## Vision

玩家应能在游戏中打开一个右侧模型浏览器，从本地精选的砖块级 LEGO 社区格式模型包中选择模型，点击后把模型放入农场主场景，随后驾驶挖掘机撞击这些模型并看到它们像乐高积木一样断裂、散落。v7 只接受 LDraw/OMR/Studio 导出的 `.ldr` / `.mpd` 这类可分解到 `.dat` 零件引用的格式；普通 glTF/OBJ/STL 网格和项目自编 procedural sample 不能冒充社区模型。在线社区搜索、账号登录、实时下载和付费 MOC 处理留给后续版本。

## Requirements

### REQ-0005-001: 本地 LDraw 社区模型包协议 [已由 ECN-0007 变更]

- **动机**：外部社区模型来源、授权和格式各不相同，游戏运行时需要一个稳定、可审计、可测试的本地缓存协议。
- **范围**：在 `public/community-models/manifest.json` 提供模型列表；每个模型包含稳定 `id`、显示名、分类、`format: "ldraw"`、`sourceKind`、本地 `.ldr/.mpd` 文件路径、真实 `sourceUrl`、许可证、署名、推荐缩放和缩略图占位色；本地文件必须是 LDraw 文本并包含类型 1 零件引用。
- **非目标**：v7 不在浏览器里实时访问 Rebrickable、Mecabricks、LDraw 站点或任意第三方下载链接；不接受普通 mesh 格式；不接受项目自编 procedural JSON 作为社区模型。
- **验收口径**：单元测试能加载 manifest，验证至少 3 个模型、每个模型都有 `format/sourceKind/sourceUrl/license/attribution/file` 字段，且每个本地 `.ldr/.mpd` 文件包含 `0 FILE` 或顶层类型 1 零件引用以及 `.dat` 零件数据。

### REQ-0005-002: 右侧模型浏览器 Panel

- **动机**：玩家需要在不离开游戏的情况下选择要投放的模型。
- **范围**：按 `B` 打开/关闭右侧 panel；panel 显示模型卡片、分类、来源/许可证摘要和“放置”按钮；打开时不遮挡 HUD 和主画面核心区域。
- **非目标**：v7 不做搜索、分页、收藏、远程缩略图下载。
- **验收口径**：E2E 按 `B` 后能看到 `community-model-panel`，卡片数量大于等于 3，再按 `B` panel 隐藏。

### REQ-0005-003: 点击加载模型到主场景

- **动机**：模型浏览器必须产生可玩的游戏对象，而不是只展示列表。
- **范围**：点击模型卡片后，在挖掘机前方或农场空地通过 Three.js `LDrawLoader` 生成一个 LDraw LEGO assembly；生成对象有稳定 `communityModelInstanceId`、可见的 LDraw part meshes、塑料材质、阴影和 debug 计数。
- **非目标**：v7 不做鼠标拖拽摆放、旋转 gizmo、保存场景。
- **验收口径**：E2E 点击模型后，`window.__legoGameDebug.communityModels.instanceCount` 增加，场景中出现对应模型 id 的实例，且 visible part 数大于 0。

### REQ-0005-004: 社区模型可碰撞可破坏

- **动机**：玩家的核心乐趣是开挖掘机撞这些模型，模型必须进入已有 Rapier 破坏反馈链路。
- **范围**：每个加载的 LDraw part mesh 登记为 breakable assembly part；完整状态保持 authored transform，不抖动；挖掘机车身进入模型触发半径后释放零件并施加冲量；debug 显示 spawned、detached、visiblePartCount 和 brokenLinkCount。
- **非目标**：v7 不保证逐个真实 LEGO 零件级别的精确咬合力，不模拟复杂材料断裂。
- **验收口径**：E2E 加载模型后驾驶挖掘机撞击，debug 显示该实例 `status === "detached"`，Rapier `brokenLinkCount > 0`，并且连续采样的 moving part 位置发生变化。

### REQ-0005-005: 授权与来源透明

- **动机**：社区模型不能变成不可追溯的黑盒资产，后续接入真实社区下载时尤其需要留痕。
- **范围**：每个模型在 manifest 和 panel 中展示来源 URL、许可证、署名和 sourceKind；文档明确 v7 不包含第三方付费 MOC、未知授权模型、普通 mesh 模型或项目自编 procedural sample。
- **非目标**：v7 不做自动许可证合规审计，不代表第三方平台授权。
- **验收口径**：单元测试验证所有 manifest entry 都有非空 `sourceUrl/license/attribution/sourceKind`；E2E 验证 panel 中展示许可证文案。
