// src/services/browserManager.js
const fs = require('fs').promises;
const path = require('path');

class BrowserManager {
    constructor() {
        this.browser = null;
        this.context = null;
        this.page = null;
        this.isMonitoring = false;
        this.isFramenavigated = false
        this.logger = null;
    }

    setLogger(logger) {
        this.logger = logger;
    }

    async findChromePath() {
        try {
            const findChrome = require('chrome-finder');
            const chromePath = findChrome();
            this.logger.log('通过 chrome-finder 找到 Chrome 路径:', chromePath);
            return chromePath;
        } catch (error) {
            this.logger.error('chrome-finder 查找失败:', error.message);
            return null;
        }
    }

    // 生成随机指纹数据
    generateFingerprint() {
        // 随机生成浏览器版本号
        const chromeVersion = Math.floor(Math.random() * 10) + 115; // 115-124
        const edgeVersion = Math.floor(Math.random() * 10) + 115; // 115-124
        const firefoxVersion = Math.floor(Math.random() * 10) + 115; // 115-124

        // 随机选择浏览器类型
        const browserType = Math.floor(Math.random() * 3); // 0: Chrome, 1: Edge, 2: Firefox

        let userAgent;
        switch (browserType) {
            case 0: // Chrome
                userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36`;
                break;
            case 1: // Edge
                userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${chromeVersion}.0.0.0 Safari/537.36 Edg/${edgeVersion}.0.0.0`;
                break;
            case 2: // Firefox
                userAgent = `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${firefoxVersion}.0) Gecko/20100101 Firefox/${firefoxVersion}.0`;
                break;
        }

        // 随机选择语言
        const languages = ['zh-CN', 'zh-TW', 'en-US', 'en-GB', 'ja-JP', 'ko-KR', 'fr-FR', 'de-DE'];
        const language = languages[Math.floor(Math.random() * languages.length)];

        // 随机选择时区
        const timezones = ['Asia/Shanghai', 'Asia/Tokyo', 'Asia/Seoul', 'Europe/London', 'Europe/Paris', 'America/New_York', 'America/Los_Angeles'];
        const timezone = timezones[Math.floor(Math.random() * timezones.length)];

        // 返回随机生成的指纹
        return {
            userAgent,
            language,
            timezone
        };
    }

    // 判断是否为哔哩哔哩平台
    isBilibili(data) {
        return (data.record && data.record.platform === 'bilibili') || data.platform === 'bilibili';
    }

