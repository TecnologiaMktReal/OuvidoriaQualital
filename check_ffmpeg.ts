import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import fs from 'fs';

console.log('FFmpeg Path:', ffmpegInstaller.path);
console.log('Existe:', fs.existsSync(ffmpegInstaller.path));


