/**
 * 练习区组件
 * 渲染题目、选项、反馈信息
 */
const Exercise = {
    container: null,
    statusEl: null,
    currentQuestion: null,
    answered: false,

    init() {
        this.container = document.getElementById('exercise-container');
        this.statusEl = document.getElementById('exercise-status');
    },

    /** 显示一道练习题 */
    showQuestion(question) {
        this.currentQuestion = question;
        this.answered = false;
        this.statusEl.textContent = `📝 ${question.level === 'memory' ? '概念记忆' : '理解应用'}题`;

        if (!this.container) return;

        if (question.options && question.options.length > 0) {
            this.container.innerHTML = `
                <div class="exercise-question">${escapeHtml(question.question)}</div>
                <div class="exercise-options" id="exercise-options">
                    ${question.options.map((opt, i) => `
                        <div class="exercise-option" data-index="${i}">
                            ${String.fromCharCode(65 + i)}. ${escapeHtml(opt.replace(/^[A-Da-d][.)、]?\s*/, ''))}
                        </div>
                    `).join('')}
                </div>
                <div id="exercise-feedback"></div>
            `;

            // 绑定选项点击
            this.container.querySelectorAll('.exercise-option').forEach(opt => {
                opt.addEventListener('click', () => {
                    if (this.answered) return;
                    const idx = parseInt(opt.dataset.index);
                    this._submitAnswer(idx);
                });
            });
        } else {
            // 开放题：需要文字输入
            this.container.innerHTML = `
                <div class="exercise-question">${escapeHtml(question.question)}</div>
                <div style="margin-top:8px;">
                    <textarea id="open-answer" rows="2" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:6px;font-family:inherit;"
                        placeholder="请输入你的回答..."></textarea>
                    <button id="btn-submit-open" class="btn-primary" style="margin-top:6px;">提交回答</button>
                </div>
                <div id="exercise-feedback"></div>
            `;

            document.getElementById('btn-submit-open').addEventListener('click', () => {
                if (this.answered) return;
                const answer = document.getElementById('open-answer').value.trim();
                if (!answer) return;
                this._submitOpenAnswer(answer);
            });
        }
    },

    /** 选择题提交 */
    _submitAnswer(selectedIndex) {
        this.answered = true;
        const q = this.currentQuestion;
        const isCorrect = selectedIndex === q.answer;

        // 标记所有选项
        const options = this.container.querySelectorAll('.exercise-option');
        options.forEach((opt, i) => {
            opt.classList.add(i === q.answer ? 'correct' : 'wrong');
        });

        // 显示反馈
        this._showResult(isCorrect);

        // 通知主控
        App._onAnswer(isCorrect, selectedIndex);
    },

    /** 开放题提交 */
    _submitOpenAnswer(userAnswer) {
        this.answered = true;
        // 开放题由 AI 判断，先传给 App
        this._showOpenFeedback(userAnswer);
        App._onOpenAnswer(userAnswer);
    },

    _showResult(isCorrect) {
        const fbEl = document.getElementById('exercise-feedback');
        if (!fbEl) return;

        const q = this.currentQuestion;
        fbEl.className = `exercise-feedback ${isCorrect ? 'correct-fb' : 'error-fb'}`;
        fbEl.innerHTML = `
            <strong>${isCorrect ? '✅ 回答正确！' : '❌ 回答错误'}</strong>
            <p style="margin-top:6px;">${escapeHtml(q.explanation || '')}</p>
        `;
    },

    _showOpenFeedback(userAnswer) {
        const fbEl = document.getElementById('exercise-feedback');
        if (!fbEl) return;
        fbEl.className = 'exercise-feedback correct-fb';
        fbEl.innerHTML = `<p>🤔 AI 正在分析你的回答...</p>`;
    },

    /** 显示 AI 纠错反馈 */
    showDetailedFeedback(feedback) {
        const fbEl = document.getElementById('exercise-feedback');
        if (!fbEl) return;
        fbEl.className = `exercise-feedback error-fb`;
        fbEl.innerHTML = `
            <strong>🔧 AI 纠错分析</strong>
            <p style="margin-top:4px;"><em>错误类型：${ErrorTypeLabel[feedback.errorType] || feedback.errorType}</em></p>
            <p style="margin-top:4px;">${escapeHtml(feedback.analysis || feedback.correction || '')}</p>
            <p style="margin-top:4px;color:#92400e;">${escapeHtml(feedback.encouragement || '')}</p>
        `;
    },

    /** 清空练习区 */
    clear() {
        if (this.container) {
            this.container.innerHTML = `
                <div class="placeholder-text">
                    <p>选择知识点后，AI 会为你生成练习题</p>
                </div>`;
        }
        this.currentQuestion = null;
        this.answered = false;
        this.statusEl.textContent = '';
    }
};
