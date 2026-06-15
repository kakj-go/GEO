
class Xiaohongshu {
    async sendArticle(page, send_markdown, browserContentDir, getImageLocalPath) {
        // ===== 步骤 1：点击"发布笔记"按钮 =====
        await page.waitForTimeout(2000);

        const publishNoteBtn = page.locator('.publish-video div:has-text("发布笔记")').first();
        await publishNoteBtn.waitFor({ state: 'visible', timeout: 15000 });
        await publishNoteBtn.click();
        await page.waitForTimeout(1500);

        // ===== 步骤 2：选择"写长文" tab，然后点击"新的创作" =====
        const longArticleTab = page.locator('.upload-container .header-tabs :text-is("写长文")').first();
        await longArticleTab.waitFor({ state: 'visible', timeout: 10000 });
        await longArticleTab.click();
        await page.waitForTimeout(2000);

        // 点击"新的创作"按钮
        let newCreationClicked = false;
        try {
            const btn = page.locator('.upload-content :text-is("新的创作")').first();
            if (await btn.isVisible({ timeout: 3000 })) {
                await btn.click();
                newCreationClicked = true;
            }
        } catch (e) {}

        if (!newCreationClicked) {
            throw new Error('无法找到"新的创作"按钮');
        }

        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1500);

        // ===== 步骤 3：在编辑器中填充标题和内容 =====
        const titleEditor = page.locator('[placeholder*="标题"], [data-placeholder*="标题"]').first();
        await titleEditor.waitFor({ state: 'visible', timeout: 10000 });
        await titleEditor.click();
        await titleEditor.fill(send_markdown.title);
        await page.waitForTimeout(500);

        const contentEditor = page.locator('.ProseMirror[contenteditable="true"]').first();
        await contentEditor.waitFor({ state: 'visible', timeout: 10000 });

        for (const operation of send_markdown.operations) {
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

                // 上传图片
                const imageLocalPath = getImageLocalPath(operation.value, browserContentDir);

                // 监听文件选择器
                const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 15000 });

                // 点击图片上传按钮（工具栏第9个 menu-item）
                const menuItems = await page.locator('.edit-page .menu-item').all();
                if (menuItems.length >= 9) {
                    await menuItems[8].click();
                }

                try {
                    const fileChooser = await fileChooserPromise;
                    await fileChooser.setFiles(imageLocalPath);
                } catch (e) {
                    console.log(`⚠️ 图片上传可能失败: ${e.message}`);
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

        // ===== 步骤 3.5：点击"一键排版" =====
        await page.locator('.footer button:has-text("一键排版")').first().click();
        await page.waitForTimeout(3000);

        // ===== 步骤 4：点击"下一步" =====
        const nextBtn = page.locator('button').filter({ hasText: '下一步' });
        await nextBtn.waitFor({ state: 'visible', timeout: 60000 });
        await nextBtn.click();
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // ===== 步骤 5：在发布页面填充标题和内容描述 =====
        for (const operation of send_markdown.operations) {
            if (operation.type === 'add_title') {
                await page.evaluate((value) => {
                    const editor = document.querySelector('.editor-content .ProseMirror');
                    if (!editor) return;
                    editor.lastElementChild.insertAdjacentHTML('beforebegin',
                        `<p>${value}</p><p></p>`
                    );
                }, operation.value);
            } else if (operation.type === 'add_content') {
                await page.evaluate((value) => {
                    const editor = document.querySelector('.editor-content .ProseMirror');
                    if (!editor) return;
                    editor.lastElementChild.insertAdjacentHTML('beforebegin',
                        `<p>${value}</p><p></p>`
                    );
                }, operation.value);
            }
        }
        await page.waitForTimeout(5000);
        await page.waitForLoadState('networkidle');

        // ===== 步骤 6：点击"发布"按钮 =====
        const publicBtn = page.locator('button').filter({ hasText: '发布' });
        await publicBtn.waitFor({ state: 'visible', timeout: 60000 });
        await publicBtn.click();
        await page.waitForTimeout(2000);
        return true;
    }

    async sendVideo(page, sendItem, browserContentDir, getVideoLocalPath) {
        await page.waitForTimeout(1000)

        await page.click(".menu-panel .publish-video .btn-inner")
        await page.waitForTimeout(1000)
        await page.waitForLoadState('networkidle')

        // 上传视频
        const videoLocalPath = getVideoLocalPath(sendItem.video_url, browserContentDir);
        async function handleFileChooser(fileChooser) {
            await fileChooser.setFiles(videoLocalPath);
        }
        // 监听文件框打开
        page.once('filechooser', handleFileChooser);
        await page.click(".upload-content .custom-button.bg-red")
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000);

        const element = page.locator(".publish-page-content-base .--color-bg-fill");
        await element.hover();  // 鼠标移入
        await element.click();  // 点击聚焦（如果需要）
        await element.type(sendItem.title);  // 键盘输入

        const describe = page.locator(".publish-page-content-base .ProseMirror");
        await describe.hover();  // 鼠标移入
        await describe.click();  // 点击聚焦（如果需要）
        await describe.type(sendItem.description);  // 键盘输入

        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(1000);

        const selector = ".publish-page-publish-btn .custom-button.bg-red";
        await page.waitForFunction((sel) => {
            const el = document.querySelector(sel);
            return el && !el.classList.contains('disabled');
        }, selector, { timeout: 100000 });
        await page.click(selector);

        await page.waitForTimeout(1000)
        await page.waitForLoadState('networkidle')
    }

    async getUserInfo(page, executeJavaScript) {
        let username = await executeJavaScript(page, `document.querySelector(".account-name").innerText`)
        let avatarUrl = await executeJavaScript(page, `document.querySelector('div.avatar img').src`)
        return { username, avatarUrl }
    }
}

const helper = require('./helper');
module.exports = helper(new Xiaohongshu(), 'Xiaohongshu');
