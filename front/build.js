const { exec } = require('child_process');
const fs = require('fs-extra');

// 清理 release 目录
fs.removeSync('release');

// 构建 React 应用
console.log('Building React app...');
exec('npm run build-react', (error, stdout, stderr) => {
    if (error) {
        console.error(`Error building React app: ${error}`);
        return;
    }
    console.log(stdout);

    // 复制 electron.js 到 build 目录
    fs.copySync('public/electron.js', 'build/electron.js');

    console.log('React app built successfully!');
});
