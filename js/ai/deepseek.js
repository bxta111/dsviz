/**
 * DeepSeek API 调用封装
 * DeepSeek API 兼容 OpenAI Chat Completions 格式
 * 文档：https://platform.deepseek.com/api-docs
 */

const AI = {
    /**
     * 流式 API 调用（文字实时输出，体验更快）
     * @param {string} systemPrompt
     * @param {string} userMessage
     * @param {function} onChunk - 每收到一段文字就回调 onChunk(text)
     * @param {object} options
     * @returns {Promise<string>} 完整回复文本
     */
    async chatStream(systemPrompt, userMessage, onChunk, options = {}) {
        if (!APIConfig.isConfigured()) {
            throw new Error('请先配置 DeepSeek API Key（点击右上角 ⚙️ 按钮）');
        }

        const messages = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        messages.push({ role: 'user', content: userMessage });

        const body = {
            model: APIConfig.model,
            messages: messages,
            temperature: options.temperature ?? 0.7,
            max_tokens: options.maxTokens ?? 2048,
            stream: true
        };

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
            try { const errJson = JSON.parse(errText); errMsg = errJson.error?.message || errText; }
            catch { errMsg = errText; }
            throw new Error(`API 错误 (${resp.status}): ${errMsg}`);
        }

        // 解析 SSE 流
        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let fullText = '';
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || ''; // 最后一个可能不完整，留下次处理

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data:')) continue;
                const data = trimmed.slice(5).trim();
                if (data === '[DONE]') continue;

                try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                        fullText += content;
                        onChunk && onChunk(content, fullText);
                    }
                } catch (e) {
                    // 忽略解析失败的行
                }
            }
        }

        return fullText;
    },

    /**
     * 核心 API 调用（非流式，用于需要完整 JSON 的场景）
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
    },

    /** 生成代码编程题 */
    async generateCodeQuestion(topic, userLevel = 'beginner') {
        const systemPrompt = AIPrompts.codeQuestioner(topic, userLevel);
        const raw = await this.chat(systemPrompt, '请出一道编程题。');
        try {
            let jsonStr = raw.trim();
            const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) jsonStr = jsonMatch[1].trim();
            return JSON.parse(jsonStr);
        } catch {
            return {
                id: 'code-fallback',
                level: userLevel,
                title: `${topic.name} 编程练习`,
                description: `请实现 ${topic.name} 的核心操作。`,
                functionSignature: 'function solution() { ... }',
                testCases: [{ input: '...', expected: '...' }],
                hint: topic.keyConcepts.slice(0, 2).join('；')
            };
        }
    },

    /** 审阅用户提交的代码 */
    async reviewCode(topic, userCode) {
        const systemPrompt = AIPrompts.codeReviewer(topic, userCode);
        const raw = await this.chat(systemPrompt, '请审阅这段代码。');
        try {
            let jsonStr = raw.trim();
            const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (jsonMatch) jsonStr = jsonMatch[1].trim();
            return JSON.parse(jsonStr);
        } catch {
            return {
                isCorrect: false,
                logic: '无法解析 AI 反馈',
                edgeCases: '',
                complexity: '',
                style: '',
                improvedCode: null,
                encouragement: '请检查网络后重试。'
            };
        }
    }
};
