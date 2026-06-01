/**
 * DeepSeek API 调用封装
 * DeepSeek API 兼容 OpenAI Chat Completions 格式
 * 文档：https://platform.deepseek.com/api-docs
 */

const AI = {
    /**
     * 核心 API 调用
     * @param {string} systemPrompt - 系统提示词
     * @param {string} userMessage - 用户消息
     * @param {object} options - 可选配置
     * @returns {Promise<string>} AI 回复文本
     */
    async chat(systemPrompt, userMessage, options = {}) {
        if (!APIConfig.isConfigured()) {
            throw new Error('请先配置 DeepSeek API Key（点击右上角 ⚙️ 按钮）');
        }

        const messages = [];
        if (systemPrompt) {
            messages.push({ role: 'system', content: systemPrompt });
        }
        messages.push({ role: 'user', content: userMessage });

        const body = {
            model: APIConfig.model,
            messages: messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 2048,
            stream: false
        };

        try {
            const resp = await fetch(`${APIConfig.base}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${APIConfig.key}`
                },
                body: JSON.stringify(body)
            });

            if (!resp.ok) {
                const errText = await resp.text();
                let errMsg;
                try {
                    const errJson = JSON.parse(errText);
                    errMsg = errJson.error?.message || errText;
                } catch {
                    errMsg = errText;
                }
                throw new Error(`API 错误 (${resp.status}): ${errMsg}`);
            }

            const data = await resp.json();
            return data.choices[0].message.content;
        } catch (err) {
            if (err.message.startsWith('API 错误') || err.message.startsWith('请先配置')) {
                throw err;
            }
            throw new Error(`网络请求失败: ${err.message}`);
        }
    },

    /**
     * 调用讲解者角色
     * @returns {Promise<string>} 讲解内容（Markdown）
     */
    async explain(topic, learningHistory = '') {
        const systemPrompt = AIPrompts.explainer(topic, learningHistory);
        return this.chat(systemPrompt, `请给我讲解"${topic.name}"这个数据结构。`);
    },

    /**
     * 调用提问者角色
     * @returns {Promise<object>} 解析后的题目对象 { questions: [...] }
     */
    async generateQuestions(topic, userLevel = 'beginner') {
        const systemPrompt = AIPrompts.questioner(topic, userLevel);
        const raw = await this.chat(systemPrompt, '请给我出题。记住只输出 JSON。');

        // 尝试从回复中提取 JSON
        try {
            // 处理可能的 markdown 代码块包裹
            let jsonStr = raw.trim();
            const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1].trim();
            }
            return JSON.parse(jsonStr);
        } catch {
            // 解析失败，返回降级结构
            console.warn('AI 生成的题目 JSON 解析失败，使用原始文本');
            return {
                questions: [{
                    id: 'fallback',
                    level: 'memory',
                    question: '请根据刚才的讲解，说说你对这个数据结构的理解？',
                    options: [],
                    answer: -1,
                    explanation: raw
                }]
            };
        }
    },

    /**
     * 调用纠错者角色
     * @returns {Promise<object>} 解析后的反馈对象
     */
    async correct(topic, userAnswer, correctAnswer, questionText) {
        const systemPrompt = AIPrompts.corrector(topic, userAnswer, correctAnswer, questionText);
        const raw = await this.chat(systemPrompt, '请分析我的错误。记住只输出 JSON。');

        try {
            let jsonStr = raw.trim();
            const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) {
                jsonStr = jsonMatch[1].trim();
            }
            return JSON.parse(jsonStr);
        } catch {
            return {
                errorType: 'understanding',
                analysis: '无法精确分类错误类型。',
                correction: raw,
                encouragement: '继续加油！犯错是学习的一部分。',
                followUpSuggestion: '建议回顾一下这个概念的基础知识。'
            };
        }
    },

    /**
     * 调用规划者角色
     * @returns {Promise<string>} 规划建议（Markdown）
     */
    async plan(currentTopicId, masteredTopics = [], allTopics = [], progressData = {}) {
        const systemPrompt = AIPrompts.planner(currentTopicId, masteredTopics, allTopics, progressData);
        return this.chat(systemPrompt, '请根据我的学习情况，给我一些学习建议。');
    },

    /**
     * 通用对话
     * @returns {Promise<string>} AI 回复
     */
    async generalChat(topicName, userMessage, chatHistory = '') {
        const systemPrompt = AIPrompts.generalChat(topicName, userMessage, chatHistory);
        return this.chat(systemPrompt, userMessage);
    }
};
