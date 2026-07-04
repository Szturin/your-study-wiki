var APP_ROOT = window.APP_ROOT != null ? window.APP_ROOT : '';

// 清除知识点高亮
function clearKnowledgeHighlight() {
    // 清除题目高亮
    $('.question-item').removeClass('highlighted').each(function() {
        $(this).find('.question-overlay').hide();
    });
    
    // 清除知识点的选中状态
    $('.knowledge-header').removeClass('active');
    
    // 移除所有"去学"按钮
    $('.knowledge-study-btn').remove();
    
    // 重置当前选中的知识点ID
    currentSelectedKnowledgeId = null;
    
    // 显示试卷组整体统计
    const groupId = $('#papergroupSelect').val();
    if (groupId) {
        showPaperGroupStats(groupId);
    }
    
    // 检查"显示难度"开关状态，如果开启则重新显示所有题目的难度蒙版
    const difficultySwitch = document.getElementById('showDifficultySwitch');
    if (difficultySwitch && difficultySwitch.checked) {
        showDifficultyOverlay();
    }
}

// 本地存储管理器
const StorageManager = {
    // 保存用户选择（带错误处理）
    saveUserSelection: function(key, value) {
        try {
            localStorage.setItem(`user_selection_${key}`, value);
            // 写入后立即读取验证
            const verified = localStorage.getItem(`user_selection_${key}`);
            if (verified !== value) {
                console.warn(`localStorage验证失败: key=${key}, expected=${value}, got=${verified}`);
                // 重试一次，但不再进行验证以避免无限循环
                try {
                    localStorage.setItem(`user_selection_${key}`, value);
                } catch (retryError) {
                    console.error('重试保存用户选择失败:', retryError);
                }
            }
        } catch (error) {
            console.error('保存用户选择失败:', error);
        }
    },
    
    // 获取用户选择（带默认值处理）
    getUserSelection: function(key) {
        try {
            const value = localStorage.getItem(`user_selection_${key}`);
            // 处理undefined或null值
            return value === null ? null : value;
        } catch (error) {
            console.error('获取用户选择失败:', error);
            return null;
        }
    },
    
    // 清除用户选择
    clearUserSelection: function(key) {
        try {
            localStorage.removeItem(`user_selection_${key}`);
        } catch (error) {
            console.error('清除用户选择失败:', error);
        }
    },
    
    // 清除所有选择
    clearAllSelections: function() {
        try {
            localStorage.removeItem('user_selection_group_id');
            localStorage.removeItem('user_selection_knowledge_point_id');
            localStorage.removeItem('user_selection_paper_id');
            localStorage.removeItem('user_selection_show_question_numbers');
            localStorage.removeItem('user_selection_show_only_my_comments');
        } catch (error) {
            console.error('清除所有选择失败:', error);
        }
    }
};

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    loadPaperGroups();
    
    // 初始化显示题号开关状态
    initializeQuestionNumbersSwitch();
    
    // 绑定试卷组选择事件
    $('#papergroupSelect').on('change', function() {
        const groupId = $(this).val();
        loadPaperGroup(groupId);
        
        // 存储用户选择的group_id
        if (groupId) {
            StorageManager.saveUserSelection('group_id', groupId);
        }
        
        // 移除自动点击第一个二级知识点的逻辑
        // setTimeout(() => {
        //     clickFirstSecondLevelKnowledge();
        // }, 500);
    });
    
    // 绑定"显示我的记录"开关事件
    $('#showMyRecordsSwitch').on('change', function() {
        const isChecked = $(this).is(':checked');
        toggleMoodRecordsDisplay(isChecked);
        
        // 保存刷题记录开关状态到本地存储
        StorageManager.saveUserSelection('show_my_records', isChecked);
    });
    
    // 绑定"显示题号"开关事件
    $('#showQuestionNumbersSwitch').on('change', function() {
        const isChecked = $(this).is(':checked');
        toggleQuestionNumbersDisplay(isChecked);
        
        // 保存显示题号开关状态到本地存储
        StorageManager.saveUserSelection('show_question_numbers', isChecked);
    });
    
    // 初始化"只看自己"开关状态
    initializeShowOnlyMyCommentsSwitch();
    
    // 页面加载完成后检查登录状态，如果未登录则自动点击第一个三级知识点
    setTimeout(() => {
        checkLoginStatusAndAutoClick();
    }, 500);
    
    // 添加全局评论按钮事件委托（解决点击响应问题）
    $(document).on('click', '.comment-btn', async function(e) {
        // 防止事件冒泡到其他可能的事件处理程序
        e.stopPropagation();
        
        const $btn = $(this);
        const $card = $btn.closest('[data-question-id]');
        if ($card.length) {
            const questionId = $card.data('question-id');
            await handleComment(questionId);
        }
        
        // 阻止默认行为，防止可能的链接跳转
        e.preventDefault();
    });
});

// 检查登录状态并自动点击第一个三级知识点（仅对未登录用户）
async function checkLoginStatusAndAutoClick() {
    try {
        // 检查用户登录状态
        const response = await fetch(APP_ROOT + '/api/check_login');
        if (response.ok) {
            const data = await response.json();
            if (data.logged_in) {
                // 用户已登录，检查会员状态
                if (typeof checkGlobalMembershipStatus === 'function') {
                    checkGlobalMembershipStatus();
                } else {
                    // Fallback or wait for custom.js
                    console.log('checkGlobalMembershipStatus not ready yet');
                }
                
                // 用户已登录，从本地存储恢复刷题记录开关状态
                // const savedShowRecords = StorageManager.getUserSelection('show_my_records');
                const showMyRecordsSwitch = document.getElementById('showMyRecordsSwitch');
                showMyRecordsSwitch.checked = true;
                // 触发状态变化以应用显示效果
                toggleMoodRecordsDisplay(true);


            } else {
                // 用户未登录，确保刷题记录开关处于关闭状态
                const showMyRecordsSwitch = document.getElementById('showMyRecordsSwitch');
                if (showMyRecordsSwitch) {
                    showMyRecordsSwitch.checked = false;
                }
                
                // // 用户未登录（首次访问），自动开启显示难度
                // setTimeout(() => {
                //     // 自动开启显示难度开关
                //     const difficultySwitch = document.getElementById('showDifficultySwitch');
                //     if (difficultySwitch) {
                //         difficultySwitch.checked = true;
                //         // 触发显示难度蒙版
                //         showDifficultyOverlay();
                //     }
                // }, 1000);
            }
        } else {
            // 请求失败，确保刷题记录开关处于关闭状态
            const showMyRecordsSwitch = document.getElementById('showMyRecordsSwitch');
            if (showMyRecordsSwitch) {
                showMyRecordsSwitch.checked = false;
            }
            
            // 请求失败，也认为用户未登录，自动开启显示难度
            setTimeout(() => {
                // 自动开启显示难度开关
                const difficultySwitch = document.getElementById('showDifficultySwitch');
                if (difficultySwitch) {
                    difficultySwitch.checked = true;
                    // 触发显示难度蒙版
                    showDifficultyOverlay();
                }
            }, 1000);
        }
    } catch (error) {
        console.error('检查登录状态失败:', error);
        
        // 出错时确保刷题记录开关处于关闭状态
        const showMyRecordsSwitch = document.getElementById('showMyRecordsSwitch');
        if (showMyRecordsSwitch) {
            showMyRecordsSwitch.checked = false;
        }
        
        // 出现错误，也认为用户未登录，自动开启显示难度
        setTimeout(() => {
            // 自动开启显示难度开关
            const difficultySwitch = document.getElementById('showDifficultySwitch');
            if (difficultySwitch) {
                difficultySwitch.checked = true;
                // 触发显示难度蒙版
                showDifficultyOverlay();
            }
        }, 1000);
    }
}

// 自动点击第一个三级知识点（如果没有三级知识点，则点击二级知识点，再没有则点击一级知识点）
function clickFirstThirdLevelKnowledge() {
    
    // 等待500毫秒确保DOM完全加载
    setTimeout(() => {
        // 查找所有知识点标题
        const knowledgeHeaders = $('.knowledge-header');
        
        if (knowledgeHeaders.length === 0) {
            return;
        }
        
        // 查找三级知识点（padding-left最大的）
        let maxPadding = 0;
        let thirdLevelHeader = null;
        
        knowledgeHeaders.each(function() {
            const paddingLeft = parseInt($(this).css('padding-left')) || 0;
            if (paddingLeft > maxPadding) {
                maxPadding = paddingLeft;
                thirdLevelHeader = $(this);
            }
        });
        
        if (thirdLevelHeader && maxPadding >= 30) {
            const knowledgeId = thirdLevelHeader.data('knowledge-id');
            if (knowledgeId) {
                highlightQuestions(knowledgeId);
            } else {
                thirdLevelHeader.trigger('click');
            }
            return;
        }
        
        // 如果没有三级知识点，查找二级知识点
        let secondLevelHeader = null;
        let secondLevelPadding = 0;
        
        knowledgeHeaders.each(function() {
            const paddingLeft = parseInt($(this).css('padding-left')) || 0;
            if (paddingLeft > 15 && paddingLeft < 30) {
                secondLevelHeader = $(this);
                secondLevelPadding = paddingLeft;
                return false; // 找到第一个就停止
            }
        });
        
        if (secondLevelHeader) {
            const knowledgeId = secondLevelHeader.data('knowledge-id');
            if (knowledgeId) {
                highlightQuestions(knowledgeId);
            } else {
                secondLevelHeader.trigger('click');
            }
            return;
        }
        
        // 如果也没有二级知识点，点击第一个知识点
        const firstHeader = knowledgeHeaders.first();
        if (firstHeader.length > 0) {
            const knowledgeId = firstHeader.data('knowledge-id');
            if (knowledgeId) {
                highlightQuestions(knowledgeId);
            } else {
                firstHeader.trigger('click');
            }
            return;
        }
        
        
    }, 500);
}

// 生成团购码
function generateGroupCode() {
    // 生成一个随机的6位团购码（字母和数字组合）
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// 复制分享链接到剪贴板
function copyGroupShareLink(groupCode) {
    const shareLink = `https://zhentiqiang.com 团购码 ${groupCode}`;
    
    // 使用现代剪贴板API
    navigator.clipboard.writeText(shareLink).then(() => {
        // 显示成功提示
        showToast('分享链接已经复制到剪切板', 'success');
    }).catch(err => {
        // 如果现代API失败，使用备用方法
        const textArea = document.createElement('textarea');
        textArea.value = shareLink;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('分享链接已经复制到剪切板', 'success');
        } catch (err) {
            showToast('复制失败，请手动复制', 'error');
        }
        document.body.removeChild(textArea);
    });
}

// 处理生成团购码按钮点击
function handleGenerateGroupCode() {
    const groupCodeInput = document.getElementById('groupCodeInput');
    const generateBtn = document.getElementById('generateGroupCodeBtn');
    
    // 生成团购码
    const groupCode = generateGroupCode();
    
    // 自动填入输入框
    groupCodeInput.value = groupCode;
    
    // 自动复制分享链接到剪贴板
    copyGroupShareLink(groupCode);
    
    // 禁用按钮防止重复点击
    generateBtn.disabled = true;
    generateBtn.innerHTML = '已生成';
    
    // 3秒后恢复按钮状态
    setTimeout(() => {
        generateBtn.disabled = false;
        generateBtn.innerHTML = '生成团购码';
    }, 3000);
}

// 显示Toast提示
function showToast(message, type = 'info') {
    // 创建Toast元素
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 初始化并显示Toast
    const bsToast = new bootstrap.Toast(toast, {
        autohide: true,
        delay: 3000
    });
    bsToast.show();
    
    // Toast隐藏后移除元素
    toast.addEventListener('hidden.bs.toast', () => {
        document.body.removeChild(toast);
    });
}

// 初始化团购功能事件绑定
function initializeGroupPurchase() {
    // 绑定生成团购码按钮点击事件
    const generateBtn = document.getElementById('generateGroupCodeBtn');
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerateGroupCode);
    }
    
    // 绑定复制分享链接按钮点击事件
    const copyBtn = document.getElementById('copyShareLinkBtn');
    if (copyBtn) {
        copyBtn.addEventListener('click', function() {
            const groupCodeInput = document.getElementById('groupCodeInput');
            if (groupCodeInput.value) {
                copyGroupShareLink(groupCodeInput.value);
            } else {
                showToast('请先生成团购码', 'warning');
            }
        });
    }
}

// 页面加载完成后初始化团购功能
document.addEventListener('DOMContentLoaded', function() {
    // 其他初始化代码...
    
    // 初始化团购功能
    initializeGroupPurchase();
});
// 根据试卷组ID获取图书链接
function getBookLinkByGroupId(groupId) {
    const groupIdNum = parseInt(groupId);
    
    // 数学一 (group_id为8)
    if (groupIdNum === 8) {
        return 'https://detail.tmall.com/item.htm?abbucket=9&id=644373224647&skuId=6107567902599';
    }
    // 数学二 (group_id为9)
    else if (groupIdNum === 9) {
        return 'https://detail.tmall.com/item.htm?abbucket=9&id=644373224647&skuId=6107567902600';
    }
    // 数学三 (group_id为10)
    else if (groupIdNum === 10) {
        return 'https://detail.tmall.com/item.htm?abbucket=9&id=644373224647&skuId=6107567902597';
    }
    // 默认链接（数学一）
    else {
        return 'https://detail.tmall.com/item.htm?abbucket=9&id=644373224647&skuId=6107567902599';
    }
}

// 更新购买链接并记录点击
function updateBookLinkAndRecordClick(event, linkElement) {
    event.preventDefault();
    
    // 获取当前选中的试卷组ID
    const papergroupSelect = document.getElementById('papergroupSelect');
    const groupId = papergroupSelect ? papergroupSelect.value : '8'; // 默认数学一
    
    // 获取对应的图书链接
    const bookLink = getBookLinkByGroupId(groupId);
    
    // 更新链接的href属性
    linkElement.href = bookLink;
    
    // 获取题目ID
    const questionCard = linkElement.closest('[data-question-id]');
    const questionId = questionCard ? questionCard.getAttribute('data-question-id') : null;
    
    if (questionId) {
        // 记录购买点击
        recordBookPurchaseClick(event, questionId);
    } else {
        // 如果没有题目ID，直接打开链接
        window.open(bookLink, '_blank');
    }
}

// 记录书籍购买点击
async function recordBookPurchaseClick(event, questionId) {
    event.preventDefault();
    
    try {
        const response = await fetch(`${APP_ROOT}/api/book_purchase_click`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                question_id: questionId
            })
        });
        
        const result = await response.json();
        
        if (response.ok) {
            // 记录成功后，继续原来的链接跳转行为
            window.open(event.target.href || event.target.parentElement.href, '_blank');
        } else {
            // 即使记录失败，也允许用户继续访问链接
            window.open(event.target.href || event.target.parentElement.href, '_blank');
        }
    } catch (error) {
        // 网络错误时也允许用户继续访问链接
        window.open(event.target.href || event.target.parentElement.href, '_blank');
    }
}



// 显示会员提示
function showMembershipPrompt() {
    // 可以在这里添加非会员的提示信息
}

// 显示网站公告模态框
function showAnnouncementModal() {
    $('#announcementModal').modal('show');
}



// 自动点击刷题记录开关的函数
function clickMoodRecordsSwitch() {
    const showMyRecordsSwitch = document.getElementById('showMyRecordsSwitch');
    if (showMyRecordsSwitch && !showMyRecordsSwitch.checked) {
        // 模拟点击刷题记录开关
        showMyRecordsSwitch.click();
    }
}



// 自动点击第一个二级知识点的函数
function clickFirstSecondLevelKnowledge() {
    // 查找知识树中的所有知识点项
    const knowledgeItems = document.querySelectorAll('.knowledge-item');
    
    for (let item of knowledgeItems) {
        const header = item.querySelector('.knowledge-header');
        if (header) {
            // 通过padding-left判断层级，二级知识点的padding-left为15px
            const style = header.getAttribute('style') || '';
            const paddingMatch = style.match(/padding-left:\s*(\d+)px/);
            
            if (paddingMatch && paddingMatch[1] === '15') {
                // 找到第一个二级知识点，触发点击
                const knowledgeId = header.getAttribute('data-knowledge-id');
                if (knowledgeId) {
                    highlightQuestions(parseInt(knowledgeId));
                    return;
                }
            }
        }
    }
}

// 绑定视频操作事件
function bindVideoEvents(videoContent, questionId) {
        // 绑定点赞按钮事件
        const upvoteButtons = videoContent.querySelectorAll('.video-upvote-btn');
        upvoteButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                const videoId = button.getAttribute('data-video-id');
                const isUpvoted = button.getAttribute('data-upvoted') === 'true';
                
                try {
                    const response = await fetch(`${APP_ROOT}/api/videos/${videoId}/upvote`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                     });
                      
                      const result = await response.json();
                    
                    if (response.ok) {
                        // 更新按钮状态
                        button.setAttribute('data-upvoted', result.is_upvoted.toString());
                        const countSpan = button.querySelector('.upvote-count');
                        countSpan.textContent = result.upvotes;
                        
                        // 更新按钮样式
                        if (result.is_upvoted) {
                            button.classList.remove('btn-outline-success');
                            button.classList.add('btn-success');
                        } else {
                            button.classList.remove('btn-success');
                            button.classList.add('btn-outline-success');
                        }
                    } else {
                        alert(result.error || '操作失败');
                    }
                } catch (error) {
                    alert('操作失败，请稍后重试');
                }
            });
        });
        
        // 绑定报错按钮事件
        const reportButtons = videoContent.querySelectorAll('.video-report-btn');
        reportButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                const videoId = button.getAttribute('data-video-id');
                
                try {
                    const response = await fetch(`${APP_ROOT}/api/videos/${videoId}/report`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        }
                     });
                      
                      const result = await response.json();
                    
                    if (response.ok) {
                        // 更新按钮状态
                        button.setAttribute('data-reported', result.is_reported.toString());
                        const countSpan = button.querySelector('.report-count');
                        countSpan.textContent = result.reports;
                        
                        // 更新按钮样式
                        if (result.is_reported) {
                            button.classList.remove('btn-outline-danger');
                            button.classList.add('btn-danger');
                        } else {
                            button.classList.remove('btn-danger');
                            button.classList.add('btn-outline-danger');
                        }
                        
                        // 显示操作结果提示
                        alert(result.is_reported ? '报错成功' : '取消报错成功');
                    } else {
                        alert(result.error || '操作失败');
                    }
                } catch (error) {
                    alert('操作失败，请稍后重试');
                }
            });
        });
        
        // 绑定删除按钮事件
        const deleteButtons = videoContent.querySelectorAll('.delete-video-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                const videoId = button.getAttribute('data-video-id');
                await handleDeleteVideo(videoId, questionId);
            });
        });

}

// 加载用户的点赞状态
async function loadVideoUpvoteStatus(videoContent, videos) {
        for (const video of videos) {
            try {
                const response = await fetch(`${APP_ROOT}/api/videos/${video.id}/upvote-status`);
                const result = await response.json();
                
                if (response.ok) {
                    const button = videoContent.querySelector(`[data-video-id="${video.id}"]`);
                    if (button) {
                        button.setAttribute('data-upvoted', result.is_upvoted.toString());
                        if (result.is_upvoted) {
                            button.classList.remove('btn-outline-success');
                            button.classList.add('btn-success');
                        }
                    }
                }
            } catch (error) {
                // ... existing code ...
            }
        }
}

// 加载用户的报错状态
async function loadVideoReportStatus(videoContent, videos) {
        for (const video of videos) {
            try {
                const response = await fetch(`${APP_ROOT}/api/videos/${video.id}/report-status`);
                const result = await response.json();
                
                if (response.ok) {
                    const button = videoContent.querySelector(`.video-report-btn[data-video-id="${video.id}"]`);
                    if (button) {
                        button.setAttribute('data-reported', result.is_reported.toString());
                        if (result.is_reported) {
                            button.classList.remove('btn-outline-danger');
                            button.classList.add('btn-danger');
                        }
                    }
                }
            } catch (error) {
                // ... existing code ...
            }
        }
}

async function loadAnalysisImageReportStatus(questionId, images) {
    if (!images || images.length === 0) return;
    
    for (const image of images) {
        try {
            const response = await fetch(`${APP_ROOT}/api/analysis_images/${image.id}/action-status`);
            const result = await response.json();
            
            if (response.ok) {
                const button = document.querySelector(`[data-image-id="${image.id}"].report-btn`);
                if (button) {
                    button.setAttribute('data-reported', result.is_reported.toString());
                    if (result.is_reported) {
                        button.classList.remove('btn-outline-danger');
                        button.classList.add('btn-danger');
                    }
                }
            }
        } catch (error) {
            // ... existing code ...
        }
    }
}

