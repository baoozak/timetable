<template>
  <view class="page">
    <!-- 顶部导航栏 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <view class="nav-left clickable" @tap="goBack">
          <text class="nav-back">←</text>
          <text class="nav-title">编辑作息时间</text>
        </view>
      </view>
    </view>

    <!-- 内容区域 -->
    <scroll-view scroll-y class="content-scroll" :style="{ paddingTop: statusBarHeight + 60 + 'px' }">
      <view class="glass-card mb-lg">
        <view class="card-header">
          <text class="card-title">快捷设置</text>
          <text class="card-subtitle">统一调整课程时长</text>
        </view>
        <view class="setting-row" @tap="sameLength = !sameLength">
          <text class="setting-label">所有课程时长相同</text>
          <view class="toggle-switch" :class="{ 'is-on': sameLength }">
            <view class="toggle-knob"></view>
          </view>
        </view>
        <view class="setting-row no-border" v-if="sameLength">
          <text class="setting-label">课程时长</text>
          <view class="duration-wrap">
            <picker mode="multiSelector" :range="durationRange" :value="durationIdx" @change="onDurationChange">
              <view class="duration-picker clickable">
                <text class="duration-text">{{ duration }} 分钟</text>
                <text class="picker-icon">›</text>
              </view>
            </picker>
          </view>
        </view>
      </view>

      <view class="tip-bar">
        <text class="tip-text">请注意时间采用 24 小时制 ！</text>
      </view>

      <view class="glass-card schedule-list">
        <view class="card-header">
          <text class="card-title">单节课时间</text>
        </view>
        <view class="schedule-item" v-for="(item, idx) in schedule" :key="idx">
          <view class="item-left">
            <text class="item-label"> 第 {{ idx + 1 }} 节</text>
          </view>
          <view class="time-inputs">
            <view class="time-box active-box clickable" @tap="openPicker(idx, 'start')">
                <text class="time-text">{{ item.start }}</text>
            </view>
            <text class="time-sep">-</text>
            <view class="time-box muted-box" v-if="sameLength">
              <text class="time-text muted-text">{{ item.end }}</text>
            </view>
            <view v-else class="time-box active-box clickable" @tap="openPicker(idx, 'end')">
                <text class="time-text">{{ item.end }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 自定义底部时间选择器 -->
      <view class="picker-mask" :class="{ 'show': showTimePicker }" @tap="showTimePicker = false" @touchmove.stop.prevent>
        <view class="picker-content" :class="{ 'show': showTimePicker }" @tap.stop>
            <view class="picker-header">
                <text class="picker-cancel" @tap="showTimePicker = false">取消</text>
                <text class="picker-title">选择{{ currentEditingType === 'start' ? '开始' : '结束' }}时间</text>
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

      <!-- 底部占位 -->
      <view style="height: 160rpx"></view>
    </scroll-view>

    <!-- 底部大按钮 (Fixed) -->
    <view class="bottom-action">
      <view class="submit-btn clickable" @tap="handleSave">
        <text class="submit-btn-text">保存作息时间</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getTimeSchedule, saveTimeSchedule } from "@/utils/time.js";
import { getSettings } from "@/utils/storage.js";

export default {
  data() {
    return {
      statusBarHeight: 0,
      schedule: [],
      nodesPerDay: 12,
      sameLength: true,
      duration: 40,
      durationRange: [Array.from({ length: 41 }, (_, i) => i + 20 + "")],
      durationIdx: [20],
      // 自定义 Picker 相关
      showTimePicker: false,
      hours: Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')),
      minutes: Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')),
      tempPickerValue: [8, 0],
      currentEditingIdx: 0,
      currentEditingType: 'start' // 'start' or 'end'
    };
  },
  onLoad() {
    const sysInfo = uni.getSystemInfoSync();
    this.statusBarHeight = sysInfo.statusBarHeight || 20;

    const settings = getSettings();
    this.nodesPerDay = settings.nodesPerDay || 12;

    const saved = getTimeSchedule();
    this.schedule = [];
    for (let i = 0; i < this.nodesPerDay; i++) {
      if (saved[i]) {
        this.schedule.push({ ...saved[i] });
      } else {
        this.schedule.push({ start: "08:00", end: "08:40" });
      }
    }
    this.durationIdx = [this.duration - 20];
  },
  methods: {
    goBack() {
      uni.navigateBack();
    },
    addMinutes(timeStr, mins) {
      const [h, m] = timeStr.split(":").map(Number);
      const total = h * 60 + m + mins;
      const nh = Math.floor(total / 60) % 24;
      const nm = total % 60;
      return `${String(nh).padStart(2, "0")}:${String(nm).padStart(2, "0")}`;
    },
    openPicker(idx, type) {
      this.currentEditingIdx = idx;
      this.currentEditingType = type;
      const currentTime = this.schedule[idx][type];
      const [h, m] = currentTime.split(':').map(Number);
      this.tempPickerValue = [h, m];
      this.showTimePicker = true;
    },
    onPickerChange(e) {
      this.tempPickerValue = e.detail.value;
    },
    confirmTime() {
      const h = this.hours[this.tempPickerValue[0]];
      const m = this.minutes[this.tempPickerValue[1]];
      const timeVal = `${h}:${m}`;
      
      const idx = this.currentEditingIdx;
      if (this.currentEditingType === 'start') {
        this.schedule[idx].start = timeVal;
        if (this.sameLength) {
          this.schedule[idx].end = this.addMinutes(timeVal, this.duration);
        }
      } else {
        this.schedule[idx].end = timeVal;
      }
      this.showTimePicker = false;
    },
    onDurationChange(e) {
      const val = parseInt(this.durationRange[0][e.detail.value[0]]);
      this.duration = val;
      this.durationIdx = [val - 20];
      this.recalcAllEnd();
    },
    recalcAllEnd() {
      for (let i = 0; i < this.schedule.length; i++) {
        this.schedule[i].end = this.addMinutes(
          this.schedule[i].start,
          this.duration,
        );
      }
    },
    handleSave() {
      saveTimeSchedule(this.schedule);
      uni.showToast({ title: "作息已保存", icon: "success" });

      const app = getApp();
      if (app && app.updateNotification) {
        app.updateNotification();
      }

      setTimeout(() => {
        uni.navigateBack();
      }, 500);
    },
  },
  watch: {
    sameLength(val) {
      if (val) {
        this.recalcAllEnd();
      }
    },
  },
};
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: var(--color-bg);
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

