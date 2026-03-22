<template>
	<view class="page">
		<!-- 导航栏：只显示日期 -->
		<view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
			<view class="nav-content">
				<view class="nav-left">
					<text class="nav-title">今日安排</text>
					<text class="nav-date">{{ todayStr }}</text>
				</view>
			</view>
		</view>

        <!-- 主内容区 -->
		<scroll-view scroll-y class="content-scroll" :style="{ paddingTop: statusBarHeight + 44 + 'px' }">
            <view class="timeline-container">
                <!-- 空状态 -->
                <view class="empty-state" v-if="timelineCards.length === 0">
                    <text class="empty-text">今天没有任何安排，好好休息吧！</text>
                </view>

                <view class="timeline-item" v-for="(item, index) in timelineCards" :key="index">
                    <!-- 左侧时间线与圆点 -->
                    <view class="timeline-left">
                        <view class="timeline-time">{{ item.startTimeStr }}</view>
                        <view class="timeline-dot" :class="[item.type]"></view>
                        <view class="timeline-line" v-if="index !== timelineCards.length - 1"></view>
                    </view>

                    <!-- 右侧卡片 -->
                    <view class="timeline-right">
                        <view class="card" :class="[item.type]">
                            <view class="card-header">
                                <text class="card-title">{{ item.title }}</text>
                                <text class="card-tag" v-if="item.type === 'course'">课程</text>
                                <text class="card-tag todo-tag" v-else>待办</text>
                            </view>
                            
                            <!-- 课程详情 -->
                            <view class="card-body" v-if="item.type === 'course'">
                                <view class="info-row"><text class="icon">📍</text><text>{{ item.room || '未知地点' }}</text></view>
                                <view class="info-row" v-if="item.teacher"><text class="icon">👤</text><text>{{ item.teacher }}</text></view>
                                <view class="info-row"><text class="icon">⏰</text><text>第 {{ item.startNode }}-{{ item.endNode }} 节 ({{ item.endTimeStr }} 下课)</text></view>
                            </view>

                            <!-- 待办详情 -->
                            <view class="card-body" v-else @tap="onTodoClick(item)">
                                <view class="info-row" v-if="item.desc"><text class="icon">📝</text><text>{{ item.desc }}</text></view>
                                <view class="info-row"><text class="icon">🔔</text><text>{{ getReminderText(item.reminderMinutes) }}</text></view>
                                
                                <view class="todo-actions">
                                    <view class="action-btn complete-btn clickable" @tap.stop="markTodoDone(item.id)">
                                        <text>记为完成</text>
                                    </view>
                                </view>
                            </view>
                        </view>
                    </view>
                </view>
            </view>
        </scroll-view>

        <view class="fab-btn clickable" hover-class="fab-btn-hover" @tap="goAddTodo">
			<text class="fab-icon">+</text>
		</view>
    </view>
</template>

<script>
import { getCourses, getSettings, getTodos, toggleTodoStatus } from "@/utils/storage.js";
import { getCoursesForWeek } from "@/utils/parser.js";
import { getTimeSchedule, calculateCurrentWeek } from "@/utils/time.js";

export default {
    data() {
        return {
            statusBarHeight: 20,
            timelineCards: []
        };
    },
    computed: {
        todayStr() {
            const d = new Date();
            const days = ['日', '一', '二', '三', '四', '五', '六'];
            return `${d.getMonth() + 1}月${d.getDate()}日 星期${days[d.getDay()]}`;
        }
    },
    onShow() {
        this.loadTimelineData();
    },
    onLoad() {
        const sysInfo = uni.getSystemInfoSync();
        if (sysInfo.statusBarHeight) {
            this.statusBarHeight = sysInfo.statusBarHeight;
        }
    },
    methods: {
        loadTimelineData() {
            const targetDate = new Date();
            const currentDay = targetDate.getDay() || 7;
            const settings = getSettings();
            let currentWeek = settings.currentWeek;
            if (settings.semesterStart) {
                currentWeek = calculateCurrentWeek(settings.semesterStart, targetDate);
            }
            
            const schedule = getTimeSchedule();
            
            // 1. Process Courses
            const allCourses = getCourses();
            const weekCourses = getCoursesForWeek(allCourses, currentWeek);
            const todayCourses = weekCourses.filter(c => c.day === currentDay);
            
            const mappedCourses = todayCourses.map(c => {
                const startTimeStr = schedule[c.startNode - 1]?.start || '00:00';
                const endTimeStr = schedule[c.endNode - 1]?.end || '00:00';
                return {
                    type: 'course',
                    title: c.name,
                    room: c.room,
                    teacher: c.teacher,
                    startNode: c.startNode,
                    endNode: c.endNode,
                    startTimeStr,
                    endTimeStr,
                    sortTime: parseInt(startTimeStr.replace(':', ''))
                };
            });

            // 2. Process Todos
            const allTodos = getTodos();
            const todayStr = `${targetDate.getFullYear()}-${(targetDate.getMonth()+1).toString().padStart(2,'0')}-${targetDate.getDate().toString().padStart(2,'0')}`;
            const todayTodos = allTodos.filter(t => t.date === todayStr && t.status === 0);
            
            const mappedTodos = todayTodos.map(t => ({
                type: 'todo',
                id: t.id,
                title: t.title,
                desc: t.desc,
                startTimeStr: t.time,
                reminderMinutes: t.reminderMinutes,
                sortTime: parseInt(t.time.replace(':', ''))
            }));

            // 3. Merge and Sort
            this.timelineCards = [...mappedCourses, ...mappedTodos].sort((a, b) => a.sortTime - b.sortTime);
        },
        getReminderText(min) {
            if (min === 0) return '准点提醒';
            return `提前${min}分钟提醒`;
        },
        markTodoDone(id) {
            if (toggleTodoStatus(id)) {
                uni.showToast({ title: '已完成', icon: 'success' });
                this.loadTimelineData(); // Refresh list to remove it
            }
        },
        onTodoClick(item) {
            // 目前仅弹出提示，未来可扩展为编辑
            uni.showToast({ title: item.title, icon: 'none' });
        },
        goAddTodo() {
            uni.navigateTo({ url: '/pages/todo/add' });
        }
    }
}
</script>

