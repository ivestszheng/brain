#!/usr/bin/env node
/**
 * 博客同步执行器（CI 端使用）
 *
 * 读取 blog-sync-manifest.json，将清单中的文章和图片复制到博客仓库。
 * 采用增量同步：只删除旧清单中有、新清单中没有的文章，不动其他文件。
 * 同步完成后，将新清单写入博客仓库的 .blog-sync-manifest.json 供下次对比。
 *
 * 用法：node scripts/sync-to-blog.mjs <blog-repo-dir> [vitepress-source-dir]
 * 示例：node scripts/sync-to-blog.mjs blog docs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// 解析参数
const blogDir = process.argv[2] || '../blog';
const contentDir = process.argv[3] || 'docs'; // VitePress 默认源文件目录

const targetBase = path.resolve(blogDir, contentDir);

// 博客仓库中旧清单的路径
const oldManifestPath = path.join(blogDir, '.blog-sync-manifest.json');

console.log('═══════════════════════════════════════');
console.log('  博客同步执行器');
console.log('═══════════════════════════════════════');
console.log(`  源仓库根目录：${root}`);
console.log(`  博客仓库目录：${blogDir}`);
console.log(`  VitePress 源目录：${contentDir}`);
console.log(`  同步目标路径：${targetBase}`);
console.log(`  旧清单路径：${oldManifestPath}`);
console.log('');

// 读取新清单
const manifestPath = path.join(root, 'blog-sync-manifest.json');
if (!fs.existsSync(manifestPath)) {
  console.error(`✘ 清单文件不存在：${manifestPath}`);
  console.error('  请先运行：node scripts/generate-blog-manifest.mjs');
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
console.log(`✓ 读取新清单：${manifestPath}`);
console.log(`  文章数：${manifest.articles.length}`);
console.log(`  图片引用数：${manifest.images ? manifest.images.length : 0}`);
console.log(`  清单生成时间：${manifest.generatedAt}\n`);

// 读取旧清单（用于增量删除）
console.log('📋 读取博客仓库旧清单...\n');
let oldArticles = [];
if (fs.existsSync(oldManifestPath)) {
  try {
    const old = JSON.parse(fs.readFileSync(oldManifestPath, 'utf-8'));
    oldArticles = old.articles || [];
    console.log(`  ✓ 读取旧清单：${oldManifestPath}`);
    console.log(`    旧清单文章数：${oldArticles.length}`);
    console.log(`    旧清单生成时间：${old.generatedAt || '(未知)'}\n`);
  } catch (e) {
    console.log(`  ⚠ 旧清单损坏，忽略：${e.message}\n`);
  }
} else {
  console.log(`  ℹ 旧清单不存在（首次同步），无需删除旧文件\n`);
}

// 新清单中所有文章的 target 路径集合
const newTargets = new Set((manifest.articles || []).map((a) => a.target));

// --- [1/4] 复制文章 ---
console.log('═══════════════════════════════════════');
console.log(`📦 [1/4] 复制文章（${manifest.articles.length} 篇）`);
console.log('═══════════════════════════════════════\n');

let copiedCount = 0;
let skippedCount = 0;

for (const article of manifest.articles) {
  const srcPath = path.join(root, article.source);
  const destPath = path.join(targetBase, article.target);

  console.log(`  源文件：${article.source}`);

  if (!fs.existsSync(srcPath)) {
    console.warn(`    ⚠ 源文件不存在，跳过！`);
    skippedCount++;
    continue;
  }

  // 创建目标目录
  fs.mkdirSync(path.dirname(destPath), { recursive: true });

  // 复制文件
  fs.copyFileSync(srcPath, destPath);
  console.log(`    -> ${article.target}  ✓ 已复制`);
  console.log(`    hash: ${article.hash}`);
  copiedCount++;
}

console.log(`\n  复制完成：${copiedCount} 篇成功，${skippedCount} 篇跳过\n`);

// --- [2/4] 复制图片 ---
if (manifest.images && manifest.images.length > 0) {
  console.log('═══════════════════════════════════════');
  console.log(`🖼️  [2/4] 复制本地图片（${manifest.images.length} 个）`);
  console.log('═══════════════════════════════════════\n');

  let imgCopied = 0;
  let imgSkipped = 0;

  for (const img of manifest.images) {
    const srcPath = path.join(root, img);
    console.log(`  图片：${img}`);

    if (!fs.existsSync(srcPath)) {
      console.warn(`    ⚠ 图片不存在，跳过！`);
      imgSkipped++;
      continue;
    }

    // 图片放在 public/ 目录下，保持原始相对路径
    const destPath = path.join(blogDir, 'public', img);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    console.log(`    -> ${destPath}  ✓ 已复制`);
    imgCopied++;
  }

  console.log(`\n  图片复制完成：${imgCopied} 个成功，${imgSkipped} 个跳过\n`);
} else {
  console.log('═══════════════════════════════════════');
  console.log('🖼️  [2/4] 无本地图片需要复制');
  console.log('═══════════════════════════════════════\n');
}

// --- [3/4] 增量清理 ---
console.log('═══════════════════════════════════════');
console.log('🧹 [3/4] 增量清理：删除已取消发布的旧文章');
console.log('═══════════════════════════════════════\n');

let cleaned = 0;
let notFoundCount = 0;

if (oldArticles.length === 0) {
  console.log('  无旧清单，跳过清理\n');
} else {
  console.log(`  旧清单文章数：${oldArticles.length}`);
  console.log(`  新清单文章数：${manifest.articles.length}`);
  console.log(`  需检查：${oldArticles.length} 个旧目标是否在新清单中\n`);

  for (const oldArticle of oldArticles) {
    // 旧清单中有、新清单中没有 -> 该文章已取消发布，从博客删除
    if (!newTargets.has(oldArticle.target)) {
      console.log(`  检查：${oldArticle.target}`);
      console.log(`    状态：旧清单有，新清单无 -> 需删除`);

      const oldFilePath = path.join(targetBase, oldArticle.target);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
        console.log(`    ✓ 已删除：${oldArticle.target}`);
        cleaned++;
      } else {
        console.log(`    ℹ 文件已不存在，无需删除`);
        notFoundCount++;
      }
    }
  }

  if (cleaned === 0 && notFoundCount === 0) {
    console.log('  无需清理，所有旧文章仍在新清单中');
  }
  console.log(`\n  清理完成：${cleaned} 个已删除，${notFoundCount} 个已不存在\n`);
}

// --- [4/4] 写入新清单到博客仓库 ---
console.log('═══════════════════════════════════════');
console.log('📝 [4/4] 写入新清单到博客仓库');
console.log('═══════════════════════════════════════\n');

fs.writeFileSync(oldManifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
console.log(`  ✓ 已写入：${oldManifestPath}`);
console.log(`    文章数：${manifest.articles.length}`);
console.log(`    图片数：${manifest.images ? manifest.images.length : 0}\n`);

// --- 汇总 ---
console.log('═══════════════════════════════════════');
console.log('  同步完成汇总');
console.log('═══════════════════════════════════════');
console.log(`  文章复制：${copiedCount} 篇成功，${skippedCount} 篇跳过`);
if (manifest.images && manifest.images.length > 0) {
  console.log(`  图片复制：${manifest.images.length} 个处理完成`);
}
console.log(`  增量清理：${cleaned} 篇已删除，${notFoundCount} 篇已不存在`);
console.log(`  清单更新：已写入 .blog-sync-manifest.json`);
console.log('═══════════════════════════════════════');
