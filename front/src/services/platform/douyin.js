
class Douyin {
    async jiandian(page) {
        // 1. 点击编辑器获取焦点
        await page.locator('.card-container-creator-layout .ProseMirror').first().click();
        // 2. 先导航到最后
        await page.evaluate(() => {
            const editor = document.querySelector('.card-container-creator-layout .ProseMirror');
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
        await page.waitForTimeout(500);
    }

    async sendArticle(page, send_markdown, browserContentDir, getImageLocalPath) {
        await page.waitForTimeout(2000)

        // 点击高清发布
        const publishNoteBtn = page.locator('.douyin-creator-master-layout-sider-children button:has-text("高清发布")').first();
        await publishNoteBtn.waitFor({ state: 'visible', timeout: 15000 });
        await publishNoteBtn.click();

        // 点击发布文章
        const fabuwenzhang = page.locator('.card-container-creator-layout div:has-text("发布文章")').last();
        await fabuwenzhang.waitFor({ state: 'visible', timeout: 15000 });
        await fabuwenzhang.click();
        await page.waitForTimeout(500);

        // 点击我要发文
        const fawen = page.locator('.card-container-creator-layout button:has-text("我要发文")').last();
        await fawen.click();
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(1000);

        // 设置标题
        await page.locator('.card-container-creator-layout .semi-input').first().fill(send_markdown.title);

        // 设置内容
        let firstImage
        for (const operation of send_markdown.operations) {
            if (operation.type === "add_title") {
                await page.evaluate((value) => {
                    const editor = document.querySelector('.card-container-creator-layout .ProseMirror');
                    if (!editor) return;
                    // 在最后一个子元素之前插入
                    editor.lastChild.insertAdjacentHTML('beforebegin',
                        `<h2 elementtiming="douyin_creator_content-element-timing">${value}</h2>`
                    );
                }, operation.value);
            }else if (operation.type === "add_content") {
                await page.evaluate((value) => {
                    const editor = document.querySelector('.card-container-creator-layout .ProseMirror');
                    if (!editor) return;
                    // 在最后一个子元素之前插入
                    editor.lastChild.insertAdjacentHTML('beforebegin',
                        `<p elementtiming="douyin_creator_content-element-timing">${value}</p>`
                    );
                }, operation.value);
            }if (operation.type === "add_image") {
                // 1. 点击编辑器获取焦点
                await this.jiandian(page)

                // 点击插入图片按钮
                await page.evaluateHandle(() => {
                    const items = document.querySelectorAll('.card-container-creator-layout svg');
                    const handler = items[6]
                    handler.parentElement.click()
                });
                await page.waitForLoadState('networkidle')
                await page.waitForTimeout(500);

                // 开启文件监听
                const imageLocalPath = getImageLocalPath(operation.value, browserContentDir);
                async function handleFileChooser(fileChooser) {
                    await fileChooser.setFiles(imageLocalPath);
                }
                page.once('filechooser', handleFileChooser);

                // 点击上传
                const upload = page.locator(".semi-modal-body div:has-text(\"点击上传\")").last()
                await upload.click()
                await page.waitForLoadState('networkidle')
                await page.waitForTimeout(1000);

                const queding = page.locator(".semi-modal-body button:has-text(\"确定\")").last()
                await queding.waitFor({ state: 'visible', timeout: 15000 });
                await queding.click();
                await page.waitForLoadState('networkidle')
                await page.waitForTimeout(500);

                if (!firstImage) {
                    firstImage = imageLocalPath
                }
            }
        }

        if (firstImage) {
            // 等待文件选择栏
            async function handleFileChooser(fileChooser) {
                await fileChooser.setFiles(firstImage);
            }
            page.once('filechooser', handleFileChooser);

            // 上传封面按钮
            await page.locator(".card-container-creator-layout span:has-text(\"点击上传封面图\")").last().click()
            await page.waitForLoadState('networkidle')
            await page.waitForTimeout(1000);

            // 点击确认
            const queren = page.locator(".semi-button-tertiary:has-text(\"替换封面\") ~ button")
            await queren.click()
            await page.waitForLoadState('networkidle')
            await page.waitForTimeout(1000);
        }else{
            throw "抖音最少需要引用一张图片作为封面图"
        }

        await page.locator(".card-container-creator-layout button:has-text(\"发布\")").last().click()
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000);
    }

    async sendVideo(page, sendItem, browserContentDir, getVideoLocalPath) {
        await page.waitForTimeout(2000)

        const closeIcon = page.locator('.douyin-creator-master-button-primary');
        await closeIcon.isVisible()
        await page.click(".douyin-creator-master-button-primary")
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(500);

        await page.locator('.card-container-creator-layout div:text("发布视频")').click();
        await page.waitForTimeout(500);

        // 上传视频
        const videoLocalPath = getVideoLocalPath(sendItem.video_url, browserContentDir);
        async function handleFileChooser(fileChooser) {
            await fileChooser.setFiles(videoLocalPath);
        }
        // 监听文件框打开
        page.once('filechooser', handleFileChooser);
        await page.click(".container-drag-upload-tL99XD .semi-button-primary")
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(1000);

        await page.locator('.container-sGoJ9f .semi-input-default').fill(sendItem.title);

        const element = page.locator('.editor-kit-editor-container .editor-kit-container');
        await element.hover();  // 鼠标移入
        await element.click();  // 点击聚焦（如果需要）
        await element.type(sendItem.description);  // 键盘输入

        await page.waitForSelector(".progressingContent-aigfcP", {
            state: 'detached'
        });
        await page.waitForSelector(".progressingContent-aigfcP", {
            state: 'hidden'
        });
        await page.waitForSelector(".upload-progress-info-QqYo5P", {
            state: 'detached'
        });
        await page.waitForSelector(".upload-progress-info-QqYo5P", {
            state: 'hidden'
        });

        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000);

        // 发布
        await page.locator('.content-confirm-container-Wp91G7 .primary-cECiOJ').click();
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(1000);
    }

    async getUserInfo(page, executeJavaScript) {
        let username = await executeJavaScript(page, `document.querySelector(".name-_lSSDc").innerText`)
        let avatarUrl = await executeJavaScript(page, `document.querySelector(".img-PeynF_").src`)
        return { username, avatarUrl }
    }
}

const helper = require('./helper');
module.exports = helper(new Douyin(), 'Douyin');
