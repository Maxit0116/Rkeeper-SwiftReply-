const API_BASE = 'http://localhost:3000/api';

function getUserId() {
  let uid = wx.getStorageSync('userId') || '';
  if (!uid) {
    console.warn('[API] userId missing, attempting re-register...');
    // try to register synchronously
    const deviceId = wx.getStorageSync('deviceId') || ('mp_' + Date.now());
    wx.setStorageSync('deviceId', deviceId);
    wx.request({
      url: API_BASE + '/user/register',
      method: 'POST',
      data: { deviceId },
      success: (res) => {
        if (res.data && res.data.userId) {
          wx.setStorageSync('userId', res.data.userId);
          console.log('[API] re-registered userId:', res.data.userId);
        }
      },
    });
    uid = wx.getStorageSync('userId') || '';
  }
  return uid;
}

function request(url, method = 'GET', data = {}) {
  return new Promise((resolve, reject) => {
    const userId = getUserId();
    console.log('[API]', method, url, 'userId=', userId ? 'ok' : 'MISSING');
    wx.request({
      url: API_BASE + url,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'x-user-id': userId,
      },
      timeout: 30000,
      success: (res) => {
        console.log('[API Response]', url, res.statusCode, res.data);
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject({ code: res.statusCode, data: res.data, errMsg: 'HTTP ' + res.statusCode });
        }
      },
      fail: (err) => {
        console.error('[API Fail]', url, err);
        reject(err);
      },
    });
  });
}

module.exports = {
  registerUser: (data) => request('/user/register', 'POST', data),
  getProfiles: () => request('/profiles'),
  getProfile: (id) => request('/profiles/' + id),
  createProfile: (data) => request('/profiles', 'POST', data),
  updateProfile: (id, data) => request('/profiles/' + id, 'PATCH', data),
  deleteProfile: (id) => request('/profiles/' + id, 'DELETE'),
  generateReplies: (data) => request('/replies/generate', 'POST', data),
  analyzeScreenshot: (data) => request('/ocr/analyze', 'POST', data),
  syncChat: (data) => request('/chat/sync', 'POST', data),
  getChatHistory: () => request('/chat/history'),
  getCategories: () => request('/options/categories'),
  getSubCategories: () => request('/options/sub-categories'),
  getGoals: () => request('/options/goals'),
  getEnergyOptions: () => request('/options/energy'),
};