// 处理视频上传表单提交
async function handleVideoUpload(event) {
        event.preventDefault();
        
        const form = event.target || document.getElementById('uploadVideoForm');
        const modal = document.getElementById('uploadVideoModal');
        let questionId = form.getAttribute('data-question-id');
        
        // 如果从form获取不到，尝试从modal获取
        if (!questionId) {
            questionId = modal.getAttribute('data-question-id');
        }
        
        // 如果还是获取不到，尝试从全局变量或其他方式获取
        if (!questionId && window.currentQuestionId) {
            questionId = window.currentQuestionId;
        }
        
        
        if (!questionId) {
            alert('题目ID获取失败，请重新打开上传窗口');
            return;
        }
        
        // 获取时间戳（分钟和秒数）
        const minutes = parseInt(document.getElementById('videoMinutes').value) || 0;
        const seconds = parseInt(document.getElementById('videoSeconds').value) || 0;
        const totalSeconds = minutes * 60 + seconds;
        
        const formData = {
            question_id: parseInt(questionId),
            video_name: document.getElementById('videoName').value.trim(),
            video_url: document.getElementById('videoUrl').value.trim(),
            timestamp: totalSeconds
        };
        
        // 验证表单数据
        if (!formData.video_name) {
            alert('请输入视频作者');
            return;
        }
        
        if (!formData.video_url) {
            alert('请输入视频链接');
            return;
        }
        
        // 验证B站链接格式
        if (!formData.video_url.includes('bilibili.com')) {
            alert('请输入有效的B站视频链接');
            return;
        }
        
        try {
            const response = await fetch(`${APP_ROOT}/api/videos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (response.ok) {
                alert('视频上传成功！');
                
                // 关闭模态框
                const bootstrapModal = bootstrap.Modal.getInstance(modal);
                if (bootstrapModal) {
                    bootstrapModal.hide();
                }
                
                // 重新加载所有相关的视频列表
                const questionCards = document.querySelectorAll(`[data-question-id="${questionId}"]`);
                questionCards.forEach(questionCard => {
                    const videoDisplay = questionCard.querySelector('.video-display');
                    if (videoDisplay && videoDisplay.style.display !== 'none') {
                        loadVideoContent(questionId, videoDisplay);
                    }
                });
            } else {
                alert(result.error || '上传失败');
            }
        } catch (error) {
            alert('上传失败，请稍后重试');
        }
    }
    
    // 处理删除视频
    async function handleDeleteVideo(videoId, questionId) {
        if (!confirm('确定要删除这个视频吗？')) {
            return;
        }
        
        try {
            const response = await fetch(`${APP_ROOT}/api/videos/${videoId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert(result.message);
                // 重新加载视频列表
                const questionCards = document.querySelectorAll(`[data-question-id="${questionId}"]`);
                questionCards.forEach(questionCard => {
                    const videoDisplay = questionCard.querySelector('.video-display');
                    if (videoDisplay && videoDisplay.style.display !== 'none') {
                        loadVideoContent(questionId, videoDisplay);
                    }
                });
            } else {
                alert(result.message || '删除失败');
            }
        } catch (error) {
            alert('网络错误，请稍后重试');
        }
    }
    
    // 创建题目卡片的通用函数
    // mode: 'paper' - 试卷模式, 'knowledge' - 知识点模式, 'single' - 单题模式
    function createQuestionCard(questionData, mode = 'knowledge') {
        
        const template = document.getElementById('questionCardTemplate');
        if (!template) {
            return null;
        }
        const cardElement = template.content.cloneNode(true);
        const $cardElement = $(cardElement);
        
        // 获取题目ID
        const questionId = questionData.question_id || questionData.id;
        
        // 为卡片设置题目ID属性和题号属性
        const $card = $cardElement.find('.question-card');
        if ($card.length && questionId) {
            $card.attr('data-question-id', questionId);
            // 设置题号属性（使用数据库中的index字段）
            if (questionData.index !== undefined && questionData.index !== null) {
                $card.attr('data-question-number', questionData.index);
            }
            // 设置心情计数属性
            $card.attr('data-happy-count', questionData.happy_count || 0);
            $card.attr('data-maybe-count', questionData.maybe_count || 0);
            $card.attr('data-sad-count', questionData.sad_count || 0);
        }
        
        // 设置题目图片
        const $img = $cardElement.find('.question-image');
        $img.attr({
            'src': questionData.image_url || questionData.src || '',
            'alt': `题目${questionData.question_number || ''}`
        });
        
        // 设置年份和分值信息
        const $questionYear = $cardElement.find('.question-year');
        const $questionScore = $cardElement.find('.question-score');
        const $yearSeparator = $cardElement.find('.year-separator');
        
        // 设置知识点名称（现在具有按钮功能）
        const $knowledgePointName = $cardElement.find('.knowledge-point-name');
        
        // 在知识点模式下，即使有知识点信息也强制隐藏知识点名称
        if (mode === 'knowledge') {
            // 知识点模式：强制隐藏知识点名称
            $knowledgePointName.hide();
        } else if (questionData.knowledge_point_name && questionData.knowledge_tags_id) {
            // 其他模式（paper、single）：显示知识点名称并设置为可点击按钮
            $knowledgePointName.text(questionData.knowledge_point_name+'→');
            $knowledgePointName.show();
            
            // 在知识点名称元素上存储知识点ID
            $knowledgePointName.attr('data-knowledge-id', questionData.knowledge_tags_id);
            
            // 设置知识点名称为按钮样式（鼠标手型）
            $knowledgePointName.css({
                'cursor': 'pointer',
                'color': '#1890ff'
            });
            
            // 为知识点名称绑定点击事件（替代原来的举一反三按钮功能）
            $knowledgePointName.off('click').on('click', function() {
                showSimilarQuestions(questionData.knowledge_tags_id, questionData.knowledge_point_name);
            });
        } else {
            // 隐藏知识点名称
            $knowledgePointName.hide();
        }
        
        // 根据模式决定是否显示年份
        if (mode === 'paper') {
            // 试卷模式：只显示分值，不显示年份
            if ($questionYear.length) $questionYear.hide();
            if ($yearSeparator.length) $yearSeparator.hide();
        } else {
            // 知识点模式和单题模式：显示年份和分值
            if ($questionYear.length) {
                $questionYear.text(questionData.year || '');
                $questionYear.show();
            }
            if ($yearSeparator.length) $yearSeparator.show();
        }
        
        if ($questionScore.length) $questionScore.text(questionData.score !== undefined ? questionData.score : '0');

        
        // 绑定按钮事件
        const $moodHappyBtn = $cardElement.find('.mood-happy');
        const $moodEmptyBtn = $cardElement.find('.mood-maybe');
        const $moodSadBtn = $cardElement.find('.mood-sad');
        const $commentBtn = $cardElement.find('.comment-btn');
        const $analysisBtn = $cardElement.find('.analysis-btn');
        const $videoBtn = $cardElement.find('.video-btn');
        const $timerBtn = $cardElement.find('.timer-btn');
        const $answerBtn = $cardElement.find('.answer-btn');
        const $statsBtn = $cardElement.find('.stats-btn');
        
        // 如果题目数据中包含李艳芳视频URL，将其存储在视频按钮的data属性中
        if (questionData.video_url && $videoBtn.length) {
            $videoBtn.attr('data-video-url', questionData.video_url);
        }
        
        $moodHappyBtn.on('click', () => handleMoodVote(questionId, 'happy'));
        $moodEmptyBtn.on('click', () => handleMoodVote(questionId, 'maybe'));
        $moodSadBtn.on('click', () => handleMoodVote(questionId, 'sad'));
        $commentBtn.on('click', (e) => {
            // 防止事件冒泡到可能的事件委托处理程序
            e.stopPropagation();
            handleComment(questionId);
        });
        $analysisBtn.on('click', () => handleAnalysis(questionId));
        
        // 绑定统计按钮点击事件
        if ($statsBtn.length) {
            $statsBtn.on('click', () => {
                // 获取实际的DOM元素而不是DocumentFragment
                const actualCard = $cardElement.find('.question-card')[0] || cardElement;
                handleStats(questionId, actualCard);
            });
        }
        
        if ($timerBtn.length) {
            $timerBtn.on('click', () => {
                // 获取实际的DOM元素而不是DocumentFragment
                const actualCard = $cardElement.find('.question-card')[0] || cardElement;
                // handleTimer(questionId, actualCard); // 已删除计时功能
            });
        }
        
        $answerBtn.on('click', () => {
            // 获取实际的DOM元素而不是DocumentFragment
            const actualCard = $cardElement.find('.question-card')[0] || cardElement;
            handleAnswer(questionId, actualCard);
        });
        
        // 绑定看视频按钮点击事件
        const $videoBtnElement = $cardElement.find('.video-btn');
        $videoBtnElement.on('click', function() {
            // 通过按钮找到其所在的卡片元素
            const actualCard = $(this).closest('.question-card')[0];
            handleVideo(questionId, actualCard);
        });
        
        // 绑定上传视频按钮点击事件
        const $uploadVideoBtnElement = $cardElement.find('.upload-video-btn');
        $uploadVideoBtnElement.on('click', () => handleUploadVideoClick(questionId));
        
        // 绑定上传解析图片按钮点击事件（使用全局事件委托）
        if (!window.uploadAnalysisButtonBound) {
            $(document).on('click', '.upload-analysis-btn', function() {
                const $btn = $(this);
                const $card = $btn.closest('[data-question-id]');
                const questionId = $card.data('question-id');
                handleUploadAnalysisClick(questionId);
            });
            window.uploadAnalysisButtonBound = true;
        }
        
        // 绑定上传视频表单提交事件（只绑定一次）
        if (!window.uploadVideoFormBound) {
            $(document).on('click', '#submitVideoBtn', function(e) {
                e.preventDefault();
                handleVideoUpload(e);
            });
            window.uploadVideoFormBound = true;
        }
        
        // 绑定上传解析图片表单提交事件（只绑定一次）
        if (!window.uploadAnalysisFormBound) {
            $(document).on('click', '#submitAnalysisBtn', function(e) {
                e.preventDefault();
                const form = document.getElementById('uploadAnalysisForm');
                const event = { target: form, preventDefault: () => {} };
                handleAnalysisUpload(event);
            });
            window.uploadAnalysisFormBound = true;
        }
        
        
        // 绑定统计面板关闭按钮事件
        const $statsPanel = $cardElement.find('.stats-panel');
        if ($statsPanel.length) {
            const $closeStatsBtn = $statsPanel.find('.close-stats-btn');
            if ($closeStatsBtn.length) {
                $closeStatsBtn.on('click', () => {
                    closeStatsPanel(questionId);
                });
            }
        }


        
        // 绑定评论区事件
        const $commentSection = $cardElement.find('.comment-section');
        if ($commentSection.length) {
            // 绑定关闭按钮 - 使用事件委托确保在模态框中也能正常工作
            const $closeBtn = $commentSection.find('.close-comment-btn');
            $closeBtn.off('click').on('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                closeCommentSection(this);
            });
            
            // 绑定提交按钮
            const $submitBtn = $commentSection.find('.submit-comment-btn');
            $submitBtn.off('click').on('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                submitCommentFromButton(event.target);
            });
            
            // 绑定输入框字符计数
            const $commentInput = $commentSection.find('.comment-input');
            $commentInput.off('input').on('input', function() {
                updateCharCount($commentSection[0]);
            });
        }
        

        
        // 初始化"只看自己"开关
        initializeShowOnlyMyCommentsSwitch();
        
        // 返回DocumentFragment本身，让调用者处理DOM插入
        return cardElement;
    }
    
    // 处理情感投票
    function handleMoodVote(questionId, mood) {
        requireLogin(() => {
            const moodTypeMap = {
            'happy': 6,  // 熟练
            'empty': 7,  // 不熟
            'sad': 8     // 不会
        };
            
            // 注意：如果没有正在进行的计时，不需要更新计时记录
            // 表情投票只是记录用户对题目的情感反馈，不一定需要关联到计时记录
            
            // 构造交互类型
            const interactionType = `mood_${mood}`;
            
            // 发送API请求
            fetch(`${APP_ROOT}/api/student_interaction`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    question_id: questionId,
                    interaction_type: interactionType
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // 更新所有相关题目卡片的UI状态
                    updateQuestionCardUI(questionId, data.stats, data.user_selection);
                    
                    // 如果显示收藏开关开启，实时更新缩略图颜色
                    if ($('#showMyRecordsSwitch').prop('checked')) {
                        loadUserMoodRecords().then(() => {
                            applyMoodOverlays();
                        });
                    }
                } else {
                    if (data.message === '请先登录') {
                        alert('请先登录后再进行操作');
                    }
                }
            })
            .catch(error => {
                // 情感投票请求失败
            });
        });
    }
    
    // 更新题目卡片UI状态
    function updateQuestionCardUI(questionId, stats, userSelection) {
        // 查找所有相关的题目卡片
        const $questionCards = $(`[data-question-id="${questionId}"]`);
        
        $questionCards.each(function() {
            const $card = $(this);
            
            // 更新统计数据 - 只在用户点击过表情时显示数字
            const hasUserSelection = userSelection && (
                userSelection.mood_happy || 
                userSelection.mood_maybe || 
                userSelection.mood_sad
            );
            
            $card.find('.mood-happy-count').text(stats.mood_happy || 0);
            $card.find('.mood-maybe-count').text(stats.mood_maybe || 0);
            $card.find('.mood-sad-count').text(stats.mood_sad || 0);
            
            // 控制数字显示：如果用户从未标记过任何表情，隐藏所有数字
            $card.find('.mood-happy-count, .mood-maybe-count, .mood-sad-count')
                .css('display', hasUserSelection ? 'inline' : 'none');
            
            // 更新评论数量并控制显示
            const commentCount = stats.comment || 0;
            const $commentCountBadge = $card.find('.comment-count');
            $commentCountBadge.text(commentCount);
            $commentCountBadge.css('display', commentCount > 0 ? 'inline' : 'none');
            
            // 更新用户选择状态（图标显示）
            const $happyBtn = $card.find('.mood-happy');
            const $maybeBtn = $card.find('.mood-maybe');
            const $sadBtn = $card.find('.mood-sad');
            
            // 清除所有选中状态
            [$happyBtn, $maybeBtn, $sadBtn].forEach($btn => {
                if ($btn.length) {
                    $btn.find('.mood-icon-outline').show();
                    $btn.find('.mood-icon-filled').hide();
                    $btn.removeClass('selected');
                }
            });
            
            // 设置当前选中状态
            if (userSelection && userSelection.mood_happy && $happyBtn.length) {
                $happyBtn.find('.mood-icon-outline').hide();
                $happyBtn.find('.mood-icon-filled').show();
                $happyBtn.addClass('selected');
            }
            if (userSelection && userSelection.mood_maybe && $maybeBtn.length) {
                $maybeBtn.find('.mood-icon-outline').hide();
                $maybeBtn.find('.mood-icon-filled').show();
                $maybeBtn.addClass('selected');
            }
            if (userSelection && userSelection.mood_sad && $sadBtn.length) {
                $sadBtn.find('.mood-icon-outline').hide();
                $sadBtn.find('.mood-icon-filled').show();
                $sadBtn.addClass('selected');
            }
            
        });
    }
    


    
    // 显示Toast提示
    function showToast(message, duration = 3000) {
        // 创建toast元素
        const toast = document.createElement('div');
        toast.className = 'toast-message';
        toast.textContent = message;
        
        // 设置样式
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #dc3545;
            color: white;
            padding: 12px 20px;
            border-radius: 6px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            z-index: 10000;
            font-size: 14px;
            font-weight: 500;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        
        // 添加到页面
        document.body.appendChild(toast);
        
        // 显示动画
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        }, 10);
        
        // 自动消失
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
    }
    
    // 页面关闭或刷新时的处理 - 已删除计时功能
    // window.addEventListener('beforeunload', function(event) {
    //     if (timerState.isRunning || timerState.isPaused) {
    //         // 计时中断，不提交数据
    //         
    //         // 停止计时器
    //         if (timerState.intervalId) {
    //             clearInterval(timerState.intervalId);
    //             timerState.intervalId = null;
    //         }
    //         
    //         // 重置状态
    //         timerState.isRunning = false;
    //         timerState.isPaused = false;
    //         timerState.startTime = null;
    //         timerState.pausedTime = 0;
    //         timerState.currentQuestionId = null;
    //     }
    // });
    
    // 模态框关闭时的处理

    
    // 处理查看答案
    function handleAnswer(questionId, cardElement) {
        
        // 检查登录状态
        requireLogin(() => loadAnswerForQuestion(questionId, cardElement));
    }
    
    // 为已登录用户加载答案内容
    function loadAnswerForQuestion(questionId, cardElement) {
        
        // 在所有相关卡片中查找答案相关元素
        const questionCards = document.querySelectorAll(`[data-question-id="${questionId}"]`);
        let answerBtn, answerLabel, closedIcon, openIcon, answerDisplay;
        
        // 在所有相关卡片中查找答案元素
        questionCards.forEach(card => {
            if (!answerBtn) answerBtn = card.querySelector('.answer-btn');
            if (!answerLabel) answerLabel = card.querySelector('.answer-label');
            if (!closedIcon) closedIcon = card.querySelector('.answer-icon-closed');
            if (!openIcon) openIcon = card.querySelector('.answer-icon-open');
            if (!answerDisplay) answerDisplay = card.querySelector('.answer-display');
        });
        
        if (answerDisplay && (answerDisplay.style.display === 'none' || !answerDisplay.style.display)) {
            // 显示答案
            
            // 更新UI
            if (answerLabel) answerLabel.textContent = '收起答案';
            if (closedIcon) closedIcon.style.display = 'none';
            if (openIcon) openIcon.style.display = 'inline';
            if (answerBtn) answerBtn.classList.add('active');
            answerDisplay.style.display = 'block';
            
            // 加载答案内容
            loadAnswerContent(questionId, answerDisplay);
        } else if (answerDisplay) {
            // 收起答案
            if (answerLabel) answerLabel.textContent = '看答案';
            if (closedIcon) closedIcon.style.display = 'inline';
            if (openIcon) openIcon.style.display = 'none';
            if (answerBtn) answerBtn.classList.remove('active');
            answerDisplay.style.display = 'none';
        }
    }
    
    // 加载答案内容
    function loadAnswerContent(questionId, answerDisplay) {
        if (!answerDisplay) return;
        
        const answerContent = answerDisplay.querySelector('.answer-content');
        if (!answerContent) return;
        
        answerContent.innerHTML = '<p class="text-muted">答案内容加载中...</p>';
        
        // 从后端获取题目信息
        fetch(`${APP_ROOT}/api/question_info/${questionId}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    if (data.question_type === 1 && data.answer) {
                        // 选择题：显示答案文字
                        answerContent.innerHTML = `
             
                         <div class="answer-image" style="font-weight: bold;font-size: larger;background-color: white; text-align: left; padding: 10px;display:flex;align-items: center;">
                                <span style="margin-right:20px;">答案:</span>
                                <span >${data.answer}</span>
                            </div>

                            `;
                    } else {
                        // 非选择题：显示答案图片
                        const imagePath = `/static/photos/answer_images/${questionId}.png`;
                        answerContent.innerHTML = `
                            <div class="answer-image" style="background-color: white; text-align: left; padding: 10px;display:flex;align-items: center;">
                                <span style="font-weight: bold;font-size: larger;margin-right:20px;">答案:</span>
                                <img src="${imagePath}" 
                                     alt="题目 ${questionId} 答案" 
                                     style=" display: block;">
                            </div>
                        `;
                    }
                } else {
                    answerContent.innerHTML = '<p class="text-muted">获取答案信息失败</p>';
                }
            })
            .catch(error => {
                answerContent.innerHTML = '<p class="text-muted">答案加载失败，请稍后重试</p>';
            });
    }
    
    // 加载解析图片内容
    async function loadAnalysisContent(questionId, analysisDisplay) {
        if (!analysisDisplay) return;
        
        const analysisContent = analysisDisplay.querySelector('.analysis-content');
        if (!analysisContent) return;
        
        analysisContent.innerHTML = '<p class="text-muted">解析图片加载中...</p>';
        
        try {
            // 直接查找该题目ID对应的解析图片
            const imagePath = `analysis_images/${questionId}.png`;
            const imageUrl = `/static/photos/${imagePath}`;
            
            // 检查图片是否存在
            const img = new Image();
            img.onload = function() {
                // 图片存在，显示图片
                analysisContent.innerHTML = `
                    <div class="analysis-image-container text-center" style="max-width: 100%; overflow: hidden;">
                        <img src="${imageUrl}" alt="解析图片" class="img-fluid" style="max-width: 100%; height: auto;">
                    </div>
                `;
            };
            img.onerror = function() {
                // 图片不存在，显示提示信息
                analysisContent.innerHTML = '<p class="text-muted text-center">该题暂无解析</p>';
            };
            img.src = imageUrl;
            
        } catch (error) {
            analysisContent.innerHTML = '<p class="text-muted text-center">该题暂无解析</p>';
        }
    }
    
    // 绑定解析图片的顶踩按钮事件
    function bindAnalysisImageActions(questionId) {
        const analysisContent = document.querySelector(`[data-question-id="${questionId}"] .analysis-content`);
        if (!analysisContent) return;
        
        // 绑定顶按钮事件
        analysisContent.querySelectorAll('.upvote-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const imageId = this.getAttribute('data-image-id');
                await handleAnalysisImageAction(imageId, 'upvote', this);
            });
        });
        
        // 绑定举报按钮事件
        analysisContent.querySelectorAll('.report-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const imageId = this.getAttribute('data-image-id');
                await handleAnalysisImageAction(imageId, 'report', this);
            });
        });
        
        // 绑定删除按钮事件
        analysisContent.querySelectorAll('.delete-analysis-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const imageId = this.getAttribute('data-image-id');
                await handleDeleteAnalysisImage(imageId, questionId);
            });
        });
    }
    
    // 处理解析图片的顶踩操作
    async function handleAnalysisImageAction(imageId, action, buttonElement) {
        try {
            const response = await fetch(`${APP_ROOT}/api/analysis_images/${imageId}/action`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: action })
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 更新按钮状态和计数
                const countSpan = buttonElement.querySelector(action === 'upvote' ? '.upvote-count' : '.report-count');
                if (countSpan) {
                    countSpan.textContent = action === 'upvote' ? result.upvotes : result.reports;
                }
                
                // 更新按钮样式
                if (action === 'upvote') {
                    if (result.is_actioned) {
                        buttonElement.classList.remove('btn-outline-success');
                        buttonElement.classList.add('btn-success');
                    } else {
                        buttonElement.classList.remove('btn-success');
                        buttonElement.classList.add('btn-outline-success');
                    }
                } else {
                    // 举报按钮样式
                    if (result.is_actioned) {
                        buttonElement.classList.remove('btn-outline-danger');
                        buttonElement.classList.add('btn-danger');
                    } else {
                        buttonElement.classList.remove('btn-danger');
                        buttonElement.classList.add('btn-outline-danger');
                    }
                }
                
                // 移除成功提示，只保留错误提示
            } else {
                showToast(result.message || '操作失败', 'error');
            }
        } catch (error) {
            showToast('网络错误，请稍后重试', 'error');
        }
    }
    
    // 处理删除解析图片
    async function handleDeleteAnalysisImage(imageId, questionId) {
        if (!confirm('确定要删除这张解析图片吗？')) {
            return;
        }
        
        try {
            const response = await fetch(`${APP_ROOT}/api/analysis_images/${imageId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                }
            });
            
            const result = await response.json();
            
            if (result.success) {
                // 移除成功提示，只保留错误提示
                // 重新加载解析图片列表
                const questionCards = document.querySelectorAll(`[data-question-id="${questionId}"]`);
                questionCards.forEach(questionCard => {
                    const analysisDisplay = questionCard.querySelector('.analysis-display');
                    if (analysisDisplay && analysisDisplay.style.display !== 'none') {
                        loadAnalysisContent(questionId, analysisDisplay);
                    }
                });
            } else {
                showToast(result.message || '删除失败', 'error');
            }
        } catch (error) {
            showToast('网络错误，请稍后重试', 'error');
        }
    }
    
    // 显示图片模态框
    function showImageModal(imagePath) {
        const modal = $(`
            <div class="modal fade" id="imageModal" tabindex="-1">
                <div class="modal-dialog modal-lg modal-dialog-centered">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">解析图片</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body text-center">
                            <img src="/static/${imagePath}" alt="解析图片" class="img-fluid">
                        </div>
                    </div>
                </div>
            </div>
        `);
        
        $('body').append(modal);
        modal.modal('show');
        
        modal.on('hidden.bs.modal', function() {
            modal.remove();
        });
    }
    
         // 处理上传解析图片按钮点击
      function handleUploadAnalysisClick(questionId) {
          
          const modalElement = document.getElementById('uploadAnalysisModal');
          
          if (!modalElement) {
              showToast('模态框未找到，请刷新页面重试', 'error');
              return;
          }
          
          // 检查Bootstrap是否可用
          
          // 设置模态框中的题目ID
          const form = document.getElementById('uploadAnalysisForm');
          if (form) {
              form.setAttribute('data-question-id', questionId);
              // 清空表单
              form.reset();
          } else {
          }
          
          try {
              // 优先使用Bootstrap Modal方式显示模态框
              if (typeof bootstrap !== 'undefined' && typeof bootstrap.Modal !== 'undefined') {
                  const modal = new bootstrap.Modal(modalElement, {
                      backdrop: false,
                      keyboard: true
                  });
                  
                  modal.show();
              } else if (typeof $ !== 'undefined') {
                  $('#uploadAnalysisModal').modal({
                      backdrop: false,
                      keyboard: true,
                      show: true
                  });
              } else {
                  showToast('模态框组件未加载', 'error');
                  return;
              }
          } catch (error) {
              showToast('显示模态框失败: ' + error.message, 'error');
          }
      }
      
      // 处理解析图片上传表单提交
      async function handleAnalysisUpload(event) {
          event.preventDefault();
          
          const form = event.target;
          const questionId = form.getAttribute('data-question-id');
          const fileInput = form.querySelector('#analysisImage');
          
          if (!fileInput.files[0]) {
              showToast('请选择要上传的图片', 'error');
              return;
          }
          
          const formData = new FormData();
          formData.append('image', fileInput.files[0]);
          formData.append('question_id', questionId);
          
          const submitBtn = document.getElementById('submitAnalysisBtn');
          const originalText = submitBtn.textContent;
          submitBtn.disabled = true;
          submitBtn.textContent = '上传中...';
          
          try {
            const response = await fetch(`${APP_ROOT}/api/analysis_images`, {
                  method: 'POST',
                  body: formData
              });
              
              const result = await response.json();
              
              if (result.success) {
                  // 关闭模态框
                  const modal = bootstrap.Modal.getInstance(document.getElementById('uploadAnalysisModal'));
                  modal.hide();
                  
                  // 重新加载解析图片内容
                  const analysisDisplay = document.querySelector(`[data-question-id="${questionId}"] .analysis-display`);
                  if (analysisDisplay) {
                      await loadAnalysisContent(questionId, analysisDisplay);
                  }
              } else {
                  showToast(result.message || '上传失败', 'error');
              }
          } catch (error) {
              showToast('网络错误，请稍后重试', 'error');
          } finally {
              submitBtn.disabled = false;
              submitBtn.textContent = originalText;
          }
      }
      
         // 处理上传视频按钮点击
      function handleUploadVideoClick(questionId) {
          
          const modalElement = document.getElementById('uploadVideoModal');
          
          if (!modalElement) {
              showToast('模态框未找到，请刷新页面重试', 'error');
              return;
          }
          
          // 设置模态框中的题目ID
          const form = document.getElementById('uploadVideoForm');
          if (form) {
              form.setAttribute('data-question-id', questionId);
              // 清空表单
              form.reset();
          } else {
          }
          
          // 同时在modal上设置题目ID作为备用
          modalElement.setAttribute('data-question-id', questionId);
          
          // 设置全局变量作为最后的备用方案
          window.currentQuestionId = questionId;
          
          
          try {
              // 优先使用Bootstrap Modal方式显示模态框
              if (typeof bootstrap !== 'undefined' && typeof bootstrap.Modal !== 'undefined') {
                  const modal = new bootstrap.Modal(modalElement, {
                      backdrop: false,
                      keyboard: true
                  });
                  
                  modal.show();
              } else if (typeof $ !== 'undefined') {
                  $('#uploadVideoModal').modal({
                      backdrop: false,
                      keyboard: true,
                      show: true
                  });
              } else {
                  showToast('模态框组件未加载', 'error');
                  return;
              }
          } catch (error) {
              showToast('显示模态框失败: ' + error.message, 'error');
          }
      }
     
    // 处理看视频按钮点击
    function handleVideo(questionId, cardElement) {
        
        // 添加调试信息
        const $cardElement = $(cardElement);
        const $videoBtn = $cardElement.find('.video-btn');
        if ($videoBtn.length > 0) {
        }
        
        // 检查登录状态
        requireLogin(() => loadVideoForQuestion(questionId, cardElement));
    }
   

    // 检测设备类型：平板或电脑
    function isTabletDevice() {
        // 方法1: 用户代理检测（最常用）
        const userAgent = navigator.userAgent.toLowerCase();
        const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
        
        // 专门检测iPad
        const isIPad = /ipad/i.test(userAgent) || 
                      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        
        // 方法2: 触摸屏检测
        const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        
        // 方法3: 屏幕尺寸检测（iPad通常有较大的屏幕，所以阈值提高）
        const isTabletScreen = window.innerWidth <= 1024 && window.innerWidth >= 768;
        
        // 综合判断：如果是移动设备UA，或者是iPad，或者有触摸功能且屏幕尺寸符合平板特征
        return isMobileUA || isIPad || (hasTouch && isTabletScreen);
    }

    // 专门处理新标签页打开的函数
    function openVideo(url) {
        
        // 复制URL到剪切板（无提示）
        navigator.clipboard.writeText(url).catch(err => {
            // 静默失败，不提示用户
        });

        try {
            const newWindow = window.open(url, '_blank');
            
            // 立即检测是否被阻止
            if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                throw new Error('弹窗被阻止');
            }
            
            // // 异步检测（更可靠）
            // setTimeout(() => {
            //     try {
            //         if (newWindow.closed || !newWindow.location.href) {
            //             // 弹窗被阻止，回退到本页跳转
            //             window.location.href = url;
            //         }
            //     } catch (e) {
            //         // 跨域安全限制，通常意味着窗口被阻止
            //         window.location.href = url;
            //     }
            // }, 100);
            
        } catch (e) {
            // 同步异常情况，直接在本页跳转
            // window.location.href = url;
        }

        // let fallbackTriggered = false;
        
        // const triggerFallback = () => {
        //     if (fallbackTriggered) return;
        //     fallbackTriggered = true;
            
        //     if (confirm('弹窗被阻止。是否在当前页面打开？')) {
        //         window.location.href = url;
        //     }
        // };
        
        // const newWindow = window.open(url, '_blank');
        
        // // 同步检测
        // if (!newWindow) {
        //     triggerFallback();
        //     return;
        // }
        
        // // 异步检测
        // setTimeout(() => {
        //     if (fallbackTriggered) return;
            
        //     try {
        //         // 重要：先检查newWindow是否存在，再访问其属性
        //         if (newWindow && newWindow.closed) {
        //             triggerFallback();
        //         }
        //         // 如果newWindow存在且未关闭，说明弹窗成功打开
        //     } catch (e) {
        //         // 跨域异常：无法访问窗口属性
        //         // 这种情况下我们保守地认为弹窗可能被阻止
        //         // 或者可以选择不处理，让用户自己判断
        //         console.warn('无法检测弹窗状态:', e.message);
        //     }
        // }, 100);
    
      
        // try {
        //     const newWindow = window.open(url, '_blank');
            
        //     // 立即检测是否被阻止
        //     if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        //         throw new Error('弹窗被阻止');
        //     }
            
        //     // 异步检测（更可靠）
        //     setTimeout(() => {
        //         try {
        //             if (newWindow.closed || !newWindow.location.href) {
        //                 // 弹窗被阻止，回退到本页跳转
        //                 window.location.href = url;
        //             }
        //         } catch (e) {
        //             // 跨域安全限制，通常意味着窗口被阻止
        //             window.location.href = url;
        //         }
        //     }, 100);
            
        // } catch (e) {
        //     // 同步异常情况，直接在本页跳转
        //     window.location.href = url;
        // }
    // const isTablet = isTabletDevice();
        
    //     if (isTablet) {
    //         // window.location.href = url;
    //         // 平板设备：三级打开策略
    //         openVideoOnTablet(url);
    //     } else {
    //         // 电脑设备：直接跳转B站网址
    //         // openVideoOnComputer(url);
    //         try {
    //             // 在新标签页中打开B站网址
    //             window.open(url, '_blank');
    //         } catch (e) {
    //             // console.error('新标签页打开失败:', e);
    //             // 备用方案：直接跳转
    //             window.location.href = url;
    //         }

    }

    // 平板设备的三级打开策略
    function openVideoOnTablet(url) {
        // 第一级：尝试打开B站App（去掉时间戳参数，因为App可能不支持）
        try {
            // 使用B站App的URL Scheme，去掉时间戳参数
            const cleanUrl = removeTimestampFromUrl(url);
            const bvid = extractBvidFromUrl(cleanUrl);
            if (bvid) {
                const bilibiliScheme = 'bilibili://video/' + bvid;
                window.location.href = bilibiliScheme;
                
                // 设置超时检测，如果3秒后还在当前页面，说明App打开失败
                setTimeout(() => {
                    if (!document.hidden) {
                        // 第二级：在默认浏览器中跳转到B站链接（带时间戳）
                        openVideoInBrowser(url);
                    }
                }, 2000);
            } else {
                // 如果无法提取BVID，直接进入第二级
                openVideoInBrowser(url);
            }
            
        } catch (e) {
            // 如果URL Scheme失败，直接进入第二级
            openVideoInBrowser(url);
        }
    }

    // 在浏览器中打开视频（新标签页）
    function openVideoInBrowser(url) {
        try {
            const newWindow = window.open(url, '_blank');
            
            // 立即检测是否被阻止
            if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
                throw new Error('弹窗被阻止');
            }
            
            // 更可靠的异步检测
            let isBlocked = false;
            setTimeout(() => {
                try {
                    if (newWindow.closed || !newWindow.location.href) {
                        isBlocked = true;
                        // openVideoWithIframe(url);
                        window.location.href = url;
                    }
                } catch (e) {
                    // 跨域安全限制，通常意味着窗口被阻止
                    isBlocked = true;
                    // openVideoWithIframe(url);
                    window.location.href = url;
                }
            }, 100);
            
            // 额外检测：如果窗口没有获得焦点，可能也被阻止了
            setTimeout(() => {
                if (!isBlocked && !newWindow.closed && !newWindow.document.hasFocus()) {
                    // 窗口存在但没有获得焦点，用户可能看不到
                    newWindow.focus(); // 尝试聚焦
                }
            }, 500);
            
        } catch (e) {
            // openVideoWithIframe(url);
            window.location.href = url;
        }
    }

    // // 使用iframe方式打开视频
    // function openVideoWithIframe(url) {
    //     try {
    //         // 创建iframe容器
    //         const iframeContainer = document.createElement('div');
    //         iframeContainer.style.position = 'fixed';
    //         iframeContainer.style.top = '0';
    //         iframeContainer.style.left = '0';
    //         iframeContainer.style.width = '100%';
    //         iframeContainer.style.height = '100%';
    //         iframeContainer.style.backgroundColor = 'rgba(0,0,0,0.8)';
    //         iframeContainer.style.zIndex = '9999';
    //         iframeContainer.style.display = 'flex';
    //         iframeContainer.style.alignItems = 'center';
    //         iframeContainer.style.justifyContent = 'center';
            
    //         // 创建关闭按钮
    //         const closeButton = document.createElement('button');
    //         closeButton.textContent = '×';
    //         closeButton.style.position = 'absolute';
    //         closeButton.style.top = '20px';
    //         closeButton.style.right = '20px';
    //         closeButton.style.background = '#fff';
    //         closeButton.style.border = 'none';
    //         closeButton.style.borderRadius = '50%';
    //         closeButton.style.width = '40px';
    //         closeButton.style.height = '40px';
    //         closeButton.style.fontSize = '24px';
    //         closeButton.style.cursor = 'pointer';
    //         closeButton.style.zIndex = '10000';
    //         closeButton.onclick = () => document.body.removeChild(iframeContainer);
            
    //         // 创建iframe
    //         const iframe = document.createElement('iframe');
    //         iframe.src = url;
    //         iframe.style.width = '90%';
    //         iframe.style.height = '80%';
    //         iframe.style.border = 'none';
    //         iframe.style.borderRadius = '10px';
            
    //         // 添加到页面
    //         iframeContainer.appendChild(iframe);
    //         iframeContainer.appendChild(closeButton);
    //         document.body.appendChild(iframeContainer);
            
    //     } catch (e) {
    //         console.error('iframe打开失败:', e);
    //         // 最终降级方案：当前页面跳转
    //         window.location.href = url;
    //     }
    // }

    // 电脑设备的打开策略（新标签页）
    function openVideoOnComputer(url) {
        try {
            // 在新标签页中打开B站网址
            window.open(url, '_blank');
        } catch (e) {
            console.error('新标签页打开失败:', e);
            // 备用方案：直接跳转
            window.location.href = url;
        }
    }

    // 从URL中提取BVID
    function extractBvidFromUrl(url) {
        try {
            // 尝试从URL中提取BVID
            const bvidMatch = url.match(/\/video\/(BV[\w]+)/);
            if (bvidMatch && bvidMatch[1]) {
                return bvidMatch[1];
            }
            
            // 如果无法提取BVID，返回空字符串
            return '';
        } catch (e) {
            return '';
        }
    }

    // 从URL中移除时间戳参数
    function removeTimestampFromUrl(url) {
        try {
            // 移除t参数（时间戳）
            return url.replace(/[?&]t=\d+/g, '').replace(/[?&]p=\d+/g, '');
        } catch (e) {
            return url;
        }
    }
    
    // 使用a标签模拟点击的独立函数
    function openWithAnchorTag(url) {
        try {
            // 方案3: 创建真实DOM元素并模拟用户点击
            const link = document.createElement('a');
            link.href = url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.style.position = 'absolute';
            link.style.left = '-9999px';
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            
            // 模拟真实的用户点击事件
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            
            const success = link.dispatchEvent(clickEvent);
            
            if (!success) {
                // 如果事件被阻止，尝试直接click
                link.click();
            }
            
            // 清理DOM元素
            setTimeout(() => {
                if (document.body.contains(link)) {
                    document.body.removeChild(link);
                }
            }, 300);
            
            // 延迟检测是否成功
            setTimeout(() => {
                // 方案4: 表单提交方式 (最后的备用方案)
                if (document.hasFocus()) {
                    openWithForm(url);
                }
            }, 200);
            
            return true;
        } catch (e) {
            openWithForm(url);
            return false;
        }
    }
    
    function openWithForm(url) {
        // 方案4: 使用表单提交的方式 (某些情况下更可靠)
        try {
            const form = document.createElement('form');
            form.method = 'GET';
            form.action = url;
            form.target = '_blank';
            form.style.display = 'none';
            
            document.body.appendChild(form);
            form.submit();
            
            setTimeout(() => {
                if (document.body.contains(form)) {
                    document.body.removeChild(form);
                }
                
                // 最终降级方案：当前页面跳转
                if (document.hasFocus()) {
                    showToast('浏览器阻止了弹窗，将在当前页面打开视频', 'warning');
                    setTimeout(() => {
                        window.location.href = url;
                    }, 1500);
                }
            }, 500);
            
        } catch (e) {
            // 最终降级方案
            showToast('浏览器阻止了弹窗，将在当前页面打开视频', 'warning');
            setTimeout(() => {
                window.location.href = url;
            }, 1500);
        }
    }
    
    // 为已登录用户加载视频内容
    function loadVideoForQuestion(questionId, cardElement) {
        
        // 在所有相关卡片中查找视频相关元素
        const questionCards = document.querySelectorAll(`[data-question-id="${questionId}"]`);
        let videoBtn, videoLabel, closedIcon, openIcon, videoDisplay;
        
        questionCards.forEach(card => {
            if (!videoBtn) videoBtn = card.querySelector('.video-btn');
            if (!videoLabel) videoLabel = card.querySelector('.video-label');
            if (!closedIcon) closedIcon = card.querySelector('.video-icon-closed');
            if (!openIcon) openIcon = card.querySelector('.video-icon-open');
            if (!videoDisplay) videoDisplay = card.querySelector('.video-display');
        });
        
        if (videoDisplay && (videoDisplay.style.display === 'none' || !videoDisplay.style.display)) {
            // 显示视频内容
            
            // 更新UI
            if (videoLabel) videoLabel.textContent = '收起视频';
            if (closedIcon) closedIcon.style.display = 'none';
            if (openIcon) openIcon.style.display = 'inline';
            if (videoBtn) videoBtn.classList.add('active');
            videoDisplay.style.display = 'block';
            
            // 加载视频内容
            loadVideoContent(questionId, videoDisplay);
        } else if (videoDisplay) {
            // 收起视频
            if (videoLabel) videoLabel.textContent = '看视频';
            if (closedIcon) closedIcon.style.display = 'inline';
            if (openIcon) openIcon.style.display = 'none';
            if (videoBtn) videoBtn.classList.remove('active');
            videoDisplay.style.display = 'none';
        }
    }
    
    // 加载视频内容
    async function loadVideoContent(questionId, videoDisplay) {
        if (!videoDisplay) return;
        
        const videoContent = videoDisplay.querySelector('.video-content');
        if (!videoContent) return;
        
        videoContent.innerHTML = '<p class="text-muted">视频列表加载中...</p>';
        
        try {
            // 从后端API获取视频列表
            const response = await fetch(`${APP_ROOT}/api/videos/${questionId}`);
            const result = await response.json();
            
            if (!result.success) {
                videoContent.innerHTML = `<p class="text-danger">${result.message || '获取视频列表失败'}</p>`;
                return;
            }
            
            const videos = result.videos || [];
            
            if (videos.length === 0) {
                videoContent.innerHTML = '<p class="text-muted">暂无视频解析</p>';
                return;
            }
            
            // 生成视频列表HTML
            let listHtml = `
            <div class="alert alert-info mb-3">
                <div class="d-flex align-items-center justify-content-left">
                    <h6 class="mb-0" style="font-size: 0.9vw;margin-right: 10px;color: #848484ff;">提示：如不能正常跳转视频（尤其平板上）的解决方法</h6>
                    <button class="btn btn-sm btn-outline-info" type="button" data-bs-toggle="collapse" data-bs-target="#safariHelpCollapse" aria-expanded="false" aria-controls="safariHelpCollapse">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>

                </div>

                <div class="collapse mt-2" id="safariHelpCollapse">
                    <div class="card card-body border-0 bg-light" style="color: #848484ff;">
                        <p class="mb-2"><strong>点击视频名称默认会打开浏览器新窗口跳到b站播放，但在平板电脑上如果安装了B站app，
                        可能会拉起app播放，而这样不能正常跳转到视频讲解的时间点。</strong></p>
                        <ol class="mb-0">
                            <li>长按视频名称（而不是点击），在弹出菜单中选择“在后台打开”。</li>
                            <li>如果还不能解决，视频链接会自动复制到剪贴板，你可以直接在浏览器中打开新窗口粘贴播放。</li>
                        </ol>
                    </div>
                </div>
                
            </div>
            <div class="list-group list-group-flush">`;
            videos.forEach((video) => {
                // 构建B站链接，包含时间戳
                let videoUrl = video.video_url;
                if (video.timestamp && video.timestamp !== '0:00') {
                    // 解析时间戳并转换为总秒数
                    let totalSeconds = 0;
                    
                    if (typeof video.timestamp === 'number') {
                        // 如果是数字，直接使用
                        totalSeconds = video.timestamp;
                    } else if (typeof video.timestamp === 'string') {
                        // 如果是字符串格式（如"1:30"），解析为秒数
                        const timeParts = video.timestamp.split(':');
                        if (timeParts.length === 2) {
                            const minutes = parseInt(timeParts[0]) || 0;
                            const seconds = parseInt(timeParts[1]) || 0;
                            totalSeconds = minutes * 60 + seconds;
                        }
                    }
                    
                    // 只添加t参数
                    if (totalSeconds > 0) {
                        const separator = videoUrl.includes('?') ? '&' : '?';
                        videoUrl += `${separator}t=${totalSeconds}`;
                    }
                }
                
                listHtml += `
                    <div class="list-group-item d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center flex-grow-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon me-2 text-primary">
                                <polygon points="5,3 19,12 5,21"></polygon>
                            </svg>
                            <a 
                                href="${videoUrl}" 
                                onclick="openVideo(this.href); return false;" 
                                class="text-decoration-none flex-grow-1" 
                            > 
                                <span>${video.video_name}</span> 
                            </a>

                  
                        </div>
                        
                    </div>`;
            });
            listHtml += '</div>';
            
            videoContent.innerHTML = listHtml;
            
            // 监听折叠状态变化，更新箭头方向
            setTimeout(() => {
                const collapseElement = document.getElementById('safariHelpCollapse');
                const toggleButton = document.querySelector('[data-bs-target="#safariHelpCollapse"]');
                
                
                if (collapseElement && toggleButton) {
                    
                    // 移除Bootstrap的data属性，完全手动控制
                    toggleButton.removeAttribute('data-bs-toggle');
                    toggleButton.removeAttribute('data-bs-target');
                    
                    // 手动跟踪折叠状态
                    let isCollapsed = !collapseElement.classList.contains('show');
                    
                    // 手动处理按钮点击事件
                    toggleButton.addEventListener('click', function(e) {
                        e.preventDefault();
                        
                        
                        if (isCollapsed) {
                            collapseElement.classList.add('show');
                            toggleButton.querySelector('.icon').style.transform = 'rotate(180deg)';
                            isCollapsed = false;
                        } else {
                            collapseElement.classList.remove('show');
                            toggleButton.querySelector('.icon').style.transform = 'rotate(0deg)';
                            isCollapsed = true;
                        }
                    });
                    
                    // 手动触发一次初始状态检查
                    if (collapseElement.classList.contains('show')) {
                        toggleButton.querySelector('.icon').style.transform = 'rotate(180deg)';
                        isCollapsed = false;
                    } else {
                        toggleButton.querySelector('.icon').style.transform = 'rotate(0deg)';
                        isCollapsed = true;
                    }
                } else {
                    console.log('未找到折叠元素或按钮:', {collapseElement, toggleButton});
                }
            }, 100);
            
            // 绑定视频操作事件
            // bindVideoEvents(videoContent, questionId);
            
            // 加载用户的点赞状态
            // loadVideoUpvoteStatus(videoContent, videos);
            
            // 加载用户的报错状态
            // loadVideoReportStatus(videoContent, videos);
            
        } catch (error) {
            videoContent.innerHTML = '<p class="text-danger">加载视频列表失败，请稍后重试</p>';
        }
    }
    
    // 处理题目缩略图点击事件
    async function handleQuestionItemClick(questionElement) {
        const $questionElement = $(questionElement);
        
        // 检查题目是否有视觉元素：题号、高亮蒙版、心情蒙版或难度蒙版
        const hasQuestionNumber = $questionElement.find('.question-number').is(':visible');
        const isHighlighted = $questionElement.hasClass('highlighted');
        const hasMoodOverlay = $questionElement.find('.mood-overlay').length > 0;
        const hasDifficultyOverlay = $questionElement.find('.difficulty-overlay').length > 0;
        
        // 如果题目上有视觉元素（题号或任何蒙版），则点击单个题目；否则点击整套试卷
        if (hasQuestionNumber || isHighlighted || hasMoodOverlay || hasDifficultyOverlay) {
            // 显示单个题目
            await showSingleQuestionModal(questionElement);
        } else {
            // 显示整张试卷
            const paperId = $questionElement.closest('[data-paper-id]').attr('data-paper-id');
            const paperName = $questionElement.attr('data-paper-name') || '试卷详情';
            
            if (paperId) {
                // 调用显示试卷模态框的函数（与点击paper-header效果一样）
                await showPaperModal(paperId, paperName);
            } else {
                // 如果无法获取试卷ID，则显示单个题目
                await showSingleQuestionModal(questionElement);
            }
        }
    }
    
    // 处理题目缩略图鼠标悬浮事件
    function handleQuestionItemHover(questionElement, isEntering) {
        const $questionElement = $(questionElement);
        
        // 检查题目是否有视觉元素：题号、高亮蒙版、心情蒙版或难度蒙版
        const hasQuestionNumber = $questionElement.find('.question-number').is(':visible');
        const isHighlighted = $questionElement.hasClass('highlighted');
        const hasMoodOverlay = $questionElement.find('.mood-overlay').length > 0;
        const hasDifficultyOverlay = $questionElement.find('.difficulty-overlay').length > 0;
        
        // 如果题目上有视觉元素（题号或任何蒙版），则使用默认的CSS悬浮效果（单个题目）；否则高亮整张试卷
        if (hasQuestionNumber || isHighlighted || hasMoodOverlay || hasDifficultyOverlay) {
            // 使用默认的CSS悬浮效果（单个题目），不需要额外处理
            return;
        } else {
            // 高亮整张试卷
            const paperName = $questionElement.attr('data-paper-name');
            
            if (paperName) {
                // 找到同一张试卷的所有题目
                const $samePaperQuestions = $(`.question-item[data-paper-name="${paperName}"]`);
                
                if (isEntering) {
                    // 鼠标进入：为整张试卷添加悬浮效果
                    $samePaperQuestions.addClass('paper-hover');
                } else {
                    // 鼠标离开：移除整张试卷的悬浮效果
                    $samePaperQuestions.removeClass('paper-hover');
                }
            }
        }
    }

    // 显示单个题目的详细卡片
    async function showSingleQuestionModal(questionElement) {
        const $modal = $('#questionModal');
        const $modalContent = $('#questionModalContent');
        const $modalTitle = $modal.find('.modal-title');
        
        // 清理计时器状态，防止状态混乱 - 已删除计时功能
        // if (timerState.isRunning) {
        //     clearInterval(timerState.intervalId);
        // }
        // timerState.isRunning = false;
        // timerState.startTime = null;
        // timerState.intervalId = null;
        // timerState.currentQuestionId = null;
        
        // 设置模态框标题
        $modalTitle.text('题目详情');
        
        // 从题目元素中提取基本数据
        const $questionElement = $(questionElement);
        const $img = $questionElement.find('img');
        const questionId = $questionElement.attr('data-question-id') || $questionElement.attr('data-id');
        
        if (!questionId) {
            return;
        }
        
        let questionData = {
            image_url: $img.length ? $img.attr('src').replace('_thumb.png', '.png') : '',
            paper_name: $questionElement.attr('data-paper-name') || '未知试卷',
            question_number: $questionElement.attr('data-question-number') || '?',
            question_id: questionId,
            question_type: parseInt($questionElement.attr('data-question-type')) || 1,
            score: parseInt($questionElement.attr('data-score')) || 0,
            year: $questionElement.attr('data-year') || null,
            happy_count: parseInt($questionElement.attr('data-happy-count')) || 0,
            maybe_count: parseInt($questionElement.attr('data-maybe-count')) || 0,
            sad_count: parseInt($questionElement.attr('data-sad-count')) || 0
        };
        
        try {
            // 通过API获取完整的题目信息，包括视频URL
            const response = await fetch(`${APP_ROOT}/api/question_info/${questionId}`);
            const result = await response.json();
            
            if (result.success) {
                // 更新题目数据
                questionData.question_type = result.question_type || questionData.question_type;
                questionData.score = result.score || questionData.score;
                questionData.year = result.year || questionData.year;
                
                // 如果API返回了视频URL，添加到题目数据中
                if (result.video_url) {
                    questionData.video_url = result.video_url;
                }
                
                // 如果API返回了知识点信息，添加到题目数据中
                if (result.knowledge_point_name && result.knowledge_tags_id) {
                    questionData.knowledge_point_name = result.knowledge_point_name;
                    questionData.knowledge_tags_id = result.knowledge_tags_id;
                }
                
            } else {
            }
        } catch (error) {
        }
        
        // 创建卡片并显示
        $modalContent.empty();
        const cardElement = createQuestionCard(questionData, 'single');
        const $questionDiv = $('<div class="col-12"></div>');
        $questionDiv.append(cardElement);
        $modalContent.append($questionDiv);
        
        // 获取实际的卡片元素用于后续操作
        const actualCardElement = $questionDiv.find('.question-card')[0];
        
        // 选择题选项功能已删除
        // if (questionData.question_type === 1 && actualCardElement) {
        //     setTimeout(() => {
        //         showChoiceOptions(actualCardElement, questionData.question_id);
        //     }, 100);
        // }
        
        // 注意：这里不应该设置currentQuestionId，它应该只在用户点击评论按钮打开评论区时设置
        
        // 加载用户对当前题目的表情状态和统计数据
        setTimeout(async () => {
            try {
                // 获取题目统计数据
                const statsResponse = await fetch(`${APP_ROOT}/api/question_stats/${questionData.question_id}`);
                
                if (statsResponse.ok) {
                    const statsData = await statsResponse.json();
                    
                    // 构造用户选择状态（需要通过检查用户是否已登录来决定是否获取）
                    let userSelection = {};
                    
                    // 检查是否已登录，如果已登录则尝试获取用户选择状态
                    const checkLoginResponse = await fetch(APP_ROOT + '/api/check_login');
                    if (checkLoginResponse.ok) {
                        const loginData = await checkLoginResponse.json();
                        if (loginData.logged_in) {
                            // 用户已登录，使用专门的API获取用户状态
                            const userResponse = await fetch(`${APP_ROOT}/api/user_selection/${questionData.question_id}`);
                            
                            if (userResponse.ok) {
                                const userData = await userResponse.json();
                                if (userData.success) {
                                    userSelection = userData.user_selection || {};
                                }
                            }
                        }
                    }
                    
                    // 更新题目卡片的表情按钮状态
                    updateQuestionCardUI(questionData.question_id, statsData, userSelection);
                }
            } catch (error) {
            }
            
            // 如果显示我的记录开关是开启的，应用蒙版
            const showMyRecordsSwitch = document.getElementById('showMyRecordsSwitch');
            if (showMyRecordsSwitch && showMyRecordsSwitch.checked) {
                // 确保先加载用户记录再应用蒙版
                loadUserMoodRecords().then(() => {
                    applyMoodOverlays();
                });
            }
            
            // 如果显示题号开关是开启的，添加题号
            const showQuestionNumbersSwitch = document.getElementById('showQuestionNumbersSwitch');
            if (showQuestionNumbersSwitch && showQuestionNumbersSwitch.checked) {
                addQuestionNumbers();
            }
        }, 150);
        
        // 获取历史计时记录 - 已删除计时功能
        // if (questionData.question_id) {
        //     loadTimerRecord(questionData.question_id);
        // }
        
        // 显示模态框
        $modal.css({
            'display': 'flex',
            'opacity': '1'
        });
        $('body').css('overflow', 'hidden');
        
        const $modalContentElement = $modal.find('.question-modal-content');
        $modalContentElement.css({
            'transform': 'scale(0.1)',
            'transition': 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
        });
        
        setTimeout(() => {
            $modalContentElement.css('transform', 'scale(1)');
            
            // 动画完成后初始化"只看自己"开关
            setTimeout(() => {
                initializeShowOnlyMyCommentsSwitch();
            }, 400); // 等待动画完成
        }, 50);
    }
    
    // 举一反三功能：关闭当前modal并模拟点击知识点标签
    function showSimilarQuestions(knowledgeId, knowledgeName) {
        // 关闭当前题目modal（支持试卷模式和普通题目模式）
        const $questionModal = $('#questionModal');
        const $paperModal = $('#paperModal');
        
        if ($paperModal.css('display') !== 'none') {
            // 当前显示的是试卷modal
            closePaperModal();
        } else if ($questionModal.css('display') !== 'none') {
            // 当前显示的是普通题目modal
            closeQuestionModal();
        }
        
        // 检查知识点是否已经处于选中状态（只针对左侧目录的知识点标签）
        const $knowledgeElement = $(`.knowledge-header[data-knowledge-id="${knowledgeId}"]`);
        

        
        // 模拟点击知识点标签
        if ($knowledgeElement.length > 0) {
            // 如果找到了知识点元素，直接触发其点击事件
        // 如果知识点已经选中，不需要再次点击（避免取消选中状态）
            const isAlreadySelected = $knowledgeElement.length > 0 && 
                                    $knowledgeElement.hasClass('active');
            

            if (!isAlreadySelected) {
                $knowledgeElement[0].click();
            }
            
            
            // 1秒钟后自动点击该知识点的"刷题"按钮
            setTimeout(() => {
                const $studyBtn = $(`.knowledge-study-btn[onclick*="${knowledgeId}"]`);
                if ($studyBtn.length > 0) {
                    $studyBtn[0].click();
                }
            }, 500);
        } else {
            // 如果没有找到对应的DOM元素，直接调用highlightQuestions函数
            highlightQuestions(knowledgeId);
        }
    }

    // 加载试卷组列表
    async function loadPaperGroups() {
        try {
            const cachedGroupId = StorageManager.getUserSelection('group_id');
            const preferredGroupId = cachedGroupId || 8;

            const bootstrapResponse = await fetch(`${APP_ROOT}/api/bootstrap?group_id=${preferredGroupId}`);
            const bootstrapData = await bootstrapResponse.json();
            const paperGroups = bootstrapData && bootstrapData.success ? bootstrapData.papergroups : [];

            const $dropdown = $('#papergroupSelect');
            // $dropdown.html('<option value="">选择试卷组</option>');

            paperGroups.forEach(group => {
                const $option = $('<option></option>');
                $option.val(group.id);
                $option.text(group.name);
                
                // 优先使用本地缓存的group_id，否则默认选中id为8的试卷组
                if (cachedGroupId && group.id == cachedGroupId) {
                    $option.prop('selected', true);
                } else if (!cachedGroupId && group.id == 8) {
                    $option.prop('selected', true);
                    
                }
                
                $dropdown.append($option);
            });
            
            // 自动加载选中的试卷组
            const selectedGroupId = paperGroups.find(group => group.id == preferredGroupId)
                ? preferredGroupId
                : (paperGroups[0] ? paperGroups[0].id : null);
            const selectedGroup = paperGroups.find(group => group.id == selectedGroupId);
            if (selectedGroup) {
                $dropdown.val(selectedGroupId);

                if (bootstrapData && bootstrapData.success && bootstrapData.group_id == selectedGroupId) {
                    loadPaperGroup(selectedGroupId, bootstrapData);
                } else {
                    loadPaperGroup(selectedGroupId);
                }
            }


        } catch (error) {
        }
    }

    // 试卷组选择变化处理
    async function loadPaperGroup(groupId, bootstrapData = null) {
        if (!groupId) {
            // 重置显示
            $('#knowledgeTreeContent').html('<p class="text-muted">请先选择试卷组</p>');
            $('#paperListContent').html('<p class="text-muted">请先选择试卷组</p>');
            // 隐藏统计容器
            hideKnowledgeStats();
            return;
        }
        
        let data = bootstrapData;
        try {
            if (!data || !data.success || data.group_id != groupId) {
                const response = await fetch(`${APP_ROOT}/api/bootstrap?group_id=${groupId}`);
                data = await response.json();
            }
        } catch (e) {
            data = null;
        }

        if (data && data.success) {
            await loadKnowledgeTree(groupId, data.knowledge_tree);
            await loadPaperList(groupId, data.papers);
        } else {
            loadKnowledgeTree(groupId);
            loadPaperList(groupId);
        }
        
        // 显示试卷组整体统计
        showPaperGroupStats(groupId);
    }

    // 监听窗口大小变化，重新计算图表高度
    window.addEventListener('resize', () => {
        if (paperGroupChart) {
            calculateAndSetChartHeight();
        }
    });

    // 加载知识点树
    async function loadKnowledgeTree(groupId, preloadedKnowledgePoints = null) {
        try {
            const knowledgePoints = preloadedKnowledgePoints
                ? preloadedKnowledgePoints
                : await (await fetch(`${APP_ROOT}/api/knowledge_tree/${groupId}`)).json();
            
            // 保存知识点树数据
            knowledgeTreeData = knowledgePoints;
            
            const $container = $('#knowledgeTreeContent');
            
            if (knowledgePoints.length === 0) {
                $container.html('<p class="text-muted">暂无知识点数据</p>');
                return;
            }
            
            // 递归渲染知识点树
            function renderKnowledgeTree(points, level = 0) {
                let html = '';
                points.forEach(point => {
                    const hasChildren = point.children && point.children.length > 0;
                    const indent = 'padding-left: ' + (level * 1) + 'vw;';
                    
                    // 根据层级设置不同大小的圆点
                    let bulletSymbol = '';
                    if (level === 0) {
                        bulletSymbol = '●'; // 一级：大圆点
                    } else if (level === 1) {
                        bulletSymbol = '○'; // 二级：中圆点
                    } else {
                        bulletSymbol = '•'; // 三级及以上：小圆点
                    }
                    
                    // 统一使用相同的结构，不区分有无子节点
                    const fontWeight = level === 0 ? 'font-weight: bold;' : level === 1 ? 'font-weight: 600;' : 'font-weight: normal;';
                    html += `
                        <div class="knowledge-item">
                            <div class="knowledge-header" 
                                 data-knowledge-id="${point.id}"
                                 onclick="highlightQuestions(${point.id})"
                                 style="${indent}">
                                <span class="knowledge-close-btn" onclick="event.stopPropagation(); clearKnowledgeHighlight()">×</span>
                                <span class="knowledge-bullet">${bulletSymbol}</span>
                                <span class="knowledge-name" style="${fontWeight}">${point.name}</span>
                            </div>
                            ${hasChildren ? `<div class="knowledge-children">${renderKnowledgeTree(point.children, level + 1)}</div>` : ''}
                        </div>
                    `;
                });
                return html;
            }
            
            let html = '<div class="knowledge-tree-container">';
            html += renderKnowledgeTree(knowledgePoints);
            html += '</div>';
            
            $container.html(html);
        } catch (error) {
            $('#knowledgeTreeContent').html('<p class="text-danger">加载知识点树失败</p>');
        }
    }

    // 加载试卷列表
    // 添加事件委托处理试卷头部点击
    $(document).on('click', '.paper-header', async function() {
        const paperId = $(this).data('paper-id');
        const paperName = $(this).data('paper-name');
        await showPaperModal(paperId, paperName);
    });

    async function loadPaperList(groupId, preloadedPapers = null) {
        try {
            const papers = preloadedPapers
                ? preloadedPapers
                : await (await fetch(`${APP_ROOT}/api/papers/${groupId}`)).json();
            
            const $container = $('#paperListContent');
            
            if (papers.length === 0) {
                $container.html('<p class="text-muted">暂无试卷数据</p>');
                return;
            }
            
            // 按列显示所有题目
            let html = '<div class="row">';
            
            papers.forEach((paper, paperIndex) => {
                html += `
                    <div class="col-md-t mb-3 paper-column" data-paper-id="${paper.id}">
                        <div class="card h-100">
                            <div class="paper-header" data-paper-id="${paper.id}" data-paper-name="${paper.name}" style="cursor: pointer;display:block;">
                                <h6 class="card-title mb-0 small text-center">${paper.name}</h6>
                            </div>
                            <div class="card-body p-2">`;
                
                // 显示该试卷的所有题目图片
                if (paper.questions && paper.questions.length > 0) {
                    paper.questions.forEach((question, questionIndex) => {
                        // 根据 group、paper 的 id 和题号 index 拼接图片路径
                        const questionIndex1Based = question.index || (questionIndex + 1);
                        const imagePath = `/static/photos/group_${groupId}/paper_${paper.id}/${questionIndex1Based}_thumb.png`;
                        
                        html += `
                            <div class="mb-q position-relative question-item" 
                                 data-knowledge-id="${question.knowledge_tags_id || ''}"
                                 data-paper-name="${paper.name}"
                                 data-question-number="${questionIndex1Based}"
                                 data-question-id="${question.id}"
                                 data-question-type="${question.question_type || 1}"
                                 data-score="${question.score || 0}"
                                 data-year="${question.year || ''}"
                                 data-happy-count="${question.happy_count || 0}"
                                 data-maybe-count="${question.maybe_count || 0}"
                                 data-sad-count="${question.sad_count || 0}"
                                 style="cursor: pointer;" 
                                 onclick="handleQuestionItemClick(this)"
                                 onmouseenter="handleQuestionItemHover(this, true)"
                                 onmouseleave="handleQuestionItemHover(this, false)">
                                <img src="${imagePath}" 
                                     alt="题目 ${questionIndex1Based}" 
                                     class="img-fluid w-100" 
                                     
                                     loading="lazy"
                                     onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                                <div class="mb-1" style="display: none;">
                                    <button class="btn btn-outline-secondary btn-sm w-100 p-1" 
                                        onclick="viewQuestion(${paper.id}, ${question.id})" 
                                        style="font-size: 0.75rem;">
                                        
                                    </button>
                                </div>
                                <div class="question-overlay" style="display: none;"></div>
                            </div>
                        `;
                    });
                } else {
                    html += '<p class="text-muted small text-center">暂无题目</p>';
                }
                
                html += `
                            </div>
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
            $container.html(html);
            
            // 如果刷题记录开关是开启状态，重新应用刷题记录蒙版
            const showMyRecordsSwitch = document.getElementById('showMyRecordsSwitch');
            if (showMyRecordsSwitch && showMyRecordsSwitch.checked) {
                // 延迟一下确保DOM完全渲染
                setTimeout(() => {
                    applyMoodOverlays();
                }, 100);
            }
            
            // 如果显示题号开关是开启状态，重新添加题号
            const showQuestionNumbersSwitch = document.getElementById('showQuestionNumbersSwitch');
            if (showQuestionNumbersSwitch && showQuestionNumbersSwitch.checked) {
                // 延迟一下确保DOM完全渲染
                setTimeout(() => {
                    addQuestionNumbers();
                }, 100);
            }
        } catch (error) {
            $('#paperListContent').html('<p class="text-danger">加载试卷列表失败</p>');
        }
    }

    // 查看试卷详情
    function viewPaper(paperId) {
        // 这里可以实现试卷详情查看功能
        alert(`查看试卷 ID: ${paperId}`);
    }
    
    // 查看题目详情
    function viewQuestion(paperId, questionId) {
        // 这里可以实现题目详情查看功能
        alert(`查看题目 - 试卷ID: ${paperId}, 题目ID: ${questionId}`);
    }

    // 重置筛选
    function resetFilter() {
        $('#papergroupSelect').val('');
        loadPaperGroup('');
        
        // 清除知识点高亮和选中状态
        $('.question-item').removeClass('highlighted').each(function() {
            $(this).find('.question-overlay').hide();
        });
        $('.knowledge-header').removeClass('active');
        currentSelectedKnowledgeId = null;
        
        // 销毁所有图表
        destroyKnowledgeCharts();
        if (paperGroupChart) {
            paperGroupChart.destroy();
            paperGroupChart = null;
        }
        
        // 隐藏所有统计容器
        const knowledgeStatsSection = document.getElementById('knowledgeStatsSection');
        const paperGroupStatsSection = document.getElementById('paperGroupStatsSection');
        if (knowledgeStatsSection) knowledgeStatsSection.style.display = 'none';
        if (paperGroupStatsSection) paperGroupStatsSection.style.display = 'none';
    }
    
    // 获取知识点名称的辅助函数
    function getKnowledgePointName(knowledgeId, tree = knowledgeTreeData) {
        for (const point of tree) {
            if (point.id === knowledgeId) {
                return point.name;
            }
            if (point.children && point.children.length > 0) {
                const found = getKnowledgePointName(knowledgeId, point.children);
                if (found) {
                    return found;
                }
            }
        }
        return '未知知识点';
    }
    
    // 存储知识点树结构，用于查找父子关系
    let knowledgeTreeData = [];
    
    // 获取知识点的所有子节点ID（包括自身）
    function getAllChildrenIds(knowledgeId, tree = knowledgeTreeData) {
        let ids = [knowledgeId];
        
        function findChildren(nodes) {
            for (let node of nodes) {
                if (node.id == knowledgeId) {
                    if (node.children && node.children.length > 0) {
                        function collectIds(children) {
                            for (let child of children) {
                                ids.push(child.id);
                                if (child.children && child.children.length > 0) {
                                    collectIds(child.children);
                                }
                            }
                        }
                        collectIds(node.children);
                    }
                    return;
                }
                if (node.children && node.children.length > 0) {
                    findChildren(node.children);
                }
            }
        }
        
        findChildren(tree);
        return ids;
    }
    
    // 当前选中的知识点ID
    let currentSelectedKnowledgeId = null;
    
    // 高亮与指定知识点相关的题目
    function highlightQuestions(knowledgeId) {
        // 检查是否重复点击同一个知识点
        if (currentSelectedKnowledgeId === knowledgeId) {
            // 取消选择：清除高亮和统计图表
            $('.question-item').removeClass('highlighted').each(function() {
                $(this).find('.question-overlay').hide();
            });
            $('.knowledge-header').removeClass('active');
            // 移除所有"去学"按钮
            $('.knowledge-study-btn').remove();
            currentSelectedKnowledgeId = null;
            
            // 显示试卷组整体统计（而不是隐藏统计容器）
            const groupId = $('#papergroupSelect').val();
            if (groupId) {
                showPaperGroupStats(groupId);
            }
            
            // 检查"显示难度"开关状态，如果开启则重新显示所有题目的难度蒙版
            const difficultySwitch = document.getElementById('showDifficultySwitch');
            if (difficultySwitch && difficultySwitch.checked) {
                showDifficultyOverlay();
            }
            return;
        }
        
        // 清除之前的高亮
        $('.question-item').removeClass('highlighted').each(function() {
            $(this).find('.question-overlay').hide();
        });
        
        // 清除知识点的选中状态
        $('.knowledge-header').removeClass('active');
        // 移除所有"去学"按钮
        $('.knowledge-study-btn').remove();
        
        // 获取包含所有子节点的ID列表
        const allIds = getAllChildrenIds(knowledgeId);
        
        // 高亮相关题目
        $('.question-item').each(function() {
            const $item = $(this);
            const questionKnowledgeId = parseInt($item.attr('data-knowledge-id'));
            if (allIds.includes(questionKnowledgeId)) {
                $item.addClass('highlighted');
                $item.find('.question-overlay').show();
            }
        });
        
        // 标记当前选中的知识点
        const $selectedHeader = $(`[data-knowledge-id="${knowledgeId}"]`);
        $selectedHeader.addClass('active');
        
        // 在选中的知识点后面添加"去学"按钮
        const $knowledgeName = $selectedHeader.find('.knowledge-name');
        $knowledgeName.after(`
            <button class="knowledge-study-btn" 
                    onclick="event.stopPropagation(); showQuestionModal(${knowledgeId})"
                    title="进入该知识点的题目练习">
                刷题
            </button>
        `);
        
        // 更新当前选中的知识点ID
        currentSelectedKnowledgeId = knowledgeId;
        
        // 显示知识点统计图表
        // 从点击的DOM元素中获取知识点名称，更可靠
        const knowledgeName = $(`[data-knowledge-id="${knowledgeId}"]`).find('.knowledge-name').text() || getKnowledgePointName(knowledgeId);
        
        // 调试日志：输出获取知识点名称的过程

        
        showKnowledgeStats(knowledgeId, knowledgeName);
        
        // 检查"显示难度"开关状态，如果开启则重新显示难度蒙版
        const difficultySwitch = document.getElementById('showDifficultySwitch');
        if (difficultySwitch && difficultySwitch.checked) {
            // 直接调用showDifficultyOverlay，它现在会先移除所有蒙版再重新显示正确的蒙版
            showDifficultyOverlay();
        }
    }
    
    // 显示题目模态框
    function showQuestionModal(knowledgeId) {
        // 获取知识点名称
        const knowledgeName = $(`[data-knowledge-id="${knowledgeId}"]`).find('.knowledge-name').text() || 
                              getKnowledgePointName(knowledgeId);
        
        const allIds = getAllChildrenIds(knowledgeId);
        const highlightedQuestions = [];
        const originalElements = [];
        
        // 收集高亮的题目和原始元素
        $('.question-item').each(function() {
            const $item = $(this);
            const questionKnowledgeId = parseInt($item.attr('data-knowledge-id'));
            if (allIds.includes(questionKnowledgeId)) {
                highlightedQuestions.push(this.cloneNode(true));
                originalElements.push(this);
            }
        });
        
        // 对题目进行排序：先按年份（时间）从小到大，再按题号从小到大
        highlightedQuestions.sort((a, b) => {
            const $a = $(a);
            const $b = $(b);
            
            // 获取年份，如果没有年份则设为最大值（排在最后）
            const yearA = parseInt($a.attr('data-year')) || 9999;
            const yearB = parseInt($b.attr('data-year')) || 9999;
            
            // 先按年份排序
            if (yearA !== yearB) {
                return yearB - yearA;
            }
            
            // 年份相同时，按题号排序
            const questionNumberA = parseInt($a.attr('data-question-number')) || 9999;
            const questionNumberB = parseInt($b.attr('data-question-number')) || 9999;
            
            return questionNumberA - questionNumberB;
        });
        
        // 创建动画容器
        const $animationContainer = $('<div class="animation-container"></div>');
        $('body').append($animationContainer);
        
        // 计算页面中心位置
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        // 为每个题目创建动画元素
        originalElements.forEach((originalElement, index) => {
            const rect = originalElement.getBoundingClientRect();
            const $animationElement = $(originalElement.cloneNode(true));
            
            // 设置动画元素的初始位置和样式
            $animationElement.css({
                'position': 'fixed',
                'left': rect.left + 'px',
                'top': rect.top + 'px',
                'width': rect.width + 'px',
                'height': rect.height + 'px',
                'z-index': '10000',
                'transition': 'all 1s ease-out',
                'transform-origin': 'center'
            });
            
            $animationContainer.append($animationElement);
            
            // 隐藏原始元素
            $(originalElement).css('opacity', '0.3');
            
            // 立即开始向中心移动的动画
            setTimeout(() => {
                $animationElement.css({
                    'left': (centerX - rect.width / 2) + 'px',
                    'top': (centerY - rect.height / 2) + 'px',
                    'transform': 'scale(0.5)'
                });
            }, 50);
        });
        
        // 1秒后清理动画元素并显示模态框
        setTimeout(() => {
            // 清理动画元素
            $animationContainer.remove();
            
            // 恢复原始元素
            originalElements.forEach(element => {
                $(element).css('opacity', '');
            });
            
            // 显示模态框
            const $modal = $('#questionModal');
            const $modalContent = $('#questionModalContent');
            
            // 设置modal标题为知识点名称
            $modal.find('.modal-title').text(knowledgeName + ' - 历年真题');
            
            // 分页相关变量
            const questionsPerPage = 25;
            let currentPage = 1;
            const totalQuestions = highlightedQuestions.length;
            const totalPages = Math.ceil(totalQuestions / questionsPerPage);
            
            // 创建模态框内容（使用新的卡片模板）
            $modalContent.empty();
            
            // 创建题目容器
            const $questionsContainer = $('<div id="questionsContainer" class="row"></div>');
            $modalContent.append($questionsContainer);
            
            // 创建分页容器（只有超过20道题才显示）
            let $paginationContainer = null;
            if (totalQuestions >= 20) {
                $paginationContainer = $('<div class="pagination-container mt-3 d-flex justify-content-center"></div>');
                $modalContent.append($paginationContainer);
            }
            
            // 渲染题目的函数
            async function renderQuestions(page) {
                $questionsContainer.empty();
                
                const startIndex = (page - 1) * questionsPerPage;
                const endIndex = Math.min(startIndex + questionsPerPage, totalQuestions);
                
                for (let i = startIndex; i < endIndex; i++) {
                    const question = highlightedQuestions[i];
                    
                    // 从原始题目元素中提取数据
                    const $question = $(question);
                    const questionId = $question.attr('data-question-id') || $question.attr('data-id');
                    
                    // 从DOM中提取基本数据
                    const $img = $question.find('img');
                    let questionData = {
                        image_url: $img.length ? $img.attr('src').replace('_thumb.png', '.png') : '',
                        paper_name: $question.attr('data-paper-name') || '未知试卷',
                        question_number: $question.attr('data-question-number') || '?',
                        question_id: questionId,
                        question_type: parseInt($question.attr('data-question-type')) || 1,
                        score: parseInt($question.attr('data-score')) || 0,
                        year: $question.attr('data-year') || null,
                        happy_count: parseInt($question.attr('data-happy-count')) || 0,
                        maybe_count: parseInt($question.attr('data-maybe-count')) || 0,
                        sad_count: parseInt($question.attr('data-sad-count')) || 0
                    };
                    
                    // 尝试从后端获取完整数据（特别是video_url）
                    if (questionId) {
                        try {
                            const response = await fetch(`${APP_ROOT}/api/question_info/${questionId}`);
                            if (response.ok) {
                                const fullQuestionData = await response.json();
                                // 合并数据，优先使用API返回的完整数据
                                questionData = { ...questionData, ...fullQuestionData };
                            }
                        } catch (error) {
                        }
                    }
                    
                    // 创建新的卡片
                    const cardElement = createQuestionCard(questionData, 'knowledge');
                    
                    const $questionDiv = $('<div class="col-12 mb-3"></div>');
                    $questionDiv.append(cardElement);
                    
                    // 在卡片左上角添加灰色小字圆圈序号
                    const sequenceNumber = i + 1; // 全局序号（不是分页内的序号）
                    const $sequenceLabel = $(`
                        <div class="sequence-number" style="
                            position: absolute;
                            top: 0.5vw;
                            left: 1.5vw;
                            background-color: rgb(187 187 187 / 80%);
                            color: white;
                            width: 1vw;
                            height: 1vw;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            font-size: 0.9vw;
                            font-weight: bold;
                            z-index: 10;
                        ">${sequenceNumber}</div>
                    `);
                    
                    // 确保卡片容器有相对定位
                    $questionDiv.css('position', 'relative');
                    $questionDiv.append($sequenceLabel);
                    
                    $questionsContainer.append($questionDiv);
                    
                    // 获取实际的卡片元素用于后续操作
                    const actualCardElement = $questionDiv.find('.question-card')[0];
                    
                    // 选择题选项功能已删除
                    // if (questionData.question_type === 1 && actualCardElement) {
                    //     setTimeout(() => {
                    //         showChoiceOptions(actualCardElement, questionData.question_id);
                    //     }, 100);
                    // }
                }
                
                // 为每个题目卡片加载用户表情状态
                setTimeout(async () => {
                    const showMyRecordsSwitch = document.getElementById('showMyRecordsSwitch');
                    if (showMyRecordsSwitch && showMyRecordsSwitch.checked) {
                        // 确保先加载用户记录再应用蒙版
                        await loadUserMoodRecords();
                        applyMoodOverlays();
                    }
                    
                    // 如果显示题号开关是开启的，添加题号
                    const showQuestionNumbersSwitch = document.getElementById('showQuestionNumbersSwitch');
                    if (showQuestionNumbersSwitch && showQuestionNumbersSwitch.checked) {
                        addQuestionNumbers();
                    }
                    
                    // 为每个题目卡片单独获取和更新用户表情状态
                    const questionCards = $questionsContainer.find('.question-card');
                    for (let i = 0; i < questionCards.length; i++) {
                        const cardElement = questionCards[i];
                        const questionId = $(cardElement).attr('data-question-id');
                        
                        if (questionId) {
                            try {
                                // 获取题目统计数据
                                const statsResponse = await fetch(`${APP_ROOT}/api/question_stats/${questionId}`);
                                if (statsResponse.ok) {
                                    const statsData = await statsResponse.json();
                                    
                                    // 检查用户登录状态
                                    const loginResponse = await fetch(APP_ROOT + '/api/check_login');
                                    let userSelection = null;
                                    
                                    if (loginResponse.ok) {
                                        const loginData = await loginResponse.json();
                                        if (loginData.logged_in) {
                                            // 获取用户对当前题目的表情选择状态
                                            const userResponse = await fetch(`${APP_ROOT}/api/user_selection/${questionId}`);
                                            
                                            if (userResponse.ok) {
                                                const userData = await userResponse.json();
                                                if (userData.success && userData.user_selection) {
                                                    userSelection = userData.user_selection;
                                                }
                                            }
                                        }
                                    }
                                    
                                    // 更新题目卡片UI
                                    updateQuestionCardUI(questionId, statsData, userSelection);
                                }
                            } catch (error) {
                            }
                        }
                    }
                }, 150);
            }
            
            // 渲染分页按钮的函数
            function renderPagination() {
                // 检查分页容器是否存在
                if (!$paginationContainer || totalPages <= 0) {
                    if ($paginationContainer) {
                        $paginationContainer.empty();
                    }
                    return;
                }
                
                $paginationContainer.empty();
                
                const $pagination = $('<nav aria-label="题目分页"><ul class="pagination pagination-sm mb-0"></ul></nav>');
                const $paginationList = $pagination.find('ul');
                
                // 上一页按钮
                const $prevBtn = $(`<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#">上一页</a></li>`);
                $prevBtn.click(function(e) {
                    e.preventDefault();
                    if (currentPage > 1) {
                        currentPage--;
                        renderQuestions(currentPage);
                        renderPagination();
                        // 滚动到顶部
                        $questionsContainer[0].scrollIntoView({ behavior: 'smooth' });
                    }
                });
                $paginationList.append($prevBtn);
                
                // 页码按钮
                let startPage = Math.max(1, currentPage - 2);
                let endPage = Math.min(totalPages, currentPage + 2);
                
                // 确保显示5个页码（如果总页数足够）
                if (endPage - startPage < 4) {
                    if (startPage === 1) {
                        endPage = Math.min(totalPages, startPage + 4);
                    } else {
                        startPage = Math.max(1, endPage - 4);
                    }
                }
                
                // 如果起始页不是1，显示第一页和省略号
                if (startPage > 1) {
                    const $firstPage = $('<li class="page-item"><a class="page-link" href="#">1</a></li>');
                    $firstPage.click(function(e) {
                        e.preventDefault();
                        currentPage = 1;
                        renderQuestions(currentPage);
                        renderPagination();
                        $questionsContainer[0].scrollIntoView({ behavior: 'smooth' });
                    });
                    $paginationList.append($firstPage);
                    
                    if (startPage > 2) {
                        $paginationList.append('<li class="page-item disabled"><span class="page-link">...</span></li>');
                    }
                }
                
                // 显示页码
                for (let i = startPage; i <= endPage; i++) {
                    const $pageBtn = $(`<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#">${i}</a></li>`);
                    $pageBtn.click(function(e) {
                        e.preventDefault();
                        currentPage = i;
                        renderQuestions(currentPage);
                        renderPagination();
                        $questionsContainer[0].scrollIntoView({ behavior: 'smooth' });
                    });
                    $paginationList.append($pageBtn);
                }
                
                // 如果结束页不是最后一页，显示省略号和最后一页
                if (endPage < totalPages) {
                    if (endPage < totalPages - 1) {
                        $paginationList.append('<li class="page-item disabled"><span class="page-link">...</span></li>');
                    }
                    
                    const $lastPage = $(`<li class="page-item"><a class="page-link" href="#">${totalPages}</a></li>`);
                    $lastPage.click(function(e) {
                        e.preventDefault();
                        currentPage = totalPages;
                        renderQuestions(currentPage);
                        renderPagination();
                        $questionsContainer[0].scrollIntoView({ behavior: 'smooth' });
                    });
                    $paginationList.append($lastPage);
                }
                
                // 下一页按钮
                const $nextBtn = $(`<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#">下一页</a></li>`);
                $nextBtn.click(function(e) {
                    e.preventDefault();
                    if (currentPage < totalPages) {
                        currentPage++;
                        renderQuestions(currentPage);
                        renderPagination();
                        $questionsContainer[0].scrollIntoView({ behavior: 'smooth' });
                    }
                });
                $paginationList.append($nextBtn);
                
                $paginationContainer.append($pagination);
                
                // 添加页面信息
                const $pageInfo = $(`<div class="text-muted small mt-2 text-center" style="margin-left:40px;">共 ${totalQuestions} 道题，第 ${currentPage} / ${totalPages} 页</div>`);
                $paginationContainer.append($pageInfo);
            }
            
            // 初始渲染
            renderQuestions(currentPage);
            renderPagination();
            
            // 从中心小框扩大的动画效果
            $modal.css({
                'display': 'flex',
                'opacity': '1'
            });
            $('body').css('overflow', 'hidden');
            
            const $modalContentElement = $modal.find('.question-modal-content');
            $modalContentElement.css({
                'transform': 'scale(0.1)',
                'transition': 'transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            });
            
            setTimeout(() => {
                $modalContentElement.css('transform', 'scale(1)');
            }, 50);
        }, 1000);
    }
    
    // 关闭题目模态框
    function closeQuestionModal() {
        const $modal = $('#questionModal');
        const $modalContent = $modal.find('.question-modal-content');
        
        $modal.css({
            'display': 'none',
            'opacity': '',
            'transition': ''
        });
        $modalContent.css({
            'transform': '',
            'transition': ''
        });
        $('body').css('overflow', 'auto');
        
        // 注释：不再清除选中状态，保持标签和题目高亮
        // currentSelectedKnowledgeId = null;
        // $('.question-item').removeClass('highlighted').each(function() {
        //     $(this).find('.question-overlay').hide();
        // });
        // $('.knowledge-header').removeClass('active');
        
        // 修复：关闭模态框时重置评论区状态变量
        if (currentQuestionId && isCommentSectionOpen) {
            currentQuestionId = null;
            isCommentSectionOpen = false;
            // 更新所有评论按钮状态
            updateAllCommentButtonStates();
        }
    }

// 显示收藏题目模态框
function showCollectionQuestionsModal(collectionType, collectionLabel, event) {
    // 使用requireLogin包装函数，确保用户登录后才能访问收藏题目
    requireLogin(async () => {
        const $modal = $('#questionModal');
        const $modalContent = $('#questionModalContent');
        
        // 设置modal标题
        $modal.find('.modal-title').text(collectionLabel + ' - 收藏题目');
        
        // 分页相关变量
        const questionsPerPage = 25;
        let currentPage = 1;
        let totalQuestions = 0;
        let totalPages = 0;
        
        // 创建模态框内容
        $modalContent.empty();
        
        // 创建题目容器
        const $questionsContainer = $('<div id="questionsContainer" class="row"></div>');
        $modalContent.append($questionsContainer);
        
        // 创建分页容器
        const $paginationContainer = $('<div class="pagination-container mt-3 d-flex justify-content-center"></div>');
        $modalContent.append($paginationContainer);
        
        // 创建加载提示
        const $loading = $('<div class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">加载中...</span></div><p class="mt-3">正在加载收藏题目...</p></div>');
        $questionsContainer.append($loading);
        
        // 获取当前试卷组ID
        const groupId = $('#papergroupSelect').val();
        
        // 从后端获取收藏题目数据
        try {
            const response = await fetch(`${APP_ROOT}/api/user_collection/${collectionType}?group_id=${groupId}`);
        if (response.ok) {
            const data = await response.json();
            
            if (data.success && data.questions && data.pagination) {
                const collectionQuestions = data.questions;
                totalQuestions = data.pagination.total;
                totalPages = data.pagination.pages;
                
                // 移除加载提示
                $loading.remove();
                
                // 渲染题目的函数
                async function renderQuestions(page) {
                    $questionsContainer.empty();
                    
                    // 显示加载提示
                    const $loading = $('<div class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">加载中...</span></div><p class="mt-3">正在加载第 ' + page + ' 页题目...</p></div>');
                    $questionsContainer.append($loading);
                    
                    try {
                        // 从后端获取指定页面的收藏题目数据
                        const response = await fetch(`${APP_ROOT}/api/user_collection/${collectionType}?group_id=${groupId}&page=${page}&per_page=${questionsPerPage}`);
                        if (response.ok) {
                            const data = await response.json();
                            
                            if (data.success && data.questions) {
                                const collectionQuestions = data.questions;
                                
                                // 移除加载提示
                                $loading.remove();
                                
                                for (let i = 0; i < collectionQuestions.length; i++) {
                                    const questionData = collectionQuestions[i];
                        
                                    // 创建新的卡片
                                    const cardElement = createQuestionCard(questionData, 'collection');
                        
                                    const $questionDiv = $('<div class="col-12 mb-3"></div>');
                                    $questionDiv.append(cardElement);
                        
                                    // 在卡片左上角添加灰色小字圆圈序号
                                    const sequenceNumber = i + 1; // 全局序号
                                    const $sequenceLabel = $(`
                                        <div class="sequence-number" style="
                                            position: absolute;
                                            top: 0.5vw;
                                            left: 1.5vw;
                                            background-color: rgb(187 187 187 / 80%);
                                            color: white;
                                            width: 1vw;
                                            height: 1vw;
                                            display: flex;
                                            align-items: center;
                                            justify-content: center;
                                            font-size: 0.9vw;
                                            font-weight: bold;
                                            z-index: 10;
                                        ">${sequenceNumber}</div>
                                    `);
                        
                                    // 确保卡片容器有相对定位
                                    $questionDiv.css('position', 'relative');
                                    $questionDiv.append($sequenceLabel);
                        
                                    $questionsContainer.append($questionDiv);
                                }
                        
                                // 为每个题目卡片加载用户表情状态
                                setTimeout(async () => {
                                    const questionCards = $questionsContainer.find('.question-card');
                                    for (let i = 0; i < questionCards.length; i++) {
                                        const cardElement = questionCards[i];
                                        const questionId = $(cardElement).attr('data-question-id');
                                        
                                        if (questionId) {
                                            try {
                                                // 获取题目统计数据
                                                const statsResponse = await fetch(`${APP_ROOT}/api/question_stats/${questionId}`);
                                                if (statsResponse.ok) {
                                                    const statsData = await statsResponse.json();
                                                    
                                                    // 检查用户登录状态
                                                    const loginResponse = await fetch(APP_ROOT + '/api/check_login');
                                                    let userSelection = null;
                                                    
                                                    if (loginResponse.ok) {
                                                        const loginData = await loginResponse.json();
                                                        if (loginData.logged_in) {
                                                            // 获取用户对当前题目的表情选择状态
                                                            const userResponse = await fetch(`${APP_ROOT}/api/user_selection/${questionId}`);
                                                            
                                                            if (userResponse.ok) {
                                                                const userData = await userResponse.json();
                                                                if (userData.success && userData.user_selection) {
                                                                    userSelection = userData.user_selection;
                                                                }
                                                            }
                                                        }
                                                    }
                                                    
                                                    // 更新题目卡片UI
                                                    updateQuestionCardUI(questionId, statsData, userSelection);
                                                }
                                            } catch (error) {
                                            }
                                        }
                                    }
                                }, 150);
                            } else {
                                // API调用失败
                                $loading.html('<div class="text-center py-5"><p class="text-danger">加载失败，请稍后重试</p></div>');
                            }
                        } else {
                            // API调用失败
                            $loading.html('<div class="text-center py-5"><p class="text-danger">加载失败，请稍后重试</p></div>');
                        }
                    } catch (error) {
                        console.error('Error fetching page questions:', error);
                        $loading.html('<div class="text-center py-5"><p class="text-danger">网络错误，请检查连接</p></div>');
                    }
                }
                
                // 渲染分页按钮的函数
                function renderPagination() {
                    if (totalPages <= 0) {
                        $paginationContainer.empty();
                        return;
                    }
                    
                    $paginationContainer.empty();
                    
                    const $pagination = $('<nav aria-label="题目分页"><ul class="pagination pagination-sm mb-0"></ul></nav>');
                    const $paginationList = $pagination.find('ul');
                    
                    // 上一页按钮
                    const $prevBtn = $(`<li class="page-item ${currentPage === 1 ? 'disabled' : ''}"><a class="page-link" href="#">上一页</a></li>`);
                    $prevBtn.click(function(e) {
                        e.preventDefault();
                        if (currentPage > 1) {
                            currentPage--;
                            renderQuestions(currentPage);
                            renderPagination();
                            $questionsContainer[0].scrollIntoView({ behavior: 'smooth' });
                        }
                    });
                    $paginationList.append($prevBtn);
                    
                    // 页码按钮
                    let startPage = Math.max(1, currentPage - 2);
                    let endPage = Math.min(totalPages, currentPage + 2);
                    
                    // 确保显示5个页码（如果总页数足够）
                    if (endPage - startPage < 4) {
                        if (startPage === 1) {
                            endPage = Math.min(totalPages, startPage + 4);
                        } else {
                            startPage = Math.max(1, endPage - 4);
                        }
                    }
                    
                    // 如果起始页不是1，显示第一页和省略号
                    if (startPage > 1) {
                        const $firstPage = $('<li class="page-item"><a class="page-link" href="#">1</a></li>');
                        $firstPage.click(function(e) {
                            e.preventDefault();
                            currentPage = 1;
                            renderQuestions(currentPage);
                            renderPagination();
                            $questionsContainer[0].scrollIntoView({ behavior: 'smooth' });
                        });
                        $paginationList.append($firstPage);
                        
                        if (startPage > 2) {
                            $paginationList.append('<li class="page-item disabled"><span class="page-link">...</span></li>');
                        }
                    }
                    
                    // 显示页码
                    for (let i = startPage; i <= endPage; i++) {
                        const $pageBtn = $(`<li class="page-item ${i === currentPage ? 'active' : ''}"><a class="page-link" href="#">${i}</a></li>`);
                        $pageBtn.click(function(e) {
                            e.preventDefault();
                            currentPage = i;
                            renderQuestions(currentPage);
                            renderPagination();
                            $questionsContainer[0].scrollIntoView({ behavior: 'smooth' });
                        });
                        $paginationList.append($pageBtn);
                    }
                    
                    // 如果结束页不是最后一页，显示省略号和最后一页
                    if (endPage < totalPages) {
                        if (endPage < totalPages - 1) {
                            $paginationList.append('<li class="page-item disabled"><span class="page-link">...</span></li>');
                        }
                        
                        const $lastPage = $(`<li class="page-item"><a class="page-link" href="#">${totalPages}</a></li>`);
                        $lastPage.click(function(e) {
                            e.preventDefault();
                            currentPage = totalPages;
                            renderQuestions(currentPage);
                            renderPagination();
                            $questionsContainer[0].scrollIntoView({ behavior: 'smooth' });
                        });
                        $paginationList.append($lastPage);
                    }
                    
                    // 下一页按钮
                    const $nextBtn = $(`<li class="page-item ${currentPage === totalPages ? 'disabled' : ''}"><a class="page-link" href="#">下一页</a></li>`);
                    $nextBtn.click(function(e) {
                        e.preventDefault();
                        if (currentPage < totalPages) {
                            currentPage++;
                            renderQuestions(currentPage);
                            renderPagination();
                            $questionsContainer[0].scrollIntoView({ behavior: 'smooth' });
                        }
                    });
                    $paginationList.append($nextBtn);
                    
                    $paginationContainer.append($pagination);
                    
                    // 添加页面信息
                    const $pageInfo = $(`<div class="text-muted small mt-2 text-center" style="margin-left:40px;">共 ${totalQuestions} 道题，第 ${currentPage} / ${totalPages} 页</div>`);
                    $paginationContainer.append($pageInfo);
                }
                
                // 初始渲染
                renderQuestions(currentPage);
                renderPagination();
                
            } else {
                // 没有收藏题目
                $loading.html('<div class="text-center py-5"><p class="text-muted">暂无收藏题目</p></div>');
                $paginationContainer.empty();
            }
        } else {
            // API调用失败
            $loading.html('<div class="text-center py-5"><p class="text-danger">加载失败，请稍后重试</p></div>');
            $paginationContainer.empty();
        }
    } catch (error) {
        console.error('Error fetching collection questions:', error);
        $loading.html('<div class="text-center py-5"><p class="text-danger">网络错误，请检查连接</p></div>');
        $paginationContainer.empty();
    }
    
        // 直接显示模态框
        $modal.css({
            'display': 'flex',
            'opacity': '1'
        });
        $('body').css('overflow', 'hidden');
    });
}

// 显示试卷模态框
async function showPaperModal(paperId, paperName) {
    const $paperColumn = $(`[data-paper-id="${paperId}"]`);
    if ($paperColumn.length === 0) return;
    
    const $modal = $('#paperModal');
    const $modalTitle = $('#paperModalTitle');
    const $modalBody = $('#paperModalBody');
    
    // 获取原始位置信息
    const rect = $paperColumn[0].getBoundingClientRect();
    
    // 创建动画容器
    const $animationContainer = $('<div class="paper-animation-container"></div>');
    $('body').append($animationContainer);
    
    // 克隆试卷列元素
    const $clonedColumn = $paperColumn.clone();
    $clonedColumn.css({
        'position': 'fixed',
        'left': rect.left + 'px',
        'top': rect.top + 'px',
        'width': rect.width + 'px',
        'height': rect.height + 'px',
        'z-index': '9999',
        'transition': 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'pointer-events': 'none'
    });
    
    $animationContainer.append($clonedColumn);
    
    // 隐藏原始元素
    $paperColumn.css('opacity', '0.3');
    
    // 设置body不可滚动
    $('body').css('overflow', 'hidden');
    
    // 计算页面中心位置（保持原始大小）
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const targetX = centerX - rect.width / 2;
    const targetY = centerY - rect.height / 2;
    
    // 第一阶段：移动到页面中心（不放大）
    setTimeout(() => {
        $clonedColumn.css({
            'left': targetX + 'px',
            'top': targetY + 'px'
        });
    }, 50);
    
    // 第二阶段：消失
    setTimeout(() => {
        $clonedColumn.css({
            'opacity': '0',
            'transform': 'scale(0.8)'
        });
    }, 600);
    
    // 第三阶段：显示模态框
    setTimeout(async () => {
        // 清理动画容器
        $animationContainer.remove();
        
        // 恢复原始元素透明度
        $paperColumn.css('opacity', '');
        
        // 设置模态框内容
        $modalTitle.text(paperName+'年真题');
        
        // 使用新的卡片模板显示试卷中的题目
        $modalBody.empty();
        const $questions = $paperColumn.find('.question-item');
        
        // 收集所有题目ID，批量获取完整数据
        const questionIds = [];
        $questions.each(function() {
            const $question = $(this);
            const questionId = $question.attr('data-question-id') || $question.attr('data-id');
            if (questionId) {
                questionIds.push(questionId);
            }
        });
        
        // 批量获取题目数据
        if (questionIds.length > 0) {
            try {
                const response = await fetch(`${APP_ROOT}/api/questions/batch`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ question_ids: questionIds })
                });
                        
                        if (response.ok) {
                            const responseData = await response.json();
                            const questionDataMap = {};
                            if (responseData.success && responseData.questions) {
                                responseData.questions.forEach(q => {
                                    questionDataMap[q.id] = q;
                                });
                            }
                            
                            // 使用完整数据创建卡片
                            $questions.each(function() {
                                const $question = $(this);
                                const questionId = $question.attr('data-question-id') || $question.attr('data-id');
                                const fullQuestionData = questionDataMap[questionId];
                                
                                if (fullQuestionData) {
                                    const cardElement = createQuestionCard(fullQuestionData, 'paper');
                                    const $questionDiv = $('<div class="col-12 mb-3"></div>');
                                    $questionDiv.append(cardElement);
                                    $modalBody.append($questionDiv);
                                } else {
                                    // 如果没有获取到完整数据，使用原有方式
                                    const $img = $question.find('img');
                                    const questionData = {
                                        image_url: $img.length ? $img.attr('src').replace('_thumb.png', '.png') : '',
                                        paper_name: paperName,
                                        question_number: $question.attr('data-question-number') || '?',
                                        question_id: questionId,
                                        question_type: parseInt($question.attr('data-question-type')) || 1,
                                        score: parseInt($question.attr('data-score')) || 0,
                                        year: $question.attr('data-year') || null,
                                        happy_count: parseInt($question.attr('data-happy-count')) || 0,
                                        maybe_count: parseInt($question.attr('data-maybe-count')) || 0,
                                        sad_count: parseInt($question.attr('data-sad-count')) || 0
                                    };
                                    
                                    const cardElement = createQuestionCard(questionData, 'paper');
                                    const $questionDiv = $('<div class="col-12 mb-3"></div>');
                                    $questionDiv.append(cardElement);
                                    $modalBody.append($questionDiv);
                                }
                            });
                        } else {
                            // 如果API调用失败，使用原有方式
                            $questions.each(function() {
                                const $question = $(this);
                                const $img = $question.find('img');
                                const questionData = {
                                    image_url: $img.length ? $img.attr('src').replace('_thumb.png', '.png') : '',
                                    paper_name: paperName,
                                    question_number: $question.attr('data-question-number') || '?',
                                    question_id: $question.attr('data-question-id') || $question.attr('data-id'),
                                    question_type: parseInt($question.attr('data-question-type')) || 1,
                                    score: parseInt($question.attr('data-score')) || 0,
                                    year: $question.attr('data-year') || null,
                                    happy_count: parseInt($question.attr('data-happy-count')) || 0,
                                    maybe_count: parseInt($question.attr('data-maybe-count')) || 0,
                                    sad_count: parseInt($question.attr('data-sad-count')) || 0
                                };
                                
                                const cardElement = createQuestionCard(questionData, 'paper');
                                const $questionDiv = $('<div class="col-12 mb-3"></div>');
                                $questionDiv.append(cardElement);
                                $modalBody.append($questionDiv);
                            });
                        }
                    } catch (error) {
                        console.error('Error fetching question data:', error);
                        // 如果出错，使用原有方式
                        $questions.each(function() {
                            const $question = $(this);
                            const $img = $question.find('img');
                            const questionData = {
                                image_url: $img.length ? $img.attr('src').replace('_thumb.png', '.png') : '',
                                paper_name: paperName,
                                question_number: $question.attr('data-question-number') || '?',
                                question_id: $question.attr('data-question-id') || $question.attr('data-id'),
                                question_type: parseInt($question.attr('data-question-type')) || 1,
                                score: parseInt($question.attr('data-score')) || 0,
                                year: $question.attr('data-year') || null
                            };
                            
                            const cardElement = createQuestionCard(questionData, 'paper');
                            const $questionDiv = $('<div class="col-12 mb-3"></div>');
                            $questionDiv.append(cardElement);
                            $modalBody.append($questionDiv);
                        });
                    }
                } else {
                    // 如果没有题目ID，使用原有方式
                    $questions.each(function() {
                        const $question = $(this);
                        const $img = $question.find('img');
                        const questionData = {
                            image_url: $img.length ? $img.attr('src').replace('_thumb.png', '.png') : '',
                            paper_name: paperName,
                            question_number: $question.attr('data-question-number') || '?',
                            question_id: $question.attr('data-question-id') || $question.attr('data-id'),
                            question_type: parseInt($question.attr('data-question-type')) || 1,
                            score: parseInt($question.attr('data-score')) || 0,
                            year: $question.attr('data-year') || null,
                            happy_count: parseInt($question.attr('data-happy-count')) || 0,
                            maybe_count: parseInt($question.attr('data-maybe-count')) || 0,
                            sad_count: parseInt($question.attr('data-sad-count')) || 0
                        };
                        
                        const cardElement = createQuestionCard(questionData, 'paper');
                        const $questionDiv = $('<div class="col-12 mb-3"></div>');
                        $questionDiv.append(cardElement);
                        $modalBody.append($questionDiv);
                    });
                }
                
                // 获取实际的卡片元素用于后续操作
                const actualCardElement = $modalBody.find('.question-card').last()[0];
                
                // 选择题选项功能已删除
                // if (questionData.question_type === 1 && actualCardElement) {
                //     setTimeout(() => {
                //         showChoiceOptions(actualCardElement, questionData.question_id);
                //     }, 100);
                // }
                
                // 为每个题目卡片加载用户表情状态
                setTimeout(async () => {
                    const showMyRecordsSwitch = document.getElementById('showMyRecordsSwitch');
                    if (showMyRecordsSwitch && showMyRecordsSwitch.checked) {
                        // 确保先加载用户记录再应用蒙版
                        await loadUserMoodRecords();
                        applyMoodOverlays();
                    }
                    
                    // 为每个题目卡片单独获取和更新用户表情状态
                    const questionCards = $modalBody.find('.question-card');
                    for (let i = 0; i < questionCards.length; i++) {
                        const cardElement = questionCards[i];
                        const questionId = $(cardElement).attr('data-question-id');
                        
                        if (questionId) {
                            try {
                                // 获取题目统计数据
                                const statsResponse = await fetch(`${APP_ROOT}/api/question_stats/${questionId}`);
                                if (statsResponse.ok) {
                                    const statsData = await statsResponse.json();
                                    
                                    // 检查用户登录状态
                                    const loginResponse = await fetch(APP_ROOT + '/api/check_login');
                                    let userSelection = null;
                                    
                                    if (loginResponse.ok) {
                                        const loginData = await loginResponse.json();
                                        if (loginData.logged_in) {
                                            // 获取用户对当前题目的表情选择状态
                                            const userResponse = await fetch(`${APP_ROOT}/api/user_selection/${questionId}`);
                                            
                                            if (userResponse.ok) {
                                                const userData = await userResponse.json();
                                                if (userData.success && userData.user_selection) {
                                                    userSelection = userData.user_selection;
                                                }
                                            }
                                        }
                                    }
                                    
                                    // 更新题目卡片UI
                                    updateQuestionCardUI(questionId, statsData, userSelection);
                                }
                            } catch (error) {
                                console.error(`Error loading mood state for question ${questionId}:`, error);
                            }
                        }
                    }
                }, 150);
            
            // 显示模态框 - 从中心小框扩大
            $modal.css({
                'display': 'flex',
                'opacity': '1'
            });
            
            const $modalContent = $modal.find('.paper-modal-content');
            $modalContent.css({
                'transform': 'scale(0.1)',
                'transition': 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)'
            });
            
            setTimeout(() => {
                $modalContent.css('transform', 'scale(1)');
            }, 50);
        }, 900);
    }
    
    // 关闭试卷模态框
    function closePaperModal() {
        const $modal = $('#paperModal');
        const $modalContent = $modal.find('.paper-modal-content');
        
        $modal.css({
            'display': 'none',
            'opacity': ''
        });
        $modalContent.css({
            'transform': '',
            'transition': ''
        });
        $('body').css('overflow', '');
        
        // 修复：关闭模态框时重置评论区状态变量
        if (currentQuestionId && isCommentSectionOpen) {
            currentQuestionId = null;
            isCommentSectionOpen = false;
            // 更新所有评论按钮状态
            updateAllCommentButtonStates();
        }
    }

    // 侧边栏折叠/展开功能
    function toggleSidebar() {
        const $sidebar = $('#sidebar');
        const $mainContent = $('#mainContent');
        const $expandBtn = $('#expandBtn');

        if ($sidebar.hasClass('collapsed')) {
            // 展开侧边栏
            $sidebar.removeClass('collapsed');
            $mainContent.removeClass('expanded');
            $expandBtn.hide();
        } else {
            // 折叠侧边栏
            $sidebar.addClass('collapsed');
            $mainContent.addClass('expanded');
            $expandBtn.show();
        }
    }


