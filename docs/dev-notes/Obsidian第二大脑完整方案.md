# Obsidian 第二大脑完整方案

## 一、背景

你目前在 GitHub 上维护着多个仓库：

- **brain**（私有）：Obsidian 第二大脑，集中管理所有笔记
- **ivestszheng.github.io**（公开）：基于 GitHub Pages + VitePress 搭建的个人博客

核心需求：

1. **本地统一管理**：用 Obsidian 在一个仓库里管理所有内容，享受全局搜索、双向链接等单库优势
2. **云端安全备份**：所有笔记通过 GitHub 同步，防止本地数据丢失
3. **隐私隔离**：日记、健康记录等私密内容绝不能出现在公开仓库中
4. **博客选择性发布**：通过 `publish: true` 标记控制哪些文章同步到博客，手动触发 CI 同步

核心矛盾在于：**本地想要"一个库"的无缝体验，但远程必须"一分为二"来保护隐私。**

---

## 二、方案总览

**本地单库 + 远程双仓库 + GitHub Actions 手动触发同步**

### 本地：一个 Obsidian 仓库管理所有内容

```
brain/
├── .obsidian/           # Obsidian 配置（主题、插件、快捷键）
├── .github/workflows/   # CI 工作流
├── docs/
│   ├── career/          # 职业总结（可同步）
│   ├── dev-notes/       # 开发笔记（可同步）
│   ├── diary/           # 日记（不同步）
│   ├── finance/         # 财务管理（可同步）
│   ├── health/          # 健康记录（不同步）
│   ├── informal-essay/  # 杂文（可同步）
│   ├── jottings/        # 随手记（不同步）
│   └── projects/        # 项目复盘（不同步）
├── scripts/             # 同步脚本
│   ├── generate-blog-manifest.mjs  # 清单生成器
│   └── sync-to-blog.mjs           # 同步执行器
├── templates/           # 模板
├── assets/              # 静态资源
├── .gitignore
├── AGENTS.md
└── README.md
```

### 远程：拆成两个 GitHub 仓库

| 远程仓库 | 可见性 | 内容 | 用途 |
|---|---|---|---|
| `ivestszheng/brain` | **Private** | 所有内容（完整镜像） | 多设备同步、云端备份 |
| `ivestszheng/ivestszheng.github.io` | **Public** | 仅标记 `publish: true` 的文章 | GitHub Pages 博客部署（VitePress 构建） |

### 同步链路

```
你在 Obsidian 写笔记，给文章加 publish: true
    ↓
Obsidian Git 插件自动 Commit & Push（每 10 分钟）
    ↓
GitHub 私有仓库 brain（完整备份，仅自己可见）
    ↓
手动触发 GitHub Actions（workflow_dispatch）
    ↓
CI 检出 brain + 博客仓库
    ↓
生成清单：扫描白名单目录下 publish: true 的文章
    ↓
对比博客仓库中的旧清单（.blog-sync-manifest.json）
    ↓
输出变更摘要：新增 / 已修改 / 未变化 / 已移除
    ↓
脱敏检查：扫描内网 IP、语雀链接、手机号等
    ↓
增量同步：复制文章到博客 docs/post/，删除已取消发布的旧文章
    ↓
写新清单到博客仓库，commit & push
    ↓
博客仓库触发 VitePress 构建部署（如已配置）
    ↓
博客自动更新上线
```

---

## 三、发布控制机制

### 1. Frontmatter 标记

在文章的 YAML frontmatter 中添加 `publish: true` 即可标记为同步到博客：

```yaml
---
title: Vue3 hooks 实践后的个人偏见
date: 2023-04-16
description: 着重介绍 hooks 在一个难度适中的示例中是如何使用的。
tags:
  - 技术
  - Vue.js
publish: true
---
```

- `publish: true` -> 同步到博客
- 无此字段 / `publish: false` -> 不同步

### 2. 白名单目录

只有以下目录下的文章允许同步：

| 目录 | 用途 |
|------|------|
| `docs/career/` | 职业总结、面试复盘 |
| `docs/dev-notes/` | 开发笔记、技术文章 |
| `docs/finance/` | 财务管理 |
| `docs/informal-essay/` | 杂文 |

其余目录（`diary/`、`health/`、`jottings/`、`projects/` 等）即使标记了 `publish: true` 也不会被扫描。

如需调整白名单，修改 `scripts/generate-blog-manifest.mjs` 中的 `WHITELIST_DIRS` 数组。

### 3. 增量同步

同步采用增量模式，不会全量清空博客目录：

| 情况 | 处理 |
|------|------|
| 新清单有、旧清单没有 | 复制到博客 |
| 新旧清单都有 | 覆盖复制 |
| 旧清单有、新清单没有 | 从博客删除（说明取消了 `publish: true`） |
| 两个清单都没有 | 不动（博客已有文章不受影响） |

### 4. 变更追踪

每篇文章在清单中记录内容哈希（MD5 前 12 位）。CI 生成新清单时与博客仓库中的旧清单对比，输出：

- 🆕 新增：首次标记 `publish: true`
- ✏️ 已修改：内容哈希变了
- ✓ 未变化：哈希一致
- 🗑️ 已移除：取消了 `publish: true` 或删除了文件

### 5. 脱敏检查

生成清单时自动扫描以下敏感信息并输出警告：

