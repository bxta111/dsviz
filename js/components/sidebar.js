/**
 * 左侧栏：数据结构知识导航
 * 渲染分类树、知识点状态、点击事件
 */
const Sidebar = {
    nav: null,

    init() {
        this.nav = document.getElementById('topic-nav');
        this.render();
    },

    /** 渲染侧边栏（所有知识点自由选择，无前置限制） */
    render() {
        if (!this.nav) return;

        const progress = ProgressStore.getAll();
        const currentTopicId = progress.currentTopic;
        const masteredIds = progress.masteredTopics;

        let html = '';

        TOPIC_CATEGORIES.forEach(cat => {
            const topics = getTopicsByCategory(cat.key);
            if (topics.length === 0) return;

            html += `<div class="topic-category">`;
            html += `<div class="category-label">${cat.icon} ${cat.key}</div>`;

            topics.forEach(topic => {
                const isActive = topic.id === currentTopicId;
                const isMastered = masteredIds.includes(topic.id);

                let statusIcon = '○';
                if (isMastered) statusIcon = '✅';
                else if (isActive) statusIcon = '📖';

                const starsHtml = Array.from({ length: 5 }, (_, i) =>
                    `<span class="star ${i < topic.difficulty ? 'filled' : ''}">★</span>`
                ).join('');

                html += `
                <div class="topic-item ${isActive ? 'active' : ''}"
                     data-topic-id="${topic.id}"
                     title="点击学习 ${topic.name}">
                    <span class="topic-status">${statusIcon}</span>
                    <span class="topic-name">${topic.name}</span>
                    <span class="topic-difficulty" title="难度">${starsHtml}</span>
                </div>`;
            });

            html += `</div>`;
        });

        this.nav.innerHTML = html;

        // 所有知识点均可自由点击
        this.nav.querySelectorAll('.topic-item').forEach(item => {
            item.addEventListener('click', () => {
                const topicId = item.dataset.topicId;
                App.selectTopic(topicId);
            });
        });
    }
};
