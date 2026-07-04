var APP_ROOT = window.APP_ROOT != null ? window.APP_ROOT : '';

// 全局变量
let currentStudent = null;
let smsCountdown = 0;
let wechatLoginTimer = null;
let wechatLoginState = null;

// 检查登录状态
function checkLoginStatus() {
    fetch(APP_ROOT + '/api/check_login')
        .then(response => response.json())
        .then(data => {
            if (data.logged_in) {
                currentStudent = data.user;
                updateUIForLoggedInUser(data.user);
                // ensureBindUnionid();
            } else {
                currentStudent = null;
                updateUIForLoggedOutUser();
            }
        })
        .catch(error => {
            currentStudent = null;
            updateUIForLoggedOutUser();
        });
}

let bindUnionidChecking = false;
function ensureBindUnionid() {
    if (bindUnionidChecking) return;
    const modalEl = document.getElementById('bindWechatModal');
    if (modalEl && modalEl.classList.contains('show')) return;
    bindUnionidChecking = true;
    fetch(APP_ROOT + '/api/marketing/check_bind_status')
        .then(response => response.json())
        .then(data => {
            if (!data || !data.success || data.has_unionid) return;
            if (typeof showBindModalLoading === 'function') {
                showBindModalLoading({ title: '绑定小程序账户', message: '请扫码登录小程序，登录后将自动完成绑定' });
            }
            fetch(APP_ROOT + '/api/marketing/get_bind_qrcode')
                .then(response => response.json())
                .then(qrData => {
                    if (qrData && qrData.success && qrData.url && typeof showBindModal === 'function') {
                        showBindModal(qrData.url, { retryWithdraw: false, title: '绑定小程序账户', message: '请扫码登录小程序，登录后将自动完成绑定' });
                    }
                });
        })
        .finally(() => {
            bindUnionidChecking = false;
        });
}

// 更新已登录用户的UI
function updateUIForLoggedInUser(user) {
    // 这里可以添加更新UI的逻辑
}

// 更新未登录用户的UI
function updateUIForLoggedOutUser() {
    console.log('用户未登录');
}

// 显示登录弹窗
function showLoginModal() {
    const loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
    loginModal.show();
}

// 发送短信验证码
function sendSmsCode() {
    const phone = document.getElementById('loginPhone').value;
    const sendBtn = document.getElementById('sendSmsBtn');
    
    if (!phone || phone.length !== 11) {
        alert('请输入正确的手机号');
        return;
    }
    
    if (smsCountdown > 0) {
        return;
    }
    
    sendBtn.disabled = true;
    sendBtn.textContent = '发送中...';
    
    fetch(APP_ROOT + '/api/send_sms_code', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phone: phone })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            alert('验证码已发送');
            startSmsCountdown();
        } else {
            alert(data.message || '发送失败');
            sendBtn.disabled = false;
            sendBtn.textContent = '获取验证码';
        }
    })
    .catch(error => {
        alert('发送失败，请重试');
        sendBtn.disabled = false;
        sendBtn.textContent = '获取验证码';
    });
}

// 开始短信倒计时
function startSmsCountdown() {
    const sendBtn = document.getElementById('sendSmsBtn');
    smsCountdown = 60;
    
    const timer = setInterval(() => {
        sendBtn.textContent = `${smsCountdown}秒后重试`;
        smsCountdown--;
        
        if (smsCountdown < 0) {
            clearInterval(timer);
            sendBtn.disabled = false;
            sendBtn.textContent = '获取验证码';
        }
    }, 1000);
}

// 手机登录表单提交
const phoneLoginForm = document.getElementById('phoneLoginForm');
if (phoneLoginForm) {
    phoneLoginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const phone = document.getElementById('loginPhone').value;
        const smsCode = document.getElementById('loginSmsCode').value;
        
        if (!phone || !smsCode) {
            alert('请输入手机号和验证码');
            return;
        }
        
        fetch(APP_ROOT + '/api/login_with_phone', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ phone: phone, sms_code: smsCode })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                currentStudent = data.user;
                // 登录成功，无需提示
                bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
                // 清空表单
                document.getElementById('phoneLoginForm').reset();
                
                // 登录成功后，更新刷题记录开关状态
                if (typeof initializeMoodRecordsSwitch === 'function') {
                    initializeMoodRecordsSwitch();
                }
                
                // 刷新页面以更新登录状态
                window.location.reload();
            } else {
                alert(data.message || '登录失败');
            }
        })
        .catch(error => {
            alert('登录失败，请重试');
        });
    });
}

// 微信扫码登录
function startWechatLogin() {
    console.log('DEBUG: startWechatLogin called. APP_ROOT:', APP_ROOT);
    
    // 确保登录模态框是打开的
    const loginModal = document.getElementById('loginModal');
    if (loginModal) {
        const modalInstance = bootstrap.Modal.getInstance(loginModal) || new bootstrap.Modal(loginModal);
        modalInstance.show();
    }
    
    // 清除之前的定时器
    if (wechatLoginTimer) {
        clearInterval(wechatLoginTimer);
    }
    
    const wechatLoginDiv = document.getElementById('wechatLogin');
    if (!wechatLoginDiv) {
        return;
    }
    
    wechatLoginDiv.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-2">正在生成二维码...</p></div>';
    
    // 获取微信登录二维码
    fetch(APP_ROOT + '/api/wechat_qr_code')
        .then(response => {
            return response.json();
        })
        .then(data => {
            if (data.success) {
                wechatLoginState = data.state;
                displayWechatQRCode(data.qr_url, data.state);
            } else {
                wechatLoginDiv.innerHTML = '<div class="alert alert-danger">生成二维码失败，请重试</div>';
            }
        })
        .catch(error => {
            wechatLoginDiv.innerHTML = '<div class="alert alert-danger">网络错误，请重试</div>';
        });
}

