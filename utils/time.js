/**
 * 时间表模块
 * 存储每节课的起止时间，供课表展示和"下节啥课"功能使用
 */
import { getActiveProfileId } from "./storage.js";

// 冬令时预设 (下午 13:30 开始)
export const WINTER_SCHEDULE = [
  { start: "08:00", end: "08:40" },
  { start: "08:45", end: "09:25" },
  { start: "09:45", end: "10:25" },
  { start: "10:30", end: "11:10" },
  { start: "11:15", end: "11:55" },
  { start: "13:30", end: "14:10" }, // 下午提早到 13:30
  { start: "14:15", end: "14:55" },
  { start: "15:15", end: "15:55" },
  { start: "16:00", end: "16:40" },
  { start: "18:30", end: "19:10" }, // 晚课提早到 18:30
  { start: "19:25", end: "20:05" },
  { start: "20:10", end: "20:50" },
];

// 夏令时预设 (下午推迟)
export const SUMMER_SCHEDULE = [
  { start: "08:00", end: "08:40" },
  { start: "08:45", end: "09:25" },
  { start: "09:45", end: "10:25" },
  { start: "10:30", end: "11:10" },
  { start: "11:15", end: "11:55" },
  { start: "14:00", end: "14:40" }, // 下午推迟到 14:00
  { start: "14:45", end: "15:25" },
  { start: "15:45", end: "16:25" },
  { start: "16:30", end: "17:10" },
  { start: "19:00", end: "19:40" }, // 晚课推迟到 19:00
  { start: "19:45", end: "20:25" },
  { start: "20:30", end: "21:10" },
];

/**
 * 根据类型获取预设时间表
 */
export function getPresetSchedule(type) {
  if (type === "summer") return [...SUMMER_SCHEDULE];
  return [...WINTER_SCHEDULE];
}

/**
 * 获取时间表（优先从 storage 读取，否则用默认值）
 */
export function getTimeSchedule() {
  try {
    const activeId = getActiveProfileId();
    const key = activeId
      ? `timetable_schedule_${activeId}`
      : "timetable_schedule";
    const data = uni.getStorageSync(key);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error("读取时间表失败:", e);
  }
  return [...WINTER_SCHEDULE];
}

/**
 * 保存时间表
 */
export function saveTimeSchedule(schedule) {
  try {
    const activeId = getActiveProfileId();
    const key = activeId
      ? `timetable_schedule_${activeId}`
      : "timetable_schedule";
    uni.setStorageSync(key, JSON.stringify(schedule));
    return true;
  } catch (e) {
    console.error("保存时间表失败:", e);
    return false;
  }
}

/**
 * 计算给定日期属于学期的第几周
 * 学期第一周是从 semesterStart 所在的那一周（周一到周日）开始算。
 * @param {string} semesterStart - 学期开始日期，如 '2026-02-23'
 * @param {Date} targetDate - 目标日期对象，默认今天
 * @returns {number} 周次 (自然数)
 */
export function calculateCurrentWeek(semesterStart, targetDate = new Date()) {
  if (!semesterStart) return 1;
  const start = new Date(semesterStart);
  start.setHours(0, 0, 0, 0);

  const target = new Date(targetDate);
  target.setHours(0, 0, 0, 0);

  // 把 start 调整到那一周的周一
  const startDay = start.getDay() || 7;
  const firstMonday = new Date(start);
  firstMonday.setDate(start.getDate() - startDay + 1);

  const diffTime = target.getTime() - firstMonday.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  const week = Math.floor(diffDays / 7) + 1;
  return week; // 可能为 0 或负数（表示开学前）
}
