const api = require('../../utils/api');

Page({
  data: {
    energyOptions: [],
    currentEnergy: '正常',
  },

  async onLoad() {
    try {
      const energy = await api.getEnergyOptions();
      this.setData({ energyOptions: energy });
    } catch (e) {
      console.error('load energy options failed', e);
    }
  },

  selectEnergy(e) {
    const energy = e.currentTarget.dataset.energy;
    this.setData({ currentEnergy: energy });
    wx.setStorageSync('currentEnergy', energy);
    wx.showToast({ title: '已设置', icon: 'success' });
  },
});
