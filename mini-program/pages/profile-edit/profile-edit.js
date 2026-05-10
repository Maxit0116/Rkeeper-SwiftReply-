const api = require('../../utils/api');

const EMOJIS = ['👤', '🏠', '🧧', '💼', '🍻', '❤️', '👥', '📦', '🥲', '😭', '😤', '🙄', '🤡', '💀', '👻'];

const RISK_TAGS = [
  '催婚', '问工资', '借钱', '问未来',
  '加班', '甩锅', '改需求', '催进度',
  '情绪消耗', '追问', '长语音', '比较',
  '节日问候', '寒暄', '试探', '冷战',
];

Page({
  data: {
    isEdit: false,
    profileId: '',
    emojis: EMOJIS,
    categories: [],
    subCategoriesMap: {},
    subCategories: [],
    goals: [],
    energyOptions: [],
    riskTagOptions: RISK_TAGS,
    form: {
      nickname: '',
      emoji: '👤',
      category: '',
      subCategory: '',
      currentGoal: '',
      energyLevel: '正常',
      riskTags: [],
      notes: '',
    },
  },

  async onLoad(options) {
    this.loadOptions();
    if (options.id) {
      this.setData({ isEdit: true, profileId: options.id });
      this.loadProfile(options.id);
    }
  },

  async loadOptions() {
    try {
      const [categories, subCategoriesMap, goals, energy] = await Promise.all([
        api.getCategories(),
        api.getSubCategories(),
        api.getGoals(),
        api.getEnergyOptions(),
      ]);
      this.setData({
        categories,
        subCategoriesMap,
        goals,
        energyOptions: energy,
      });
    } catch (e) {
      console.error('load options failed', e);
    }
  },

  async loadProfile(id) {
    try {
      const profile = await api.getProfile(id);
      this.setData({
        form: {
          nickname: profile.nickname,
          emoji: profile.emoji,
          category: profile.category,
          subCategory: profile.subCategory || '',
          currentGoal: profile.currentGoal || '',
          energyLevel: profile.energyLevel || '正常',
          riskTags: profile.riskTags ? JSON.parse(profile.riskTags) : [],
          notes: profile.notes || '',
        },
        subCategories: this.data.subCategoriesMap[profile.category] || [],
      });
    } catch (e) {
      console.error('load profile failed', e);
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  selectEmoji(e) {
    this.setData({ 'form.emoji': e.currentTarget.dataset.emoji });
  },

  selectCategory(e) {
    const value = e.currentTarget.dataset.value;
    const subCategories = this.data.subCategoriesMap[value] || [];
    this.setData({
      'form.category': value,
      'form.subCategory': '',
      subCategories,
    });
  },

  selectSubCategory(e) {
    this.setData({ 'form.subCategory': e.currentTarget.dataset.value });
  },

  selectGoal(e) {
    this.setData({ 'form.currentGoal': e.currentTarget.dataset.value });
  },

  selectEnergy(e) {
    this.setData({ 'form.energyLevel': e.currentTarget.dataset.value });
  },

  toggleRiskTag(e) {
    const value = e.currentTarget.dataset.value;
    const tags = this.data.form.riskTags;
    const idx = tags.indexOf(value);
    if (idx > -1) {
      tags.splice(idx, 1);
    } else {
      tags.push(value);
    }
    this.setData({ 'form.riskTags': tags });
  },

  async saveProfile() {
    const { form, isEdit, profileId } = this.data;
    if (!form.nickname.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' });
      return;
    }
    if (!form.category) {
      wx.showToast({ title: '请选择关系类型', icon: 'none' });
      return;
    }
    try {
      if (isEdit) {
        await api.updateProfile(profileId, form);
      } else {
        await api.createProfile(form);
      }
      wx.showToast({ title: '保存成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 800);
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },

  async deleteProfile() {
    const { profileId } = this.data;
    wx.showModal({
      title: '确认删除',
      content: '删除后该关系画像将不再使用',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.deleteProfile(profileId);
            wx.showToast({ title: '已删除', icon: 'success' });
            setTimeout(() => wx.navigateBack(), 800);
          } catch (e) {
            wx.showToast({ title: '删除失败', icon: 'none' });
          }
        }
      },
    });
  },
});
