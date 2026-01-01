from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
import bcrypt
import datetime
import random

app = Flask(__name__)
CORS(app)  # 解决跨域问题
DATABASE = 'account.db'

# -------------------------- 数据库初始化 --------------------------
def init_db():
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()
    # 用户表（账号、密码、昵称、注册时间）
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nickname TEXT DEFAULT '默认用户',
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')
    # 记账记录表（用户ID、类型：收入/支出、子类型、金额、日期、备注）
    c.execute('''CREATE TABLE IF NOT EXISTS records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        type TEXT NOT NULL,  
        subtype TEXT NOT NULL,  
        amount REAL NOT NULL,
        date TEXT NOT NULL,  
        remark TEXT DEFAULT '',
        create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )''')
    conn.commit()
    conn.close()

# 初始化数据库（启动时自动执行）
init_db()

# -------------------------- 数据库工具函数 --------------------------
def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row  # 支持按列名取值
    return conn

def hash_password(password):
    # 密码加密存储
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password, hashed_password):
    # 密码验证
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))

# -------------------------- 用户相关接口 --------------------------
# 注册
@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    nickname = data.get('nickname', '默认用户')

    if not username or not password:
        return jsonify({'code': -1, 'msg': '用户名和密码不能为空'})

    conn = get_db()
    c = conn.cursor()
    try:
        hashed_pw = hash_password(password)
        c.execute('INSERT INTO users (username, password, nickname) VALUES (?, ?, ?)',
                  (username, hashed_pw, nickname))
        conn.commit()
        return jsonify({'code': 0, 'msg': '注册成功'})
    except sqlite3.IntegrityError:
        return jsonify({'code': -1, 'msg': '用户名已存在'})
    finally:
        conn.close()

# 登录
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT id, username, password, nickname FROM users WHERE username = ?', (username,))
    user = c.fetchone()
    conn.close()

    if user and verify_password(password, user['password']):
        return jsonify({
            'code': 0,
            'msg': '登录成功',
            'data': {
                'user_id': user['id'],
                'username': user['username'],
                'nickname': user['nickname']
            }
        })
    return jsonify({'code': -1, 'msg': '用户名或密码错误'})

# 忘记密码（登录前修改）
@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    username = data.get('username')
    new_password = data.get('new_password')

    if not username or not new_password:
        return jsonify({'code': -1, 'msg': '用户名和新密码不能为空'})

    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT id FROM users WHERE username = ?', (username,))
    user = c.fetchone()
    if not user:
        conn.close()
        return jsonify({'code': -1, 'msg': '用户名不存在'})

    hashed_pw = hash_password(new_password)
    c.execute('UPDATE users SET password = ? WHERE username = ?', (hashed_pw, username))
    conn.commit()
    conn.close()
    return jsonify({'code': 0, 'msg': '密码修改成功'})

# 修改密码（登录后）
@app.route('/api/change-password', methods=['POST'])
def change_password():
    data = request.get_json()
    user_id = data.get('user_id')
    old_password = data.get('old_password')
    new_password = data.get('new_password')

    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT password FROM users WHERE id = ?', (user_id,))
    user = c.fetchone()
    if not user:
        conn.close()
        return jsonify({'code': -1, 'msg': '用户不存在'})

    if not verify_password(old_password, user['password']):
        conn.close()
        return jsonify({'code': -1, 'msg': '原密码错误'})

    hashed_pw = hash_password(new_password)
    c.execute('UPDATE users SET password = ? WHERE id = ?', (hashed_pw, user_id))
    conn.commit()
    conn.close()
    return jsonify({'code': 0, 'msg': '密码修改成功'})

# 获取个人信息
@app.route('/api/profile/<int:user_id>', methods=['GET'])
def get_profile(user_id):
    conn = get_db()
    c = conn.cursor()
    c.execute('SELECT username, nickname, create_time FROM users WHERE id = ?', (user_id,))
    user = c.fetchone()
    conn.close()
    if not user:
        return jsonify({'code': -1, 'msg': '用户不存在'})
    return jsonify({
        'code': 0,
        'data': {
            'username': user['username'],
            'nickname': user['nickname'],
            'register_time': user['create_time']
        }
    })

