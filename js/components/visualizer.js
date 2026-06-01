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

    /** 是否有自定义值输入 */
    _needsValueInput(op) {
        // 需要插入/添加值的操作
        const withValue = ['插入', '头插', '尾插', 'Push', '入队', 'Put', 'Get', '加顶点', '加边'];
        return withValue.includes(op);
    },

    /** 渲染操作按钮（含自定义值输入框） */
    _renderControls(topic) {
        const container = document.getElementById('viz-controls');
        if (!container) return;

        const labels = {
            array: ['访问', '插入', '删除', '查找'],
            nodes: ['头插', '尾插', '删除', '反转'],
            stack: ['Push', 'Pop', 'Peek'],
            queue: ['入队', '出队', 'Peek'],
            tree: ['插入', '查找', '前序', '中序', '后序', '层序'],
            graph: ['BFS', 'DFS', '加边', '加顶点'],
            hash: ['Put', 'Get', 'Delete']
        };

        const ops = labels[topic.visualType] || topic.operations;
        const hasInsertOp = ops.some(op => this._needsValueInput(op));

        container.innerHTML =
            (hasInsertOp
                ? `<label style="font-size:12px;color:var(--text-secondary);margin-right:4px;">值:</label>
                   <input id="viz-value-input" type="number" value="${Math.floor(Math.random() * 90) + 10}"
                    style="width:55px;padding:4px 6px;border:1px solid var(--border);border-radius:5px;font-size:12px;margin-right:8px;">`
                : '') +
            ops.map((op, i) =>
                `<button class="viz-btn" data-op="${op}" ${i === 0 ? 'class="active"' : ''}>${op}</button>`
            ).join('');

        // 绑定事件
        container.querySelectorAll('.viz-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.viz-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this._handleOperation(btn.dataset.op, topic);
            });
        });
    },

    /** 读取用户输入的值 */
    _getInputValue(defaultVal = null) {
        const input = document.getElementById('viz-value-input');
        if (input && input.value.trim() !== '') {
            return parseInt(input.value) || input.value;
        }
        return defaultVal !== null ? defaultVal : Math.floor(Math.random() * 90) + 10;
    },

    /** 处理操作按钮点击 */
    _handleOperation(op, topic) {
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
        if (op === '插入') {
            data.splice(3, 0, this._getInputValue());
        } else if (op === '删除') {
            if (data.length > 0) data.splice(data.length - 1, 1);
        } else if (op === '查找') {
            this._highlightIndex(4);
            return;
        } else if (op === '访问') {
            this._highlightIndex(2);
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
        if (op === '头插') {
            this._insertNodeAt(0, this._getInputValue('X'));
        } else if (op === '尾插') {
            this._insertNodeAt(data.length, this._getInputValue('X'));
        } else if (op === '删除') {
            if (data.length > 0) {
                data.splice(data.length - 1, 1);
                this._nodesData = data;
                this._redraw();
            }
        } else if (op === '反转') {
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
        if (op === 'Push') {
            data.push(String(this._getInputValue()));
            this._stackData = data;
            this._redraw();
        } else if (op === 'Pop') {
            if (data.length > 0) {
                data.pop();
                this._stackData = data;
                this._redraw();
            }
        }
        // Peek：不做变化
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
        if (op === '入队') {
            data.push(String(this._getInputValue()));
            this._queueData = data;
            this._redraw();
        } else if (op === '出队') {
            if (data.length > 0) {
                data.shift();
                this._queueData = data;
                this._redraw();
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
        if (op === '插入') {
            const newVal = this._getInputValue();
            this._insertBST(tree, newVal);
            this._treeData = tree;
            this._redraw();
            const ctx = this.ctx;
            const w = this.canvas.width / (window.devicePixelRatio || 1);
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`✅ 已插入节点: ${newVal}`, w / 2, 20);
        } else if (op === '前序' || op === '中序' || op === '后序') {
            const order = { '前序': 'pre', '中序': 'in', '后序': 'post' }[op];
            const result = [];
            this._traverseBST(tree, order, result);
            const ctx = this.ctx;
            const w = this.canvas.width / (window.devicePixelRatio || 1);
            this._redraw();
            ctx.fillStyle = '#4f46e5';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`${op}遍历: [${result.join(', ')}]`, w / 2, 20);
        }
        // 层序
        if (op === '层序') {
            const result = this._levelOrder(tree);
            const ctx = this.ctx;
            const w = this.canvas.width / (window.devicePixelRatio || 1);
            this._redraw();
            ctx.fillStyle = '#4f46e5';
            ctx.font = 'bold 14px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`层序遍历: [${result.join(', ')}]`, w / 2, 20);
        }
    },

    _insertBST(node, val) {
        if (val < node.val) {
            if (node.left) this._insertBST(node.left, val);
            else node.left = { val, left: null, right: null };
        } else {
            if (node.right) this._insertBST(node.right, val);
            else node.right = { val, left: null, right: null };
        }
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

        if (op === '加顶点') {
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
        } else if (op === '加边') {
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
        } else if (op === 'BFS') {
            this._redraw();
            ctx.fillStyle = '#4f46e5';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('BFS 遍历: ' + gd.vertices.join(' → '), w / 2, 20);
        } else if (op === 'DFS') {
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

        if (op === 'Put') {
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
        } else if (op === 'Get') {
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
        } else if (op === 'Delete') {
            if (hd.buckets.some(b => b.length > 0)) {
                // 删除所有桶中最后一个有元素的桶的第一个元素
                for (let i = hd.buckets.length - 1; i >= 0; i--) {
                    if (hd.buckets[i].length > 0) {
                        const removed = hd.buckets[i].pop();
                        this._hashData = hd;
                        this._redraw();
                        ctx.fillStyle = '#ef4444';
                        ctx.font = 'bold 14px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText(`🗑️ Delete: 已删除 "${removed.key}"`, w / 2, 20);
                        return;
                    }
                }
            }
            this._redraw();
            ctx.fillStyle = '#f59e0b';
            ctx.font = 'bold 14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('⚠️ 表中无元素可删除', w / 2, 20);
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
        if (this.currentTopic) {
            this._redraw();
        }
    }
};

// 初始化（DOM 加载后由 app.js 调用）
