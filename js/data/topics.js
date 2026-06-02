/**
 * 数据结构知识点定义（可扩展）
 * 新增知识点只需在此数组中添加配置对象即可
 * 体现了"从知识点抽象出方法"的可扩展性设计
 */
const TOPICS = [
    // ========== 线性结构 ==========
    {
        id: "array",
        name: "数组",
        category: "线性结构",
        categoryIcon: "📏",
        difficulty: 1,
        prerequisites: [],
        commonPitfalls: [
            "索引越界",
            "插入删除需要移动大量元素",
            "静态数组容量固定"
        ],
        visualType: "array",
        operations: ["access", "insert", "delete", "search", "traverse"],
        keyConcepts: [
            "连续内存存储",
            "O(1) 随机访问",
            "插入/删除 O(n)"
        ],
        realWorldUses: ["成绩排名列表", "图像像素矩阵", "日程表"]
    },
    {
        id: "linked-list",
        name: "链表",
        category: "线性结构",
        categoryIcon: "📏",
        difficulty: 2,
        prerequisites: ["array"],
        commonPitfalls: [
            "指针丢失导致内存泄漏",
            "头结点特殊处理遗忘",
            "循环链表边界条件"
        ],
        visualType: "nodes",
        operations: ["insert_head", "insert_tail", "delete", "search", "reverse"],
        keyConcepts: [
            "非连续存储，通过指针链接",
            "插入/删除 O(1)（已知位置）",
            "查找 O(n)",
            "单链表 vs 双向链表 vs 循环链表"
        ],
        realWorldUses: ["音乐播放列表", "浏览器前进后退", "LRU缓存"]
    },
    {
        id: "stack",
        name: "栈",
        category: "线性结构",
        categoryIcon: "📏",
        difficulty: 2,
        prerequisites: ["array", "linked-list"],
        commonPitfalls: [
            "栈空时出栈（下溢）",
            "栈满时入栈（上溢）",
            "与队列 FIFO 混淆"
        ],
        visualType: "stack",
        operations: ["push", "pop", "peek", "delete"],
        keyConcepts: [
            "LIFO（后进先出）",
            "所有操作 O(1)",
            "可用数组或链表实现"
        ],
        realWorldUses: ["函数调用栈", "撤销操作", "括号匹配", "表达式求值"]
    },
    {
        id: "queue",
        name: "队列",
        category: "线性结构",
        categoryIcon: "📏",
        difficulty: 2,
        prerequisites: ["array", "linked-list"],
        commonPitfalls: [
            "队空时出队（下溢）",
            "循环队列的队空 vs 队满判断",
            "与栈 LIFO 混淆"
        ],
        visualType: "queue",
        operations: ["enqueue", "dequeue", "peek", "delete"],
        keyConcepts: [
            "FIFO（先进先出）",
            "所有操作 O(1)",
            "循环队列优化空间利用"
        ],
        realWorldUses: ["任务调度", "消息队列", "BFS搜索", "打印机队列"]
    },

    // ========== 树形结构 ==========
    {
        id: "binary-tree",
        name: "二叉树",
        category: "树形结构",
        categoryIcon: "🌲",
        difficulty: 3,
        prerequisites: ["linked-list", "stack", "queue"],
        commonPitfalls: [
            "递归终止条件遗漏",
            "三种遍历顺序混淆",
            "空树边界处理"
        ],
        visualType: "tree",
        operations: ["preorder", "inorder", "postorder", "levelorder", "insert", "search"],
        keyConcepts: [
            "每个节点最多两个子节点",
            "前序/中序/后序/层序遍历",
            "满二叉树 vs 完全二叉树",
            "高度为 h 的二叉树最多有 2^h-1 个节点"
        ],
        realWorldUses: ["表达式树", "文件系统目录", "决策树"]
    },
    {
        id: "bst",
        name: "二叉搜索树 (BST)",
        category: "树形结构",
        categoryIcon: "🌲",
        difficulty: 3,
        prerequisites: ["binary-tree"],
        commonPitfalls: [
            "删除有两个子节点的节点处理错误",
            "不平衡导致退化成链表",
            "重复键的处理方式"
        ],
        visualType: "tree",
        operations: ["insert", "search", "delete", "min", "max"],
        keyConcepts: [
            "左子树 < 根 < 右子树",
            "查找/插入/删除 平均 O(log n)，最坏 O(n)",
            "中序遍历得到有序序列"
        ],
        realWorldUses: ["数据库索引", "符号表", "自动补全"]
    },
    {
        id: "heap",
        name: "堆",
        category: "树形结构",
        categoryIcon: "🌲",
        difficulty: 3,
        prerequisites: ["binary-tree", "array"],
        commonPitfalls: [
            "向上/向下调整边界判断",
            "大顶堆 vs 小顶堆选择",
            "堆排序稳定性理解"
        ],
        visualType: "tree",
        operations: ["insert", "extract_top", "heapify", "peek", "delete"],
        keyConcepts: [
            "完全二叉树结构",
            "父节点 ≥ 子节点（大顶堆）",
            "插入 O(log n)，取最值 O(1)",
            "数组实现：左子=2i+1, 右子=2i+2"
        ],
        realWorldUses: ["优先队列", "Top-K问题", "堆排序", "Dijkstra算法"]
    },

    // ========== 图结构 ==========
    {
        id: "graph",
        name: "图",
        category: "图结构",
        categoryIcon: "🕸️",
        difficulty: 4,
        prerequisites: ["queue", "stack", "linked-list"],
        commonPitfalls: [
            "BFS/DFS 应用场景混淆",
            "有向图 vs 无向图的邻接表表示差异",
            "连通分量 vs 强连通分量概念不清"
        ],
        visualType: "graph",
        operations: ["bfs", "dfs", "add_edge", "add_vertex", "delete_vertex"],
        keyConcepts: [
            "顶点 + 边 构成",
            "邻接矩阵 vs 邻接表",
            "BFS（最短路径无权图） vs DFS（回溯）"
        ],
        realWorldUses: ["社交网络", "地图导航", "网页链接分析"]
    },

    // ========== 散列结构 ==========
    {
        id: "hash-table",
        name: "哈希表",
        category: "散列结构",
        categoryIcon: "📊",
        difficulty: 3,
        prerequisites: ["array", "linked-list"],
        commonPitfalls: [
            "哈希冲突处理方式不理解",
            "负载因子与 rehash 时机",
            "哈希函数设计不合适"
        ],
        visualType: "hash",
        operations: ["put", "get", "delete", "contains"],
        keyConcepts: [
            "键→哈希函数→桶索引",
            "冲突解决：链地址法 / 开放地址法",
            "平均 O(1) 查找"
        ],
        realWorldUses: ["字典/Map", "缓存", "去重", "数据库索引"]
    },

    // ========== 排序算法 ==========
    {
        id: "sorting-intro",
        name: "排序算法概览",
        category: "排序算法",
        categoryIcon: "🔄",
        difficulty: 2,
        prerequisites: ["array"],
        commonPitfalls: [
            "稳定性概念理解不深",
            "不同数据规模下算法选择不当",
            "递归实现的空间复杂度忽略"
        ],
        visualType: "array",
        operations: ["add_element", "remove_element", "shuffle", "compare"],
        keyConcepts: [
            "比较排序下界 Ω(n log n)",
            "稳定排序 vs 不稳定排序",
            "时间复杂度对比：O(n²) vs O(n log n) vs O(n+k)"
        ],
        realWorldUses: ["数据库 ORDER BY", "排行榜", "数据预处理"]
    },
    {
        id: "quick-sort",
        name: "快速排序",
        category: "排序算法",
        categoryIcon: "🔄",
        difficulty: 3,
        prerequisites: ["sorting-intro"],
        commonPitfalls: [
            "pivot 选择策略影响性能",
            "递归深度导致栈溢出",
            "相同元素的处理（稳定性）"
        ],
        visualType: "array",
        operations: ["add_element", "remove_element", "shuffle", "partition", "sort"],
        keyConcepts: [
            "分治思想：选 pivot → partition → 递归",
            "平均 O(n log n)，最坏 O(n²)",
            "原地排序（不需要额外数组）"
        ],
        realWorldUses: ["编程语言内置排序", "大规模数据排序"]
    },
    {
        id: "merge-sort",
        name: "归并排序",
        category: "排序算法",
        categoryIcon: "🔄",
        difficulty: 3,
        prerequisites: ["sorting-intro"],
        commonPitfalls: [
            "合并时数组越界",
            "递归终止条件 base case",
            "额外 O(n) 空间开销理解"
        ],
        visualType: "array",
        operations: ["add_element", "remove_element", "shuffle", "merge", "sort"],
        keyConcepts: [
            "分治思想：分割到底 → 两两合并",
            "稳定排序，始终 O(n log n)",
            "需要 O(n) 额外空间"
        ],
        realWorldUses: ["外部排序", "链表排序", "稳定排序需求"]
    }
];

// 按分类组织（用于侧边栏渲染）
const TOPIC_CATEGORIES = [
    { key: "线性结构", icon: "📏", order: 1 },
    { key: "树形结构", icon: "🌲", order: 2 },
    { key: "图结构",   icon: "🕸️", order: 3 },
    { key: "散列结构", icon: "📊", order: 4 },
    { key: "排序算法", icon: "🔄", order: 5 }
];

/**
 * 根据 ID 获取知识点
 */
function getTopicById(id) {
    return TOPICS.find(t => t.id === id) || null;
}

/**
 * 获取某个分类下的所有知识点
 */
function getTopicsByCategory(category) {
    return TOPICS.filter(t => t.category === category);
}

/**
 * 获取某知识点的前置知识点是否已解锁
 */
function isTopicUnlocked(topicId, masteredIds) {
    const topic = getTopicById(topicId);
    if (!topic) return false;
    if (topic.prerequisites.length === 0) return true;
    return topic.prerequisites.every(pid => masteredIds.includes(pid));
}
