# 推荐逻辑回归验证

验证时间：2026-06-28

## 1. 当前推荐规则

| 场景 | 推荐依据 | `best.reason` |
|---|---|---|
| 所有候选方案都有同一车型的手动 App 价格 | 价格最低优先 | `price_first` |
| 没有完整可比较价格 | 高德路线规划返回的预计时间最短优先 | `time_first` |
| 预计时间差小于 3 分钟 | 距离更短作为辅助判断 | `distance_tiebreaker` |

后端推荐入口：

- `server/src/services/recommendationService.ts`

路线数据来源：

- `distanceMeters` 来自高德驾车路线 `route.paths[0].distance`
- `durationSeconds` 来自高德驾车路线 `route.paths[0].duration`
- `steps` 来自高德驾车路线 `route.paths[0].steps`

## 2. 测试用例结果

| 用例 | 输入特征 | 预期 | 结果 |
|---|---|---|---|
| A | 距离短但时间长 | 不推荐距离短方案 | 通过 |
| B | 距离长但时间短 | 推荐时间短方案 | 通过 |
| C | 时间差小于 3 分钟 | 推荐距离短方案 | 通过 |
| D | 两个方案都有同车型手动价格 | 推荐价格低方案 | 通过 |
| E | 只有一个方案有价格 | 不按价格做最终推荐 | 通过 |
| F | 没有价格 | 不显示 `价格最优` / 不返回 `price_first` | 通过 |

实际执行命令：

```powershell
npm.cmd run test
npm.cmd run lint
npm.cmd run build
npm.cmd run api:smoke
```

执行结果：

| 命令 | 结果 |
|---|---|
| `npm.cmd run test` | 通过 |
| `npm.cmd run lint` | 通过 |
| `npm.cmd run build` | 通过 |
| `npm.cmd run api:smoke` | 通过 |

## 3. 修改过的文件

| 文件 | 修改内容 |
|---|---|
| `server/src/types.ts` | 将推荐原因枚举统一为 `price_first`、`time_first`、`distance_tiebreaker` |
| `server/src/services/recommendationService.ts` | 按“价格完整时价格优先，否则时间优先，3 分钟内距离辅助”排序 |
| `server/src/services/recommendationService.test.ts` | 覆盖 A-F 六类推荐场景 |
| `frontend/src/RouteDecisionApp.tsx` | 前端推荐标签同步识别 `price_first` |
| `scripts/api-smoke-v1.ts` | 增加 `best.reason` 合法值校验 |

## 4. 距离优先残留逻辑检查

代码扫描范围：

```text
server/src
frontend/src
scripts
```

检查结论：

| 检查项 | 结论 |
|---|---|
| `distanceKm` 最小即推荐 | 未发现 |
| `distanceMeters` 最小即推荐 | 未发现 |
| `distance / speed` 推算时间 | 未发现 |
| `haversine` 作为最终路线距离 | 未发现 |
| “距离最短所以推荐”页面文案 | 未发现 |

当前距离只在以下场景参与推荐：

1. 两个候选方案预计时间差小于 3 分钟；
2. 手动 App 价格相同后的辅助排序。

## 5. 前端推荐文案说明

前端候选方案推荐标签现在按 `best.reason` 显示：

| `best.reason` | 前端标签 |
|---|---|
| `price_first` | 价格最优 |
| `time_first` | 时间最优 |
| `distance_tiebreaker` | 时间接近，距离更短 |

页面说明文案：

- 无完整 App 价格时：系统按地图实时规划的预计用时优先推荐，距离只作为辅助依据。
- 时间接近时：候选方案预计用时接近，当前方案距离更短，因此优先推荐。
- 有完整同车型 App 价格时：按用户录入的 App 实际价格选择更低方案。

## 6. 滴滴整单价格能力说明

当前系统仍不支持自动获取滴滴整单多途经点价格。

原因：

- 当前 MCP 能力检测不支持 itinerary pricing；
- 系统不会把分段价格相加伪装成整单价格；
- 系统不会用距离、时间或高德路线结果生成滴滴价格。

当前价格来源只有：

1. 用户手动录入的 App 实际价格；
2. 未录入完整价格时，只做时间和距离维度的路线顺序决策。
