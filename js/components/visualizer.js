/**
 * Canvas 数据结构可视化组件
 * 支持多种 visualType：array / nodes / stack / queue / tree / graph / hash
 */
const Visualizer = {
    canvas: null,
    ctx: null,
    container: null,
    currentTopic: null,
    animFrame: null,

    // 颜色主题
    colors: {
        nodeFill: '#eef2ff',
        nodeStroke: '#4f46e5',
        nodeText: '#1e293b',
        nodeHighlight: '#fef3c7',
        nodeActive: '#d1fae5',
        edge: '#c7d2fe',
        pointer: '#ef4444',
        barDefault: '#818cf8',
        barCompare: '#f59e0b',
        barSwap: '#ef4444',
        bg: '#fafbfc',
        grid: '#f1f5f9'
    },

    // 操作 ID → 中文标签映射（用于渲染按钮）
    _opLabels: {
        // 数组
        access: '访问', insert: '插入', delete: '删除', search: '查找', traverse: '遍历',
        // 链表
        insert_head: '头插', insert_tail: '尾插', reverse: '反转',
        // 栈
        push: 'Push', pop: 'Pop', peek: 'Peek',
        // 队列
        enqueue: '入队', dequeue: '出队',
        // 树/BST
        preorder: '前序', inorder: '中序', postorder: '后序', levelorder: '层序',
        min: '最小', max: '最大',
        // 堆
        extract_top: '取堆顶', heapify: '建堆',
        // 图
        bfs: 'BFS', dfs: 'DFS', add_edge: '加边', add_vertex: '加顶点',
        delete_vertex: '删除顶点',
        // 哈希
        put: 'Put', get: 'Get', contains: 'Contains',
        // 排序
        partition: '分区', sort: '排序', merge: '合并', compare: '比较',
        add_element: '➕ 添加', remove_element: '➖ 删除', shuffle: '🔀 随机',
    },

    /** 绘制圆角矩形（兼容所有浏览器） */
    _roundRect(x, y, w, h, r) {
        const ctx = this.ctx;
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
    },

    /** 初始化 */
    init() {
        this.canvas = document.getElementById('viz-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.container = document.getElementById('canvas-container');
        this._resize();
        window.addEventListener('resize', () => this._resize());
    },

    /** 自适应尺寸 */
    _resize() {
        if (!this.canvas || !this.container) return;
        const rect = this.container.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this._redraw();
    },

    /** 加载并渲染一个知识点 */
    loadTopic(topic) {
        this.currentTopic = topic;
        document.getElementById('viz-canvas').style.display = 'block';
        const placeholder = document.getElementById('viz-placeholder');
        if (placeholder) placeholder.style.display = 'none';
        document.getElementById('viz-title').textContent = `🎨 ${topic.name} · 可视化演示`;
        this._renderControls(topic);
        this._redraw();
    },

    /** 是否有自定义值输入（基于操作 ID） */
    _needsValueInput(op) {
        const withValue = ['insert', 'insert_head', 'insert_tail', 'push', 'enqueue',
            'put', 'get', 'add_vertex', 'add_edge', 'delete_vertex',
            'access', 'search', 'add_element', 'delete'];
        return withValue.includes(op);
    },

    /** 判断该主题的值输入是否应为文本（非数字） */
    _isTextInput(topic) {
        return topic.visualType === 'nodes' || topic.visualType === 'stack' ||
            topic.visualType === 'queue' || topic.visualType === 'graph';
    },

    /** 渲染操作按钮（含自定义值输入框） */
    _renderControls(topic) {
        const container = document.getElementById('viz-controls');
        if (!container) return;

        // 使用 topic 自己的 operations 映射为中文标签
        const opLabels = (topic.operations || []).map(op => this._opLabels[op] || op);
        const opIds = topic.operations || [];
        const hasInsertOp = opIds.some(op => this._needsValueInput(op));
        const isText = this._isTextInput(topic);
        const defaultVal = isText ? 'X' : (Math.floor(Math.random() * 90) + 10);

        container.innerHTML =
            (hasInsertOp
                ? `<label style="font-size:12px;color:var(--text-secondary);margin-right:4px;">值:</label>
                   <input id="viz-value-input" type="${isText ? 'text' : 'number'}" value="${defaultVal}"
                    style="width:${isText ? '45' : '55'}px;padding:4px 6px;border:1px solid var(--border);border-radius:5px;font-size:12px;margin-right:8px;">`
                : '') +
            opLabels.map((label, i) =>
                `<button class="viz-btn${i === 0 ? ' active' : ''}" data-op="${opIds[i]}">${label}</button>`
            ).join('');

        // 绑定事件
        const self = this;
        container.querySelectorAll('.viz-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                container.querySelectorAll('.viz-btn').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                self._handleOperation(this.dataset.op, topic);
            });
        });
    },

    /** 读取用户输入的值（自动适配数字/文本） */
    _getInputValue(defaultVal = null) {
        const input = document.getElementById('viz-value-input');
        if (input && input.value.trim() !== '') {
            const raw = input.value.trim();
            // 数字输入框 → 返回数字；文本输入框 → 返回字符串
            return input.type === 'number' ? (parseInt(raw) || raw) : raw;
        }
        if (defaultVal !== null) return defaultVal;
        // 文本输入框默认值
        if (this.currentTopic && this._isTextInput(this.currentTopic)) {
            return String.fromCharCode(65 + Math.floor(Math.random() * 26));
        }
        return Math.floor(Math.random() * 90) + 10;
    },

    /** 操作后刷新输入框的值，防止重复添加同一元素 */
    _refreshInputValue() {
        const input = document.getElementById('viz-value-input');
        if (!input) return;
        const topic = this.currentTopic;
        if (topic && this._isTextInput(topic)) {
            input.value = String.fromCharCode(65 + Math.floor(Math.random() * 26));
        } else {
            input.value = Math.floor(Math.random() * 90) + 10;
        }
    },

    /** 处理操作按钮点击 */
    _handleOperation(op, topic) {
        // 堆主题使用专属可视化
        if (topic.id === 'heap') { this._animHeapVisual(op); return; }
        // 排序主题使用专属可视化
        if (topic.id === 'quick-sort' || topic.id === 'merge-sort' || topic.id === 'sorting-intro') {
            this._animSort(op); return;
        }
        switch (topic.visualType) {
            case 'array': this._animArray(op); break;
            case 'nodes': this._animNodes(op); break;
            case 'stack': this._animStack(op); break;
            case 'queue': this._animQueue(op); break;
            case 'tree': this._animTree(op); break;
            case 'graph': this._animGraph(op); break;
            case 'hash': this._animHash(op); break;
        }
    },

    /** 重绘 */
    _redraw() {
        if (!this.currentTopic || !this.ctx) return;
        const ctx = this.ctx;
        const w = this.canvas.width / (window.devicePixelRatio || 1);
        const h = this.canvas.height / (window.devicePixelRatio || 1);

        ctx.clearRect(0, 0, w, h);

        // 堆主题使用专属绘制
        if (this.currentTopic.id === 'heap') { this._drawHeapVisual(); return; }
        // 排序主题使用专属绘制
        if (this.currentTopic.id === 'quick-sort' || this.currentTopic.id === 'merge-sort' ||
            this.currentTopic.id === 'sorting-intro') { this._drawSort(); return; }

        switch (this.currentTopic.visualType) {
            case 'array': this._drawArray(); break;
            case 'nodes': this._drawNodes(); break;
            case 'stack': this._drawStack(); break;
            case 'queue': this._drawQueue(); break;
            case 'tree': this._drawTree(); break;
            case 'graph': this._drawGraph(); break;
            case 'hash': this._drawHash(); break;
        }
    },

    // ==================== 数组可视化 ====================
    _arrayData: null,
    _getArrayData() {
        if (!this._arrayData) {
            this._arrayData = [25, 12, 38, 90, 55, 42, 73, 18, 66, 31];
        }
        return this._arrayData;
    },

    _drawArray() {
        const ctx = this.ctx;
        const w = this.canvas.width / (window.devicePixelRatio || 1);
        const h = this.canvas.height / (window.devicePixelRatio || 1);
        const data = this._getArrayData();
        const n = data.length;
        const barW = Math.min(60, (w - 120) / n);
        const maxVal = Math.max(...data);
        const chartH = h - 120;
        const startX = (w - barW * n) / 2;
        const baseY = h - 80;

        // 画格子
        ctx.strokeStyle = this.colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = baseY - (chartH / 5) * i;
            ctx.beginPath();
            ctx.moveTo(40, y);
            ctx.lineTo(w - 40, y);
            ctx.stroke();
        }

        // 画柱子
        data.forEach((val, i) => {
            const x = startX + i * barW;
            const barH = (val / maxVal) * chartH * 0.9;
            const y = baseY - barH;

            // 柱子
            ctx.fillStyle = this.colors.barDefault;
            ctx.fillRect(x + 3, y, barW - 6, barH);

            // 数值
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 13px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(val, x + barW / 2, y - 8);

            // 索引
            ctx.fillStyle = '#64748b';
            ctx.font = '12px sans-serif';
            ctx.fillText(`[${i}]`, x + barW / 2, baseY + 16);
        });

        // 轴标签
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('索引 →', startX + n * barW + 8, baseY + 5);
    },

    _animArray(op) {
        const data = this._getArrayData();
        if (op === 'insert') {
            const val = this._getInputValue();
            data.splice(3, 0, val);
            this._refreshInputValue();
        } else if (op === 'delete') {
            const delVal = this._getInputValue();
            const delIdx = data.indexOf(delVal);
            if (delIdx >= 0) {
                data.splice(delIdx, 1);
                this._refreshInputValue();
            } else {
                this._redraw();
                const ctx = this.ctx; const w = this.canvas.width / (window.devicePixelRatio || 1);
                ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(`⚠️ 数组中未找到值 ${delVal}，无法删除`, w / 2, 30);
                if (typeof App !== 'undefined') App._onVisualizationAction(op);
                return;
            }
        } else if (op === 'search') {
            const target = this._getInputValue();
            const indices = [];
            data.forEach((v, i) => { if (v === target) indices.push(i); });
            if (indices.length > 0) {
                this._highlightIndices(indices, target);
            } else {
                this._redraw();
                const ctx = this.ctx; const w = this.canvas.width / (window.devicePixelRatio || 1);
                ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(`⚠️ 数组中未找到值 ${target}`, w / 2, 30);
                if (typeof App !== 'undefined') App._onVisualizationAction(op);
                return;
            }
        } else if (op === 'access') {
            const idx = this._getInputValue();
            if (idx >= 0 && idx < data.length) {
                this._highlightIndex(idx);
            } else {
                this._redraw();
                const ctx = this.ctx; const w = this.canvas.width / (window.devicePixelRatio || 1);
                ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 14px sans-serif'; ctx.textAlign = 'center';
                ctx.fillText(`⚠️ 索引 ${idx} 越界（数组长度 ${data.length}）`, w / 2, 30);
                if (typeof App !== 'undefined') App._onVisualizationAction(op);
                return;
            }
        } else if (op === 'traverse') {
            // 遍历：依次高亮每个元素
            this._redraw();
            const ctx = this.ctx; const w = this.canvas.width / (window.devicePixelRatio || 1);
            ctx.fillStyle = '#4f46e5';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`遍历结果: [${data.join(', ')}]`, w / 2, 30);
            if (typeof App !== 'undefined') App._onVisualizationAction(op);
            return;
        }
        this._arrayData = data;
        this._redraw();

        // 更新练习区提示
        if (typeof App !== 'undefined') {
            App._onVisualizationAction(op);
        }
    },

    _highlightIndex(idx) {
        const data = this._getArrayData();
        if (idx >= data.length) return;
        const ctx = this.ctx;
        const w = this.canvas.width / (window.devicePixelRatio || 1);
        const h = this.canvas.height / (window.devicePixelRatio || 1);
        const barW = Math.min(60, (w - 120) / data.length);
        const maxVal = Math.max(...data);
        const chartH = h - 120;
        const startX = (w - barW * data.length) / 2;
        const baseY = h - 80;
        const x = startX + idx * barW;
        const barH = (data[idx] / maxVal) * chartH * 0.9;
        const y = baseY - barH;

        // 闪烁效果
        let count = 0;
        const flash = () => {
            if (count >= 6) { this._redraw(); return; }
            this._redraw();

            // 高亮覆盖
            ctx.fillStyle = count % 2 === 0 ? this.colors.barCompare : this.colors.barSwap;
            ctx.fillRect(x + 1, y, barW - 2, barH);

            // 大标签
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`← 访问 [${idx}]=${data[idx]}`, x + barW / 2, y - 20);

            count++;
            setTimeout(flash, 400);
        };
        flash();
    },

    /** 高亮多个索引（用于查找重复值） */
    _highlightIndices(indices, target) {
        if (!indices.length) return;
        const data = this._getArrayData();
        const ctx = this.ctx;
        const w = this.canvas.width / (window.devicePixelRatio || 1);
        const h = this.canvas.height / (window.devicePixelRatio || 1);
        const barW = Math.min(60, (w - 120) / data.length);
        const maxVal = Math.max(...data);
        const chartH = h - 120;
        const startX = (w - barW * data.length) / 2;
        const baseY = h - 80;

        let count = 0;
        const flash = () => {
            if (count >= 6) { this._redraw(); return; }
            this._redraw();

            indices.forEach(idx => {
                if (idx >= data.length) return;
                const x = startX + idx * barW;
                const barH = (data[idx] / maxVal) * chartH * 0.9;
                const y = baseY - barH;
                ctx.fillStyle = count % 2 === 0 ? this.colors.barCompare : this.colors.barSwap;
                ctx.fillRect(x + 1, y, barW - 2, barH);
                ctx.fillStyle = '#1e293b';
                ctx.font = 'bold 13px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`[${idx}]=${target}`, x + barW / 2, y - 8);
            });

            // 顶部信息
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`🔍 找到 ${indices.length} 个 ${target}，位置：[${indices.join(', ')}]`, w / 2, 25);

            count++;
            setTimeout(flash, 400);
        };
        flash();
    },

    // ==================== 节点型可视化（链表/栈/队列） ====================
    _nodesData: null,
    _getNodesData() {
        if (!this._nodesData) {
            this._nodesData = ['A', 'B', 'C', 'D', 'E'];
        }
        return this._nodesData;
    },

    _drawNodes() {
        const ctx = this.ctx;
        const w = this.canvas.width / (window.devicePixelRatio || 1);
        const h = this.canvas.height / (window.devicePixelRatio || 1);
        const data = this._getNodesData();
        const n = data.length;
        const nodeR = 28;
        const totalW = n * 100;
        const startX = Math.max(40, (w - totalW) / 2);
        const cy = h / 2;

        // 连线（先画线再画节点，这样节点在上面）
        data.forEach((_, i) => {
            if (i < n - 1) {
                const x1 = startX + i * 100 + nodeR;
                const x2 = startX + (i + 1) * 100 - nodeR;
                ctx.strokeStyle = this.colors.edge;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x1, cy);
                ctx.lineTo(x2, cy);
                ctx.stroke();

                // 箭头
                const ax = x2 - 10;
                ctx.fillStyle = this.colors.edge;
                ctx.beginPath();
                ctx.moveTo(ax, cy - 6);
                ctx.lineTo(ax + 10, cy);
                ctx.lineTo(ax, cy + 6);
                ctx.closePath();
                ctx.fill();
            }
        });

        // 头指针
        ctx.strokeStyle = this.colors.pointer;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(startX - 40, cy - 25);
        ctx.lineTo(startX - 5, cy - 5);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = this.colors.pointer;
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('head', startX - 40, cy - 35);

        // 节点
        data.forEach((val, i) => {
            const x = startX + i * 100;
            this._drawNode(x, cy, val, nodeR);
        });

        // null 标记
        if (data.length > 0) {
            const lastX = startX + (n - 1) * 100 + nodeR;
            ctx.fillStyle = '#94a3b8';
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('null', lastX + 20, cy + 4);
        }
    },

    /** 画单个节点 */
    _drawNode(x, y, val, r = 28) {
        const ctx = this.ctx;
        // 阴影
        ctx.fillStyle = this.colors.nodeFill;
        ctx.strokeStyle = this.colors.nodeStroke;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 文字
        ctx.fillStyle = this.colors.nodeText;
        ctx.font = 'bold 15px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(val, x, y);
    },

    /** 在节点数组指定位置插入元素（带动画） */
    _insertNodeAt(index, value) {
        const data = this._getNodesData();
        data.splice(index, 0, value);
        this._nodesData = data;
        this._animateInsertNode(index);
    },

    _animateInsertNode(index) {
        // 用重绘 + 高亮模拟插入动画
        let flash = 0;
        const animate = () => {
            this._redraw();
            if (flash < 4) {
                const ctx = this.ctx;
                const w = this.canvas.width / (window.devicePixelRatio || 1);
                const h = this.canvas.height / (window.devicePixelRatio || 1);
                const n = this._nodesData.length;
                const totalW = n * 100;
                const startX = Math.max(40, (w - totalW) / 2);
                const cy = h / 2;
                const x = startX + index * 100;

                if (flash % 2 === 0) {
                    ctx.strokeStyle = '#10b981';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.arc(x, cy, 32, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.fillStyle = '#10b981';
                    ctx.font = 'bold 13px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('✨ 新插入', x, cy - 42);
                }
                flash++;
                setTimeout(animate, 350);
            }
        };
        animate();
    },

    _animNodes(op) {
        const data = this._getNodesData();
        if (op === 'insert_head') {
            this._insertNodeAt(0, this._getInputValue('X'));
            this._refreshInputValue();
        } else if (op === 'insert_tail') {
            this._insertNodeAt(data.length, this._getInputValue('X'));
            this._refreshInputValue();
        } else if (op === 'delete') {
            const delVal = String(this._getInputValue());
            const delIdx = data.findIndex(item => String(item) === delVal);
            if (delIdx >= 0) {
                data.splice(delIdx, 1);
                this._nodesData = data;
                this._refreshInputValue();
                this._redraw();
                const ctx = this.ctx; const w = this.canvas.width / (window.devicePixelRatio || 1);
                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`🗑️ 已删除节点 "${delVal}"`, w / 2, 30);
            } else {
                this._redraw();
                const ctx = this.ctx; const w = this.canvas.width / (window.devicePixelRatio || 1);
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`⚠️ 链表中未找到 "${delVal}"，无法删除`, w / 2, 30);
            }
        } else if (op === 'search') {
            const target = String(this._getInputValue());
            const indices = [];
            data.forEach((item, i) => { if (String(item) === target) indices.push(i); });
            this._redraw();
            const ctx = this.ctx;
            const w = this.canvas.width / (window.devicePixelRatio || 1);
            if (indices.length > 0) {
                ctx.fillStyle = '#10b981';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`🔍 找到 ${indices.length} 个 "${target}"，位于节点 [${indices.join(', ')}]`, w / 2, 30);
            } else {
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`⚠️ 链表中未找到 "${target}"`, w / 2, 30);
            }
        } else if (op === 'reverse') {
            data.reverse();
            this._nodesData = data;
            this._redraw();
            const ctx = this.ctx;
            const w = this.canvas.width / (window.devicePixelRatio || 1);
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('✅ 链表已反转！', w / 2, 30);
        }
    },

    // ==================== 栈可视化 ====================
    _stackData: null,
    _getStackData() {
        if (!this._stackData) {
            this._stackData = ['底部', '元素1', '元素2', '元素3'];
        }
        return this._stackData;
    },

    _drawStack() {
        const ctx = this.ctx;
        const w = this.canvas.width / (window.devicePixelRatio || 1);
        const h = this.canvas.height / (window.devicePixelRatio || 1);
        const data = this._getStackData();
        const boxW = 150, boxH = 36;
        const startY = h - 70;
        const cx = w / 2;

        data.forEach((val, i) => {
            const y = startY - (i + 1) * boxH;
            ctx.fillStyle = i === data.length - 1
                ? this.colors.nodeActive
                : this.colors.nodeFill;
            ctx.strokeStyle = this.colors.nodeStroke;
            ctx.lineWidth = 2;
            this._roundRect(cx - boxW / 2, y, boxW, boxH, 6);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = this.colors.nodeText;
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(val, cx, y + boxH / 2);

            // 标签
            if (i === data.length - 1) {
                ctx.fillStyle = '#10b981';
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText('← TOP（栈顶）', cx + boxW / 2 + 12, y + boxH / 2);
            }
        });

        // 底部线
        ctx.strokeStyle = '#94a3b8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx - boxW / 2 - 20, startY);
        ctx.lineTo(cx + boxW / 2 + 20, startY);
        ctx.stroke();
        ctx.fillStyle = '#94a3b8';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('BOTTOM', cx, startY + 18);
    },

    _animStack(op) {
        const data = this._getStackData();
        if (op === 'push') {
            data.push(String(this._getInputValue()));
            this._stackData = data;
            this._refreshInputValue();
            this._redraw();
        } else if (op === 'pop') {
            if (data.length > 0) {
                data.pop();
                this._stackData = data;
                this._redraw();
            }
        } else if (op === 'delete') {
            const delVal = this._getInputValue();
            const delIdx = data.lastIndexOf(String(delVal));
            if (delIdx >= 0) {
                data.splice(delIdx, 1);
                this._stackData = data;
                this._refreshInputValue();
                this._redraw();
                const ctx = this.ctx; const w = this.canvas.width / (window.devicePixelRatio || 1);
                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`🗑️ 已从栈中删除 "${delVal}"`, w / 2, 30);
            } else {
                this._redraw();
                const ctx = this.ctx; const w = this.canvas.width / (window.devicePixelRatio || 1);
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`⚠️ 栈中未找到 "${delVal}"`, w / 2, 30);
            }
        }
        // Peek：高亮栈顶，不做变化
        if (op === 'peek') {
            this._redraw();
            const ctx = this.ctx;
            const w = this.canvas.width / (window.devicePixelRatio || 1);
            if (data.length > 0) {
                ctx.fillStyle = '#10b981';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`👀 栈顶元素: ${data[data.length - 1]}`, w / 2, 30);
            } else {
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('⚠️ 栈为空', w / 2, 30);
            }
        }
    },

    // ==================== 队列可视化 ====================
    _queueData: null,
    _getQueueData() {
        if (!this._queueData) {
            this._queueData = ['A', 'B', 'C', 'D'];
        }
        return this._queueData;
    },

    _drawQueue() {
        const ctx = this.ctx;
        const w = this.canvas.width / (window.devicePixelRatio || 1);
        const h = this.canvas.height / (window.devicePixelRatio || 1);
        const data = this._getQueueData();
        const n = Math.max(data.length, 6);
        const cellW = 70, cellH = 44;
        const totalW = n * cellW;
        const startX = Math.max(20, (w - totalW) / 2);
        const cy = h / 2 - cellH / 2;

        // 空槽位
        for (let i = 0; i < n; i++) {
            ctx.strokeStyle = this.colors.grid;
            ctx.lineWidth = 1;
            ctx.strokeRect(startX + i * cellW, cy, cellW, cellH);
        }

        // 元素
        data.forEach((val, i) => {
            const x = startX + i * cellW;
            ctx.fillStyle = i === 0
                ? '#fef3c7' // front
                : i === data.length - 1
                    ? '#d1fae5' // rear
                    : this.colors.nodeFill;
            ctx.fillRect(x + 1, cy + 1, cellW - 2, cellH - 2);
            ctx.strokeStyle = this.colors.nodeStroke;
            ctx.lineWidth = 2;
            ctx.strokeRect(x + 1, cy + 1, cellW - 2, cellH - 2);

            ctx.fillStyle = this.colors.nodeText;
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(val, x + cellW / 2, cy + cellH / 2);

            if (i === 0) {
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 12px sans-serif';
                ctx.fillText('← front', x + cellW / 2, cy - 10);
            }
            if (i === data.length - 1 && data.length > 1) {
                ctx.fillStyle = '#10b981';
                ctx.font = 'bold 12px sans-serif';
                ctx.fillText('← rear', x + cellW / 2, cy - 10);
            }
        });
    },

    _animQueue(op) {
        const data = this._getQueueData();
        if (op === 'enqueue') {
            data.push(String(this._getInputValue()));
            this._queueData = data;
            this._refreshInputValue();
            this._redraw();
        } else if (op === 'dequeue') {
            if (data.length > 0) {
                data.shift();
                this._queueData = data;
                this._redraw();
            }
        } else if (op === 'delete') {
            const delVal = String(this._getInputValue());
            const delIdx = data.findIndex(item => String(item) === delVal);
            if (delIdx >= 0) {
                data.splice(delIdx, 1);
                this._queueData = data;
                this._refreshInputValue();
                this._redraw();
                const ctx = this.ctx; const w = this.canvas.width / (window.devicePixelRatio || 1);
                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`🗑️ 已从队列中删除 "${delVal}"`, w / 2, 30);
            } else {
                this._redraw();
                const ctx = this.ctx; const w = this.canvas.width / (window.devicePixelRatio || 1);
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`⚠️ 队列中未找到 "${delVal}"`, w / 2, 30);
            }
        }
        if (op === 'peek') {
            this._redraw();
            const ctx = this.ctx;
            const w = this.canvas.width / (window.devicePixelRatio || 1);
            if (data.length > 0) {
                ctx.fillStyle = '#10b981';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`👀 队首元素: ${data[0]}（front）`, w / 2, 30);
            } else {
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('⚠️ 队列为空', w / 2, 30);
            }
        }
    },

    // ==================== 树可视化 ====================
    _treeData: null,
    _getTreeData() {
        if (!this._treeData) {
            // 默认示例BST
            this._treeData = {
                val: 8,
                left: {
                    val: 3,
                    left: { val: 1, left: null, right: null },
                    right: {
                        val: 6,
                        left: { val: 4, left: null, right: null },
                        right: { val: 7, left: null, right: null }
                    }
                },
                right: {
                    val: 10,
                    left: null,
                    right: {
                        val: 14,
                        left: { val: 13, left: null, right: null },
                        right: null
                    }
                }
            };
        }
        return this._treeData;
    },

    _drawTree() {
        const ctx = this.ctx;
        const w = this.canvas.width / (window.devicePixelRatio || 1);
        const h = this.canvas.height / (window.devicePixelRatio || 1);

        // 先计算布局再绘制
        const tree = this._getTreeData();
        const nodeR = 22;
        this._drawTreeNode(tree, w / 2, 50, w / 4, 70, nodeR);
    },

    _drawTreeNode(node, x, y, offsetX, offsetY, r) {
        if (!node) return;
        const ctx = this.ctx;

        // 画左子节点及连线
        if (node.left) {
            const childX = x - offsetX;
            const childY = y + offsetY;
            ctx.strokeStyle = this.colors.edge;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, y + r);
            ctx.lineTo(childX, childY - r);
            ctx.stroke();
            this._drawTreeNode(node.left, childX, childY, offsetX / 2, offsetY, r);
        }

        // 画右子节点及连线
        if (node.right) {
            const childX = x + offsetX;
            const childY = y + offsetY;
            ctx.strokeStyle = this.colors.edge;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x, y + r);
            ctx.lineTo(childX, childY - r);
            ctx.stroke();
            this._drawTreeNode(node.right, childX, childY, offsetX / 2, offsetY, r);
        }

        // 画当前节点
        ctx.fillStyle = this.colors.nodeFill;
        ctx.strokeStyle = this.colors.nodeStroke;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = this.colors.nodeText;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(node.val, x, y);
    },

    _animTree(op) {
        const tree = this._getTreeData();
        if (op === 'insert') {
            const newVal = this._getInputValue();
            const exists = this._searchBST(tree, newVal, []).includes('found');
            if (exists) {
                this._redraw();
                const ctx = this.ctx;
                const w = this.canvas.width / (window.devicePixelRatio || 1);
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`⚠️ 节点 ${newVal} 已存在于树中，跳过插入`, w / 2, 20);
            } else {
                this._insertBST(tree, newVal);
                this._refreshInputValue();
            }
            this._treeData = tree;
            this._redraw();
            if (!exists) {
                const ctx = this.ctx;
                const w = this.canvas.width / (window.devicePixelRatio || 1);
                ctx.fillStyle = '#10b981';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`✅ 已插入节点: ${newVal}`, w / 2, 20);
            }
        } else if (op === 'search') {
            const target = this._getInputValue();
            const path = this._searchBST(tree, target, []);
            this._redraw();
            const ctx = this.ctx;
            const w = this.canvas.width / (window.devicePixelRatio || 1);
            if (path.length > 0 && path[path.length - 1] === 'found') {
                path.pop();
                ctx.fillStyle = '#10b981';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`🔍 找到 ${target}！路径: ${path.join(' → ')}`, w / 2, 20);
            } else {
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`⚠️ 树中不存在 ${target}（查找路径: ${path.join(' → ')}）`, w / 2, 20);
            }
        } else if (op === 'preorder' || op === 'inorder' || op === 'postorder') {
            const order = { 'preorder': 'pre', 'inorder': 'in', 'postorder': 'post' }[op];
            const result = [];
            this._traverseBST(tree, order, result);
            const ctx = this.ctx;
            const w = this.canvas.width / (window.devicePixelRatio || 1);
            this._redraw();
            ctx.fillStyle = '#4f46e5';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${this._opLabels[op] || op}遍历: [${result.join(', ')}]`, w / 2, 20);
        }
        // 层序
        if (op === 'levelorder') {
            const result = this._levelOrder(tree);
            const ctx = this.ctx;
            const w = this.canvas.width / (window.devicePixelRatio || 1);
            this._redraw();
            ctx.fillStyle = '#4f46e5';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`层序遍历: [${result.join(', ')}]`, w / 2, 20);
        }
        // BST 最小/最大值
        if (op === 'min' || op === 'max') {
            const result = op === 'min' ? this._findMin(tree) : this._findMax(tree);
            const ctx = this.ctx;
            const w = this.canvas.width / (window.devicePixelRatio || 1);
            this._redraw();
            ctx.fillStyle = '#4f46e5';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${op === 'min' ? '最小值' : '最大值'}: ${result}`, w / 2, 20);
        }
        // BST 删除（指定值）
        if (op === 'delete') {
            const delVal = this._getInputValue();
            const beforeDelete = this._searchBST(tree, delVal, []).includes('found');
            if (beforeDelete) {
                this._treeData = this._deleteBST(tree, delVal);
                this._refreshInputValue();
            }
            this._redraw();
            const ctx = this.ctx;
            const w = this.canvas.width / (window.devicePixelRatio || 1);
            if (beforeDelete) {
                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`🗑️ 已删除节点: ${delVal}`, w / 2, 20);
            } else {
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`⚠️ 树中不存在节点 ${delVal}，无法删除`, w / 2, 20);
            }
        }
    },

    /** BST 删除：返回新树根 */
    _deleteBST(node, val) {
        if (!node) return null;
        if (val < node.val) {
            node.left = this._deleteBST(node.left, val);
        } else if (val > node.val) {
            node.right = this._deleteBST(node.right, val);
        } else {
            // 找到要删除的节点
            if (!node.left) return node.right;
            if (!node.right) return node.left;
            // 有两个子节点：找右子树最小值替换
            const minNode = this._findMinNode(node.right);
            node.val = minNode.val;
            node.right = this._deleteBST(node.right, minNode.val);
        }
        return node;
    },

    _findMinNode(node) {
        while (node && node.left) node = node.left;
        return node;
    },

    _findMin(node) {
        while (node && node.left) node = node.left;
        return node ? node.val : null;
    },

    _findMax(node) {
        while (node && node.right) node = node.right;
        return node ? node.val : null;
    },

    _insertBST(node, val) {
        if (val === node.val) return; // 重复值，跳过插入
        if (val < node.val) {
            if (node.left) this._insertBST(node.left, val);
            else node.left = { val, left: null, right: null };
        } else {
            if (node.right) this._insertBST(node.right, val);
            else node.right = { val, left: null, right: null };
        }
    },

    _searchBST(node, target, path) {
        if (!node) return path;
        path.push(node.val);
        if (node.val === target) { path.push('found'); return path; }
        if (target < node.val) return this._searchBST(node.left, target, path);
        return this._searchBST(node.right, target, path);
    },

    _traverseBST(node, order, result) {
        if (!node) return;
        if (order === 'pre') result.push(node.val);
        this._traverseBST(node.left, order, result);
        if (order === 'in') result.push(node.val);
        this._traverseBST(node.right, order, result);
        if (order === 'post') result.push(node.val);
    },

    _levelOrder(root) {
        const result = [];
        const queue = [root];
        while (queue.length) {
            const node = queue.shift();
            if (node) {
                result.push(node.val);
                queue.push(node.left);
                queue.push(node.right);
            }
        }
        return result;
    },

    // ==================== 图可视化 ====================
    _graphData: null,
    _getGraphData() {
        if (!this._graphData) {
            this._graphData = {
                vertices: ['A', 'B', 'C', 'D', 'E', 'F'],
                edges: [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D'], ['C', 'E'], ['D', 'F'], ['E', 'F']],
                // 预设坐标（圆形布局）
                positions: null
            };
            // 计算圆形布局
            const gd = this._graphData;
            const cx = 0, cy = 0, radius = 120;
            gd.positions = {};
            gd.vertices.forEach((v, i) => {
                const angle = (2 * Math.PI / gd.vertices.length) * i - Math.PI / 2;
                gd.positions[v] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
            });
        }
        return this._graphData;
    },

    _drawGraph() {
        const ctx = this.ctx;
        const w = this.canvas.width / (window.devicePixelRatio || 1);
        const h = this.canvas.height / (window.devicePixelRatio || 1);
        const gd = this._getGraphData();
        const r = 24;
        const centerX = w / 2;
        const centerY = h / 2;

        // 边
        gd.edges.forEach(([v1, v2]) => {
            const p1 = gd.positions[v1];
            const p2 = gd.positions[v2];
            ctx.strokeStyle = this.colors.edge;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(centerX + p1.x, centerY + p1.y);
            ctx.lineTo(centerX + p2.x, centerY + p2.y);
            ctx.stroke();
        });

        // 顶点
        gd.vertices.forEach(v => {
            const p = gd.positions[v];
            const x = centerX + p.x;
            const y = centerY + p.y;

            ctx.fillStyle = this.colors.nodeFill;
            ctx.strokeStyle = this.colors.nodeStroke;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = this.colors.nodeText;
            ctx.font = 'bold 15px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(v, x, y);
        });
    },

    _animGraph(op) {
        const gd = this._getGraphData();
        const ctx = this.ctx;
        const w = this.canvas.width / (window.devicePixelRatio || 1);

        if (op === 'add_vertex') {
            const label = String(this._getInputValue());
            if (!gd.vertices.includes(label)) {
                gd.vertices.push(label);
                // 重新计算圆形布局
                const cx = 0, cy = 0, radius = 120;
                gd.positions = {};
                gd.vertices.forEach((v, i) => {
                    const angle = (2 * Math.PI / gd.vertices.length) * i - Math.PI / 2;
                    gd.positions[v] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
                });
                this._graphData = gd;
                this._redraw();
                ctx.fillStyle = '#10b981';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`✅ 已添加顶点: ${label}`, w / 2, 20);
            }
        } else if (op === 'add_edge') {
            const val = this._getInputValue();
            // 用值选择两个已有顶点
            if (gd.vertices.length >= 2) {
                const i1 = Math.abs(parseInt(val) || val.toString().charCodeAt(0)) % gd.vertices.length;
                const i2 = (i1 + 1 + (parseInt(val) % (gd.vertices.length - 1) || 1)) % gd.vertices.length;
                const v1 = gd.vertices[i1], v2 = gd.vertices[i2];
                const exists = gd.edges.some(e =>
                    (e[0] === v1 && e[1] === v2) || (e[0] === v2 && e[1] === v1));
                if (!exists) {
                    gd.edges.push([v1, v2]);
                    this._graphData = gd;
                    this._redraw();
                    ctx.fillStyle = '#10b981';
                    ctx.font = 'bold 14px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(`✅ 已添加边: ${v1} ↔ ${v2}`, w / 2, 20);
                } else {
                    ctx.fillStyle = '#f59e0b';
                    ctx.font = 'bold 14px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(`⚠️ 边 ${v1} ↔ ${v2} 已存在`, w / 2, 20);
                }
            }
        } else if (op === 'bfs') {
            this._redraw();
            ctx.fillStyle = '#4f46e5';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('BFS 遍历: ' + gd.vertices.join(' → '), w / 2, 20);
        } else if (op === 'delete_vertex') {
            const label = String(this._getInputValue());
            const vIdx = gd.vertices.indexOf(label);
            if (vIdx >= 0) {
                gd.vertices.splice(vIdx, 1);
                // 删除涉及该顶点的所有边
                gd.edges = gd.edges.filter(([v1, v2]) => v1 !== label && v2 !== label);
                // 重新计算圆形布局
                const cx = 0, cy = 0, radius = 120;
                gd.positions = {};
                gd.vertices.forEach((v, i) => {
                    const angle = (2 * Math.PI / Math.max(1, gd.vertices.length)) * i - Math.PI / 2;
                    gd.positions[v] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
                });
                this._graphData = gd;
                this._refreshInputValue();
                this._redraw();
                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`🗑️ 已删除顶点: ${label}（及相关边）`, w / 2, 20);
            } else {
                this._redraw();
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`⚠️ 图中不存在顶点 "${label}"`, w / 2, 20);
            }
        } else if (op === 'dfs') {
            this._redraw();
            ctx.fillStyle = '#4f46e5';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('DFS 遍历: ' + gd.vertices.join(' → '), w / 2, 20);
        }
    },

    // ==================== 哈希表可视化 ====================
    _hashData: null,
    _getHashData() {
        if (!this._hashData) {
            this._hashData = {
                buckets: [
                    [{ key: 'apple', val: '🍎' }],
                    [],
                    [{ key: 'banana', val: '🍌' }],
                    [{ key: 'cat', val: '🐱' }],
                    [],
                    [{ key: 'dog', val: '🐶' }, { key: 'egg', val: '🥚' }],
                    [],
                    [{ key: 'fish', val: '🐟' }]
                ]
            };
        }
        return this._hashData;
    },

    _drawHash() {
        const ctx = this.ctx;
        const w = this.canvas.width / (window.devicePixelRatio || 1);
        const h = this.canvas.height / (window.devicePixelRatio || 1);
        const hd = this._getHashData();
        const n = hd.buckets.length;
        const bucketW = 90, bucketH = 50;
        const totalW = n * bucketW;
        const startX = Math.max(10, (w - totalW) / 2);
        const startY = 40;

        hd.buckets.forEach((bucket, i) => {
            const x = startX + i * bucketW;
            const y = startY;

            // 桶
            ctx.fillStyle = bucket.length > 0 ? this.colors.nodeFill : '#f8fafc';
            ctx.strokeStyle = this.colors.nodeStroke;
            ctx.lineWidth = 1.5;
            this._roundRect(x + 2, y, bucketW - 4, bucketH, 6);
            ctx.fill();
            ctx.stroke();

            // 索引
            ctx.fillStyle = '#94a3b8';
            ctx.font = '11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`[${i}]`, x + bucketW / 2, y - 6);

            // 内容
            if (bucket.length === 0) {
                ctx.fillStyle = '#cbd5e1';
                ctx.font = '12px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText('空', x + bucketW / 2, y + bucketH / 2);
            } else {
                bucket.forEach((entry, j) => {
                    ctx.fillStyle = this.colors.nodeText;
                    ctx.font = '11px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(
                        `${entry.key}${entry.val}`,
                        x + bucketW / 2,
                        y + bucketH / 2 + (j - (bucket.length - 1) / 2) * 16
                    );
                });
            }
        });

        // 图例
        ctx.fillStyle = '#64748b';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('哈希表（链地址法）：hash(key) → 桶索引', w / 2, startY + bucketH + 40);
    },

    _animHash(op) {
        const hd = this._getHashData();
        const n = hd.buckets.length;
        const ctx = this.ctx;
        const w = this.canvas.width / (window.devicePixelRatio || 1);

        if (op === 'put') {
            const val = this._getInputValue();
            const key = 'k' + val;
            const idx = Math.abs(parseInt(val) || val.toString().charCodeAt(0)) % n;
            // 检查是否已存在
            const bucket = hd.buckets[idx];
            const existIdx = bucket.findIndex(e => e.key === key);
            if (existIdx >= 0) {
                bucket[existIdx].val = String(val);
            } else {
                bucket.push({ key: key, val: String(val) });
            }
            this._hashData = hd;
            this._redraw();
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`✅ Put: hash("${key}") → 桶[${idx}] = ${val}`, w / 2, 20);
        } else if (op === 'get') {
            const val = this._getInputValue();
            const key = 'k' + val;
            const idx = Math.abs(parseInt(val) || val.toString().charCodeAt(0)) % n;
            const bucket = hd.buckets[idx];
            const entry = bucket.find(e => e.key === key);
            this._redraw();
            if (entry) {
                ctx.fillStyle = '#10b981';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`🔍 Get: "${key}" → 桶[${idx}] = ${entry.val}`, w / 2, 20);
            } else {
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`⚠️ "${key}" 不在表中（桶[${idx}] 无此键）`, w / 2, 20);
            }
        } else if (op === 'delete') {
            const val = this._getInputValue();
            const key = 'k' + val;
            let found = false;
            for (let i = 0; i < hd.buckets.length; i++) {
                const bucket = hd.buckets[i];
                const idx = bucket.findIndex(e => e.key === key);
                if (idx >= 0) {
                    bucket.splice(idx, 1);
                    found = true;
                    break;
                }
            }
            this._hashData = hd;
            this._redraw();
            if (found) {
                this._refreshInputValue();
                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`🗑️ Delete: 已删除 "${key}"`, w / 2, 20);
            } else {
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`⚠️ "${key}" 不在表中，无法删除`, w / 2, 20);
            }
        } else if (op === 'contains') {
            const val = this._getInputValue();
            const key = 'k' + val;
            const idx = Math.abs(parseInt(val) || val.toString().charCodeAt(0)) % n;
            const bucket = hd.buckets[idx];
            const found = bucket.some(e => e.key === key);
            this._redraw();
            if (found) {
                ctx.fillStyle = '#10b981';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`✅ "${key}" 存在于桶[${idx}]`, w / 2, 20);
            } else {
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`⚠️ "${key}" 不存在于表中`, w / 2, 20);
            }
        }
    },

    // ==================== 堆可视化（基于数组的完全二叉树） ====================
    _heapArrayData: null,
    _getHeapData() {
        if (!this._heapArrayData) {
            // 默认大顶堆：父节点 >= 子节点
            this._heapArrayData = [50, 35, 40, 20, 15, 30, 25, 5, 10];
        }
        return this._heapArrayData;
    },

    /** 绘制堆 —— 完全二叉树 + 数组索引 */
    _drawHeapVisual() {
        const ctx = this.ctx;
        const w = this.canvas.width / (window.devicePixelRatio || 1);
        const h = this.canvas.height / (window.devicePixelRatio || 1);
        const arr = this._getHeapData();
        const n = arr.length;
        const nodeR = 26;
        const levelHeight = 80;
        const cx = w / 2;

        // 计算每层节点数及起始Y
        const drawNodeAndChildren = (index, x, y, offsetX) => {
            if (index >= n) return;
            const val = arr[index];
            const leftIdx = 2 * index + 1;
            const rightIdx = 2 * index + 2;

            // 画左子连线
            if (leftIdx < n) {
                const childX = x - offsetX;
                const childY = y + levelHeight;
                ctx.strokeStyle = this.colors.edge;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x, y + nodeR);
                ctx.lineTo(childX, childY - nodeR);
                ctx.stroke();
                drawNodeAndChildren(leftIdx, childX, childY, offsetX / 2);
            }

            // 画右子连线
            if (rightIdx < n) {
                const childX = x + offsetX;
                const childY = y + levelHeight;
                ctx.strokeStyle = this.colors.edge;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(x, y + nodeR);
                ctx.lineTo(childX, childY - nodeR);
                ctx.stroke();
                drawNodeAndChildren(rightIdx, childX, childY, offsetX / 2);
            }

            // 画节点（根节点 / AI 高亮节点）
            const isRoot = index === 0;
            const isHighlighted = this._heapHighlights && this._heapHighlights.includes(index);
            ctx.fillStyle = isHighlighted ? this.colors.nodeHighlight
                : isRoot ? this.colors.nodeActive : this.colors.nodeFill;
            ctx.strokeStyle = this.colors.nodeStroke;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(x, y, nodeR, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

            // 显示值
            ctx.fillStyle = this.colors.nodeText;
            ctx.font = 'bold 13px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(val, x, y);

            // 显示数组索引
            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px monospace';
            ctx.fillText(`[${index}]`, x, y + nodeR + 14);
        };

        drawNodeAndChildren(0, cx, 60, w / 4);

        // 底部数组展示
        const arrY = h - 55;
        const cellW = Math.min(48, (w - 80) / n);
        const startX = (w - cellW * n) / 2;
        ctx.fillStyle = '#64748b';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('底层数组:', 60, arrY - 8);

        for (let i = 0; i < n; i++) {
            const x = startX + i * cellW;
            ctx.fillStyle = i === 0 ? '#d1fae5' : '#f8fafc';
            ctx.strokeStyle = this.colors.nodeStroke;
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x, arrY, cellW, 28);
            ctx.fillRect(x + 1, arrY + 1, cellW - 2, 27);
            ctx.fillStyle = this.colors.nodeText;
            ctx.font = '12px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(arr[i], x + cellW / 2, arrY + 14);
            ctx.fillStyle = '#94a3b8';
            ctx.font = '10px sans-serif';
            ctx.fillText(`[${i}]`, x + cellW / 2, arrY + 32);
        }

        // 图例
        ctx.fillStyle = '#64748b';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('大顶堆 · 完全二叉树（左子=2i+1, 右子=2i+2）', w / 2, h - 10);
    },

    /** 堆操作动画 */
    _animHeapVisual(op) {
        const arr = this._getHeapData();
        const ctx = this.ctx;
        const w = this.canvas.width / (window.devicePixelRatio || 1);

        if (op === 'insert') {
            const val = this._getInputValue();
            // 检查重复
            if (arr.includes(val)) {
                this._redraw();
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`⚠️ 值 ${val} 已存在于堆中`, w / 2, 20);
                this._refreshInputValue();
                return;
            }
            arr.push(val);
            this._siftUp(arr, arr.length - 1);
            this._heapArrayData = arr;
            this._refreshInputValue();
            this._redraw();
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`✅ 堆插入: ${val}（已上浮至正确位置）`, w / 2, 20);
        } else if (op === 'extract_top' || op === 'delete') {
            if (arr.length === 0) {
                this._redraw();
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('⚠️ 堆为空，无法取出堆顶', w / 2, 20);
                return;
            }
            const top = arr[0];
            arr[0] = arr[arr.length - 1];
            arr.pop();
            if (arr.length > 0) this._siftDown(arr, 0);
            this._heapArrayData = arr;
            this._redraw();
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`🗑️ 取出堆顶: ${top}（已下沉调整）`, w / 2, 20);
        } else if (op === 'heapify') {
            // 从最后一个非叶子节点开始下沉
            for (let i = Math.floor(arr.length / 2) - 1; i >= 0; i--) {
                this._siftDown(arr, i);
            }
            this._heapArrayData = arr;
            this._redraw();
            ctx.fillStyle = '#4f46e5';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('✅ 建堆完成：已调整为合法的大顶堆', w / 2, 20);
        } else if (op === 'delete') {
            const delVal = this._getInputValue();
            const delIdx = arr.indexOf(delVal);
            if (delIdx >= 0) {
                arr.splice(delIdx, 1);
                // 重新建堆
                for (let i = Math.floor(arr.length / 2) - 1; i >= 0; i--) {
                    this._siftDown(arr, i);
                }
                this._heapArrayData = arr;
                this._refreshInputValue();
                this._redraw();
                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`🗑️ 已删除堆中元素: ${delVal}（已重新堆化）`, w / 2, 20);
            } else {
                this._redraw();
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`⚠️ 堆中未找到值 ${delVal}`, w / 2, 20);
                this._refreshInputValue();
            }
        } else if (op === 'peek') {
            this._redraw();
            if (arr.length > 0) {
                ctx.fillStyle = '#10b981';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`👀 堆顶元素: ${arr[0]}`, w / 2, 20);
            } else {
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('⚠️ 堆为空', w / 2, 20);
            }
        }
    },

    /** 上浮：将 index 位置的元素向上调整到大顶堆合法位置 */
    _siftUp(arr, idx) {
        while (idx > 0) {
            const parent = Math.floor((idx - 1) / 2);
            if (arr[idx] <= arr[parent]) break;
            [arr[idx], arr[parent]] = [arr[parent], arr[idx]];
            idx = parent;
        }
    },

    /** 下沉：将 index 位置的元素向下调整到大顶堆合法位置 */
    _siftDown(arr, idx) {
        const n = arr.length;
        while (true) {
            let largest = idx;
            const left = 2 * idx + 1;
            const right = 2 * idx + 2;
            if (left < n && arr[left] > arr[largest]) largest = left;
            if (right < n && arr[right] > arr[largest]) largest = right;
            if (largest === idx) break;
            [arr[idx], arr[largest]] = [arr[largest], arr[idx]];
            idx = largest;
        }
    },

    // ==================== 排序可视化 ====================
    _sortData: null,
    _getSortData() {
        if (!this._sortData) {
            this._sortData = [64, 34, 25, 12, 22, 11, 90, 45, 55, 78];
        }
        return this._sortData;
    },

    /** 绘制排序数组 */
    _drawSort() {
        const ctx = this.ctx;
        const w = this.canvas.width / (window.devicePixelRatio || 1);
        const h = this.canvas.height / (window.devicePixelRatio || 1);
        const data = this._getSortData();
        const n = data.length;
        const barW = Math.min(55, (w - 120) / n);
        const maxVal = Math.max(...data);
        const chartH = h - 140;
        const startX = (w - barW * n) / 2;
        const baseY = h - 80;

        // 画网格
        ctx.strokeStyle = this.colors.grid;
        ctx.lineWidth = 1;
        for (let i = 0; i <= 5; i++) {
            const y = baseY - (chartH / 5) * i;
            ctx.beginPath();
            ctx.moveTo(40, y);
            ctx.lineTo(w - 40, y);
            ctx.stroke();
        }

        // 画柱子
        data.forEach((val, i) => {
            const x = startX + i * barW;
            const barH = (val / maxVal) * chartH * 0.9;
            const y = baseY - barH;

            // 柱子渐变色
            const gradient = ctx.createLinearGradient(x, y, x, baseY);
            gradient.addColorStop(0, '#818cf8');
            gradient.addColorStop(1, '#c7d2fe');
            ctx.fillStyle = gradient;
            ctx.fillRect(x + 3, y, barW - 6, barH);

            // 数值
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 12px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(val, x + barW / 2, y - 8);

            // 索引
            ctx.fillStyle = '#64748b';
            ctx.font = '11px sans-serif';
            ctx.fillText(`[${i}]`, x + barW / 2, baseY + 16);
        });

        // 标题
        const topicName = this.currentTopic ? this.currentTopic.name : '';
        ctx.fillStyle = '#64748b';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${topicName} · 点击下方按钮观察排序过程`, w / 2, 25);
    },

    /** 排序操作动画 */
    _animSort(op) {
        const data = this._getSortData();
        const ctx = this.ctx;
        const w = this.canvas.width / (window.devicePixelRatio || 1);
        const h = this.canvas.height / (window.devicePixelRatio || 1);

        // ===== 数据操作 =====
        if (op === 'add_element') {
            const val = this._getInputValue();
            // 提示用户选择插入位置：默认追加到末尾
            data.push(val);
            this._sortData = data;
            this._refreshInputValue();
            this._redraw();
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`✅ 已添加元素: ${val}（追加到末尾，数组长度=${data.length}）`, w / 2, 20);
            if (typeof App !== 'undefined') App._onVisualizationAction('add_element');
            return;
        }

        if (op === 'remove_element') {
            const delVal = this._getInputValue();
            const delIdx = data.indexOf(delVal);
            if (delIdx >= 0) {
                if (data.length <= 2) {
                    this._redraw();
                    ctx.fillStyle = '#f59e0b';
                    ctx.font = 'bold 14px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('⚠️ 至少保留 2 个元素', w / 2, 20);
                    return;
                }
                data.splice(delIdx, 1);
                this._sortData = data;
                this._refreshInputValue();
                this._redraw();
                ctx.fillStyle = '#ef4444';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`🗑️ 已删除元素: ${delVal}（剩余 ${data.length} 个）`, w / 2, 20);
            } else {
                this._redraw();
                ctx.fillStyle = '#f59e0b';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`⚠️ 未找到值 ${delVal}，无法删除`, w / 2, 20);
            }
            if (typeof App !== 'undefined') App._onVisualizationAction('remove_element');
            return;
        }

        if (op === 'shuffle') {
            // Fisher-Yates 洗牌
            for (let i = data.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [data[i], data[j]] = [data[j], data[i]];
            }
            this._sortData = data;
            this._redraw();
            ctx.fillStyle = '#4f46e5';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`🔀 已随机打乱: [${data.join(', ')}]`, w / 2, 20);
            if (typeof App !== 'undefined') App._onVisualizationAction('shuffle');
            return;
        }

        // ===== 排序算法操作 =====
        if (op === 'compare') {
            // 高亮比较相邻元素
            this._redraw();
            const n = data.length;
            const barW = Math.min(55, (w - 120) / n);
            const maxVal = Math.max(...data);
            const chartH = h - 140;
            const startX = (w - barW * n) / 2;
            const baseY = h - 80;

            let i = 0;
            const compareStep = () => {
                if (i >= n - 1) {
                    this._redraw();
                    ctx.fillStyle = '#10b981';
                    ctx.font = 'bold 14px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('✅ 比较完成：一趟相邻元素比较结束', w / 2, 20);
                    return;
                }
                this._redraw();
                // 高亮比较的两个柱子
                const x1 = startX + i * barW;
                const x2 = startX + (i + 1) * barW;
                const barH1 = (data[i] / maxVal) * chartH * 0.9;
                const barH2 = (data[i + 1] / maxVal) * chartH * 0.9;

                ctx.fillStyle = this.colors.barCompare;
                ctx.fillRect(x1 + 1, baseY - barH1, barW - 2, barH1);
                ctx.fillRect(x2 + 1, baseY - barH2, barW - 2, barH2);

                const cmp = data[i] > data[i + 1] ? '>' : '≤';
                ctx.fillStyle = '#1e293b';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`比较: [${i}]=${data[i]} ${cmp} [${i + 1}]=${data[i + 1]}`, w / 2, 25);

                i++;
                setTimeout(compareStep, 600);
            };
            compareStep();
        } else if (op === 'partition') {
            // 快速排序分区：以最后一个元素为pivot，展示一趟分区
            this._redraw();
            const n = data.length;
            const barW = Math.min(55, (w - 120) / n);
            const maxVal = Math.max(...data);
            const chartH = h - 140;
            const startX = (w - barW * n) / 2;
            const baseY = h - 80;
            const pivot = data[n - 1];

            // 高亮 pivot
            const px = startX + (n - 1) * barW;
            const pbarH = (pivot / maxVal) * chartH * 0.9;
            ctx.fillStyle = this.colors.barSwap;
            ctx.fillRect(px + 1, baseY - pbarH, barW - 2, pbarH);
            ctx.fillStyle = '#1e293b';
            ctx.font = 'bold 13px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`← pivot=${pivot}`, px + barW / 2, baseY - pbarH - 16);

            // 模拟分区过程
            let j = 0;
            const arr = [...data];
            const partitionStep = () => {
                if (j >= n - 1) {
                    this._redraw();
                    ctx.fillStyle = '#10b981';
                    ctx.font = 'bold 14px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('✅ 一趟分区完成：pivot 左侧 ≤ pivot < 右侧', w / 2, 20);
                    if (typeof App !== 'undefined') App._onVisualizationAction('partition');
                    return;
                }
                this._redraw();
                // 再次高亮pivot
                const pbarH2 = (pivot / maxVal) * chartH * 0.9;
                ctx.fillStyle = this.colors.barSwap;
                ctx.fillRect(px + 1, baseY - pbarH2, barW - 2, pbarH2);

                // 高亮当前扫描元素
                const jx = startX + j * barW;
                const jbarH = (arr[j] / maxVal) * chartH * 0.9;
                ctx.fillStyle = arr[j] <= pivot ? this.colors.nodeActive : this.colors.barCompare;
                ctx.fillRect(jx + 1, baseY - jbarH, barW - 2, jbarH);

                ctx.fillStyle = '#1e293b';
                ctx.font = 'bold 13px sans-serif';
                ctx.textAlign = 'center';
                const label = arr[j] <= pivot ? `${arr[j]} ≤ ${pivot}` : `${arr[j]} > ${pivot}`;
                ctx.fillText(`扫描 [${j}]: ${label}`, w / 2, 25);

                j++;
                setTimeout(partitionStep, 500);
            };
            partitionStep();
        } else if (op === 'merge') {
            // 归并排序合并：展示两个有序段合并
            const arr = [...data];
            const mid = Math.floor(arr.length / 2);
            // 先对两半分别排序以模拟
            const left = arr.slice(0, mid).sort((a, b) => a - b);
            const right = arr.slice(mid).sort((a, b) => a - b);

            this._redraw();
            ctx.fillStyle = '#4f46e5';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`合并: 左段[${left.join(',')}] + 右段[${right.join(',')}]`, w / 2, 20);

            let li = 0, ri = 0;
            const merged = [];
            const mergeStep = () => {
                if (li >= left.length && ri >= right.length) {
                    // 更新排序数据
                    for (let k = 0; k < merged.length; k++) {
                        this._sortData[k] = merged[k];
                    }
                    this._redraw();
                    ctx.fillStyle = '#10b981';
                    ctx.font = 'bold 14px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(`✅ 合并完成: [${merged.join(', ')}]`, w / 2, 20);
                    if (typeof App !== 'undefined') App._onVisualizationAction('merge');
                    return;
                }
                if (ri >= right.length || (li < left.length && left[li] <= right[ri])) {
                    merged.push(left[li++]);
                } else {
                    merged.push(right[ri++]);
                }
                this._redraw();
                ctx.fillStyle = '#4f46e5';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(`合并中: [${merged.join(', ')}]`, w / 2, 20);
                setTimeout(mergeStep, 400);
            };
            mergeStep();
        } else if (op === 'sort') {
            // 执行一趟冒泡排序展示
            const arr = [...data];
            const n = arr.length;
            let pass = 0;
            const bubbleStep = () => {
                if (pass >= n - 1) {
                    this._sortData = arr;
                    this._redraw();
                    ctx.fillStyle = '#10b981';
                    ctx.font = 'bold 14px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(`✅ 排序完成: [${arr.join(', ')}]`, w / 2, 20);
                    if (typeof App !== 'undefined') App._onVisualizationAction('sort');
                    return;
                }
                // 一趟冒泡
                let j = 0;
                const innerStep = () => {
                    if (j >= n - 1 - pass) {
                        pass++;
                        this._sortData = [...arr];
                        this._redraw();
                        ctx.fillStyle = '#1e293b';
                        ctx.font = 'bold 14px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText(`第 ${pass} 趟完成: [${arr.join(', ')}]`, w / 2, 20);
                        setTimeout(bubbleStep, 500);
                        return;
                    }
                    if (arr[j] > arr[j + 1]) {
                        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
                    }
                    j++;
                    this._sortData = [...arr];
                    this._redraw();
                    // 高亮比较位置
                    const barW = Math.min(55, (w - 120) / n);
                    const maxVal = Math.max(...arr);
                    const chartH = h - 140;
                    const startX = (w - barW * n) / 2;
                    const baseY = h - 80;
                    const x1 = startX + (j - 1) * barW;
                    const x2 = startX + j * barW;
                    const barH1 = (arr[j - 1] / maxVal) * chartH * 0.9;
                    const barH2 = (arr[j] / maxVal) * chartH * 0.9;
                    ctx.fillStyle = this.colors.barCompare;
                    ctx.fillRect(x1 + 1, baseY - barH1, barW - 2, barH1);
                    ctx.fillRect(x2 + 1, baseY - barH2, barW - 2, barH2);
                    setTimeout(innerStep, 250);
                };
                innerStep();
            };
            bubbleStep();
        }
    },

    /** 通用：执行来自 AI 的结构化画布指令 */
    executeVizCommand(cmd) {
        if (!cmd || !cmd.action) return;
        const topic = this.currentTopic;
        if (!topic) return;

        // 通用高亮（数组 / 堆 / 树 / 链表节点等）
        if (cmd.action === 'highlight' && cmd.indices && cmd.indices.length > 0) {
            if (topic.visualType === 'array' || topic.id === 'quick-sort' ||
                topic.id === 'merge-sort' || topic.id === 'sorting-intro') {
                // 数组类型：重绘后高亮指定柱子
                this._redraw();
                const ctx = this.ctx;
                const w = this.canvas.width / (window.devicePixelRatio || 1);
                const h = this.canvas.height / (window.devicePixelRatio || 1);
                const data = topic.id === 'heap' ? this._getHeapData()
                    : (topic.visualType === 'array' ? this._getArrayData() : this._getSortData());
                const n = data.length;
                const barW = Math.min(60, (w - 120) / n);
                const maxVal = Math.max(...data);
                const chartH = h - (topic.id.includes('sort') ? 140 : 120);
                const startX = (w - barW * n) / 2;
                const baseY = h - 80;
                cmd.indices.forEach(idx => {
                    if (idx >= 0 && idx < n) {
                        const x = startX + idx * barW;
                        const barH = (data[idx] / maxVal) * chartH * 0.9;
                        const y = baseY - barH;
                        ctx.fillStyle = this.colors.barCompare;
                        ctx.fillRect(x + 1, y, barW - 2, barH);
                    }
                });
            } else if (topic.id === 'heap') {
                // 堆：重新绘制后高亮节点（通过 _heapHighlights 标记）
                this._heapHighlights = cmd.indices;
                this._redraw();
                setTimeout(() => { this._heapHighlights = null; this._redraw(); }, 3000);
            } else {
                // 默认：重绘并显示文本
                this._redraw();
            }
        }

        // 插入操作
        if (cmd.action === 'insert' && cmd.value !== undefined) {
            if (topic.id === 'heap') {
                this._animHeapVisual('insert');
            } else if (topic.visualType === 'array') {
                this._animArray('insert');
            } else if (topic.visualType === 'tree') {
                this._animTree('insert');
            } else if (topic.visualType === 'nodes') {
                this._animNodes('insert_head');
            }
        }

        // 堆取顶
        if (cmd.action === 'extract') {
            if (topic.id === 'heap') this._animHeapVisual('extract_top');
        }

        // 遍历
        if (cmd.action === 'traverse' && cmd.order) {
            if (topic.visualType === 'tree') {
                this._animTree(cmd.order);
            }
        }

        // 栈操作
        if (cmd.action === 'push' && cmd.value !== undefined) {
            if (topic.visualType === 'stack') this._animStack('push');
        }
        if (cmd.action === 'pop') {
            if (topic.visualType === 'stack') this._animStack('pop');
        }

        // 队列操作
        if (cmd.action === 'enqueue' && cmd.value !== undefined) {
            if (topic.visualType === 'queue') this._animQueue('enqueue');
        }
        if (cmd.action === 'dequeue') {
            if (topic.visualType === 'queue') this._animQueue('dequeue');
        }

        // 链表操作
        if (cmd.action === 'insert_head' || cmd.action === 'insert_tail') {
            if (topic.visualType === 'nodes') this._animNodes(cmd.action);
        }

        // 重置
        if (cmd.action === 'reset') {
            this._heapHighlights = null;
            this._redraw();
        }
    },

    // ==================== 通用方法 ====================
    /** 重置当前主题的可视化数据 */
    resetData() {
        this._arrayData = null;
        this._nodesData = null;
        this._stackData = null;
        this._queueData = null;
        this._treeData = null;
        this._graphData = null;
        this._hashData = null;
        this._heapArrayData = null;
        this._sortData = null;
        if (this.currentTopic) {
            this._redraw();
        }
    }
};

// 初始化（DOM 加载后由 app.js 调用）
