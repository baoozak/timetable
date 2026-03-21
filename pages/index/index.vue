<template>
	<view class="page">
		<!-- 导航栏：日期 + 周次 + 学期状态 -->
		<view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
			<view class="nav-content">
				<view class="nav-left clickable" @tap="goProfileList">
					<text class="nav-date">{{ profileName }}</text>
					<text class="nav-week-info">第 {{ currentWeek }} 周 {{ semesterStatus }}</text>
				</view>
				<view class="nav-actions">
					<view class="nav-btn clickable" @tap="showWeekPicker = true" v-if="courses.length > 0">
						<text class="nav-btn-text">选周</text>
					</view>
					<view class="nav-btn-primary clickable" @tap="goProfileList">
						<text class="nav-btn-primary-icon">≡</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 周次快速选择弹窗（点击左上角日期打开） -->
		<view class="picker-mask" v-if="showWeekPicker" @tap="showWeekPicker = false">
			<view class="picker-popup" @tap.stop>
				<text class="picker-title">选择周次</text>
				<view class="picker-grid">
					<view class="picker-item clickable" :class="{ active: currentWeek === w }" v-for="w in totalWeeks"
						:key="w" @tap="selectWeek(w)">
						<text class="picker-item-text" :class="{ active: currentWeek === w }">{{ w }}</text>
					</view>
				</view>
			</view>
		</view>

		<!-- 课表区域（滑动翻页） -->
		<view class="timetable-wrap" v-if="courses.length > 0" :style="{ paddingTop: statusBarHeight + 50 + 'px' }">
			<swiper class="timetable-swiper" :current="currentWeek - 1" @change="onSwiperChange" :duration="300">
				<swiper-item v-for="w in totalWeeks" :key="w">
					<view class="swiper-page">
						<!-- 星期表头 -->
						<view class="day-header-row">
							<view class="time-col-header"></view>
							<view class="day-header" v-for="(day, idx) in dayNames" :key="idx"
								:class="{ today: isToday(idx + 1, w) }">
								<text class="day-name" :class="{ today: isToday(idx + 1, w) }">{{ day }}</text>
								<text class="day-date" :class="{ today: isToday(idx + 1, w) }">{{ getDayDate(idx + 1, w)
									}}</text>
							</view>
						</view>

						<!-- 课表网格（可滚动） -->
						<scroll-view scroll-y class="timetable-scroll">
							<view class="timetable-grid">
								<!-- 节次列 -->
								<view class="time-col">
									<view class="node-cell clickable" v-for="n in nodesPerDay" :key="n"
										@tap.stop="goEditSchedule">
										<text class="node-num">{{ n }}</text>
										<text class="node-time" v-if="timeSchedule[n - 1]">{{
											timeSchedule[n - 1].start
										}}</text>
										<text class="node-time" v-if="timeSchedule[n - 1]">{{
											timeSchedule[n - 1].end
										}}</text>
									</view>
								</view>

								<!-- 课程区域 -->
								<view class="course-area">
									<!-- 网格背景 -->
									<view class="grid-lines">
										<view class="h-line" v-for="n in nodesPerDay" :key="'h' + n"></view>
										<view class="v-line" v-for="d in 6" :key="'v' + d"
											:style="{ left: (d * 100) / 7 + '%' }">
										</view>
									</view>

									<!-- 课程卡片 -->
									<view class="course-card clickable" v-for="course in allWeeksCourses[w - 1]"
										:key="course.id" :style="getCourseStyle(course)"
										@tap="showCourseDetail(course)">
										<text class="course-name" :style="{ color: getColor(course.name).text }">{{
											course.name }}</text>
										<text class="course-room" :style="{ color: getColor(course.name).text }">{{
											course.room }}</text>
									</view>
								</view>
							</view>
						</scroll-view>
					</view>
				</swiper-item>
			</swiper>
		</view>

		<!-- 空状态 -->
		<view class="empty-wrap" v-else>
			<view class="empty-card">
				<view class="empty-icon-circle">
					<view class="empty-book-icon">
						<view class="book-spine"></view>
						<view class="book-page"></view>
						<view class="book-page book-page-2"></view>
					</view>
				</view>
				<text class="empty-title">没有课程数据</text>
				<text class="empty-desc">请点击下方按钮去导入你的课表</text>
				<view class="empty-btn clickable" @tap="handleImport">
					<text class="empty-btn-text">去导入</text>
				</view>
			</view>
		</view>

		<!-- 课程详情弹窗 -->
		<view class="picker-mask" v-if="detailCourse" @tap="detailCourse = null">
			<view class="detail-card" @tap.stop>
				<view class="detail-color-bar" :style="{
					background:
						'linear-gradient(135deg, ' +
						getColor(detailCourse.name).border +
						', ' +
						getColor(detailCourse.name).bg +
						')',
				}">
				</view>
				<view class="detail-header">
					<text class="detail-name">{{ detailCourse.name }}</text>
				</view>
				<view class="detail-body">
					<view class="detail-item">
						<text class="detail-label">时　间</text>
						<text class="detail-value">星期{{ dayNames[detailCourse.day - 1] }} 第{{
							detailCourse.startNode
						}}-{{ detailCourse.endNode }}节</text>
					</view>
					<view class="detail-item" v-if="detailCourse.room">
						<text class="detail-label">教　室</text>
						<text class="detail-value">{{ detailCourse.room }}</text>
					</view>
					<view class="detail-item" v-if="detailCourse.teacher">
						<text class="detail-label">教　师</text>
						<text class="detail-value">{{ detailCourse.teacher }}</text>
					</view>
					<view class="detail-item" v-if="detailCourse.weeksText">
						<text class="detail-label">周　次</text>
						<text class="detail-value">{{ detailCourse.weeksText }}</text>
					</view>
				</view>
				<view class="detail-footer">
					<view class="detail-close-btn clickable" @tap="detailCourse = null">
						<text class="detail-close-text">关闭</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import {
	getCourses,
	getSettings,
	saveSettings,
	clearCourses,
	getActiveProfile,
	getProfiles,
} from "@/utils/storage.js";
import { getCoursesForWeek } from "@/utils/parser.js";
import { getCourseColor, initColors } from "@/utils/color.js";
import { getTimeSchedule, calculateCurrentWeek } from "@/utils/time.js";

