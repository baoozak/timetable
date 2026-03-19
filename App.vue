<script>
import { getCourses, getSettings } from '@/utils/storage.js'
import { getNextClassInfo } from '@/utils/next-class.js'
import { showPersistentNotification, hideNotification } from '@/utils/notification.js'
import { calculateCurrentWeek } from '@/utils/time.js'

export default {
	globalData: {
		notificationTimer: null
	},
	onLaunch: function () {
		console.log('App Launch')
		this.startNotificationService()
	},
	onShow: function () {
		console.log('App Show')
		// 切换到前台时立即刷新一次
		this.updateNotification()
	},
	onHide: function () {
		console.log('App Hide')
	},
	methods: {
		startNotificationService() {
			this.updateNotification()
			// 每分钟轮询更新一次通知栏剩余时间
			this.globalData.notificationTimer = setInterval(() => {
				this.updateNotification()
			}, 60000)
		},
		updateNotification() {
			const settings = getSettings()
			if (settings.enableNotification === false) {
				hideNotification()
				return
			}

			// 1. 获取所有课程
			const allCourses = getCourses()
			if (!allCourses || allCourses.length === 0) return

			const now = new Date()
			const semesterStart = settings.semesterStart

			// 2. 计算真实周次（可能为 0 或负数，表示开学前）
			let currentWeek = settings.currentWeek || 1
			if (semesterStart) {
				currentWeek = calculateCurrentWeek(semesterStart, now)
			}

			// 3. 判断是否在开学前（直接比较日期，而非仅依赖周次）
			//    因为 calculateCurrentWeek 按周一对齐，开学日若不是周一，
			//    同一周里开学日之前的天数也会被算成第 1 周，必须用日期兜底。
			if (semesterStart) {
				const startDate = new Date(semesterStart)
				startDate.setHours(0, 0, 0, 0)
				const today = new Date(now)
				today.setHours(0, 0, 0, 0)
				if (today < startDate) {
					const diffDays = Math.ceil((startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
					showPersistentNotification(
						'📅 学期尚未开始',
						`距离开学还有 ${diffDays} 天，好好享受假期吧！`,
						'假期中'
					)
					return
				}
			}

			// 4. 判断是否所有课程已结束
			let maxCourseWeek = 0
			if (allCourses.length > 0) {
				maxCourseWeek = Math.max(...allCourses.map(c => Math.max(...(c.weeks || [0]))))
			}
			const todayDay = now.getDay() || 7
			if (maxCourseWeek > 0) {
				if (currentWeek > maxCourseWeek) {
					// 已超过课表最大周
					showPersistentNotification(
						'🎓 本学期课程已结束',
						'所有课程均已完成，祝复习顺利！',
						'已结课'
					)
					return
				}
				if (currentWeek === maxCourseWeek) {
					// 在最后一个课程周内，检查从今天起是否还有剩余课程
					const hasRemainingCourses = allCourses.some(c => {
						if (!c.weeks.includes(currentWeek)) return false
						// c.day >= todayDay 表示这门课在今天或之后的天
						return c.day >= todayDay
					})
					if (!hasRemainingCourses) {
						showPersistentNotification(
							'🎓 本学期课程已结束',
							'所有课程均已完成，祝复习顺利！',
							'已结课'
						)
						return
					}
				}
			}

			// 5. 正常逻辑：筛选今天的课
			const todayCourses = allCourses.filter(c => {
				if (c.day !== todayDay) return false
				if (!c.weeks.includes(currentWeek)) return false
				return true
			})

			// 6. 计算下一节课状态
			const status = getNextClassInfo(todayCourses)

			// 7. 发送/更新原生通知
			showPersistentNotification(status.title, status.content, status.subText)
		}
	}
}
</script>

<style>
/* ========== Skill 设计系统：School Timetable ========== */
/* 配色: Fresh cyan + clean green (ui-ux-pro-max) */
/* 风格: Micro-interactions */
/* 字体: Baloo 2 / system fallback (教育/友好风格) */

@import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;500;600;700&display=swap');

page {
	/* ---- 主题色 (Skill 推荐) ---- */
	--color-primary: #0891B2;
	--color-primary-light: #22D3EE;
	--color-primary-dark: #0E7490;
	--color-cta: #22C55E;
	--color-cta-dark: #16A34A;
	--color-bg: #ECFEFF;
	--color-bg-white: #FFFFFF;
	--color-card: #FFFFFF;
	--color-text: #164E63;
	--color-text-secondary: #4B8B9B;
	--color-text-muted: #94A3B8;
	--color-border: #B2EBF2;
	--color-danger: #EF4444;
	--color-success: #22C55E;

	/* ---- 字体 (Skill 推荐: Baloo 2 / Comic Neue) ---- */
	--font-family: 'Baloo 2', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Helvetica Neue', sans-serif;

	/* ---- 圆角 & 阴影 ---- */
	--radius-sm: 12rpx;
	--radius-md: 20rpx;
	--radius-lg: 28rpx;
	--radius-full: 999rpx;
	--shadow-sm: 0 2rpx 12rpx rgba(8, 145, 178, 0.08);
	--shadow-md: 0 6rpx 24rpx rgba(8, 145, 178, 0.12);
	--shadow-lg: 0 12rpx 40rpx rgba(8, 145, 178, 0.16);

	/* ---- 动画 (Skill: Micro-interactions, 50-100ms) ---- */
	--transition-fast: all 80ms ease;
	--transition-normal: all 150ms ease;
	--transition-smooth: all 250ms cubic-bezier(0.4, 0, 0.2, 1);

	font-family: var(--font-family);
	background-color: var(--color-bg);
	color: var(--color-text);
	font-size: 28rpx;
	line-height: 1.5;
}

/* ========== 全局重置 ========== */
view,
text,
image {
	box-sizing: border-box;
}

/* ========== 全局微交互 (Skill: Micro-interactions) ========== */
.clickable {
	transition: var(--transition-fast);
}

.clickable:active {
	transform: scale(0.96);
	opacity: 0.85;
}
</style>
