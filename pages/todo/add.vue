<template>
    <view class="page">
        <!-- 顶部导航栏 -->
        <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
            <view class="nav-content">
                <view class="nav-left clickable" @tap="goBack">
                    <text class="nav-back">←</text>
                    <text class="nav-title">新建待办</text>
                </view>
            </view>
        </view>

        <!-- 内容容器 -->
        <view class="form-container" :style="{ paddingTop: statusBarHeight + 50 + 'px' }">
            <view class="form-section">
                <view class="form-item" @tap="focusOn('title')">
                    <text class="label">待办事宜 *</text>
                    <input class="input-box main-input" v-model="todo.title" :focus="focusField === 'title'" @blur="onBlur"
                        placeholder="例如：去图书馆还书" placeholder-class="ph-style" />
                </view>

                <view class="form-item" @tap="focusOn('desc')">
                    <text class="label">详情备注（可选）</text>
                    <textarea class="textarea-box" v-model="todo.desc" :focus="focusField === 'desc'" @blur="onBlur"
                        placeholder="写点什么补充一下..." placeholder-class="ph-style" />
                </view>

                <view class="form-item">
                    <text class="label">计划开始时间 *</text>
                    <view class="picker-box clickable" @tap="openPicker">
                        <text :class="{ 'selected': todo.time }">{{ todo.time ? todo.time : '请选择时间' }}</text>
                        <text class="arr">></text>
                    </view>
                </view>
            </view>

            <view class="form-section">
                <view class="section-title">
                    <text class="label">提醒时间</text>
                </view>

                <view class="quick-tags">
                    <view class="tag clickable" v-for="(item, index) in reminderOptions" :key="index"
                        :class="{ 'active': todo.reminderMinutes === item.val }" @tap="todo.reminderMinutes = item.val">
                        <text>{{ item.text }}</text>
                    </view>
                </view>
                <view class="hint-text" v-if="todo.time && todo.reminderMinutes !== null">
                    我们将于 {{ calculatedReminderTime }} 准时提醒您
                </view>
            </view>

            <view class="bottom-action">
                <view class="btn primary-btn clickable" @tap="saveTodo">
                    <text>创建待办</text>
                </view>
            </view>
        </view>

        <!-- 自定义底部时间选择器 -->
        <view class="picker-mask" :class="{ 'show': showTimePicker }" @tap="showTimePicker = false" @touchmove.stop.prevent>
            <view class="picker-content" :class="{ 'show': showTimePicker }" @tap.stop>
                <view class="picker-header">
                    <text class="picker-cancel" @tap="showTimePicker = false">取消</text>
                    <text class="picker-title">选择时间</text>
                    <text class="picker-confirm" @tap="confirmTime">确定</text>
                </view>
                <picker-view class="picker-view" :value="tempPickerValue" @change="onPickerChange" indicator-style="height: 50px;">
                    <picker-view-column>
                        <view class="picker-item" v-for="(item, index) in hours" :key="index">{{ item }} 时</view>
                    </picker-view-column>
                    <picker-view-column>
                        <view class="picker-item" v-for="(item, index) in minutes" :key="index">{{ item }} 分</view>
                    </picker-view-column>
                </picker-view>
            </view>
        </view>
    </view>
</template>

<script>
import { addTodo } from '@/utils/storage.js';
import { scheduleReminder } from '@/utils/notification.js';

