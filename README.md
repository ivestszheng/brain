# Brain - Obsidian 第二大脑

基于 Obsidian 搭建的个人知识管理系统，通过 Git 实现云端备份与多设备同步。

## 仓库结构

| 目录 | 用途 |
|------|------|
| `diary/` | 日记 |
| `health/` | 健康记录 |
| `dev-notes/` | 开发笔记 |
| `projects/` | 项目笔记 |

## 快速开始

1. 用 Obsidian 打开本文件夹作为 Vault
2. 安装社区插件 **Obsidian Git**，配置自动同步
3. 在 GitHub 创建私有仓库并关联远程：

```bash
git remote add origin https://github.com/ivestszheng/brain.git
git push -u origin main
```

## 同步方案

- 本地单库管理所有内容
- Obsidian Git 插件自动 Commit & Push（建议间隔 10 分钟）
- 启动时自动 Pull，确保多设备内容一致

## 注意事项

- 仓库必须设为 **Private**
- `.obsidian/plugins/` 已被忽略，仅保留插件列表 `community-plugins.json` 用于跨设备恢复
- 切换设备前建议手动执行一次 commit & sync，避免冲突
