/**
 * 通用工具函数
 */

/** 简易 Markdown 转 HTML（支持基本格式） */
function markdownToHtml(md) {
    if (!md) return '';

    let html = md;

    // 代码块（```...```）
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
        return `<pre><code class="language-${lang}">${escapeHtml(code.trim())}</code></pre>`;
    });

    // 行内代码
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 粗体
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // 斜体
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // 表格
    html = html.replace(/\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)*)/g, (_, header, body) => {
        const headers = header.split('|').filter(Boolean).map(h => `<th>${h.trim()}</th>`).join('');
        const rows = body.trim().split('\n').map(row => {
            const cols = row.split('|').filter(Boolean).map(c => `<td>${c.trim()}</td>`).join('');
            return `<tr>${cols}</tr>`;
        }).join('');
        return `<table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>`;
    });

    // 标题
    html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');

    // 无序列表（连续行）
    html = html.replace(/((?:^- .+\n?)+)/gm, (match) => {
        const items = match.trim().split('\n').map(line =>
            `<li>${line.replace(/^- /, '')}</li>`
        ).join('');
        return `<ul>${items}</ul>`;
    });

    // 有序列表
    html = html.replace(/((?:^\d+\. .+\n?)+)/gm, (match) => {
        const items = match.trim().split('\n').map(line =>
            `<li>${line.replace(/^\d+\. /, '')}</li>`
        ).join('');
        return `<ol>${items}</ol>`;
    });

    // 段落（非标签行）
    html = html.replace(/^(?!<[a-zA-Z/])(.+)$/gm, (_, line) => {
        const trimmed = line.trim();
        if (!trimmed) return '';
        if (trimmed.startsWith('<')) return trimmed;
        return `<p>${trimmed}</p>`;
    });

    // 清理空段落
    html = html.replace(/<p>\s*<\/p>/g, '');

    return html;
}

/** HTML 转义 */
function escapeHtml(str) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return str.replace(/[&<>"']/g, c => map[c]);
}

/** 防抖 */
function debounce(fn, delay = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), delay);
    };
}

/** 生成唯一 ID */
function uid() {
    return 'id_' + Math.random().toString(36).slice(2, 9);
}

/** 安全 JSON 解析（修复：空值返回 fallback 而非 null） */
function safeJsonParse(str, fallback = null) {
    if (!str) return fallback;
    try { return JSON.parse(str); }
    catch { return fallback; }
}

/**
 * 学习进度管理（基于 localStorage）
 */
const ProgressStore = {
    _key: 'dsviz_progress',

    /** 获取全部进度数据 */
    getAll() {
        const raw = localStorage.getItem(this._key);
        return safeJsonParse(raw, {
            masteredTopics: [],       // 已掌握的知识点 ID
            currentTopic: null,       // 当前学习主题
            scores: {},               // { topicId: score }
            totalExercises: 0,        // 总练习数
            correctExercises: 0,      // 答对数
            completedTopics: {},      // { topicId: { date, exercisesDone, correct, total } }
            lastActive: null          // 最后活跃时间
        });
    },

    /** 保存进度 */
    save(data) {
        localStorage.setItem(this._key, JSON.stringify(data));
    },

    /** 标记知识点为已掌握 */
    markMastered(topicId) {
        const data = this.getAll();
        if (!data.masteredTopics.includes(topicId)) {
            data.masteredTopics.push(topicId);
        }
        data.lastActive = new Date().toISOString();
        this.save(data);
        return data;
    },

    /** 记录答题结果 */
    recordAnswer(topicId, isCorrect) {
        const data = this.getAll();
        data.totalExercises++;
        if (isCorrect) data.correctExercises++;

        if (!data.completedTopics[topicId]) {
            data.completedTopics[topicId] = { date: new Date().toISOString(), exercisesDone: 0, correct: 0, total: 0 };
        }
        data.completedTopics[topicId].exercisesDone++;
        data.completedTopics[topicId].total++;
        if (isCorrect) data.completedTopics[topicId].correct++;

        data.scores[topicId] = Math.round(
            (data.completedTopics[topicId].correct / data.completedTopics[topicId].total) * 100
        );

        // 如果该知识点答对率 ≥ 80% 且至少做了2题，标记为掌握
        if (data.scores[topicId] >= 80 && data.completedTopics[topicId].total >= 2) {
            if (!data.masteredTopics.includes(topicId)) {
                data.masteredTopics.push(topicId);
            }
        }

        data.lastActive = new Date().toISOString();
        this.save(data);
        return data;
    },

    /** 获取整体掌握率 */
    getMasteryRate() {
        const data = this.getAll();
        return Math.round((data.masteredTopics.length / TOPICS.length) * 100);
    },

    /** 重置所有进度 */
    reset() {
        localStorage.removeItem(this._key);
    }
};
