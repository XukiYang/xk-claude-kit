#!/usr/bin/env python3
"""路况查询脚本 - 查询道路通行情况"""

import sys
import json
from utils import try_search

# 常见路段路况参考
ROAD_INFO = {
    ("雅安", "理塘"): {
        "route": "G318 川藏南线",
        "highlights": "二郎山隧道、折多山垭口(4298m)、高尔寺山",
        "warnings": [
            "折多山冬季可能积雪封路",
            "雨季(7-8月)注意泥石流和塌方",
            "连续弯道多，注意车速"
        ],
        "road_condition": "柏油路面为主，部分路段施工",
        "best_season": "5-6月、9-10月"
    },
    ("理塘", "稻城"): {
        "route": "S217 省道",
        "highlights": "海子山、兔儿山",
        "warnings": [
            "海拔高（4000m+），注意高反",
            "冬季路面可能结冰"
        ],
        "road_condition": "路况一般，部分路段颠簸",
        "best_season": "5-10月"
    },
    ("成都", "雅安"): {
        "route": "G5 京昆高速 / G93 成渝环线",
        "highlights": "雅安是进藏门户",
        "warnings": ["节假日可能拥堵"],
        "road_condition": "高速路况好",
        "best_season": "全年"
    },
    ("康定", "丹巴"): {
        "route": "G350 / S211",
        "highlights": "大渡河谷、牦牛谷",
        "warnings": [
            "部分路段较窄",
            "注意落石"
        ],
        "road_condition": "路况中等",
        "best_season": "4-11月"
    },
    ("恩施", "重庆"): {
        "route": "G50 沪渝高速",
        "highlights": "沿途山区风光",
        "warnings": ["隧道多，注意灯光使用"],
        "road_condition": "高速路况好",
        "best_season": "全年"
    },
    ("长沙", "恩施"): {
        "route": "G56 杭瑞高速",
        "highlights": "湘西风光",
        "warnings": ["山区高速弯道多"],
        "road_condition": "高速路况好",
        "best_season": "全年"
    },
    ("都江堰", "四姑娘山"): {
        "route": "G350 中国熊猫大道",
        "highlights": "巴朗山、猫鼻梁观景台",
        "warnings": [
            "巴朗山垭口海拔4487m，注意高反",
            "冬季可能封路",
            "弯道多，注意会车"
        ],
        "road_condition": "路况中等偏上",
        "best_season": "4-11月"
    },
    ("丹巴", "八美"): {
        "route": "G350",
        "highlights": "甲居藏寨、八美土石林",
        "warnings": ["部分路段施工"],
        "road_condition": "路况一般",
        "best_season": "4-11月"
    },
    ("八美", "新都桥"): {
        "route": "G350",
        "highlights": "塔公草原、新都桥（摄影天堂）",
        "warnings": ["注意牦牛横穿公路"],
        "road_condition": "路况较好",
        "best_season": "5-11月"
    },
    ("成都", "拉萨"): {
        "route": "G318 川藏南线（经典进藏路线）",
        "highlights": "折多山、怒江72拐、然乌湖、林芝桃花",
        "warnings": [
            "全程2100+公里，建议分7-10天完成",
            "折多山/东达山等高海拔垭口冬季积雪封路",
            "雨季(7-8月)然乌湖至波密段塌方风险高",
            "怒江72拐弯道极多，务必谨慎驾驶",
            "部分路段无手机信号"
        ],
        "road_condition": "柏油路面为主，部分路段施工或搓板路",
        "best_season": "5-6月、9-10月"
    },
    ("昆明", "大理"): {
        "route": "G56 杭瑞高速",
        "highlights": "楚雄彝族风情、苍山洱海",
        "warnings": ["节假日楚雄至大理段可能拥堵"],
        "road_condition": "高速路况好",
        "best_season": "全年"
    },
    ("贵阳", "桂林"): {
        "route": "G72 泉南高速 / G76 厦蓉高速",
        "highlights": "喀斯特地貌风光",
        "warnings": ["山区高速隧道多，注意灯光"],
        "road_condition": "高速路况好",
        "best_season": "全年"
    },
    ("西安", "成都"): {
        "route": "G5 京昆高速",
        "highlights": "秦岭穿越、汉中盆地",
        "warnings": [
            "秦岭段隧道群密集（约130个隧道）",
            "冬季秦岭段可能结冰，注意防滑"
        ],
        "road_condition": "高速路况好，隧道多",
        "best_season": "全年（冬季注意秦岭结冰）"
    },
    ("长沙", "张家界"): {
        "route": "G5513 长张高速",
        "highlights": "湘西田园风光",
        "warnings": ["山区高速弯道多"],
        "road_condition": "高速路况好",
        "best_season": "全年"
    },
    ("长沙", "桂林"): {
        "route": "G72 泉南高速",
        "highlights": "湘桂走廊风光",
        "warnings": ["全程约500km，建议中途休息"],
        "road_condition": "高速路况好",
        "best_season": "全年"
    },
    ("昆明", "丽江"): {
        "route": "G5611 大丽高速",
        "highlights": "洱海东岸、鹤庆银器",
        "warnings": ["部分路段风大"],
        "road_condition": "高速路况好",
        "best_season": "全年"
    },
    ("大理", "丽江"): {
        "route": "G5611 大丽高速",
        "highlights": "洱海东岸风光、鹤庆",
        "warnings": ["约200km，车程约2.5小时"],
        "road_condition": "高速路况好",
        "best_season": "全年"
    },
    ("雅安", "康定"): {
        "route": "G318 川藏线",
        "highlights": "二郎山隧道、泸定桥、大渡河谷",
        "warnings": [
            "二郎山隧道后海拔快速上升",
            "泸定至康定段弯道多"
        ],
        "road_condition": "路况较好，柏油路面",
        "best_season": "全年（冬季注意暗冰）"
    },
}

def search_road(from_city: str, to_city: str) -> dict:
    """查询路况信息"""
    key = (from_city, to_city)
    reverse_key = (to_city, from_city)

    road_info = ROAD_INFO.get(key) or ROAD_INFO.get(reverse_key)

    if road_info:
        result = {
            "from": from_city,
            "to": to_city,
            "route": road_info["route"],
            "highlights": road_info["highlights"],
            "warnings": road_info["warnings"],
            "road_condition": road_info["road_condition"],
            "best_season": road_info["best_season"],
            "source": "AI参考数据",
            "note": "路况信息可能有变化，出行前建议查询最新路况"
        }
    else:
        result = {
            "from": from_city,
            "to": to_city,
            "route": "建议导航软件查询最优路线",
            "warnings": ["出行前查询最新路况"],
            "source": "无参考数据",
            "note": "未找到该路段的参考信息，建议使用高德/百度地图查询"
        }

    # 尝试搜索实时路况
    search_results = try_search_road(from_city, to_city)
    if search_results:
        result["search_results"] = search_results

    # 添加通用安全提示
    result["emergency_numbers"] = {
        "高速救援": "12122",
        "交通事故": "122",
        "急救": "120",
        "报警": "110"
    }

    return result

def try_search_road(from_city: str, to_city: str) -> list:
    """尝试搜索实时路况"""
    return try_search(f"{from_city}到{to_city}", "路况")

def main():
    if len(sys.argv) < 3:
        print("用法: python search_road.py <出发城市> <到达城市>")
        print("示例: python search_road.py 雅安 理塘")
        sys.exit(1)

    from_city = sys.argv[1]
    to_city = sys.argv[2]

    result = search_road(from_city, to_city)
    print(json.dumps(result, ensure_ascii=False, indent=2))

if __name__ == "__main__":
    main()
