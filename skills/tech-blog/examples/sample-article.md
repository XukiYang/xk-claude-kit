# 一、Python 虚拟环境管理

> 本文介绍 Python 虚拟环境的配置与使用。适合需要管理多个 Python 项目的开发者。读完后能在项目中正确配置虚拟环境并管理依赖。

## 目录

- [一、Python 虚拟环境管理](#一python-虚拟环境管理)
  - [1.1 什么是虚拟环境](#11-什么是虚拟环境)
  - [1.2 创建与激活](#12-创建与激活)
    - [1.2.1 使用 venv](#121-使用-venv)
    - [1.2.2 激活环境](#122-激活环境)
  - [1.3 依赖管理](#13-依赖管理)
- [二、常见问题与最佳实践](#二常见问题与最佳实践)
  - [2.1 虚拟环境需要提交到 Git 吗](#21-虚拟环境需要提交到-git-吗)
  - [2.2 多 Python 版本共存](#22-多-python-版本共存)

---

## 1.1 什么是虚拟环境

虚拟环境是 Python 的独立运行环境，每个项目拥有自己的依赖包，互不干扰。

```python
# 全局环境安装的 requests 版本
import requests  # 2.31.0

# 虚拟环境中可以使用不同版本
import requests  # 2.28.0
```

> 虚拟环境不会复制 Python 解释器，只创建独立的包安装目录。

## 1.2 创建与激活

### 1.2.1 使用 venv

Python 3.3+ 内置 `venv` 模块，直接创建：

```bash
python -m venv .venv
```

执行后生成 `.venv` 目录：

```
.venv/
├── bin/        # Linux/macOS 可执行文件
├── Scripts/    # Windows 可执行文件
├── include/
└── lib/        # 安装的依赖包
```

### 1.2.2 激活环境

Linux / macOS：

```bash
source .venv/bin/activate
```

Windows PowerShell：

```powershell
.venv\Scripts\Activate.ps1
```

激活后命令行会显示环境名：`(.venv) $`

## 1.3 依赖管理

导出当前环境的依赖列表：

```bash
pip freeze > requirements.txt
```

在新环境中一键安装所有依赖：

```bash
pip install -r requirements.txt
```

> `requirements.txt` 是 Python 项目依赖管理的标准方式，所有协作成员通过此文件保持环境一致。

---

### 二、常见问题与最佳实践

### 2.1 虚拟环境需要提交到 Git 吗

不需要。在 `.gitignore` 中排除：

```
.venv/
venv/
```

虚拟环境可通过 `requirements.txt` 在任意机器重建，提交到版本控制只会污染仓库。

### 2.2 多 Python 版本共存

使用 `pyenv` 管理多个 Python 版本，再为每个项目创建独立虚拟环境：

```bash
# 安装指定版本
pyenv install 3.11.0

# 为项目设置本地版本
pyenv local 3.11.0

# 创建虚拟环境
python -m venv .venv
```

> `pyenv` 仅管理 Python 解释器版本，虚拟环境仍由 `venv` 创建，两者配合使用。

## 参考与来源

- [Python 官方文档 - venv](https://docs.python.org/3/library/venv.html)
- [Python Packaging User Guide](https://packaging.python.org/en/latest/guides/installing-using-pip-and-virtual-environments/)
- [pyenv 官方文档](https://github.com/pyenv/pyenv)