| 检查项 | 说明 |
|--------|------|
| 内网 IP 地址 | 10.x / 192.168.x / 172.16-31.x |
| 语雀内部链接 | yuque.com 链接 |
| 钉钉链接 | dingtalk 相关链接 |
| 手机号码 | 1[3-9] 开头的 11 位号码 |
| API Key / Token | key/token/secret 后跟长字符串 |
| 身份证号 | 18 位身份证号 |

警告仅提醒，不阻止同步。需人工确认后再提交。

---

## 四、CI 工作流

### 触发方式

在 GitHub 仓库的 **Actions** 页面手动触发（`workflow_dispatch`），不自动触发以节省 Actions 额度。

| 操作 | 说明 |
|------|------|
| `sync`（默认） | 生成清单 + 同步到博客 + 推送 |
| `generate` | 仅生成清单预览（查看变更和脱敏警告，不同步） |

### 工作流步骤

```
1. 检出 brain 仓库（文章源）
2. 检出博客仓库（同步目标 + 旧清单）
3. 生成清单（读博客旧清单做对比，输出变更摘要 + 脱敏检查）
4. [仅 sync] 增量同步：复制文章、删除已取消发布的旧文章、写新清单
5. [仅 sync] commit & push 到博客仓库
```

### 必需的 GitHub Secrets

在 brain 仓库的 **Settings -> Secrets and variables -> Actions** 中配置：

| Secret 名 | 值 | 说明 |
|-----------|-----|------|
| `BLOG_REPO` | `ivestszheng/ivestszheng.github.io` | 博客仓库全名 |
| `BLOG_REPO_TOKEN` | Fine-grained PAT | 对博客仓库有 Contents: Read and write 权限 |

### Token 生成方式

1. 打开 [GitHub Fine-grained tokens](https://github.com/settings/personal-access-tokens/new)
2. Repository access 选 **Only select repositories** -> 选 `ivestszheng.github.io`
3. Repository permissions: **Contents -> Read and write**
4. 建议设置 90 天过期
5. 复制令牌，添加到 brain 仓库的 Secrets

---

## 五、文件清单

| 文件 | 作用 |
|------|------|
| `scripts/generate-blog-manifest.mjs` | 扫描白名单目录下 `publish: true` 的文章，生成清单 + 脱敏检查 + 变更对比 |
| `scripts/sync-to-blog.mjs` | 读清单，增量复制文章到博客仓库，删除已取消的旧文章，写新清单 |
| `.github/workflows/sync-blog.yml` | CI 工作流：手动触发生成清单 + 同步到博客 |
| `.gitignore` | 忽略 `blog-sync-manifest.json`（本地临时产物） |

### 清单文件说明

| 文件 | 位置 | 是否提交 | 作用 |
|------|------|:---:|------|
| `blog-sync-manifest.json` | brain 仓库（本地） | ❌ gitignore | 本地测试时生成的临时产物 |
| `.blog-sync-manifest.json` | 博客仓库 | ✅ 提交 | CI 写入的上次同步状态，供下次对比 |

brain 仓库的 `main` 分支永远干净，不含任何同步产物，多设备同步无冲突。

---

## 六、本地测试

```bash
# 1. 给文章加 publish: true

# 2. 创建临时博客目录
New-Item -ItemType Directory -Force -Path test-blog/docs/post

# 3. 生成清单（无旧清单时全部显示为新增）
node scripts/generate-blog-manifest.mjs test-blog/.blog-sync-manifest.json

# 4. 同步
node scripts/sync-to-blog.mjs test-blog docs

# 5. 检查 test-blog/docs/post/ 下的文件

# 6. 清理
Remove-Item -Recurse -Force test-blog
```

---

## 七、方案优势总结

| 需求 | 如何解决 |
|------|----------|
| 统一管理 | 本地单库，全局搜索、双向链接、一套插件配置 |
| 安全备份 | 完整内容自动同步到 GitHub 私有仓库 |
| 隐私隔离 | 白名单目录 + `publish: true` 双重控制 |
| 选择性发布 | 每篇文章独立控制，加一行 `publish: true` 即可 |
| 增量同步 | 只动有变化的文章，不误删博客已有内容 |
| 变更追踪 | 内容哈希对比，清晰展示新增/修改/移除 |
| 脱敏检查 | 自动扫描敏感信息，人工确认后才同步 |
| 多设备同步 | main 分支无同步产物，多设备 pull/push 无冲突 |

---

## 八、注意事项

1. **仓库必须设为 Private**：brain 仓库包含日记、健康记录等私密内容
2. **Obsidian Git 不触发 git hooks**：Obsidian Git 插件使用 isomorphic-git（纯 JS 实现），不触发 pre-commit 等钩子。同步通过 CI 手动触发
3. **Actions 额度**：私有仓库每月有 2000 分钟免费额度。CI 仅手动触发，不在每次 push 时自动运行
4. **Token 轮换**：Fine-grained PAT 建议设置 90 天过期，到期后重新生成并更新 Secret
5. **首次同步**：第一次运行时博客仓库无旧清单，所有 `publish: true` 的文章显示为"新增"，不会删除博客已有文章
6. **VitePress 构建**：同步只负责推送文章到博客仓库。如果博客仓库配置了 VitePress 自动构建（如 GitHub Actions on push），则推送后会自动触发构建部署
