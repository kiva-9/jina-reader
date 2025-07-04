document.addEventListener('DOMContentLoaded', () => {
    // 获取所有需要的DOM元素
    const urlInput = document.getElementById('urlInput');
    const convertBtn = document.getElementById('convertBtn');
    const statusDiv = document.getElementById('status');
    const outputPre = document.getElementById('output');
    const copyBtn = document.getElementById('copyBtn');
    const saveBtn = document.getElementById('saveBtn');
    const logContainer = document.getElementById('logContainer');
    const logList = document.getElementById('logList');
    const outputContainer = document.getElementById('outputContainer');

    // “开始转换”按钮的点击事件
    convertBtn.addEventListener('click', async () => {
        const urls = urlInput.value.trim().split('\n').filter(url => url.trim() !== '');

        if (urls.length === 0) {
            statusDiv.textContent = '请输入至少一个URL！';
            statusDiv.style.color = 'red';
            return;
        }
        
        // --- 重置UI状态 ---
        convertBtn.disabled = true;
        convertBtn.textContent = '正在转换中...';
        statusDiv.textContent = '开始处理...';
        statusDiv.style.color = '#333';
        outputPre.textContent = '';
        logList.innerHTML = '';
        logContainer.classList.remove('hidden');
        outputContainer.classList.add('hidden');

        // --- 并发处理所有URL ---
        const fetchPromises = urls.map(async (url) => {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://r.jina.ai/${url}`)}`;
            try {
                const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(45000) }); // 45秒超时
                if (!response.ok) throw new Error(`服务器返回错误: ${response.status}`);
                const content = await response.text();
                return { success: true, url, content };
            } catch (error) {
                return { success: false, url, error: error.message };
            }
        });

        const results = await Promise.all(fetchPromises);

        // --- 处理并展示结果 ---
        let successfulContent = [];
        let successCount = 0;
        let errorCount = 0;

        results.forEach(result => {
            const logItem = document.createElement('li');
            if (result.success) {
                successCount++;
                logItem.textContent = `✅ 成功: ${result.url}`;
                logItem.className = 'log-success';
                successfulContent.push(`--- 来源: ${result.url} ---\n\n${result.content}`);
            } else {
                errorCount++;
                logItem.textContent = `❌ 失败: ${result.url} (原因: ${result.error})`;
                logItem.className = 'log-failure';
            }
            logList.appendChild(logItem);
        });

        // 更新最终状态
        statusDiv.textContent = `处理完毕！成功 ${successCount} 个，失败 ${errorCount} 个。`;
        statusDiv.style.color = errorCount > 0 ? 'orange' : 'green';

        // 如果有成功的内容，则显示输出区域
        if (successCount > 0) {
            outputContainer.classList.remove('hidden');
            outputPre.textContent = successfulContent.join('\n\n---\n\n');
        }

        // 恢复“开始转换”按钮
        convertBtn.disabled = false;
        convertBtn.textContent = '开始转换';
    });

    // “复制”按钮的点击事件
    copyBtn.addEventListener('click', () => {
        if(!outputPre.textContent) return;
        navigator.clipboard.writeText(outputPre.textContent).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '已复制!';
            setTimeout(() => { copyBtn.textContent = originalText; }, 2000);
        }).catch(err => {
            console.error('复制失败: ', err);
            alert('复制失败，请手动复制。');
        });
    });

    // “保存为TXT”按钮的点击事件
    saveBtn.addEventListener('click', () => {
        if(!outputPre.textContent) return;

        // 1. 创建Blob对象
        const blob = new Blob([outputPre.textContent], { type: 'text/plain;charset=utf-8' });
        
        // 2. 创建一个指向该Blob的URL
        const url = URL.createObjectURL(blob);
        
        // 3. 创建一个隐藏的<a>标签用于下载
        const a = document.createElement('a');
        a.href = url;
        
        // 4. 设置下载的文件名（包含日期）
        const date = new Date();
        const dateString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
        a.download = `content-${dateString}.txt`;
        
        // 5. 触发点击，开始下载
        document.body.appendChild(a);
        a.click();
        
        // 6. 清理：移除<a>标签并释放URL对象
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
});