# 修改个人昵称
@app.route('/api/update-nickname', methods=['POST'])
def update_nickname():
    data = request.get_json()
    user_id = data.get('user_id')
    new_nickname = data.get('new_nickname')

    if not new_nickname:
        return jsonify({'code': -1, 'msg': '昵称不能为空'})

    conn = get_db()
    c = conn.cursor()
    c.execute('UPDATE users SET nickname = ? WHERE id = ?', (new_nickname, user_id))
    conn.commit()
    conn.close()
    return jsonify({'code': 0, 'msg': '昵称修改成功'})

# -------------------------- 记账记录接口 --------------------------
# 添加记账记录
@app.route('/api/records', methods=['POST'])
def add_record():
    data = request.get_json()
    user_id = data.get('user_id')
    type_ = data.get('type')  # 'income'/'expense'
    subtype = data.get('subtype')
    amount = data.get('amount')
    date = data.get('date')
    remark = data.get('remark', '')

    if not all([user_id, type_, subtype, amount, date]):
        return jsonify({'code': -1, 'msg': '必填字段不能为空'})

    conn = get_db()
    c = conn.cursor()
    c.execute('''INSERT INTO records (user_id, type, subtype, amount, date, remark)
                  VALUES (?, ?, ?, ?, ?, ?)''', (user_id, type_, subtype, amount, date, remark))
    conn.commit()
    conn.close()
    return jsonify({'code': 0, 'msg': '记录添加成功'})

# 查询记账记录（支持筛选）
@app.route('/api/records/<int:user_id>', methods=['GET'])
def get_records(user_id):
    # 筛选参数
    type_ = request.args.get('type')  # 可选：income/expense
    subtype = request.args.get('subtype')  # 可选：具体子类型
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    conn = get_db()
    c = conn.cursor()
    query = 'SELECT * FROM records WHERE user_id = ?'
    params = [user_id]

    # 拼接筛选条件
    if type_:
        query += ' AND type = ?'
        params.append(type_)
    if subtype:
        query += ' AND subtype = ?'
        params.append(subtype)
    if start_date:
        query += ' AND date >= ?'
        params.append(start_date)
    if end_date:
        query += ' AND date <= ?'
        params.append(end_date)

    query += ' ORDER BY date DESC'
    c.execute(query, params)
    records = [dict(row) for row in c.fetchall()]
    conn.close()
    return jsonify({'code': 0, 'data': records})

# 修改记账记录
@app.route('/api/records/<int:record_id>', methods=['PUT'])
def update_record(record_id):
    data = request.get_json()
    type_ = data.get('type')
    subtype = data.get('subtype')
    amount = data.get('amount')
    date = data.get('date')
    remark = data.get('remark', '')

    conn = get_db()
    c = conn.cursor()
    c.execute('''UPDATE records SET type = ?, subtype = ?, amount = ?, date = ?, remark = ?
                  WHERE id = ?''', (type_, subtype, amount, date, remark, record_id))
    conn.commit()
    conn.close()
    return jsonify({'code': 0, 'msg': '记录修改成功'})

# 删除记账记录
@app.route('/api/records/<int:record_id>', methods=['DELETE'])
def delete_record(record_id):
    conn = get_db()
    c = conn.cursor()
    c.execute('DELETE FROM records WHERE id = ?', (record_id,))
    conn.commit()
    conn.close()
    return jsonify({'code': 0, 'msg': '记录删除成功'})

