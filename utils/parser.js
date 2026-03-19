/**
 * 正方教务系统课表数据解析模块
 * 适配新版正方 (jwglxt) 接口返回的 JSON 数据
 */

/**
 * 解析周次字符串为周次数组
 * 例如: "1-16周" → [1,2,3,...,16]
 *       "1-8周(单)" → [1,3,5,7]
 *       "2-8周(双)" → [2,4,6,8]
 *       "1,3,5-8周" → [1,3,5,6,7,8]
 * @param {string} zcStr - 周次字符串
 * @returns {Array<number>} 周次数组
 */
export function parseWeeks(zcStr) {
  if (!zcStr) return [];

  const weeks = [];
  // 判断单双周
  const isSingle = zcStr.includes("单");
  const isDouble = zcStr.includes("双");

  // 去除"周"、"(单)"、"(双)"等文字
  const cleaned = zcStr.replace(/周|\(单\)|\(双\)|（单）|（双）/g, "").trim();

  // 按逗号分隔多段
  const parts = cleaned.split(",");

  for (const part of parts) {
    if (part.includes("-")) {
      // 范围: "1-16"
      const [start, end] = part.split("-").map(Number);
      for (let i = start; i <= end; i++) {
        if (isSingle && i % 2 === 0) continue;
        if (isDouble && i % 2 === 1) continue;
        weeks.push(i);
      }
    } else {
      // 单个周次: "3"
      const num = Number(part);
      if (!isNaN(num)) weeks.push(num);
    }
  }

  return weeks.sort((a, b) => a - b);
}

/**
 * 解析节次字符串
 * 例如: "1-2" → { start: 1, end: 2 }
 *       "0102" → { start: 1, end: 2 }
 *       "0304" → { start: 3, end: 4 }
 * @param {string} jcsStr - 节次字符串
 * @returns {{ start: number, end: number }}
 */
function parseNodes(jcsStr) {
  if (!jcsStr) return { start: 1, end: 2 };

  // 标准格式: "1-2"
  if (jcsStr.includes("-")) {
    const [start, end] = jcsStr.split("-").map(Number);
    return { start, end };
  }

  // 紧凑格式: "0102" → 每两位一个节次
  if (/^\d{4,}$/.test(jcsStr)) {
    const nums = [];
    for (let i = 0; i < jcsStr.length; i += 2) {
      nums.push(Number(jcsStr.substring(i, i + 2)));
    }
    return { start: Math.min(...nums), end: Math.max(...nums) };
  }

  // 单节次
  const num = Number(jcsStr);
  return { start: num, end: num };
}

/**
 * 解析正方教务系统返回的课表 JSON 数据
 * @param {Object} rawData - 正方接口原始数据 (包含 kbList 数组)
 * @returns {Array} 标准化的课程数组
 *
 * 返回的课程对象结构:
 * {
 *   id: string,           // 唯一ID
 *   name: string,         // 课程名称
 *   day: number,          // 星期几 (1-7)
 *   startNode: number,    // 开始节次
 *   endNode: number,      // 结束节次
 *   room: string,         // 教室
 *   teacher: string,      // 教师
 *   weeks: number[],      // 上课周次数组
 *   weeksText: string     // 原始周次文本
 * }
 */
export function parseZhengfangData(rawData) {
  // 正方接口返回数据结构: { kbList: [...], ..., xsxx: {...} }
  // 或直接是数组
  let kbList = [];

  if (Array.isArray(rawData)) {
    kbList = rawData;
  } else if (rawData && rawData.kbList) {
    kbList = rawData.kbList;
  } else if (rawData && rawData.data && rawData.data.kbList) {
    kbList = rawData.data.kbList;
  }

  if (!kbList || kbList.length === 0) {
    console.warn("未找到课表数据 (kbList)");
    return [];
  }

  const courses = [];
  let idCounter = 1;

  for (const item of kbList) {
    const name = item.kcmc || "未知课程";
    const day = Number(item.xqj) || 1;
    const { start, end } = parseNodes(item.jcs || item.jc);
    const room = item.cdmc || item.cddm || "";
    const teacher = item.xm || "";
    const weeksText = item.zcd || "";
    const weeks = parseWeeks(weeksText);

    courses.push({
      id: `course_${idCounter++}`,
      name,
      day,
      startNode: start,
      endNode: end,
      room,
      teacher,
      weeks,
      weeksText,
    });
  }

  return courses;
}

/**
 * 获取某一周的课程
 * @param {Array} courses - 全部课程
 * @param {number} week - 周次
 * @returns {Array} 该周的课程
 */
export function getCoursesForWeek(courses, week) {
  return courses.filter((course) => course.weeks.includes(week));
}
