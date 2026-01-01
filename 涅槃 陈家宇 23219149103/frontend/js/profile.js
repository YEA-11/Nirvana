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

    // 加载个人信息
    loadProfileInfo();

    // 绑定事件
    bindEvents();
});

// 加载个人信息
async function loadProfileInfo() {
    try {
        const response = await fetch(`http://localhost:5000/api/profile/${currentUser.user_id}`);
        const result = await response.json();
        if (result.code === 0) {
            const data = result.data;
            document.getElementById('username').textContent = data.username;
            document.getElementById('current-nickname').textContent = data.nickname;
            // 格式化注册时间（去掉毫秒）
            const registerTime = data.register_time.split('.')[0];
            document.getElementById('register-time').textContent = registerTime;
        } else {
            alert('加载个人信息失败：' + result.msg);
        }
    } catch (error) {
        console.error('加载个人信息错误：', error);
        alert('加载个人信息失败，请检查网络连接');
    }
}

// 绑定所有页面事件
function bindEvents() {
    // 修改昵称相关
    document.getElementById('edit-nickname-btn').addEventListener('click', function() {
        document.getElementById('nickname-form-card').style.display = 'block';
        // 填充当前昵称
        document.getElementById('new-nickname').value = document.getElementById('current-nickname').textContent;
    });

    document.getElementById('cancel-nickname-btn').addEventListener('click', function() {
        document.getElementById('nickname-form-card').style.display = 'none';
    });

    // 提交昵称修改
    document.getElementById('nickname-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const newNickname = document.getElementById('new-nickname').value.trim();

        if (!newNickname) {
            alert('昵称不能为空');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/update-nickname', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: currentUser.user_id,
                    new_nickname: newNickname
                })
            });
            const result = await response.json();
            if (result.code === 0) {
                alert('昵称修改成功');
                // 更新本地存储和页面显示
                currentUser.nickname = newNickname;
                localStorage.setItem('userInfo', JSON.stringify(currentUser));
                document.getElementById('nickname').textContent = newNickname;
                document.getElementById('current-nickname').textContent = newNickname;
                // 隐藏表单
                document.getElementById('nickname-form-card').style.display = 'none';
            } else {
                alert('昵称修改失败：' + result.msg);
            }
        } catch (error) {
            console.error('修改昵称错误：', error);
            alert('修改昵称失败，请检查网络连接');
        }
    });

    // 提交密码修改
    document.getElementById('password-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const oldPassword = document.getElementById('old-password').value.trim();
        const newPassword = document.getElementById('new-password').value.trim();
        const confirmPassword = document.getElementById('confirm-password').value.trim();

        if (newPassword.length < 6) {
            alert('新密码长度不能少于6位');
            return;
        }

        if (newPassword !== confirmPassword) {
            alert('两次输入的新密码不一致');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/change-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: currentUser.user_id,
                    old_password: oldPassword,
                    new_password: newPassword
                })
            });
            const result = await response.json();
            if (result.code === 0) {
                alert('密码修改成功！请重新登录');
                // 退出登录
                localStorage.removeItem('userInfo');
                window.location.href = 'index.html';
            } else {
                alert('密码修改失败：' + result.msg);
            }
        } catch (error) {
            console.error('修改密码错误：', error);
            alert('修改密码失败，请检查网络连接');
        }
    });
}