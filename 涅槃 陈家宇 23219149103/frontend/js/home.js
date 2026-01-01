// 全局变量：当前登录用户信息
let currentUser = null;
// 图表实例
let pieChart = null;
let lineChart = null;

// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 验证登录状态
    const userInfoStr = localStorage.getItem('userInfo');
    if (!userInfoStr) {
        alert('请先登录！');
        window.location.href = 'index.html';
        return;
    }
    currentUser = JSON.parse(userInfoStr);

    // 显示用户昵称
    document.getElementById('nickname').textContent = currentUser.nickname;

    // 退出登录
    document.getElementById('logout-btn').addEventListener('click', function() {
        if (confirm('确定要退出登录吗？')) {
            localStorage.removeItem('userInfo');
            window.location.href = 'index.html';
        }
    });

    // 初始化日期选择器（默认当前日期）
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('record-date').value = today;
    document.getElementById('line-start-date').value = getFirstDayOfMonth();
    document.getElementById('line-end-date').value = today;

    // 类型切换时过滤子类型
    initSubtypeFilter();

    // 初始化图表
    initPieChart();
    initLineChart();

    // 加载统计数据
    loadStatistics();

    // 加载记账记录
    loadRecords();

    // 绑定事件
    bindEvents();
});

// 获取当月第一天
function getFirstDayOfMonth() {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
}

// 初始化子类型过滤（根据类型显示对应子类型）
function initSubtypeFilter() {
    const typeSelects = [
        document.getElementById('record-type'),
        document.getElementById('edit-record-type')
    ];
    const subtypeSelects = [
        document.getElementById('record-subtype'),
        document.getElementById('edit-record-subtype'),
        document.getElementById('list-subtype-filter')
    ];

    typeSelects.forEach((typeSelect, index) => {
        if (typeSelect) {
            typeSelect.addEventListener('change', function() {
                const selectedType = this.value;
                const subtypeSelect = subtypeSelects[index] || subtypeSelects[0];
                const options = subtypeSelect.options;

                // 过滤子类型
                for (let i = 0; i < options.length; i++) {
                    const option = options[i];
                    if (option.value === '' || option.dataset.type === selectedType) {
                        option.style.display = 'block';
                    } else {
                        option.style.display = 'none';
                    }
                }

                // 重置选中状态
                subtypeSelect.selectedIndex = 0;
            });
        }
    });

    // 列表类型过滤联动子类型
    document.getElementById('list-type-filter').addEventListener('change', function() {
        const selectedType = this.value;
        const subtypeSelect = document.getElementById('list-subtype-filter');
        const options = subtypeSelect.options;

        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            if (option.value === '' || option.dataset.type === selectedType) {
                option.style.display = 'block';
            } else {
                option.style.display = 'none';
            }
        }
        subtypeSelect.selectedIndex = 0;
    });
}

// 初始化饼图
function initPieChart() {
    const pieChartDom = document.getElementById('pie-chart');
    pieChart = echarts.init(pieChartDom);
    const option = {
        title: {
            text: '收入类型占比',
            left: 'center'
        },
        tooltip: {
            trigger: 'item',
            formatter: '{b}: {c}元 ({d}%)'
        },
        legend: {
            orient: 'vertical',
            left: 'left',
            textStyle: {
                fontSize: 11
            }
        },
        series: [
            {
                name: '金额',
                type: 'pie',
                radius: ['40%', '70%'],
                avoidLabelOverlap: false,
                itemStyle: {
                    borderRadius: 10,
                    borderColor: '#fff',
                    borderWidth: 2
                },
                label: {
                    show: false,
                    position: 'center'
                },
                emphasis: {
                    label: {
                        show: true,
                        fontSize: 14,
                        fontWeight: 'bold'
                    }
                },
                labelLine: {
                    show: false
                },
                data: []
            }
        ]
    };
    pieChart.setOption(option);
    // 窗口大小变化时自适应
    window.addEventListener('resize', function() {
        pieChart.resize();
    });
}

// 初始化折线图
function initLineChart() {
    const lineChartDom = document.getElementById('line-chart');
    lineChart = echarts.init(lineChartDom);
    const option = {
        title: {
            text: '收支趋势图',
            left: 'center'
        },
        tooltip: {
            trigger: 'axis',
            axisPointer: {
                type: 'shadow'
            }
        },
        legend: {
            data: ['收入', '支出', '累计结余'],
            bottom: 0
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: [],
            axisLabel: {
                rotate: 30
            }
        },
        yAxis: {
            type: 'value',
            name: '金额（元）'
        },
        series: [
            {
                name: '收入',
                type: 'line',
                data: [],
                smooth: true,
                itemStyle: {
                    color: '#2ecc71'
                },
                lineStyle: {
                    width: 3
                },
                symbol: 'circle',
                symbolSize: 6
            },
            {
                name: '支出',
                type: 'line',
                data: [],
                smooth: true,
                itemStyle: {
                    color: '#e74c3c'
                },
                lineStyle: {
                    width: 3
                },
                symbol: 'circle',
                symbolSize: 6
            },
            {
                name: '累计结余',
                type: 'line',
                data: [],
                smooth: true,
                itemStyle: {
                    color: '#3498db'
                },
                lineStyle: {
                    width: 3
                },
                symbol: 'circle',
                symbolSize: 6
            }
        ]
    };
    lineChart.setOption(option);
    // 窗口大小变化时自适应
    window.addEventListener('resize', function() {
        lineChart.resize();
    });
}

