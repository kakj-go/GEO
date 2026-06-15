
class Csdn {
    async sendArticle(page, send_markdown, browserContentDir, getImageLocalPath) {
        await page.waitForTimeout(2000);

        // 导航到 CSDN 文章编辑页面
        await page.goto('https://mp.csdn.net/edit', { waitUntil: 'networkidle' });
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // 如果出现模版选择弹窗，关闭它
        const cancelBtn = await page.$('.modal__inner-1 .normal-cancel-btn');
        if (cancelBtn && cancelBtn.isVisible()) {
            await cancelBtn.click();
            await page.waitForTimeout(1000);
        }

        // ==================== 步骤1: 填写标题 ====================
        console.log('步骤1: 填写文章标题...');
        const titleInput = page.locator('input[placeholder*="请输入文章标题"]');
        await titleInput.waitFor({ state: 'visible', timeout: 15000 });
        await titleInput.click();
        await titleInput.fill(send_markdown.title);
        await page.waitForTimeout(500);

        // ==================== 步骤2: 填写正文 ====================
        console.log('步骤2: 填写文章正文...');
        // 点击 Markdown 编辑区域
        const editorArea = page.locator('.markdown-highlighting').first();
        await editorArea.click();

        // 清空
        const isMac = process.platform === 'darwin';
        const modifier = isMac ? 'Meta' : 'Control';
        await page.keyboard.press(`${modifier}+A`);
        await page.keyboard.press('Backspace');
        await page.waitForTimeout(500);

        // 处理操作内容
        for (const operation of send_markdown.operations) {
            if (operation.type === "add_title") {
                // 输入标题（Markdown 格式）
                await page.keyboard.type(`# ${operation.value}`);
                await page.keyboard.press('Enter');
                await page.waitForTimeout(500);
            } else if (operation.type === "add_content") {
                await page.keyboard.type(operation.value);
                await page.keyboard.press('Enter');
                await page.waitForTimeout(500);
            } else if (operation.type === "add_image") {
                // 点击工具栏的"图片"按钮
                await page.keyboard.press('Control+Shift+G');

                // 找到隐藏的文件输入框并上传图片
                const imageLocalPath = getImageLocalPath(operation.value, browserContentDir);

                // 1. 设置监听的同时触发点击
                const [fileChooser] = await Promise.all([
                    page.waitForEvent('filechooser'),
                    page.click(".uploadPicture input") // 触发文件选择器的操作
                ]);
                // 2. 选定文件（这会自动关闭选择器对话框）
                await fileChooser.setFiles(imageLocalPath);
                // 等待图片上传完成
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(3000);
                await page.keyboard.press('Escape');
                // 移动到最后
                await page.keyboard.press('PageDown');
                await page.waitForTimeout(500);
                console.log('图片上传完成！');
            }
        }

        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // ==================== 步骤3: 发布文章 ====================
        console.log('步骤3: 点击发布文章...');
        // 使用 locator 更加稳健
        await page.click('button.btn-publish, button:has-text("发布文章")');
        await page.waitForTimeout(2000);

        // 处理发布设置弹窗 — 添加文章标签
        console.log('添加文章标签...');
        // 修正1：使用 await 获取元素句柄
        const addTagBtn = await page.$('.mark_selection button:has-text("添加文章标签")');

        if (addTagBtn) {
            await addTagBtn.click();
            await page.waitForTimeout(1000);

            const tagInput = await page.$(".mark_selection_box_header input");
            if (tagInput) {
                await tagInput.click();
                // 修正2：使用 type 输入文字，而不是 press
                await page.keyboard.type('经验分享');
                await page.waitForTimeout(1000);

                // 修正3：重命名变量，避免与外层 addTagBtn 冲突
                const tagItem = await page.$('.el-scrollbar li:has-text("经验分享")');
                if (tagItem) {
                    await tagItem.click();
                }
            }

            // 关闭标签选择弹窗
            const tagCloseBtn = await page.$('.mark_selection_box_body .modal__close-button');
            if (tagCloseBtn) {
                await tagCloseBtn.click();
                await page.waitForTimeout(500);
            }
        }

        // 点击最终的"发布文章"按钮
        const publishButtons = await page.$$('.modal__button-bar button:has-text("发布文章")');
        // 选择弹窗中的发布按钮（通常是最后一个）
        if (publishButtons.length > 0) {
            await publishButtons[publishButtons.length - 1].click();
        }

        // 等待发布完成
        await page.waitForTimeout(5000);
        console.log('文章发布成功！');
        return true;
    }

    async sendVideo(page, sendItem, browserContentDir, getVideoLocalPath) {
        throw new Error("CSDN暂不支持视频发布");
    }

    async getUserInfo(page, executeJavaScript) {
        let username = "未知";
        let avatarUrl = "";

        try {
            // 导航到 CSDN 内容管理后台
            await page.goto('https://mp.csdn.net/');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            // 获取用户名称
            username = await page.evaluate(() => {
                // 尝试多种选择器匹配用户名
                const nameEl = document.querySelector('.name, .username, .user-name, .nick-name');
                return nameEl ? nameEl.textContent.trim() : '';
            });

            // 获取用户头像URL
            avatarUrl = await page.evaluate(() => {
                const imgs = document.querySelectorAll('img');
                for (let img of imgs) {
                    if (img.src && img.src.includes('profile-avatar')) {
                        return img.src;
                    }
                }
                // 备选：尝试获取带有 avatar 相关类名的图片
                const avatarImg = document.querySelector('.avatar img, .user-avatar img, img.avatar');
                return avatarImg ? avatarImg.src : '';
            });

            console.log('CSDN 用户名:', username);
            console.log('CSDN 头像URL:', avatarUrl);
        } catch (e) {
            console.error('获取 CSDN 用户信息失败:', e);
        }

        return { username, avatarUrl };
    }
}

const helper = require('./helper');
module.exports = helper(new Csdn(), 'Csdn');
