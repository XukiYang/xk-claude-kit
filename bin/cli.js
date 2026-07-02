#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PKG_ROOT = path.resolve(__dirname, '..');
const MANIFEST = '.xk-claude-kit-manifest.json';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function rmrf(target) {
  if (!fs.existsSync(target)) return;
  for (const entry of fs.readdirSync(target, { withFileTypes: true })) {
    const p = path.join(target, entry.name);
    if (entry.isDirectory()) {
      rmrf(p);
    } else {
      fs.unlinkSync(p);
    }
  }
  fs.rmdirSync(target);
}

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
  const global = targets.includes('--global');
  const filtered = targets.filter(t => t !== '--global');
  const commandsDir = global
    ? path.join(process.env.HOME || process.env.USERPROFILE, '.claude', 'commands')
    : path.join(process.cwd(), '.claude', 'commands');

  // Resolve which skills to install
  let toInstall;
  if (filtered.length > 0) {
    toInstall = [];
    for (const t of filtered) {
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
    const skillDir = path.dirname(skill.path);
    const dest = path.join(commandsDir, `${skill.name}.md`);
    const scriptsSrc = path.join(skillDir, 'scripts');
    const hasScripts = fs.existsSync(scriptsSrc) && fs.statSync(scriptsSrc).isDirectory();

    // Copy scripts directory if present
    let scriptsDirName = null;
    if (hasScripts) {
      scriptsDirName = `${skill.name}-scripts`;
      const scriptsDest = path.join(commandsDir, scriptsDirName);
      copyDirSync(scriptsSrc, scriptsDest);
      console.log(`  Copied scripts: .claude/commands/${scriptsDirName}/`);
    }

    // Copy SKILL.md, rewriting script paths to .claude/commands relative paths
    let content = fs.readFileSync(skill.path, 'utf-8');
    if (hasScripts) {
      const relScriptsPath = global
        ? `~/.claude/commands/${scriptsDirName}`
        : `.claude/commands/${scriptsDirName}`;
      content = content.replace(/scripts\/search\.js/g, `${relScriptsPath}/search.js`);
      content = content.replace(/scripts\/fetch\.js/g, `${relScriptsPath}/fetch.js`);
    }
    fs.writeFileSync(dest, content, 'utf-8');

    // Update manifest
    const existing = manifest.installed.findIndex(i => i.name === skill.name);
    const entry = {
      name: skill.name,
      file: `${skill.name}.md`,
      source: skill.relPath,
      ...(hasScripts ? { scriptsDir: scriptsDirName } : {}),
    };
    if (existing >= 0) {
      manifest.installed[existing] = entry;
    } else {
      manifest.installed.push(entry);
    }
    count++;
    console.log(`  Installed: ${skill.name}`);
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\nDone. ${count} skill(s) installed to ${commandsDir}`);
  console.log('Restart Claude Code to use the new skills.');
}

function cmdUninstall(targets) {
  const global = targets.includes('--global');
  const commandsDir = global
    ? path.join(process.env.HOME || process.env.USERPROFILE, '.claude', 'commands')
    : path.join(process.cwd(), '.claude', 'commands');
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
    if (entry.scriptsDir) {
      const scriptsPath = path.join(commandsDir, entry.scriptsDir);
      if (fs.existsSync(scriptsPath)) {
        rmrf(scriptsPath);
        console.log(`  Removed scripts: ${entry.scriptsDir}`);
      }
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
    cmdUninstall(args);
    break;
  default:
    console.log(`Usage:
  xk-claude-kit list                        列出所有可用 skill
  xk-claude-kit install                     安装全部 skill 到 .claude/commands/
  xk-claude-kit install <name>              安装指定 skill
  xk-claude-kit install <name> --global     安装指定 skill 到全局 ~/.claude/commands/
  xk-claude-kit uninstall                   移除已安装的 skill
  xk-claude-kit uninstall --global          移除全局已安装的 skill`);
    break;
}