// 加载统计数据（总收支+饼图+折线图）
async function loadStatistics() {
    try {
        // 加载总收支
        const totalResponse = await fetch(`http://localhost:5000/api/statistics/total/${currentUser.user_id}`);
        const totalResult = await totalResponse.json();
        if (totalResult.code === 0) {
            document.getElementById('total-income').textContent = totalResult.data.total_income.toFixed(2);
            document.getElementById('total-expense').textContent = totalResult.data.total_expense.toFixed(2);
            document.getElementById('total-balance').textContent = totalResult.data.total_balance.toFixed(2);
        }

        // 加载饼图数据
        const pieType = document.getElementById('pie-type-select').value;
        const pieResponse = await fetch(`http://localhost:5000/api/statistics/pie/${currentUser.user_id}?type=${pieType}`);
        const pieResult = await pieResponse.json();
        if (pieResult.code === 0) {
            const pieOption = pieChart.getOption();
            pieOption.title[0].text = pieType === 'income' ? '收入类型占比' : '支出类型占比';
            pieOption.series[0].data = pieResult.data;
            pieChart.setOption(pieOption);
        }

        // 加载折线图数据
        const startDate = document.getElementById('line-start-date').value;
        const endDate = document.getElementById('line-end-date').value;
        const lineResponse = await fetch(`http://localhost:5000/api/statistics/line/${currentUser.user_id}?start_date=${startDate}&end_date=${endDate}`);
        const lineResult = await lineResponse.json();
        if (lineResult.code === 0) {
            const dates = lineResult.data.map(item => item.date);
            const incomeData = lineResult.data.map(item => item.income);
            const expenseData = lineResult.data.map(item => item.expense);
            const balanceData = lineResult.data.map(item => item.balance);

            const lineOption = lineChart.getOption();
            lineOption.xAxis[0].data = dates;
            lineOption.series[0].data = incomeData;
            lineOption.series[1].data = expenseData;
            lineOption.series[2].data = balanceData;
            lineChart.setOption(lineOption);
        }
    } catch (error) {
        console.error('加载统计数据错误：', error);
        alert('统计数据加载失败，请检查网络连接');
    }
}

// 加载记账记录
async function loadRecords(filters = {}) {
    try {
        let url = `http://localhost:5000/api/records/${currentUser.user_id}`;
        const params = new URLSearchParams();
        if (filters.type) params.append('type', filters.type);
        if (filters.subtype) params.append('subtype', filters.subtype);
        if (filters.startDate) params.append('start_date', filters.startDate);
        if (filters.endDate) params.append('end_date', filters.endDate);
        
        const queryString = params.toString();
        if (queryString) url += `?${queryString}`;

        const response = await fetch(url);
        const result = await response.json();
        const tbody = document.getElementById('records-tbody');

        if (result.code === 0 && result.data.length > 0) {
            tbody.innerHTML = '';
            result.data.forEach(record => {
                const tr = document.createElement('tr');
                const typeCn = record.type === 'income' ? '收入' : '支出';
                const typeColor = record.type === 'income' ? '#2ecc71' : '#e74c3c';
                
                tr.innerHTML = `
                    <td>${record.date}</td>
                    <td style="color: ${typeColor}; font-weight: 500;">${typeCn}</td>
                    <td>${record.subtype}</td>
                    <td>${record.amount.toFixed(2)}</td>
                    <td>${record.remark || '无'}</td>
                    <td class="action-btns">
                        <button class="btn btn-sm btn-primary edit-btn" data-id="${record.id}">
                            <i class="fas fa-edit"></i> 编辑
                        </button>
                        <button class="btn btn-sm btn-danger delete-btn" data-id="${record.id}">
                            <i class="fas fa-trash"></i> 删除
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // 绑定编辑和删除事件
            bindRecordActions();
        } else {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #777;">暂无记账记录，点击"添加记账记录"开始记录收支吧～</td></tr>';
        }
    } catch (error) {
        console.error('加载记账记录错误：', error);
        alert('记账记录加载失败，请检查网络连接');
    }
}

// 绑定记录的编辑和删除事件
function bindRecordActions() {
    // 编辑按钮
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const recordId = this.getAttribute('data-id');
            try {
                const response = await fetch(`http://localhost:5000/api/records/${currentUser.user_id}`);
                const result = await response.json();
                if (result.code === 0) {
                    const record = result.data.find(item => item.id === parseInt(recordId));
                    if (record) {
                        // 填充表单数据
                        document.getElementById('edit-record-id').value = record.id;
                        document.getElementById('edit-record-type').value = record.type;
                        document.getElementById('edit-record-subtype').value = record.subtype;
                        document.getElementById('edit-record-amount').value = record.amount;
                        document.getElementById('edit-record-date').value = record.date;
                        document.getElementById('edit-record-remark').value = record.remark || '';

                        // 过滤子类型
                        const typeSelect = document.getElementById('edit-record-type');
                        const subtypeSelect = document.getElementById('edit-record-subtype');
                        const options = subtypeSelect.options;
                        for (let i = 0; i < options.length; i++) {
                            const option = options[i];
                            if (option.dataset.type === typeSelect.value) {
                                option.style.display = 'block';
                            } else {
                                option.style.display = 'none';
                            }
                        }

                        // 显示模态框
                        document.getElementById('edit-modal').style.display = 'flex';
                    }
                }
            } catch (error) {
                console.error('获取记录详情错误：', error);
                alert('加载记录详情失败');
            }
        });
    });

    // 删除按钮
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', async function() {
            const recordId = this.getAttribute('data-id');
            if (confirm('确定要删除这条记录吗？删除后不可恢复')) {
                try {
                    const response = await fetch(`http://localhost:5000/api/records/${recordId}`, {
                        method: 'DELETE'
                    });
                    const result = await response.json();
                    if (result.code === 0) {
                        alert('删除成功');
                        // 重新加载记录和统计数据
                        loadRecords(getCurrentFilters());
                        loadStatistics();
                    } else {
                        alert('删除失败：' + result.msg);
                    }
                } catch (error) {
                    console.error('删除记录错误：', error);
                    alert('删除失败，请检查网络连接');
                }
            }
        });
    });
}

