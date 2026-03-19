<template>
  <view class="page">
    <!-- 导航系统 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <view class="nav-left clickable" @tap="goBack">
          <text class="nav-back">←</text>
          <text class="nav-title">编辑课表信息</text>
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
          <text class="card-subtitle">修改课表名称和学期起点</text>
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
        <text class="submit-btn-text">保存修改</text>
      </view>
    </view>
  </view>
</template>

<script>
import { getProfiles, saveProfiles } from "@/utils/storage.js";

export default {
  data() {
    return {
      statusBarHeight: 0,
      profileId: "",
      form: {
        name: "",
        semesterStart: "",
      },
    };
  },
  computed: {
    canSubmit() {
      return this.form.name.trim() && this.form.semesterStart;
    },
  },
  onLoad(options) {
    const sysInfo = uni.getSystemInfoSync();
    this.statusBarHeight = sysInfo.statusBarHeight || 20;

    if (options.id) {
      this.profileId = options.id;
      const profiles = getProfiles();
      const target = profiles.find((p) => p.id === this.profileId);
      if (target) {
        this.form.name = target.name || "";
        this.form.semesterStart = target.settings.semesterStart || "";
      } else {
        uni.showToast({ title: "课表不存在", icon: "none" });
        setTimeout(() => uni.navigateBack(), 1000);
      }
    }
  },
  methods: {
    goBack() {
      uni.navigateBack();
    },
    onDateChange(e) {
      this.form.semesterStart = e.detail.value;
    },
    handleSubmit() {
      if (!this.canSubmit) return;

      const profiles = getProfiles();
      const idx = profiles.findIndex((p) => p.id === this.profileId);
      if (idx !== -1) {
        profiles[idx].name = this.form.name.trim();
        profiles[idx].settings.semesterStart = this.form.semesterStart;
        saveProfiles(profiles);
        uni.showToast({ title: "已保存", icon: "success" });

        // 触发更新
        const app = getApp();
        if (app && app.updateNotification) {
          app.updateNotification();
        }

        setTimeout(() => {
          uni.navigateBack();
        }, 500);
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
