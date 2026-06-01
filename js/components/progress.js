/**
 * 学习进度显示组件
 * 整体进度条（侧边栏底部）
 */
const Progress = {
    container: null,

    init() {
        this.container = document.getElementById('overall-progress');
        this.update();
    },

    /** 更新进度显示 */
    update() {
        if (!this.container) return;
        const data = ProgressStore.getAll();
        const rate = ProgressStore.getMasteryRate();
        const total = TOPICS.length;
        const done = data.masteredTopics.length;

        this.container.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
                <span>📊 学习进度</span>
                <span style="font-weight:600;color:var(--primary);">${rate}%</span>
            </div>
            <div class="progress-bar-mini">
                <div class="fill" style="width:${rate}%;"></div>
            </div>
            <div style="margin-top:4px;font-size:11px;color:var(--text-muted);">
                已掌握 ${done}/${total} 个知识点
                ${data.totalExercises > 0 ? ` · 练习 ${data.correctExercises}/${data.totalExercises}` : ''}
            </div>
        `;
    }
};