// 获取当前筛选条件
function getCurrentFilters() {
    return {
        type: document.getElementById('list-type-filter').value || '',
        subtype: document.getElementById('list-subtype-filter').value || '',
        startDate: document.getElementById('list-start-date').value || '',
        endDate: document.getElementById('list-end-date').value || ''
    };
}

// 绑定所有页面事件
function bindEvents() {
    // 饼图类型切换
    document.getElementById('pie-type-select').addEventListener('change', loadStatistics);

    // 折线图筛选
    document.getElementById('line-filter-btn').addEventListener('click', loadStatistics);

    // 列表筛选
    document.getElementById('list-filter-btn').addEventListener('click', function() {
        const filters = getCurrentFilters();
        loadRecords(filters);
    });

    // 列表重置
    document.getElementById('list-reset-btn').addEventListener('click', function() {
        document.getElementById('list-type-filter').value = '';
        document.getElementById('list-subtype-filter').value = '';
        document.getElementById('list-start-date').value = '';
        document.getElementById('list-end-date').value = '';
        loadRecords();
    });

    // 添加记录表单提交
    document.getElementById('add-record-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const data = {
            user_id: currentUser.user_id,
            type: document.getElementById('record-type').value,
            subtype: document.getElementById('record-subtype').value,
            amount: parseFloat(document.getElementById('record-amount').value),
            date: document.getElementById('record-date').value,
            remark: document.getElementById('record-remark').value.trim()
        };

        if (isNaN(data.amount) || data.amount <= 0) {
            alert('金额必须是大于0的数字');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/records', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (result.code === 0) {
                alert('添加成功');
                // 重置表单
                this.reset();
                document.getElementById('record-date').value = new Date().toISOString().split('T')[0];
                // 重新加载记录和统计数据
                loadRecords(getCurrentFilters());
                loadStatistics();
            } else {
                alert('添加失败：' + result.msg);
            }
        } catch (error) {
            console.error('添加记录错误：', error);
            alert('添加失败，请检查网络连接');
        }
    });

    // 修改记录表单提交
    document.getElementById('edit-record-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const recordId = document.getElementById('edit-record-id').value;
        const data = {
            type: document.getElementById('edit-record-type').value,
            subtype: document.getElementById('edit-record-subtype').value,
            amount: parseFloat(document.getElementById('edit-record-amount').value),
            date: document.getElementById('edit-record-date').value,
            remark: document.getElementById('edit-record-remark').value.trim()
        };

        if (isNaN(data.amount) || data.amount <= 0) {
            alert('金额必须是大于0的数字');
            return;
        }

        try {
            const response = await fetch(`http://localhost:5000/api/records/${recordId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (result.code === 0) {
                alert('修改成功');
                // 关闭模态框
                document.getElementById('edit-modal').style.display = 'none';
                // 重新加载记录和统计数据
                loadRecords(getCurrentFilters());
                loadStatistics();
            } else {
                alert('修改失败：' + result.msg);
            }
        } catch (error) {
            console.error('修改记录错误：', error);
            alert('修改失败，请检查网络连接');
        }
    });

    // 关闭模态框
    document.getElementById('close-modal').addEventListener('click', function() {
        document.getElementById('edit-modal').style.display = 'none';
    });

    // 点击模态框外部关闭
    document.getElementById('edit-modal').addEventListener('click', function(e) {
        if (e.target === this) {
            this.style.display = 'none';
        }
    });
}