export default {
    data() {
        return {
            statusBarHeight: 0,
            todo: {
                title: '',
                desc: '',
                time: '', /* HH:mm */
                reminderMinutes: 15
            },
            reminderOptions: [
                { text: '准点', val: 0 },
                { text: '提前5分', val: 5 },
                { text: '提前15分', val: 15 },
                { text: '提前30分', val: 30 }
            ],
            focusField: null,
            // 自定义 Picker 相关
            showTimePicker: false,
            hours: Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')),
            minutes: Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')),
            tempPickerValue: [12, 0]
        }
    },
    computed: {
        calculatedReminderTime() {
            if (!this.todo.time) return '';
            const [h, m] = this.todo.time.split(':').map(Number);
            let totalMins = h * 60 + m - this.todo.reminderMinutes;
            if (totalMins < 0) totalMins += 24 * 60; // 跨天边界处理

            const rh = Math.floor(totalMins / 60);
            const rm = totalMins % 60;
            return `${rh.toString().padStart(2, '0')}:${rm.toString().padStart(2, '0')}`;
        }
    },
    onLoad() {
        const sysInfo = uni.getSystemInfoSync();
        this.statusBarHeight = sysInfo.statusBarHeight || 20;
    },
    methods: {
        goBack() {
            uni.navigateBack();
        },
        focusOn(field) {
            this.focusField = field;
        },
        onBlur() {
            this.focusField = null;
        },
        openPicker() {
            // 如果已有值，则滚动到对应位置；否则默认当前时间
            if (this.todo.time) {
                const [h, m] = this.todo.time.split(':').map(Number);
                this.tempPickerValue = [h, m];
            } else {
                const now = new Date();
                this.tempPickerValue = [now.getHours(), now.getMinutes()];
            }
            this.showTimePicker = true;
            // 隐藏键盘
            uni.hideKeyboard();
        },
        onPickerChange(e) {
            this.tempPickerValue = e.detail.value;
        },
        confirmTime() {
            const h = this.hours[this.tempPickerValue[0]];
            const m = this.minutes[this.tempPickerValue[1]];
            this.todo.time = `${h}:${m}`;
            this.showTimePicker = false;
        },
        selectReminder(val) {
            this.todo.reminderMinutes = val;
        },
        saveTodo() {
            if (!this.todo.title.trim()) {
                uni.showToast({ title: '请输入待办事项', icon: 'none' });
                return;
            }
            if (!this.todo.time) {
                uni.showToast({ title: '请选择开始时间', icon: 'none' });
                return;
            }

            const today = new Date();
            const dateStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

            const standardizedDateStr = `${today.getFullYear()}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getDate().toString().padStart(2, '0')}`;
            const targetTimestamp = new Date(`${standardizedDateStr} ${this.todo.time}:00`).getTime();

            const newTodo = {
                id: Date.now().toString(),
                title: this.todo.title,
                desc: this.todo.desc,
                time: this.todo.time,
                date: dateStr,
                reminderMinutes: this.todo.reminderMinutes,
                status: 0,
                targetTimestamp
            };

            addTodo(newTodo);

            const reminderTimestamp = targetTimestamp - (this.todo.reminderMinutes * 60 * 1000);
            scheduleReminder(newTodo, reminderTimestamp);

            uni.showToast({ title: '创建成功', icon: 'success' });
            setTimeout(() => {
                uni.navigateBack();
            }, 1000);
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
    display: flex;
    align-items: center;
    height: 100rpx;
    padding: 0 32rpx;
}

.nav-left {
    display: flex;
    align-items: center;
    gap: 16rpx;
}

.nav-back {
    font-size: 40rpx;
    color: var(--color-text);
    font-weight: 600;
}

.nav-title {
    font-size: 34rpx;
    color: var(--color-text);
    font-weight: 700;
}

.form-container {
    padding: 0 32rpx 32rpx;
    box-sizing: border-box;
}

.form-section {
    background: #ffffff;
    border-radius: var(--radius-md);
    padding: 32rpx;
    margin-bottom: 32rpx;
    position: relative;
}

.form-item {
    margin-bottom: 36rpx;
}

.form-item:last-child {
    margin-bottom: 0;
}

.label {
    display: block;
    font-size: 28rpx;
    color: #475569;
    /* Slate-600 */
    font-weight: 600;
    margin-bottom: 16rpx;
}

.input-box,
.textarea-box,
.picker-box {
    width: 100%;
    background: #ffffff;
    border-radius: var(--radius-sm);
    padding: 0 24rpx;
    height: 96rpx;
    font-size: 30rpx;
    color: #0F172A;
    box-sizing: border-box;
    border: 2rpx solid #E2E8F0;
    transition: border-color 0.2s;
    display: block;
}

.main-input {
    font-size: 34rpx;
    height: 120rpx;
}

.input-box:focus,
.textarea-box:focus {
    border-color: #3B82F6;
    background: #FFFFFF;
}

.textarea-box {
    height: 180rpx;
    padding: 24rpx;
}

.ph-style {
    color: #94A3B8;
}

.picker-box {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.picker-box text {
    color: #94A3B8;
}

.picker-box text.selected {
    color: #0F172A;
}

.picker-box .arr {
    color: #CBD5E1;
    font-weight: bold;
}

/* 提醒设置区 */
.quick-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 20rpx;
    margin-top: 24rpx;
}

.tag {
    padding: 16rpx 28rpx;
    background: #F1F5F9;
    border-radius: 12rpx;
    font-size: 26rpx;
    color: #64748B;
    border: 2rpx solid transparent;
    transition: all 0.2s;
}

.tag.active {
    background: #EFF6FF;
    color: #2563EB;
    border-color: #93C5FD;
    font-weight: 600;
}

.hint-text {
    margin-top: 20rpx;
    font-size: 24rpx;
    color: #10B981;
    /* Emerald-500 */
    background: #ECFDF5;
    padding: 16rpx;
    border-radius: 8rpx;
}

/* 底部操作 */
.bottom-action {
    margin-top: 40rpx;
    padding-bottom: 40rpx;
}

.btn {
    width: 100%;
    height: 96rpx;
    border-radius: 48rpx;
    display: flex;
    align-items: center;
    justify-content: center;
}

.primary-btn {
    background: #3B82F6;
    color: #FFFFFF;
    font-size: 32rpx;
    font-weight: 700;
    box-shadow: 0 8rpx 24rpx rgba(59, 130, 246, 0.3);
}

/* ========== 自定义 Picker 样式 ========== */
.picker-mask {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(4px);
    z-index: 999;
    visibility: hidden;
    opacity: 0;
    transition: all 0.3s ease;
}

.picker-mask.show {
    visibility: visible;
    opacity: 1;
}

.picker-content {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    background: #FFFFFF;
    border-radius: 40rpx 40rpx 0 0;
    padding-bottom: env(safe-area-inset-bottom);
    transform: translateY(100%);
    transition: transform 0.3s cubic-bezier(0.25, 1, 0.5, 1);
}

.picker-content.show {
    transform: translateY(0);
}

.picker-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 32rpx 40rpx;
    border-bottom: 2rpx solid #F1F5F9;
}

.picker-cancel {
    font-size: 30rpx;
    color: #64748B;
}

.picker-title {
    font-size: 32rpx;
    font-weight: 700;
    color: #0F172A;
}

.picker-confirm {
    font-size: 30rpx;
    color: #3B82F6;
    font-weight: 700;
}

.picker-view {
    width: 100%;
    height: 480rpx;
}

.picker-item {
    line-height: 50px;
    text-align: center;
    font-size: 34rpx;
    font-weight: 500;
    color: #0F172A;
}
</style>
