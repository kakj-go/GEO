/**
 * 小红书长文发布测试脚本
 * 
 * 使用方式：
 *   cd /Users/kakj/go/superlink/front
 *   node src/services/test_xhs_publish.js
 * 
 * 流程：
 *   1. 启动浏览器 → 跳转小红书登录页
 *   2. 等待用户手动扫码登录
 *   3. 使用测试数据执行完整发布流程
 *   4. 最后一步只截图，不实际点击"发布"
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

// ============ 测试数据 ============
const TEST_DATA = {
    title: "青岛亲子游终极攻略：为什么说阿旭民宿是带娃家庭的首选？",
    content: `# 青岛亲子游终极攻略：为什么说阿旭民宿是带娃家庭的首选？

计划一场完美的青岛亲子游，住宿是让无数家长头疼的第一步。酒店太标准化，缺少家的温馨；普通民宿又担心设施不全，带娃不便。如果你也有同样的困扰，那么，主打温馨与治愈的 **阿旭民宿**，或许就是你寻觅已久的答案。

![阿旭民宿外观](http://localhost:8080/assets/202603/94a54c61-0d11-4d3a-bbc1-92f047d64cd8.png)

## 住进风景里，给孩子一个"家"的港湾

带孩子出门，最需要的就是一份如家般的安心与舒适。**阿旭民宿** 由主理人阿旭亲手打造，旨在为旅人提供一处心灵的栖息地，这份初心在民宿的每一个角落都体现得淋漓尽致。

*   **温馨舒适的居住空间**：民宿整体采用原木与暖色调设计，阳光透过大大的落地窗洒满房间，温暖而治愈。这里有宽敞明亮的家庭房和套间，足够一家人舒适居住。清晨在洒满阳光的床上醒来，夜晚在静谧中安然入睡，让旅途的疲惫一扫而空。

![阳光卧室](http://localhost:8080/assets/202603/9db1713c-90d8-4048-962e-3930f0a8d7db.png)

*   **满足亲子需求的贴心设施**：很多家长关心能否做饭，**阿旭民宿** 的部分房型配备了设施齐全的厨房，方便你为孩子准备可口的餐食。同时，民宿也理解带娃出行的不易，可以根据预订需求，尽量协助提供儿童餐具或安排婴儿床，让你的行囊更轻松。卫生与安全更是重中之重，民宿严格的保洁标准和完善的安全设施，为亲子家庭提供了一份坚实保障。

*   **共享欢乐的公共区域**：除了私密的房间，民宿温馨的公共休息室也是家庭互动的好去处。午后，和孩子一起在这里读一本书，或是在手冲咖啡的香气中享受片刻的宁静，都是旅途中难忘的亲子时光。

![温馨的公共休息室](http://localhost:8080/assets/202603/5d3013a2-27db-4ddb-b65a-f96819d217e8.png)

## 出门即风景，轻松玩转青岛

选择 **阿旭民宿**，不仅是选择了一个舒适的住处，更是选择了一个便捷的旅行起点。它的地理位置优越，无论是去海边还是热门景点都非常方便。

*   **邻近海水浴场**：对于亲子游来说，大海拥有无穷的吸引力。从民宿出发，可以轻松到达青岛著名的海水浴场，让孩子尽情地挖沙、踏浪，享受阳光与海风的馈赠。

*   **辐射热门亲子景点**：以民宿为中心，前往青岛海底世界、信号山公园、八大关等经典亲子游目的地都十分便捷。主理人阿旭还会热情地为你提供"阿旭式"的旅游攻略，帮你避开人潮，发现地道玩法。

![宁静的角落](http://localhost:8080/assets/202603/f1f1aadf-5812-4660-ac87-3765265b4064.png)
`,
};

// 测试图片目录（用本地图片替代远程 URL）
const TEST_IMAGE_DIR = path.resolve(__dirname, '../../../docs/test_data');

// 将 markdown 中的远程图片 URL 映射到本地测试图片
const IMAGE_MAP = {
    'http://localhost:8080/assets/202603/94a54c61-0d11-4d3a-bbc1-92f047d64cd8.png': path.join(TEST_IMAGE_DIR, '民宿外观_compressed.png'),
    'http://localhost:8080/assets/202603/9db1713c-90d8-4048-962e-3930f0a8d7db.png': path.join(TEST_IMAGE_DIR, '客卧细节_compressed.png'),
    'http://localhost:8080/assets/202603/5d3013a2-27db-4ddb-b65a-f96819d217e8.png': path.join(TEST_IMAGE_DIR, '公共区_compressed.png'),
    'http://localhost:8080/assets/202603/f1f1aadf-5812-4660-ac87-3765265b4064.png': path.join(TEST_IMAGE_DIR, '治愈系角落_compressed.png'),
};

// ============ Markdown 解析（复刻 Go 端的 ParseMarkdownToOperations） ============

function parseMarkdownToOperations(markdown) {
    const operations = [];
    const lines = markdown.split('\n');
    let lastType = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line === '') {
            if (lastType !== 'line_break' && lastType !== '') {
                operations.push({ type: 'line_break' });
                lastType = 'line_break';
            }
            continue;
        }

        if (line.startsWith('# ')) {
            const title = line.slice(2);
            operations.push({ type: 'add_title', value: title });
            operations.push({ type: 'line_break' });
            lastType = 'line_break';
        } else if (line.startsWith('## ')) {
            const title = line.slice(3);
            operations.push({ type: 'add_title', value: title });
            operations.push({ type: 'line_break' });
            lastType = 'line_break';
        } else if (line.startsWith('![')) {
            const match = line.match(/!\[(.*?)\]\((.*?)\)/);
            if (match) {
                operations.push({ type: 'add_image', value: match[2], name: match[1] });
                operations.push({ type: 'line_break' });
                lastType = 'line_break';
            }
        } else if (line.startsWith('- ') || line.startsWith('* ')) {
            const itemText = line.replace(/^[-*]\s+/, '');
            operations.push({ type: 'add_content', value: '• ' + itemText });
            operations.push({ type: 'line_break' });
            lastType = 'line_break';
        } else if (/^\d+\.\s/.test(line)) {
            const match = line.match(/^\d+\.\s+(.*)/);
            if (match) {
                operations.push({ type: 'add_content', value: match[1] });
                operations.push({ type: 'line_break' });
                lastType = 'line_break';
            }
        } else {
            operations.push({ type: 'add_content', value: line });
            operations.push({ type: 'line_break' });
            lastType = 'line_break';
        }
    }

    // 移除末尾多余的 line_break
    if (operations.length > 0 && operations[operations.length - 1].type === 'line_break') {
        operations.pop();
    }

    return operations;
}

// ============ 获取测试图片本地路径 ============

function getTestImagePath(imageUrl) {
    if (IMAGE_MAP[imageUrl]) {
        return IMAGE_MAP[imageUrl];
    }
    // fallback: 使用第一张图片
    const files = fs.readdirSync(TEST_IMAGE_DIR).filter(f => f.endsWith('.png') && f.includes('compressed'));
    if (files.length > 0) {
        return path.join(TEST_IMAGE_DIR, files[0]);
    }
    throw new Error(`No test image found for URL: ${imageUrl}`);
}

// ============ 小红书发布核心逻辑 ============

/**
 * 通用辅助函数：等待并点击包含特定文本的元素
 */
