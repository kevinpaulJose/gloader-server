import { GoogleDriveService } from '@/services/index.services';
import { NextFunction, Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import { FireService } from '@/services/firebase.services';
require('events').EventEmitter.prototype._maxListeners = 0;

const driveClientId = process.env.GOOGLE_DRIVE_CLIENT_ID || '';
const driveClientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET || '';
const driveRedirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || '';
// const driveRefreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '';

class IndexController {
  upload = async ({ folderFromApi, fileNameFromApi, token, id, downloadId, userId }) => {
    const fireService = new FireService();
    await fireService.addUploads(id, userId, fileNameFromApi, downloadId, folderFromApi);
    (async () => {
      const googleDriveService = new GoogleDriveService(driveClientId, driveClientSecret, driveRedirectUri, token);
      const folderName = folderFromApi;
      const fileName = fileNameFromApi;
      const finalPath = path.resolve(__dirname, '../../public/' + downloadId + '_' + fileName);
      if (!fs.existsSync(finalPath)) {
        throw new Error('File not found!');
      }
      let folder = await googleDriveService.searchFolder(folderName).catch(error => {
        console.error(error);
        return null;
      });
      let folderId = '';
      if (!folder) {
        await fireService.updateUploads(id, 'Creating folder');
        folder = await googleDriveService.createFolder(folderName);
        folderId = folder.data.id;
      } else {
        folderId = folder.id;
      }
      await fireService.updateUploads(id, 'Uploading');
      await googleDriveService.saveFile(fileName, finalPath, 'video/mp4', folderId).catch(async error => {
        console.error(error);
        await fireService.updateUploads(id, 'Error');
      });

      console.info('File uploaded successfully!');
      // Delete the file on the server

      fs.unlinkSync(finalPath);

      await fireService.updateUploads(id, 'Completed');
      this.checkPendingAndUpdate(userId);
    })();
  };
  checkPendingAndUpdate = async userId => {
    console.log('Checking for downloads');
    const fireService = new FireService();
    let pendingDownloads = await fireService.getAllDownloads(userId);
    pendingDownloads = pendingDownloads.filter(v => {
      return v.status == 'Pending' && !v.stopped;
    });

    if (pendingDownloads.length >= 1) {
      console.log('Downloading pending downloads');
      this.download({
        url: pendingDownloads[0].url,
        fileName: pendingDownloads[0].fileName,
        folderName: pendingDownloads[0].folderName,
        id: pendingDownloads[0].id,
        token: pendingDownloads[0].token,
        userId: pendingDownloads[0].userId,
        img: pendingDownloads[0].img,
      });
    }
  };
  private download = async ({ url, fileName, id, userId, folderName, token, img }) => {
    try {
      // const defaults = [
      //   '.mp4',
      //   '.mp3',
      //   '.mov',
      //   '.wmv',
      //   '.avi',
      //   '.mkv',
      //   '.webm',
      //   '.mp3',
      //   '.aac',
      //   '.wav',
      //   '.jpeg',
      //   '.raw',
      //   '.zip',
      //   '.rar',
      //   '.pdf',
      //   '.exe',
      //   '.bin',
      //   '.msi',
      //   '.7z',
      // ];
      // let ext = '';
      // defaults.forEach((v, i) => {
      //   const compare = url.toLowerCase().indexOf(v.toLowerCase()) !== -1;
      //   if (compare) {
      //     ext = v;
      //   }
      // });
      // const fileWithExt = fileName + ext;

      const fireService = new FireService();
      let ongoingDownloads = await fireService.getAllDownloads(userId);
      let ongoingUploads = await fireService.getAllUploads(userId);
      ongoingUploads = ongoingUploads.filter(v => {
        return v.status == 'Uploading';
      });
      ongoingDownloads = ongoingDownloads.filter(v => {
        return v.status == 'Downloading';
      });
      if (ongoingDownloads.length >= 1 || ongoingUploads.length >= 1) {
        await fireService.addDownloads(id, userId, url, fileName, 'Pending', folderName, token, img);
        // update if already there
      } else {
        const file = fs.createWriteStream('public/' + id + '_' + fileName);
        fireService.addDownloads(id, userId, url, fileName, 'Downloading', folderName, token, img).then(() => {
          const dnld = https.get(url, response => {
            response.pipe(file);
            const len = parseInt(response.headers['content-length'], 10);
            let cur = 0;
            const total = len / 1048576;
            let body = '';
            response.on('data', function (chunk) {
              body += chunk;
              cur += chunk.length;
              // console.log(
              body = 'Downloading ' + ((100.0 * cur) / len).toFixed(2) + '% ' + (cur / 1048576).toFixed(2) + ' Total size: ' + total.toFixed(2) + ' ';
              // );
            });
            const interval = setInterval(async () => {
              if (body != '') {
                const entry = await fireService.getDownloads(id);
                if (entry[0].stopped) {
                  file.close();
                  // dnld._destroy((e, e1) => {});
                  console.log('Download interupted');
                  dnld.end();
                  fs.unlinkSync('public/' + id + '_' + fileName);
                  clearInterval(interval);
                  console.log('Interval Cleared');
                } else {
                  await fireService.updateDownloads(
                    id,
                    (cur / 1048576).toFixed(2).toString(),
                    ((100.0 * cur) / len).toFixed(2) + '% ',
                    entry[0].status,
                    total.toFixed(2).toString(),
                    folderName,
                    fileName,
                    token,
                    userId,
                    entry[0].stopped,
                    false,
                  );
                }
              } else {
                clearInterval(interval);
                console.log('Interval Cleared');
              }
            }, 6000);
            dnld.on('error', async err => {
              fs.unlinkSync('public/' + id + '_' + fileName);
              console.log(err);
              const entry = await fireService.getDownloads(id);
              await fireService.updateDownloads(
                id,
                (cur / 1048576).toFixed(2).toString(),
                ((100.0 * cur) / len).toFixed(2) + '% ',
                'Completed',
                total.toFixed(2).toString(),
                folderName,
                fileName,
                token,
                userId,
                entry[0].stopped,
                true,
              );
            });
            file.on('error', async err => {
              fs.unlinkSync('public/' + id + '_' + fileName);
              console.log(err);
              const entry = await fireService.getDownloads(id);
              await fireService.updateDownloads(
                id,
                (cur / 1048576).toFixed(2).toString(),
                ((100.0 * cur) / len).toFixed(2) + '% ',
                'Completed',
                total.toFixed(2).toString(),
                folderName,
                fileName,
                token,
                userId,
                entry[0].stopped,
                true,
              );
            });
            file.on('finish', async () => {
              const entry = await fireService.getDownloads(id);
              file.close();
              console.log('Download Completed');
              await fireService.updateDownloads(
                id,
                (cur / 1048576).toFixed(2).toString(),
                ((100.0 * cur) / len).toFixed(2) + '% ',
                'Completed',
                total.toFixed(2).toString(),
                folderName,
                fileName,
                token,
                userId,
                entry[0].stopped,
                false,
              );
              body = '';
            });
          });
        });
      }
    } catch (error) {
      console.log(error);
    }
  };
  // public index = (req: Request, res: Response, next: NextFunction) => {
  //   this.upload({
  //     folderFromApi: req.body.path,
  //     fileNameFromApi: req.body.filename,
  //     token: req.body.token,
  //     id: req.body.id,
  //     downloadId: req.body.downloadId,
  //     userId: req.body.userId,
  //   });
  // };
  public downloadUrl = (req: Request, res: Response, next: NextFunction) => {
    try {
      res.send({
        status: 'Started',
      });
    } catch (error) {
      next(error);
    }
    this.download({
      url: req.body.url,
      fileName: req.body.filename,
      id: req.body.id,
      userId: req.body.userId,
      folderName: req.body.folderName,
      token: req.body.token,
      img: req.body.img,
    });
  };
}

export default IndexController;
