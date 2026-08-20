# Brain - Obsidian 第二大脑

基于 Obsidian 搭建的个人知识管理系统，通过 Git 实现云端备份与多设备同步。

## 仓库结构

| 目录 | 用途 | 可同步到博客 |
|------|------|:---:|
| `docs/career/` | 职业总结 | ✅ |
| `docs/dev-notes/` | 开发笔记 | ✅ |
| `docs/finance/` | 财务管理 | ✅ |
| `docs/informal-essay/` | 杂文 | ✅ |
| `docs/diary/` | 日记 | ❌ |
| `docs/health/` | 健康记录 | ❌ |
| `docs/jottings/` | 随手记 | ❌ |
| `docs/projects/` | 项目复盘 | ❌ |
| `scripts/` | 同步脚本 | - |
| `templates/` | 模板 | - |

## 快速开始

1. 用 Obsidian 打开本文件夹作为 Vault
2. 安装社区插件 **Obsidian Git**，配置自动同步
3. 在 GitHub 创建私有仓库并关联远程：

```bash
git remote add origin https://github.com/ivestszheng/brain.git
git push -u origin main
```

## 同步方案

- **本地单库管理**：所有内容集中在 brain 仓库
- **Obsidian Git 插件**自动 Commit & Push（建议间隔 10 分钟），启动时自动 Pull
- **博客同步**：在文章 frontmatter 中加 `publish: true`，手动触发 GitHub Actions 将文章增量同步到博客仓库 `ivestszheng.github.io` 的 `docs/post/` 目录
- **白名单目录**：只有 `career/`、`dev-notes/`、`finance/`、`informal-essay/` 下的文章可同步
- **增量同步**：只动有变化的文章，不误删博客已有内容
- **变更追踪**：内容哈希对比，输出新增/修改/移除/未变化
- 详细方案见 [Obsidian第二大脑完整方案.md](docs/dev-notes/Obsidian第二大脑完整方案.md)

## 内容安全与脱敏

> 本仓库通过 GitHub Actions 将部分笔记同步到公开博客仓库，请务必注意内容脱敏。

- 不得在笔记中出现公司名称、内部项目代号、内部系统名称
- 不得包含真实域名、IP 地址、账号密码、API Key 等敏感数据
- 不得泄露公司内部业务流程、架构细节、未公开技术方案
- 日记（`diary/`）和健康记录（`health/`）不会被同步到博客，但仍应避免在其他目录中暴露个人隐私信息
- 同步脚本内置脱敏检查，自动扫描内网 IP、语雀链接、手机号等敏感信息并输出警告

## 注意事项

- 仓库必须设为 **Private**
- `.obsidian/plugins/` 已被忽略，仅保留插件列表 `community-plugins.json` 用于跨设备恢复
- `blog-sync-manifest.json` 已被忽略（本地临时产物，不提交）
- 切换设备前建议手动执行一次 commit & sync，避免冲突
