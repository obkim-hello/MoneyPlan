# MoneyPlan - 自托管财务仪表板

**日期**: 2026-03-10
**状态**: 已批准 (更新为 MX API)

---

## 1. 项目概述

自托管的财务仪表板，通过 MX Platform API 同步数据，提供资产可视化、现金流预测、预算规划、目标管理和警报提醒功能。

---

## 2. 技术架构

### 2.1 技术栈

| 组件 | 技术 |
|------|------|
| 前端 | React + TypeScript + Vite |
| 后端 | Python FastAPI |
| 数据库 | PostgreSQL |
| 任务队列 | Celery + Redis |
| 部署 | Docker Compose |
| 金融数据 | MX Platform API |

### 2.2 系统架构图

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose                        │
├─────────────┬─────────────────────────┬─────────────────┤
│   React     │       FastAPI            │   PostgreSQL    │
│  (Nginx)    │   + Celery Worker        │                 │
├─────────────┴─────────────────────────┴─────────────────┤
│                     Redis (Celery Broker)                │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  MX Platform    │
│      API        │
└─────────────────┘
```

---

## 3. 数据模型

### 3.1 核心表结构

| 表名 | 用途 |
|------|------|
| `users` | 用户账户和认证 |
| `mx_users` | MX Platform 用户映射 |
| `mx_members` | 连接的银行账户（MX member） |
| `accounts` | 同步的账户信息 |
| `account_categories` | 账户分类（日常/一级备用金/二级备用金...） |
| `holdings` | 持仓详情（股票、基金、加密） |
| `holding_categories` | 持仓分类（流动资金/股票/基金） |
| `transactions` | 交易历史 |
| `snapshots` | 每日资产快照（历史追踪） |
| `budgets` | 预算规划 |
| `goals` | 财务目标 |
| `goal_progress` | 目标进度记录 |
| `alerts` | 警报配置和历史 |

### 3.2 账户分类 (account_categories)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| name | string | 分类名称 |
| type | enum | cash_flow / emergency_fund / investment |
| tier | int | 等级（1-3，仅备用金用） |
| color | string | 显示颜色 |
| user_id | UUID | 所属用户 |

### 3.3 持仓分类 (holdings)

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| account_id | UUID | 关联账户 |
| symbol | string | 股票/基金代码 |
| name | string | 资产名称 |
| quantity | decimal | 数量 |
| current_price | decimal | 当前价格 |
| cost_basis | decimal | 成本 |
| asset_type | enum | stock, fund, etf, crypto, cash |
| category | string | 用户自定义分类 |

---

## 4. API 设计

### 4.1 认证端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/auth/login | 用户登录 |
| POST | /api/auth/logout | 用户登出 |
| GET | /api/auth/me | 当前用户信息 |

### 4.2 账户端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/accounts | 获取所有账户 |
| GET | /api/accounts/{id} | 账户详情 |
| PUT | /api/accounts/{id}/category | 设置账户分类 |

### 4.3 资产端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/assets/summary | 资产摘要 |
| GET | /api/assets/history | 历史变化 |
| GET | /api/assets/by-category | 按分类统计 |
| GET | /api/assets/cash-flow | 现金流预测 |
| GET | /api/assets/holdings | 持仓列表 |
| PUT | /api/assets/holdings/{id}/category | 设置持仓分类 |

### 4.4 预算端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/budgets | 获取预算 |
| POST | /api/budgets | 创建预算 |
| PUT | /api/budgets/{id} | 更新预算 |
| DELETE | /api/budgets/{id} | 删除预算 |

### 4.5 目标端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/goals | 获取目标 |
| POST | /api/goals | 创建目标 |
| PUT | /api/goals/{id} | 更新目标 |
| DELETE | /api/goals/{id} | 删除目标 |
| GET | /api/goals/{id}/progress | 目标进度 |

### 4.6 警报端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/alerts | 获取警报 |
| POST | /api/alerts | 创建警报 |
| PUT | /api/alerts/{id} | 更新警报 |
| DELETE | /api/alerts/{id} | 删除警报 |

### 4.7 MX 连接端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/mx/status | MX 连接状态 |
| POST | /api/mx/connect | 创建连接会话 |
| GET | /api/mx/connect/{member_guid} | 获取连接状态 |
| DELETE | /api/mx/members/{member_guid} | 断开银行连接 |
| POST | /api/mx/sync | 同步数据 |

### 4.8 同步端点

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/sync/trigger | 手动触发同步 |
| GET | /api/sync/status | 同步状态 |

---

## 5. 前端页面

| 页面 | 路由 | 功能 |
|------|------|------|
| 登录 | /login | 用户登录 |
| 仪表板 | /dashboard | 资产总览、流动资金分布、比例饼图 |
| 账户 | /accounts | 账户管理、分类设置 |
| 持仓 | /holdings | 投资账户持仓详情、分类设置 |
| 现金流 | /cash-flow | 现金流预测（按月/按年） |
| 预算 | /budgets | 预算规划 |
| 目标 | /goals | 目标管理 |
| 历史 | /history | 历史资产变化 |
| 警报 | /alerts | 警报设置 |
| 设置 | /settings | 用户设置、MX 银行账户连接 |

---

## 6. 核心功能

### 6.1 流动资金分类

```
日常流动资金 → checking/debit 账户
一级备用金   → 活期储蓄、货币基金（立即可用）
二级备用金   → 短期理财（1-3天）
三级备用金   → 长期定存、保守型基金（紧急）
投资资金    → 股票、基金、ETF
```

### 6.2 持仓分类

每个持仓可单独设置分类：
- 流动资金（货币基金等）
- 股票
- 基金
- 加密货币

### 6.3 现金流预测

- 基于 MonarchMoney 周期性交易
- 显示未来 12 个月预期流入
- 区分工资、投资收益等来源

### 6.4 投资收益率分析

- 已实现收益
- 未实现收益（浮动盈亏）
- 时间加权收益率 (TWR)

### 6.5 警报类型

| 类型 | 触发条件 |
|------|----------|
| 资产阈值 | 总资产低于/高于某值 |
| 账户余额 | 特定账户余额低于某值 |
| 预算超支 | 预算类别超支 |
| 目标进度 | 目标进度落后于计划 |

---

## 7. 定时任务

- **同步频率**: 每天一次（可配置）
- **任务内容**: 从 MonarchMoney 同步账户、持仓、交易数据，生成资产快照

---

## 8. 部署

Docker Compose 一键部署，包含：
- frontend (React + Nginx)
- backend (FastAPI + Celery)
- postgres
- redis

---

## 9. MX API 集成

### 9.1 连接流程

1. 用户点击"连接银行账户"
2. 后端调用 MX API 创建 member
3. 返回 connect_url 让用户完成 OAuth/银行登录
4. 用户在 MX Widget 中输入银行凭据
5. MX 处理 MFA，连接成功
6. 后端轮询连接状态，完成后同步数据

### 9.2 MX 凭据

- 需要在 mx.com 注册获取 `client_id` 和 `api_key`
- 环境变量：`MX_CLIENT_ID`, `MX_API_KEY`
- Base URL: `https://int-api.mx.com` (测试) / `https://api.mx.com` (生产)
