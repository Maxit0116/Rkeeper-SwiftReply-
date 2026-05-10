const api = require('../../utils/api');

Page({
  data: {
    imageSrc: '',
    imageBase64: '',
    analyzing: false,
    result: {
      rawText: '',
      analyzedContent: '',
      profileGuess: '',
      confidence: 0,
      suggestedReplies: [],
    },
  },

  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album'],
      success: (res) => {
        const path = res.tempFilePaths[0];
        this.setData({ imageSrc: path });
        this.encodeImage(path);
      },
    });
  },

  takePhoto() {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['camera'],
      success: (res) => {
        const path = res.tempFilePaths[0];
        this.setData({ imageSrc: path });
        this.encodeImage(path);
      },
    });
  },

  encodeImage(path) {
    const fs = wx.getFileSystemManager();
    fs.readFile({
      filePath: path,
      encoding: 'base64',
      success: (res) => {
        this.setData({ imageBase64: res.data });
      },
      fail: () => {
        wx.showToast({ title: '读取图片失败', icon: 'none' });
      },
    });
  },

  async analyze() {
    const { imageBase64 } = this.data;
    if (!imageBase64) {
      wx.showToast({ title: '请先选择图片', icon: 'none' });
      return;
    }
    this.setData({ analyzing: true });
    try {
      const res = await api.analyzeScreenshot({ imageBase64 });
      this.setData({
        result: {
          rawText: res.rawText,
          analyzedContent: res.analyzedContent,
          profileGuess: res.profileGuess,
          confidence: res.confidence,
          suggestedReplies: res.suggestedReplies || [],
        },
      });
    } catch (e) {
      wx.showToast({ title: '分析失败', icon: 'none' });
    } finally {
      this.setData({ analyzing: false });
    }
  },

  copyReply(e) {
    const text = e.currentTarget.dataset.text;
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '已复制', icon: 'success' }),
    });
  },

  copyAll() {
    const { suggestedReplies } = this.data.result;
    const text = suggestedReplies.join('\n');
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '已复制全部', icon: 'success' }),
    });
  },

  goToResult() {
    const replies = JSON.stringify(this.data.result.suggestedReplies);
    wx.navigateTo({
      url: '/pages/reply-result/reply-result?replies=' + encodeURIComponent(replies),
    });
  },

  syncToProfile() {
    const { result } = this.data;
    if (!result.rawText) return;
    wx.showModal({
      title: '同步到关系记忆',
      content: '将本次分析结果同步到 Relationship Memory Engine？',
      success: (res) => {
        if (res.confirm) {
          api.syncChat({ content: result.rawText }).then(() => {
            wx.showToast({ title: '同步成功', icon: 'success' });
          }).catch(() => {
            wx.showToast({ title: '同步失败', icon: 'none' });
          });
        }
      },
    });
  },
});
