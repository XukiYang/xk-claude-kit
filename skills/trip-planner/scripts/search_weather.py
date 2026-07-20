#!/usr/bin/env python3
"""天气查询脚本 - 通过搜索引擎获取天气预报信息"""

import sys
import json
import subprocess
from utils import try_search

def search_weather(city: str, date: str = None) -> dict:
    """查询指定城市的天气信息"""
    query = f"{city} 天气预报"
    if date:
        query += f" {date}"

    # 尝试用项目自带的搜索脚本
    results = []
    search_hits = try_search(city, "天气")
    results.extend(search_hits)

    # 用 curl 直接抓取天气信息
    try:
        result = subprocess.run(
            ["curl", "-sL", f"https://wttr.in/{city}?format=j1"],
            capture_output=True, text=True, timeout=15
        )
        if result.stdout:
            try:
                weather_data = json.loads(result.stdout)
                parsed = parse_wttr(weather_data, city, date)
                results.append({"source": "wttr.in", "data": parsed})
            except json.JSONDecodeError:
                results.append({"source": "wttr.in", "raw": result.stdout[:500]})
    except Exception:
        pass

    return {
        "city": city,
        "date": date,
        "results": results,
        "note": "天气信息仅供参考，出行前请查看最新预报"
    }

def parse_wttr(data: dict, city: str, date: str = None) -> dict:
    """解析 wttr.in 返回的天气数据"""
    current = data.get("current_condition", [{}])[0]
    forecast = data.get("weather", [])

    result = {
        "city": city,
        "current": {
            "temp_c": current.get("temp_C", "N/A"),
            "feels_like": current.get("FeelsLikeC", "N/A"),
            "humidity": current.get("humidity", "N/A"),
            "wind_kmph": current.get("windspeedKmph", "N/A"),
            "description": current.get("lang_zh", [{}])[0].get("value", current.get("weatherDesc", [{}])[0].get("value", "N/A"))
        },
        "forecast": []
    }

    for day in forecast[:7]:
        day_info = {
            "date": day.get("date", ""),
            "max_temp": day.get("maxtempC", "N/A"),
            "min_temp": day.get("mintempC", "N/A"),
            "avg_temp": day.get("avgtempC", "N/A"),
            "sun_hours": day.get("sunHour", "N/A"),
            "chance_of_rain": day.get("hourly", [{}])[4].get("chanceofrain", "N/A") if len(day.get("hourly", [])) > 4 else "N/A"
        }
        result["forecast"].append(day_info)

    return result

def main():
    if len(sys.argv) < 2:
        print("用法: python search_weather.py <城市> [日期]")
        print("示例: python search_weather.py 成都 2024-07-20")
        sys.exit(1)

    city = sys.argv[1]
    date = sys.argv[2] if len(sys.argv) > 2 else None

    result = search_weather(city, date)
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
