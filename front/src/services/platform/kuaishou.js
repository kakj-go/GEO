
class Kuaishou {
    async sendArticle(page, send_markdown, browserContentDir, getImageLocalPath) {
        await page.waitForTimeout(2000)

        // 点击高清发布
        const publishNoteBtn = page.locator('.publish-button');
        await publishNoteBtn.waitFor({ state: 'visible', timeout: 15000 });
        await publishNoteBtn.click();

        // 点击上传图文
        const fabuwenzhang = page.locator('.ant-tabs-nav-list div:has-text("上传图文")').last();
        await fabuwenzhang.waitFor({ state: 'visible', timeout: 15000 });
        await fabuwenzhang.click();
        await page.waitForTimeout(500);

        // 上传图片
        let firstImage = ""
        for (const operation of send_markdown.operations) {
            if (operation.type === "add_image") {
                firstImage = getImageLocalPath(operation.value, browserContentDir);
                break
            }
        }
        if (firstImage === "") {
            throw "快手最少需要引用一张图片作为封面图"
        }
        async function handleFileChooser(fileChooser) {
            await fileChooser.setFiles(firstImage);
        }
        page.once('filechooser', handleFileChooser);
        const tuwen = page.locator('.ant-tabs-content-holder button:has-text("上传图片")').last();
        await tuwen.click();
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(1000);

        // 设置内容
        for (const operation of send_markdown.operations) {
            if (operation.type === "add_title") {
                await page.evaluate((value) => {
                    const editor = document.querySelector('#work-description-edit');
                    if (!editor) return;
                    editor.innerHTML += `<div>${value}</div>`;
                }, operation.value);
            }else if (operation.type === "add_content") {
                await page.evaluate((value) => {
                    const editor = document.querySelector('#work-description-edit');
                    if (!editor) return;
                    editor.innerHTML += `<div>${value}</div>`;
                }, operation.value);
            }
        }

        // 上传图片
        for (const operation of send_markdown.operations) {
            if (operation.type === "add_image") {
                const imageAddress = getImageLocalPath(operation.value, browserContentDir);
                if (imageAddress === firstImage) {
                    continue
                }

                async function handleFileChooser(fileChooser) {
                    await fileChooser.setFiles(imageAddress);
                }
                page.once('filechooser', handleFileChooser);

                await page.locator(".ant-tabs-content-holder div:has-text(\"添加图片\")").last().click()
                await page.waitForLoadState('networkidle')
                await page.waitForTimeout(3000);
            }
        }

        // 发布
        await page.locator('.ant-tabs-content-holder div >> text="发布"').last().click();
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000);
    }

    async sendVideo(page, sendItem, browserContentDir, getVideoLocalPath) {
        await page.waitForTimeout(2000)

        await page.click(".publish-button__text")
        await page.waitForTimeout(1000)
        await page.waitForLoadState('networkidle')

        // 上传视频
        const videoLocalPath = getVideoLocalPath(sendItem.video_url, browserContentDir);
        async function handleFileChooser(fileChooser) {
            await fileChooser.setFiles(videoLocalPath);
        }
        // 监听文件框打开
        page.once('filechooser', handleFileChooser);
        await page.click("._upload-btn_1j3uy_87")
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(1000);

        await page.waitForSelector("._phone-item_1eni7_42", {
            state: 'detached'
        });
        await page.waitForSelector("._phone-item_1eni7_42", {
            state: 'hidden'
        });

        const close = page.locator('._close_d7f44_29');
        if (await close.count() > 0 && await close.isVisible()) {
            await page.click("._close_d7f44_29")
        }

        const element = page.locator('._description_eho7l_59');
        if (await element.count() > 0) {
            await element.hover();  // 鼠标移入
            await element.click();  // 点击聚焦（如果需要）
            await element.type(sendItem.description);  // 键盘输入
        }
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000);

        // 发布
        await page.locator('._button_3a3lq_1').first().click();
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(2000);
    }

    async getUserInfo(page, executeJavaScript) {
        let username = await executeJavaScript(page, `document.querySelector(".user-info-name").innerText`)
        let avatarUrl = await executeJavaScript(page, `document.querySelector('div.user-info-avatar img').src`)
        return { username, avatarUrl }
    }
}

const helper = require('./helper');
const constants = require("node:constants");
module.exports = helper(new Kuaishou(), 'Kuaishou');
