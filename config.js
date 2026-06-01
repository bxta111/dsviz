/**
 * API 配置管理
 * 从 localStorage 读取用户设置的 DeepSeek API 参数
 */
const APIConfig = {
    _key: null,
    _base: null,
    _model: null,

    /** 清理 API Key：去除不可见 Unicode 字符、首尾空格 */
    _sanitize(val) {
        if (!val) return '';
        // 移除常见的不可见字符：零宽空格、BOM、软连字符等
        return val.replace(/[​-‍﻿­⁠‎‏]/g, '').trim();
    },

    get key() {
        if (this._key === null) {
            this._key = this._sanitize(localStorage.getItem('dsviz_api_key') || '');
        }
        return this._key;
    },

    set key(val) {
        this._key = this._sanitize(val);
        localStorage.setItem('dsviz_api_key', this._key);
    },

    get base() {
        if (this._base === null) {
            this._base = this._sanitize(localStorage.getItem('dsviz_api_base') || 'https://api.deepseek.com');
        }
        return this._base;
    },

    set base(val) {
        this._base = this._sanitize(val);
        localStorage.setItem('dsviz_api_base', this._base);
    },

    get model() {
        if (this._model === null) {
            this._model = localStorage.getItem('dsviz_api_model') || 'deepseek-chat';
        }
        return this._model;
    },

    set model(val) {
        this._model = val;
        localStorage.setItem('dsviz_api_model', val);
    },

    /** 检查 API 是否已配置 */
    isConfigured() {
        return this.key.length > 0;
    },

    /** 清除配置 */
    clear() {
        this.key = '';
        this.base = 'https://api.deepseek.com';
        this.model = 'deepseek-chat';
    }
};