// 删除重复的函数定义，使用前面已定义的handleDifficultyVote函数

// 旧的handleComment函数已移除，使用下方完整的评论功能实现

function handleAnalysis(questionId) {
    
    // 检查登录状态
    requireLogin(() => loadAnalysisForQuestion(questionId));
}

// 为已登录用户加载解析内容
function loadAnalysisForQuestion(questionId) {
    // 在所有相关卡片中查找解析相关元素
    const questionCards = document.querySelectorAll(`[data-question-id="${questionId}"]`);
    let analysisBtn, analysisLabel, closedIcon, openIcon, analysisDisplay;
    
    // 在所有相关卡片中查找解析元素
    questionCards.forEach(card => {
        if (!analysisBtn) analysisBtn = card.querySelector('.analysis-btn');
        if (!analysisLabel) analysisLabel = card.querySelector('.analysis-label');
        if (!closedIcon) closedIcon = card.querySelector('.analysis-closed-icon');
        if (!openIcon) openIcon = card.querySelector('.analysis-open-icon');
        if (!analysisDisplay) analysisDisplay = card.querySelector('.analysis-display');
    });
    
    if (analysisDisplay && (analysisDisplay.style.display === 'none' || !analysisDisplay.style.display)) {
        // 显示解析
        // 更新UI
        if (analysisLabel) analysisLabel.textContent = '关闭解析';
        if (closedIcon) closedIcon.style.display = 'none';
        if (openIcon) openIcon.style.display = 'inline';
        if (analysisBtn) analysisBtn.classList.add('active');
        analysisDisplay.style.display = 'block';
        
        // 加载解析内容
        loadAnalysisContent(questionId, analysisDisplay);
    } else if (analysisDisplay) {
        // 收起解析
        if (analysisLabel) analysisLabel.textContent = '看解析';
        if (closedIcon) closedIcon.style.display = 'inline';
        if (openIcon) openIcon.style.display = 'none';
        if (analysisBtn) analysisBtn.classList.remove('active');
        analysisDisplay.style.display = 'none';
    }
}