export default {
	data() {
		return {
			statusBarHeight: 0,
			courses: [],
			currentWeek: 1,
			totalWeeks: 20,
			nodesPerDay: 12,
			semesterStart: "",
			showWeekPicker: false,
			detailCourse: null,
			dayNames: ["一", "二", "三", "四", "五", "六", "日"],
			timeSchedule: [],
			profileName: "未加载课表",
		};
	},
	computed: {
		allWeeksCourses() {
			const arr = [];
			for (let i = 1; i <= this.totalWeeks; i++) {
				arr.push(getCoursesForWeek(this.courses, i));
			}
			return arr;
		},
		todayStr() {
			const d = new Date();
			return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
		},
		semesterStatus() {
			if (!this.semesterStart) return "";
			const now = new Date();
			now.setHours(0, 0, 0, 0);
			const start = new Date(this.semesterStart);
			start.setHours(0, 0, 0, 0);

			if (now < start) return "学期未开始";

			const realWeek = calculateCurrentWeek(this.semesterStart, now);

			let maxCourseWeek = this.totalWeeks;
			if (this.courses && this.courses.length > 0) {
				const max = Math.max(
					...this.courses.map((c) => Math.max(...(c.weeks || [0]), 0)),
				);
				if (max > 0) {
					maxCourseWeek = max;
				}
			}

			if (realWeek > maxCourseWeek) return "课程已结束";
			const remaining = maxCourseWeek - realWeek;
			return `还剩 ${remaining} 周`;
		},
	},
	onShow() {
		this.loadData();
	},
	onLoad() {
		const sysInfo = uni.getSystemInfoSync();
		this.statusBarHeight = sysInfo.statusBarHeight || 20;
	},
	methods: {
		loadData() {
			this.timeSchedule = getTimeSchedule();
			const settings = getSettings();
			this.totalWeeks = settings.totalWeeks || 20;
			this.nodesPerDay = settings.nodesPerDay || 12;
			this.semesterStart = settings.semesterStart || "";
			this.currentWeek = settings.currentWeek || 1;

			const active = getActiveProfile();
			if (active) {
				this.profileName = active.name || "我的课表";
			} else {
				this.profileName = "请新建课表";
			}

			if (this.semesterStart) {
				const autoWeek = calculateCurrentWeek(this.semesterStart, new Date());
				if (autoWeek >= 1 && autoWeek <= this.totalWeeks) {
					this.currentWeek = autoWeek;
				}
			}

			this.courses = getCourses();
			if (this.courses.length > 0) {
				initColors(this.courses);
			}
		},

		goEditSchedule() {
			uni.navigateTo({ url: "/pages/schedule/schedule" });
		},

		changeWeek(delta) {
			const newWeek = this.currentWeek + delta;
			if (newWeek >= 1 && newWeek <= this.totalWeeks) {
				this.currentWeek = newWeek;
				saveSettings({ currentWeek: this.currentWeek });
			}
		},

		selectWeek(week) {
			this.currentWeek = week;
			this.showWeekPicker = false;
			saveSettings({ currentWeek: this.currentWeek });
		},

		onSwiperChange(e) {
			const newIndex = e.detail.current;
			this.currentWeek = newIndex + 1;
			saveSettings({ currentWeek: this.currentWeek });
		},

		isToday(dayOfWeek, targetWeek = this.currentWeek) {
			const today = new Date();
			if (!this.semesterStart) {
				const jsDay = today.getDay() || 7;
				return jsDay === dayOfWeek && targetWeek === this.currentWeek;
			}
			// 计算网格中该天的实际日期
			const start = new Date(this.semesterStart);
			const startDay = start.getDay() || 7;
			const offset = (targetWeek - 1) * 7 + (dayOfWeek - startDay);
			const targetDate = new Date(start);
			targetDate.setDate(targetDate.getDate() + offset);
			// 比较完整日期，而不只是星期几
			return (
				targetDate.getFullYear() === today.getFullYear() &&
				targetDate.getMonth() === today.getMonth() &&
				targetDate.getDate() === today.getDate()
			);
		},

		getDayDate(dayOfWeek, targetWeek = this.currentWeek) {
			if (!this.semesterStart) return "";
			const start = new Date(this.semesterStart);
			const startDay = start.getDay() || 7;
			const offset = (targetWeek - 1) * 7 + (dayOfWeek - startDay);
			const date = new Date(start);
			date.setDate(date.getDate() + offset);
			return `${date.getMonth() + 1}/${date.getDate()}`;
		},

		getCourseStyle(course) {
			const color = getCourseColor(course.name);
			const nodeH = 110; // 改为 110rpx，格子长宽比更好看
			const top = (course.startNode - 1) * nodeH;
			const height = (course.endNode - course.startNode + 1) * nodeH - 6;
			const dayW = 100 / 7;
			const left = (course.day - 1) * dayW;

			return {
				position: "absolute",
				top: top + "rpx",
				left: `calc(${left}% + 2rpx)`,
				width: `calc(${dayW}% - 5rpx)`,
				height: height + "rpx",
				backgroundColor: color.bg,
				borderLeft: `6rpx solid ${color.border}`,
				padding: "8rpx",
				borderRadius: "12rpx",
				overflow: "hidden",
				boxSizing: "border-box",
				transition: "var(--transition-fast)",
			};
		},

		getColor(name) {
			return getCourseColor(name);
		},

		showCourseDetail(course) {
			this.detailCourse = course;
		},

		goProfileList() {
			uni.navigateTo({ url: "/pages/profile/list" });
		},

		handleImport() {
			const profiles = getProfiles();
			if (profiles.length === 0) {
				// 没有课表，必须先新建
				uni.navigateTo({ url: "/pages/profile/create" });
			} else {
				// 有当前课表，正常导入
				uni.navigateTo({ url: "/pages/import/select-school" });
			}
		},

		handleClear() {
			uni.showModal({
				title: "确认重置",
				content: "将清空所有课程数据，确定吗？",
				success: (res) => {
					if (res.confirm) {
						clearCourses();
						this.courses = [];
						uni.showToast({ title: "已清空", icon: "success" });
					}
				},
			});
		},
	},
};
</script>

