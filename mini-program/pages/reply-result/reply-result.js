Page({
  data: {
    replies: [],
  },

  onLoad(options) {
    if (options.replies) {
      try {
        const replies = JSON.parse(decodeURIComponent(options.replies));
        this.setData({ replies });
      } catch (e) {
        console.error('parse replies failed', e);
      }
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
    const text = this.data.replies.join('\n');
    wx.setClipboardData({
      data: text,
      success: () => wx.showToast({ title: '已复制全部', icon: 'success' }),
    });
  },

  regenerate() {
    wx.showToast({ title: '重新生成中...', icon: 'loading' });
    // In real app, call API again with different strategy
  },

  shareToKeyboard() {
    // Copy to clipboard first
    const text = this.data.replies[0] || '';
    wx.setClipboardData({
      data: text,
      success: () => {
        // Try to navigate back to mini program caller (input method or other app)
        wx.navigateBackMiniProgram({
          extraData: {
            replies: this.data.replies,
            from: '稳一手',
          },
          success: () => {
            console.log('navigate back success');
          },
          fail: () => {
            wx.showModal({
              title: '已复制到剪贴板',
              content: '建议已复制，请切换回输入法或聊天应用粘贴使用',
              showCancel: false,
            });
          },
        });
      },
    });
  },
});
