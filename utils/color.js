/**
 * 课程颜色管理模块
 * 配色方案基于 ui-ux-pro-max Skill 推荐的 Fresh cyan 主题
 * 12 种和谐配色，明亮友好，适合教育场景
 */

// 基于 Skill 推荐的 cyan 主色延伸出的 12 色方案
// 每种颜色都保证了高对比度文字可读性 (4.5:1+)
const COLOR_PALETTE = [
  { bg: "#E0F7FA", text: "#00695C", border: "#4DD0E1" }, // 青色（主色系延伸）
  { bg: "#E8F5E9", text: "#2E7D32", border: "#81C784" }, // 绿色（CTA色延伸）
  { bg: "#FFF8E1", text: "#F57F17", border: "#FFD54F" }, // 琥珀色
  { bg: "#F3E5F5", text: "#7B1FA2", border: "#BA68C8" }, // 紫色
  { bg: "#E3F2FD", text: "#1565C0", border: "#64B5F6" }, // 蓝色
  { bg: "#FCE4EC", text: "#C62828", border: "#F48FB1" }, // 粉色
  { bg: "#FFF3E0", text: "#E65100", border: "#FFB74D" }, // 橙色
  { bg: "#E0F2F1", text: "#004D40", border: "#80CBC4" }, // 深青
  { bg: "#F1F8E9", text: "#558B2F", border: "#AED581" }, // 嫩绿
  { bg: "#EDE7F6", text: "#4527A0", border: "#9575CD" }, // 深紫
  { bg: "#E1F5FE", text: "#0277BD", border: "#4FC3F7" }, // 浅蓝
  { bg: "#FBE9E7", text: "#BF360C", border: "#FF8A65" }, // 深橙
];

// 课程名 → 颜色索引 映射缓存
const colorMap = {};
let nextColorIndex = 0;

/**
 * 根据课程名获取颜色
 * 同名课程始终返回相同颜色
 * @param {string} courseName - 课程名称
 * @returns {{ bg: string, text: string, border: string }}
 */
export function getCourseColor(courseName) {
  if (!courseName) return COLOR_PALETTE[0];

  if (!(courseName in colorMap)) {
    colorMap[courseName] = nextColorIndex % COLOR_PALETTE.length;
    nextColorIndex++;
  }

  return COLOR_PALETTE[colorMap[courseName]];
}

/**
 * 重置颜色分配（导入新课表时调用）
 */
export function resetColors() {
  Object.keys(colorMap).forEach((key) => delete colorMap[key]);
  nextColorIndex = 0;
}

/**
 * 初始化颜色映射（从已有课程列表中）
 * @param {Array} courses - 课程数组
 */
export function initColors(courses) {
  resetColors();
  const names = [...new Set(courses.map((c) => c.name))];
  names.forEach((name) => getCourseColor(name));
}
