
class Qie {
    async sendArticle(page, send_markdown, browserContentDir, getImageLocalPath) {
        await page.waitForTimeout(2000);

        // ==================== 步骤1：进入企鹅号文章编辑页 ====================
        await page.goto('https://om.qq.com/main/creation/article', { waitUntil: 'networkidle' });
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);

        // 清空
        const chexiao = page.locator(".omui-countdowntip a:has-text(\"撤销\")")
        if (chexiao && chexiao.isVisible()) {
            chexiao.click()
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
        }

        // ==================== 步骤2: 填写标题 ====================
        const titleInput = page.locator('.omui-articletitle__title1 .omui-inputautogrowing__inner');
        await titleInput.waitFor({ state: 'visible', timeout: 15000 });
        await titleInput.click();
        await titleInput.type(send_markdown.title);
        await page.waitForTimeout(500);

        // ==================== 步骤3: 填写正文 ====================
        // 企鹅号使用富文本编辑器
        const editorArea = page.locator('.ProseMirror[contenteditable="true"]').first();
        await editorArea.waitFor({ state: 'visible', timeout: 15000 });
        await editorArea.click();

        // 处理操作内容
        let firstImage = ""
        for (const operation of send_markdown.operations) {
            if (operation.type === "add_title") {
                await page.keyboard.type(operation.value);
                await page.keyboard.press('Control+Alt+1');
                await page.keyboard.press('Enter');
                await page.waitForTimeout(500);
            } else if (operation.type === "add_content") {
                await page.keyboard.type(operation.value);
                await page.keyboard.press('Enter');
                await page.waitForTimeout(500);
            } else if (operation.type === "add_image") {
                await page.locator('.exeditor-toolbar exeditor-toolbar-button[data-toolbar-item-of="imagePlugin"]').click();
                // 点击本地上传
                const imageLocalPath = getImageLocalPath(operation.value, browserContentDir);
                async function handleFileChooser(fileChooser) {
                    await fileChooser.setFiles(imageLocalPath);
                }
                page.once('filechooser', handleFileChooser);
                await page.locator(".omui-tab__content .omui-upload-image").click()
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(3000);
                // 确定
                await page.locator(".omui-dialog--lg .omui-dialog-footer button:has-text(\"确认\")").click()
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(3000);
                // 回车
                await page.keyboard.press('Enter');
                await page.waitForTimeout(500);
                await page.keyboard.press('Control+Shift+L');
                await page.waitForTimeout(500);

                if (firstImage === "" ) {
                    firstImage = imageLocalPath
                }
            }
        }

        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        // 上传封面
        // if (firstImage !== "") {
        //     await page.locator(".omui-form__body .omui-button--add").first().click()
        //     await page.waitForLoadState('networkidle');
        //     await page.waitForTimeout(1000);
        //
        //     let shangchuan = page.locator(".omui-tab__nav .omui-tab__label:has-text(\"本地上传\")")
        //     await shangchuan.waitFor({ state: 'visible', timeout: 10000 });
        //     await shangchuan.click()
        //
        //     async function handleFileChooser(fileChooser) {
        //         await fileChooser.setFiles(firstImage);
        //     }
        //     page.once('filechooser', handleFileChooser);
        //     await page.locator(".omui-upload-image .omui-upload-image-trigger").click()
        //     await page.waitForLoadState('networkidle');
        //     await page.waitForTimeout(2000);
        //
        //     await page.locator(".omui-dialog-footer .omui-button--primary").click()
        //     await page.waitForLoadState('networkidle');
        //     await page.waitForTimeout(2000);
        // }
        // 点击声明
        await page.locator('.omui-contentbutton__footer button:has-text("添加内容自主声明")').click();
        await page.waitForTimeout(1000);

        await page.locator(".omui-dialog-body-inner .omui-button--primary").click()
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        // ==================== 步骤4: 发布文章 ====================
        await page.locator(".omui-layout__content footer li:has-text(\"发布\")").click()
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(3000);
        return true;
    }

    async sendVideo(page, sendItem, browserContentDir, getVideoLocalPath) {
        throw new Error("企鹅号暂不支持视频发布");
    }

    async getUserInfo(page, executeJavaScript) {
        // 获取用户名（忽略随机后缀）
        const username = await page.locator('.omui-layout__header--fixed span[class*="usernameText"]').textContent();
        // 获取头像（利用组件库固定前缀）
        const avatarUrl = await page.locator('.omui-layout__header--fixed .omui-avatar img').getAttribute('src');
        return { username, avatarUrl };
    }
}

const helper = require('./helper');
module.exports = helper(new Qie(), 'Qie');
