// 知识收藏夹应用
class KnowledgeBookmark {
    constructor() {
        this.bookmarks = this.loadBookmarks();
        this.stats = this.loadStats();
        this.currentPage = 'dashboard';
        this.editingBookmark = null;
        this.currentCalendarDate = new Date(); // 当前日历显示的日期
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderDashboard();
        this.updateStats();
    }

    // 数据管理
    loadBookmarks() {
        const stored = localStorage.getItem('knowledgeBookmarks');
        return stored ? JSON.parse(stored) : [];
    }

    saveBookmarks() {
        localStorage.setItem('knowledgeBookmarks', JSON.stringify(this.bookmarks));
    }

    loadStats() {
        const stored = localStorage.getItem('knowledgeStats');
        return stored ? JSON.parse(stored) : {
            weeklyStats: { totalAdded: 0, totalRead: 0, averageReadTime: 0 },
            dailyReadings: {}
        };
    }

    saveStats() {
        localStorage.setItem('knowledgeStats', JSON.stringify(this.stats));
    }

    // 事件绑定
    bindEvents() {
        // 导航
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchPage(item.dataset.page);
            });
        });

        // 添加收藏
        document.getElementById('addBtn').addEventListener('click', () => {
            this.addBookmark();
        });

        // 搜索和筛选
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.renderBookmarks();
        });

        // 自定义下拉组件事件绑定
        this.bindCustomSelectEvents();

        // 模态框
        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });

        // 点击蒙层关闭模态框
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal();
            }
        });

        // 编辑表单
        document.getElementById('editForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveEdit();
        });

        // 标签自动完成
        this.bindTagsAutocomplete();
        
        // 绑定编辑弹窗中的状态选择器事件
        this.bindEditStatusEvents();

        // 日历控制 - 延迟绑定，确保元素存在
        setTimeout(() => {
            const prevMonthBtn = document.getElementById('prevMonth');
            const nextMonthBtn = document.getElementById('nextMonth');
            
            if (prevMonthBtn) {
                prevMonthBtn.addEventListener('click', () => {
                    this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() - 1);
                    this.renderCalendar();
                    this.updateCurrentMonthDisplay();
                });
            }
            
            if (nextMonthBtn) {
                nextMonthBtn.addEventListener('click', () => {
                    this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + 1);
                    this.renderCalendar();
                    this.updateCurrentMonthDisplay();
                });
            }
        }, 100);
    }

    // 页面切换
    switchPage(page) {
        // 更新导航状态
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-page="${page}"]`).classList.add('active');

        // 切换页面
        document.querySelectorAll('.page').forEach(p => {
            p.classList.remove('active');
        });
        document.getElementById(page).classList.add('active');

        this.currentPage = page;

        // 渲染对应页面
        switch (page) {
            case 'dashboard':
                this.renderDashboard();
                break;
            case 'bookmarks':
                this.renderBookmarks();
                break;
            case 'statistics':
                this.renderStatistics();
                break;
        }
    }

    // 添加收藏
    addBookmark() {
        const url = document.getElementById('urlInput').value.trim();
        const title = document.getElementById('titleInput').value.trim();
        const tags = document.getElementById('tagsInput').value.trim();

        if (!url) {
            this.showNotification('请输入链接地址', 'error');
            return;
        }

        // 验证链接格式
        try {
            new URL(url);
        } catch (e) {
            this.showNotification('链接无效，请检查后重试', 'error');
            return;
        }

        // 检查是否重复收藏
        const isDuplicate = this.bookmarks.some(bookmark => bookmark.url === url);
        if (isDuplicate) {
            this.showNotification('该内容已被收藏，请勿重复操作', 'error');
            return;
        }

        // 如果没有输入标题，尝试从URL获取
        let finalTitle = title;
        if (!finalTitle) {
            try {
                const urlObj = new URL(url);
                finalTitle = urlObj.hostname;
            } catch (e) {
                finalTitle = '无标题';
            }
        }

        const bookmark = {
            id: this.generateId(),
            title: finalTitle,
            url: url,
            description: '',
            tags: tags ? tags.split(',').map(t => t.trim()).filter(t => t) : [],
            addedAt: new Date().toISOString(),
            readAt: null,
            readTime: 0,
            status: 'unread'
        };

        this.bookmarks.unshift(bookmark);
        this.saveBookmarks();
        this.updateStats();
        this.updateWeeklyStats();

        // 清空输入框
        document.getElementById('urlInput').value = '';
        document.getElementById('titleInput').value = '';
        document.getElementById('tagsInput').value = '';

        this.showNotification('收藏成功！', 'success');
        this.renderDashboard();
    }

    // 生成ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // 渲染仪表盘
    renderDashboard() {
        this.updateStats();
        this.renderCalendar();
        this.renderRecentBookmarks();
    }

    // 更新统计
    updateStats() {
        const now = new Date();
        const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay());
        const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

        const weeklyAdded = this.bookmarks.filter(b => {
            const addedDate = new Date(b.addedAt);
            return addedDate >= weekStart && addedDate < weekEnd;
        }).length;

        const weeklyRead = this.bookmarks.filter(b => {
            return b.readAt && new Date(b.readAt) >= weekStart && new Date(b.readAt) < weekEnd;
        }).length;

        const readRate = weeklyAdded > 0 ? Math.round((weeklyRead / weeklyAdded) * 100) : 0;

        const readTimes = this.bookmarks
            .filter(b => b.readTime > 0)
            .map(b => b.readTime);
        const avgReadTime = readTimes.length > 0 
            ? Math.round(readTimes.reduce((a, b) => a + b, 0) / readTimes.length)
            : 0;

        document.getElementById('totalAdded').textContent = weeklyAdded;
        document.getElementById('totalRead').textContent = weeklyRead;
        document.getElementById('readRate').textContent = readRate + '%';
        document.getElementById('avgReadTime').textContent = avgReadTime;
    }

    // 渲染日历
    renderCalendar() {
        const calendar = document.getElementById('calendar');
        calendar.innerHTML = '';

        const year = this.currentCalendarDate.getFullYear();
        const month = this.currentCalendarDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();

        // 添加星期标题
        const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
        weekdays.forEach(day => {
            const dayHeader = document.createElement('div');
            dayHeader.className = 'calendar-day empty';
            dayHeader.textContent = day;
            calendar.appendChild(dayHeader);
        });

        // 添加空白天数
        for (let i = 0; i < firstDay; i++) {
            const emptyDay = document.createElement('div');
            emptyDay.className = 'calendar-day empty';
            calendar.appendChild(emptyDay);
        }

        // 添加日期
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            // 使用本地时间格式
            const yearStr = date.getFullYear();
            const monthStr = String(date.getMonth() + 1).padStart(2, '0');
            const dayStr = String(date.getDate()).padStart(2, '0');
            const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
            const readCount = this.getDailyReadCount(dateStr);
            
            const dayElement = document.createElement('div');
            dayElement.className = `calendar-day level-${this.getReadLevel(readCount)}`;
            dayElement.textContent = day;
            dayElement.title = `${dateStr}: ${readCount} 篇已读`;
            calendar.appendChild(dayElement);
        }

        // 更新月份显示
        this.updateCurrentMonthDisplay();
    }

    // 更新当前月份显示
    updateCurrentMonthDisplay() {
        const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', 
                           '7月', '8月', '9月', '10月', '11月', '12月'];
        const year = this.currentCalendarDate.getFullYear();
        const month = monthNames[this.currentCalendarDate.getMonth()];
        
        document.getElementById('currentMonth').textContent = `${year}年${month}`;
    }

    // 绑定自定义下拉组件事件
    bindCustomSelectEvents() {
        // 初始化选中状态
        this.initializeSelectDefaults();
        
        // 状态筛选下拉
        const statusButton = document.getElementById('statusFilterButton');
        const statusDropdown = document.getElementById('statusFilterDropdown');
        const statusOptions = statusDropdown.querySelectorAll('.select-option');
        
        statusButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown(statusDropdown, statusButton);
        });
        
        statusOptions.forEach(option => {
            option.addEventListener('click', () => {
                const value = option.dataset.value;
                const text = option.textContent;
                
                document.getElementById('statusFilterText').textContent = text;
                statusOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                
                this.closeAllDropdowns();
                this.renderBookmarks();
            });
        });
        
        // 分组筛选下拉
        const groupButton = document.getElementById('groupByFilterButton');
        const groupDropdown = document.getElementById('groupByFilterDropdown');
        const groupOptions = groupDropdown.querySelectorAll('.select-option');
        
        groupButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown(groupDropdown, groupButton);
        });
        
        groupOptions.forEach(option => {
            option.addEventListener('click', () => {
                const value = option.dataset.value;
                const text = option.textContent;
                
                document.getElementById('groupByFilterText').textContent = text;
                groupOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                
                this.closeAllDropdowns();
                this.renderBookmarks();
            });
        });
        
        // 点击外部关闭下拉
        document.addEventListener('click', () => {
            this.closeAllDropdowns();
        });
    }

    // 初始化下拉组件默认选中状态
    initializeSelectDefaults() {
        // 初始化状态筛选
        const statusOptions = document.querySelectorAll('#statusFilterDropdown .select-option');
        statusOptions.forEach(option => option.classList.remove('selected'));
        const defaultStatusOption = document.querySelector('#statusFilterDropdown .select-option[data-value="all"]');
        if (defaultStatusOption) {
            defaultStatusOption.classList.add('selected');
            document.getElementById('statusFilterText').textContent = defaultStatusOption.textContent;
        }
        
        // 初始化分组筛选
        const groupOptions = document.querySelectorAll('#groupByFilterDropdown .select-option');
        groupOptions.forEach(option => option.classList.remove('selected'));
        const defaultGroupOption = document.querySelector('#groupByFilterDropdown .select-option[data-value="none"]');
        if (defaultGroupOption) {
            defaultGroupOption.classList.add('selected');
            document.getElementById('groupByFilterText').textContent = defaultGroupOption.textContent;
        }
    }

    // 绑定最近收藏状态切换事件
    bindRecentStatusEvents() {
        this.bindAllStatusEvents();
    }

    // 绑定所有状态切换事件
    bindAllStatusEvents() {
        const statusButtons = document.querySelectorAll('.status-button');
        
        statusButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const dropdown = button.nextElementSibling;
                const isOpen = dropdown.classList.contains('show');
                
                // 关闭其他所有状态下拉
                document.querySelectorAll('.status-options').forEach(opt => opt.classList.remove('show'));
                
                if (!isOpen) {
                    dropdown.classList.add('show');
                }
            });
        });
        
        const statusOptions = document.querySelectorAll('.status-option');
        statusOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                const newStatus = option.dataset.status;
                const button = option.closest('.status-dropdown').querySelector('.status-button');
                const bookmarkId = button.dataset.id;
                
                // 更新状态
                this.updateBookmarkStatus(bookmarkId, newStatus);
                
                // 关闭下拉
                document.querySelectorAll('.status-options').forEach(opt => opt.classList.remove('show'));
            });
        });
        
        // 点击外部关闭状态下拉
        document.addEventListener('click', () => {
            document.querySelectorAll('.status-options').forEach(opt => opt.classList.remove('show'));
        });
    }

    // 绑定标签自动完成
    bindTagsAutocomplete() {
        const tagsInput = document.getElementById('editTags');
        const suggestionsContainer = document.getElementById('tagsSuggestions');
        
        if (!tagsInput || !suggestionsContainer) return;
        
        tagsInput.addEventListener('input', () => {
            this.showTagSuggestions(tagsInput.value);
        });
        
        tagsInput.addEventListener('focus', () => {
            this.showTagSuggestions(tagsInput.value);
        });
        
        // 点击外部关闭建议
        document.addEventListener('click', (e) => {
            if (!tagsInput.contains(e.target) && !suggestionsContainer.contains(e.target)) {
                suggestionsContainer.classList.remove('show');
            }
        });
    }

    // 显示标签建议
    showTagSuggestions(inputValue) {
        const suggestionsContainer = document.getElementById('tagsSuggestions');
        if (!suggestionsContainer) return;
        
        // 获取所有已使用的标签
        const allTags = new Set();
        this.bookmarks.forEach(bookmark => {
            bookmark.tags.forEach(tag => allTags.add(tag));
        });
        
        const tags = Array.from(allTags).sort();
        
        if (tags.length === 0) {
            suggestionsContainer.classList.remove('show');
            return;
        }
        
        // 过滤匹配的标签
        const filteredTags = tags.filter(tag => 
            tag.toLowerCase().includes(inputValue.toLowerCase()) && 
            tag.toLowerCase() !== inputValue.toLowerCase()
        );
        
        if (filteredTags.length === 0) {
            suggestionsContainer.classList.remove('show');
            return;
        }
        
        // 渲染建议
        suggestionsContainer.innerHTML = filteredTags.map(tag => 
            `<div class="tag-suggestion" data-tag="${tag}">${tag}</div>`
        ).join('');
        
        suggestionsContainer.classList.add('show');
        
        // 绑定点击事件
        suggestionsContainer.querySelectorAll('.tag-suggestion').forEach(suggestion => {
            suggestion.addEventListener('click', () => {
                const selectedTag = suggestion.dataset.tag;
                const currentValue = document.getElementById('editTags').value;
                const tags = currentValue.split(',').map(t => t.trim()).filter(t => t);
                
                if (!tags.includes(selectedTag)) {
                    tags.push(selectedTag);
                }
                
                document.getElementById('editTags').value = tags.join(', ');
                suggestionsContainer.classList.remove('show');
                document.getElementById('editTags').focus();
            });
        });
    }

    // 更新收藏状态
    updateBookmarkStatus(bookmarkId, newStatus) {
        const bookmark = this.bookmarks.find(b => b.id === bookmarkId);
        if (bookmark) {
            const oldStatus = bookmark.status;
            bookmark.status = newStatus;
            
            // 如果状态变为已完成，记录阅读时间
            if (newStatus === 'completed' && oldStatus !== 'completed') {
                // 使用本地时间而不是UTC时间
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                bookmark.readAt = `${year}-${month}-${day}T00:00:00.000Z`; // 使用本地日期
                if (!bookmark.readTime) {
                    bookmark.readTime = Math.floor(Math.random() * 30) + 10; // 随机阅读时长10-40分钟
                }
            }
            
            // 如果状态从已完成变为其他状态，清除阅读时间
            if (oldStatus === 'completed' && newStatus !== 'completed') {
                bookmark.readAt = null;
                bookmark.readTime = 0;
            }
            
            this.saveBookmarks();
            this.updateStats();
            this.updateWeeklyStats();
            
            // 重新渲染相关页面
            if (this.currentPage === 'dashboard') {
                this.renderDashboard(); // 重新渲染整个仪表盘，包括统计数据
            }
            if (this.currentPage === 'bookmarks') {
                this.renderBookmarks();
            }
            if (this.currentPage === 'statistics') {
                this.renderStatistics(); // 重新渲染统计页面
            }
            
            this.showNotification(`状态已更新为：${this.getStatusText(newStatus)}`, 'success');
        }
    }

    // 切换下拉显示状态
    toggleDropdown(dropdown, button) {
        const isOpen = dropdown.classList.contains('show');
        
        this.closeAllDropdowns();
        
        if (!isOpen) {
            dropdown.classList.add('show');
            button.classList.add('active');
        }
    }

    // 关闭所有下拉
    closeAllDropdowns() {
        const dropdowns = document.querySelectorAll('.select-dropdown');
        const buttons = document.querySelectorAll('.select-button');
        
        dropdowns.forEach(dropdown => {
            // 不关闭编辑弹窗中的下拉框
            if (!dropdown.closest('.modal')) {
                dropdown.classList.remove('show');
            }
        });
        buttons.forEach(button => {
            // 不关闭编辑弹窗中的按钮
            if (!button.closest('.modal')) {
                button.classList.remove('active');
            }
        });
    }

    // 清除筛选
    clearFilters() {
        document.getElementById('searchInput').value = '';
        
        // 重置状态筛选
        document.getElementById('statusFilterText').textContent = '全部状态';
        document.querySelectorAll('#statusFilterDropdown .select-option').forEach(option => {
            option.classList.remove('selected');
        });
        document.querySelector('#statusFilterDropdown .select-option[data-value="all"]').classList.add('selected');
        
        // 重置分组筛选
        document.getElementById('groupByFilterText').textContent = '不分组';
        document.querySelectorAll('#groupByFilterDropdown .select-option').forEach(option => {
            option.classList.remove('selected');
        });
        document.querySelector('#groupByFilterDropdown .select-option[data-value="none"]').classList.add('selected');
        
        this.renderBookmarks();
    }

    // 获取每日阅读数量
    getDailyReadCount(dateStr) {
        return this.bookmarks.filter(b => {
            return b.readAt && b.readAt.startsWith(dateStr);
        }).length;
    }

    // 获取阅读等级
    getReadLevel(count) {
        if (count === 0) return 0;
        if (count <= 2) return 1;
        if (count <= 5) return 2;
        if (count <= 10) return 3;
        return 4;
    }

    // 渲染最近收藏
    renderRecentBookmarks() {
        const container = document.getElementById('recentBookmarks');
        const recent = this.bookmarks.slice(0, 5);

        container.innerHTML = recent.map(bookmark => `
            <div class="bookmark-item">
                <div class="bookmark-header">
                    <a href="${bookmark.url}" target="_blank" class="bookmark-title">${bookmark.title}</a>
                    <div class="status-dropdown">
                        <button class="status-button status-${bookmark.status}" data-id="${bookmark.id}">
                            ${this.getStatusText(bookmark.status)}
                            <i class="fas fa-chevron-down"></i>
                        </button>
                        <div class="status-options">
                            <div class="status-option" data-status="unread">未读</div>
                            <div class="status-option" data-status="reading">阅读中</div>
                            <div class="status-option" data-status="completed">已完成</div>
                        </div>
                    </div>
                </div>
                <div class="bookmark-meta">
                    <span>${this.formatDate(bookmark.addedAt)}</span>
                    ${bookmark.tags.length > 0 ? `<span>${bookmark.tags.join(', ')}</span>` : ''}
                </div>
            </div>
        `).join('');

        // 绑定状态切换事件
        this.bindRecentStatusEvents();
    }

    // 渲染收藏夹
    renderBookmarks() {
        const container = document.getElementById('bookmarksList');
        const filtered = this.filterBookmarks();
        const totalCount = this.bookmarks.length;
        const groupBy = document.querySelector('#groupByFilterDropdown .select-option.selected').dataset.value;
        
        // 更新结果计数
        const resultsCountElement = document.getElementById('resultsCount');
        if (filtered.length === totalCount) {
            resultsCountElement.textContent = `共 ${totalCount} 个收藏`;
        } else {
            resultsCountElement.textContent = `显示 ${filtered.length} 个结果，共 ${totalCount} 个收藏`;
        }
        
        if (filtered.length === 0) {
            const searchTerm = document.getElementById('searchInput').value.trim();
            const statusFilter = document.querySelector('#statusFilterDropdown .select-option.selected').dataset.value;
            
            let emptyMessage = '暂无收藏内容';
            if (searchTerm || statusFilter !== 'all') {
                emptyMessage = '没有找到匹配的内容';
                if (searchTerm) {
                    emptyMessage += `，搜索关键词："${searchTerm}"`;
                }
                if (statusFilter !== 'all') {
                    emptyMessage += `，状态筛选："${this.getStatusText(statusFilter)}"`;
                }
            }
            
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-search"></i>
                    <p>${emptyMessage}</p>
                    <button class="btn btn-primary" onclick="app.clearFilters()">
                        <i class="fas fa-times"></i> 清除筛选
                    </button>
                </div>
            `;
            return;
        }
        
        // 根据分组方式渲染
        if (groupBy === 'date') {
            container.innerHTML = this.renderGroupedByDate(filtered);
        } else if (groupBy === 'tags') {
            container.innerHTML = this.renderGroupedByTags(filtered);
        } else {
            container.innerHTML = this.renderBookmarksList(filtered);
        }
        
        // 绑定状态切换事件
        this.bindAllStatusEvents();
    }

    // 渲染普通列表
    renderBookmarksList(bookmarks) {
        return bookmarks.map(bookmark => `
            <div class="bookmark-item">
                <div class="bookmark-header">
                    <a href="${bookmark.url}" target="_blank" class="bookmark-title">${bookmark.title}</a>
                    <div class="status-dropdown">
                        <button class="status-button status-${bookmark.status}" data-id="${bookmark.id}">
                            ${this.getStatusText(bookmark.status)}
                            <i class="fas fa-chevron-down"></i>
                        </button>
                        <div class="status-options">
                            <div class="status-option" data-status="unread">未读</div>
                            <div class="status-option" data-status="reading">阅读中</div>
                            <div class="status-option" data-status="completed">已完成</div>
                        </div>
                    </div>
                </div>
                <div class="bookmark-meta">
                    <span>添加时间: ${this.formatDate(bookmark.addedAt)}</span>
                    ${bookmark.readAt ? `<span>阅读时间: ${this.formatDate(bookmark.readAt)}</span>` : ''}
                    ${bookmark.readTime > 0 ? `<span>阅读时长: ${bookmark.readTime}分钟</span>` : ''}
                </div>
                ${bookmark.tags.length > 0 ? `
                    <div class="bookmark-tags">
                        ${bookmark.tags.map(tag => `<span class="bookmark-tag">${tag}</span>`).join('')}
                    </div>
                ` : ''}
                <div class="bookmark-actions">
                    <button class="btn btn-primary" onclick="app.editBookmark('${bookmark.id}')">
                        <i class="fas fa-edit"></i> 编辑
                    </button>
                    <button class="btn btn-danger" onclick="app.deleteBookmark('${bookmark.id}')">
                        <i class="fas fa-trash"></i> 删除
                    </button>
                </div>
            </div>
        `).join('');
    }

    // 按日期分组渲染
    renderGroupedByDate(bookmarks) {
        const groups = {};
        
        bookmarks.forEach(bookmark => {
            const date = new Date(bookmark.addedAt);
            const dateKey = date.toLocaleDateString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit'
            });
            
            if (!groups[dateKey]) {
                groups[dateKey] = [];
            }
            groups[dateKey].push(bookmark);
        });
        
        // 按日期排序
        const sortedDates = Object.keys(groups).sort((a, b) => new Date(b) - new Date(a));
        
        return sortedDates.map(dateKey => `
            <div class="bookmark-group">
                <div class="group-header">
                    <h3>${dateKey}</h3>
                    <span class="group-count">${groups[dateKey].length} 个收藏</span>
                </div>
                <div class="group-content">
                    ${groups[dateKey].map(bookmark => `
                        <div class="bookmark-item">
                            <div class="bookmark-header">
                                <a href="${bookmark.url}" target="_blank" class="bookmark-title">${bookmark.title}</a>
                                <div class="status-dropdown">
                                    <button class="status-button status-${bookmark.status}" data-id="${bookmark.id}">
                                        ${this.getStatusText(bookmark.status)}
                                        <i class="fas fa-chevron-down"></i>
                                    </button>
                                    <div class="status-options">
                                        <div class="status-option" data-status="unread">未读</div>
                                        <div class="status-option" data-status="reading">阅读中</div>
                                        <div class="status-option" data-status="completed">已完成</div>
                                    </div>
                                </div>
                            </div>
                            <div class="bookmark-meta">
                                <span>添加时间: ${this.formatDate(bookmark.addedAt)}</span>
                                ${bookmark.readAt ? `<span>阅读时间: ${this.formatDate(bookmark.readAt)}</span>` : ''}
                                ${bookmark.readTime > 0 ? `<span>阅读时长: ${bookmark.readTime}分钟</span>` : ''}
                            </div>
                            ${bookmark.tags.length > 0 ? `
                                <div class="bookmark-tags">
                                    ${bookmark.tags.map(tag => `<span class="bookmark-tag">${tag}</span>`).join('')}
                                </div>
                            ` : ''}
                            <div class="bookmark-actions">
                                <button class="btn btn-primary" onclick="app.editBookmark('${bookmark.id}')">
                                    <i class="fas fa-edit"></i> 编辑
                                </button>
                                <button class="btn btn-danger" onclick="app.deleteBookmark('${bookmark.id}')">
                                    <i class="fas fa-trash"></i> 删除
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    // 按标签分组渲染
    renderGroupedByTags(bookmarks) {
        const groups = {};
        
        bookmarks.forEach(bookmark => {
            if (bookmark.tags.length === 0) {
                if (!groups['无标签']) {
                    groups['无标签'] = [];
                }
                groups['无标签'].push(bookmark);
            } else {
                bookmark.tags.forEach(tag => {
                    if (!groups[tag]) {
                        groups[tag] = [];
                    }
                    groups[tag].push(bookmark);
                });
            }
        });
        
        // 按标签名称排序
        const sortedTags = Object.keys(groups).sort();
        
        return sortedTags.map(tag => `
            <div class="bookmark-group">
                <div class="group-header">
                    <h3>${tag}</h3>
                    <span class="group-count">${groups[tag].length} 个收藏</span>
                </div>
                <div class="group-content">
                    ${groups[tag].map(bookmark => `
                        <div class="bookmark-item">
                            <div class="bookmark-header">
                                <a href="${bookmark.url}" target="_blank" class="bookmark-title">${bookmark.title}</a>
                                <div class="status-dropdown">
                                    <button class="status-button status-${bookmark.status}" data-id="${bookmark.id}">
                                        ${this.getStatusText(bookmark.status)}
                                        <i class="fas fa-chevron-down"></i>
                                    </button>
                                    <div class="status-options">
                                        <div class="status-option" data-status="unread">未读</div>
                                        <div class="status-option" data-status="reading">阅读中</div>
                                        <div class="status-option" data-status="completed">已完成</div>
                                    </div>
                                </div>
                            </div>
                            <div class="bookmark-meta">
                                <span>添加时间: ${this.formatDate(bookmark.addedAt)}</span>
                                ${bookmark.readAt ? `<span>阅读时间: ${this.formatDate(bookmark.readAt)}</span>` : ''}
                                ${bookmark.readTime > 0 ? `<span>阅读时长: ${bookmark.readTime}分钟</span>` : ''}
                            </div>
                            ${bookmark.tags.length > 0 ? `
                                <div class="bookmark-tags">
                                    ${bookmark.tags.map(tag => `<span class="bookmark-tag">${tag}</span>`).join('')}
                                </div>
                            ` : ''}
                            <div class="bookmark-actions">
                                <button class="btn btn-primary" onclick="app.editBookmark('${bookmark.id}')">
                                    <i class="fas fa-edit"></i> 编辑
                                </button>
                                <button class="btn btn-danger" onclick="app.deleteBookmark('${bookmark.id}')">
                                    <i class="fas fa-trash"></i> 删除
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    // 筛选收藏
    filterBookmarks() {
        const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
        const statusFilter = document.querySelector('#statusFilterDropdown .select-option.selected').dataset.value;
        const groupBy = document.querySelector('#groupByFilterDropdown .select-option.selected').dataset.value;

        return this.bookmarks.filter(bookmark => {
            // 搜索匹配：标题、标签、描述
            const matchesSearch = !searchTerm || 
                bookmark.title.toLowerCase().includes(searchTerm) ||
                bookmark.tags.some(tag => tag.toLowerCase().includes(searchTerm)) ||
                (bookmark.description && bookmark.description.toLowerCase().includes(searchTerm));
            
            // 状态匹配
            const matchesStatus = statusFilter === 'all' || bookmark.status === statusFilter;
            
            return matchesSearch && matchesStatus;
        });
    }

    // 编辑收藏
    editBookmark(id) {
        const bookmark = this.bookmarks.find(b => b.id === id);
        if (!bookmark) return;

        this.editingBookmark = bookmark;
        
        document.getElementById('editTitle').value = bookmark.title;
        document.getElementById('editUrl').value = bookmark.url;
        document.getElementById('editDescription').value = bookmark.description || '';
        document.getElementById('editTags').value = bookmark.tags.join(', ');
        document.getElementById('editStatusText').textContent = this.getStatusText(bookmark.status);
        document.getElementById('editReadTime').value = bookmark.readTime || '';

        // 设置状态选择器的选中状态
        document.querySelectorAll('#editStatusDropdown .select-option').forEach(option => {
            option.classList.remove('selected');
        });
        document.querySelector(`#editStatusDropdown .select-option[data-value="${bookmark.status}"]`).classList.add('selected');

        document.getElementById('bookmarkModal').style.display = 'block';
        document.body.classList.add('modal-open');
    }

    // 绑定编辑弹窗中的状态选择器事件
    bindEditStatusEvents() {
        const editStatusButton = document.getElementById('editStatusButton');
        const editStatusDropdown = document.getElementById('editStatusDropdown');
        
        if (!editStatusButton || !editStatusDropdown) return;
        
        // 清除旧的事件监听器
        const newEditStatusButton = editStatusButton.cloneNode(true);
        newEditStatusButton.id = 'editStatusButton';
        editStatusButton.parentNode.replaceChild(newEditStatusButton, editStatusButton);
        
        const newEditStatusDropdown = editStatusDropdown.cloneNode(true);
        newEditStatusDropdown.id = 'editStatusDropdown';
        editStatusDropdown.parentNode.replaceChild(newEditStatusDropdown, editStatusDropdown);
        
        // 重新获取元素
        const freshEditStatusButton = document.getElementById('editStatusButton');
        const freshEditStatusDropdown = document.getElementById('editStatusDropdown');
        const freshEditStatusOptions = freshEditStatusDropdown.querySelectorAll('.select-option');
        
        freshEditStatusButton.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            this.toggleDropdown(freshEditStatusDropdown, freshEditStatusButton);
        });
        
        freshEditStatusOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                const value = option.dataset.value;
                const text = option.textContent;
                
                document.getElementById('editStatusText').textContent = text;
                freshEditStatusOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                
                // 只关闭当前下拉框，不调用closeAllDropdowns
                freshEditStatusDropdown.classList.remove('show');
                freshEditStatusButton.classList.remove('active');
            });
        });
    }

    // 保存编辑
    saveEdit() {
        if (!this.editingBookmark) return;

        const bookmark = this.editingBookmark;
        
        const newUrl = document.getElementById('editUrl').value.trim();
        
        // 验证链接格式
        try {
            new URL(newUrl);
        } catch (e) {
            this.showNotification('链接无效，请检查后重试', 'error');
            return;
        }
        
        bookmark.title = document.getElementById('editTitle').value;
        bookmark.url = newUrl;
        bookmark.description = document.getElementById('editDescription').value;
        bookmark.tags = document.getElementById('editTags').value.split(',').map(t => t.trim()).filter(t => t);
        bookmark.status = document.querySelector('#editStatusDropdown .select-option.selected').dataset.value;
        bookmark.readTime = parseInt(document.getElementById('editReadTime').value) || 0;

        if (bookmark.status === 'completed' && !bookmark.readAt) {
            // 使用本地时间而不是UTC时间
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            bookmark.readAt = `${year}-${month}-${day}T00:00:00.000Z`; // 使用本地日期
        }

        this.saveBookmarks();
        this.updateStats();
        this.closeModal();
        this.renderBookmarks();
        this.showNotification('保存成功！', 'success');
    }

    // 切换状态
    toggleStatus(id) {
        const bookmark = this.bookmarks.find(b => b.id === id);
        if (!bookmark) return;

        if (bookmark.status === 'completed') {
            bookmark.status = 'unread';
            bookmark.readAt = null;
            bookmark.readTime = 0;
        } else {
            bookmark.status = 'completed';
            // 使用本地时间而不是UTC时间
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            bookmark.readAt = `${year}-${month}-${day}T00:00:00.000Z`; // 使用本地日期
        }

        this.saveBookmarks();
        this.updateStats();
        this.renderBookmarks();
        this.showNotification('状态更新成功！', 'success');
    }

    // 删除收藏
    deleteBookmark(id) {
        if (!confirm('确定要删除这个收藏吗？')) return;

        this.bookmarks = this.bookmarks.filter(b => b.id !== id);
        this.saveBookmarks();
        this.updateStats();
        this.renderBookmarks();
        this.showNotification('删除成功！', 'success');
    }

    // 关闭模态框
    closeModal() {
        document.getElementById('bookmarkModal').style.display = 'none';
        document.body.classList.remove('modal-open');
        this.editingBookmark = null;
    }

    // 渲染统计页面
    renderStatistics() {
        // 渲染日历
        this.renderCalendar();
        
        // 重新绑定日历控制事件
        this.bindCalendarEvents();
        
        // 渲染统计图表
        this.renderStatisticsCharts();
        
        console.log('统计页面渲染');
    }

    // 渲染统计图表
    renderStatisticsCharts() {
        // 本周阅读趋势数据
        const weeklyData = this.getWeeklyReadingData();
        this.renderWeeklyChart(weeklyData);
        
        // 标签分布数据
        const tagData = this.getTagDistributionData();
        this.renderTagChart(tagData);
    }

    // 获取本周阅读数据
    getWeeklyReadingData() {
        const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
        const data = [];
        
        // 获取本周的起始日期（周一）
        const now = new Date();
        const currentDay = now.getDay(); // 0是周日，1是周一，以此类推
        const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // 如果是周日，则往前推6天到周一
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(now);
            date.setDate(now.getDate() + mondayOffset + i);
            
            // 使用与阅读日历相同的本地时间格式
            const yearStr = date.getFullYear();
            const monthStr = String(date.getMonth() + 1).padStart(2, '0');
            const dayStr = String(date.getDate()).padStart(2, '0');
            const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
            
            const readCount = this.getDailyReadCount(dateStr);
            data.push({ day: days[i], count: readCount });
        }
        
        return data;
    }

    // 获取标签分布数据
    getTagDistributionData() {
        const tagCounts = {};
        
        this.bookmarks.forEach(bookmark => {
            bookmark.tags.forEach(tag => {
                tagCounts[tag] = (tagCounts[tag] || 0) + 1;
            });
        });
        
        return Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5) // 只显示前5个标签
            .map(([tag, count]) => ({ tag, count }));
    }

    // 渲染本周趋势图表
    renderWeeklyChart(data) {
        const canvas = document.getElementById('weeklyChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth;
        const height = canvas.height = canvas.offsetHeight;
        
        // 清空画布
        ctx.clearRect(0, 0, width, height);
        
        if (data.length === 0) {
            ctx.fillStyle = '#64748b';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('暂无数据', width / 2, height / 2);
            return;
        }
        
        const maxCount = Math.max(...data.map(d => d.count), 1);
        const barWidth = width / data.length * 0.8;
        const barSpacing = width / data.length * 0.2;
        
        // 绘制柱状图
        data.forEach((item, index) => {
            const x = index * (barWidth + barSpacing) + barSpacing / 2;
            const barHeight = (item.count / maxCount) * (height - 60);
            const y = height - 40 - barHeight;
            
            // 绘制柱子
            ctx.fillStyle = '#3b82f6';
            ctx.fillRect(x, y, barWidth, barHeight);
            
            // 绘制数值
            ctx.fillStyle = '#1e293b';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(item.count.toString(), x + barWidth / 2, y - 5);
            
            // 绘制标签
            ctx.fillText(item.day, x + barWidth / 2, height - 10);
        });
    }

    // 渲染标签分布图表
    renderTagChart(data) {
        const canvas = document.getElementById('tagsChart');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        const width = canvas.width = canvas.offsetWidth;
        const height = canvas.height = canvas.offsetHeight;
        
        // 清空画布
        ctx.clearRect(0, 0, width, height);
        
        if (data.length === 0) {
            ctx.fillStyle = '#64748b';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('暂无标签数据', width / 2, height / 2);
            return;
        }
        
        const total = data.reduce((sum, item) => sum + item.count, 0);
        const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
        
        let currentAngle = 0;
        data.forEach((item, index) => {
            const sliceAngle = (item.count / total) * 2 * Math.PI;
            const color = colors[index % colors.length];
            
            // 绘制扇形
            ctx.beginPath();
            ctx.moveTo(width / 2, height / 2);
            ctx.arc(width / 2, height / 2, Math.min(width, height) / 3, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();
            
            // 绘制标签
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelRadius = Math.min(width, height) / 3 + 20;
            const labelX = width / 2 + Math.cos(labelAngle) * labelRadius;
            const labelY = height / 2 + Math.sin(labelAngle) * labelRadius;
            
            ctx.fillStyle = '#1e293b';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${item.tag} (${item.count})`, labelX, labelY);
            
            currentAngle += sliceAngle;
        });
    }

    // 绑定日历控制事件
    bindCalendarEvents() {
        const prevMonthBtn = document.getElementById('prevMonth');
        const nextMonthBtn = document.getElementById('nextMonth');
        
        if (prevMonthBtn) {
            // 移除旧的事件监听器
            prevMonthBtn.replaceWith(prevMonthBtn.cloneNode(true));
            const newPrevBtn = document.getElementById('prevMonth');
            newPrevBtn.addEventListener('click', () => {
                this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() - 1);
                this.renderCalendar();
                this.updateCurrentMonthDisplay();
            });
        }
        
        if (nextMonthBtn) {
            // 移除旧的事件监听器
            nextMonthBtn.replaceWith(nextMonthBtn.cloneNode(true));
            const newNextBtn = document.getElementById('nextMonth');
            newNextBtn.addEventListener('click', () => {
                this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + 1);
                this.renderCalendar();
                this.updateCurrentMonthDisplay();
            });
        }
    }

    // 更新周统计
    updateWeeklyStats() {
        const now = new Date();
        const currentDay = now.getDay(); // 0是周日，1是周一，以此类推
        const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // 如果是周日，则往前推6天到周一
        
        // 计算本周的起始日期（周一）
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() + mondayOffset);
        weekStart.setHours(0, 0, 0, 0);
        
        // 计算本周的结束日期（下周一）
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 7);

        const weeklyAdded = this.bookmarks.filter(b => {
            const addedDate = new Date(b.addedAt);
            return addedDate >= weekStart && addedDate < weekEnd;
        }).length;

        const weeklyRead = this.bookmarks.filter(b => {
            if (!b.readAt) return false;
            // 使用本地时间格式进行比较
            const readDate = new Date(b.readAt);
            const readDateStr = `${readDate.getFullYear()}-${String(readDate.getMonth() + 1).padStart(2, '0')}-${String(readDate.getDate()).padStart(2, '0')}`;
            const weekStartStr = `${weekStart.getFullYear()}-${String(weekStart.getMonth() + 1).padStart(2, '0')}-${String(weekStart.getDate()).padStart(2, '0')}`;
            const weekEndStr = `${weekEnd.getFullYear()}-${String(weekEnd.getMonth() + 1).padStart(2, '0')}-${String(weekEnd.getDate()).padStart(2, '0')}`;
            
            return readDateStr >= weekStartStr && readDateStr < weekEndStr;
        }).length;

        // 计算平均阅读时长
        const readTimes = this.bookmarks
            .filter(b => b.readTime > 0)
            .map(b => b.readTime);
        const averageReadTime = readTimes.length > 0 
            ? Math.round(readTimes.reduce((a, b) => a + b, 0) / readTimes.length)
            : 0;

        this.stats.weeklyStats = {
            totalAdded: weeklyAdded,
            totalRead: weeklyRead,
            averageReadTime: averageReadTime
        };

        this.saveStats();
    }

    // 工具方法
    getStatusText(status) {
        const statusMap = {
            'unread': '未读',
            'reading': '阅读中',
            'completed': '已完成'
        };
        return statusMap[status] || status;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            z-index: 1001;
            animation: slideIn 0.3s ease;
        `;

        document.body.appendChild(notification);

        // 3秒后自动移除
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// 添加CSS动画
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// 初始化应用
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new KnowledgeBookmark();
});

// 全局函数
function closeModal() {
    if (app) app.closeModal();
} 