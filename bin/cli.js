#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PKG_ROOT = path.resolve(__dirname, '..');
const MANIFEST = '.xk-claude-kit-manifest.json';

// ---------------------------------------------------------------------------
// Skill discovery
// ---------------------------------------------------------------------------

function findAllSkills() {
  const skills = [];

  function scan(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(full);
      } else if (entry.name === 'SKILL.md') {
        const content = fs.readFileSync(full, 'utf-8');
        const name = path.basename(path.dirname(full));
        const desc = extractDescription(content);
        const relPath = path.relative(PKG_ROOT, full).replace(/\\/g, '/');
        skills.push({ name, description: desc, path: full, relPath });
      }
    }
  }

  scan(PKG_ROOT);
  return skills;
}

function extractDescription(content) {
  const match = content.match(/^---\s*\n[\s\S]*?description:\s*(.+)\n[\s\S]*?---/);
  return match ? match[1].trim() : '';
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function cmdList() {
  const skills = findAllSkills();
  if (skills.length === 0) {
    console.log('No skills found.');
    return;
  }
  console.log(`Available skills (${skills.length}):\n`);
  for (const s of skills) {
    console.log(`  ${s.name}`);
    console.log(`    ${s.description}`);
    console.log(`    ${s.relPath}`);
    console.log();
  }
}

function cmdInstall(targets) {
  const allSkills = findAllSkills();
  const commandsDir = path.join(process.cwd(), '.claude', 'commands');

  // Resolve which skills to install
  let toInstall;
  if (targets.length > 0) {
    toInstall = [];
    for (const t of targets) {
      const found = allSkills.find(s => s.name === t);
      if (!found) {
        console.error(`Skill not found: ${t}`);
        console.error(`Run "npx xk-claude-kit list" to see available skills.`);
        process.exit(1);
      }
      toInstall.push(found);
    }
  } else {
    toInstall = allSkills;
  }

  // Create .claude/commands if needed
  fs.mkdirSync(commandsDir, { recursive: true });

  // Load existing manifest
  const manifestPath = path.join(commandsDir, MANIFEST);
  let manifest = { installed: [] };
  if (fs.existsSync(manifestPath)) {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  }

  let count = 0;
  for (const skill of toInstall) {
    const dest = path.join(commandsDir, `${skill.name}.md`);
    fs.copyFileSync(skill.path, dest);

    // Update manifest
    const existing = manifest.installed.findIndex(i => i.name === skill.name);
    const entry = { name: skill.name, file: `${skill.name}.md`, source: skill.relPath };
    if (existing >= 0) {
      manifest.installed[existing] = entry;
    } else {
      manifest.installed.push(entry);
    }
    count++;
    console.log(`  Installed: ${skill.name}`);
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\nDone. ${count} skill(s) installed to .claude/commands/`);
  console.log('Restart Claude Code to use the new skills.');
}

function cmdUninstall() {
  const commandsDir = path.join(process.cwd(), '.claude', 'commands');
  const manifestPath = path.join(commandsDir, MANIFEST);

  if (!fs.existsSync(manifestPath)) {
    console.log('No xk-claude-kit manifest found. Nothing to uninstall.');
    return;
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  let count = 0;

  for (const entry of manifest.installed) {
    const filePath = path.join(commandsDir, entry.file);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      count++;
      console.log(`  Removed: ${entry.name}`);
    }
  }

  fs.unlinkSync(manifestPath);
  console.log(`\nDone. ${count} skill(s) removed.`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const [,, cmd, ...args] = process.argv;

switch (cmd) {
  case 'list':
    cmdList();
    break;
  case 'install':
    cmdInstall(args);
    break;
  case 'uninstall':
    cmdUninstall();
    break;
  default:
    console.log(`Usage:
  xk-claude-kit list                 列出所有可用 skill
  xk-claude-kit install              安装全部 skill 到 .claude/commands/
  xk-claude-kit install <name>       安装指定 skill
  xk-claude-kit uninstall            移除已安装的 skill`);
    break;
}
