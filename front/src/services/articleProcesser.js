const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

class ProcessArticle {
    async processArticle(data, sendItem, send_markdown, page, logger) {
        const browserContentDir = data.browserContentDir
        // 处理所有图片 URL
        for (const url of sendItem.image_url) {
            await this.downloadImage(url, browserContentDir, logger);
        }

        const platform = data.record.platform;
        let platformModule;

        if (platform === "jin_ri_tou_tiao") {
            platformModule = require('./platform/toutiao');
        } else if (platform === "dou_yin") {
            platformModule = require('./platform/douyin');
        } else if (platform === "xiao_hong_shu") {
            platformModule = require('./platform/xiaohongshu');
        } else if (platform === "sou_hu_hao") {
            platformModule = require('./platform/souhu');
        }else if (platform === "kuai_shou") {
            platformModule = require('./platform/kuaishou');
        } else if (platform === "zhihu") {
            platformModule = require('./platform/zhihu');
        } else if (platform === "bilibili") {
            platformModule = require('./platform/bilibili');
        } else if (platform === "csdn") {
            platformModule = require('./platform/csdn');
        } else if (platform === "wangyi") {
            platformModule = require('./platform/wangyi');
        } else if (platform === "weixin") {
            platformModule = require('./platform/weixin');
        } else if (platform === "qie") {
            platformModule = require('./platform/qie');
        }

        if (platformModule && platformModule.sendArticle) {
            await platformModule.sendArticle(page, send_markdown, browserContentDir, this.getImageLocalPath.bind(this), logger);
        } else {
            throw new Error(`平台 ${platform} 不支持文章发布`);
        }
    }

    getImageLocalPath(url, browserContentDir){
        const urlObj = new URL(url);
        let imagePath = urlObj.pathname;

        // 移除路径开头的 /assets/，只保留 202511/xxx.jpg 部分
        if (imagePath.startsWith('/assets/')) {
            imagePath = imagePath.slice(7);
        }

        // 创建本地保存路径
        return path.join(browserContentDir, imagePath);
    }

    // 使用 Node.js 内置模块实现图片下载
    async downloadImage(url, browserContentDir, logger) {
        try {
            // 创建本地保存路径
            const localFilePath = this.getImageLocalPath(url, browserContentDir);
            const localDir = path.dirname(localFilePath);

            // 确保本地目录存在
            if (!fs.existsSync(localDir)) {
                fs.mkdirSync(localDir, { recursive: true });
                logger.info("Created directory:", localDir);
            }

            // 检查本地文件是否已经存在
            if (fs.existsSync(localFilePath)) {
                logger.info(`图片已存在，跳过下载: ${localFilePath}`);
                return;
            }

            // 使用 Node.js 内置的 http/https 模块下载图片
            await this.httpDownload(url, localFilePath, logger);

            logger.info(`图片下载成功: ${url} -> ${localFilePath}`);

        } catch (error) {
            logger.error(`下载图片失败: ${url}`, error.message);

            // 特定的错误处理
            if (error.code === 'ECONNREFUSED' || error.message.includes('ECONNREFUSED')) {
                logger.error(`连接被拒绝，请确保服务器正在运行: ${url}`);
            }
        }
    }

    // 封装 http/https 下载函数
    httpDownload(url, dest, logger) {
        return new Promise((resolve, reject) => {
            const urlObj = new URL(url);
            const protocol = urlObj.protocol === 'https:' ? https : http;

            const options = {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 10000,
                family: 4
            };

            const request = protocol.get(url, options, (response) => {
                if (response.statusCode !== 200) {
                    reject(new Error(`HTTP 错误! 状态码: ${response.statusCode}`));
                    return;
                }

                const fileStream = fs.createWriteStream(dest);

                response.pipe(fileStream);

                fileStream.on('finish', () => {
                    fileStream.close();
                    resolve();
                });

                fileStream.on('error', (error) => {
                    fs.unlink(dest, () => {}); // 清理不完整的文件
                    reject(error);
                });
            });

            request.on('error', (error) => {
                fs.unlink(dest, () => {}); // 清理不完整的文件
                reject(error);
            });

            request.on('timeout', () => {
                request.destroy();
                fs.unlink(dest, () => {}); // 清理不完整的文件
                reject(new Error('请求超时'));
            });
        });
    }
}

module.exports = new ProcessArticle();