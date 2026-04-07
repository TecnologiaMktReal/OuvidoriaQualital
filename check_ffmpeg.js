const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
console.log('FFmpeg Path:', ffmpegInstaller.path);
console.log('Existe:', require('fs').existsSync(ffmpegInstaller.path));