.content-scroll {
  height: 100vh;
  padding: 0 32rpx;
  box-sizing: border-box;
}

.mb-lg {
  margin-bottom: 32rpx;
}

/* Glass UI Card */
.glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(16px);
  border-radius: var(--radius-lg);
  padding: 32rpx;
  box-shadow: var(--shadow-sm);
  border: 2rpx solid var(--color-bg-white);
}

.card-header {
  margin-bottom: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.card-title {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--color-text);
}

.card-subtitle {
  font-size: 24rpx;
  color: var(--color-text-secondary);
}

/* Settings Toggle */
.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 0;
  border-bottom: 2rpx solid rgba(0, 0, 0, 0.05);
}

.setting-row.no-border {
  border-bottom: none;
  padding-bottom: 8rpx;
}

.setting-label {
  font-size: 28rpx;
  color: var(--color-text);
  font-weight: 600;
}

.toggle-switch {
  width: 96rpx;
  height: 52rpx;
  border-radius: 99rpx;
  background-color: var(--color-border);
  position: relative;
  transition: all 0.3s ease;
}

.toggle-switch.is-on {
  background-color: var(--color-primary);
}

.toggle-knob {
  width: 44rpx;
  height: 44rpx;
  background-color: #ffffff;
  border-radius: 50%;
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  box-shadow: 0 4rpx 8rpx rgba(0, 0, 0, 0.1);
  transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.toggle-switch.is-on .toggle-knob {
  transform: translateX(44rpx);
}

.duration-picker {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: var(--color-bg);
  padding: 12rpx 24rpx;
  border-radius: var(--radius-sm);
}

.duration-text {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--color-primary);
}

.picker-icon {
  font-size: 32rpx;
  color: var(--color-text-muted);
  line-height: 1;
}

/* Tip Bar */
.tip-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 24rpx 32rpx;
  background: rgba(8, 145, 178, 0.08);
  border-radius: var(--radius-md);
  margin-bottom: 32rpx;
}

.tip-text {
  font-size: 24rpx;
  color: var(--color-primary-dark);
  font-weight: 500;
}

/* Schedule List */
.schedule-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 0;
  border-bottom: 2rpx solid rgba(0, 0, 0, 0.05);
}

.schedule-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.item-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.node-badge {
  width: 44rpx;
  height: 44rpx;
  background: var(--color-bg);
  color: var(--color-text-secondary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  font-weight: 700;
}

.item-label {
  font-size: 28rpx;
  color: var(--color-text);
  font-weight: 600;
}

.time-inputs {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.time-box {
  padding: 12rpx 20rpx;
  border-radius: var(--radius-sm);
  min-width: 110rpx;
  text-align: center;
  border: 2rpx solid transparent;
  transition: all 0.2s ease;
}

.active-box {
  background: #ffffff;
  border-color: rgba(8, 145, 178, 0.15);
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.03);
}

.active-box.clickable:active {
  background: var(--color-bg);
}

.muted-box {
  background: transparent;
}

.time-text {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--color-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.muted-text {
  color: var(--color-text-muted);
}

.time-sep {
  font-size: 28rpx;
  color: var(--color-text-muted);
}

/* Bottom Action Fixed */
.bottom-action {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 32rpx 40rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  background: linear-gradient(to top,
      var(--color-bg) 70%,
      rgba(236, 254, 255, 0));
  pointer-events: none;
}

.submit-btn {
  pointer-events: auto;
  height: 100rpx;
  background: linear-gradient(135deg,
      var(--color-primary),
      var(--color-primary-dark));
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-md);
}

.submit-btn-text {
  font-size: 32rpx;
  font-weight: 700;
  color: #ffffff;
}

/* ========== 自定义 Picker 样式 ========== */
.picker-mask {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.4);
    backdrop-filter: blur(8px);
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
