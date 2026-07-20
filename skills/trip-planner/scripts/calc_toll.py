#!/usr/bin/env python3
"""过路费估算脚本 - 估算高速公路过路费"""

import sys
import json

# 各省高速公路收费标准（元/公里，小型客车）
PROVINCE_TOLL_RATE = {
    "湖南": 0.45, "湖北": 0.50, "四川": 0.50, "重庆": 0.50,
    "贵州": 0.50, "云南": 0.50, "西藏": 0.00,  # 西藏高速免费
    "广东": 0.60, "广西": 0.50, "江西": 0.45, "浙江": 0.55,
    "江苏": 0.55, "安徽": 0.50, "河南": 0.50, "河北": 0.50,
    "山东": 0.50, "陕西": 0.50, "甘肃": 0.50, "青海": 0.50,
    "福建": 0.55, "山西": 0.50, "北京": 0.50, "上海": 0.60,
    "天津": 0.50, "辽宁": 0.50, "吉林": 0.50, "黑龙江": 0.50,
    "新疆": 0.35, "内蒙古": 0.45, "宁夏": 0.45, "海南": 0.00,  # 海南无高速费
}

# 常用路线距离参考（公里）
ROUTE_DISTANCE = {
    ("长沙", "成都"): {"highway": 1200, "national": 1400},
    ("长沙", "恩施"): {"highway": 580, "national": 650},
    ("成都", "都江堰"): {"highway": 60, "national": 65},
    ("都江堰", "四姑娘山"): {"highway": 230, "national": 250},
    ("四姑娘山", "丹巴"): {"highway": 110, "national": 120},
    ("丹巴", "雅江"): {"highway": 160, "national": 180},
    ("雅江", "稻城"): {"highway": 300, "national": 340},
    ("稻城", "康定"): {"highway": 430, "national": 480},
    ("康定", "成都"): {"highway": 280, "national": 320},
    ("成都", "重庆"): {"highway": 330, "national": 370},
    ("恩施", "重庆"): {"highway": 350, "national": 400},
    ("重庆", "长沙"): {"highway": 850, "national": 950},
    ("成都", "雅安"): {"highway": 150, "national": 160},
    ("雅安", "理塘"): {"highway": 350, "national": 400},
    ("理塘", "稻城"): {"highway": 150, "national": 170},
    ("稻城", "理塘"): {"highway": 150, "national": 170},
    ("理塘", "雅江"): {"highway": 140, "national": 160},
    ("康定", "丹巴"): {"highway": 140, "national": 160},
    ("成都", "拉萨"): {"highway": 2150, "national": 2400},
    ("昆明", "大理"): {"highway": 340, "national": 380},
    ("大理", "丽江"): {"highway": 190, "national": 210},
    ("昆明", "丽江"): {"highway": 520, "national": 580},
    ("贵阳", "桂林"): {"highway": 530, "national": 600},
    ("西安", "成都"): {"highway": 700, "national": 800},
    ("长沙", "张家界"): {"highway": 330, "national": 370},
    ("长沙", "桂林"): {"highway": 500, "national": 560},
    ("雅安", "康定"): {"highway": 180, "national": 200},
    ("康定", "新都桥"): {"highway": 80, "national": 90},
    ("新都桥", "理塘"): {"highway": 200, "national": 230},
    ("成都", "昆明"): {"highway": 850, "national": 960},
    ("贵阳", "昆明"): {"highway": 630, "national": 710},
    ("重庆", "贵阳"): {"highway": 380, "national": 430},
    ("武汉", "长沙"): {"highway": 350, "national": 400},
    ("武汉", "张家界"): {"highway": 530, "national": 600},
    ("广州", "桂林"): {"highway": 530, "national": 600},
}