    // 获取哔哩哔哩反检测注入脚本 — 在页面加载前注入
    getBilibiliStealthScript() {
        return `
            // 1. 覆盖 navigator.webdriver — B站风控核心检测项
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined,
                configurable: true
            });

            // 2. 移除 Playwright/Chromium 自动化特征属性
            delete window.cdc_adoQpoasnfa76pfcZLmcfl_Array;
            delete window.cdc_adoQpoasnfa76pfcZLmcfl_Promise;
            delete window.cdc_adoQpoasnfa76pfcZLmcfl_Symbol;

            // 3. 伪造 chrome 对象 — B站检测 window.chrome 是否存在
            if (!window.chrome) {
                window.chrome = {
                    runtime: {
                        onMessage: { addListener: function() {}, removeListener: function() {} },
                        onConnect: { addListener: function() {}, removeListener: function() {} },
                        sendMessage: function() {},
                        connect: function() { return { onMessage: { addListener: function() {} }, postMessage: function() {} }; }
                    },
                    loadTimes: function() {
                        return {
                            commitLoadTime: Date.now() / 1000 - Math.random() * 2,
                            connectionInfo: 'h2',
                            finishDocumentLoadTime: Date.now() / 1000 - Math.random(),
                            finishLoadTime: Date.now() / 1000 - Math.random() * 0.5,
                            firstPaintAfterLoadTime: 0,
                            firstPaintTime: Date.now() / 1000 - Math.random() * 1.5,
                            navigationType: 'Other',
                            npnNegotiatedProtocol: 'h2',
                            requestTime: Date.now() / 1000 - Math.random() * 3,
                            startLoadTime: Date.now() / 1000 - Math.random() * 2.5,
                            wasAlternateProtocolAvailable: false,
                            wasFetchedViaSpdy: true,
                            wasNpnNegotiated: true
                        };
                    },
                    csi: function() {
                        return {
                            startE: Date.now(),
                            onloadT: Date.now(),
                            pageT: Math.random() * 1000 + 500,
                            tran: 15
                        };
                    }
                };
            }

            // 4. 伪造 plugins 和 mimeTypes — 空数组会被检测为无头浏览器
            Object.defineProperty(navigator, 'plugins', {
                get: () => {
                    const plugins = [
                        { name: 'Chrome PDF Plugin', filename: 'internal-pdf-viewer', description: 'Portable Document Format' },
                        { name: 'Chrome PDF Viewer', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai', description: '' },
                        { name: 'Native Client', filename: 'internal-nacl-plugin', description: '' }
                    ];
                    plugins.length = 3;
                    return plugins;
                },
                configurable: true
            });

            Object.defineProperty(navigator, 'mimeTypes', {
                get: () => {
                    const mimeTypes = [
                        { type: 'application/pdf', suffixes: 'pdf', description: 'Portable Document Format' },
                        { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format' }
                    ];
                    mimeTypes.length = 2;
                    return mimeTypes;
                },
                configurable: true
            });

            // 5. 伪造 languages — 确保和 context 设置一致
            Object.defineProperty(navigator, 'languages', {
                get: () => ['zh-CN', 'zh', 'en-US', 'en'],
                configurable: true
            });

            // 6. 伪造 hardwareConcurrency 和 deviceMemory
            Object.defineProperty(navigator, 'hardwareConcurrency', {
                get: () => 8,
                configurable: true
            });
            Object.defineProperty(navigator, 'deviceMemory', {
                get: () => 8,
                configurable: true
            });

            // 7. 覆盖 permissions.query — B站会查询 notifications 权限来检测自动化
            const originalQuery = window.navigator.permissions.query;
            window.navigator.permissions.query = (parameters) => {
                if (parameters.name === 'notifications') {
                    return Promise.resolve({ state: Notification.permission });
                }
                return originalQuery(parameters);
            };

            // 8. 伪造 connection 对象 — B站可能检测网络连接类型
            Object.defineProperty(navigator, 'connection', {
                get: () => ({
                    effectiveType: '4g',
                    rtt: 50,
                    downlink: 10,
                    saveData: false
                }),
                configurable: true
            });

            // 9. 防止通过 iframe contentWindow 检测自动化
            const originalAttachShadow = Element.prototype.attachShadow;
            Element.prototype.attachShadow = function(init) {
                if (init && init.mode) {
                    init.mode = 'open';
                }
                return originalAttachShadow.call(this, init);
            };
        `;
    }

    // 获取哔哩哔哩专用的 Context 配置
    getBilibiliContextOptions() {
        return {
            viewport: { width: 1920, height: 1080 },
        };
    }

