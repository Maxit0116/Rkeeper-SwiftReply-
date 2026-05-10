const API_BASE = 'http://localhost:3000/api';

function getUserId() {
  return wx.getStorageSync('userId') || '';
}

function request(url, method = 'GET', data = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: API_BASE + url,
      method,
      data,
      header: {
        'Content-Type': 'application/json',
        'x-user-id': getUserId(),
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(res.data);
        }
      },
      fail: reject,
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