# 路线经过的省份
ROUTE_PROVINCES = {
    ("长沙", "成都"): ["湖南", "贵州", "四川"],
    ("长沙", "恩施"): ["湖南", "湖北"],
    ("成都", "都江堰"): ["四川"],
    ("都江堰", "四姑娘山"): ["四川"],
    ("四姑娘山", "丹巴"): ["四川"],
    ("丹巴", "雅江"): ["四川"],
    ("雅江", "稻城"): ["四川"],
    ("稻城", "康定"): ["四川"],
    ("康定", "成都"): ["四川"],
    ("恩施", "重庆"): ["湖北", "重庆"],
    ("成都", "重庆"): ["四川", "重庆"],
    ("成都", "拉萨"): ["四川", "西藏"],
    ("昆明", "大理"): ["云南"],
    ("大理", "丽江"): ["云南"],
    ("昆明", "丽江"): ["云南"],
    ("贵阳", "桂林"): ["贵州", "广西"],
    ("西安", "成都"): ["陕西", "四川"],
    ("长沙", "张家界"): ["湖南"],
    ("长沙", "桂林"): ["湖南", "广西"],
    ("雅安", "康定"): ["四川"],
    ("康定", "新都桥"): ["四川"],
    ("新都桥", "理塘"): ["四川"],
    ("成都", "昆明"): ["四川", "云南"],
    ("贵阳", "昆明"): ["贵州", "云南"],
    ("重庆", "贵阳"): ["重庆", "贵州"],
    ("武汉", "长沙"): ["湖北", "湖南"],
    ("武汉", "张家界"): ["湖北", "湖南"],
    ("广州", "桂林"): ["广东", "广西"],
}

def calc_toll(from_city: str, to_city: str, route_type: str = "highway") -> dict:
    """估算过路费"""
    key = (from_city, to_city)
    reverse_key = (to_city, from_city)

    distance_info = ROUTE_DISTANCE.get(key) or ROUTE_DISTANCE.get(reverse_key)
    provinces = ROUTE_PROVINCES.get(key) or ROUTE_PROVINCES.get(reverse_key, ["四川"])

    if not distance_info:
        return {
            "from": from_city,
            "to": to_city,
            "error": "未找到该路线的参考数据",
            "note": "建议使用高德/百度地图查询实际过路费"
        }

    if route_type == "national":
        return {
            "from": from_city,
            "to": to_city,
            "route_type": "国道",
            "distance_km": distance_info["national"],
            "toll": 0,
            "fuel_cost": estimate_fuel(distance_info["national"]),
            "time_hours": round(distance_info["national"] / 50, 1),  # 国道平均50km/h
            "note": "国道无过路费，但耗时较长，路况可能复杂"
        }

    # 计算高速过路费
    highway_distance = distance_info["highway"]
    avg_rate = sum(PROVINCE_TOLL_RATE.get(p, 0.50) for p in provinces) / len(provinces)
    estimated_toll = round(highway_distance * avg_rate)

    # 节假日免费政策提醒
    holiday_note = ""
    holidays = ["春节", "清明", "五一", "国庆"]
    holiday_note = f"注意：春节、清明、五一、国庆期间高速免费（7座以下小客车）"

    return {
        "from": from_city,
        "to": to_city,
        "route_type": "高速",
        "distance_km": highway_distance,
        "estimated_toll": estimated_toll,
        "toll_rate": f"约 {avg_rate:.2f} 元/公里",
        "provinces": provinces,
        "fuel_cost": estimate_fuel(highway_distance),
        "time_hours": round(highway_distance / 80, 1),  # 高速平均80km/h
        "total_cost": estimated_toll + estimate_fuel(highway_distance),
        "holiday_note": holiday_note,
        "note": "过路费为估算值，实际费用以收费站为准"
    }

def estimate_fuel(distance_km: int, fuel_price: float = 7.8, consumption: float = 8.0) -> int:
    """估算油费（元）"""
    # consumption: 百公里油耗（升）
    return round(distance_km * consumption / 100 * fuel_price)

def main():
    if len(sys.argv) < 3:
        print("用法: python calc_toll.py <出发城市> <到达城市> [--route 高速|国道]")
        print("示例: python calc_toll.py 长沙 成都 --route 高速")
        sys.exit(1)

    from_city = sys.argv[1]
    to_city = sys.argv[2]
    route_type = "highway"

    if "--route" in sys.argv:
        idx = sys.argv.index("--route")
        if idx + 1 < len(sys.argv):
            route_type = "national" if sys.argv[idx + 1] == "国道" else "highway"

    result = calc_toll(from_city, to_city, route_type)
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