// function handleVideo(button) {
//     requireLogin(() => {
//         // 这里添加观看视频的逻辑
//         // TODO: 播放视频
//     });
// }

// 选择题选项功能已删除
// showChoiceOptions函数已被移除

// 选择题选项功能已删除
// checkAndShowChoiceOptions函数已被移除

// 选择题选项功能已删除
// handleChoiceSelection函数已被移除

// Toast提示函数（如果还没有定义的话）
function showToast(message, type = 'info', duration = 3000) {
    // 创建toast元素
    const toast = document.createElement('div');
    toast.className = `toast-message toast-${type}`;
    toast.textContent = message;
    
    // 设置样式
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        border-radius: 6px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 300px;
        word-wrap: break-word;
    `;
    
    // 根据类型设置背景色
    switch(type) {
        case 'success':
            toast.style.backgroundColor = '#28a745';
            break;
        case 'error':
            toast.style.backgroundColor = '#dc3545';
            break;
        case 'warning':
            toast.style.backgroundColor = '#ffc107';
            toast.style.color = '#212529';
            break;
        default:
            toast.style.backgroundColor = '#17a2b8';
    }
    
    // 添加到页面
    document.body.appendChild(toast);
    
    // 动画显示
    setTimeout(() => {
        toast.style.transform = 'translateX(0)';
    }, 100);
    
    // 自动隐藏
    setTimeout(() => {
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, duration);
}

// ==================== 评论功能 ====================
let currentQuestionId = null;
let isCommentSectionOpen = false;

// 处理评论按钮点击
async function handleComment(questionId) {
    
    // 确保questionId是字符串类型
    const questionIdStr = String(questionId);
    
    // 检查是否正在处理同一个题目的点击（防止快速重复点击）
    if (window.lastCommentClick && 
        window.lastCommentClick.questionId === questionIdStr && 
        Date.now() - window.lastCommentClick.timestamp < 300) {
        return;
    }
    
    // 记录点击时间
    window.lastCommentClick = {
        questionId: questionIdStr,
        timestamp: Date.now()
    };
    
    
    // 检查登录状态 - 使用await确保异步操作完成
    await new Promise((resolve) => {
        requireLogin(() => {
            openCommentForQuestion(questionId);
            resolve();
        });
    });
    
}

// 为已登录用户打开评论功能
function openCommentForQuestion(questionId) {
    
    // 确保questionId是字符串类型
    const questionIdStr = String(questionId);
    
    const commentBtn = document.querySelector(`[data-question-id="${questionIdStr}"] .comment-btn`);
    
    if (!commentBtn) {
        return;
    }
    
    
    // 添加视觉反馈 - 按钮点击效果
    commentBtn.classList.add('clicking');
    setTimeout(() => {
        commentBtn.classList.remove('clicking');
    }, 150);
    
    if (currentQuestionId === questionIdStr && isCommentSectionOpen) {
        // 如果当前题目的评论区已经打开，则关闭
        closeCommentSection();
    } else {
        // 先关闭其他打开的评论区（如果有）
        if (currentQuestionId && currentQuestionId !== questionIdStr && isCommentSectionOpen) {
            closeCommentSection();
        }
        
        // 打开评论区
        openCommentSection(questionId);
    }
}

// 打开评论区
function openCommentSection(questionId) {
    
    // 确保questionId是字符串类型
    const questionIdStr = String(questionId);
    
    // 优先在试卷模态框中查找题目卡片
    let questionCard = null;
    const paperModal = document.getElementById('paperModal');
    if (paperModal && paperModal.style.display !== 'none') {
        // 试卷模态框已打开，在试卷模态框中查找
        questionCard = paperModal.querySelector(`[data-question-id="${questionIdStr}"]`);
    }
    
    // 如果试卷模态框中没找到，再在知识点模态框中查找
    if (!questionCard) {
        const modal = document.getElementById('questionModal');
        if (modal && modal.style.display !== 'none') {
            // 知识点模态框已打开，在知识点模态框中查找
            questionCard = modal.querySelector(`[data-question-id="${questionIdStr}"]`);
        }
    }
    
    // 如果模态框中都没找到，再在页面中查找
    if (!questionCard) {
        questionCard = document.querySelector(`[data-question-id="${questionIdStr}"]`);
    }
    
    if (!questionCard) {
        return;
    }
    
    // 找到该卡片内的评论区
    const commentSection = questionCard.querySelector('.comment-section');
    
    if (!commentSection) {
        return;
    }
    
    // 只有在确认可以成功打开评论区时才设置状态
    currentQuestionId = questionIdStr;
    isCommentSectionOpen = true;
    
    
    // 显示评论区
    commentSection.style.display = 'block';
    
    // 更新所有评论按钮状态
    updateAllCommentButtonStates();
    
    // 滚动到评论区
    commentSection.scrollIntoView({ behavior: 'smooth' });
    
    // 加载评论
    loadComments(questionId);
    
    // 重新初始化"只看自己"开关状态，确保状态正确同步
    initializeShowOnlyMyCommentsSwitch();
    
    // 清空输入框
    const commentInput = commentSection.querySelector('.comment-input');
    if (commentInput) {
        commentInput.value = '';
        updateCharCount(commentSection);
    }
    
}

// 关闭评论区
function closeCommentSection(buttonElement = null) {
    let questionIdToClose = currentQuestionId;
    
    // 如果传入了按钮元素，从按钮的父级元素获取 questionId
    if (buttonElement) {
        const questionCard = buttonElement.closest('[data-question-id]');
        if (questionCard) {
            questionIdToClose = questionCard.getAttribute('data-question-id');
        }
    }
    
    if (questionIdToClose) {
        // 优先在模态框中查找题目卡片
        let questionCard = null;
        
        // 检查知识点模式的模态框
        const questionModal = document.getElementById('questionModal');
        if (questionModal && questionModal.style.display !== 'none') {
            questionCard = questionModal.querySelector(`[data-question-id="${questionIdToClose}"]`);
        }
        
        // 检查试卷模式的模态框
        if (!questionCard) {
            const paperModal = document.getElementById('paperModal');
            if (paperModal && paperModal.style.display !== 'none') {
                questionCard = paperModal.querySelector(`[data-question-id="${questionIdToClose}"]`);
            }
        }
        
        // 如果模态框中都没找到，再在页面中查找
        if (!questionCard) {
            questionCard = document.querySelector(`[data-question-id="${questionIdToClose}"]`);
        }
        
        if (questionCard) {
            // 找到该卡片内的评论区
            const commentSection = questionCard.querySelector('.comment-section');
            if (commentSection) {
                commentSection.style.display = 'none';
            }
        }
    }
    
    currentQuestionId = null;
    isCommentSectionOpen = false;
    
    // 更新所有评论按钮状态
    updateAllCommentButtonStates();
}

// 更新所有评论按钮状态
function updateAllCommentButtonStates() {
    document.querySelectorAll('.comment-btn').forEach(btn => {
        const card = btn.closest('[data-question-id]');
        if (!card) return;
        
        // 检查该卡片的评论区是否真正显示
        const commentSection = card.querySelector('.comment-section');
        const isActive = commentSection && commentSection.style.display === 'block';
        
        updateCommentButtonState(btn, isActive);
    });
}

// 更新单个评论按钮状态
function updateCommentButtonState(commentBtn, isActive) {
    const closedIcon = commentBtn.querySelector('.comment-icon-closed');
    const openIcon = commentBtn.querySelector('.comment-icon-open');
    const label = commentBtn.querySelector('.comment-label');
    
    if (isActive) {
        closedIcon.style.display = 'none';
        openIcon.style.display = 'block';
        label.textContent = '收起评论';
        commentBtn.classList.add('active');
    } else {
        closedIcon.style.display = 'block';
        openIcon.style.display = 'none';
        label.textContent = '评论';
        commentBtn.classList.remove('active');
    }
}

// 加载评论
function loadComments(questionId) {
    fetch(`${APP_ROOT}/api/comments/${questionId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 检查"只看自己"开关状态 - 从本地存储读取
                const savedSelection = StorageManager.getUserSelection('show_only_my_comments');
                const shouldFilter = savedSelection === 'true' && window.currentStudent;
                let filteredComments = data.comments;
                
                if (shouldFilter) {
                    // 过滤出当前用户的评论
                    filteredComments = data.comments.filter(comment => 
                        comment.student_id === window.currentStudent.id
                    );
                }
                
                displayComments(filteredComments);
                updateCommentCount(questionId, data.total_count);
            } else {
                showToast('加载评论失败', 'error');
            }
        })
        .catch(error => {
            showToast('加载评论失败', 'error');
        });
}