# -------------------------- 统计接口 --------------------------
# 总收支统计
@app.route('/api/statistics/total/<int:user_id>', methods=['GET'])
def get_total_stat(user_id):
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    conn = get_db()
    c = conn.cursor()
    # 总收入
    income_query = 'SELECT SUM(amount) FROM records WHERE user_id = ? AND type = "income"'
    # 总支出
    expense_query = 'SELECT SUM(amount) FROM records WHERE user_id = ? AND type = "expense"'
    params = [user_id]

    if start_date:
        income_query += ' AND date >= ?'
        expense_query += ' AND date >= ?'
        params.append(start_date)
    if end_date:
        income_query += ' AND date <= ?'
        expense_query += ' AND date <= ?'
        params.append(end_date)

    c.execute(income_query, params[:len(params)//2 + 1] if end_date else params)
    total_income = c.fetchone()[0] or 0.0

    c.execute(expense_query, params)
    total_expense = c.fetchone()[0] or 0.0

    total_balance = total_income - total_expense
    conn.close()
    return jsonify({
        'code': 0,
        'data': {
            'total_income': round(total_income, 2),
            'total_expense': round(total_expense, 2),
            'total_balance': round(total_balance, 2)
        }
    })

# 扇形图统计（类型占比）
@app.route('/api/statistics/pie/<int:user_id>', methods=['GET'])
def get_pie_stat(user_id):
    type_ = request.args.get('type')  # 必须：income/expense
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    if not type_:
        return jsonify({'code': -1, 'msg': '请指定类型（income/expense）'})

    conn = get_db()
    c = conn.cursor()
    query = 'SELECT subtype, SUM(amount) as total FROM records WHERE user_id = ? AND type = ? GROUP BY subtype'
    params = [user_id, type_]

    if start_date:
        query += ' AND date >= ?'
        params.append(start_date)
    if end_date:
        query += ' AND date <= ?'
        params.append(end_date)

    c.execute(query, params)
    result = [{'name': row['subtype'], 'value': round(row['total'], 2)} for row in c.fetchall()]
    conn.close()
    return jsonify({'code': 0, 'data': result})

# 折线图统计（日期趋势）
@app.route('/api/statistics/line/<int:user_id>', methods=['GET'])
def get_line_stat(user_id):
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')

    conn = get_db()
    c = conn.cursor()
    # 获取所有涉及的日期
    date_query = 'SELECT DISTINCT date FROM records WHERE user_id = ?'
    params = [user_id]
    if start_date:
        date_query += ' AND date >= ?'
        params.append(start_date)
    if end_date:
        date_query += ' AND date <= ?'
        params.append(end_date)
    date_query += ' ORDER BY date'
    c.execute(date_query, params)
    dates = [row['date'] for row in c.fetchall()]

    # 按日期统计收支
    line_data = []
    for date in dates:
        # 当日收入
        c.execute('SELECT SUM(amount) FROM records WHERE user_id = ? AND type = "income" AND date = ?',
                  (user_id, date))
        income = c.fetchone()[0] or 0.0
        # 当日支出
        c.execute('SELECT SUM(amount) FROM records WHERE user_id = ? AND type = "expense" AND date = ?',
                  (user_id, date))
        expense = c.fetchone()[0] or 0.0
        # 当日结余（累计）
        c.execute('SELECT SUM(CASE WHEN type = "income" THEN amount ELSE -amount END) FROM records WHERE user_id = ? AND date <= ?',
                  (user_id, date))
        balance = c.fetchone()[0] or 0.0
        line_data.append({
            'date': date,
            'income': round(income, 2),
            'expense': round(expense, 2),
            'balance': round(balance, 2)
        })

    conn.close()
    return jsonify({'code': 0, 'data': line_data})

# -------------------------- 今日财运接口 --------------------------
@app.route('/api/fortune', methods=['GET'])
def get_fortune():
    # 随机财运数据（丰富选项，避免重复）
    fortunes = [
        "今日财运亨通，适合理财投资！",
        "财运平稳，建议稳健消费，避免冲动支出～",
        "今日有小财入库，可能是意外收入哦！",
        "财运稍弱，建议减少非必要开支，开源节流～",
        "财运上升期，可规划长期储蓄计划！",
        "偏财运爆发，可能收到红包或返利～",
        "财运中等，适合整理账单，优化支出结构",
        "正财运旺，工作相关收入可能增加！"
    ]
    lucky_numbers = [str(random.randint(0, 9)) for _ in range(6)]
    lucky_foods = ["火锅", "寿司", "奶茶", "烤肉", "水果沙拉", "面条", "牛排", "小龙虾", "麻辣烫", "面包"]
    lucky_colors = ["红色", "金色", "绿色", "蓝色", "紫色", "黄色", "粉色", "橙色", "黑色", "白色"]
    lucky_flowers = ["玫瑰", "向日葵", "百合", "郁金香", "康乃馨", "满天星", "雏菊", "牡丹", "月季", "风信子"]

    return jsonify({
        'code': 0,
        'data': {
            'fortune': random.choice(fortunes),
            'lucky_number': ' '.join(lucky_numbers),
            'lucky_food': random.choice(lucky_foods),
            'lucky_color': random.choice(lucky_colors),
            'lucky_flower': random.choice(lucky_flowers)
        }
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)