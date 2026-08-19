# Obsidian 第二大脑方案

## 一、背景

你目前在 GitHub 上维护着多个仓库：

- **mine**（私有）：个人资料与日记
- **health**（私有）：健康记录
- **ivestszheng.github.io**（公开）：基于 GitHub Pages + VitePress 搭建的个人博客

你的核心需求是：**用 Obsidian 在一个私有仓库里管理所有内容，享受全局搜索、双向链接等单库优势，同时通过 GitHub 自动备份。**

博客仓库独立维护，与 brain 仓库无关。

---

## 二、方案总览

**本地单库 + GitHub 私有仓库自动同步**

### 本地：一个 Obsidian 仓库管理所有内容

在本地创建一个 `brain` 仓库，所有笔记集中存放：

```
brain/
├── .obsidian/           # Obsidian 配置（主题、插件、快捷键）
├── diary/               # 日记
├── health/              # 健康记录
├── dev-notes/           # 开发笔记
├── projects/            # 项目笔记
└── .gitignore
```

### 远程：一个私有仓库

| 远程仓库 | 可见性 | 内容 | 用途 |
|---|---|---|---|
| `ivestszheng/brain` | **Private** | 所有内容（完整镜像） | 多设备同步、云端备份 |

### 同步链路

```
你在 Obsidian 写笔记，放在任意目录
    ↓
Obsidian Git 插件自动 Commit & Push（每 10 分钟）
    ↓
GitHub 私有仓库 brain（完整备份，仅自己可见）
```

---

## 三、配置步骤

### 1. 创建 brain 仓库

1. 在 GitHub 创建私有仓库 `ivestszheng/brain`
2. 在本地创建 `brain` 文件夹，执行 `git init` 并关联远程仓库
3. 用 Obsidian 打开该文件夹作为 Vault

### 2. 安装 Obsidian Git 插件

1. 打开 Obsidian -> 设置 -> 第三方插件 -> 关闭"安全模式"
2. 在社区插件市场搜索 **Obsidian Git**，安装并启用
3. 进入插件设置页面，配置以下关键项：

| 设置项 | 推荐值 | 说明 |
|---|---|---|
| Auto commit-and-sync interval | `10`（分钟） | 每 10 分钟自动提交并推送 |
| Auto commit-and-sync after stopping file edits | 开启 | 停止编辑后自动同步 |
| Pull on startup | 开启 | 每次打开 Obsidian 自动拉取最新内容 |
| Commit message template | `vault backup: {{date}}` | 避免无意义的 commit 堆积 |

4. 首次使用时，在插件设置中填写 **Commit Author**（你的名字和邮箱），确保提交记录正确

配置完成后，你在 Obsidian 里写的任何内容都会自动备份到 GitHub 私有仓库，完全不需要手动操作 Git 命令。

> **多设备冲突提醒**：频繁切换设备编辑时，10 分钟间隔可能产生冲突。建议切换设备前手动执行一次 commit & sync，并确保 Pull on startup 已开启。

### 3. `.gitignore` 配置

在 `brain` 仓库根目录创建 `.gitignore`：

```gitignore
# Obsidian 插件（只保留插件列表，不保留插件本体）
.obsidian/plugins/*
!.obsidian/plugins/community-plugins.json

# 系统文件
.DS_Store
Thumbs.db
```

---

## 四、注意事项

1. **`.gitignore`**：确保 `.obsidian/plugins/` 被忽略，只保留 `community-plugins.json` 用于跨设备恢复插件列表
2. **多设备冲突**：频繁切换设备编辑时，Obsidian Git 的自动提交可能产生冲突。建议切换设备前手动执行一次 commit & sync
3. **仓库私有**：brain 仓库必须设为 Private，确保所有内容仅自己可见
