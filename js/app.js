/**
 * 主应用控制器
 * 管理学习状态机、串联全部组件、协调 AI 交互流程
 *
 * 学习闭环：
 * ① 输入（选择知识点）→ ② AI讲解 → ③ 用户尝试
 * → ④ AI反馈 → ⑤ 强化/迁移
 *
 * AI 四种角色：讲解者→提问者→纠错者→规划者
 */

const App = {
    // 状态机
    state: 'idle',          // idle | explaining | practicing | feedback | reviewing
    currentTopic: null,     // 当前学习的数据结构
    currentQuestions: [],   // 当前 AI 生成的题目
    currentQuestionIdx: 0,  // 当前题目索引
    consecutiveCorrect: 0,  // 连续答对数
    consecutiveWrong: 0,    // 连续答错数
    awaitingMoreQuestions: false,  // 等待用户回应"要不要加题"
    isExplaining: false,           // 讲解进行中，防止重复触发
    _questionMode: 'choice',       // 出题模式：'choice' 选择题 | 'code' 代码题

    // ==================== 初始化 ====================
    init() {
        try {
            // 【关键】先绑定 UI 事件（齿轮/重置按钮），确保即使后续步骤出错也能响应
            this._bindUIEvents();
            this._initAPIModal();

            // 初始化各组件（用 try-catch 包裹，单个组件出错不影响其他）
            this._safeInit('Visualizer', () => Visualizer.init());
            this._safeInit('Chat', () => Chat.init());
            this._safeInit('Exercise', () => Exercise.init());
            this._safeInit('Progress', () => Progress.init());
            this._safeInit('Sidebar', () => Sidebar.init());

            // 恢复上次学习状态
            this._safeInit('RestoreState', () => this._restoreState());

            console.log('🚀 DSViz 初始化完成');
            console.log('   API 已配置:', APIConfig.isConfigured());
            console.log('   所有知识点:', typeof TOPICS !== 'undefined' ? TOPICS.length : 'unknown');
        } catch (e) {
            console.error('DSViz 初始化失败:', e);
        }
    },

    _safeInit(name, fn) {
        try { fn(); }
        catch (e) { console.error(`初始化 ${name} 失败:`, e); }
    },

    _bindUIEvents() {
        const gearBtn = document.getElementById('btn-api-settings');
        if (gearBtn) {
            gearBtn.addEventListener('click', () => this._showAPIModal());
        }

        const resetBtn = document.getElementById('btn-reset');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('确定要重置所有学习进度吗？此操作不可撤销。')) {
                    ProgressStore.reset();
                    Sidebar.render();
                    Progress.update();
                    Chat.showWelcome();
                    Visualizer.resetData();
                    this.state = 'idle';
                    this.currentTopic = null;
                    this.currentQuestions = [];
                    this.currentQuestionIdx = 0;
                    Exercise.clear();
                }
            });
        }
    },

    _initAPIModal() {
        const apiKeyInput = document.getElementById('api-key');
        const apiBaseInput = document.getElementById('api-base');
        const apiModelSelect = document.getElementById('api-model');
        const saveBtn = document.getElementById('btn-save-api');
        const closeBtn = document.getElementById('btn-close-api');

        if (apiKeyInput) apiKeyInput.value = APIConfig.key;
        if (apiBaseInput) apiBaseInput.value = APIConfig.base;
        if (apiModelSelect) apiModelSelect.value = APIConfig.model;

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                APIConfig.key = document.getElementById('api-key')?.value?.trim() || '';
                APIConfig.base = document.getElementById('api-base')?.value?.trim() || 'https://api.deepseek.com';
                APIConfig.model = document.getElementById('api-model')?.value || 'deepseek-chat';
                const modal = document.getElementById('modal-api');
                if (modal) modal.classList.add('hidden');
                if (APIConfig.isConfigured()) {
                    Chat.addAIMessage('<p>✅ API 已配置！请从左侧选择一个知识点开始学习吧。</p>');
                }
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                const modal = document.getElementById('modal-api');
                if (modal) modal.classList.add('hidden');
            });
        }
    },

    _showAPIModal() {
        const apiKeyInput = document.getElementById('api-key');
        const apiBaseInput = document.getElementById('api-base');
        const apiModelSelect = document.getElementById('api-model');
        const modal = document.getElementById('modal-api');

        if (apiKeyInput) apiKeyInput.value = APIConfig.key;
        if (apiBaseInput) apiBaseInput.value = APIConfig.base;
        if (apiModelSelect) apiModelSelect.value = APIConfig.model;
        if (modal) modal.classList.remove('hidden');
    },

    /** 恢复上次学习状态 */
    _restoreState() {
        const progress = ProgressStore.getAll();
        if (progress.currentTopic) {
            const topic = getTopicById(progress.currentTopic);
            if (topic) {
                Chat.addAIMessage(`<p>👋 欢迎回来！你上次正在学习 <strong>${topic.name}</strong>。</p><p>点击左侧知识点继续，或选择新的主题开始。</p>`);
                // 不自动恢复，让用户选择
            }
        }

        // 更新UI
        Sidebar.render();
        Progress.update();
    },

    // ==================== 核心流程：选择知识点 ====================
    async selectTopic(topicId) {
        const topic = getTopicById(topicId);
        if (!topic) return;

        // 讲解进行中，忽略重复点击
        if (this.isExplaining) return;

        // 重复点击同一知识点，不重新讲解，提醒用户可自由提问
        if (this.currentTopic && this.currentTopic.id === topicId) {
            Chat.addAIMessage(`<p>📖 你正在学习 <strong>${topic.name}</strong>，有什么想深入了解的吗？直接在下方向我提问吧！</p>`);
            Chat.setEnabled(true);
            Chat.input.focus();
            return;
        }

        // 检查 API 配置
        if (!APIConfig.isConfigured()) {
            this._showAPIModal();
            Chat.addAIMessage('<p>⚠️ 请先配置 DeepSeek API Key（点击右上角 ⚙️）。</p>');
            return;
        }

        // 切换主题时重置
        this.currentTopic = topic;
        this.currentQuestions = [];
        this.currentQuestionIdx = 0;
        this.consecutiveCorrect = 0;
        this.consecutiveWrong = 0;
        this._vizStepCount = 0;  // 重置画布步骤计数
        this._isCodePractice = false;  // 退出代码练习模式

        // 先保存当前主题（Sidebar.render() 要从 localStorage 读取）
        const progress = ProgressStore.getAll();
        progress.currentTopic = topicId;
        ProgressStore.save(progress);

        // 更新 UI
        Sidebar.render();
        Visualizer.loadTopic(topic);
        Chat.clear();
        Chat.setEnabled(false);
        Chat.setQuestionEnabled(true);  // 出题按钮在有知识点后即可用
        Exercise.clear();

        // 进入讲解流程
        await this._enterExplainPhase();
    },

    // ==================== 环节①→②：AI 讲解 ====================
    async _enterExplainPhase() {
        this.isExplaining = true;
        this.state = 'explaining';
        Chat.setRole('explaining');

        const topic = this.currentTopic;
        Chat.addAIMessage(`<p>📖 好的，让我们来学习 <strong>${topic.name}</strong>！</p>`);

        // 生成学习历史摘要
        const progress = ProgressStore.getAll();
        let learningHistory = '';
        if (progress.masteredTopics.length > 0) {
            learningHistory = '已掌握：' + progress.masteredTopics
                .map(id => getTopicById(id)?.name || id)
                .join('、');
        }

        // 调用 AI 讲解（流式输出 + VIZ 指令解析）
        const streamMsg = Chat.startStreamMessage();
        let vizBuffer = '';  // 用于拼接触发 [VIZ:...] 不完全到达的 chunk
        try {
            const systemPrompt = AIPrompts.explainer(topic, learningHistory);
            await AI.chatStream(systemPrompt, `请给我讲解"${topic.name}"这个数据结构。`, (chunk) => {
                // 解析并过滤 VIZ 指令
                const combined = vizBuffer + chunk;
                vizBuffer = '';
                const vizPattern = /\[VIZ:(\{[^\]]*\})\]/g;
                let lastIdx = 0;
                let match;

                while ((match = vizPattern.exec(combined)) !== null) {
                    // 输出 VIZ 标记之前的文字
                    const before = combined.slice(lastIdx, match.index);
                    if (before) streamMsg.append(before);
                    lastIdx = match.index + match[0].length;

                    // 解析并执行画布指令
                    try {
                        const cmd = JSON.parse(match[1]);
                        this._executeVizStep(cmd);
                    } catch (e) { /* 格式错误则忽略 */ }
                }

                // 输出剩余文字
                const remaining = combined.slice(lastIdx);
                // 保留可能的半截 [VIZ 在缓冲区
                const partialIdx = remaining.lastIndexOf('[VIZ:');
                if (partialIdx >= 0 && !remaining.slice(partialIdx).includes(']')) {
                    streamMsg.append(remaining.slice(0, partialIdx));
                    vizBuffer = remaining.slice(partialIdx);
                } else {
                    streamMsg.append(remaining);
                }
            });
            // 输出缓冲区残留
            if (vizBuffer) streamMsg.append(vizBuffer);
            streamMsg.finish();
            this.isExplaining = false;

            // 讲解完成后询问用户是否准备好做题
            Chat.addAIMessage('<p>🤔 <strong>理解了吗？</strong>准备好了就回复 <strong>"出题"</strong>，或者有什么疑问直接问我～</p>');
            Chat.setEnabled(true);
            Chat.input.focus();
            this.state = 'practicing';
        } catch (err) {
            this.isExplaining = false;
            Chat.addAIMessage(`<p>❌ <strong>讲解生成失败：</strong>${escapeHtml(err.message)}</p>`);
            this.state = 'idle';
            Chat.setRole('idle');
        }
    },

    // ==================== 环节②→③：AI 提问 ====================
    async _enterQuestionPhase() {
        this.state = 'practicing';
        Chat.setRole('questioning');

        const topic = this.currentTopic;

        // 根据连续正确/错误数调整难度
        let userLevel = 'beginner';
        if (this.consecutiveCorrect >= 2) userLevel = 'intermediate';
        if (this.consecutiveCorrect >= 4) userLevel = 'advanced';

        Chat.addAIMessage(`<p>❓ 讲完了，来测试一下你的理解吧！（${userLevel === 'beginner' ? '基础' : userLevel === 'intermediate' ? '进阶' : '挑战'}难度）</p>`);

        Chat.showLoading();
        try {
            const result = await AI.generateQuestions(topic, userLevel);
            Chat.hideLoading();

            if (result.questions && result.questions.length > 0) {
                this.currentQuestions = result.questions;
                this.currentQuestionIdx = 0;
                this._showCurrentQuestion();
            } else {
                // 降级：使用内置题目
                this._useBuiltinExercise();
            }

            Chat.setEnabled(true);
        } catch (err) {
            Chat.hideLoading();
            // 降级：使用内置题目
            this._useBuiltinExercise();
            Chat.setEnabled(true);
        }
    },

    /** 使用内置练习题（AI 不可用时的降级方案） */
    _useBuiltinExercise() {
        const topic = this.currentTopic;
        const exercises = getExercisesByTopic(topic.id);
        if (exercises.length > 0) {
            const ex = exercises[Math.floor(Math.random() * exercises.length)];
            this.currentQuestions = [{
                id: ex.id,
                level: 'memory',
                question: ex.question,
                options: ex.options,
                answer: ex.answer,
                explanation: ex.explanation
            }];
            this.currentQuestionIdx = 0;
            this._showCurrentQuestion();
            Chat.addAIMessage('<p>（使用内置题库，AI 生成的题目将在下次展示）</p>');
        } else {
            Chat.addAIMessage('<p>这个知识点暂无练习题。你可以自由提问，或选择其他知识点。</p>');
        }
    },

    /** 展示当前题目 */
    _showCurrentQuestion() {
        const q = this.currentQuestions[this.currentQuestionIdx];
        if (!q) return;
        Exercise.showQuestion(q);
    },

    // ==================== 环节③→④：处理用户回答 ====================
    /** 选择题答案 */
    async _onAnswer(isCorrect, selectedIndex) {
        if (!isCorrect) {
            this.consecutiveWrong++;
            this.consecutiveCorrect = 0;
        } else {
            this.consecutiveCorrect++;
            this.consecutiveWrong = 0;
        }

        // 记录到进度
        const topicId = this.currentTopic.id;
        ProgressStore.recordAnswer(topicId, isCorrect);
        Sidebar.render();
        Progress.update();

        // 如果答对，进入下一题或结束
        if (isCorrect) {
            Chat.addAIMessage('<p>✅ 很棒！你答对了。</p>');
            this.currentQuestionIdx++;
            if (this.currentQuestionIdx < this.currentQuestions.length) {
                setTimeout(() => this._showCurrentQuestion(), 1000);
            } else {
                await this._offerMoreQuestions();
            }
            return;
        }

        // 答错 → 纠错者介入
        this.state = 'feedback';
        Chat.setRole('correcting');

        const q = this.currentQuestions[this.currentQuestionIdx];
        Chat.showLoading();
        try {
            const feedback = await AI.correct(
                this.currentTopic,
                q.options[selectedIndex],
                q.options[q.answer],
                q.question
            );
            Chat.hideLoading();
            Exercise.showDetailedFeedback(feedback);

            // 苏格拉底式引导 vs 直接纠错，展示风格不同
            if (feedback.isSocratic) {
                Chat.addAIMessage(markdownToHtml(
                    `### 💡 想一想…\n\n${feedback.analysis || ''}\n\n${feedback.correction || ''}\n\n> ${feedback.encouragement || '仔细思考，你能找到答案！'}`
                ));
            } else {
                Chat.addAIMessage(markdownToHtml(
                    `### 🔧 纠错分析\n\n**错误类型**：${ErrorTypeLabel[feedback.errorType] || feedback.errorType}\n\n${feedback.correction || feedback.analysis}\n\n> ${feedback.encouragement || '继续加油！'}`
                ));
            }

            // 给出后续建议
            if (feedback.followUpSuggestion) {
                Chat.addAIMessage(`<p>📋 ${escapeHtml(feedback.followUpSuggestion)}</p>`);
            }
        } catch (err) {
            Chat.hideLoading();
            // 降级显示
            Chat.addAIMessage(`<p>🔧 <strong>纠错分析：</strong>正确答案是 <strong>${escapeHtml(q.options[q.answer])}</strong>。</p><p>${escapeHtml(q.explanation || '')}</p>`);
        }

        // 进入下一题或结束
        this.currentQuestionIdx++;
        if (this.currentQuestionIdx < this.currentQuestions.length) {
            setTimeout(() => {
                this.state = 'practicing';
                Chat.setRole('questioning');
                this._showCurrentQuestion();
            }, 2000);
        } else {
            setTimeout(() => this._offerMoreQuestions(), 2000);
        }
    },

    /** 开放题答案 */
    async _onOpenAnswer(userAnswer) {
        this.state = 'feedback';
        Chat.setRole('correcting');

        Chat.showLoading();
        try {
            const feedback = await AI.correct(
                this.currentTopic,
                userAnswer,
                '(由AI判断)',
                this.currentQuestions[this.currentQuestionIdx]?.question || ''
            );
            Chat.hideLoading();
            Exercise.showDetailedFeedback(feedback);
            Chat.addAIMessage(markdownToHtml(
                `### 🔧 反馈\n\n${feedback.correction || feedback.analysis}\n\n> ${feedback.encouragement || '继续加油！'}`
            ));
        } catch {
            Chat.hideLoading();
            Chat.addAIMessage(`<p>🤔 感谢你的回答！由于网络问题，AI 暂时无法详细分析。</p>`);
        }
    },

    // ==================== 环节⑤：完成一轮练习 ====================
    /** 切换出题模式 */
    _toggleQuestionMode(mode) {
        this._questionMode = mode;
        // 更新 UI 高亮
        document.querySelectorAll('#question-mode-toggle .mode-label').forEach(el => {
            el.classList.toggle('active', el.dataset.mode === mode);
        });
        // 更新出题按钮样式
        const btn = document.getElementById('btn-question');
        if (btn) {
            btn.textContent = mode === 'code' ? '📝 出代码题' : '📝 出题';
            btn.classList.toggle('code-mode', mode === 'code');
        }
        const modeLabel = mode === 'code' ? '代码题' : '选择题';
        Chat.addAIMessage(`<p>🔄 出题模式已切换为 <strong>${modeLabel}</strong></p>`);
    },

    /** 出题按钮：生成/刷新练习题（点一次出一道，多次点击覆盖当前题目） */
    async _onGenerateQuestion() {
        // 防抖：正在生成中则忽略
        if (this._isGeneratingQuestions) return;

        // 无知识点
        if (!this.currentTopic) {
            Chat.addAIMessage('<p>⚠️ 请先从左侧选择一个知识点。</p>');
            return;
        }

        // API 未配置
        if (!APIConfig.isConfigured()) {
            this._showAPIModal();
            Chat.addAIMessage('<p>⚠️ 请先配置 DeepSeek API Key（点击右上角 ⚙️）。</p>');
            return;
        }

        // 讲解进行中则先结束讲解状态
        if (this.isExplaining) {
            this.isExplaining = false;
        }

        this._isGeneratingQuestions = true;
        this._isCodePractice = false;         // 退出代码练习模式
        this.awaitingMoreQuestions = false;  // 清除"要不要加题"等待状态
        this.state = 'practicing';
        Chat.setRole('questioning');

        // 根据连续正确/错误数调整难度
        let userLevel = 'beginner';
        if (this.consecutiveCorrect >= 2) userLevel = 'intermediate';
        if (this.consecutiveCorrect >= 4) userLevel = 'advanced';

        // 代码题模式 → 分支处理
        if (this._questionMode === 'code') {
            Chat.showLoading();
            try {
                const codeQ = await AI.generateCodeQuestion(this.currentTopic, userLevel);
                Chat.hideLoading();
                Exercise.showCodeQuestion(codeQ);
                this.currentQuestions = [codeQ];  // 存储为当前题目
                this.currentQuestionIdx = 0;
                Chat.addAIMessage(`<p>💻 已生成代码题：<strong>${escapeHtml(codeQ.title || '编程题')}</strong></p><p>在练习区编写代码后提交，AI 会从多个维度审阅。遇到困难可点 <strong>💡 提示</strong> 按钮。</p>`);
                this._isCodePractice = true;
            } catch {
                Chat.hideLoading();
                Chat.addAIMessage('<p>⚠️ 代码题生成失败，已切换回选择题模式。请重试。</p>');
            } finally {
                this._isGeneratingQuestions = false;
                Chat.setEnabled(true);
            }
            return;
        }

        // 选择题模式
        Chat.showLoading();
        try {
            const result = await AI.generateQuestions(this.currentTopic, userLevel);
            Chat.hideLoading();

            if (result.questions && result.questions.length > 0) {
                // 覆盖当前题目
                this.currentQuestions = result.questions;
                this.currentQuestionIdx = 0;
                Exercise.clear();
                this._showCurrentQuestion();
                Chat.addAIMessage(`<p>📝 已生成 <strong>${result.questions.length}</strong> 道${userLevel === 'beginner' ? '基础' : userLevel === 'intermediate' ? '进阶' : '挑战'}题，请作答。</p>`);
            } else {
                Exercise.clear();
                this._useBuiltinExercise();
            }

            Chat.setEnabled(true);
        } catch (err) {
            Chat.hideLoading();
            Exercise.clear();
            this._useBuiltinExercise();
            Chat.setEnabled(true);
        } finally {
            this._isGeneratingQuestions = false;
        }
    },
    async _finishPractice() {
        this.isExplaining = false;
        this.state = 'reviewing';
        Chat.setRole('planning');

        Exercise.clear();

        // 检查是否需要强化（连续错太多）
        if (this.consecutiveWrong >= 2) {
            Chat.addAIMessage(`<p>🔄 连续答错了 ${this.consecutiveWrong} 题。让我们换一种方式重新理解 <strong>${this.currentTopic.name}</strong>。</p>`);
            setTimeout(() => this._enterExplainPhase(), 1500);
            return;
        }

        // 规划者介入：推荐下一步（流式输出）
        const progress = ProgressStore.getAll();
        const streamMsg = Chat.startStreamMessage();
        try {
            const systemPrompt = AIPrompts.planner(this.currentTopic.id, progress.masteredTopics, TOPICS,
                { rate: ProgressStore.getMasteryRate(), total: TOPICS.length });
            await AI.chatStream(systemPrompt, '请根据我的学习情况，给我一些学习建议。', (chunk) => {
                streamMsg.append(chunk);
            });
            streamMsg.finish();
        } catch {
            Chat.addAIMessage(`<p>✅ 你已完成 <strong>${this.currentTopic.name}</strong> 的学习！</p><p>💡 建议继续学习下一个未掌握的知识点。</p>`);
        }

        // 更新UI
        Sidebar.render();
        Progress.update();

        this.state = 'idle';
        Chat.setRole('idle');
        Chat.setEnabled(true);
    },

    // ==================== 题目做完：夸赞 + 询问是否加题 ====================
    _offerMoreQuestions() {
        this.awaitingMoreQuestions = true;
        this.state = 'practicing';
        Chat.setEnabled(true);
        Chat.input.focus();

        const praises = [
            '太棒了！你完成得非常好 👏',
            '厉害！你已经掌握了要点 🌟',
            '很不错！继续保持这个节奏 💪',
            '真棒！你对这个知识点理解得很到位 🎯'
        ];
        const praise = praises[Math.floor(Math.random() * praises.length)];
        Chat.addAIMessage(`<p>${praise}</p><p>要不要再来几道题巩固一下？<br>回复 <strong>"要"</strong> 继续出题，回复 <strong>"不用了"</strong> 进入下一步。</p>`);
    },

    // ==================== 自由对话处理 ====================
    async _handleUserMessage(text) {
        Chat.addUserMessage(text);
        const msg = text.trim();

        // 如果正在等待"是否加题"的回复
        if (this.awaitingMoreQuestions) {
            this.awaitingMoreQuestions = false;
            const positive = /^(要|好|可|行|是|对|yes|ok|sure|y|再来|继续|加|多|嗯|想|1)/i;
            if (positive.test(msg)) {
                Chat.addAIMessage('<p>好的，再来几道！📝</p>');
                setTimeout(() => this._enterQuestionPhase(), 800);
                return;
            } else {
                Chat.addAIMessage('<p>没问题，咱们继续前进～</p>');
                this._finishPractice();
                return;
            }
        }

        // 讲解完成后用户说"出题" → 进入提问阶段
        if (this.state === 'practicing' && !this.currentQuestions.length) {
            const goQuestion = /^(出题|做题|来吧|开始|好|可|行|是|对|yes|ok|ready|1)/i;
            if (goQuestion.test(msg)) {
                Chat.addAIMessage('<p>好的，来测试一下你的理解！📝</p>');
                setTimeout(() => this._enterQuestionPhase(), 500);
                return;
            }
        }

        // 正常自由对话
        const topicName = this.currentTopic?.name || '数据结构';
        Chat.setEnabled(false);
        const streamMsg = Chat.startStreamMessage();
        try {
            const systemPrompt = AIPrompts.generalChat(topicName, text, '');
            await AI.chatStream(systemPrompt, text, (chunk) => {
                streamMsg.append(chunk);
            });
            streamMsg.finish();
        } catch (err) {
            Chat.addAIMessage(`<p>❌ ${escapeHtml(err.message)}</p>`);
        }
        Chat.setEnabled(true);
        Chat.input.focus();
    },

    /** 跳过当前题目 */
    _skipQuestion() {
        const q = this.currentQuestions[this.currentQuestionIdx];
        if (!q) return;

        Chat.addAIMessage(`<p>⏭️ 已跳过。正确答案是：<strong>${escapeHtml(q.options[q.answer] || '')}</strong></p><p>${escapeHtml(q.explanation || '')}</p>`);

        this.currentQuestionIdx++;
        if (this.currentQuestionIdx < this.currentQuestions.length) {
            this._showCurrentQuestion();
        } else {
            this._offerMoreQuestions();
        }
    },

    /** 请求提示 */
    async _requestHint() {
        // 代码练习模式 → AI 给出代码提示
        if (this._isCodePractice && this.currentTopic) {
            const codeEl = document.getElementById('code-input');
            const currentCode = codeEl ? codeEl.value.trim() : '';
            Chat.showLoading();
            try {
                const hintPrompt = `你是数据结构课程的助教。学生正在练习编写**${this.currentTopic.name}**的代码。
当前代码：
\`\`\`
${currentCode || '（尚未编写）'}
\`\`\`
请给出1-2条简短提示（不超过80字），帮助学生继续编写。
如果是空代码，给出实现思路的引导。
如果代码已有部分内容，指出下一步应该写什么。
不要直接给出完整答案，用引导的方式。`;
                const hint = await AI.chat(hintPrompt, '请给提示');
                Chat.hideLoading();
                Chat.addAIMessage(`<p>💡 <strong>代码提示：</strong>${escapeHtml(hint)}</p>`);
            } catch {
                Chat.hideLoading();
                Chat.addAIMessage(`<p>💡 <strong>提示：</strong>回顾一下 ${this.currentTopic.name} 的核心操作：${this.currentTopic.keyConcepts.slice(0, 3).join('；')}</p>`);
            }
            return;
        }

        // 普通题目模式
        const q = this.currentQuestions[this.currentQuestionIdx];
        if (!q) return;
        Chat.addAIMessage(`<p>💡 <strong>提示：</strong>回顾一下 ${this.currentTopic.name} 的核心概念：${this.currentTopic.keyConcepts.slice(0, 3).join('；')}</p>`);
    },

    /** 执行 AI 发来的画布指令 */
    _executeVizStep(cmd) {
        if (!cmd || !cmd.action) return;
        // 更新步骤计数
        this._vizStepCount = (this._vizStepCount || 0) + 1;
        this._updateVizStepIndicator();
        // 委托给 Visualizer
        Visualizer.executeVizCommand(cmd);
    },

    /** 启动代码练习模式 */
    _startCodePractice() {
        if (!this.currentTopic) {
            Chat.addAIMessage('<p>⚠️ 请先从左侧选择一个知识点。</p>');
            return;
        }
        if (!APIConfig.isConfigured()) {
            this._showAPIModal();
            Chat.addAIMessage('<p>⚠️ 请先配置 DeepSeek API Key。</p>');
            return;
        }
        this._isCodePractice = true;
        Chat.setEnabled(true);  // 启用全部按钮（提示、发送等）
        Exercise.showCodePractice(this.currentTopic.name);
        Chat.addAIMessage(`<p>💻 已开启 <strong>${this.currentTopic.name}</strong> 代码练习模式。</p><p>在练习区编写代码并提交，AI 将从<strong>逻辑正确性、边界处理、复杂度、代码风格</strong>四个维度审阅。</p><p>遇到困难可以点 <strong>💡 提示</strong> 按钮获取代码引导。</p>`);
    },

    /** 提交代码题答案给 AI 审阅 */
    async _submitCodeAnswer(code) {
        if (!this.currentTopic) return;

        // 记录答题
        this.consecutiveCorrect++;
        const topicId = this.currentTopic.id;
        ProgressStore.recordAnswer(topicId, true);
        Sidebar.render();
        Progress.update();

        Chat.showLoading();
        try {
            const review = await AI.reviewCode(this.currentTopic, code);
            Chat.hideLoading();
            Exercise.showCodeReview(review);
            Chat.addAIMessage(markdownToHtml(
                `### 💻 代码题审阅\n\n` +
                `**逻辑**：${review.logic || '—'}\n\n` +
                `**边界**：${review.edgeCases || '—'}\n\n` +
                `> ${review.encouragement || '继续加油！'}`
            ));

            // 代码题做完一轮后询问
            setTimeout(() => this._offerMoreQuestions(), 1500);
        } catch (err) {
            Chat.hideLoading();
            Exercise.showCodeReview({
                isCorrect: false,
                logic: '审阅请求失败：' + err.message,
                encouragement: '请检查网络后重试'
            });
        }
    },

    /** 提交代码给 AI 审阅（自由练习模式） */
    async _submitCodeForReview(code) {
        if (!this.currentTopic) return;
        Chat.showLoading();
        try {
            const review = await AI.reviewCode(this.currentTopic, code);
            Chat.hideLoading();
            Exercise.showCodeReview(review);
            Chat.addAIMessage(markdownToHtml(
                `### 💻 代码审阅\n\n` +
                `**逻辑**：${review.logic || '—'}\n\n` +
                `**边界**：${review.edgeCases || '—'}\n\n` +
                `> ${review.encouragement || '继续加油！'}`
            ));
        } catch (err) {
            Chat.hideLoading();
            Exercise.showCodeReview({
                isCorrect: false,
                logic: '审阅请求失败：' + err.message,
                encouragement: '请检查网络后重试'
            });
        }
    },

    /** 画布步骤指示器 */
    _updateVizStepIndicator() {
        const el = document.getElementById('viz-step-indicator');
        if (el) {
            el.textContent = `🎬 AI 演示步骤 ${this._vizStepCount || 0}`;
            el.style.opacity = '1';
            clearTimeout(this._vizStepTimer);
            this._vizStepTimer = setTimeout(() => { el.style.opacity = '0.5'; }, 3000);
        }
    },

    /** 可视化操作回调 */
    _onVisualizationAction(op) {
        const q = this.currentQuestions[this.currentQuestionIdx];
        if (q && this.state === 'practicing') {
            Chat.addAIMessage(`<p>👆 你在可视化区执行了 <strong>${op}</strong> 操作。注意观察变化！</p>`);
        }
    }
};

// ==================== 启动应用 ====================
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
