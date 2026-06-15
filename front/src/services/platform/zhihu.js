
class Zhihu {
    async jiaoDian(page) {
        // 1. 点击编辑器获取焦点
        // 知乎的编辑器通常在 .public-DraftEditor-content 或相似的类下
        try {
            const editor = page.locator('.public-DraftEditor-content').first();
            await editor.click();
        } catch (e) {
            await page.click('[contenteditable="true"]');
        }
        
        // 2. 确保焦点并移动到末尾
        await page.evaluate(() => {
            const editor = document.querySelector('.public-DraftEditor-content') || document.querySelector('[contenteditable="true"]');
            if (editor) {
                editor.focus();
            }
        });
        await page.waitForTimeout(100);
    }

    async sendArticle(page, send_markdown, browserContentDir, getImageLocalPath) {
        await page.waitForTimeout(2000);

        // 点击写文章
        // const fabuwenzhang = page.locator('.WriteArea div:has-text("写文章")').last();
        // await fabuwenzhang.waitFor({ state: 'visible', timeout: 15000 });
        // await fabuwenzhang.click();
        await page.goto('https://zhuanlan.zhihu.com/write', { waitUntil: 'networkidle' });
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000);

        // 1. 填充标题
        try {
            await page.waitForSelector('.WriteIndex-titleInput textarea', { timeout: 10000 });
            await page.fill('.WriteIndex-titleInput textarea', send_markdown.title);
        } catch (e) {
            // 备选选择器
            try {
                await page.fill('textarea[placeholder*="标题"]', send_markdown.title);
            } catch (e2) {
                console.error("无法填充标题:", e2);
            }
        }
        await page.waitForTimeout(500);

        // 2. 聚焦正文编辑器
        await this.jiaoDian(page);

        // 3. 处理操作内容
        for (const operation of send_markdown.operations) {
            if (operation.type === "add_title") {
                await page.keyboard.type(operation.value);
                await page.keyboard.press('Control+Alt+1');
                await page.keyboard.press('Enter');
            } else if (operation.type === "add_content") {
                await page.keyboard.type(operation.value);
                await page.keyboard.press('Enter');
            } else if (operation.type === "add_image") {
                const uploadBtn = page.locator('.toolbar-section button:has-text(\"图片\")');
                await uploadBtn.click()

                await page.waitForLoadState('networkidle')
                await page.waitForTimeout(2000); // 等待图片上传

                // 开启文件监听
                const imageLocalPath = getImageLocalPath(operation.value, browserContentDir);
                async function handleFileChooser(fileChooser) {
                    await fileChooser.setFiles(imageLocalPath);
                }
                page.once('filechooser', handleFileChooser);
                const iconBtn = page.locator('//div[text()="本地图片上传"]/preceding-sibling::div[1]');
                await iconBtn.click()
                await page.waitForLoadState('networkidle')
                await page.waitForTimeout(2000); // 等待图片上传

                const charu = page.locator('.Modal-content button:has-text(\"插入图片\")');
                await charu.click()

                await page.waitForLoadState('networkidle')
                await page.waitForTimeout(2000); // 等待图片上传
            }
        }

        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(5000);

        // 4. 点击发布
        const publishBtn = page.locator('.PostEditor-wrapper button:has-text(\"发布\")').last();
        await publishBtn.click();

        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
        return true;
    }

    async sendVideo(page, sendItem, browserContentDir, getVideoLocalPath) {
        throw new Error("知乎文章发布暂不支持视频");
    }

    async getUserInfo(page, executeJavaScript) {
        // 1. 定位到头像图片元素
        // 选择器解释：寻找类名为 Avatar 且位于 AppHeader-profileAvatar 下的 img 标签
        const avatarElement = page.locator('.AppHeader-profileEntry img.Avatar');

        // 2. 获取图片地址 (src)
        const avatarUrl = await avatarElement.getAttribute('src');

        // 3. 获取用户名 (从 alt 属性中提取)
        // 原始文本通常是 "点击打开 [用户名] 的主页"
        const altText = await avatarElement.getAttribute('alt');
        const username = altText ? altText.replace('点击打开', '').replace('的主页', '') : '未知用户';
        console.log(username, avatarUrl)
        return { username, avatarUrl }
    }
}

const helper = require('./helper');
module.exports = helper(new Zhihu(), 'Zhihu');
