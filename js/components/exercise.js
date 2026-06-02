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
        const isSocratic = feedback.isSocratic;

        fbEl.className = `exercise-feedback ${isSocratic ? 'socratic-fb' : 'error-fb'}`;
        fbEl.innerHTML = `
            <strong>${isSocratic ? '💡 苏格拉底式引导' : '🔧 AI 纠错分析'}</strong>
            ${!isSocratic ? `<p style="margin-top:4px;"><em>错误类型：${ErrorTypeLabel[feedback.errorType] || feedback.errorType}</em></p>` : ''}
            <p style="margin-top:4px;">${escapeHtml(feedback.analysis || feedback.correction || '')}</p>
            <p style="margin-top:4px;color:${isSocratic ? '#4f46e5' : '#92400e'};">${escapeHtml(feedback.encouragement || '')}</p>
        `;
    },

    /** 显示 AI 生成的代码题 */
    showCodeQuestion(codeQ) {
        if (!this.container) return;
        this.currentQuestion = codeQ;
        this.answered = false;
        this.statusEl.textContent = '💻 代码题';

        this.container.innerHTML = `
            <div class="code-question-area">
                <div style="display:flex;justify-content:space-between;align-items:start;">
                    <strong style="font-size:14px;">📝 ${escapeHtml(codeQ.title || '编程题')}</strong>
                    <span style="font-size:11px;color:var(--text-muted);background:var(--bg);padding:2px 8px;border-radius:10px;">${escapeHtml(codeQ.level || '')}</span>
                </div>
                <p style="margin-top:6px;font-size:13px;line-height:1.6;">${escapeHtml(codeQ.description || '')}</p>
                <div style="margin-top:6px;background:#f8fafc;border:1px solid var(--border);border-radius:6px;padding:8px 12px;">
                    <span style="font-size:11px;color:var(--text-muted);">函数签名</span>
                    <code style="display:block;font-size:12px;margin-top:2px;color:#1e293b;">${escapeHtml(codeQ.functionSignature || 'function solution() {}')}</code>
                </div>
                ${codeQ.testCases ? `
                <div style="margin-top:6px;font-size:12px;color:var(--text-secondary);">
                    <strong>测试用例：</strong>
                    ${codeQ.testCases.map((tc, i) =>
                        `<span style="margin-left:8px;">#${i + 1}: 输入 <code>${escapeHtml(tc.input)}</code> → 期望 <code>${escapeHtml(tc.expected)}</code></span>`
                    ).join('')}
                </div>` : ''}
                <textarea id="code-input" class="code-editor" rows="8" style="margin-top:8px;"
                    placeholder="// 在这里编写你的代码...&#10;${escapeHtml(codeQ.functionSignature || '')}"></textarea>
                <div style="display:flex;gap:8px;margin-top:8px;">
                    <button id="btn-submit-code" class="btn-primary" style="font-size:12px;">🚀 提交审阅</button>
                </div>
                <div id="code-review-result" style="margin-top:10px;"></div>
            </div>
        `;

        document.getElementById('btn-submit-code').addEventListener('click', () => {
            const code = document.getElementById('code-input').value.trim();
            if (!code) return;
            document.getElementById('btn-submit-code').disabled = true;
            document.getElementById('btn-submit-code').textContent = '⏳ 审阅中...';
            if (typeof App !== 'undefined') App._submitCodeAnswer(code);
        });
    },

    /** 显示代码练习区 */
    showCodePractice(topicName) {
        if (!this.container) return;
        this.currentQuestion = null;
        this.answered = false;
        this.statusEl.textContent = '💻 代码练习';

        const placeholder = topicName === '数组' ? `// 示例：实现线性搜索
function linearSearch(arr, target) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) return i;
  }
  return -1;
}`
            : topicName === '链表' ? `// 示例：定义链表节点并实现头插
class ListNode {
  constructor(val) {
    this.val = val;
    this.next = null;
  }
}
function insertHead(head, val) {
  const newNode = new ListNode(val);
  newNode.next = head;
  return newNode;
}`
            : topicName === '栈' ? `// 示例：用数组实现栈
class Stack {
  constructor() { this.items = []; }
  push(val) { this.items.push(val); }
  pop() { return this.items.pop(); }
  peek() { return this.items[this.items.length - 1]; }
}`
            : topicName === '堆' ? `// 示例：大顶堆插入（上浮）
function heapInsert(heap, val) {
  heap.push(val);
  let i = heap.length - 1;
  while (i > 0) {
    const parent = Math.floor((i - 1) / 2);
    if (heap[i] <= heap[parent]) break;
    [heap[i], heap[parent]] = [heap[parent], heap[i]];
    i = parent;
  }
}`
            : `// 请编写 ${topicName} 相关的代码
// 例如：核心操作、遍历算法等`;

        this.container.innerHTML = `
            <div class="code-practice-area">
                <p style="font-size:12px;color:var(--text-secondary);margin-bottom:6px;">
                    ✏️ 编写 <strong>${topicName}</strong> 的相关代码，提交后 AI 会从逻辑、边界、复杂度、风格四个维度审阅。
                </p>
                <textarea id="code-input" class="code-editor" rows="8"
                    placeholder="${escapeHtml(placeholder)}"></textarea>
                <div style="display:flex;gap:8px;margin-top:8px;">
                    <button id="btn-submit-code" class="btn-primary" style="font-size:12px;">🚀 提交审阅</button>
                    <button id="btn-clear-code" class="btn-outline" style="font-size:11px;">清空</button>
                </div>
                <div id="code-review-result" style="margin-top:10px;"></div>
            </div>
        `;

        // 绑定事件
        document.getElementById('btn-submit-code').addEventListener('click', () => {
            const code = document.getElementById('code-input').value.trim();
            if (!code) return;
            document.getElementById('btn-submit-code').disabled = true;
            document.getElementById('btn-submit-code').textContent = '⏳ 审阅中...';
            if (typeof App !== 'undefined') App._submitCodeForReview(code);
        });
        document.getElementById('btn-clear-code').addEventListener('click', () => {
            document.getElementById('code-input').value = '';
            document.getElementById('code-review-result').innerHTML = '';
        });
    },

    /** 显示代码审阅结果 */
    showCodeReview(review) {
        const resultEl = document.getElementById('code-review-result');
        if (!resultEl) return;
        const icon = review.isCorrect ? '✅' : '🔧';
        resultEl.innerHTML = `
            <div class="exercise-feedback ${review.isCorrect ? 'correct-fb' : 'socratic-fb'}">
                <strong>${icon} AI 代码审阅</strong>
                <table style="width:100%;margin-top:8px;font-size:12px;border-collapse:collapse;">
                    <tr><td style="padding:4px 8px;font-weight:600;white-space:nowrap;color:var(--text-secondary);">逻辑正确性</td>
                        <td style="padding:4px 8px;">${escapeHtml(review.logic || '—')}</td></tr>
                    <tr><td style="padding:4px 8px;font-weight:600;white-space:nowrap;color:var(--text-secondary);">边界处理</td>
                        <td style="padding:4px 8px;">${escapeHtml(review.edgeCases || '—')}</td></tr>
                    <tr><td style="padding:4px 8px;font-weight:600;white-space:nowrap;color:var(--text-secondary);">复杂度</td>
                        <td style="padding:4px 8px;">${escapeHtml(review.complexity || '—')}</td></tr>
                    <tr><td style="padding:4px 8px;font-weight:600;white-space:nowrap;color:var(--text-secondary);">代码风格</td>
                        <td style="padding:4px 8px;">${escapeHtml(review.style || '—')}</td></tr>
                </table>
                ${review.improvedCode ? `<div style="margin-top:8px;"><strong style="font-size:12px;">✨ 改进参考：</strong>
                    <pre style="background:#1e293b;color:#e2e8f0;padding:8px;border-radius:6px;overflow-x:auto;font-size:11px;margin-top:4px;">${escapeHtml(review.improvedCode)}</pre></div>` : ''}
                <p style="margin-top:8px;font-size:12px;color:var(--text-secondary);">${escapeHtml(review.encouragement || '继续加油！')}</p>
            </div>
        `;
        // 恢复按钮
        const btn = document.getElementById('btn-submit-code');
        if (btn) { btn.disabled = false; btn.textContent = '🚀 提交审阅'; }
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