<style scoped>
/* ========== 导航栏 ========== */
.nav-bar {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	z-index: 100;
	background: var(--color-bg);
}

.nav-content {
	height: 88rpx;
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 30rpx;
}

.nav-left {
	display: flex;
	flex-direction: column;
	max-width: 70%;
}

.nav-date {
	font-size: 34rpx;
	font-weight: 700;
	color: var(--color-text);
	line-height: 1.2;
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.nav-week-info {
	font-size: 20rpx;
	color: var(--color-text-secondary);
	line-height: 1.4;
}

.nav-actions {
	display: flex;
	align-items: center;
	gap: 16rpx;
}

.nav-btn {
	padding: 8rpx 20rpx;
	border-radius: var(--radius-full);
	background: var(--color-primary);
}

.nav-btn-text {
	font-size: 24rpx;
	color: #ffffff;
}

.nav-btn-primary {
	width: 56rpx;
	height: 56rpx;
	border-radius: 50%;
	background: var(--color-primary);
	display: flex;
	align-items: center;
	justify-content: center;
}

.nav-btn-primary-icon {
	font-size: 36rpx;
	color: #ffffff;
	font-weight: 700;
	line-height: 1;
}

/* ========== 弹窗通用 ========== */
.picker-mask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(22, 78, 99, 0.35);
	z-index: 200;
	display: flex;
	align-items: center;
	justify-content: center;
}

