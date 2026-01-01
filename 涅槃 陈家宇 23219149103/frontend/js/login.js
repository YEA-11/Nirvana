// 页面加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 标签切换逻辑
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.id;
            // 切换标签激活状态
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            // 切换表单显示
            forms.forEach(form => form.classList.remove('active'));
            if (tabId === 'login-tab') {
                document.getElementById('login-form').classList.add('active');
            } else if (tabId === 'register-tab') {
                document.getElementById('register-form').classList.add('active');
            } else if (tabId === 'forgot-tab') {
                document.getElementById('forgot-form').classList.add('active');
            }
        });
    });

    // 快捷跳转逻辑
    document.getElementById('go-to-forgot').addEventListener('click', function(e) {
        e.preventDefault();
        tabs.forEach(t => t.classList.remove('active'));
        document.getElementById('forgot-tab').classList.add('active');
        forms.forEach(form => form.classList.remove('active'));
        document.getElementById('forgot-form').classList.add('active');
    });

    document.getElementById('go-to-login').addEventListener('click', function(e) {
        e.preventDefault();
        tabs.forEach(t => t.classList.remove('active'));
        document.getElementById('login-tab').classList.add('active');
        forms.forEach(form => form.classList.remove('active'));
        document.getElementById('login-form').classList.add('active');
    });

    document.getElementById('forgot-go-to-login').addEventListener('click', function(e) {
        e.preventDefault();
        tabs.forEach(t => t.classList.remove('active'));
        document.getElementById('login-tab').classList.add('active');
        forms.forEach(form => form.classList.remove('active'));
        document.getElementById('login-form').classList.add('active');
    });

    // 注册表单提交
    document.getElementById('register-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = document.getElementById('reg-username').value.trim();
        const password = document.getElementById('reg-password').value.trim();
        const nickname = document.getElementById('reg-nickname').value.trim() || '默认用户';

        if (password.length < 6) {
            alert('密码长度不能少于6位');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password, nickname })
            });
            const result = await response.json();
            if (result.code === 0) {
                alert('注册成功！即将跳转到登录页面');
                // 切换到登录表单
                tabs.forEach(t => t.classList.remove('active'));
                document.getElementById('login-tab').classList.add('active');
                forms.forEach(form => form.classList.remove('active'));
                document.getElementById('login-form').classList.add('active');
                // 填充用户名
                document.getElementById('login-username').value = username;
            } else {
                alert('注册失败：' + result.msg);
            }
        } catch (error) {
            console.error('注册错误：', error);
            alert('注册失败，请检查网络连接');
        }
    });

    // 登录表单提交
    document.getElementById('login-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value.trim();

        try {
            const response = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            const result = await response.json();
            if (result.code === 0) {
                // 存储用户信息到本地存储
                localStorage.setItem('userInfo', JSON.stringify(result.data));
                alert('登录成功！即将跳转到首页');
                window.location.href = 'home.html';
            } else {
                alert('登录失败：' + result.msg);
            }
        } catch (error) {
            console.error('登录错误：', error);
            alert('登录失败，请检查网络连接或后端服务是否启动');
        }
    });

    // 忘记密码表单提交
    document.getElementById('forgot-form').addEventListener('submit', async function(e) {
        e.preventDefault();
        const username = document.getElementById('forgot-username').value.trim();
        const newPassword = document.getElementById('forgot-new-password').value.trim();

        if (newPassword.length < 6) {
            alert('新密码长度不能少于6位');
            return;
        }

        try {
            const response = await fetch('http://localhost:5000/api/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, new_password: newPassword })
            });
            const result = await response.json();
            if (result.code === 0) {
                alert('密码修改成功！即将跳转到登录页面');
                // 切换到登录表单
                tabs.forEach(t => t.classList.remove('active'));
                document.getElementById('login-tab').classList.add('active');
                forms.forEach(form => form.classList.remove('active'));
                document.getElementById('login-form').classList.add('active');
                // 填充用户名
                document.getElementById('login-username').value = username;
            } else {
                alert('密码修改失败：' + result.msg);
            }
        } catch (error) {
            console.error('忘记密码错误：', error);
            alert('密码修改失败，请检查网络连接');
        }
    });
});