// 初始化"只看自己"开关状态
function initializeShowOnlyMyCommentsSwitch() {
    // 查找当前可见的评论区中的开关（使用class选择器）
    const visibleCommentSections = document.querySelectorAll('.comment-section');
    let showOnlyMyComments = null;
    
    for (const section of visibleCommentSections) {
        if (section.offsetParent !== null) { // 检查元素是否可见
            showOnlyMyComments = section.querySelector('.show-only-my-comments');
            if (showOnlyMyComments) break;
        }
    }
    
    // 如果没找到可见的开关，尝试查找任何开关
    if (!showOnlyMyComments) {
        showOnlyMyComments = document.querySelector('.show-only-my-comments');
    }
    
    if (!showOnlyMyComments) return;
    
    // 从本地存储加载用户选择（带同步验证）
    const syncSwitchState = function() {
        const savedSelection = StorageManager.getUserSelection('show_only_my_comments');
        const currentChecked = showOnlyMyComments.checked;
        
        // 如果localStorage状态与UI状态不一致，以localStorage为准
        if (savedSelection === 'true' && !currentChecked) {
            showOnlyMyComments.checked = true;
        } else if (savedSelection === 'false' && currentChecked) {
            showOnlyMyComments.checked = false;
        } else if (savedSelection === null) {
            // 如果没有保存的状态，确保UI状态同步到localStorage
            StorageManager.saveUserSelection('show_only_my_comments', currentChecked.toString());
        }
    };
    
    // 初始同步
    syncSwitchState();
    
    // 添加change事件监听器（确保只绑定一次）
    if (!showOnlyMyComments.hasAttribute('data-change-bound')) {
        showOnlyMyComments.setAttribute('data-change-bound', 'true');
        showOnlyMyComments.addEventListener('change', function() {
            // 保存用户选择到本地存储
            StorageManager.saveUserSelection('show_only_my_comments', this.checked);
            
            // 添加状态变化视觉反馈
            const switchLabel = this.nextElementSibling;
            if (switchLabel && switchLabel.classList.contains('form-check-label')) {
                if (this.checked) {
                    switchLabel.classList.add('text-primary');
                    switchLabel.classList.remove('text-muted');
                } else {
                    switchLabel.classList.add('text-muted');
                    switchLabel.classList.remove('text-primary');
                }
            }
            
            // 添加短暂延迟确保localStorage写入完成
            setTimeout(() => {
                // 重新加载评论，让displayComments函数根据新的过滤状态显示内容
                if (currentQuestionId) {
                    loadComments(currentQuestionId);
                }
            }, 50);
        });
    }
    
    // 添加定期状态同步（每30秒检查一次状态一致性）
    setInterval(syncSwitchState, 30000);
}

