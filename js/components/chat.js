/**
 * 右侧 AI 对话面板
 * 管理消息渲染、用户输入、AI 角色显示
 */
const Chat = {
    container: null,
    input: null,
    sendBtn: null,
    hintBtn: null,
    skipBtn: null,
    roleBadge: null,
    messages: [],

    init() {
        this.container = document.getElementById('chat-messages');
        this.input = document.getElementById('chat-input');
        this.sendBtn = document.getElementById('btn-send');
        this.hintBtn = document.getElementById('btn-hint');
        this.skipBtn = document.getElementById('btn-skip');
        this.roleBadge = document.getElementById('ai-role-badge');

        // 绑定事件（加 null 检查）
        if (this.sendBtn) {
            this.sendBtn.addEventListener('click', () => this._handleSend());
        }
        if (this.input) {
            this.input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this._handleSend();
                }
            });
        }
        if (this.skipBtn) {
            this.skipBtn.addEventListener('click', () => App._skipQuestion());
        }
        if (this.hintBtn) {
            this.hintBtn.addEventListener('click', () => App._requestHint());
        }

        this.setEnabled(false);
    },

    /** 启用/禁用输入及辅助按钮 */
    setEnabled(enabled) {
        if (this.input) this.input.disabled = !enabled;
        if (this.sendBtn) this.sendBtn.disabled = !enabled;
        if (this.hintBtn) this.hintBtn.disabled = !enabled;
        if (this.skipBtn) this.skipBtn.disabled = !enabled;
        if (enabled && this.input) this.input.focus();
    },

    /** 设置 AI 角色显示 */
    setRole(role) {
        const labels = {
            idle: '待命中',
            explaining: '🧑‍🏫 讲解中',
            questioning: '❓ 提问中',
            correcting: '🔧 纠错中',
            planning: '📋 规划中'
        };
        const cssClasses = {
            idle: 'role-idle',
            explaining: 'role-explaining',
            questioning: 'role-questioning',
            correcting: 'role-correcting',
            planning: 'role-planning'
        };
        this.roleBadge.textContent = labels[role] || '待命中';
        this.roleBadge.className = 'role-badge ' + (cssClasses[role] || 'role-idle');
    },

    /** 清空聊天 */
    clear() {
        this.messages = [];
        this.container.innerHTML = '';
    },

    /** 显示欢迎消息 */
    showWelcome() {
        this.clear();
        this.container.innerHTML = `
            <div class="chat-welcome">
                <p class="welcome-icon">🎓</p>
                <p><strong>你好！我是你的数据结构学习助手。</strong></p>
                <p>我会根据你的学习风格（<em>视觉理解 + 动手实操</em>）来帮助你：</p>
                <ul>
                    <li>🧑‍🏫 <strong>讲解</strong>概念并配合可视化</li>
                    <li>❓ <strong>提问</strong>检验你的理解</li>
                    <li>🔧 <strong>纠错</strong>并给出针对性反馈</li>
                    <li>📋 <strong>规划</strong>你的学习路径</li>
                </ul>
                <p>请先在左侧选择一个你想学习的数据结构吧！</p>
            </div>`;
    },

    /** 添加一条 AI 消息 */
    addAIMessage(htmlContent) {
        this._addMessage('ai', htmlContent);
    },

    /** 开始一条流式 AI 消息，返回一个 {append(chunk), finish()} 对象 */
    startStreamMessage() {
        const el = document.createElement('div');
        el.className = 'chat-message ai';
        el.id = 'stream-msg';
        this.container.appendChild(el);
        this._scrollBottom();

        let rawText = '';
        return {
            append: (chunk) => {
                rawText += chunk;
                el.innerHTML = '<p>' + escapeHtml(rawText) + '<span class="cursor-blink">▊</span></p>';
                this._scrollBottom();
            },
            finish: () => {
                el.innerHTML = markdownToHtml(rawText);
                el.id = '';
                this.messages.push({ role: 'ai', html: el.innerHTML });
            }
        };
    },

    /** 添加一条用户消息 */
    addUserMessage(text) {
        this._addMessage('user', escapeHtml(text));
    },

    _addMessage(role, htmlContent) {
        const el = document.createElement('div');
        el.className = `chat-message ${role}`;
        el.innerHTML = htmlContent;
        this.container.appendChild(el);
        this._scrollBottom();
        this.messages.push({ role, html: htmlContent });
    },

    /** 显示加载动画 */
    showLoading() {
        const el = document.createElement('div');
        el.className = 'chat-loading';
        el.id = 'chat-loader';
        el.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
        this.container.appendChild(el);
        this._scrollBottom();
    },

    /** 隐藏加载动画 */
    hideLoading() {
        const loader = document.getElementById('chat-loader');
        if (loader) loader.remove();
    },

    /** 滚动到底部 */
    _scrollBottom() {
        setTimeout(() => {
            this.container.scrollTop = this.container.scrollHeight;
        }, 50);
    },

    _handleSend() {
        const text = this.input.value.trim();
        if (!text) return;
        this.input.value = '';
        App._handleUserMessage(text);
    }
};
