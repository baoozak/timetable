import { getTimeSchedule } from "./time.js";

/**
 * 判断两个 "HH:MM" 格式时间的先后关系，返回按分钟计算的时间差 (time1 - time2)
 */
function diffMinutes(time1, time2) {
  const [h1, m1] = time1.split(":").map(Number);
  const [h2, m2] = time2.split(":").map(Number);
  return h1 * 60 + m1 - (h2 * 60 + m2);
}

/**
 * 格式化当前时间为 "HH:MM"
 */
function getCurrentTimeStr() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, "0");
  const m = String(now.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * 获取今天的课程列表（基于 allWeeksCourses 或在外部提取好了传入）
 * 这个函数专门用来分析"当前/下一节课"状态
 *
 * @param {Array} todayCourses 今天的课程列表
 * @returns {Object} 状态结果，用于显示通知
 */
export function getNextClassInfo(todayCourses) {
  if (!todayCourses || todayCourses.length === 0) {
    return {
      type: "no_class",
      title: "🎉 今天没有课",
      content: "好好休息，享受生活！",
      subText: "全天无课",
    };
  }

  const schedule = getTimeSchedule();
  const nowStr = getCurrentTimeStr();

  // 找出所有还未结束的课程（包括正在上的）
  // 将他们平铺并打上确切的时间标签
  let upcoming = [];

  for (const course of todayCourses) {
    const startNode = course.startNode;
    const endNode = course.endNode;

    // 获取这节课真正的开始和结束时间
    const startTime = schedule[startNode - 1]
      ? schedule[startNode - 1].start
      : "00:00";
    const endTime = schedule[endNode - 1] ? schedule[endNode - 1].end : "23:59";

    upcoming.push({
      ...course,
      realStart: startTime,
      realEnd: endTime,
    });
  }

  // 按开始时间排序 (防万一)
  upcoming.sort((a, b) => diffMinutes(a.realStart, b.realStart));

  // 遍历寻找当前状态
  for (const course of upcoming) {
    const minsToStart = diffMinutes(course.realStart, nowStr);
    const minsToEnd = diffMinutes(course.realEnd, nowStr);

    // 1. 正在上课 (当前时间在开始和结束之间)
    if (minsToStart <= 0 && minsToEnd > 0) {
      return {
        type: "ongoing",
        title: `🟢 正在上：${course.name}`,
        content: `📍 ${course.room}  |  第 ${course.startNode}-${course.endNode} 节 (${course.realStart} - ${course.realEnd})`,
        subText: `还剩 ${minsToEnd} 分钟下课`,
      };
    }

    // 2. 即将上课 (还没开始)
    if (minsToStart > 0) {
      let prefix = "📚 下节课：";
      let sub = "";

      if (minsToStart <= 60) {
        prefix = "⏰ 马上上课：";
        sub = `${minsToStart} 分钟后`;
      } else {
        const hours = Math.floor(minsToStart / 60);
        const mins = minsToStart % 60;
        sub = `还有 ${hours}小时${mins > 0 ? mins + "分" : ""}`;
      }

      return {
        type: "upcoming",
        title: `${prefix}${course.name}`,
        content: `📍 ${course.room}  |  第 ${course.startNode}-${course.endNode} 节 (${course.realStart})`,
        subText: sub,
      };
    }
  }

  // 遍历完了还没 return，说明所有课都上完了
  return {
    type: "finished",
    title: "✨ 今天的课上完啦",
    content: "辛苦了，好好休息！",
    subText: "已结课",
  };
}