.picker-popup {
	width: 600rpx;
	background: var(--color-bg-white);
	border-radius: var(--radius-lg);
	padding: 40rpx;
	box-shadow: var(--shadow-lg);
}

.picker-title {
	font-size: 32rpx;
	font-weight: 700;
	text-align: center;
	margin-bottom: 32rpx;
	color: var(--color-text);
}

.picker-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 16rpx;
}

.picker-item {
	width: calc((100% - 64rpx) / 5);
	height: 72rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: var(--radius-sm);
	background: var(--color-bg);
	border: 2rpx solid transparent;
}

.picker-item.active {
	background: var(--color-primary);
	border-color: var(--color-primary-dark);
}

.picker-item-text {
	font-size: 28rpx;
	color: var(--color-text);
}

.picker-item-text.active {
	color: #ffffff;
	font-weight: 700;
}

/* ========== 课表区域 ========== */
.timetable-wrap {
	display: flex;
	flex-direction: column;
	flex: 1;
	height: calc(100vh - 100rpx);
	/* 精确计算减去导航栏多出的高度，避免底部留白 */
}

.timetable-swiper {
	flex: 1;
	height: 100%;
}

.swiper-page {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
}

/* 星期表头 */
.day-header-row {
	display: flex;
	background: var(--color-bg);
	border-bottom: none;
	padding: 14rpx 0;
}

.time-col-header {
	width: 90rpx;
	flex-shrink: 0;
}

.day-header {
	flex: 1;
	text-align: center;
}

.day-name {
	font-size: 24rpx;
	color: var(--color-text);
	font-weight: 500;
	display: block;
}

.day-name.today {
	color: var(--color-primary);
	font-weight: 700;
}

.day-date {
	font-size: 20rpx;
	color: var(--color-text-muted);
	display: block;
}

.day-date.today {
	color: var(--color-primary);
	font-weight: 600;
}

/* 课表网格 */
.timetable-scroll {
	flex: 1;
	height: 0;
}

.timetable-grid {
	display: flex;
	position: relative;
}

/* 节次列 */
.time-col {
	width: 90rpx;
	flex-shrink: 0;
}

.node-cell {
	height: 110rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
}

.node-num {
	font-size: 22rpx;
	color: var(--color-text);
	font-weight: 600;
	line-height: 1.2;
}

.node-time {
	font-size: 16rpx;
	color: var(--color-text-muted);
	line-height: 1.3;
}

/* 课程区域 */
.course-area {
	flex: 1;
	position: relative;
	min-height: 1320rpx;
	/* 110 * 12 */
}

/* 网格线 */
.grid-lines {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	pointer-events: none;
}

