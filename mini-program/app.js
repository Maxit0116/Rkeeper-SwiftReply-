App({
  globalData: {
    userId: null,
    apiBase: 'http://localhost:3000/api',
  },
  onLaunch() {
    this.registerUser();
  },
  registerUser() {
    const deviceId = wx.getStorageSync('deviceId') || this.generateDeviceId();
    wx.setStorageSync('deviceId', deviceId);

    wx.request({
      url: this.globalData.apiBase + '/user/register',
      method: 'POST',
      data: { deviceId },
      success: (res) => {
        if (res.data && res.data.userId) {
          this.globalData.userId = res.data.userId;
          wx.setStorageSync('userId', res.data.userId);
        }
      },
    });
  },
  generateDeviceId() {
    return 'mp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  },
});
