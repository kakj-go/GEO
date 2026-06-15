const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const logger = require('electron-log');
const { spawn } = require('child_process');
const appDataPath = app.getPath('userData')
// 配置日志
logger.transports.file.resolvePath = () => {
    return path.join(appDataPath, 'logs', 'run.log');
};

// 确保日志目录存在
const logDir = path.dirname(logger.transports.file.getFile().path);
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    logger.error('Stack:', error.stack);
});

process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

let mainWindow;

let browserManager = null

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1600,
        height: 900,
        webPreferences: {
            sandbox: false, // 禁用沙箱
            devTools: true,
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
        },
        show: false,
        icon: path.join(__dirname, 'icon.ico')
    });

    // 生产环境路径
    // extraResources copies "build" contents into "resources/app/"
    // so index.html is at resources/app/index.html
    const buildPath = path.join(process.resourcesPath, 'app');
    const indexPath = path.join(buildPath, 'index.html');

    logger.log('Build path:', buildPath);
    logger.log('Index path:', indexPath);

    if (fs.existsSync(indexPath)) {
        logger.log('Found index.html, loading application...');
        mainWindow.loadFile(indexPath).then(() => {
            logger.log('Application loaded successfully');
        }).catch((error) => {
            logger.error('Failed to load application:', error);
            showErrorPage(mainWindow, `加载应用失败: ${error.message}`);
        });
    } else {
        logger.error('index.html not found at:', indexPath);
        showErrorPage(mainWindow, `找不到应用文件。请检查安装是否完整。\n路径: ${indexPath}`);
    }

    mainWindow.once('ready-to-show', () => {
        logger.log('Window ready to show');
        mainWindow.show();
        // 默认不自动打开开发者工具（控制台），如需调试可通过 toggle-devtools 手动开启
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        logger.error('Failed to load:', errorCode, errorDescription);
    });

    return mainWindow;
}

function showErrorPage(mainWindow, message) {
    // 保持原有的错误页面代码不变
    // ...
}

// 动态获取 browserManager 路径
function getBrowserManagerPath() {
    // 生产环境路径 - 在 extraResources 中
    const prodPath1 = path.join(process.resourcesPath, 'services', 'browserManager.js');
    if (fs.existsSync(prodPath1)) {
        return prodPath1;
    }

    // 生产环境备用路径
    const prodPath2 = path.join(__dirname, 'services', 'browserManager.js');
    if (fs.existsSync(prodPath2)) {
        return prodPath2;
    }
    return null;
}

// 安全的 require browserManager
function requireBrowserManager() {
    try {
        if (browserManager == null) {
            const browserManagerPath = getBrowserManagerPath();
            if (!browserManagerPath) {
                logger.error('BrowserManager not found in any path');
                return null;
            }
            browserManager = require(browserManagerPath);
            browserManager.setLogger(logger)
        }

        return browserManager
    } catch (error) {
        logger.error('Error loading browserManager:', error);
        return null;
    }
}

ipcMain.handle('launch-chrome', async (event, data) => {
    try {
        const browserContentDir = path.join(appDataPath, 'browserContent', data.userId)
        if (!fs.existsSync(browserContentDir)) {
            fs.mkdirSync(browserContentDir, { recursive: true });
        }
        data["browserContentDir"] = browserContentDir

        logger.log("开始处理浏览器启动请求..., url: " + data.websiteInfo.pageUrl);

        const browserManager = requireBrowserManager();
        // 立即返回，不等待浏览器启动完成
        if (browserManager) {
            await browserManager.launchChrome(data);
        }
        return {
            success: true,
            message: '浏览器启动命令已发送'
        };
    } catch (error) {
        logger.error('IPC 处理错误:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('close-browser', async () => {
    try {
        logger.log("触发 close-browser");
        const browserManager = requireBrowserManager();
        if (!browserManager) {
            return { success: false, error: 'BrowserManager module not found' };
        }
        return await browserManager.closeBrowser();
    } catch (error) {
        logger.error('Error in close-browser:', error);
        return { success: false, error: error.message };
    }
});

ipcMain.handle('get-browser-status', async () => {
    try {
        logger.log("触发 get-browser-status");
        const browserManager = requireBrowserManager();
        if (!browserManager) {
            return { isRunning: false, error: 'BrowserManager module not found' };
        }
        return browserManager.getBrowserStatus();
    } catch (error) {
        logger.error('Error in get-browser-status:', error);
        return { isRunning: false, error: error.message };
    }
});

ipcMain.handle('get-recent-urls', async () => {
    try {
        logger.log("触发 get-recent-urls");
        const browserManager = requireBrowserManager();
        if (!browserManager) {
            return { urls: [], error: 'BrowserManager module not found' };
        }
        return browserManager.getRecentUrls();
    } catch (error) {
        logger.error('Error in get-recent-urls:', error);
        return { urls: [], error: error.message };
    }
});


ipcMain.handle('toggle-devtools', async (event, enabled) => {
    try {
        if (mainWindow && mainWindow.webContents) {
            if (enabled) {
                mainWindow.webContents.openDevTools();
            } else {
                mainWindow.webContents.closeDevTools();
            }
            return { success: true };
        }
        return { success: false, error: 'Window not available' };
    } catch (error) {
        logger.error('Error toggling devtools:', error);
        return { success: false, error: error.message };
    }
});

let backendProcess = null;

function startBackend() {
    const isPackaged = __dirname.includes('app.asar') || app.isPackaged;
    
    // 检查是否禁用后端启动
    let autoStart = true;
    try {
        // 在 Electron 中，../package.json 指向项目根目录或 app 根目录
        const pkg = require('../package.json');
        if (pkg.config && pkg.config.autoStartBackend === false) {
            autoStart = false;
        }
    } catch (e) {
        logger.warn('Could not read autoStartBackend config from package.json, defaulting to true');
    }

    if (process.argv.includes('--no-backend') || !autoStart) {
        logger.log('Backend auto-start is disabled.');
        return;
    }

    const isWin = process.platform === 'win32';
    const backendName = isWin ? 'backend.exe' : 'backend';

    // 如果是生产环境，取 resourcesPath 下的 exe；否则去开发目录找
    const backendPath = isPackaged
        ? path.join(process.resourcesPath, backendName)
        : path.join(__dirname, '..', 'resources_ext', backendName);

    if (fs.existsSync(backendPath)) {
        logger.log(`Starting Golang backend at: ${backendPath}`);
        backendProcess = spawn(backendPath);

        backendProcess.stdout.on('data', (data) => {
            logger.log(`Backend stdout: ${data}`);
        });
        backendProcess.stderr.on('data', (data) => {
            logger.error(`Backend stderr: ${data}`);
        });
    } else {
        logger.error(`Backend executable not found at: ${backendPath}`);
    }
}

function stopBackend() {
    if (backendProcess) {
        logger.log('Killing Golang backend...');
        backendProcess.kill();
        backendProcess = null;
    }
}

app.on('ready', () => {
    startBackend();
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    stopBackend();
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});