// 显示评论列表
function displayComments(comments) {
    if (!currentQuestionId) return;
    
    // 优先在试卷模态框中查找题目卡片
    let questionCard = null;
    const paperModal = document.getElementById('paperModal');
    if (paperModal && paperModal.style.display !== 'none') {
        questionCard = paperModal.querySelector(`[data-question-id="${currentQuestionId}"]`);
    }
    
    // 如果试卷模态框中没找到，再在知识点模态框中查找
    if (!questionCard) {
        const modal = document.getElementById('questionModal');
        if (modal && modal.style.display !== 'none') {
            questionCard = modal.querySelector(`[data-question-id="${currentQuestionId}"]`);
        }
    }
    
    // 如果模态框中都没找到，再在页面中查找
    if (!questionCard) {
        questionCard = document.querySelector(`[data-question-id="${currentQuestionId}"]`);
    }
    
    if (!questionCard) return;
    
    // 找到该卡片内的评论区
    const commentSection = questionCard.querySelector('.comment-section');
    if (!commentSection) return;
    
    const commentList = commentSection.querySelector('.comment-list');
    
    if (!commentList) return;
    
    if (comments.length === 0) {
        commentList.innerHTML = '<div class="text-center text-muted py-3">暂无评论，快来发表第一条评论吧！</div>';
        return;
    }
    
    commentList.innerHTML = '';
    
    // 在加载评论之前，先检查"只看自己"开关的状态 - 从本地存储读取
    const savedSelection = StorageManager.getUserSelection('show_only_my_comments');
    const shouldFilter = savedSelection === 'true' && window.currentStudent;
    const currentUserId = window.currentStudent ? window.currentStudent.id : null;
    
    // 根据过滤状态决定显示哪些评论
    if (shouldFilter && currentUserId) {
        // 过滤模式：只显示当前用户的评论和相关的回复
        const userComments = [];
        const userReplies = [];
        const commentIdsWithUserReplies = new Set();
        
        // 首先收集用户自己的评论和回复
        comments.forEach(comment => {
            // 检查是否是用户自己的评论
            if (comment.student_id === currentUserId) {
                userComments.push(comment);
            }
            
            // 检查评论中的回复
            if (comment.replies && comment.replies.length > 0) {
                comment.replies.forEach(reply => {
                    // 检查是否是用户自己的回复
                    if (reply.student_id === currentUserId) {
                        userReplies.push(reply);
                        commentIdsWithUserReplies.add(comment.id);
                    }
                });
            }
        });
        
        // 显示用户自己的评论
        userComments.forEach(comment => {
            const commentElement = createCommentElement(comment);
            commentList.appendChild(commentElement);
            
            // 加载评论的点赞状态
            loadCommentLikeStatus(comment.id);
            
            // 加载回复的点赞状态
            if (comment.replies && comment.replies.length > 0) {
                comment.replies.forEach(reply => {
                    loadCommentLikeStatus(reply.id);
                });
            }
        });
        
        // 显示包含用户回复的评论（完整显示这些评论的所有内容）
        comments.forEach(comment => {
            if (commentIdsWithUserReplies.has(comment.id)) {
                const commentElement = createCommentElement(comment);
                commentList.appendChild(commentElement);
                
                // 加载评论的点赞状态
                loadCommentLikeStatus(comment.id);
                
                // 加载回复的点赞状态
                if (comment.replies && comment.replies.length > 0) {
                    comment.replies.forEach(reply => {
                        loadCommentLikeStatus(reply.id);
                    });
                }
            }
        });
        
        // 如果没有找到任何相关内容，显示提示
        if (userComments.length === 0 && userReplies.length === 0) {
            commentList.innerHTML = '<div class="text-center text-muted py-3">您还没有发表过评论或回复</div>';
        }
    } else {
        // 正常模式：显示所有评论
        comments.forEach(comment => {
            const commentElement = createCommentElement(comment);
            commentList.appendChild(commentElement);
            
            // 加载评论的点赞状态
            loadCommentLikeStatus(comment.id);
            
            // 加载回复的点赞状态
            if (comment.replies && comment.replies.length > 0) {
                comment.replies.forEach(reply => {
                    loadCommentLikeStatus(reply.id);
                });
            }
        });
    }
}

// 应用"只看自己"过滤
function applyShowOnlyMyCommentsFilter() {
    // 从本地存储读取用户选择
    const savedSelection = StorageManager.getUserSelection('show_only_my_comments');
    if (!window.currentStudent || savedSelection === null) return;
    
    // 查找当前活跃的评论区
    let commentList = null;
    
    // 首先检查是否有打开的评论区
    const activeCommentSections = document.querySelectorAll('.comment-section');
    for (const section of activeCommentSections) {
        if (section.offsetParent !== null) { // 检查元素是否可见
            commentList = section.querySelector('.comment-list');
            if (commentList) break;
        }
    }
    
    // 如果没找到可见的评论区，尝试查找任何评论区
    if (!commentList) {
        commentList = document.querySelector('.comment-list');
    }
    
    if (!commentList) return;
    
    // 获取所有评论和回复元素
    const commentItems = commentList.querySelectorAll('.comment-item');
    const replyItems = commentList.querySelectorAll('.reply-item');
    
    if (savedSelection === 'true') {
        // 过滤模式：只显示当前用户的评论和包含用户回复的评论
        const currentUserId = window.currentStudent.id;
        
        // 隐藏所有评论和回复
        commentItems.forEach(item => {
            item.style.display = 'none';
        });
        replyItems.forEach(item => {
            item.style.display = 'none';
        });
        
        // 首先收集包含用户回复的评论ID
        const commentIdsWithUserReplies = new Set();
        replyItems.forEach(item => {
            const authorId = item.getAttribute('data-author-id');
            if (authorId && parseInt(authorId) === currentUserId) {
                const commentId = item.getAttribute('data-comment-id');
                commentIdsWithUserReplies.add(commentId);
            }
        });
        
        // 显示当前用户的评论
        commentItems.forEach(item => {
            const authorId = item.getAttribute('data-author-id');
            if (authorId && parseInt(authorId) === currentUserId) {
                item.style.display = 'block';
                
                // 同时显示该评论的所有回复（无论回复者是谁）
                const commentId = item.getAttribute('data-comment-id');
                const replies = commentList.querySelectorAll(`.reply-item[data-comment-id="${commentId}"]`);
                replies.forEach(reply => {
                    reply.style.display = 'block';
                });
            }
        });
        
        // 显示包含用户回复的评论（完整显示这些评论的所有内容）
        commentItems.forEach(item => {
            const commentId = item.getAttribute('data-comment-id');
            if (commentIdsWithUserReplies.has(commentId)) {
                item.style.display = 'block';
                
                // 显示该评论的所有回复
                const replies = commentList.querySelectorAll(`.reply-item[data-comment-id="${commentId}"]`);
                replies.forEach(reply => {
                    reply.style.display = 'block';
                });
            }
        });
    } else {
        // 正常模式：显示所有评论和回复
        commentItems.forEach(item => {
            item.style.display = 'block';
        });
        replyItems.forEach(item => {
            item.style.display = 'block';
        });
    }
}

// 创建评论元素
function createCommentElement(comment) {
    const div = document.createElement('div');
    div.className = 'comment-item mb-3';
    div.setAttribute('data-comment-id', comment.id);
    div.setAttribute('data-author-id', comment.student_id);
    
    const timeAgo = getTimeAgo(comment.created_at);
    
    div.innerHTML = `
        <div class="d-flex gap-3">
            <div class="flex-shrink-0">
                <div class="avatar avatar-sm" id="comment-avatar-${comment.id}"></div>
            </div>
            <div class="flex-grow-1">
                <div class="d-flex justify-content-between align-items-start mb-1">
                    <div>
                        <strong class="comment-author">${comment.user_name}</strong>
                        <small class="text-muted ms-2">${timeAgo}</small>
                    </div>
                </div>
                <div class="comment-content mb-2">${escapeHtml(comment.content)}</div>
                <div class="comment-actions d-flex gap-3">
                    <button type="button" class="btn btn-sm btn-link text-muted p-0 like-btn" onclick="likeComment(${comment.id})" data-comment-id="${comment.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="heart-icon">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                        <span class="like-count">${comment.likes || 0}</span>
                    </button>
                    <button type="button" class="btn btn-sm btn-link text-muted p-0 reply-btn" onclick="showReplyInput(${comment.id}, '${comment.user_name}')">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6M3 10l6-6"/>
                        </svg>
                        回复
                    </button>
                    ${comment.can_delete ? `
                    <button type="button" class="btn btn-sm btn-link text-danger p-0 delete-comment-btn" onclick="deleteComment(${comment.id})" data-comment-id="${comment.id}" title="删除评论">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c0 1 1 2 2 2v2"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                        删除
                    </button>
                    ` : ''}
                </div>
                <div class="reply-input-container" style="display: none;"></div>
                <div class="replies-container mt-3">
                    ${comment.replies ? comment.replies.map(reply => createReplyElement(reply)).join('') : ''}
                </div>
            </div>
        </div>
    `;    
    
    // 设置评论者头像
        setTimeout(() => {
            const avatarElement = div.querySelector(`#comment-avatar-${comment.id}`);
            if (avatarElement) {
                displayAvatar(avatarElement, comment.avatar_url, comment.user_name, null);
            }
            
            // 设置回复者头像
            if (comment.replies) {
                comment.replies.forEach(reply => {
                    const replyAvatarElement = div.querySelector(`#reply-avatar-${reply.id}`);
                    if (replyAvatarElement) {
                        displayAvatar(replyAvatarElement, reply.avatar_url, reply.user_name, null);
                    }
                });
            }
        }, 0);
    
    return div;
}

// 创建回复元素
function createReplyElement(reply) {
    const timeAgo = getTimeAgo(reply.created_at);
    // 只有当reply_to_user存在且不为空时，才显示"回复@xx"（这表示是回复其他回复的二级回复）
    // 直接回复一级评论时不显示"回复@xx"
    const replyToText = (reply.reply_to_user && reply.reply_to_user.trim()) ? `回复 <strong>@${reply.reply_to_user}</strong>: ` : '';
    
    return `
        <div class="reply-item d-flex gap-2 mb-2" data-comment-id="${reply.parent_id}" data-author-id="${reply.student_id}">
            <div class="flex-shrink-0">
                <div class="avatar avatar-xs" id="reply-avatar-${reply.id}"></div>
            </div>
            <div class="flex-grow-1">
                <div class="d-flex justify-content-between align-items-start mb-1">
                    <div>
                        <strong class="reply-author">${reply.user_name}</strong>
                        <small class="text-muted ms-2">${timeAgo}</small>
                    </div>
                </div>
                <div class="reply-content mb-1">
                    ${replyToText}${escapeHtml(reply.content)}
                </div>
                <div class="reply-actions d-flex gap-2">
                    <button type="button" class="btn btn-sm btn-link text-muted p-0 like-btn" onclick="likeComment(${reply.id})" data-comment-id="${reply.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="heart-icon">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                        </svg>
                        <span class="like-count">${reply.likes || 0}</span>
                    </button>
                    <button type="button" class="btn btn-sm btn-link text-muted p-0 reply-btn" onclick="showReplyInput(${reply.id}, '${reply.user_name}', true, ${reply.parent_id})">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 10h10a8 8 0 0 1 8 8v2M3 10l6 6M3 10l6-6"/>
                        </svg>
                        回复
                    </button>
                    ${reply.can_delete ? `
                    <button type="button" class="btn btn-sm btn-link text-danger p-0 delete-comment-btn" onclick="deleteComment(${reply.id})" data-comment-id="${reply.id}" title="删除回复">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c0 1 1 2 2 2v2"/>
                            <line x1="10" y1="11" x2="10" y2="17"/>
                            <line x1="14" y1="11" x2="14" y2="17"/>
                        </svg>
                        删除
                    </button>
                    ` : ''}
                </div>
                <div class="reply-input-container" style="display: none;"></div>
            </div>
        </div>
    `;
}

