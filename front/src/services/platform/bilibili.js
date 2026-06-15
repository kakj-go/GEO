
class Bilibili {
    /**
     * 获取编辑器 iframe 的 frameLocator
     * Bilibili 专栏编辑器在 iframe[src*="read-editor"] 内
     */
    getEditorIframe(page) {
        return page.frameLocator('iframe[src*="read-editor"]');
    }

    async sendArticle(page, send_markdown, browserContentDir, getImageLocalPath) {
        await page.waitForTimeout(2000);

        // 导航到专栏发布页面
        await page.goto('https://member.bilibili.com/platform/upload/text/new-edit', { waitUntil: 'domcontentloaded' });
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(3000);

        const editorIframe = page.frameLocator('iframe[src*="read-editor"]');
        // 等待标题输入框出现
        await editorIframe.locator('textarea.title-input__inner').waitFor({ state: 'visible', timeout: 15000 });
        console.log('文章编辑器已加载');

        // ==================== 步骤3: 填写标题 ====================
        console.log('步骤3: 填写标题...');
        const titleInput = editorIframe.locator('textarea.title-input__inner');
        await titleInput.click();
        await titleInput.fill(send_markdown.title);
        await page.waitForTimeout(2000);

        const editor = editorIframe.locator('div.tiptap.ProseMirror.eva3-editor').first();
        await editor.click();
        // 3. 处理操作内容
        for (const operation of send_markdown.operations) {
            if (operation.type === "add_title") {
                // 使用剪贴板粘贴方式插入标题，确保 ProseMirror 内部状态同步
                await editor.type(operation.value);
                await page.keyboard.press('Control+Alt+1');
                await page.keyboard.press('Enter');
                await page.waitForTimeout(1000);
            } else if (operation.type === "add_content") {
                await editor.type(operation.value);
                await page.keyboard.press('Enter');
                await page.waitForTimeout(1000);
            } else if (operation.type === "add_image") {
                const imageLocalPath = getImageLocalPath(operation.value, browserContentDir);
                async function handleFileChooser(fileChooser) {
                    await fileChooser.setFiles(imageLocalPath);
                }
                page.once('filechooser', handleFileChooser);
                const imageToolbarBtn = editorIframe.locator('eva3-toolbar-image');
                await imageToolbarBtn.click();
                await page.waitForTimeout(3000);
            }
        }

        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);

        // 4. 点击发布（在 iframe 内）
        // try {
        //     const publishBtn = editorIframe.locator('button.vui_button', { hasText: '保存为草稿' });
        //     await publishBtn.waitFor({ state: 'visible', timeout: 10000 });
        //     await publishBtn.click();
        // } catch (e) {
        //     // 备选：尝试其他选择器
        //     try {
        //         const publishBtn = editorIframe.locator('button:has-text("保存为草稿")').first();
        //         await publishBtn.waitFor({ state: 'visible', timeout: 5000 });
        //         await publishBtn.click();
        //     } catch (e2) {
        //         // 最后尝试在主页面查找
        //         const publishBtn = page.locator('button:has-text("保存为草稿")').first();
        //         await publishBtn.click();
        //     }
        // }

        try {
            const publishBtn = editorIframe.locator('button.vui_button--blue', { hasText: '发布' });
            await publishBtn.waitFor({ state: 'visible', timeout: 10000 });
            await publishBtn.click();
        } catch (e) {
            // 备选：尝试其他选择器
            try {
                const publishBtn = editorIframe.locator('button:has-text("发布")').first();
                await publishBtn.waitFor({ state: 'visible', timeout: 5000 });
                await publishBtn.click();
            } catch (e2) {
                // 最后尝试在主页面查找
                const publishBtn = page.locator('button:has-text("发布")').first();
                await publishBtn.click();
            }
        }

        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(2000);
        return true;
    }

    /**
     * 通过构造剪贴板粘贴事件将 HTML 内容插入 ProseMirror 编辑器
     * ProseMirror 内置 paste handler 会自动解析 HTML 并同步内部文档状态
     * 注意：在 iframe 内执行
     */

    async sendVideo(page, sendItem, browserContentDir, getVideoLocalPath) {
        throw new Error("哔哩哔哩暂时不支持发送视频");
    }

    async getUserInfo(page, executeJavaScript) {
        let username = "未知";
        let avatarUrl = "";
        try {
            // Bilibili 导航栏头像
            await page.locator('.header-avatar-wrap').hover();
            await page.waitForTimeout(500);
            avatarUrl = await executeJavaScript(page, `document.querySelector(".header-avatar-wrap--container img").src`);
            username = await executeJavaScript(page, `document.querySelector('.avatar-panel-popover .nickname-item').innerText`);
        } catch (e) {
            // 备选方式获取用户信息
            try {
                avatarUrl = await executeJavaScript(page, `document.querySelector(".header-entry-avatar img").src`);
                username = await executeJavaScript(page, `document.querySelector('.header-entry-mini .nickname').innerText`);
            } catch (e2) {
                console.error('获取用户信息失败:', e2);
            }
        }
        return { username, avatarUrl };
    }
}

const helper = require('./helper');
module.exports = helper(new Bilibili(), 'Bilibili');