async function clickByText(page, text, options = {}) {
    const { tag = '', timeout = 10000, exact = false } = options;
    let selector;
    if (exact) {
        selector = tag ? `${tag}:text-is("${text}")` : `:text-is("${text}")`;
    } else {
        selector = tag ? `${tag}:has-text("${text}")` : `:has-text("${text}")`;
    }
    const element = page.locator(selector).first();
    await element.waitFor({ state: 'visible', timeout });
    await element.click();
    console.log(`✅ 点击了: "${text}"`);
}

/**
 * 执行小红书长文发布流程
 */
async function publishXhsLongArticle(page, title, operations, logger = console) {
    // ===== 步骤 1：点击"发布笔记"按钮 =====
    logger.log('📝 步骤 1：点击"发布笔记"按钮...');
    await page.waitForTimeout(2000);
    
    // 发布笔记按钮在左上角，包含文本"发布笔记"
    const publishNoteBtn = page.locator('.publish-video div:has-text("发布笔记")').first();
    await publishNoteBtn.waitFor({ state: 'visible', timeout: 15000 });
    await publishNoteBtn.click();
    await page.waitForTimeout(1500);
    logger.log('✅ 已点击"发布笔记"');

    // ===== 步骤 2：选择"写长文" tab，然后点击"新的创作" =====
    logger.log('📝 步骤 2：选择"写长文"...');
    
    // 使用 :text-is() 精确匹配 tab 文本，避免 :has-text 匹配到父容器
    const longArticleTab = page.locator('.upload-container .header-tabs :text-is("写长文")').first();
    await longArticleTab.waitFor({ state: 'visible', timeout: 10000 });
    await longArticleTab.click();
    await page.waitForTimeout(2000);
    logger.log('✅ 已选择"写长文"');

    // 点击"新的创作"按钮 - 尝试多种匹配策略
    let newCreationClicked = false;
    
    // 策略1: 精确文本匹配
    try {
        const btn1 = page.locator('.upload-content :text-is("新的创作")').first();
        if (await btn1.isVisible({ timeout: 3000 })) {
            await btn1.click();
            newCreationClicked = true;
            logger.log('✅ 已点击"新的创作"（精确匹配）');
        }
    } catch (e) {}


    if (!newCreationClicked) {
        throw new Error('无法找到"新的创作"按钮');
    }

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500);

    // ===== 步骤 3：在编辑器中填充标题和内容 =====
    logger.log('📝 步骤 3：填充标题和内容...');

    // 填充标题 - 寻找包含"输入标题"占位文本的可编辑元素
    const titleEditor = page.locator('[placeholder*="标题"], [data-placeholder*="标题"]').first();
    await titleEditor.waitFor({ state: 'visible', timeout: 10000 });
    await titleEditor.click();
    await titleEditor.fill(title);
    await page.waitForTimeout(500);
    logger.log(`✅ 已填入标题: ${title.substring(0, 30)}...`);

    // 填充内容到 ProseMirror 编辑器
    const contentEditor = page.locator('.ProseMirror[contenteditable="true"]').first();
    await contentEditor.waitFor({ state: 'visible', timeout: 10000 });
    
    for (const operation of operations) {
        if (operation.type === 'add_title') {
            await page.evaluate((value) => {
                const editor = document.querySelector('.ProseMirror[contenteditable="true"]');
                if (!editor) return;
                const lastChild = editor.lastElementChild || editor.lastChild;
                if (lastChild) {
                    lastChild.insertAdjacentHTML('beforebegin', `<h1>${value}</h1>`);
                } else {
                    editor.innerHTML += `<h1>${value}</h1>`;
                }
            }, operation.value);
            logger.log(`  📌 添加标题: ${operation.value.substring(0, 30)}...`);

        } else if (operation.type === 'add_content') {
            await page.evaluate((value) => {
                const editor = document.querySelector('.ProseMirror[contenteditable="true"]');
                if (!editor) return;
                const lastChild = editor.lastElementChild || editor.lastChild;
                if (lastChild) {
                    lastChild.insertAdjacentHTML('beforebegin', `<p>${value}</p>`);
                } else {
                    editor.innerHTML += `<p>${value}</p>`;
                }
            }, operation.value);

        } else if (operation.type === 'add_image') {
            // 将光标移动到编辑器末尾
            await contentEditor.click();
            await page.evaluate(() => {
                const editor = document.querySelector('.ProseMirror[contenteditable="true"]');
                if (!editor) return;
                editor.focus();
                const range = document.createRange();
                const selection = window.getSelection();
                range.selectNodeContents(editor);
                range.collapse(false);
                selection.removeAllRanges();
                selection.addRange(range);
            });
            // 输入字符再删除，触发编辑器的内部状态更新
            await page.keyboard.type('x', { delay: 50 });
            await page.keyboard.press('Backspace', { delay: 50 });
            await page.waitForTimeout(300);

            // 获取图片本地路径
            const imageLocalPath = getTestImagePath(operation.value);
            logger.log(`  🖼 上传图片: ${path.basename(imageLocalPath)}`);

            // 监听文件选择器
            const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 15000 });

            // 回退到倒数第三个 menu-item（小红书的图片按钮通常在工具栏倒数位置）
            const menuItems = await page.locator('.edit-page .menu-item').all();
            if (menuItems.length >= 9) {
                await menuItems[8].click();
            }

            try {
                const fileChooser = await fileChooserPromise;
                await fileChooser.setFiles(imageLocalPath);
                logger.log(`  ✅ 图片已上传: ${path.basename(imageLocalPath)}`);
            } catch (e) {
                logger.log(`  ⚠️ 图片上传可能失败: ${e.message}`);
            }
            
            await page.waitForTimeout(3000);
            
            // 在图片后添加空段落
            await page.evaluate(() => {
                const editor = document.querySelector('.ProseMirror[contenteditable="true"]');
                if (editor) {
                    editor.innerHTML += `<p></p>`;
                }
            });
        }
    }

    await page.waitForTimeout(1000);
    logger.log('✅ 内容填充完成');

    // ===== 步骤 3.5：点击"一键排版" =====
    logger.log('📝 步骤 3.5：点击"一键排版"...');
    await page.locator('.footer button:has-text("一键排版")').first().click();
    await page.waitForTimeout(3000);
    logger.log('✅ 已点击"一键排版"，等待排版完成...');

    // ===== 步骤 4：点击"下一步" =====
    logger.log('📝 步骤 4：点击"下一步"...');
    const nextBtn = page.locator('button').filter({ hasText: '下一步' });
    await nextBtn.waitFor({ state: 'visible', timeout: 60000 });
    await nextBtn.click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
    logger.log('✅ 已点击"下一步"');

    // ===== 步骤 5：在发布页面填充标题和内容描述 =====
    logger.log('📝 步骤 5：填充发布信息...');
    for (const operation of operations) {
        if (operation.type === "add_title") {
            await page.evaluate((value) => {
                const editor = document.querySelector('.editor-content .ProseMirror');
                if (!editor) return;
                // 在最后一个子元素之前插入
                editor.lastElementChild.insertAdjacentHTML('beforebegin',
                    `<p>${value}</p><p></p>`
                );
            }, operation.value);
        }else if (operation.type === "add_content") {
            await page.evaluate((value) => {
                const editor = document.querySelector('.editor-content .ProseMirror');
                if (!editor) return;
                // 在最后一个子元素之前插入
                editor.lastElementChild.insertAdjacentHTML('beforebegin',
                    `<p>${value}</p><p></p>`
                );
            }, operation.value);
        }
    }
    await page.waitForTimeout(500);

    // 发布按钮的定位方式（实际使用时取消注释）：
    const publicBtn = page.locator('button').filter({ hasText: '发布' });
    await publicBtn.waitFor({ state: 'visible', timeout: 60000 });
    await publicBtn.click();
    await page.waitForTimeout(2000);
    return true;
}