<style scoped>
.page {
	min-height: 100vh;
	background-color: var(--color-bg) !important;
}

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
	padding: 0 32rpx;
}

.nav-left {
	display: flex;
	flex-direction: column;
}

.nav-title {
	font-size: 34rpx;
	font-weight: 700;
	color: #1E293B; /* Slate-800 */
}

.nav-date {
	font-size: 22rpx;
	color: #64748B; /* Slate-500 */
	margin-top: 4rpx;
}

.content-scroll {
    height: 100vh;
    box-sizing: border-box;
    padding-bottom: 50rpx; /* safe area bottom */
}

.timeline-container {
    padding: 40rpx 32rpx 160rpx;
}

.empty-state {
    text-align: center;
    padding-top: 200rpx;
}
.empty-text {
    color: #94A3B8;
    font-size: 28rpx;
}

/* 时间轴 */
.timeline-item {
    display: flex;
    margin-bottom: 48rpx;
    position: relative;
}

.timeline-left {
    width: 110rpx;
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-right: 24rpx;
    position: relative;
    flex-shrink: 0;
}

.timeline-time {
    font-size: 26rpx;
    color: #475569;
    font-weight: 700;
    margin-bottom: 12rpx;
}

.timeline-dot {
    width: 20rpx;
    height: 20rpx;
    border-radius: 50%;
    background: #E2E8F0;
    z-index: 2;
}

.timeline-dot.course {
    background: #3B82F6; /* Blue-500 */
    box-shadow: 0 0 0 8rpx rgba(59, 130, 246, 0.15);
}

.timeline-dot.todo {
    background: #F59E0B; /* Amber-500 */
    box-shadow: 0 0 0 8rpx rgba(245, 158, 11, 0.15);
}

.timeline-line {
    position: absolute;
    top: 56rpx;
    bottom: -56rpx;
    left: 50%;
    transform: translateX(-50%);
    width: 4rpx;
    background: #F1F5F9;
    z-index: 1;
}

.timeline-right {
    flex: 1;
}

/* 卡片样式 */
.card {
    background: #ffffff;
    border-radius: 20rpx;
    padding: 32rpx;
    box-shadow: 0 4rpx 20rpx rgba(0,0,0,0.03);
    border-left: 8rpx solid transparent;
}

.card.course {
    border-left-color: #3B82F6;
}

.card.todo {
    border-left-color: #F59E0B;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20rpx;
}

.card-title {
    font-size: 32rpx;
    font-weight: 700;
    color: #0F172A;
    line-height: 1.4;
    max-width: 80%;
}

.card-tag {
    font-size: 20rpx;
    padding: 6rpx 14rpx;
    border-radius: 8rpx;
    font-weight: 600;
}

.card-tag { /* course tag */
    background: #EFF6FF;
    color: #2563EB;
}

.todo-tag {
    background: #FEF3C7;
    color: #D97706;
}

.card-body {
    display: flex;
    flex-direction: column;
    gap: 12rpx;
}

.info-row {
    font-size: 26rpx;
    color: #64748B;
    display: flex;
    align-items: center;
}

.info-row .icon {
    margin-right: 12rpx;
    font-size: 26rpx;
    opacity: 0.8;
}

/* 操作区 */
.todo-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 16rpx;
}

.action-btn {
    padding: 12rpx 32rpx;
    border-radius: 30rpx;
    font-size: 26rpx;
    font-weight: 600;
}

.complete-btn {
    background: #F0FDF4;
    color: #16A34A;
    border: 2rpx solid #DCFCE7;
}

/* FAB */
.fab-btn {
	position: fixed;
	right: 48rpx;
	bottom: 160rpx; 
	width: 112rpx;
	height: 112rpx;
	border-radius: 50%;
	background: #3B82F6;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 10rpx 30rpx rgba(59, 130, 246, 0.4);
	z-index: 100;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.fab-btn-hover {
    transform: scale(0.92);
    background: #2563EB;
}

.fab-icon {
	color: #ffffff;
	font-size: 64rpx;
	line-height: 1;
}
</style>