    // 启动 Chrome 浏览器
    async launchChrome(data) {
        try {
            const { chromium } = require('playwright');

            let chromePath = await this.findChromePath();
            this.logger.log('chromePath: ' + chromePath);
            if (!chromePath) {
                throw new Error('未找到系统安装的 Chrome 浏览器。请确保已安装 Google Chrome。');
            }

            this.logger.log('正在启动 Chrome 浏览器...');
            let launchOptions
            if (data.launchType === "send_article" && data.record.platform === "jin_ri_tou_tiao") {
                launchOptions = {
                    executablePath: chromePath,
                    headless: false,
                    args: [
                        '--no-sandbox',
                        '--disable-gpu',
                        '--no-sandbox',
                        '--disable-blink-features=AutomationControlled',
                        '--disable-extensions',
                        '--disable-dev-shm-usage',
                        '--disable-infobars',
                        '--disable-notifications',
                        '--disable-popup-blocking',
                        '--ignore-certificate-errors',
                        '--disable-web-security',
                        '--disable-features=site-per-process',
                        '--disable-features=IsolateOrigins,site-per-process',
                        '--disable-ipc-flooding-protection',
                        '--disable-background-timer-throttling',
                        '--disable-backgrounding-occluded-windows',
                        '--disable-renderer-backgrounding',
                        '--disable-hang-monitor',
                        '--disable-prompt-on-repost',
                        '--disable-sync',
                        '--disable-translate',
                        '--metrics-recording-only',
                        '--safebrowsing-disable-auto-update',
                        '--password-store=basic',
                        '--use-mock-keychain',
                        '--enable-features=NetworkService,NetworkServiceInProcess',
                        '--disable-features=RendererCodeIntegrity',
                        '--disable-features=EnableEphemeralFlashPermission',
                        '--disable-features=FlashDeprecationWarning',
                        '--disable-features=AudioServiceOutOfProcess',
                        '--disable-features=WebRtcHideLocalIpsWithMdns',
                        '--disable-features=WebRtcAllowUrlsWithMatchingIp',
                        '--disable-features=WebRtcIpv6MultipleInterfaces',
                        '--disable-features=WebRtcIpv6DefaultPublicInterfaceOnly',
                        '--disable-blink-features=AutomationControlled',
                        '--disable-infobars',
                        '--no-first-run',
                        '--no-default-browser-check',
                        '--disable-web-security',
                        '--disable-site-isolation-trials',
                    ],
                    timeout: 6000000
                };
            } else if (this.isBilibili(data)) {
                // ===== 哔哩哔哩专用启动配置 =====
                this.logger.log('[Bilibili] 使用哔哩哔哩专用反风控配置启动浏览器');
                launchOptions = {
                    executablePath: chromePath,
                    headless: false,
                    timeout: 6000000
                };
            } else {
                launchOptions = {
                    executablePath: chromePath,
                    headless: false,
                    args: [
                        "--disable-blink-features=AutomationControlled",
                        "--no-sandbox",
                        "--disable-setuid-sandbox",
                        "--disable-features=Geolocation",
                        "--disable-geolocation",
                    ],
                    timeout: 6000000
                };
            }

            // 检查是否需要设置指纹
            if (data.fingerprint) {
                this.logger.log('启用浏览器指纹...');
                const fingerprint = this.generateFingerprint();

                // 设置指纹相关参数
                launchOptions.userAgent = fingerprint.userAgent;
                launchOptions.locale = fingerprint.language;
                launchOptions.timezoneId = fingerprint.timezone;

                // 添加额外的 HTTP 头信息
                launchOptions.extraHTTPHeaders = {
                    'Accept': 'application/json, text/plain, */*',
                    // 'Accept-Language': fingerprint.language + ',zh;q=0.8,zh-TW;q=0.7,zh-HK;q=0.5,en-US;q=0.3,en;q=0.2',
                };
            }

            // 检查是否需要设置代理
            if (data.proxy) {
                this.logger.log('启用代理设置...');
                const proxy = data.proxy;

                // 构建代理服务器地址
                let proxyServer = `${proxy.protocol || 'http'}://`;

                // 添加主机和端口
                proxyServer += `${proxy.host}:${proxy.port}`;

                // 设置代理选项
                launchOptions.proxy = {
                    server: proxyServer,
                    username: proxy.username,
                    password: proxy.password
                };

                this.logger.log('代理配置完成:', proxyServer);
            }

            this.logger.log('启动选项配置完成');
            // 启动浏览器
            this.browser = await chromium.launch(launchOptions);
            this.logger.log('Playwright 浏览器实例创建成功');

            if (data.launchType === "login" || data.launchType === "reauthorize") {
                this.context = await this.browser.newContext();
                this.page = await this.context.newPage();

                this.logger.log('浏览器页面创建成功');

                // 开始监控
                this.startUrlMonitoring(data);

                // 跳转登录界面
                await this.page.goto(data.websiteInfo.loginUrl, {
                    waitUntil: 'networkidle',
                    timeout: 6000000
                });
                this.logger.log('访问链接成功');

                return {
                    success: true,
                    message: 'Chrome 浏览器启动成功'
                };
            } else if (data.launchType === "authTest" || data.launchType === "send_article" || data.launchType === "send_video") {
                const browserContext = data.browserContext;
                const context = JSON.parse(browserContext);

                // 创建上下文和页面，加载上下文
                let authTestOptions = {
                    ...launchOptions,
                    storageState: context
                };

                // 哔哩哔哩合并专用 context 配置
                if (this.isBilibili(data)) {
                    this.logger.log('[Bilibili] 创建哔哩哔哩专用浏览器上下文 (含 storageState)');
                    authTestOptions = {
                        ...authTestOptions,
                        ...this.getBilibiliContextOptions(),
                        storageState: context  // 确保 storageState 不被覆盖
                    };
                }

                this.context = await this.browser.newContext(authTestOptions);
                this.page = await this.context.newPage();

                // 只有 authTest 才需要监控
                if (data.launchType === "authTest") {
                    this.startUrlMonitoring(data);
                }

                // 然后访问目标页面
                if (this.isBilibili(data)) {
                    await this.page.goto(data.websiteInfo.pageUrl, {
                        waitUntil: 'domcontentloaded',
                        timeout: 6000000
                    });
                } else if (data.record.platform === "weixin") {
                    // 微信特判
                    await this.page.goto(data.websiteInfo.pageUrl.split('/cgi-bin/')[0], {
                        waitUntil: 'networkidle',
                        timeout: 6000000
                    });
                } else {
                    await this.page.goto(data.websiteInfo.pageUrl, {
                        waitUntil: 'networkidle',
                        timeout: 6000000
                    });
                }

                // 根据发送任务执行后续的发送任务
                if (data.launchType === "send_article") {
                    await this.sendArticle(data)
                } else if (data.launchType === "send_video") {
                    await this.sendVideo(data)
                }

                return {
                    success: true,
                    message: 'Chrome 浏览器启动成功'
                };
            } else {
                return {
                    success: true,
                };
            }
        } catch (error) {
            this.logger.error('启动 Chrome 浏览器失败:', error);

            // 详细错误处理
            if (error.message.includes('Could not find browser revision')) {
                this.logger.error('Playwright 无法找到浏览器，可能需要安装浏览器');
            } else if (error.message.includes('Timeout')) {
                this.logger.error('启动超时，可能是权限问题或杀毒软件阻止');
            } else if (error.message.includes('target closed')) {
                this.logger.error('浏览器目标已关闭，可能是资源冲突');
            }

            // 清理资源
            if (this.browser) {
                try {
                    await this.browser.close();
                } catch (e) {
                    this.logger.error('清理失败:', e);
                }
            }

            this.browser = null;
            this.context = null;
            this.page = null;

            return {
                success: false,
                message: `启动失败: ${error.message}`
            };
        }
    }

