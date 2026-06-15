const { chromium } = require('playwright');

(async () => {
    // 启动浏览器（使用已有的用户数据目录以保持登录状态）
    const browser = await chromium.launchPersistentContext(
        'C:/Users/23574/AppData/Local/Google/Chrome/User Data', // Chrome 用户数据路径，根据实际情况修改
        {
            headless: false,
            channel: 'chrome',
            viewport: { width: 1500, height: 800 },
            args: ['--profile-directory=Default'] // 使用默认配置文件
        }
    );

    const page = await browser.newPage();

    // ==================== 第一步：获取用户头像和名称 ====================
    console.log('=== 第一步：获取用户头像和名称 ===');

    // 导航到简书设置页面
    await page.goto('https://www.jianshu.com/settings/basic', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // 获取用户头像 URL
    const avatarUrl = await page.evaluate(() => {
        const img = document.querySelector('img[src*="upload_avatars"]');
        return img ? img.src : null;
    });
    console.log('用户头像 URL:', avatarUrl);

    // 获取用户昵称
    const nickname = await page.inputValue('input[placeholder="请输入昵称"]');
    console.log('用户昵称:', nickname);

    // ==================== 第二步：跳转到写作页面 ====================
    console.log('=== 第二步：跳转到写作页面 ===');

    await page.goto('https://www.jianshu.com/writer#/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);

    // ==================== 第三步：点击新建文章 ====================
    console.log('=== 第三步：新建文章 ===');

    // 点击 "新建文章" 按钮
    await page.click('div._1GsW5');
    await page.waitForTimeout(2000);

    // ==================== 第四步：输入标题 ====================
    console.log('=== 第四步：输入标题 ===');

    // 清空并输入文章标题
    const titleInput = page.locator('input._1CtV4');
    await titleInput.click();
    await titleInput.fill(''); // 先清空
    await titleInput.fill('这是文章标题'); // 替换为你想要的标题
    await page.waitForTimeout(1000);

    // ==================== 第五步：输入正文标题（H1） ====================
    console.log('=== 第五步：输入正文标题 ===');

    // 点击编辑区域获取焦点
    const editor = page.locator('div.kalamu-area');
    await editor.click();
    await page.waitForTimeout(500);

    // 点击工具栏的 H1 按钮插入正文标题
    // 先展开标题下拉菜单
    await page.click('a.fa.fa-undefined.jLrZL'); // H1 下拉按钮
    await page.waitForTimeout(500);

    // 选择 H1
    // 通过文本匹配 H1 子菜单项
    const h1Items = page.locator('ul._3LYoB li a').filter({ hasText: 'H1' });
    await h1Items.first().click();
    await page.waitForTimeout(500);

    // 输入正文标题文字
    await page.keyboard.type('这是正文标题');
    await page.waitForTimeout(500);

    // ==================== 第六步：输入正文内容 ====================
    console.log('=== 第六步：输入正文内容 ===');

    // 按回车换行，然后输入正文
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // 输入正文内容
    await page.keyboard.type('这是正文内容。这里可以替换为你想要的任意正文文字。');
    await page.waitForTimeout(1000);

    // ==================== 第七步：点击图片按钮并上传图片 ====================
    console.log('=== 第七步：上传图片 ===');

    // 点击工具栏的图片按钮
    await page.click('a.fa.fa-picture-o');
    await page.waitForTimeout(1500);

    // 等待上传对话框出现
    await page.waitForSelector('div._23VW8', { state: 'visible', timeout: 5000 });

    // 找到隐藏的 file input 并上传文件
    const fileInput = page.locator('div._23VW8 input[type="file"]');
    await fileInput.setInputFiles('C:/Users/23574/Pictures/R-C.jpg');
    console.log('图片已上传: C:/Users/23574/Pictures/R-C.jpg');

    // 等待图片上传完成
    await page.waitForTimeout(3000);

    console.log('=== 全部操作完成 ===');
    console.log('用户头像:', avatarUrl);
    console.log('用户昵称:', nickname);

    // 保持浏览器打开，方便查看结果（如需自动关闭，取消下一行注释）
    // await browser.close();
})();