function startWechatLoginPreferFast() {
    console.log('DEBUG: startWechatLoginPreferFast called. APP_ROOT:', APP_ROOT);
    
    if (wechatLoginTimer) {
        clearInterval(wechatLoginTimer);
    }
    if (typeof showLoginModal === 'function') {
        showLoginModal();
    } else {
        const loginModal = document.getElementById('loginModal');
        if (loginModal) {
            const modalInstance = bootstrap.Modal.getInstance(loginModal) || new bootstrap.Modal(loginModal);
            modalInstance.show();
        }
    }

    const wechatLoginDiv = document.getElementById('wechatLogin');
    if (wechatLoginDiv) {
        wechatLoginDiv.innerHTML = '<div class="text-center"><div class="spinner-border" role="status"><span class="visually-hidden">Loading...</span></div><p class="mt-2">正在尝试微信快捷登录...</p></div>';
    }

    fetch(APP_ROOT + '/api/wechat_fast_login_url')
        .then(response => response.json())
        .then(data => {
            if (data && data.success && data.url) {
                window.location.href = data.url;
                return;
            } else {
                startWechatLogin();
            }
        })
        .catch(() => {
            startWechatLogin();
        });
}

// 检测平台类型
function detectPlatform() {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();
    
    return {
        isMac: platform.indexOf('mac') > -1,
        isWindows: platform.indexOf('win') > -1,
        isMobile: /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
    };
}

// 显示微信登录界面
function displayWechatQRCode(qrUrl, state) {
    
    const wechatLoginDiv = document.getElementById('wechatLogin');
    if (!wechatLoginDiv) {
        return;
    }
    
    // 存储当前的 state
    window.currentWechatState = state;
    
    const loginHtml = `
        <div class="text-center">
            <div class="d-flex justify-content-center mb-3" style="width: 100%;">
                <div style="width: 100%; max-width: 300px; aspect-ratio: 1 / 1; overflow: visible; padding: 6px; box-sizing: border-box;">
                    <iframe src="${qrUrl}" style="width: 100%; height: 120%; border: 0; display: block;" scrolling="no"></iframe>
                </div>
            </div>
        </div>
    `;
    
    wechatLoginDiv.innerHTML = loginHtml;
    
    // 开始轮询登录状态
    pollWechatLoginStatus(state);
}

// 处理微信登录按钮点击
function handleWechatLogin() {
    // 显示等待状态
    const wechatLogin = document.getElementById('wechatLogin');
    if (!wechatLogin) {
        return;
    }
    const waitingHtml = `
        <div class="text-center">
            <div class="mb-3">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                <h5 class="mt-3 text-muted">正在等待微信授权...</h5>
                <p class="text-muted small">请在新打开的窗口中完成微信授权</p>
            </div>
            <button type="button" class="btn btn-outline-secondary btn-sm" onclick="startWechatLogin()">重新获取登录链接</button>
        </div>
    `;
    wechatLogin.innerHTML = waitingHtml;
}

// 轮询微信登录状态
function pollWechatLoginStatus(state) {
    const pollInterval = setInterval(() => {
        fetch(APP_ROOT + '/api/wechat_login_status', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ state: state })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success && data.logged_in) {
                clearInterval(pollInterval);
                // 登录成功，关闭模态框并显示成功消息
                const modal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
                if (modal) {
                    modal.hide();
                }
                if (typeof showToast === 'function') {
                    showToast('登录成功！', 'success');
                }
                window.location.reload();
            }
        })
        .catch(error => {
            console.error('轮询登录状态失败:', error);
        });
    }, 2000); // 每2秒检查一次
    
    // 5分钟后停止轮询
    setTimeout(() => {
        clearInterval(pollInterval);
    }, 300000);
}

// 监听来自登录结果页面的消息
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'wechat_login_result') {
        if (wechatLoginTimer) {
            clearInterval(wechatLoginTimer);
        }
        
        if (event.data.success) {
            currentStudent = event.data.user;
            bootstrap.Modal.getInstance(document.getElementById('loginModal')).hide();
            window.location.reload();
        } else {
            // 登录失败，重新显示二维码
            startWechatLogin();
        }
    }
});

// 检查会员状态的函数
async function checkMembershipStatus() {
    try {
        const response = await fetch(APP_ROOT + '/api/membership/status');
        if (response.ok) {
            const data = await response.json();
            console.log('API返回数据:', data);
            // 检查data.success字段，只有success为true时才返回is_member
            if (data.success) {
                return data.is_member;
            } else {
                console.log('API返回success为false:', data.message);
                return false;
            }
        } else {
            console.error('检查会员状态失败:', response.status);
            return false;
        }
    } catch (error) {
        console.error('检查会员状态失败:', error);
        return false;
    }
}

// 检查是否需要登录的函数
function requireLogin(callback, requireMembership = true) {
    if (currentStudent) {
        if (requireMembership) {
            // 检查会员状态
            checkMembershipStatus().then(isMember => {
                if (isMember) {
                    callback();
                } else {
                    // 非会员，显示会员升级提示
                    if (typeof showMembershipModal === 'function') {
                        showMembershipModal();
                    } else {
                        alert('请先开通会员');
                    }
                }
            });
        } else {
            callback();
        }
    } else {
        showLoginModal();
    }
}