    async executeJavaScript(page, script) {
        return await page.evaluate(script).then(result => {
            return result
        });
    }

    async sendVideo(data) {
        const videoProcesserPath = path.join(process.resourcesPath, 'services', 'videoProcesser.js')
        const videoProcesser = require(videoProcesserPath);

        await this.page.waitForLoadState('networkidle');

        try {
            await videoProcesser.processVideo(data, data.sendItem, this.page, this.logger)
            this.sendCloseEventByName("send-video-event-browser-callback", {
                "status": "Success",
                "record_id": data.sendUserInfo.website_login_context_id,
                "job_id": data.sendItem.id,
            })
        } catch (e) {
            this.sendCloseEventByName("send-video-event-browser-callback", {
                "status": "Failed",
                "message": e.message,
                "record_id": data.sendUserInfo.website_login_context_id,
                "job_id": data.sendItem.id,
            })
        }

        this.closeBrowser()
    }

    async sendArticle(data) {
        const articleProcesserPath = path.join(process.resourcesPath, 'services', 'articleProcesser.js')
        const articleProcesser = require(articleProcesserPath);

        if (this.isBilibili(data)) {
            await this.page.waitForLoadState('domcontentloaded');
        }else{
            await this.page.waitForLoadState('networkidle');
        }

        for (let i = 0; i < data.sendItem.send_job_markdowns.length; i++) {
            let send_markdown = data.sendItem.send_job_markdowns[i]
            let status = data.sendUserInfo.send_status[i]
            this.logger.info("statsu" + status);
            this.logger.info("sendUserInfo" + data.sendUserInfo);
            if (status.status === "Success") {
                continue
            }

            try {
                await articleProcesser.processArticle(data, data.sendItem, send_markdown, this.page, this.logger)
                this.sendCloseEventByName("send-event-browser-callback", {
                    "status": "Success",
                    "record_id": data.sendUserInfo.website_login_context_id,
                    "job_id": data.sendItem.id,
                    "markdown_index": i
                })
            } catch (e) {
                this.sendCloseEventByName("send-event-browser-callback", {
                    "status": "Failed",
                    "message": e.message,
                    "record_id": data.sendUserInfo.website_login_context_id,
                    "job_id": data.sendItem.id,
                    "markdown_index": i
                })
            }
        }

        this.closeBrowser()
    }

