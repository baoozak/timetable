<template>
  <view class="page">
    <view class="search-bar">
      <input class="search-input" type="text" v-model="keyword" placeholder="搜索学校名称" />
    </view>

    <scroll-view scroll-y class="school-list">
      <view class="section-title">支持导入的高校</view>
      <view 
        class="school-item clickable" 
        v-for="school in filteredSchools" 
        :key="school.id"
        @click="selectSchool(school)"
      >
        <text class="school-name">{{ school.name }}</text>
        <text class="school-type">{{ getTypeLabel(school.type) }}</text>
      </view>

      <view v-if="filteredSchools.length === 0" class="empty-state">
        <text class="empty-text">未找到相关学校</text>
      </view>

      <view class="section-title mt">没有你的学校？</view>
      <view class="manual-input-card">
        <text class="manual-desc">请选择你的教务系统类型，并尝试手动输入相关网址进行导入。</text>
        <view class="picker-container">
          <text class="picker-label">系统类型</text>
          <picker class="system-picker" @change="onSystemChange" :value="manualTypeIndex" :range="adapters" range-key="name">
            <view class="picker-value">{{ adapters.length > 0 ? adapters[manualTypeIndex].name : '请选择系统类型' }}</view>
          </picker>
        </view>
        <input class="manual-input" type="text" v-model="manualUrl" placeholder="如: https://jw.xxx.edu.cn/" />
        <button class="manual-btn" @click="handleManualSubmit">尝试导入</button>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import schoolsData from "@/utils/schools.json";
import { getAllAdapters } from "@/utils/parsers/index.js";

export default {
  data() {
    return {
      keyword: "",
      schools: schoolsData,
      manualUrl: "",
      manualTypeIndex: 0,
      adapters: []
    };
  },
  computed: {
    filteredSchools() {
      if (!this.keyword) return this.schools;
      return this.schools.filter(s => s.name.includes(this.keyword));
    }
  },
  created() {
    this.adapters = getAllAdapters();
  },
  methods: {
    getTypeLabel(typeId) {
      const adapter = this.adapters.find(a => a.id === typeId);
      return adapter ? adapter.name : '未知系统';
    },
    selectSchool(school) {
        uni.navigateTo({
            url: `/pages/import/import?url=${encodeURIComponent(school.url)}&type=${school.type}`
        });
    },
    onSystemChange(e) {
      this.manualTypeIndex = e.detail.value;
    },
    handleManualSubmit() {
        if (!this.manualUrl) {
            uni.showToast({ title: "请输入教务系统网址", icon: "none" });
            return;
        }
        let url = this.manualUrl;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        
        const selectedAdapter = this.adapters[this.manualTypeIndex];
        if (!selectedAdapter) {
            uni.showToast({ title: "请选择有效系统类型", icon: "none" });
            return;
        }
        
        uni.navigateTo({
            url: `/pages/import/import?url=${encodeURIComponent(url)}&type=${selectedAdapter.id}`
        });
    }
  }
};
</script>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #ECFEFF;
}

.search-bar {
  padding: 20rpx 32rpx;
  background-color: #ffffff;
  box-shadow: 0 4rpx 12rpx rgba(8, 145, 178, 0.05);
  z-index: 10;
}

.search-input {
  background-color: #F1F5F9;
  height: 72rpx;
  border-radius: 36rpx;
  padding: 0 32rpx;
  font-size: 28rpx;
  color: #164E63;
}

.school-list {
  flex: 1;
  padding: 24rpx 32rpx;
  box-sizing: border-box;
  width: 100%;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #0891B2;
  margin-bottom: 20rpx;
  margin-left: 8rpx;
}

.section-title.mt {
  margin-top: 48rpx;
}

.school-item {
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 4rpx 16rpx rgba(8, 145, 178, 0.04);
  gap: 16rpx;
}

.school-name {
  font-size: 32rpx;
  font-weight: 500;
  color: #164E63;
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.school-type {
  font-size: 24rpx;
  color: #0891B2;
  background-color: #E0F2FE;
  padding: 6rpx 16rpx;
  border-radius: 12rpx;
  flex-shrink: 0;
  max-width: 60%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-state {
  padding: 60rpx 0;
  text-align: center;
}

.empty-text {
  color: #94A3B8;
  font-size: 28rpx;
}

.manual-input-card {
  background-color: #ffffff;
  border-radius: 20rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(8, 145, 178, 0.04);
}

.manual-desc {
  font-size: 26rpx;
  color: #64748B;
  display: block;
  margin-bottom: 24rpx;
  line-height: 1.5;
}

.picker-container {
  display: flex;
  align-items: center;
  background-color: #F8FAFC;
  height: 80rpx;
  border-radius: 16rpx;
  padding: 0 24rpx;
  margin-bottom: 24rpx;
}

.picker-label {
  font-size: 28rpx;
  color: #64748B;
  margin-right: 16rpx;
}

.system-picker {
  flex: 1;
}

.picker-value {
  font-size: 28rpx;
  color: #0891B2;
  font-weight: 500;
}

.manual-input {
  background-color: #F1F5F9;
  height: 80rpx;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  margin-bottom: 24rpx;
}

.manual-btn {
  background-color: #0891B2;
  color: #ffffff;
  border-radius: 16rpx;
  font-size: 30rpx;
  height: 80rpx;
  line-height: 80rpx;
}

.clickable:active {
  opacity: 0.8;
  transform: scale(0.98);
}
</style>