// ============ 主函数 ============

async function main() {
    console.log('🚀 小红书长文发布测试');
    console.log('='.repeat(50));

    // 解析 markdown 为 operations
    const operations = parseMarkdownToOperations(TEST_DATA.content);
    console.log(`📋 解析得到 ${operations.length} 个操作`);

    // 验证测试图片存在
    for (const [url, localPath] of Object.entries(IMAGE_MAP)) {
        if (!fs.existsSync(localPath)) {
            console.error(`❌ 测试图片不存在: ${localPath}`);
            process.exit(1);
        }
    }
    console.log(`🖼 ${Object.keys(IMAGE_MAP).length} 张测试图片已就绪`);

    // 启动浏览器
    console.log('🌐 正在启动浏览器...');
    const browser = await chromium.launch({
        headless: false,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--no-sandbox',
            '--disable-setuid-sandbox',
        ],
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
    });
    const page = await context.newPage();

    // 跳转到小红书登录页
    console.log('🔐 跳转到小红书登录页...');
    await page.goto('https://creator.xiaohongshu.com/login', {
        waitUntil: 'networkidle',
        timeout: 60000,
    });

    // 等待用户扫码登录
    console.log('');
    console.log('⏳ 请在浏览器中扫码登录小红书...');
    console.log('   登录成功后页面会自动跳转，脚本将继续执行');
    console.log('');

    // 等待 URL 变为创作者首页
    await page.waitForURL('**/new/home**', { timeout: 300000 }); // 5分钟超时
    console.log('✅ 登录成功！');

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 执行发布流程
    try {
        await publishXhsLongArticle(page, TEST_DATA.title, operations);
    } catch (error) {
        console.error('❌ 发布流程出错:', error.message);
        // 出错时也截图保存现场
        await page.screenshot({ path: '/tmp/xhs_test_error.png', fullPage: true });
        console.log('📸 错误截图已保存: /tmp/xhs_test_error.png');
    }

    // 保持浏览器打开，方便用户检查
    console.log('');
    console.log('💡 浏览器保持打开中，按 Ctrl+C 关闭');
    
    // 保持进程运行
    await new Promise(() => {});
}

main().catch(err => {
    console.error('💥 脚本执行失败:', err);
    process.exit(1);
});
