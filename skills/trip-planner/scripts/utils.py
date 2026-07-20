#!/usr/bin/env python3
"""共享工具模块 - 提供搜索脚本共用的功能"""

import subprocess
from pathlib import Path


def get_project_root() -> Path:
    """获取项目根目录（scripts/ 的上两级）"""
    return Path(__file__).parent.parent.parent.parent


def try_search(query: str, keyword: str) -> list:
    """尝试通过项目的 search.js 搜索实时信息

    Args:
        query: 搜索查询词（如城市名、路线名）
        keyword: 搜索关键词（如 "美食"、"路况"、"住宿"）

    Returns:
        搜索结果列表，失败或无 search.js 时返回空列表
    """
    search_script = get_project_root() / "script" / "search.js"

    if not search_script.exists():
        return []

    try:
        result = subprocess.run(
            ["node", str(search_script), query, keyword],
            capture_output=True, text=True, timeout=30,
            cwd=str(search_script.parent)
        )
        if result.stdout:
            return [{"source": "搜索引擎", "content": result.stdout[:1000]}]
    except Exception:
        pass

    return []
