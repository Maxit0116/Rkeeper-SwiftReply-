const api = require('../../utils/api');

Page({
  data: {
    profiles: [],
  },

  onShow() {
    this.loadProfiles();
  },

  async loadProfiles() {
    try {
      const profiles = await api.getProfiles();
      this.setData({ profiles });
    } catch (e) {
      console.error('load profiles failed', e);
    }
  },

  addProfile() {
    wx.navigateTo({
      url: '/pages/profile-edit/profile-edit',
    });
  },

  editProfile(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '/pages/profile-edit/profile-edit?id=' + id,
    });
  },
});
