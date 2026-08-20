#!/usr/bin/env node
/**
 * 博客同步清单生成器
 *
 * 扫描 docs/ 下标记了 `publish: true` 的文章，生成 blog-sync-manifest.json。
 * 同时进行脱敏检查，在控制台输出警告。
 *
 * 用法：node scripts/generate-blog-manifest.mjs [旧清单路径]
 * 示例：node scripts/generate-blog-manifest.mjs blog/.blog-sync-manifest.json
 */

import fs from 'fs';
import path from 'path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// --- 配置 ---

/** 白名单目录（只有这些目录下的文章允许同步到博客） */
const WHITELIST_DIRS = ['career', 'dev-notes', 'finance', 'informal-essay'];

/** 脱敏检查规则 */
const SENSITIVITY_PATTERNS = [
  { name: '内网IP地址', pattern: /\b(?:10\.\d{1,3}\.\d{1,3}\.\d{1,3}|192\.168\.\d{1,3}\.\d{1,3}|172\.(?:1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3})\b/g },
  { name: '语雀内部链接', pattern: /yuque\.com[^\s)]*/g },
  { name: '钉钉链接', pattern: /(?:dingtalk|oa\.dingtalk)[^\s)]*/gi },
  { name: '手机号码', pattern: /\b1[3-9]\d{9}\b/g },
  { name: '疑似 API Key / Token', pattern: /(?:key|token|secret|password|apikey)\s*[:=]\s*['"]?[A-Za-z0-9_\-]{20,}/gi },
  { name: '身份证号', pattern: /\b\d{17}[\dXx]\b/g },
];

// --- 辅助函数 ---

/**
 * 解析 Markdown 文件的 YAML frontmatter（无依赖实现）
 * 支持：key: value、key: "value"、多行列表、布尔值
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const yaml = match[1];
  const result = {};
  let currentKey = null;

  for (const line of yaml.split(/\r?\n/)) {
    if (!line.trim()) continue;

    // 列表项：- value
    const listItem = line.match(/^\s+-\s+(.*)/);
    if (listItem && currentKey) {
      if (!Array.isArray(result[currentKey])) result[currentKey] = [];
      result[currentKey].push(listItem[1].replace(/^["']|["']$/g, ''));
      continue;
    }

    // 键值对：key: value
    const kv = line.match(/^(\w[\w-]*)\s*:\s*(.*)/);
    if (kv) {
      currentKey = kv[1];
      let val = kv[2].trim();
      // 去引号
      val = val.replace(/^["']|["']$/g, '');
      // 布尔值
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      // 空值（可能是多行列表的前缀）
      if (val === '') {
        result[currentKey] = [];
        continue;
      }
      result[currentKey] = val;
    }
  }

  return result;
}

/** 递归扫描目录下所有 .md 文件（仅扫描白名单目录） */
function scanMarkdown(dir, base = dir, isRoot = true) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // 根层级只扫描白名单目录
      if (isRoot) {
        if (!WHITELIST_DIRS.includes(entry.name)) {
          console.log(`  ⊘ 跳过非白名单目录：${entry.name}/`);
          continue;
        }
        console.log(`  📁 扫描白名单目录：${entry.name}/`);
      } else {
        // 跳过隐藏目录
        if (entry.name.startsWith('.')) continue;
      }
      results.push(...scanMarkdown(fullPath, base, false));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(fullPath);
    }
  }
  return results;
}

/** 脱敏检查：扫描内容中的敏感信息 */
function checkSensitivity(content, relativePath) {
  const warnings = [];
  for (const { name, pattern } of SENSITIVITY_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      // 去重
      const unique = [...new Set(matches)];
      warnings.push({
        file: relativePath,
        type: name,
        matches: unique.slice(0, 5), // 最多展示5个
        count: unique.length,
      });
    }
  }
  return warnings;
}

