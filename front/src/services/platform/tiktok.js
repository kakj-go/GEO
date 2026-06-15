
class Tiktok {
    async sendArticle(page, send_markdown, browserContentDir, getImageLocalPath) {
        throw new Error("TikTok暂不支持文章发布");
    }

    async sendVideo(page, sendItem, browserContentDir, getVideoLocalPath) {
        throw new Error("TikTok暂不支持视频发布");
    }

    async getUserInfo(page, executeJavaScript) {
        let username = await executeJavaScript(page, `document.querySelector(".css-15ebqti").innerText`)
        let avatarUrl = await executeJavaScript(page, `document.querySelector('.css-1kzq5ms .ecpyekx0').src`)
        return { username, avatarUrl }
    }
}

const helper = require('./helper');
module.exports = helper(new Tiktok(), 'Tiktok');
