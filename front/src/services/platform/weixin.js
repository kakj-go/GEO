
class Weixin {
    async sendArticle(page, send_markdown, browserContentDir, getImageLocalPath) {
        await page.waitForTimeout(2000);
        // ==================== 步骤1：进入微信公众号文章编辑页 ====================
        const currentUrl = page.url();
        const urlObj = new URL(currentUrl);
        const token = urlObj.searchParams.get('token');
        if (!token) {
            throw new Error("未能从当前 URL 中获取到 token，请检查是否已登录");
        }
        const timestamp = Date.now();
        const targetUrl = `https://mp.weixin.qq.com/cgi-bin/appmsg?t=media/appmsg_edit_v2&action=edit&isNew=1&type=77&createType=0&token=${token}&lang=zh_CN&timestamp=${timestamp}`;
        await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
        try {
            await page.waitForSelector('#title', { timeout: 10000 });
        } catch (e) {
            throw new Error("编辑器元素加载超时，可能页面结构有变化或网络较慢")
        }

        // ==================== 步骤2: 填写标题 ====================
        // 微信公众号标题输入框
        const titleInput = page.locator('#title');
        await titleInput.waitFor({ state: 'visible', timeout: 15000 });
        await titleInput.click();
        await titleInput.fill(send_markdown.title);
        await page.waitForTimeout(500);
        // ==================== 步骤3: 填写正文 ====================
        const editorArea = page.locator('.ProseMirror[contenteditable="true"]');
        await editorArea.waitFor({ state: 'visible', timeout: 15000 });
        await editorArea.click();

        // 处理操作内容
        let firstImage = ""
        for (const operation of send_markdown.operations) {
            if (operation.type === "add_title") {
                //  点击选中字体
                const fontSizeInput = page.locator('.edui-for-fontsize input');
                await fontSizeInput.click();
                await fontSizeInput.fill("24px");
                await page.keyboard.press('Enter');
                await page.waitForTimeout(1000);
                // 输入标题文字
                await page.keyboard.type(operation.value);
                await page.waitForTimeout(500);
                // 回车
                await page.keyboard.press('Enter');
                await page.waitForTimeout(500);
            } else if (operation.type === "add_content") {
                // 点击17px字体
                const fontSizeInput = page.locator('.edui-for-fontsize input');
                await fontSizeInput.click();
                await fontSizeInput.fill("17px");
                await page.keyboard.press('Enter');
                await page.waitForTimeout(1000);
                // 输入内容
                await page.keyboard.type(operation.value);
                await page.waitForTimeout(500);
                // 回车
                await page.keyboard.press('Enter');
                await page.waitForTimeout(500);
            } else if (operation.type === "add_image") {
                // 点击图片按钮
                await page.locator("#js_editor_insertimage").first().click()
                // 点击本地上传
                const imageLocalPath = getImageLocalPath(operation.value, browserContentDir);
                async function handleFileChooser(fileChooser) {
                    await fileChooser.setFiles(imageLocalPath);
                }
                page.once('filechooser', handleFileChooser);
                await page.locator("#js_editor_insertimage li:has-text(\"本地上传\")").first().click()
                await page.waitForLoadState('networkidle')
                await page.waitForTimeout(1000);

                if (firstImage === "") {
                    firstImage = imageLocalPath
                }
            }
        }

        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        if (firstImage !== "") {
            // 建议写法
            const coverArea = page.locator("#js_cover_area");
            await coverArea.scrollIntoViewIfNeeded(); // 确保它在可视范围内，否则 hover 会失效
            await coverArea.hover();
            await page.waitForTimeout(500);
            // Hover 后，等待那个隐藏的按钮出现并点击
            const selectFromPostBtn = page.locator("a:has-text(\"从正文选择\"):visible");
            await selectFromPostBtn.click();
            await page.waitForTimeout(1000);
            await page.evaluate(() => {
                const items = document.querySelectorAll('.img_crop_panel .appmsg_content_img_list .appmsg_content_img_item');
                if (items.length > 0) {
                    items[0].click()
                }
            });
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000);

            await page.locator(".weui-desktop-btn_wrp button:has-text(\"下一步\")").click()
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);

            await page.locator(".weui-desktop-dialog__ft .weui-desktop-btn_wrp button:has-text(\"确认\")").click()
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(5000);
        }

        // ==================== 步骤4: 发表 ====================
        await page.locator(".tool_bar button:has-text(\"发表\")").click()
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);

        const jixufabiao = page.locator("button:has-text(\"继续发表\")")
        if (jixufabiao && jixufabiao.isVisible()) {
            await jixufabiao.click()
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);
        }

        const switchByn = page.locator(".mass_send__notify .weui-desktop-switch")
        if (switchByn && switchByn.isVisible) {
            await switchByn.click()
            await page.waitForLoadState('networkidle');
            // 发表
            await page.locator(".mass-send__footer button:has-text(\"发表\")").click()
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(3000);

            const jixufabiao = page.locator(".weui-desktop-dialog__ft button:has-text(\"继续发表\")")
            if (jixufabiao && jixufabiao.isVisible()) {
                await jixufabiao.click()
                await page.waitForLoadState('networkidle');
                await page.waitForTimeout(5000);
            }
        }
        return true;
    }

    async sendVideo(page, sendItem, browserContentDir, getVideoLocalPath) {
        throw new Error("微信公众号暂不支持视频发布");
    }

    async getUserInfo(page, executeJavaScript) {
        let username = "未知";
        let avatarUrl = "";

        avatarUrl = await executeJavaScript(page, `document.querySelector(".weui-desktop-person_info img").src`);
        username = await page.locator('.weui-desktop-person_info .weui-desktop_name').textContent();
        return { username, avatarUrl };
    }
}

const helper = require('./helper');
module.exports = helper(new Weixin(), 'Weixin');
