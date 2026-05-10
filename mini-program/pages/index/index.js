const api = require('../../utils/api');

Page({
  data: {
    inputContext: '',
    quickReplies: [],
    quickStrategy: '',
    currentGoal: '礼貌维持关系',
    currentEnergy: '正常',
    goalOptions: [],
    energyOptions: [],
    recentProfiles: [],
  },

  onLoad() {
    this.loadOptions();
    this.loadProfiles();
  },

  onShow() {
    this.loadProfiles();
  },

  async loadOptions() {
    try {
      const [goals, energy] = await Promise.all([
        api.getGoals(),
        api.getEnergyOptions(),
      ]);
      this.setData({ goalOptions: goals, energyOptions: energy });
    } catch (e) {
      console.error('load options failed', e);
    }
  },

  async loadProfiles() {
    try {
      const profiles = await api.getProfiles();
      this.setData({ recentProfiles: profiles.slice(0, 5) });
    } catch (e) {
      console.error('load profiles failed', e);
    }
  },

  onInputContext(e) {
    this.setData({ inputContext: e.detail.value });
  },

  async quickGenerate() {
    const { inputContext, currentGoal, currentEnergy } = this.data;
    if (!inputContext.trim()) {
      wx.showToast({ title: '请输入内容', icon: 'none' });
      return;
    }
    wx.showLoading({ title: '生成中...' });
    try {
      const res = await api.generateReplies({
        context: inputContext,
        mode: 'keyboard',
        currentGoal,
        energyLevel: currentEnergy,
      });
      this.setData({
        quickReplies: res.suggestions,
        quickStrategy: res.strategy,
      });
    } catch (e) {
      wx.showToast({ title: '生成失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  clearInput() {
    this.setData({ inputContext: '', quickReplies: [], quickStrategy: '' });
  },

  copyReply(e) {
    const text = e.currentTarget.dataset.text;
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' });
      },
    });
  },

  openInKeyboard() {
    const { quickReplies } = this.data;
    if (quickReplies.length === 0) return;
    // In real scenario, use wx.navigateBackMiniProgram or custom protocol
    wx.showModal({
      title: '发送到输入法',
      content: '建议回复已准备好，请切换回输入法粘贴使用。',
      showCancel: false,
    });
  },

  setGoal(e) {
    this.setData({ currentGoal: e.currentTarget.dataset.goal });
  },

  setEnergy(e) {
    this.setData({ currentEnergy: e.currentTarget.dataset.energy });
  },

  selectProfile(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/profile-edit/profile-edit?id=' + id,
    });
  },

  goToAnalyzer() {
    wx.navigateTo({
      url: '/pages/chat-analyzer/chat-analyzer',
    });
  },

  goToProfiles() {
    wx.switchTab({
      url: '/pages/profile-list/profile-list',
    });
  },
});
