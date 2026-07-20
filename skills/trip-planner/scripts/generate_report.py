#!/usr/bin/env python3
"""HTML 行程报告生成器 - 将行程数据转为可视化 HTML 报告

支持两种输出模式：
  --name "成都稻城-20260720"  → output/成都稻城-20260720/report.html + itinerary.json
  --output report.html         → 直接输出到指定路径（向后兼容）
  无参数时 → 自动从行程标题+日期生成目录名
"""

import sys
import json
import shutil
from pathlib import Path
from datetime import datetime


def generate_report(itinerary: dict, output_dir: str = None, trip_name: str = None) -> dict:
    """生成 HTML 行程报告，返回输出文件路径信息

    Args:
        itinerary: 行程数据字典
        output_dir: 显式指定的输出目录（与 trip_name 二选一）
        trip_name: 行程名称，用于自动生成 output/<name>/ 目录

    Returns:
        {"html": "报告路径", "json": "JSON路径", "dir": "输出目录"}
    """
    template_path = Path(__file__).parent.parent / "templates" / "report.html"

    if template_path.exists():
        with open(template_path, "r", encoding="utf-8") as f:
            template = f.read()
    else:
        template = get_default_template()

    # 确定输出目录
    if output_dir:
        out = Path(output_dir)
    elif trip_name:
        out = Path("output") / trip_name
    else:
        # 自动从行程标题和日期生成
        title = itinerary.get("title", "行程")
        date = itinerary.get("date", datetime.now().strftime("%Y%m%d"))
        # 清理标题中的特殊字符，保留中文和数字
        safe_title = "".join(c for c in title if c.isalnum() or '一' <= c <= '鿿' or c in '-_')
        if not safe_title:
            safe_title = "行程"
        date_str = date.replace("-", "")[:8] if date else datetime.now().strftime("%Y%m%d")
        out = Path("output") / f"{safe_title}-{date_str}"

    out.mkdir(parents=True, exist_ok=True)

    # 填充模板
    html = template.replace("__TITLE__", itinerary.get("title", "旅行行程"))
    html = html.replace("__DATE__", itinerary.get("date", ""))
    html = html.replace("__ITINERARY_JSON__", json.dumps(itinerary, ensure_ascii=False))
    html = html.replace("__GENERATED_AT__", datetime.now().strftime("%Y-%m-%d %H:%M"))

    html_path = out / "report.html"
    json_path = out / "itinerary.json"

    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html)

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(itinerary, f, ensure_ascii=False, indent=2)

    return {"html": str(html_path), "json": str(json_path), "dir": str(out)}


def get_default_template() -> str:
    """内置备用模板（当外部模板文件缺失时使用，仅作 fallback）"""
    return """<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>__TITLE__</title></head><body>
<h1>__TITLE__</h1><p>__DATE__</p>
<pre>__ITINERARY_JSON__</pre>
<p>生成于 __GENERATED_AT__ | 模板文件缺失，请检查 templates/report.html</p>
</body></html>"""


def main():
    if len(sys.argv) < 2:
        print("用法:")
        print("  python generate_report.py --input <itinerary.json> --name <行程名称>")
        print("  python generate_report.py --input <itinerary.json> --output <report.html>")
        print("  python generate_report.py --input <itinerary.json>  # 自动生成 output/ 目录")
        sys.exit(1)

    input_path = None
    output_path = None
    trip_name = None

    for i, arg in enumerate(sys.argv):
        if arg == "--input" and i + 1 < len(sys.argv):
            input_path = sys.argv[i + 1]
        elif arg == "--output" and i + 1 < len(sys.argv):
            output_path = sys.argv[i + 1]
        elif arg == "--name" and i + 1 < len(sys.argv):
            trip_name = sys.argv[i + 1]

    if not input_path:
        print("错误: 需要指定 --input 参数")
        sys.exit(1)

    with open(input_path, "r", encoding="utf-8") as f:
        itinerary = json.load(f)

    # --output 优先（向后兼容），其次 --name，最后自动推断
    if output_path:
        # 兼容旧模式：直接输出到指定文件
        out_file = Path(output_path)
        out_file.parent.mkdir(parents=True, exist_ok=True)

        template_path = Path(__file__).parent.parent / "templates" / "report.html"
        if template_path.exists():
            with open(template_path, "r", encoding="utf-8") as f:
                template = f.read()
        else:
            template = get_default_template()

        html = template.replace("__TITLE__", itinerary.get("title", "旅行行程"))
        html = html.replace("__DATE__", itinerary.get("date", ""))
        html = html.replace("__ITINERARY_JSON__", json.dumps(itinerary, ensure_ascii=False))
        html = html.replace("__GENERATED_AT__", datetime.now().strftime("%Y-%m-%d %H:%M"))

        with open(out_file, "w", encoding="utf-8") as f:
            f.write(html)
        print(f"报告已生成: {out_file}")
    else:
        result = generate_report(itinerary, trip_name=trip_name)
        print(f"报告已生成:")
        print(f"  目录: {result['dir']}")
        print(f"  HTML: {result['html']}")
        print(f"  JSON: {result['json']}")


if __name__ == "__main__":
    main()
