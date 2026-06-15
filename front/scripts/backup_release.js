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

const releaseDir = path.join(__dirname, '..', 'release', 'win-unpacked');
const tmpsDir = path.join(__dirname, '..', 'tmps');
const folders = ['assets', 'database'];

folders.forEach(folder => {
    const src = path.join(releaseDir, folder);
    const dest = path.join(tmpsDir, folder);

    if (fs.existsSync(src)) {
        // Clear destination first to ensure a clean backup
        if (fs.existsSync(dest)) {
            console.log(`Clearing existing backup in ${dest}...`);
            fs.rmSync(dest, { recursive: true, force: true });
        }
        console.log(`Backing up ${folder} to ${dest}...`);
        copyRecursiveSync(src, dest);
    } else {
        console.log(`Source ${src} does not exist, skipping.`);
    }
});
