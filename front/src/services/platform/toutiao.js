
class Toutiao {
    async jiaoDian(page) {
        // 1. 点击编辑器获取焦点
        await page.locator('.ProseMirror').click();
        // 2. 先导航到最后
        await page.evaluate(() => {
            const editor = document.querySelector('.ProseMirror');
            if (!editor) return;

            editor.focus();
            // 创建选区并放到最后
            const range = document.createRange();
            const selection = window.getSelection();
            // 选中所有内容
            range.selectNodeContents(editor);
            // 折叠到末尾
            range.collapse(false);
            selection.removeAllRanges();
            selection.addRange(range);
        });
        // 3. 输入一个字符再删除
        await page.keyboard.type('x', { delay: 50 });
        await page.keyboard.press('Backspace', { delay: 50 });
        await page.waitForTimeout(100);
    }

    async sendArticle(page, send_markdown, browserContentDir, getImageLocalPath) {
        await page.waitForTimeout(2000)

        await page.locator('.byte-menu').getByRole('link', { name: '文章' }).click();
        await page.waitForTimeout(2000);
        await page.waitForLoadState('networkidle');

        const close = page.locator(".ai-assistant-panel .close-btn")
        if (close) {
            await page.click(".ai-assistant-panel .close-btn")
            await page.waitForTimeout(500);
        }

        // 给 '.publish-editor-title textarea' 输入内容
        await page.waitForSelector(".editor-title", { timeout: 500 });
        await page.waitForSelector('.editor-title textarea', { timeout: 500 });
        await page.fill('.editor-title textarea', send_markdown.title);

        // 1. 点击编辑器获取焦点
        await this.jiaoDian(page)

        for (const operation of send_markdown.operations) {
            if (operation.type === "add_title") {
                await page.evaluate((value) => {
                    const editor = document.querySelector('.ProseMirror');
                    if (!editor) return;
                    // 在最后一个子元素之前插入
                    editor.lastChild.insertAdjacentHTML('beforebegin',
                        `<h1 spellCheck="false" className="pgc-h-forward-slash" data-track="1">${value}</h1>`
                    );
                }, operation.value);
            } else if (operation.type === "add_content") {
                await page.evaluate((value) => {
                    const editor = document.querySelector('.ProseMirror');
                    if (!editor) return;
                    // 在最后一个子元素之前插入
                    editor.lastChild.insertAdjacentHTML('beforebegin',
                        `<p data-track="2">${value}</p>`
                    );
                }, operation.value);
            } else if (operation.type === "add_image") {
                // 1. 点击编辑器获取焦点
                await page.locator('.ProseMirror').click();
                // 2. 先导航到最后
                await page.evaluate(() => {
                    const editor = document.querySelector('.ProseMirror');
                    if (!editor) return;
                    editor.focus();
                    // 创建选区并放到最后
                    const range = document.createRange();
                    const selection = window.getSelection();
                    // 选中所有内容
                    range.selectNodeContents(editor);
                    // 折叠到末尾
                    range.collapse(false);
                    selection.removeAllRanges();
                    selection.addRange(range);
                });
                // 3. 输入一个字符再删除
                await page.keyboard.type('x', { delay: 50 });
                await page.keyboard.press('Backspace', { delay: 50 });
                await page.waitForTimeout(100);

                // 点击上传图片按钮
                await page.click('.syl-toolbar-tool.image.static button')
                // 上传图片
                await page.waitForSelector('.btn-upload-handle.upload-handler', { visible: true, timeout: 10000 });
                const imageLocalPath = getImageLocalPath(operation.value, browserContentDir);
                await page.setInputFiles('.btn-upload-handle.upload-handler input', imageLocalPath);
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(3000);
                // 确认上传
                await page.click(".confirm-btns .byte-btn-primary")
                // 等
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(1000);

                await this.jiaoDian(page)
            }
        }

        // 点击预览
        await page.click('.publish-footer .byte-btn-default:has-text("预览")')
        await page.waitForTimeout(2000);

        await page.click(".publish-footer .byte-btn-primary")
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // 关闭激励计划
        const closeIcon = page.locator('.byte-modal-close-icon');
        if (await closeIcon.isVisible()) {
            await closeIcon.click();
        }
    }

    async sendVideo(page, sendItem, browserContentDir, getVideoLocalPath) {
        throw new Error("今日头条暂不支持视频发布");
    }

    async getUserInfo(page, executeJavaScript) {
        let username = await executeJavaScript(page, `document.querySelector('.auth-avator-name').innerText`)
        let avatarUrl = await executeJavaScript(page, `document.querySelector(".auth-avator-img").src`)
        return { username, avatarUrl }
    }
}

const helper = require('./helper');
module.exports = helper(new Toutiao(), 'Toutiao');