    // 开始监控 URL 变化
    startUrlMonitoring(data) {
        if (this.isMonitoring) return;

        this.isMonitoring = true;
        this.isFramenavigated = false
        this.logger.log('开始监控 URL 变化...');

        // 监听页面导航
        this.page.on('framenavigated', async (frame) => {
            if (frame === this.page.mainFrame()) {
                // 确保页面完全加载

                const url = this.page.url();
                this.logger.log('URL 发生变化:', url);
                if (this.isFramenavigated) {

                } else {
                    let timeout = false
                    if (data.platform === "bilibili") {
                        try {
                            // 保持使用networkidle状态，但增加超时时间到60秒
                            await this.page.waitForLoadState('domcontentloaded', { timeout: 60000 });
                        } catch (error) {
                            this.logger.error('页面networkidle状态等待超时，继续执行:', error.message);
                            // 超时后仍继续执行，不中断流程
                            timeout = true
                        }
                    }else{
                        try {
                            // 保持使用networkidle状态，但增加超时时间到60秒
                            await this.page.waitForLoadState('networkidle', { timeout: 60000 });
                        } catch (error) {
                            this.logger.error('页面networkidle状态等待超时，继续执行:', error.message);
                            // 超时后仍继续执行，不中断流程
                            timeout = true
                        }
                    }

                    if (data.launchType === "login" || data.launchType === "reauthorize") {
                        if (url.startsWith(data.websiteInfo.pageUrl)) {
                            this.logger.log('URL 匹配:', url);
                            await this.page.waitForTimeout(1000);

                            this.isFramenavigated = true
                            let username = "未知"
                            let avatarUrl = ""

                            if (!timeout) {
                                let platformModule;
                                if (data.platform === "jin_ri_tou_tiao") {
                                    platformModule = require('./platform/toutiao');
                                } else if (data.platform === "dou_yin") {
                                    platformModule = require('./platform/douyin');
                                } else if (data.platform === "xiao_hong_shu") {
                                    platformModule = require('./platform/xiaohongshu');
                                } else if (data.platform === "kuai_shou") {
                                    platformModule = require('./platform/kuaishou');
                                } else if (data.platform === "sou_hu_hao") {
                                    platformModule = require('./platform/souhu');
                                } else if (data.platform === "tik_tok") {
                                    platformModule = require('./platform/tiktok');
                                } else if (data.platform === "zhihu") {
                                    platformModule = require('./platform/zhihu');
                                } else if (data.platform === "bilibili") {
                                    platformModule = require('./platform/bilibili');
                                } else if (data.platform === "csdn") {
                                    platformModule = require('./platform/csdn');
                                } else if (data.platform === "wangyi") {
                                    platformModule = require('./platform/wangyi');
                                } else if (data.platform === "weixin") {
                                    platformModule = require('./platform/weixin');
                                } else if (data.platform === "qie") {
                                    platformModule = require('./platform/qie');
                                }

                                if (platformModule && platformModule.getUserInfo) {
                                    const info = await platformModule.getUserInfo(this.page, this.executeJavaScript.bind(this), this.logger);
                                    username = info.username;
                                    avatarUrl = info.avatarUrl;
                                }
                            } else {
                                username = "未知"
                                avatarUrl = ""
                            }

                            const storageStateJson = await this.saveContextData(data.browserContentDir)
                            if (storageStateJson != null) {
                                this.sendUrlChangedEvent({
                                    storageStateJson: storageStateJson,
                                    userId: data.userId,
                                    websiteInfo: data.websiteInfo,
                                    launchType: data.launchType,
                                    record: data.record,
                                    username: username,
                                    avatarUrl: avatarUrl,
                                });
                                this.sendCloseEvent()
                                await this.closeBrowser()
                            }
                        }
                    } else if (data.launchType === "authTest") {
                        this.isFramenavigated = true

                        if (url.startsWith(data.websiteInfo.pageUrl)) {
                            this.logger.log('登陆测试的时候界面地址不对: ', url);
                            data.record.status = 0
                        } else {
                            this.logger.log('登陆测试成功: ', url);
                            data.record.status = 1
                        }
                        this.sendUrlChangedEvent({
                            userId: data.userId,
                            websiteInfo: data.websiteInfo,
                            launchType: data.launchType,
                            record: data.record
                        });

                        this.sendCloseEvent()
                        await this.closeBrowser()
                    }
                }
            }
        });

        // 监听页面加载完成
        this.page.on('load', async () => {
            const url = this.page.url();
            this.logger.log('页面加载完成:', url);
        });

        // 监听页面错误
        this.page.on('pageerror', error => {
            this.logger.error('页面错误:', error);
        });

        // 监听崩溃
        this.page.on('crash', () => {
            this.logger.error('页面崩溃');
        });

        this.page.on('disconnected', async () => {
            this.logger.error('⚠️ 浏览器已被用户手动关闭');
            // 可以设置状态标志
            await this.closeBrowser()
            this.sendCloseEvent()
        });

        this.page.on('close', async () => {
            this.logger.error('⚠️ 浏览器已被用户手动关闭');
            await this.closeBrowser()
            this.sendCloseEvent()
        });
    }