.h-line {
	height: 110rpx;
	/* 改为 110rpx */
	border-bottom: none;
}

.v-line {
	position: absolute;
	top: 0;
	bottom: 0;
	width: 1rpx;
	background: transparent;
}

/* 课程卡片 (Skill: cursor-pointer, smooth transition) */
.course-card {
	display: flex;
	flex-direction: column;
	gap: 4rpx;
}

.course-name {
	font-size: 20rpx;
	font-weight: 600;
	line-height: 1.3;
	display: -webkit-box;
	-webkit-line-clamp: 3;
	line-clamp: 3;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.course-room {
	font-size: 18rpx;
	opacity: 0.75;
	line-height: 1.2;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* ========== 空状态 (Skill: 不使用 emoji 作 icon, 但教育场景友好) ========== */
.empty-wrap {
	display: flex;
	align-items: center;
	justify-content: center;
	padding-top: 260rpx;
	padding-left: 40rpx;
	padding-right: 40rpx;
}

.empty-card {
	background: var(--color-bg-white);
	border-radius: var(--radius-lg);
	padding: 60rpx 48rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	box-shadow: var(--shadow-md);
	width: 100%;
}

.empty-icon-circle {
	width: 140rpx;
	height: 140rpx;
	border-radius: 50%;
	background: var(--color-bg);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 32rpx;
}

/* CSS 绘制的书本图标（替代 emoji） */
.empty-book-icon {
	width: 56rpx;
	height: 64rpx;
	position: relative;
}

.book-spine {
	position: absolute;
	left: 0;
	top: 0;
	width: 10rpx;
	height: 100%;
	background: var(--color-primary);
	border-radius: 4rpx 0 0 4rpx;
}

.book-page {
	position: absolute;
	left: 10rpx;
	top: 4rpx;
	right: 0;
	height: calc(100% - 8rpx);
	background: var(--color-primary-light);
	border-radius: 0 6rpx 6rpx 0;
	opacity: 0.5;
}

.book-page-2 {
	left: 14rpx;
	top: 8rpx;
	height: calc(100% - 16rpx);
	opacity: 0.3;
}

.empty-title {
	font-size: 36rpx;
	font-weight: 700;
	color: var(--color-text);
	margin-bottom: 12rpx;
}

.empty-desc {
	font-size: 26rpx;
	color: var(--color-text-secondary);
	margin-bottom: 48rpx;
}

.empty-btn {
	background: linear-gradient(135deg, var(--color-cta), var(--color-cta-dark));
	padding: 24rpx 72rpx;
	border-radius: var(--radius-full);
	box-shadow: 0 8rpx 24rpx rgba(34, 197, 94, 0.3);
}

.empty-btn-text {
	color: #ffffff;
	font-size: 30rpx;
	font-weight: 600;
}

/* ========== 课程详情弹窗 ========== */
.detail-card {
	width: 620rpx;
	background: var(--color-bg-white);
	border-radius: var(--radius-lg);
	overflow: hidden;
	box-shadow: var(--shadow-lg);
}

.detail-color-bar {
	height: 12rpx;
}

.detail-header {
	padding: 32rpx 36rpx 16rpx;
}

.detail-name {
	font-size: 36rpx;
	font-weight: 700;
	color: var(--color-text);
}

.detail-body {
	padding: 8rpx 36rpx 16rpx;
}

.detail-item {
	display: flex;
	align-items: center;
	padding: 18rpx 0;
	border-bottom: 1rpx solid #f0f7fa;
}

.detail-item:last-child {
	border-bottom: none;
}

.detail-label {
	width: 140rpx;
	font-size: 26rpx;
	color: var(--color-text-secondary);
	flex-shrink: 0;
}

.detail-value {
	font-size: 28rpx;
	color: var(--color-text);
	flex: 1;
	font-weight: 500;
}

.detail-footer {
	padding: 16rpx 36rpx 28rpx;
}

.detail-close-btn {
	background: var(--color-bg);
	border-radius: var(--radius-md);
	padding: 18rpx;
	text-align: center;
}

.detail-close-text {
	font-size: 28rpx;
	color: var(--color-primary);
	font-weight: 600;
}
</style>
