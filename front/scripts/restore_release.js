const fs = require('fs');
const path = require('path');

function copyRecursiveSync(src, dest) {
    if (!fs.existsSync(src)) return;
    const stats = fs.statSync(src);
    if (stats.isDirectory()) {
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach((childItemName) => {
            copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
    } else {
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        fs.copyFileSync(src, dest);
    }
}

const tmpsDir = path.join(__dirname, '..', 'tmps');
const releaseDir = path.join(__dirname, '..', 'release', 'win-unpacked');
const folders = ['assets', 'database'];

folders.forEach(folder => {
    const src = path.join(tmpsDir, folder);
    const dest = path.join(releaseDir, folder);

    if (fs.existsSync(src)) {
        // Clear destination first to ensure a clean restoration
        if (fs.existsSync(dest)) {
            console.log(`Clearing existing files in ${dest}...`);
            fs.rmSync(dest, { recursive: true, force: true });
        }
        console.log(`Restoring ${folder} to ${dest}...`);
        copyRecursiveSync(src, dest);
    } else {
        console.log(`Backup for ${folder} in ${src} does not exist, skipping.`);
    }
});
