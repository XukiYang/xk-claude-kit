# 一、Python 虚拟环境管理

> 本文介绍 Python 虚拟环境的概念和使用方法。适合需要管理多个 Python 项目的开发者阅读。读完后你将能够在项目中正确配置和使用虚拟环境。

## 目录

- [一、Python 虚拟环境管理](#一python-虚拟环境管理)
  - [1.1 什么是虚拟环境](#11-什么是虚拟环境)
  - [1.2 创建虚拟环境](#12-创建虚拟环境)
    - [1.2.1 使用 venv](#121-使用-venv)
    - [1.2.2 使用 conda](#122-使用-conda)
  - [1.3 激活虚拟环境](#13-激活虚拟环境)
  - [1.4 管理依赖](#14-管理依赖)
  - [1.5 常见问题](#15-常见问题)

## 1.1 什么是虚拟环境

虚拟环境是 Python 的独立运行环境，每个项目可以拥有自己的依赖包，互不干扰。

```python
# 全局环境中的包
import requests  # 版本 2.31.0

# 虚拟环境中的包
import requests  # 版本 2.28.0（与全局版本独立）
```

> 虚拟环境不会复制 Python 解释器本身，只是创建了一个独立的包安装目录。

## 1.2 创建虚拟环境

### 1.2.1 使用 venv

Python 3.3+ 内置了 `venv` 模块：

```bash
python -m venv .venv
```

执行后会生成 `.venv` 目录，包含以下结构：

```
.venv/
├── bin/        # Linux/macOS
├── Scripts/    # Windows
├── include/
└── lib/
```

### 1.2.2 使用 conda

如果使用 Anaconda 或 Miniconda：

```bash
conda create -n myenv python=3.11
```

> conda 环境支持管理非 Python 依赖，如 C 库和 CUDA。

## 1.3 激活虚拟环境

Linux/macOS：

```bash
source .venv/bin/activate
```

Windows：

```powershell
.venv\Scripts\Activate.ps1
```

激活后，命令行提示符会显示环境名称：

```bash
(.venv) $ python --version
Python 3.11.0
```

## 1.4 管理依赖

将当前环境的包列表导出到文件：

```bash
pip freeze > requirements.txt
```

从 `requirements.txt` 安装所有依赖：

```bash
pip install -r requirements.txt
```

## 1.5 常见问题

#### Q: 如何删除虚拟环境？

直接删除虚拟环境目录即可：

```bash
rm -rf .venv        # Linux/macOS
rmdir /s /q .venv   # Windows
```

#### Q: 虚拟环境需要提交到 Git 吗？

不需要。在 `.gitignore` 中添加：

```
.venv/
venv/
```

> 虚拟环境可以通过 `requirements.txt` 在任何机器上重建，不需要提交到版本控制。

## 参考与来源

- [Python 官方文档 - venv](https://docs.python.org/3/library/venv.html)
- [Python Packaging User Guide](https://packaging.python.org/en/latest/guides/installing-using-pip-and-virtual-environments/)