    // 发送 URL 变化事件
    sendUrlChangedEvent(data) {
        if (require('electron').ipcMain) {
            const { webContents } = require('electron');
            webContents.getAllWebContents().forEach(webContent => {
                if (!webContent.isDestroyed()) {
                    webContent.send('event-browser-login-success', data);
                }
            });
        }
    }

    sendCloseEventByName(channel, data) {
        if (require('electron').ipcMain) {
            const { webContents } = require('electron');
            webContents.getAllWebContents().forEach(webContent => {
                if (!webContent.isDestroyed()) {
                    webContent.send(channel, data);
                }
            });
        }
    }

    sendCloseEvent() {
        this.sendCloseEventByName('event-browser-close')
    }

    // 保存浏览器上下文数据
    async saveContextData(browserContentDir) {
        try {
            if (!this.browser || !this.page) return null;
            this.logger.log('正在保存浏览器上下文数据...');
            // 获取完整的存储状态
            const storageState = await this.context.storageState();
            const contextSavePath = path.join(browserContentDir, 'chrome-context.json');

            const storageStateJson = JSON.stringify(storageState, null, 2);
            await fs.writeFile(contextSavePath, storageStateJson);

            this.logger.log('浏览器上下文数据保存完成');
            return storageStateJson;
        } catch (error) {
            this.logger.error('保存上下文数据失败:', error);
            return null;
        }
    }

    // 关闭浏览器
    async closeBrowser() {
        try {
            if (this.browser) {
                this.logger.log('正在关闭浏览器...');

                await this.browser.close();
                this.browser = null;
                this.context = null;
                this.page = null;
                this.isMonitoring = false;
                this.isFramenavigated = false

                this.logger.log('浏览器关闭完成');
            }
            return { success: true, message: '浏览器已关闭' };
        } catch (error) {
            this.logger.error('关闭浏览器失败:', error);
            return { success: false, message: `关闭失败: ${error.message}` };
        }
    }

    // 获取当前浏览器状态
    getBrowserStatus() {
        return {
            isRunning: !!this.browser,
            isMonitoring: this.isMonitoring
        };
    }
}

module.exports = new BrowserManager();