/** 提取文章中的本地图片引用 */
function extractLocalImages(content, relativePath) {
  const images = [];
  const baseDir = path.dirname(relativePath);

  // Markdown 图片语法 ![alt](path) 和 HTML <img src="path">
  const imgPatterns = [
    /!\[[^\]]*\]\(([^)]+)\)/g,
    /<img\s+[^>]*src=["']([^"']+)["'][^>]*>/gi,
  ];

  for (const pattern of imgPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const src = match[1];
      // 跳过外部链接（http/https 开头）
      if (/^https?:\/\//.test(src)) continue;
      // 跳过 data URI
      if (src.startsWith('data:')) continue;
      // 解析相对路径
      const resolved = path.normalize(path.join(baseDir, src)).replace(/\\/g, '/');
      images.push(resolved);
    }
  }

  return images;
}

// --- 主流程 ---

function main() {
  const docsDir = path.join(root, 'docs');
  if (!fs.existsSync(docsDir)) {
    console.error('✘ docs/ 目录不存在');
    process.exit(1);
  }

  console.log('═══════════════════════════════════════');
  console.log('  博客同步清单生成器');
  console.log('═══════════════════════════════════════');
  console.log(`  仓库根目录：${root}`);
  console.log(`  扫描目录：  docs/`);
  console.log(`  白名单：    ${WHITELIST_DIRS.join(', ')}`);
  console.log('');

  console.log('🔍 [1/5] 扫描白名单目录...\n');
  const files = scanMarkdown(docsDir);
  console.log(`  共找到 ${files.length} 个 .md 文件\n`);

  console.log('📋 [2/5] 解析 frontmatter，筛选 publish: true...\n');

  const articles = [];
  const allWarnings = [];
  const allImages = new Set();
  let skippedNoFrontmatter = 0;
  let skippedNoPublish = 0;

  for (const filePath of files) {
    const relativePath = path.relative(root, filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf-8');
    const fm = parseFrontmatter(content);

    // 没有 frontmatter
    if (!fm) {
      skippedNoFrontmatter++;
      continue;
    }

    // 未标记 publish: true
    if (fm.publish !== true) {
      skippedNoPublish++;
      continue;
    }

    console.log(`  ✓ 标记发布：${relativePath}`);
    console.log(`    title: ${fm.title || '(未设置)'}`);

    // 脱敏检查
    console.log(`    脱敏检查中...`);
    const warnings = checkSensitivity(content, relativePath);
    if (warnings.length > 0) {
      console.log(`    ⚠ 发现 ${warnings.length} 处敏感信息`);
      allWarnings.push(...warnings);
    } else {
      console.log(`    ✓ 无敏感信息`);
    }

    // 提取本地图片
    const images = extractLocalImages(content, relativePath);
    if (images.length > 0) {
      console.log(`    🖼️  发现 ${images.length} 个本地图片引用`);
      images.forEach((img) => allImages.add(img));
    }

    // 目标路径：扁平到 post/ 目录（与博客仓库 docs/post/ 结构一致）
    const target = 'post/' + path.basename(relativePath);

    // 内容哈希，用于变更追踪
    const hash = crypto.createHash('md5').update(content).digest('hex').slice(0, 12);
    console.log(`    hash: ${hash}`);

    articles.push({
      source: relativePath,
      target,
      title: fm.title || path.basename(filePath, '.md'),
      date: fm.date || null,
      description: fm.description || '',
      tags: Array.isArray(fm.tags) ? fm.tags : (fm.tags ? [fm.tags] : []),
      hash,
    });
  }

  console.log(`\n  筛选结果：`);
  console.log(`    标记发布：  ${articles.length} 篇`);
  console.log(`    无 frontmatter 跳过：${skippedNoFrontmatter} 篇`);
  console.log(`    未标记 publish 跳过：${skippedNoPublish} 篇\n`);

  const manifestPath = path.join(root, 'blog-sync-manifest.json');

  console.log('📋 [3/5] 读取旧清单做变更对比...\n');
  // 读取旧清单用于变更对比（路径通过参数传入，指向博客仓库的 .blog-sync-manifest.json）
  const oldManifestPath = process.argv[2];
  let oldArticles = [];
  if (oldManifestPath && fs.existsSync(oldManifestPath)) {
    try {
      const old = JSON.parse(fs.readFileSync(oldManifestPath, 'utf-8'));
      oldArticles = old.articles || [];
      console.log(`  ✓ 读取旧清单：${oldManifestPath}`);
      console.log(`    旧清单文章数：${oldArticles.length}`);
      console.log(`    旧清单生成时间：${old.generatedAt || '(未知)'}\n`);
    } catch {
      console.log(`  ⚠ 旧清单损坏，忽略：${oldManifestPath}\n`);
    }
  } else if (oldManifestPath) {
    console.log(`  ℹ 旧清单不存在，全部视为新增：${oldManifestPath}\n`);
  } else {
    console.log(`  ℹ 未传入旧清单路径，无变更对比\n`);
  }
  const oldMap = new Map(oldArticles.map((a) => [a.source, a]));

  // 分类：新增 / 修改 / 未变 / 移除
  const added = [];
  const modified = [];
  const unchanged = [];
  for (const a of articles) {
    const old = oldMap.get(a.source);
    if (!old) added.push(a);
    else if (old.hash !== a.hash) modified.push(a);
    else unchanged.push(a);
  }
  const newSources = new Set(articles.map((a) => a.source));
  const removed = oldArticles.filter((a) => !newSources.has(a.source));

  console.log('📝 [4/5] 写入新清单...\n');
  // 写入新清单
  const manifest = {
    generatedAt: new Date().toISOString(),
    articleCount: articles.length,
    articles,
    images: [...allImages],
  };
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(`  ✓ 已生成清单：${manifestPath}`);
  console.log(`    文章数：${articles.length}`);
  console.log(`    图片引用：${allImages.size}\n`);

  console.log('📊 [5/5] 变更摘要\n');
  console.log(`  📄 待同步文章：${articles.length} 篇\n`);

  if (added.length > 0) {
    console.log(`🆕 新增（${added.length}）：`);
    added.forEach((a) => console.log(`  + ${a.title}  [${a.source}]`));
    console.log();
  }
  if (modified.length > 0) {
    console.log(`✏️  已修改（${modified.length}）：`);
    modified.forEach((a) => console.log(`  ~ ${a.title}  [${a.source}]`));
    console.log(`    旧 hash -> 新 hash 对比：`);
    modified.forEach((a) => {
      const old = oldMap.get(a.source);
      console.log(`    ${old?.hash || '????????????'} -> ${a.hash}  ${a.title}`);
    });
    console.log();
  }
  if (unchanged.length > 0) {
    console.log(`✓ 未变化（${unchanged.length}）：`);
    unchanged.forEach((a) => console.log(`  = ${a.title}`));
    console.log();
  }
  if (removed.length > 0) {
    console.log(`🗑️  已移除（${removed.length}）：`);
    removed.forEach((a) => console.log(`  - ${a.title}  [${a.source}]`));
    console.log();
  }

  // 没有任何变更
  if (articles.length > 0 && added.length === 0 && modified.length === 0 && removed.length === 0) {
    console.log('ℹ️  无变更，所有文章均为最新。');
  }

  if (allImages.size > 0) {
    console.log(`🖼️  本地图片引用：${allImages.size} 个`);
    allImages.forEach((img) => console.log(`  • ${img}`));
    console.log();
  }

  if (allWarnings.length > 0) {
    console.log(`⚠️  脱敏警告：${allWarnings.length} 处`);
    for (const w of allWarnings) {
      console.log(`  • [${w.type}] ${w.file}`);
      w.matches.forEach((m) => console.log(`    -> ${m}`));
      if (w.count > 5) console.log(`    ...共 ${w.count} 处`);
    }
    console.log('\n⚠️  请检查以上内容，确保无敏感信息后再提交。');
  } else if (articles.length > 0) {
    console.log('✓ 脱敏检查通过，未检测到敏感信息');
  }

  // 如果没有任何文章标记为发布，给出提示
  if (articles.length === 0) {
    console.log('\n💡 提示：在文章 frontmatter 中添加 `publish: true` 即可标记为同步到博客。');
    console.log('   示例：');
    console.log('   ---');
    console.log('   title: 文章标题');
    console.log('   date: 2026-01-01');
    console.log('   publish: true');
    console.log('   ---');
  }

  console.log('\n═══════════════════════════════════════');
  console.log('  清单生成完成');
  console.log('═══════════════════════════════════════');
}

main();
