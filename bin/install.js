#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const PKG_ROOT = path.resolve(__dirname, '..');
const MANIFEST = '.xk-claude-kit-manifest.json';

// Colors
const c = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  white: '\x1b[37m',
};

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

  scan(path.join(PKG_ROOT, 'skills'));
  return skills;
}

function extractDescription(content) {
  const match = content.match(/^---\s*\r?\n[\s\S]*?description:\s*(.+)\r?\n[\s\S]*?---/);
  return match ? match[1].trim() : '';
}

// ---------------------------------------------------------------------------
// Interactive UI (TTY mode - arrow keys)
// ---------------------------------------------------------------------------

class TTYSelector {
  constructor() {
    this.lineCount = 0;
  }

  close() {
    if (process.stdin.isRaw) {
      process.stdin.setRawMode(false);
    }
    process.stdin.pause();
  }

  _cleanupListener(onData) {
    process.stdin.removeListener('data', onData);
    if (process.stdin.isRaw) {
      process.stdin.setRawMode(false);
    }
  }

  _moveToStart() {
    // Move cursor up lineCount lines and clear from there
    if (this.lineCount > 0) {
      readline.moveCursor(process.stdout, 0, -this.lineCount);
      readline.clearScreenDown(process.stdout);
    }
  }

  async multiSelect(items, title) {
    const selected = new Set(items.map((_, i) => i));
    let cursor = 0;

    const render = () => {
      this._moveToStart();

      let lines = 0;
      const out = (s) => { process.stdout.write(s + '\n'); lines++; };

      out(`${c.bold}${c.cyan}${title}${c.reset}`);
      out('');

      items.forEach((item, i) => {
        const isSelected = selected.has(i);
        const isCursor = i === cursor;
        const checkbox = isSelected ? `${c.green}[x]${c.reset}` : `${c.dim}[ ]${c.reset}`;
        const name = isCursor
          ? `${c.bold}${c.white}❯ ${item.name}${c.reset}`
          : `  ${item.name}`;
        out(`  ${checkbox} ${name} ${c.dim}— ${item.description}${c.reset}`);
      });

      out('');
      out(`${c.dim}  ↑↓ 移动 | 空格 切换 | a 全选/取消 | 回车 确认${c.reset}`);

      this.lineCount = lines;
    };

    return new Promise((resolve) => {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      render();

      const onData = (key) => {
        if (key === '\x03') {
          this._cleanupListener(onData);
          this.close();
          process.exit(0);
        }

        if (key === '\x1b[A') {
          cursor = (cursor - 1 + items.length) % items.length;
        } else if (key === '\x1b[B') {
          cursor = (cursor + 1) % items.length;
        } else if (key === ' ') {
          if (selected.has(cursor)) {
            selected.delete(cursor);
          } else {
            selected.add(cursor);
          }
        } else if (key === 'a' || key === 'A') {
          if (selected.size === items.length) {
            selected.clear();
          } else {
            items.forEach((_, i) => selected.add(i));
          }
        } else if (key === '\r' || key === '\n') {
          this._cleanupListener(onData);
          resolve([...selected].map((i) => items[i]));
          return;
        }

        render();
      };

      process.stdin.on('data', onData);
    });
  }

  async singleSelect(options, title) {
    let cursor = 0;

    const render = () => {
      this._moveToStart();

      let lines = 0;
      const out = (s) => { process.stdout.write(s + '\n'); lines++; };

      out(`${c.bold}${c.cyan}${title}${c.reset}`);
      out('');

      options.forEach((opt, i) => {
        const isCursor = i === cursor;
        const radio = isCursor ? `${c.green}●${c.reset}` : `${c.dim}○${c.reset}`;
        const label = isCursor
          ? `${c.bold}${c.white}❯ ${opt.label}${c.reset}`
          : `  ${opt.label}`;
        out(`  ${radio} ${label} ${c.dim}— ${opt.description}${c.reset}`);
      });

      out('');
      out(`${c.dim}  ↑↓ 移动 | 回车 确认${c.reset}`);

      this.lineCount = lines;
    };

    return new Promise((resolve) => {
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');

      render();

      const onData = (key) => {
        if (key === '\x03') {
          this._cleanupListener(onData);
          this.close();
          process.exit(0);
        }

        if (key === '\x1b[A') {
          cursor = (cursor - 1 + options.length) % options.length;
        } else if (key === '\x1b[B') {
          cursor = (cursor + 1) % options.length;
        } else if (key === '\r' || key === '\n') {
          this._cleanupListener(onData);
          resolve(options[cursor]);
          return;
        }

        render();
      };

      process.stdin.on('data', onData);
    });
  }
}

// ---------------------------------------------------------------------------
// Fallback UI (non-TTY - text input)
// ---------------------------------------------------------------------------

class TextSelector {
  constructor() {
    this.lines = [];
    this.lineIndex = 0;
  }

