<template>
  <view class="page">
    <!-- 导航系统 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <view class="nav-left clickable" @tap="goBack">
          <text class="nav-back">←</text>
          <text class="nav-title">新建课表</text>
        </view>
      </view>
    </view>

    <!-- 表单内容 -->
    <scroll-view
      scroll-y
      class="form-container"
      :style="{ paddingTop: statusBarHeight + 60 + 'px' }"
    >
      <view class="glass-card mb-xl">
        <view class="card-header">
          <text class="card-title">基础信息</text>
          <text class="card-subtitle">设置你的课表名称和学期起点</text>
        </view>

        <view class="form-group">
          <text class="form-label">课表名称</text>
          <view class="input-wrap">
            <input
              class="form-input"
              v-model="form.name"
              placeholder="例如: 大三下学期"
              placeholder-class="placeholder"
            />
          </view>
        </view>

        <view class="form-group">
          <text class="form-label">开学第一天</text>
          <picker
            mode="date"
            :value="form.semesterStart"
            @change="onDateChange"
          >
            <view
              class="picker-box clickable"
              :class="{ 'has-val': form.semesterStart }"
            >
              <text class="picker-text">{{
                form.semesterStart || "请选择开学日期"
              }}</text>
              <text class="picker-icon">📅</text>
            </view>
          </picker>
          <text class="form-hint"
            >选择开学当周的任意一天，系统会自动对齐到周一</text
          >
        </view>
      </view>

      <view class="glass-card mb-xl">
        <view class="card-header">
          <text class="card-title">作息时间预设</text>
          <text class="card-subtitle"
            >一键生成作息时间表，后续也可手动微调</text
          >
        </view>

        <view class="preset-grid">
          <view
            class="preset-item clickable"
            :class="{ active: form.preset === 'winter' }"
            @tap="selectPreset('winter')"
          >
            <view class="preset-icon">❄️</view>
            <text class="preset-name">冬令时</text>
            <text class="preset-desc">下午课程 13:30 开始</text>
            <view class="active-badge" v-if="form.preset === 'winter'">✓</view>
          </view>

          <view
            class="preset-item clickable"
            :class="{ active: form.preset === 'summer' }"
            @tap="selectPreset('summer')"
          >
            <view class="preset-icon">☀️</view>
            <text class="preset-name">夏令时</text>
            <text class="preset-desc">下午课程 14:00 开始</text>
            <view class="active-badge" v-if="form.preset === 'summer'">✓</view>
          </view>
        </view>
      </view>

      <!-- 底部占位 -->
      <view style="height: 180rpx"></view>
    </scroll-view>

    <!-- 底部大按钮 (Fixed) -->
    <view class="bottom-action">
      <view
        class="submit-btn clickable"
        :class="{ disabled: !canSubmit }"
        @tap="handleSubmit"
      >
        <text class="submit-btn-text">从教务系统导入并创建</text>
      </view>
    </view>
  </view>
</template>

<script>
import { createProfile } from "@/utils/storage.js";
import { getPresetSchedule, saveTimeSchedule } from "@/utils/time.js";

export default {
  data() {
    return {
      statusBarHeight: 0,
      form: {
        name: "",
        semesterStart: "",
        preset: "winter", // summer | winter
      },
    };
  },
  computed: {
    canSubmit() {
      return this.form.name.trim() && this.form.semesterStart;
    },
  },
  onLoad() {
    const sysInfo = uni.getSystemInfoSync();
    this.statusBarHeight = sysInfo.statusBarHeight || 20;

    // 默认设置为今天
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    this.form.semesterStart = `${y}-${m}-${d}`;
  },
  methods: {
    goBack() {
      uni.navigateBack();
    },
    onDateChange(e) {
      this.form.semesterStart = e.detail.value;
    },
    selectPreset(type) {
      this.form.preset = type;
    },
    handleSubmit() {
      if (!this.canSubmit) return;

      // 1. 创建并激活此 Profile
      const profileId = createProfile(
        this.form.name.trim(),
        this.form.semesterStart,
        true,
      );

      // 2. 将对应的预设作息时间写入
      const schedule = getPresetSchedule(this.form.preset);
      saveTimeSchedule(schedule);

      uni.showToast({ title: "配置已生成", icon: "success" });

      // 3. 跳转到导入页 (注意：不能用 navigateBack 因为要走新流程)
      setTimeout(() => {
        uni.redirectTo({
          url: "/pages/import/select-school",
        });
      }, 600);
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

.form-container {
  height: 100vh;
  padding: 0 32rpx;
  box-sizing: border-box;
}

.mb-xl {
  margin-bottom: 40rpx;
}

/* Glass UI Card */
.glass-card {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(16px);
  border-radius: var(--radius-lg);
  padding: 40rpx 32rpx;
  box-shadow: var(--shadow-sm);
  border: 2rpx solid var(--color-bg-white);
}

.card-header {
  margin-bottom: 40rpx;
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

/* Forms */
.form-group {
  margin-bottom: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.form-label {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--color-text);
}

.input-wrap,
.picker-box {
  background: #ffffff;
  border-radius: var(--radius-md);
  padding: 0 32rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  border: 2rpx solid transparent;
  transition: var(--transition-normal);
}

.input-wrap:focus-within,
.picker-box.has-val {
  border-color: rgba(8, 145, 178, 0.3);
}

.form-input {
  flex: 1;
  height: 100%;
  font-size: 30rpx;
  color: var(--color-text);
}

.placeholder {
  color: var(--color-text-muted);
}

.picker-box {
  justify-content: space-between;
}

.picker-text {
  font-size: 30rpx;
  color: var(--color-text-muted);
}

.has-val .picker-text {
  color: var(--color-text);
  font-weight: 500;
}

.picker-icon {
  font-size: 32rpx;
}

.form-hint {
  font-size: 22rpx;
  color: var(--color-text-muted);
  padding-left: 12rpx;
}

/* Presets Grid */
.preset-grid {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.preset-item {
  position: relative;
  background: #ffffff;
  border-radius: var(--radius-md);
  padding: 24rpx 32rpx;
  display: flex;
  align-items: center;
  gap: 24rpx;
  border: 4rpx solid transparent;
}

.preset-item.active {
  border-color: var(--color-primary);
  background: rgba(8, 145, 178, 0.04);
}

.preset-icon {
  font-size: 48rpx;
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg);
  border-radius: 50%;
}

.preset-name {
  font-size: 30rpx;
  font-weight: 700;
  color: var(--color-text);
  display: block;
}

.preset-desc {
  font-size: 24rpx;
  color: var(--color-text-secondary);
  display: block;
  margin-top: 4rpx;
}

.active-badge {
  position: absolute;
  right: 32rpx;
  top: 50%;
  transform: translateY(-50%);
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: 700;
}

/* Bottom Action Fixed */
.bottom-action {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 32rpx 40rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  background: linear-gradient(
    to top,
    var(--color-bg) 70%,
    rgba(236, 254, 255, 0)
  );
  pointer-events: none;
  /* Let clicks pass through gradient */
}

.submit-btn {
  pointer-events: auto;
  height: 100rpx;
  background: linear-gradient(
    135deg,
    var(--color-primary),
    var(--color-primary-dark)
  );
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-md);
}

.submit-btn.disabled {
  background: var(--color-text-muted);
  opacity: 0.6;
  box-shadow: none;
}

.submit-btn-text {
  font-size: 32rpx;
  font-weight: 700;
  color: #ffffff;
}
</style>
