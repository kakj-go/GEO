
class Souhu {
    async sendArticle(page, send_markdown, browserContentDir, getImageLocalPath) {
        await page.waitForTimeout(2000)

        const publishNoteBtn = page.locator('.first-page button:has-text("发布内容")').first();
        await publishNoteBtn.waitFor({ state: 'visible', timeout: 15000 });
        await publishNoteBtn.click();
        // 等待发布按钮点击生效
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(1000)
        // 给 .publish-title .draft-publish-title 这个 class 中的子元素 input 填入内容
        await page.fill('.publish-title input', send_markdown.title);
        // 清空
        for (const operation of send_markdown.operations) {
            if (operation.type === "add_title") {
                await page.evaluate((value) => {
                    const editor = document.querySelector('.ql-editor');
                    editor.innerHTML += `<h1>${value}</h1>`;
                }, operation.value);
            }else if (operation.type === "add_content") {
                await page.evaluate((value) => {
                    const editor = document.querySelector('.ql-editor');
                    editor.innerHTML += `<p>${value}</p>`;
                }, operation.value);
            }else if (operation.type === "add_image") {
                // 聚焦到编辑器
                await page.click('.ql-editor');  // 聚焦编辑器
                await page.focus('.ql-editor');
                const isMac = await page.evaluate(() => navigator.platform.includes('Mac'));
                if (isMac) {
                    await page.keyboard.press('Meta+End');  // Mac: Cmd+End
                } else {
                    await page.keyboard.press('Control+End');  // Windows/Linux: Ctrl+End
                }
                await page.waitForTimeout(100);

                // 上传图片
                await page.click(".ql-image");
                await page.waitForSelector('.upload-button', { visible: true, timeout: 10000 });
                const imageLocalPath = getImageLocalPath(operation.value, browserContentDir);
                await page.setInputFiles('#new-file', imageLocalPath);
                await page.waitForTimeout(1000);
                await page.waitForLoadState('networkidle');

                // 确定上传
                await page.click(".local-upload .positive-button")
                await page.waitForTimeout(1000);
                await page.waitForLoadState('networkidle')
            }
        }

        // 确定发布
        await page.locator('.button-list li:has-text("发布")').first().click()
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
    }

    async sendVideo(page, sendItem, browserContentDir, getVideoLocalPath) {
        throw new Error("搜狐号暂不支持视频发布");
    }

    async getUserInfo(page, executeJavaScript) {
        let username = await executeJavaScript(page, `document.querySelector(".user-name").innerText`)
        let avatarUrl = await executeJavaScript(page, `document.querySelector('.user-pic').src`)
        return { username, avatarUrl }
    }
}

const helper = require('./helper');
module.exports = helper(new Souhu(), 'Souhu');