// 提交评论
// 通过点击的按钮提交评论（新的推荐方式）
function submitCommentFromButton(buttonElement) {
    // 从点击的按钮向上查找到对应的题目卡片
    const questionCard = buttonElement.closest('[data-question-id]');
    if (!questionCard) {
        showToast('无法找到对应的题目', 'error');
        return;
    }
    
    const questionId = questionCard.getAttribute('data-question-id');
    if (!questionId) {
        showToast('题目ID不存在', 'error');
        return;
    }
    
    // 从题目卡片中查找评论区
    const commentSection = questionCard.querySelector('.comment-section');
    if (!commentSection) {
        showToast('评论区不存在', 'error');
        return;
    }
    
    // 检查评论区是否显示
    if (commentSection.style.display === 'none' || !commentSection.offsetParent) {
        showToast('评论区未显示', 'error');
        return;
    }
    
    // 获取输入框和按钮
    const commentInput = commentSection.querySelector('.comment-input');
    if (!commentInput) {
        showToast('评论输入框不存在', 'error');
        return;
    }
    
    const content = commentInput.value.trim();
    if (!content) {
        showToast('请输入评论内容', 'error');
        return;
    }
    
    // 注意：这里不应该更新currentQuestionId，它应该由openCommentSection函数设置
    
    // 提交评论
    submitCommentWithElements(commentInput, buttonElement, questionId, commentSection);
}

// 保留原有的submitComment函数作为兜底（用于其他可能的调用）
function submitComment() {
    if (!currentQuestionId) {
        showToast('请先选择题目', 'error');
        return;
    }
    
    // 直接查找当前显示的评论区（避免通过questionId查找可能导致的缓存问题）
    const visibleCommentSection = document.querySelector('.comment-section[style*="display: block"], .comment-section[style="display: block"]');
    if (!visibleCommentSection) {
        return;
    }
    
    // 验证这个评论区确实属于当前题目
    const parentQuestionCard = visibleCommentSection.closest('[data-question-id]');
    if (!parentQuestionCard) {
        return;
    }
    
    const actualQuestionId = parentQuestionCard.getAttribute('data-question-id');
    if (actualQuestionId !== currentQuestionId) {
        // 状态不一致，说明有错误，重置状态
        currentQuestionId = null;
        isCommentSectionOpen = false;
        console.warn('State inconsistency detected: actualQuestionId (', actualQuestionId, ') !== currentQuestionId (', currentQuestionId, '). Resetting state.');
        return;
    }
    
    const commentInput = visibleCommentSection.querySelector('.comment-input');
    const submitBtn = visibleCommentSection.querySelector('.submit-comment-btn');
    
    if (!commentInput || !submitBtn) {
        return;
    }
    
    const content = commentInput.value.trim();
    if (!content) {
        showToast('请输入评论内容', 'error');
        return;
    }
    
    submitCommentWithElements(commentInput, submitBtn, currentQuestionId, visibleCommentSection);
}

// 提取评论提交逻辑为独立函数
function submitCommentWithElements(commentInput, submitBtn, questionId, commentSection) {
    const content = commentInput.value.trim();
    
    submitBtn.disabled = true;
    submitBtn.textContent = '发表中...';
    
    fetch(`${APP_ROOT}/api/comments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            question_id: questionId,
            content: content
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            commentInput.value = '';
            updateCharCount(commentSection);
            loadComments(questionId);
        } else {
            showToast(data.message || '评论发表失败', 'error');
        }
    })
    .catch(error => {
        showToast('评论发表失败', 'error');
    })
    .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = '发表评论';
    });
}

// 显示回复输入框
function showReplyInput(parentId, replyToUser, isReplyToReply = false, actualParentId = null) {
    // 隐藏其他回复输入框
    document.querySelectorAll('.reply-input-container').forEach(container => {
        container.style.display = 'none';
        container.innerHTML = '';
    });
    
    const commentElement = document.querySelector(`[data-comment-id="${parentId}"]`);
    if (!commentElement) return;
    
    const replyContainer = commentElement.querySelector('.reply-input-container');
    replyContainer.style.display = 'block';
    
    // 根据是否是回复其他回复来显示不同的提示文本
    const replyText = isReplyToReply ? `回复 @${replyToUser}` : `回复评论`;
    
    // 如果是回复二级评论，使用actualParentId作为真正的parent_id
    const realParentId = actualParentId || parentId;
    
    replyContainer.innerHTML = `
        <div class="mt-2 p-2 border rounded">
            <div class="mb-2">
                <small class="text-muted">${replyText}</small>
            </div>
            <textarea class="form-control mb-2" rows="2" placeholder="写下你的回复..." maxlength="500" id="replyInput_${parentId}"></textarea>
            <div class="d-flex justify-content-between align-items-center">
                <small class="text-muted">还可以输入 <span class="reply-char-count">500</span> 个字符</small>
                <div class="btn-group">
                    <button type="button" class="btn btn-sm btn-outline-secondary" style="margin-right:10px;" onclick="hideReplyInput(${parentId})">取消</button>
                    <button type="button" class="btn btn-sm btn-primary" onclick="submitReply(${parentId}, '${replyToUser}', ${isReplyToReply}, ${realParentId})">回复</button>
                </div>
            </div>
        </div>
    `;
    
    // 绑定字符计数
    const replyInput = document.getElementById(`replyInput_${parentId}`);
    const charCountSpan = replyContainer.querySelector('.reply-char-count');
    replyInput.addEventListener('input', function() {
        const remaining = 500 - this.value.length;
        charCountSpan.textContent = remaining;
    });
    
    replyInput.focus();
}

// 隐藏回复输入框
function hideReplyInput(parentId) {
    const commentElement = document.querySelector(`[data-comment-id="${parentId}"]`);
    if (!commentElement) return;
    
    const replyContainer = commentElement.querySelector('.reply-input-container');
    replyContainer.style.display = 'none';
    replyContainer.innerHTML = '';
}

// 提交回复
function submitReply(parentId, replyToUser, isReplyToReply = false, actualParentId = null) {
    const replyInput = document.getElementById(`replyInput_${parentId}`);
    const content = replyInput.value.trim();
    
    if (!content) {
        showToast('请输入回复内容', 'error');
        return;
    }
    
    const submitBtn = replyInput.parentElement.querySelector('.btn-primary');
    submitBtn.disabled = true;
    submitBtn.textContent = '回复中...';
    
    // 使用actualParentId作为真正的parent_id（用于回复二级评论的情况）
    // 如果actualParentId存在，说明是回复二级评论，应该使用一级评论的ID
    // 如果actualParentId不存在，说明是回复一级评论，使用parentId
    const realParentId = actualParentId !== null ? actualParentId : parentId;
    
    
    // 构建请求数据，只有在回复其他回复时才设置reply_to_user
    const requestData = {
        question_id: currentQuestionId,
        content: content,
        parent_id: realParentId
    };
    
    
    // 只有当isReplyToReply为true时，才添加reply_to_user字段
    if (isReplyToReply) {
        requestData.reply_to_user = replyToUser;
    }
    
    fetch(`${APP_ROOT}/api/comments`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            hideReplyInput(parentId);
            loadComments(currentQuestionId);
        } else {
            showToast(data.message || '回复发表失败', 'error');
        }
    })
    .catch(error => {
        showToast('回复发表失败', 'error');
    })
    .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = '回复';
    });
}

// 加载评论点赞状态
function loadCommentLikeStatus(commentId) {
    fetch(`${APP_ROOT}/api/comments/${commentId}/like-status`)
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
            if (commentElement) {
                const heartIcon = commentElement.querySelector('.heart-icon');
                const likeBtnElement = commentElement.querySelector('.like-btn');
                
                if (heartIcon && likeBtnElement) {
                    if (data.is_liked) {
                        // 点赞状态：实心红色
                        heartIcon.setAttribute('fill', '#dc3545');
                        heartIcon.setAttribute('stroke', '#dc3545');
                        likeBtnElement.classList.remove('text-muted');
                        likeBtnElement.classList.add('text-danger');
                    } else {
                        // 未点赞状态：空心灰色
                        heartIcon.setAttribute('fill', 'none');
                        heartIcon.setAttribute('stroke', 'currentColor');
                        likeBtnElement.classList.remove('text-danger');
                        likeBtnElement.classList.add('text-muted');
                    }
                }
            }
        }
    })
    .catch(error => {
    });
}

// 点赞评论
function likeComment(commentId) {
    const likeBtn = document.querySelector(`[data-comment-id="${commentId}"] .like-btn`);
    if (!likeBtn) return;
    
    // 防止重复点击
    if (likeBtn.disabled) return;
    likeBtn.disabled = true;
    
    fetch(`${APP_ROOT}/api/comments/${commentId}/like`, {
        method: 'POST'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 更新点赞数
            const commentElement = document.querySelector(`[data-comment-id="${commentId}"]`);
            if (commentElement) {
                const likeCountSpan = commentElement.querySelector('.like-count');
                const heartIcon = commentElement.querySelector('.heart-icon');
                const likeBtnElement = commentElement.querySelector('.like-btn');
                
                if (likeCountSpan) {
                    likeCountSpan.textContent = data.likes;
                }
                
                // 更新心形图标状态
                if (heartIcon && likeBtnElement) {
                    if (data.is_liked) {
                        // 点赞状态：实心红色
                        heartIcon.setAttribute('fill', '#dc3545');
                        heartIcon.setAttribute('stroke', '#dc3545');
                        likeBtnElement.classList.remove('text-muted');
                        likeBtnElement.classList.add('text-danger');
                    } else {
                        // 未点赞状态：空心灰色
                        heartIcon.setAttribute('fill', 'none');
                        heartIcon.setAttribute('stroke', 'currentColor');
                        likeBtnElement.classList.remove('text-danger');
                        likeBtnElement.classList.add('text-muted');
                    }
                }
            }
            // 移除成功提示，只保留错误提示
        } else {
            showToast(data.message || '操作失败', 'error');
        }
    })
    .catch(error => {
        showToast('操作失败', 'error');
    })
    .finally(() => {
        likeBtn.disabled = false;
    });
}

// 更新评论数量显示
function updateCommentCount(questionId, count) {
    // 优先在模态框中查找题目卡片
    let questionCard = null;
    const modal = document.getElementById('questionModal');
    if (modal && modal.style.display !== 'none') {
        questionCard = modal.querySelector(`[data-question-id="${questionId}"]`);
    }
    
    // 如果模态框中没找到，再在页面中查找
    if (!questionCard) {
        questionCard = document.querySelector(`[data-question-id="${questionId}"]`);
    }
    
    if (!questionCard) return;
    
    // 更新评论按钮上的徽章
    const commentBtn = questionCard.querySelector('.comment-btn');
    if (commentBtn) {
        const countBadge = commentBtn.querySelector('.comment-count');
        if (countBadge) {
            countBadge.textContent = count;
            countBadge.style.display = count > 0 ? 'inline' : 'none';
        }
    }
    
    // 更新题目卡片上的评论数量显示
    const cardCommentCount = questionCard.querySelector('.comment-count:not(.comment-btn .comment-count)');
    if (cardCommentCount) {
        cardCommentCount.textContent = count;
        cardCommentCount.style.display = count > 0 ? 'inline' : 'none';
    }
}

// 更新字符计数
function updateCharCount(commentSection) {
    if (commentSection) {
        // 在指定的评论区内查找元素
        const input = commentSection.querySelector('.comment-input');
        const charCount = commentSection.querySelector('.char-count');
        if (input && charCount) {
            const current = input.value.length;
            charCount.textContent = `${current}/500`;
        }
    } else {
        // 兼容旧的全局查找方式
        const input = document.getElementById('commentInput');
        const charCount = document.getElementById('commentCharCount');
        if (input && charCount) {
            const remaining = 500 - input.value.length;
            charCount.textContent = remaining;
        }
    }
}

// 删除评论
function deleteComment(commentId) {
    if (!confirm('确定要删除这条评论吗？删除后无法恢复。')) {
        return;
    }
    
    const deleteBtn = document.querySelector(`[data-comment-id="${commentId}"] .delete-comment-btn`);
    if (deleteBtn) {
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 删除中...';
    }
    
    fetch(`${APP_ROOT}/api/comments/${commentId}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // 重新加载评论列表
            if (currentQuestionId) {
                loadComments(currentQuestionId);
            }
        } else {
            showToast(data.message || '删除评论失败', 'error');
            // 恢复按钮状态
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c0 1 1 2 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                    </svg>
                    删除
                `;
            }
        }
    })
    .catch(error => {
        showToast('网络错误，请稍后重试', 'error');
        // 恢复按钮状态
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c0 1 1 2 2 2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                </svg>
                删除
            `;
        }
    });
}

// 注意：评论区事件绑定现在在createQuestionCard函数中处理

// 工具函数
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getTimeAgo(dateString) {
    const now = new Date();
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) {
        return '刚刚';
    } else if (diffInSeconds < 3600) {
        return `${Math.floor(diffInSeconds / 60)}分钟前`;
    } else if (diffInSeconds < 86400) {
        return `${Math.floor(diffInSeconds / 3600)}小时前`;
    } else if (diffInSeconds < 2592000) {
        return `${Math.floor(diffInSeconds / 86400)}天前`;
    } else {
        return date.toLocaleDateString('zh-CN');
    }
}

// 用户答题记录相关功能
let userMoodRecords = {}; // 存储用户的情感投票记录

// 切换答题记录显示
function toggleMoodRecordsDisplay(isShow) {
    if (isShow) {
        // 检查登录状态（刷题记录需要登录验证，但不需要会员验证）
        // requireLogin(() => {
            // 获取用户记录并显示蒙版
            loadUserMoodRecords().then(() => {
                applyMoodOverlays();
                // // 检查是否有记录
                // if (Object.keys(userMoodRecords).length === 0) {
                //     // 没有记录，显示提示信息但保持开关打开状态
                //     showToast('你还没有记录任何刷题表情哦~', 'info', 3000);
                //     // 保持开关打开状态，允许用户查看（即使为空）
                // } else {
                //     // 有记录，显示蒙版
                //     applyMoodOverlays();
                // }
            });
        // }, false); // 第二个参数为false，表示不需要会员验证
    } else {
        // 隐藏蒙版
        removeMoodOverlays();
    }
}

// 加载用户答题记录
async function loadUserMoodRecords() {
    try {
        const response = await fetch(APP_ROOT + '/api/user_mood_records');
        const data = await response.json();
        
        if (data.success) {
            userMoodRecords = data.records;
        } else {
            userMoodRecords = {};
        }
    } catch (error) {
        userMoodRecords = {};
    }
}

// 应用情感蒙版
function applyMoodOverlays() {
    
    // 只检查页面上的题目项（小缩略图），不处理模态框中的大图
    const $allItems = $('.question-item');
    
    if ($allItems.length === 0) {
        return;
    }
    
    // 遍历所有题目项（小缩略图）
    $allItems.each(function(index) {
        const $item = $(this);
        const questionIdAttr = $item.attr('data-question-id') || $item.attr('data-id');
        const questionIdInt = parseInt(questionIdAttr);
        const questionIdStr = questionIdAttr; // 保持字符串格式
        
        
        // 尝试两种格式匹配：字符串和整数
        let moodType = userMoodRecords[questionIdStr] || userMoodRecords[questionIdInt];
        
        if (moodType) {
            addMoodOverlay($item, moodType);
        } else {
        }
    });
    
    // 注释：不再对模态框中的题目卡片（大图）应用蒙版
    // 大图应该保持原始状态，不显示情感颜色
}

// 移除情感蒙版
function removeMoodOverlays() {
    $('.mood-overlay').remove();
}

// 添加情感蒙版到题目卡片
function addMoodOverlay($card, moodType) {
    
    // 移除已存在的蒙版
    $card.find('.mood-overlay').remove();
    
    // 验证情感类型
    if (!['happy', 'maybe', 'sad'].includes(moodType)) {
        return;
    }
    
    // 创建蒙版元素，使用CSS类
    const $overlay = $(`<div class="mood-overlay ${moodType}"></div>`);
    
    // 添加蒙版
    $card.append($overlay);
}

// 题号显示功能
function toggleQuestionNumbersDisplay(isShow) {
    if (isShow) {
        $('body').addClass('show-question-numbers');
        addQuestionNumbers();
    } else {
        $('body').removeClass('show-question-numbers');
        removeQuestionNumbers();
    }
}

function addQuestionNumbers() {
    // 为所有题目卡片添加题号
    $('.question-item').each(function() {
        const $card = $(this);
        // 移除已存在的题号元素
        $card.find('.question-number').remove();
        
        // 从data-question-number属性获取题号
        const questionNumber = $card.attr('data-question-number') || '?';
        const $numberElement = $(`<div class="question-number">${questionNumber}</div>`);
        $card.append($numberElement);
    });
    
    // // 为模态框中的题目卡片添加题号
    // $('.question-card').each(function() {
    //     const $card = $(this);
    //     // 移除已存在的题号元素
    //     $card.find('.question-number').remove();
        
    //     // 从data-question-id获取题号（如果有的话）
    //     const questionId = $card.data('question-id');
    //     if (questionId) {
    //         // 在所有题目中找到当前题目的data-question-number
    //         const $matchingQuestion = $('.question-item').filter(function() {
    //             return $(this).data('question-id') == questionId;
    //         });
            
    //         if ($matchingQuestion.length > 0) {
    //             const questionNumber = $matchingQuestion.attr('data-question-number') || '?';
    //             const $numberElement = $(`<div class="question-number">${questionNumber}</div>`);
    //             $card.append($numberElement);
    //         }
    //     }
    // });
}

function removeQuestionNumbers() {
    $('.question-number').remove();
}

// 知识点统计图表相关函数
let knowledgeCharts = {
    scoreChart: null,
    masteryChart: null,
    progressChart: null  // 新增刷题进度统计图表
};

// 显示知识点统计图表
// 仅更新图表横坐标标签的高亮显示，不重新加载数据
function updateChartHighlight(clickedKnowledgeName = null) {
    if (!paperGroupChart) return;
    
    // 更新横坐标标签的颜色和字体样式
    paperGroupChart.options.scales.x.ticks.color = function(context) {
        const currentLabel = paperGroupChart.data.labels[context.index];
        if (clickedKnowledgeName && currentLabel === clickedKnowledgeName) {
            return '#007bff';  // 蓝色
        }
        return '#666';  // 默认颜色
    };
    
    paperGroupChart.options.scales.x.ticks.font = function(context) {
        const currentLabel = paperGroupChart.data.labels[context.index];
        if (clickedKnowledgeName && currentLabel === clickedKnowledgeName) {
            return {
                weight: 'bold',
                size: Math.round(12 * 1.2)  // 字体变大20%
            };
        }
        return {
            weight: 'normal',
            size: 12  // 默认字体大小
        };
    };
    
    // 重新渲染图表以应用样式更改
    paperGroupChart.update('none'); // 使用 'none' 模式进行快速更新，不播放动画
}

function showKnowledgeStats(knowledgeId, knowledgeName) {
    // 显示试卷组图表容器（现在用于知识点柱状图）
    const paperGroupChartContainer = document.getElementById('paperGroupChartContainer');
    if (paperGroupChartContainer) {
        paperGroupChartContainer.style.display = 'block';
    }
    
    // 隐藏知识点图表容器（饼图容器）
    const knowledgePointChartContainer = document.getElementById('knowledgePointChartContainer');
    if (knowledgePointChartContainer) {
        knowledgePointChartContainer.style.display = 'none';
    }
    
    // 使用 requestAnimationFrame 确保DOM更新完成后再计算高度
    requestAnimationFrame(() => {
        // 再次延迟确保显示/隐藏操作完全生效
        setTimeout(() => {
            // 计算并设置图表容器的动态高度
            calculateAndSetChartHeight();
            
            // 如果图表已存在，仅更新高亮显示，不重新加载数据
            if (paperGroupChart) {
                updateChartHighlight(knowledgeName);
            } else {
                // 如果图表不存在，则加载知识点统计数据（柱状图格式）
                loadKnowledgeStatsData(knowledgeId, knowledgeName);
            }
        }, 50);
    });
}

// 隐藏知识点统计图表
function hideKnowledgeStats() {
    const statsSection = document.getElementById('knowledgeStatsSection');
    statsSection.style.display = 'none';
    
    // 销毁现有图表
    destroyKnowledgeCharts();
}

// 加载知识点统计数据
async function loadKnowledgeStatsData(knowledgeId, knowledgeName = null) {
    try {
        // 获取当前试卷组ID
        const groupId = $('#papergroupSelect').val();
        if (!groupId) {
            showToast('请先选择试卷组', 'error');
            return;
        }
        
        // 始终获取试卷组下所有二级知识点的统计数据
        const response = await fetch(`${APP_ROOT}/api/papergroup_stats/${groupId}`);
        const result = await response.json();
        
        if (result.success) {
            // 获取被点击的知识点名称
            let clickedKnowledgeName;
            if (knowledgeName) {
                // 如果传递了knowledgeName参数，直接使用
                clickedKnowledgeName = knowledgeName;
            } else {
                // 否则使用getKnowledgePointName函数获取
                clickedKnowledgeName = getKnowledgePointName(knowledgeId);
            }
            
            // 使用柱状图格式显示知识点统计数据，并传递被点击的知识点名称
            await createKnowledgeBarChart(result.data, clickedKnowledgeName);
        } else {
            showToast(result.message || '加载统计数据失败', 'error');
        }
    } catch (error) {
        showToast('加载统计数据失败', 'error');
    }
}

// 创建知识点柱状图
async function createKnowledgeBarChart(data, clickedKnowledgeName = null) {
    // 销毁现有图表
    if (paperGroupChart) {
        paperGroupChart.destroy();
        paperGroupChart = null;
    }
    
    // 销毁知识点统计图表
    destroyKnowledgeCharts();
    
    const ctx = document.getElementById('paperGroupChart');
    if (!ctx) return;
    
    const labels = data.map(item => item.name);
    
    // 调试日志：输出被点击的知识点名称和图表标签进行对比

    const scores = data.map(item => item.total_score);
    const proficientScores = data.map(item => item.user_proficient_score || 0);
    const unfamiliarScores = data.map(item => item.user_unfamiliar_score || 0);
    const unknownScores = data.map(item => item.user_unknown_score || 0);
    
    // 构建数据集
    const datasets = [{
        label: '总分值',
        data: scores,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        yAxisID: 'y',
        stack: 'total_scores'  // 总分值使用独立的堆叠组
    }];
    
    // 如果有用户数据，添加用户刷题分数的堆叠柱状图
    const hasUserData = proficientScores.some(score => score > 0) || 
                       unfamiliarScores.some(score => score > 0) || 
                       unknownScores.some(score => score > 0);
    
    if (hasUserData) {
        // 调整数据集顺序为：熟练、不熟、不会
        datasets.push({
            label: '熟练',
            data: proficientScores,
            backgroundColor: '#28a745',  // 绿色
            borderColor: '#28a745',
            borderWidth: 1,
            yAxisID: 'y',
            stack: 'user_scores'
        });
        
        datasets.push({
            label: '不熟',
            data: unfamiliarScores,
            backgroundColor: '#ffc107',  // 橙色
            borderColor: '#ffc107',
            borderWidth: 1,
            yAxisID: 'y',
            stack: 'user_scores'
        });
        
        datasets.push({
            label: '不会',
            data: unknownScores,
            backgroundColor: '#dc3545',  // 红色
            borderColor: '#dc3545',
            borderWidth: 1,
            yAxisID: 'y',
            stack: 'user_scores'
        });
    }
    
    paperGroupChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: false  // 禁用Chart.js内置标题，改用自定义HTML标题
                },
                legend: {
                    display: false  // 禁用Chart.js内置图例，改用自定义HTML图例
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: false
                    },
                    ticks: {
                        color: function(context) {
                            // 获取当前标签的值
                            const currentLabel = labels[context.index];
                            
                            // 如果有被点击的知识点名称，将其设置为蓝色
                            if (clickedKnowledgeName && currentLabel === clickedKnowledgeName) {
                                return '#007bff';  // 蓝色
                            }
                            return '#666';  // 默认颜色
                        },
                        font: function(context) {
                            // 计算基于屏幕宽度的字体大小：1vw，最多15px
                            const vwFontSize = window.innerWidth * 0.01; // 1vw
                            const fontSize = Math.min(vwFontSize, 15); // 最多15px
                            
                            // 获取当前标签的值
                            const currentLabel = labels[context.index];
                            
                            // 如果有被点击的知识点名称，设置加粗和字体变大20%
                            if (clickedKnowledgeName && currentLabel === clickedKnowledgeName) {
                                return {
                                    weight: 'bold',
                                    size: Math.round(fontSize * 1.2)  // 字体变大20%
                                };
                            }
                            return {
                                weight: 'normal',
                                size: fontSize  // 使用计算出的响应式字体大小
                            };
                        }
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '分数'
                    },
                    beginAtZero: true
                }
            }
        }
    });
    
    // 更新自定义标题和图例
    await updateCustomTitleAndLegend(hasUserData, datasets);
}