  async loadInput() {
    return new Promise((resolve) => {
      let data = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (chunk) => (data += chunk));
      process.stdin.on('end', () => {
        this.lines = data.split(/\r?\n/).filter((l) => l.trim() !== '');
        resolve();
      });
    });
  }

  close() {
    // noop for text mode
  }

  readLine(prompt) {
    process.stdout.write(prompt);
    if (this.lineIndex < this.lines.length) {
      const line = this.lines[this.lineIndex++];
      console.log(line);
      return line;
    }
    return '';
  }

  async multiSelect(items, title) {
    console.log(`\n${c.bold}${c.cyan}${title}${c.reset}\n`);

    items.forEach((item, i) => {
      console.log(`  ${c.green}[${i + 1}]${c.reset} ${item.name}`);
      console.log(`      ${c.dim}${item.description}${c.reset}`);
    });

    console.log(`\n${c.dim}输入编号选择，多个用逗号分隔 (如 1,2,3)`);
    console.log(`直接回车 = 全部安装，输入 0 = 取消${c.reset}\n`);

    const answer = this.readLine(`${c.cyan}请选择: ${c.reset}`);
    const input = answer.trim();

    if (input === '0') {
      return [];
    }

    if (input === '') {
      return items;
    }

    const indices = input
      .split(/[,\s]+/)
      .map((s) => parseInt(s.trim(), 10) - 1)
      .filter((i) => i >= 0 && i < items.length);

    return indices.map((i) => items[i]);
  }

  async singleSelect(options, title) {
    console.log(`\n${c.bold}${c.cyan}${title}${c.reset}\n`);

    options.forEach((opt, i) => {
      console.log(`  ${c.green}[${i + 1}]${c.reset} ${opt.label}`);
      console.log(`      ${c.dim}${opt.description}${c.reset}`);
    });

    console.log();

    const answer = this.readLine(`${c.cyan}请选择 [1-${options.length}]: ${c.reset}`);
    const idx = parseInt(answer.trim(), 10) - 1;

    if (idx >= 0 && idx < options.length) {
      return options[idx];
    }

    return options[0];
  }
}

// ---------------------------------------------------------------------------
// Install logic
// ---------------------------------------------------------------------------

function installSkills(skills, isGlobal) {
  const commandsDir = isGlobal
    ? path.join(process.env.HOME || process.env.USERPROFILE, '.claude', 'commands')
    : path.join(process.cwd(), '.claude', 'commands');

  fs.mkdirSync(commandsDir, { recursive: true });

  const manifestPath = path.join(commandsDir, MANIFEST);
  let manifest = { installed: [] };
  if (fs.existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    } catch {
      console.log(`${c.yellow}⚠ manifest 文件损坏，将重新创建${c.reset}`);
    }
  }

  let count = 0;
  for (const skill of skills) {
    const skillDir = path.dirname(skill.path);
    const dest = path.join(commandsDir, `${skill.name}.md`);
    const scriptsSrc = path.join(skillDir, 'scripts');
    const hasScripts = fs.existsSync(scriptsSrc) && fs.statSync(scriptsSrc).isDirectory();

    let scriptsDirName = null;
    if (hasScripts) {
      scriptsDirName = `${skill.name}-scripts`;
      const scriptsDest = path.join(commandsDir, scriptsDirName);
      copyDirSync(scriptsSrc, scriptsDest);
      console.log(`  ${c.green}✔${c.reset} 复制脚本: ${c.cyan}${scriptsDirName}/${c.reset}`);
    }

    let content = fs.readFileSync(skill.path, 'utf-8');
    if (hasScripts) {
      const relScriptsPath = isGlobal
        ? `~/.claude/commands/${scriptsDirName}`
        : `.claude/commands/${scriptsDirName}`;
      content = content.replace(/scripts\/search\.js/g, `${relScriptsPath}/search.js`);
      content = content.replace(/scripts\/fetch\.js/g, `${relScriptsPath}/fetch.js`);
    }
    fs.writeFileSync(dest, content, 'utf-8');

    const existing = manifest.installed.findIndex((i) => i.name === skill.name);
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
    console.log(`  ${c.green}✔${c.reset} 安装: ${c.bold}${skill.name}${c.reset}`);
  }

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  return { count, commandsDir };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log(`
${c.bold}${c.cyan}┌─────────────────────────────────────────┐
│     xk-claude-kit  交互式安装程序        │
└─────────────────────────────────────────┘${c.reset}
`);

  const allSkills = findAllSkills();

  if (allSkills.length === 0) {
    console.log(`${c.yellow}未找到任何 skill。${c.reset}`);
    process.exit(1);
  }

  // Detect TTY and choose UI
  const isTTY = process.stdin.isTTY;
  const ui = isTTY ? new TTYSelector() : new TextSelector();

  if (!isTTY) {
    console.log(`${c.dim}(检测到非交互环境，使用文本选择模式)${c.reset}`);
    await ui.loadInput();
  }

  // Step 1: Select skills
  const selectedSkills = await ui.multiSelect(allSkills, '选择要安装的 skill:');

  if (selectedSkills.length === 0) {
    console.log(`\n${c.yellow}未选择任何 skill，退出。${c.reset}`);
    ui.close();
    process.exit(0);
  }

  // Step 2: Select install level
  const level = await ui.singleSelect(
    [
      {
        label: '项目安装',
        description: '安装到当前项目 .claude/commands/',
        value: 'project',
      },
      {
        label: '全局安装',
        description: '安装到 ~/.claude/commands/ (所有项目可用)',
        value: 'global',
      },
    ],
    '选择安装级别:'
  );

  ui.close();

  // Step 3: Install
  const isGlobal = level.value === 'global';
  const targetDesc = isGlobal ? '~/.claude/commands/' : '.claude/commands/';

  console.log(`
${c.bold}安装摘要:${c.reset}
  目标: ${c.cyan}${targetDesc}${c.reset}
  Skills: ${selectedSkills.map((s) => s.name).join(', ')}
`);

  const { count, commandsDir } = installSkills(selectedSkills, isGlobal);

  console.log(`
${c.green}${c.bold}✔ 安装完成!${c.reset}
  已安装 ${c.bold}${count}${c.reset} 个 skill 到 ${c.cyan}${commandsDir}${c.reset}

${c.dim}重启 Claude Code 后即可通过 /skill-name 使用${c.reset}
`);
}

main().catch((err) => {
  console.error(`${c.red}Error: ${err.message}${c.reset}`);
  process.exit(1);
});
