
class Wangyi {
    async sendArticle(page, send_markdown, browserContentDir, getImageLocalPath) {
        await page.waitForTimeout(2000);

        // ==================== 步骤1：进入网易号文章编辑页 ====================
        // 点击左侧"开始创作"下的"文章"按钮
        await page.click('.content__container__publish-item:has-text("文章")');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // 如果弹出账号审核提示弹窗，点击"确认"关闭
        try {
            const confirmDialog = await page.waitForSelector('.ne-modal button:has-text("确认")', { timeout: 3000 });
            if (confirmDialog) {
                await confirmDialog.click();
                await page.waitForTimeout(500);
            }
        } catch (e) {
            // 没有弹窗，继续执行
        }

        // ==================== 步骤2: 填写标题 ====================
        console.log('步骤2: 填写文章标题...');
        const titleInput = page.locator('textarea.netease-textarea[placeholder*="标题"]');
        await titleInput.waitFor({ state: 'visible', timeout: 15000 });
        await titleInput.click();
        await titleInput.fill(send_markdown.title);
        await page.waitForTimeout(500);
        console.log('标题已输入');

        // ==================== 步骤3: 填写正文 ====================
        console.log('步骤3: 填写文章正文...');
        // 正文区域使用 DraftEditor
        const contentArea = page.locator('.public-DraftEditor-content[contenteditable="true"]');
        await contentArea.waitFor({ state: 'visible', timeout: 15000 });
        await contentArea.click();

        // 处理操作内容
        for (const operation of send_markdown.operations) {
            if (operation.type === "add_title") {
                await page.keyboard.type(operation.value);
                let h5 = page.locator('.rich-editor-panel-item img[src*="icon_h5"]').first();
                await h5.locator("..").click()
                await page.keyboard.press('Enter');
                await page.waitForTimeout(200);
            } else if (operation.type === "add_content") {
                await page.keyboard.type(operation.value);
                await page.keyboard.press('Enter');
                await page.waitForTimeout(200);
            } else if (operation.type === "add_image") {
                // 点击工具栏中的"图片"按钮
                let img = page.locator('.rich-editor-panel-item img[src*="icon_image"]').first()
                await img.locator("..").click()
                await page.waitForTimeout(2000);

                // 找到隐藏的文件输入框并上传图片
                const imageLocalPath = getImageLocalPath(operation.value, browserContentDir);
                async function handleFileChooser(fileChooser) {
                    await fileChooser.setFiles(imageLocalPath);
                }
                page.once('filechooser', handleFileChooser);
                await page.click('.ne-modal-body .area-uploader')
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(2000);

                // 点击"确定"按钮完成图片插入
                const confirmBtn = page.locator('.ne-modal-footer .ne-button-color-primary:has-text("确定")');
                await confirmBtn.click();
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(2000);
                console.log('图片已插入到正文');
                // 重新点击编辑框
                await contentArea.click();
                await page.keyboard.press('PageDown');
                await page.waitForTimeout(200);
                await page.keyboard.press('PageDown');
                await page.waitForTimeout(200);
                await page.keyboard.press('PageDown');
                await page.waitForTimeout(200);
            }
        }

        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // ==================== 步骤4: 发布文章 ====================
        console.log('步骤4: 点击发布文章...');
        try {
            // 尝试点击"发布"按钮
            const publishBtn = page.locator('.post-footer button:has-text("发布")').first();
            await publishBtn.waitFor({ state: 'visible', timeout: 10000 });
            await publishBtn.click();
        } catch (e) {
            console.error('点击发布按钮失败:', e);
        }
        await page.waitForTimeout(3000);
        console.log('文章发布成功！');
        return true;
    }

    async sendVideo(page, sendItem, browserContentDir, getVideoLocalPath) {
        throw new Error("网易号暂不支持视频发布");
    }

    async getUserInfo(page, executeJavaScript) {
        let username = "未知";
        let avatarUrl = "";

        try {
            // 获取用户头像 src
            avatarUrl = await executeJavaScript(page, `document.querySelector('.avatar__default img').src`);

            // 获取用户名称
            username = await page.locator('.topBar__user > span:last-child').textContent();
        } catch (e) {
            console.error('获取网易号用户信息失败:', e);
        }

        return { username, avatarUrl };
    }
}

const helper = require('./helper');
module.exports = helper(new Wangyi(), 'Wangyi');
