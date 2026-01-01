// 全局变量：当前登录用户信息
let currentUser = null;

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

    // 加载财运数据
    loadFortune();

    // 绑定刷新事件
    document.getElementById('refresh-fortune').addEventListener('click', function() {
        this.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> 刷新中...';
        setTimeout(() => {
            loadFortune();
            this.innerHTML = '<i class="fas fa-sync-alt"></i> 刷新财运';
        }, 800);
    });
});

// 加载财运数据
async function loadFortune() {
    try {
        const response = await fetch('http://localhost:5000/api/fortune');
        const result = await response.json();
        if (result.code === 0) {
            const data = result.data;
            document.getElementById('fortune-content').textContent = data.fortune;
            document.getElementById('lucky-number').textContent = data.lucky_number;
            document.getElementById('lucky-food').textContent = data.lucky_food;
            document.getElementById('lucky-color').textContent = data.lucky_color;
            document.getElementById('lucky-flower').textContent = data.lucky_flower;
        } else {
            alert('加载财运失败：' + result.msg);
        }
    } catch (error) {
        console.error('加载财运错误：', error);
        alert('加载财运失败，请检查网络连接');
    }
}