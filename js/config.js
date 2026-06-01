/**
 * API 配置管理
 * 从 localStorage 读取用户设置的 DeepSeek API 参数
 */
const APIConfig = {
    _key: null,
    _base: null,
    _model: null,

    get key() {
        if (this._key === null) {
            this._key = localStorage.getItem('dsviz_api_key') || '';
        }
        return this._key;
    },

    set key(val) {
        this._key = val;
        localStorage.setItem('dsviz_api_key', val);
    },

    get base() {
        if (this._base === null) {
            this._base = localStorage.getItem('dsviz_api_base') || 'https://api.deepseek.com';
        }
        return this._base;
    },

    set base(val) {
        this._base = val;
        localStorage.setItem('dsviz_api_base', val);
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
