<%*
const dateStr = tp.date.now("YYYYMMDD");
const newFileName = `diary-${dateStr}`;
const currentPath = tp.file.folder(true);
const fullPath = `${currentPath}/${newFileName}.md`;
const existingFile = app.vault.getAbstractFileByPath(fullPath);

if (existingFile) {
    app.workspace.getLeaf(false).openFile(existingFile);
    return;
}

await tp.file.rename(newFileName);

tR += `---
date: ${tp.date.now("YYYY-MM-DD HH:mm:ss")}
private: true
---`;
%>