// 更新自定义标题和图例
async function updateCustomTitleAndLegend(hasUserData, datasets) {
    const titleElement = document.getElementById('chartTitle');
    const legendContainer = document.getElementById('chartLegendContainer');
    const refreshBtn = document.getElementById('refreshChartBtn');
    
    if (titleElement) {
        // 检查用户登录状态
        let isLoggedIn = false;
        try {
            const response = await fetch(APP_ROOT + '/api/check_login');
            if (response.ok) {
                const data = await response.json();
                isLoggedIn = data.logged_in;
            }
        } catch (error) {
            console.error('检查登录状态失败:', error);
        }
        
        // 根据登录状态和数据状态设置标题
        if (isLoggedIn) {
            if (hasUserData) {
                // 计算用户总刷题分数占试卷组总分的百分比
                let titleText = '我的刷题进度';
                try {
                    const groupId = $('#papergroupSelect').val();
                    if (groupId) {
                        const statsResponse = await fetch(`${APP_ROOT}/api/papergroup_stats/${groupId}`);
                        if (statsResponse.ok) {
                            const statsData = await statsResponse.json();
                            if (statsData.success && statsData.data) {
                                const totalGroupScore = statsData.data.total_score || 0;
                                
                                // 计算用户总刷题分数（熟练+不熟+不会）
                                let userTotalScore = 0;
                                if (statsData.data.knowledge_point_stats) {
                                    statsData.data.knowledge_point_stats.forEach(kp => {
                                        userTotalScore += (kp.user_proficient_score || 0) + 
                                                        (kp.user_unfamiliar_score || 0) + 
                                                        (kp.user_unknown_score || 0);
                                    });
                                }
                                
                                // 计算百分比
                                if (totalGroupScore > 0 && userTotalScore > 0) {
                                    const percentage = ((userTotalScore / totalGroupScore) * 100).toFixed(1);
                                    titleText = `我的刷题进度 (${percentage}%)`;
                                }
                            }
                        }
                    }
                } catch (error) {
                    console.error('获取刷题进度百分比失败:', error);
                }
                titleElement.textContent = titleText;
            } else {
                titleElement.textContent = '你还没开始刷题哦，刷完每道题记得点击表情记录~';
            }
            // 显示刷新按钮（仅当用户已登录时）
            if (refreshBtn) {
                refreshBtn.style.display = 'inline-block';
            }
        } else {
            titleElement.textContent = '各考点历年总分值';
            // 隐藏刷新按钮（用户未登录时）
            if (refreshBtn) {
                refreshBtn.style.display = 'none';
            }
        }
    }
    
    if (legendContainer) {
        // 清空现有图例
        legendContainer.innerHTML = '';
        
        // 生成按钮图例项
        const buttonConfigs = [
            { label: '熟练题', color: '#28a745', type: 'proficient' },
            { label: '不熟题→', color: '#ffc107', type: 'unfamiliar' },
            { label: '错题本→', color: '#dc3545', type: 'unknown' }
        ];
        
        buttonConfigs.forEach(config => {
            const buttonItem = document.createElement('div');
            buttonItem.style.cssText = 'display: flex; align-items: center; gap: 5px; font-size: 14px; margin: 5px 0;';
            
            const colorBox = document.createElement('div');
            colorBox.style.cssText = `width: 12px; height: 12px; background-color: ${config.color}; border-radius: 2px;`;
            
            const button = document.createElement('button');
            button.textContent = config.label;
            button.style.cssText = 'background: none; border: none; color: #666; cursor: pointer; padding: 2px 5px; font-size: 14px;';
            button.onclick = function(event) {
                showCollectionQuestionsModal(config.type, config.label, event);
            };
            
            buttonItem.appendChild(colorBox);
            buttonItem.appendChild(button);
            legendContainer.appendChild(buttonItem);
        });
    }
}


// 创建分数占比饼图
function createScoreChart(scoreStats) {
    const ctx = document.getElementById('scoreChart');
    if (!ctx) return;

    // 销毁已存在的图表
    if (knowledgeCharts.scoreChart) {
        knowledgeCharts.scoreChart.destroy();
    }
    
    // 确保数据类型正确
    const currentScore = parseFloat(scoreStats.current_score);
    const totalScore = parseFloat(scoreStats.total_score);
    const percentage = parseFloat(scoreStats.percentage);
    
    const otherScore = totalScore - currentScore;
    const otherPercentage = 100 - percentage;
    
    // 更新底部描述文字显示比例
    const descriptionElement = document.querySelector('#scoreChart').closest('.chart-container').querySelector('.chart-description');
    if (descriptionElement) {
        descriptionElement.textContent = `当前知识点 ${percentage.toFixed(1)}%，其他知识点 ${otherPercentage.toFixed(1)}%`;
    }
    
    knowledgeCharts.scoreChart = new Chart(ctx, {
        type: 'pie',
        plugins: [ChartDataLabels],  // 注册 datalabels 插件
        data: {
            labels: ['其他', '当前'],
            datasets: [{
                data: [otherPercentage, percentage],
                backgroundColor: [
                    '#e9ecef',
                    '#28a745'
                ],
                borderColor: '#fff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    top: 20,
                    bottom: 20,
                    left: 20,
                    right: 20
                }
            },
            plugins: {
                legend: {
                    display: false  // 取消图例显示
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label;
                            const value = context.parsed;
                            const score = label === '当前知识点' ? currentScore : otherScore;
                            return `${label}: ${score}分 (${value.toFixed(1)}%)`;
                        }
                    }
                },
                datalabels: {
                    display: true,  // 启用饼图上的数据标签显示
                    color: '#000',
                    font: {
                        size: 12,
                        weight: 'bold'
                    },
                    formatter: function(value, context) {
                        const label = context.chart.data.labels[context.dataIndex];
                        // 只显示"当前"的百分比，"其他"的百分比不显示
                        if (label === '当前') {
                            return `${value.toFixed(1)}%`;
                        } else {
                            return '';  // "其他"不显示百分比
                        }
                    },
                    textAlign: 'center'
                }
            }
        }
    });
}

// 创建题型分值统计图表
// 创建刷题进度饼图
function createProgressChart(progressData) {
    
    const canvas = document.getElementById('progressChart');
    
    if (!canvas) {
        return;
    }
    
    const ctx = canvas.getContext('2d');
    
    // 销毁现有图表
    if (knowledgeCharts.progressChart) {
        knowledgeCharts.progressChart.destroy();
    }
    
    // 检查数据是否有效
    if (!progressData || !progressData.success) {
        // 显示无数据提示
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('暂无刷题进度数据', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // 准备图表数据
    const chartData = [];
    const chartLabels = [];
    const chartColors = [];
    
    // 定义状态映射和颜色 - 调整顺序为：熟练、不熟、不会、未做
    const statusConfig = [
        { key: 'proficient_score', label: '熟练', color: '#4CAF50' },
        { key: 'unfamiliar_score', label: '不熟', color: '#FF9800' },
        { key: 'unknown_score', label: '不会', color: '#F44336' },
        { key: 'undone_score', label: '未做', color: '#9E9E9E' }
    ];
    
    // 添加有数据的状态到图表
    statusConfig.forEach(status => {
        const score = progressData[status.key] || 0;
        if (score > 0) {
            chartData.push(score);
            chartLabels.push(status.label);
            chartColors.push(status.color);
        }
    });
    
    // 检查是否有刷题数据（排除未做）
    const hasProgressData = progressData.proficient_score > 0 || 
                           progressData.unfamiliar_score > 0 || 
                           progressData.unknown_score > 0;
    
    // 如果没有任何数据，显示提示
    if (chartData.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px Arial';
        ctx.fillStyle = '#666';
        ctx.textAlign = 'center';
        ctx.fillText('暂无刷题进度数据', canvas.width / 2, canvas.height / 2);
        return;
    }
    
    // 计算用户总刷题分数占试卷组总分的百分比
    let titleText = hasProgressData ? '我的刷题进度' : '你还没开始刷题哦，刷完每道题记得点击表情记录~';
    if (hasProgressData) {
        try {
            const groupId = $('#papergroupSelect').val();
            if (groupId) {
                // 使用异步方式获取试卷组统计数据
                fetch(`${APP_ROOT}/api/papergroup_stats/${groupId}`)
                    .then(response => response.json())
                    .then(statsData => {
                        if (statsData.success && statsData.data) {
                            const totalGroupScore = statsData.data.total_score || 0;
                            
                            // 计算用户总刷题分数（熟练+不熟+不会）
                            const userTotalScore = (progressData.proficient_score || 0) + 
                                                 (progressData.unfamiliar_score || 0) + 
                                                 (progressData.unknown_score || 0);
                            
                            // 计算百分比
                            if (totalGroupScore > 0 && userTotalScore > 0) {
                                const percentage = ((userTotalScore / totalGroupScore) * 100).toFixed(1);
                                const newTitleText = `我的刷题进度 (${percentage}%)`;
                                
                                // 更新图表标题
                                if (knowledgeCharts.progressChart && knowledgeCharts.progressChart.options.plugins.title) {
                                    knowledgeCharts.progressChart.options.plugins.title.text = newTitleText;
                                    knowledgeCharts.progressChart.update();
                                }
                            }
                        }
                    })
                    .catch(error => {
                        console.error('获取刷题进度百分比失败:', error);
                    });
            }
        } catch (error) {
            console.error('获取刷题进度百分比失败:', error);
        }
    }
    
    // 创建饼图
    knowledgeCharts.progressChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: chartLabels,
            datasets: [{
                data: chartData,
                backgroundColor: chartColors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: titleText,
                    font: {
                        size: 16,
                        weight: 'bold'
                    },
                    padding: {
                        top: 10,
                        bottom: 20
                    }
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 20,
                        usePointStyle: true,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed;
                            const percentage = ((value / progressData.total_score) * 100).toFixed(1);
                            return `${label}: ${value}分 (${percentage}%)`;
                        }
                    }
                },
                datalabels: {
                    display: true,
                    formatter: function(value, context) {
                        const percentage = ((value / progressData.total_score) * 100).toFixed(1);
                        return `${percentage}%`;
                    },
                    color: '#fff',
                    font: {
                        weight: 'bold',
                        size: 12
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}


// 创建掌握情况饼图
function createMasteryChart(masteryStats) {
    // 检查Chart.js是否可用
    if (typeof Chart === 'undefined') {
        showToast('图表库未加载，请刷新页面重试', 'error');
        return;
    }
    
    // 检查masteryChart元素是否存在（可能已被注释掉）
    const masteryChartElement = document.getElementById('masteryChart');
    if (!masteryChartElement) {
        return;
    }
    
    const ctx = masteryChartElement.getContext('2d');
    
    const hasData = masteryStats.total_marked > 0;
    
    if (!hasData) {
        // 更新底部描述文字
        const descriptionElement = document.querySelector('#masteryChart').closest('.chart-container').querySelector('.chart-description');
        if (descriptionElement) {
            descriptionElement.textContent = '暂无收藏';
        }
        
        // 显示无数据状态
        knowledgeCharts.masteryChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['暂无收藏'],
                datasets: [{
                    data: [100],
                    backgroundColor: ['#f8f9fa'],
                    borderWidth: 2,
                    borderColor: '#dee2e6'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        cornerRadius: 6,
                        displayColors: false,
                        displayTitle: false,
                        padding: 12,
                        bodyFont: {
                            size: 12
                        },
                        titleFont: {
                            size: 13
                        },
                        callbacks: {
                            label: function() {
                                return '请先标记题目掌握情况';
                            }
                        }
                    }
                }
            }
        });
    } else {
        // 更新底部描述文字显示投票人数
        const descriptionElement = document.querySelector('#masteryChart').closest('.chart-container').querySelector('.chart-description');
        if (descriptionElement) {
            const knowCount = masteryStats.counts['熟练'];
            const unknownCount = masteryStats.counts['不会'];
            const barelyCount = masteryStats.counts['不熟'];
            descriptionElement.textContent = `熟练 ${knowCount}票，不会 ${unknownCount}票，不熟 ${barelyCount}票`;
        }
        
        knowledgeCharts.masteryChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['熟练', '不会', '不熟'],
                datasets: [{
                    data: [
                        masteryStats.percentages['熟练'],
                        masteryStats.percentages['不会'],
                        masteryStats.percentages['不熟']
                    ],
                    backgroundColor: [
                        '#28a745',
                        '#dc3545',
                        '#ffc107'
                    ],
                    borderWidth: 2,
                    borderColor: '#ffffff'
                }]
            },
            plugins: [ChartDataLabels],
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        cornerRadius: 6,
                        displayColors: false,
                        displayTitle: false,
                        padding: 12,
                        bodyFont: {
                            size: 12
                        },
                        titleFont: {
                            size: 13
                        },
                        callbacks: {
                            label: function(context) {
                                const label = context.label;
                                const value = context.parsed;
                                const count = masteryStats.counts[label];
                                return `${count}票 (${value.toFixed(1)}%)`;
                            }
                        }
                    },
                    datalabels: {
                        display: true,
                        color: '#fff',
                        font: {
                            size: 14,
                            weight: 'bold'
                        },
                        formatter: function(value, context) {
                            return context.chart.data.labels[context.dataIndex];
                        },
                        anchor: 'center',
                        align: 'center'
                    }
                }
            }
        });
    }
}


// 销毁知识点图表
function destroyKnowledgeCharts() {
    Object.values(knowledgeCharts).forEach(chart => {
        if (chart) {
            chart.destroy();
        }
    });
    
    knowledgeCharts = {
        scoreChart: null,
        masteryChart: null,
        progressChart: null
    };
}

// 显示题目专题Modal（直接调用原有函数）
function showTopicModal() {
    if (!currentSelectedKnowledgeId) {
        showToast('请先选择一个知识点', 'warning');
        return;
    }
    
    // 直接调用原有的showQuestionModal函数
    showQuestionModal(currentSelectedKnowledgeId);
}

// ==================== 统计功能相关 ====================

// 处理统计按钮点击
function handleStats(questionId, cardElement) {
    // 统计功能已删除（原计时器功能相关）
    showToast('统计功能暂不可用', 'info');
}

// 为已登录用户加载统计内容
function loadStatsForQuestion(questionId, cardElement) {
    
    // 在所有相关卡片中查找统计相关元素
    const questionCards = document.querySelectorAll(`[data-question-id="${questionId}"]`);
    let statsBtn, statsLabel, chartIcon, chartOffIcon, statsPanel;
    
    questionCards.forEach(card => {
        if (!statsBtn) statsBtn = card.querySelector('.stats-btn');
        if (!statsLabel) statsLabel = card.querySelector('.stats-label');
        if (!chartIcon) chartIcon = card.querySelector('.stats-icon-show');
        if (!chartOffIcon) chartOffIcon = card.querySelector('.stats-icon-hide');
        if (!statsPanel) statsPanel = card.querySelector('.stats-panel');
    });
    
    if (statsPanel && (statsPanel.style.display === 'none' || !statsPanel.style.display)) {
        // 显示统计面板
        
        // 更新UI
        if (chartIcon) chartIcon.style.display = 'none';
        if (chartOffIcon) chartOffIcon.style.display = 'inline';
        if (statsLabel) statsLabel.textContent = '收起统计';
        
        // 显示统计面板
        statsPanel.style.display = 'block';
        
        // 加载统计数据
        loadStatsData(questionId);
        
    } else {
        // 隐藏统计面板
        if (chartIcon) chartIcon.style.display = 'inline';
        if (chartOffIcon) chartOffIcon.style.display = 'none';
        if (statsLabel) statsLabel.textContent = '查看统计';
        
        // 隐藏统计面板
        if (statsPanel) statsPanel.style.display = 'none';
        
        // 隐藏用户时间徽章
        hideUserTimeBadge(questionId);
        
        // 销毁图表实例
        destroyStatsChart(questionId);
    }
}

// 存储统计图表实例
let statsCharts = {};

// 初始化刷题记录开关状态（延迟0.3秒后检测）


// 初始化显示题号开关状态
function initializeQuestionNumbersSwitch() {
    setTimeout(() => {
        // 从本地存储恢复显示题号开关状态
        const savedShowQuestionNumbers = StorageManager.getUserSelection('show_question_numbers');
        const showQuestionNumbersSwitch = document.getElementById('showQuestionNumbersSwitch');
        
        if (showQuestionNumbersSwitch && savedShowQuestionNumbers !== null) {
            // 恢复保存的状态
            showQuestionNumbersSwitch.checked = savedShowQuestionNumbers === 'true';
            // 触发状态变化以应用显示效果
            toggleQuestionNumbersDisplay(savedShowQuestionNumbers === 'true');
        }
    }, 300); // 延迟300毫秒（0.3秒）
}

// 试卷组统计相关函数
let paperGroupChart = null;

function showPaperGroupStats(groupId) {
    // 显示试卷组图表容器
    const paperGroupChartContainer = document.getElementById('paperGroupChartContainer');
    if (paperGroupChartContainer) {
        paperGroupChartContainer.style.display = 'block';
    }
    
    // 隐藏知识点图表容器
    const knowledgePointChartContainer = document.getElementById('knowledgePointChartContainer');
    if (knowledgePointChartContainer) {
        knowledgePointChartContainer.style.display = 'none';
    }
    
    // 使用 requestAnimationFrame 确保DOM更新完成后再计算高度
    requestAnimationFrame(() => {
        // 再次延迟确保显示/隐藏操作完全生效
        setTimeout(() => {
            // 计算并设置图表容器的动态高度
            calculateAndSetChartHeight();
            
            // 加载试卷组统计数据
            loadPaperGroupStatsData(groupId);
        }, 50);
    });
}

// 计算并设置图表容器的动态高度
function calculateAndSetChartHeight() {
    // 使用 requestAnimationFrame 确保DOM完全渲染后再计算
    requestAnimationFrame(() => {
        // 再次延迟确保所有元素都已完全加载和渲染
        setTimeout(() => {
            const paperListContainer = document.getElementById('paperListContainer');
            const chartContainer = document.querySelector('#paperGroupChartContainer .chart-container');
            const chartTitleContainer = document.getElementById('chartTitleContainer');
            
            if (paperListContainer && chartContainer) {
                // 等待图例容器完全渲染
                let retryCount = 0;
                const maxRetries = 10;
                
                const calculateHeight = () => {
                    // 获取屏幕高度（100vh）
                    const viewportHeight = window.innerHeight;
                    
                    // 获取第一个容器（paperListContainer）的实际高度
                    const paperListHeight = paperListContainer.offsetHeight;
                    
                    // 获取图表标题和图例容器的高度
                    const titleHeight = chartTitleContainer ? chartTitleContainer.offsetHeight : 0;
                    
                    // 计算vw单位的像素值（1vw = viewport width / 100）
                    const vwToPx = window.innerWidth / 100;
                    
                    // 计算累计的padding和margin：1vw + 1.8vw + 2vw = 4.8vw
                    const totalPaddingMargin = 1 * vwToPx;
                    
                    // 计算图表容器的可用高度：100vh - paperListContainer高度 - 标题高度 - 图例高度 - padding/margin
                    const availableHeight = viewportHeight - paperListHeight - titleHeight -  totalPaddingMargin ; // 额外减去20px作为缓冲
                    
                    // 确保最小高度为300px，最大高度不超过800px
                    const finalHeight  = Math.max(Math.min(availableHeight, 800), 0);
                    
                    // // 检查高度是否合理（不应该超过视口高度的80%）
                    // const maxReasonableHeight = viewportHeight * 0.8;
                    // const finalHeight = Math.min(chartHeight, maxReasonableHeight);
                    
                    // 如果图例容器还没有内容且重试次数未达到上限，则重试
                    if (chartLegendContainer && chartLegendContainer.children.length === 0 && retryCount < maxRetries) {
                        retryCount++;
                        setTimeout(calculateHeight, 100);
                        return;
                    }
                    
                    // 设置图表容器高度
                    chartContainer.style.height = finalHeight + 'px';
                    
                    // 同时设置canvas的高度
                    const canvas = document.getElementById('paperGroupChart');
                    if (canvas) {
                        canvas.style.height = finalHeight + 'px';
                    }
                    
                    // 如果图表已存在，重新调整大小
                    if (paperGroupChart) {
                        paperGroupChart.resize();
                    }
                };
                
                // 开始计算高度
                calculateHeight();
            }
        }, 200);
    });
}

async function loadPaperGroupStatsData(groupId) {
    try {
        const response = await fetch(`${APP_ROOT}/api/papergroup_stats/${groupId}`);
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
                createPaperGroupChart(result.data);
            } else {
                console.error('试卷组统计数据格式错误或无数据:', result);
                showToast('加载统计数据失败', 'error');
            }
        } else {
            console.error('获取试卷组统计数据失败');
            showToast('获取统计数据失败', 'error');
        }
    } catch (error) {
        console.error('加载试卷组统计数据时出错:', error);
        showToast('加载统计数据失败', 'error');
    }
}

function createPaperGroupChart(data) {
    // 销毁现有图表
    if (paperGroupChart) {
        paperGroupChart.destroy();
        paperGroupChart = null;
    }
    
    // 销毁知识点统计图表
    destroyKnowledgeCharts();
    
    const ctx = document.getElementById('paperGroupChart');
    if (!ctx) return;
    
    // 从data对象中提取knowledge_point_stats数组
    const knowledgeGroups = data.knowledge_point_stats || [];
    
    if (!Array.isArray(knowledgeGroups) || knowledgeGroups.length === 0) {
        console.error('知识点数据格式错误或为空:', data);
        showToast('图表数据格式错误', 'error');
        return;
    }
    
    const labels = knowledgeGroups.map(item => item.name);
    const scores = knowledgeGroups.map(item => item.total_score);
    const proficientScores = knowledgeGroups.map(item => item.user_proficient_score || 0);
    const unfamiliarScores = knowledgeGroups.map(item => item.user_unfamiliar_score || 0);
    const unknownScores = knowledgeGroups.map(item => item.user_unknown_score || 0);
    
    // 构建数据集
    const datasets = [{
        label: '总分值',
        data: scores,
        backgroundColor: 'rgba(54, 162, 235, 0.6)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        yAxisID: 'y',
        stack: 'total_scores'  // 总分值使用独立的堆叠组
    }];
    
    // 如果有用户数据，添加用户刷题分数的堆叠柱状图
    const hasUserData = proficientScores.some(score => score > 0) || 
                       unfamiliarScores.some(score => score > 0) || 
                       unknownScores.some(score => score > 0);
    
    if (hasUserData) {
        datasets.push({
            label: '熟练',
            data: proficientScores,
            backgroundColor: '#28a745',  // 统一绿色
            borderColor: '#28a745',
            borderWidth: 1,
            yAxisID: 'y',
            stack: 'user_scores'
        });
        
        datasets.push({
            label: '不熟',
            data: unfamiliarScores,
            backgroundColor: '#ffc107',  // 统一橙色
            borderColor: '#ffc107',
            borderWidth: 1,
            yAxisID: 'y',
            stack: 'user_scores'
        });
        
        datasets.push({
            label: '不会',
            data: unknownScores,
            backgroundColor: '#dc3545',  // 统一红色
            borderColor: '#dc3545',
            borderWidth: 1,
            yAxisID: 'y',
            stack: 'user_scores'
        });
    }
    
    // 计算总分值（用于计算比例）
    const totalScore = scores.reduce((sum, score) => sum + score, 0);
    
    paperGroupChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        plugins: [ChartDataLabels],  // 注册 datalabels 插件
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: false
                },
                legend: {
                    display: false  // 禁用Canvas图例，使用HTML图例
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const datasetLabel = context.dataset.label || '';
                            const value = context.parsed.y;
                            return `${datasetLabel}: ${value}分`;
                        }
                    }
                },
                datalabels: {
                    display: function(context) {
                        // 只在蓝色总分数柱（第一个数据集）上显示标签
                        return context.datasetIndex === 0;
                    },
                    anchor: 'end',
                    align: 'top',
                    color: '#000',
                    font: {
                        size: 10,
                        weight: 'normal'
                    },
                    formatter: function(value, context) {
                        // 计算该知识点占整个试卷组的分值比例
                        const percentage = ((value / totalScore) * 100).toFixed(1);
                        return `${percentage}%`;
                    },
                    offset: 4
                }
            },
            scales: {
                x: {
                    display: true,
                    title: {
                        display: false  // 移除"知识点"标题
                    },
                    ticks: {
                        font: {
                            // 计算基于屏幕宽度的字体大小：1vw，最多15px
                            size: Math.min(window.innerWidth * 0.008, 15)
                        }
                    }
                },
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '分值'
                    },
                    stacked: true  // 启用堆叠
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            }
        }
    });
    
    // 统一使用updateCustomTitleAndLegend函数来设置标题
    updateCustomTitleAndLegend(hasUserData, datasets);
}

// 手动刷新图表函数
async function refreshChart() {
    const refreshBtn = document.getElementById('refreshChartBtn');
    const papergroupSelect = document.getElementById('papergroupSelect');
    
    if (!papergroupSelect || !papergroupSelect.value) {
        showToast('请先选择试卷组', 'warning');
        return;
    }
    
    // 显示加载状态
    if (refreshBtn) {
        refreshBtn.disabled = true;
        refreshBtn.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
                <path d="M3 3v5h5"></path>
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                <path d="M21 21v-5h-5"></path>
            </svg>
        `;
    }
    
    try {
        // 重新加载图表数据
        await loadPaperGroupStatsData(papergroupSelect.value);
    } catch (error) {
        console.error('刷新图表失败:', error);
        showToast('刷新图表失败', 'error');
    } finally {
        // 恢复按钮状态
        if (refreshBtn) {
            refreshBtn.disabled = false;
            refreshBtn.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"></path>
                    <path d="M21 3v5h-5"></path>
                    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"></path>
                    <path d="M3 21v-5h5"></path>
                </svg>
            `;
        }
    }
}
