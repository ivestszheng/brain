<%*
const dateStr = tp.date.now("YYYYMMDD");
const newFileName = `health-${dateStr}`;
const currentPath = tp.file.folder(true);
const fullPath = `${currentPath}/${newFileName}.md`;
const existingFile = app.vault.getAbstractFileByPath(fullPath);

if (existingFile) {
    app.workspace.getLeaf(false).openFile(existingFile);
    return;
}

await tp.file.rename(newFileName);

tR += `---
title: ${newFileName}
date: ${tp.date.now("YYYY-MM-DD")}
tags:
  - health
private: true
---

`;
%>