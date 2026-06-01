/**
 * 练习题模板定义（可扩展）
 * 应用启动时加载内置基础题，AI 可动态生成补充题
 */

// 错误类型定义（用于 AI 反馈分类）
const ErrorType = {
    CALCULATION: 'calculation',   // 计算错：复杂度算错、步骤数量算错
    UNDERSTANDING: 'understanding', // 理解错：概念混淆、原理不清
    METHOD: 'method'              // 方法错：算法选择不当、逻辑有误
};

const ErrorTypeLabel = {
    [ErrorType.CALCULATION]: '计算错误',
    [ErrorType.UNDERSTANDING]: '理解错误',
    [ErrorType.METHOD]: '方法错误'
};

// 题型枚举
const QuestionType = {
    SINGLE_CHOICE: 'single_choice',
    TRUE_FALSE: 'true_false',
    OPERATION_ORDER: 'operation_order'
};

/**
 * 内置练习题库
 * 每个题目包含：
 *   - question: 题目文字
 *   - type: 题型
 *   - options: 选项数组（选择/判断题）
 *   - answer: 正确答案索引或值
 *   - explanation: 答案解析
 *   - errorType: 如果答错，属于哪种错误类型
 *   - topicId: 关联的知识点
 */
const BUILTIN_EXERCISES = [
    // ===== 数组 =====
    {
        id: "arr-q1",
        topicId: "array",
        type: QuestionType.SINGLE_CHOICE,
        question: "在长度为 n 的数组中，按下标随机访问一个元素的时间复杂度是？",
        options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
        answer: 0,
        explanation: "数组在内存中连续存储，通过首地址 + 下标 × 元素大小即可直接计算目标地址，因此是 O(1) 的随机访问。",
        errorType: ErrorType.UNDERSTANDING
    },
    {
        id: "arr-q2",
        topicId: "array",
        type: QuestionType.SINGLE_CHOICE,
        question: "在一个长度为 n 的有序数组中插入一个元素并保持有序，时间复杂度是？",
        options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
        answer: 2,
        explanation: "虽然可以用二分查找 O(log n) 找到插入位置，但插入时需要将后续元素全部后移一位，这需要 O(n) 的时间。",
        errorType: ErrorType.CALCULATION
    },

    // ===== 链表 =====
    {
        id: "ll-q1",
        topicId: "linked-list",
        type: QuestionType.SINGLE_CHOICE,
        question: "在单链表中，已知某个节点的指针，在该节点之后插入新节点的时间复杂度是？",
        options: ["O(1)", "O(log n)", "O(n)", "O(n²)"],
        answer: 0,
        explanation: "只需修改新节点的 next 指向当前节点的 next，再将当前节点的 next 指向新节点——两次指针操作，O(1)。",
        errorType: ErrorType.UNDERSTANDING
    },
    {
        id: "ll-q2",
        topicId: "linked-list",
        type: QuestionType.TRUE_FALSE,
        question: "判断：单链表支持 O(1) 时间删除给定节点（假设不知道前驱节点）。",
        options: ["正确", "错误"],
        answer: 1,
        explanation: "删除节点需要修改其前驱节点的指针。如果不知道前驱，需要先 O(n) 遍历找到它。但有个技巧：可以把后继节点的值复制过来再删后继，不过这不算真正删除了原节点。",
        errorType: ErrorType.UNDERSTANDING
    },

    // ===== 栈 =====
    {
        id: "stack-q1",
        topicId: "stack",
        type: QuestionType.SINGLE_CHOICE,
        question: "栈的最典型特征是？",
        options: ["FIFO 先进先出", "LIFO 后进先出", "随机访问", "按键排序"],
        answer: 1,
        explanation: "栈（Stack）是 LIFO（Last In First Out）结构，后进先出。想象一摞盘子，最后放上去的最先被取走。FIFO 是队列的特征。",
        errorType: ErrorType.UNDERSTANDING
    },
    {
        id: "stack-q2",
        topicId: "stack",
        type: QuestionType.OPERATION_ORDER,
        question: "依次执行：push(1), push(2), pop(), push(3), pop(), pop()。请选出 pop 依次返回的值。",
        options: ["2, 3, 1", "1, 2, 3", "3, 2, 1", "2, 1, 3"],
        answer: 0,
        explanation: "详细过程：push(1)→[1], push(2)→[1,2], pop()→返回2, push(3)→[1,3], pop()→返回3, pop()→返回1。结果：2, 3, 1。",
        errorType: ErrorType.CALCULATION
    },

    // ===== 队列 =====
    {
        id: "queue-q1",
        topicId: "queue",
        type: QuestionType.SINGLE_CHOICE,
        question: "广度优先搜索（BFS）通常使用哪种数据结构辅助实现？",
        options: ["栈", "队列", "堆", "二叉搜索树"],
        answer: 1,
        explanation: "BFS 按层遍历，先访问的先处理 → FIFO，所以用队列。DFS 用栈（递归本质也是栈）。",
        errorType: ErrorType.METHOD
    },
    {
        id: "queue-q2",
        topicId: "queue",
        type: QuestionType.TRUE_FALSE,
        question: "判断：循环队列可以高效利用数组空间，避免普通队列的'假溢出'问题。",
        options: ["正确", "错误"],
        answer: 0,
        explanation: "普通队列出队后前面空间被浪费（假溢出）。循环队列通过取模运算让队尾指针回到数组开头，复用已出队的空间。",
        errorType: ErrorType.UNDERSTANDING
    },

    // ===== 二叉树 =====
    {
        id: "bt-q1",
        topicId: "binary-tree",
        type: QuestionType.SINGLE_CHOICE,
        question: "对于如下二叉树，中序遍历的结果是？\n    A\n   / \\\n  B   C\n / \\\nD   E",
        options: ["A B D E C", "D B E A C", "D E B C A", "B D E A C"],
        answer: 1,
        explanation: "中序遍历（左→根→右）：先遍历左子树 B(D, E) → D B E，再根 A，再右子树 C → D B E A C。",
        errorType: ErrorType.METHOD
    },
    {
        id: "bt-q2",
        topicId: "binary-tree",
        type: QuestionType.SINGLE_CHOICE,
        question: "一棵深度为 4 的满二叉树，共有多少个节点？",
        options: ["7", "8", "15", "16"],
        answer: 2,
        explanation: "深度为 h 的满二叉树有 2^h - 1 个节点。h=4 时，2^4 - 1 = 16 - 1 = 15。",
        errorType: ErrorType.CALCULATION
    },

    // ===== 二叉搜索树 =====
    {
        id: "bst-q1",
        topicId: "bst",
        type: QuestionType.TRUE_FALSE,
        question: "判断：对二叉搜索树进行中序遍历，得到的是一个递增有序序列。",
        options: ["正确", "错误"],
        answer: 0,
        explanation: "BST 的定义是左子树 < 根 < 右子树，中序遍历是左→根→右的顺序，因此必然得到递增序列。这也是验证 BST 的方法。",
        errorType: ErrorType.UNDERSTANDING
    },
    {
        id: "bst-q2",
        topicId: "bst",
        type: QuestionType.SINGLE_CHOICE,
        question: "在 BST 中删除有两个子节点的节点时，通常的做法是？",
        options: [
            "直接删除，不管子节点",
            "用左子树的最大节点或右子树的最小节点替换",
            "随机选一个子节点替换",
            "将该节点的值设为 null"
        ],
        answer: 1,
        explanation: "删双子树节点：找到中序后继（右子树最小）或中序前驱（左子树最大），用它替换被删节点，再递归删除该后继/前驱。这样保持 BST 性质。",
        errorType: ErrorType.METHOD
    },

    // ===== 堆 =====
    {
        id: "heap-q1",
        topicId: "heap",
        type: QuestionType.SINGLE_CHOICE,
        question: "在一个大顶堆中，堆顶元素是？",
        options: ["最小值", "最大值", "中位数", "随机值"],
        answer: 1,
        explanation: "大顶堆的性质：每个节点的值都大于等于其子节点。因此根节点（堆顶）是整个堆中的最大值。",
        errorType: ErrorType.UNDERSTANDING
    },
    {
        id: "heap-q2",
        topicId: "heap",
        type: QuestionType.SINGLE_CHOICE,
        question: "向一个有 n 个元素的大顶堆中插入新元素的时间复杂度是？",
        options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
        answer: 1,
        explanation: "插入：放在数组末尾，然后向上调整（上浮），最多比较 log n 次（树的高度）→ O(log n)。",
        errorType: ErrorType.CALCULATION
    },

    // ===== 图 =====
    {
        id: "graph-q1",
        topicId: "graph",
        type: QuestionType.SINGLE_CHOICE,
        question: "在无权重图中，要找两个顶点之间的最短路径（边数最少），应使用？",
        options: ["DFS 深度优先搜索", "BFS 广度优先搜索", "Dijkstra 算法", "Prim 算法"],
        answer: 1,
        explanation: "无权图中，BFS 按层遍历，首次到达目标时经过的边数最少。Dijkstra 适用于带权图。",
        errorType: ErrorType.METHOD
    },
    {
        id: "graph-q2",
        topicId: "graph",
        type: QuestionType.TRUE_FALSE,
        question: "判断：邻接矩阵比邻接表更节省稀疏图的存储空间。",
        options: ["正确", "错误"],
        answer: 1,
        explanation: "邻接矩阵始终占用 O(V²) 空间。稀疏图（边远少于 V²）用邻接表只需 O(V+E) 空间，更节省。",
        errorType: ErrorType.UNDERSTANDING
    },

    // ===== 哈希表 =====
    {
        id: "hash-q1",
        topicId: "hash-table",
        type: QuestionType.SINGLE_CHOICE,
        question: "哈希表中，'冲突'指的是什么？",
        options: [
            "两个键的值相同",
            "两个不同的键映射到同一个桶索引",
            "键不存在于表中",
            "表已满无法插入"
        ],
        answer: 1,
        explanation: "哈希冲突（碰撞）是指不同的键经过哈希函数计算后得到相同的索引。冲突不可避免，常见的解决方式有链地址法和开放地址法。",
        errorType: ErrorType.UNDERSTANDING
    },

    // ===== 排序 =====
    {
        id: "sort-q1",
        topicId: "sorting-intro",
        type: QuestionType.SINGLE_CHOICE,
        question: "以下哪种排序算法是稳定的？",
        options: ["快速排序", "选择排序", "归并排序", "堆排序"],
        answer: 2,
        explanation: "归并排序在合并时保持相等元素的原有顺序，因此是稳定的。快排（取决于 pivot 选择）、选择排序、堆排序都是不稳定的。",
        errorType: ErrorType.UNDERSTANDING
    },
    {
        id: "sort-q2",
        topicId: "quick-sort",
        type: QuestionType.SINGLE_CHOICE,
        question: "快速排序在什么情况下退化到最坏时间复杂度 O(n²)？",
        options: [
            "数组已经排好序（且 pivot 选首/尾元素）",
            "数组元素全部相等",
            "数组随机排列",
            "数组包含大量重复元素"
        ],
        answer: 0,
        explanation: "如果数组已排序且 pivot 总选第一个（或最后一个），每次只能分出一个元素，递归深度变为 n，导致 O(n²)。随机选 pivot 可避免。",
        errorType: ErrorType.UNDERSTANDING
    }
];

/**
 * 根据知识点 ID 获取对应练习题
 */
function getExercisesByTopic(topicId) {
    return BUILTIN_EXERCISES.filter(e => e.topicId === topicId);
}

/**
 * 获取某个知识点的一个随机练习题
 */
function getRandomExercise(topicId) {
    const exercises = getExercisesByTopic(topicId);
    if (exercises.length === 0) return null;
    return exercises[Math.floor(Math.random() * exercises.length)];
}
