/**
 * 本地存储封装模块
 * 用于支持多课表的配置管理
 */

const PROFILES_KEY = "timetable_profiles";
const ACTIVE_ID_KEY = "timetable_active_profile_id";

// 默认设置
const DEFAULT_SETTINGS = {
  totalWeeks: 20, // 学期总周数
  nodesPerDay: 12, // 每天节次数
  semesterStart: "", // 学期开始日期 (yyyy-MM-dd)
  currentWeek: 1, // 当前周次
};

/**
 * =======================
 * Profile (课表档案) 层 API
 * =======================
 */

/**
 * 生成唯一 ID
 */
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

/**
 * 获取所有的课表配置文件
 * @returns {Array} profiles [{id, name, settings, courses, timetableType}]
 */
export function getProfiles() {
  try {
    const data = uni.getStorageSync(PROFILES_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error("读取 profiles 失败:", e);
    return [];
  }
}

/**
 * 保存所有的课表配置文件
 */
export function saveProfiles(profiles) {
  try {
    uni.setStorageSync(PROFILES_KEY, JSON.stringify(profiles));
    return true;
  } catch (e) {
    console.error("保存 profiles 失败:", e);
    return false;
  }
}

/**
 * 获取当前激活的课表 ID
 */
export function getActiveProfileId() {
  const profiles = getProfiles();
  if (profiles.length === 0) return null;

  let id = uni.getStorageSync(ACTIVE_ID_KEY);
  // 如果没有激活的，或者激活的 ID 已经不在列表中，默认取第一个
  if (!id || !profiles.find((p) => p.id === id)) {
    id = profiles[0].id;
    setActiveProfileId(id);
  }
  return id;
}

/**
 * 设置当前激活的课表 ID
 */
export function setActiveProfileId(id) {
  uni.setStorageSync(ACTIVE_ID_KEY, id);
}

/**
 * 获取当前激活的课表完整数据
 */
export function getActiveProfile() {
  const id = getActiveProfileId();
  if (!id) return null;
  const profiles = getProfiles();
  return profiles.find((p) => p.id === id) || null;
}

/**
 * 创建一个新课表档案，并可选择是否使其成为活动课表
 */
export function createProfile(name, semesterStart, makeActive = true) {
  const profiles = getProfiles();
  const newProfile = {
    id: generateId(),
    name: name || "未命名课表",
    settings: {
      ...DEFAULT_SETTINGS,
      semesterStart: semesterStart || "",
    },
    courses: [],
    createAt: Date.now(),
  };

  profiles.push(newProfile);
  saveProfiles(profiles);

  if (makeActive) {
    setActiveProfileId(newProfile.id);
  }

  return newProfile.id;
}

/**
 * 删除指定的课表
 */
export function deleteProfile(id) {
  let profiles = getProfiles();
  profiles = profiles.filter((p) => p.id !== id);
  saveProfiles(profiles);

  // 如果删除了激活的课表，重新选一个
  if (getActiveProfileId() === id && profiles.length > 0) {
    setActiveProfileId(profiles[0].id);
  } else if (profiles.length === 0) {
    uni.removeStorageSync(ACTIVE_ID_KEY);
  }
}

/**
 * =======================
 * 兼容旧版的快捷 API
 * 这部分操作等同于对「当前激活的课表」进行数据的存取
 * =======================
 */

/**
 * 保存当前激活课表的课程数据
 * @param {Array} courses - 课程数组
 */
export function saveCourses(courses) {
  const activeId = getActiveProfileId();
  if (!activeId) return false;

  const profiles = getProfiles();
  const target = profiles.find((p) => p.id === activeId);
  if (target) {
    target.courses = courses;
    return saveProfiles(profiles);
  }
  return false;
}

/**
 * 读取当前激活课表的课程数据
 * @returns {Array} 课程数组
 */
export function getCourses() {
  const activeProfile = getActiveProfile();
  return activeProfile ? activeProfile.courses || [] : [];
}

/**
 * 清空当前激活课表的课程数据
 */
export function clearCourses() {
  return saveCourses([]);
}

/**
 * 保存当前激活课表的设置
 * @param {Object} settings - 设置对象
 */
export function saveSettings(settings) {
  const activeId = getActiveProfileId();
  if (!activeId) return false;

  const profiles = getProfiles();
  const target = profiles.find((p) => p.id === activeId);
  if (target) {
    target.settings = { ...target.settings, ...settings };
    return saveProfiles(profiles);
  }
  return false;
}

/**
 * 读取当前激活课表的设置
 * @returns {Object} 设置对象
 */
export function getSettings() {
  const activeProfile = getActiveProfile();
  if (activeProfile && activeProfile.settings) {
    return { ...DEFAULT_SETTINGS, ...activeProfile.settings };
  }
  return { ...DEFAULT_SETTINGS };
}
