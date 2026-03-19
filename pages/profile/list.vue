<template>
  <view class="page">
    <!-- 导航系统 -->
    <view class="nav-bar" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="nav-content">
        <view class="nav-left clickable" @tap="goBack">
          <text class="nav-back">←</text>
          <text class="nav-title">我的课表</text>
        </view>
      </view>
    </view>

    <!-- 列表内容 -->
    <scroll-view scroll-y class="list-container" :style="{ paddingTop: statusBarHeight + 60 + 'px' }">
      <view class="empty-state" v-if="profiles.length === 0">
        <text class="empty-icon">📂</text>
        <text class="empty-title">还没有课表</text>
        <text class="empty-desc">点击下方按钮创建一个吧</text>
      </view>

      <view class="profile-list" v-else>
        <view class="profile-card clickable" :class="{ 'is-active': p.id === activeId }" v-for="p in profiles"
          :key="p.id" @tap="handleSwitch(p.id)">
          <view class="card-left">
            <view class="status-indicator">
              <view class="dot"></view>
            </view>
            <view class="info-group">
              <text class="profile-name">{{ p.name }}</text>
              <text class="profile-meta">
                开学日期: {{ p.settings.semesterStart || "未设置" }} ·
                {{ p.courses.length }} 门课程
              </text>
            </view>
          </view>
          <view class="card-right">
            <view class="action-btn edit-btn clickable" @tap.stop="handleEdit(p)">
              <text class="action-icon">编辑</text>
            </view>
            <view class="action-btn reimport-btn clickable" @tap.stop="handleReimport(p)">
              <text class="action-icon reimport-text">重新导入</text>
            </view>
            <view class="action-btn delete-btn clickable" @tap.stop="handleDelete(p)">
              <text class="action-icon delete-text">删除</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 底部占位 -->
      <view style="height: 180rpx"></view>
    </scroll-view>

    <!-- 底部大按钮 (Fixed) -->
    <view class="bottom-action">
      <view class="create-btn clickable" @tap="goCreate">
        <text class="create-icon">+</text>
        <text class="create-text">新建课表</text>
      </view>
    </view>
  </view>
</template>

<script>
import {
  getProfiles,
  getActiveProfileId,
  setActiveProfileId,
  deleteProfile,
} from "@/utils/storage.js";

export default {
  data() {
    return {
      statusBarHeight: 0,
      profiles: [],
      activeId: null,
    };
  },
  onLoad() {
    const sysInfo = uni.getSystemInfoSync();
    this.statusBarHeight = sysInfo.statusBarHeight || 20;
  },
  onShow() {
    this.loadData();
  },
  methods: {
    loadData() {
      this.profiles = getProfiles();
      this.activeId = getActiveProfileId();
    },
    goBack() {
      uni.navigateBack();
    },
    goCreate() {
      uni.navigateTo({
        url: "/pages/profile/create",
      });
    },
    handleSwitch(id) {
      if (this.activeId === id) return;
      setActiveProfileId(id);
      this.activeId = id;
      uni.showToast({ title: "已切换", icon: "success", duration: 1000 });

      // 触发 App 实例更新通知
      const app = getApp();
      if (app && app.updateNotification) {
        app.updateNotification();
      }

      setTimeout(() => {
        uni.navigateBack();
      }, 500);
    },
    handleEdit(profile) {
      uni.navigateTo({
        url: `/pages/profile/edit?id=${profile.id}`,
      });
    },
    // 重新导入课表
    handleReimport(profile) {
      uni.showModal({
        title: "重新导入",
        content: `确定要重新导入课表 "${profile.name}" 的课程数据吗？导入后将覆盖当前课程。`,
        confirmColor: "#0891B2",
        success: (res) => {
          if (res.confirm) {
            // 先切换到目标课表
            setActiveProfileId(profile.id);
            this.activeId = profile.id;
            // 跳转到导入页面
            uni.navigateTo({
              url: "/pages/import/import",
            });
          }
        },
      });
    },
    handleDelete(profile) {
      uni.showModal({
        title: "删除确认",
        content: `确定要删除课表 "${profile.name}" 吗？此操作不可恢复。`,
        confirmColor: "#EF4444",
        success: (res) => {
          if (res.confirm) {
            deleteProfile(profile.id);
            this.loadData();
            uni.showToast({ title: "已删除", icon: "none" });

            // 触发通知更新
            const app = getApp();
            if (app && app.updateNotification) {
              app.updateNotification();
            }
          }
        },
      });
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

.list-container {
  height: 100vh;
  padding: 0 32rpx;
  box-sizing: border-box;
}

/* Empty State */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 200rpx;
}

.empty-icon {
  font-size: 120rpx;
  margin-bottom: 32rpx;
  opacity: 0.8;
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
}

/* Profile List */
.profile-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  margin-top: 16rpx;
}

.profile-card {
  background: #ffffff;
  border-radius: var(--radius-lg);
  padding: 32rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 4rpx solid transparent;
  box-shadow: var(--shadow-sm);
  transition: var(--transition-smooth);
}

.profile-card.is-active {
  border-color: var(--color-primary);
  background: rgba(8, 145, 178, 0.03);
}

.card-left {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 24rpx;
}

.status-indicator {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: var(--color-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.is-active .status-indicator {
  background: var(--color-primary);
}

.dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: var(--color-border);
}

.is-active .dot {
  background: #ffffff;
}

.info-group {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.profile-name {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--color-text);
}

.profile-meta {
  font-size: 24rpx;
  color: var(--color-text-secondary);
}

.card-right {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.action-btn {
  padding: 12rpx 20rpx;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.edit-btn {
  background: rgba(8, 145, 178, 0.1);
}

.reimport-btn {
  background: rgba(34, 197, 94, 0.1);
}

.delete-btn {
  background: rgba(239, 68, 68, 0.1);
}

.action-icon {
  font-size: 24rpx;
  font-weight: 600;
  color: var(--color-primary);
}

.delete-text {
  color: var(--color-danger);
}

.reimport-text {
  color: #16a34a;
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

.create-btn {
  pointer-events: auto;
  height: 100rpx;
  background: var(--color-text);
  /* 用深色区分于正常的主按钮 */
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: var(--shadow-md);
}

.create-icon {
  font-size: 40rpx;
  font-weight: 400;
  color: #ffffff;
  margin-top: -4rpx;
}

.create-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #ffffff;
}
</style>
