import { GoogleDriveService } from '@/services/index.services';
import { NextFunction, Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import * as https from 'https';
import * as urls from 'url';
// import * as mtd from 'zeltice-mt-downloader';
const mtd = require('zeltice-mt-downloader');
require('events').EventEmitter.prototype._maxListeners = 0;

const driveClientId = process.env.GOOGLE_DRIVE_CLIENT_ID || '';
const driveClientSecret = process.env.GOOGLE_DRIVE_CLIENT_SECRET || '';
const driveRedirectUri = process.env.GOOGLE_DRIVE_REDIRECT_URI || '';
const driveRefreshToken = process.env.GOOGLE_DRIVE_REFRESH_TOKEN || '';
let status = 'pending';

class IndexController {
  status = 'uploading';
  private upload = ({ folderFromApi, fileNameFromApi, res, next }) => {
    try {
      res.send({
        status: status,
      });
    } catch (error) {
      next(error);
    }
    (async () => {
      const googleDriveService = new GoogleDriveService(driveClientId, driveClientSecret, driveRedirectUri, driveRefreshToken);
      const folderName = folderFromApi;
      const fileName = fileNameFromApi;
      const finalPath = path.resolve(__dirname, '../../public/' + fileName);
      if (!fs.existsSync(finalPath)) {
        throw new Error('File not found!');
      }
      let folder = await googleDriveService.searchFolder(folderName).catch(error => {
        console.error(error);
        return null;
      });
      // console.log(folder);
      let folderId = '';
      if (!folder) {
        folder = await googleDriveService.createFolder(folderName);
        // console.log(folder);
        folderId = folder.data.id;
      } else {
        folderId = folder.id;
      }
      await googleDriveService.saveFile(fileName, finalPath, 'video/mp4', folderId).catch(error => {
        console.error(error);
      });

      console.info('File uploaded successfully!');
      // Delete the file on the server
      status = 'uploaded';

      fs.unlinkSync(finalPath);
    })();
  };
  private download = ({ res, next, url, fileName }) => {
    try {
      res.send({
        status: status,
      });
    } catch (error) {
      next(error);
    }
    try {
      // const fileNameWithExt = fileName + path.extname(url);
      const defaults = [
        '.mp4',
        '.mp3',
        '.mov',
        '.wmv',
        '.avi',
        '.mkv',
        '.webm',
        '.mp3',
        '.aac',
        '.wav',
        '.jpeg',
        '.raw',
        '.zip',
        '.rar',
        '.pdf',
        '.exe',
        '.bin',
        '.msi',
        '.7z',
      ];
      let ext = '';
      defaults.forEach((v, i) => {
        const compare = url.toLowerCase().indexOf(v.toLowerCase()) !== -1;
        if (compare) {
          ext = v;
        }
      });
      const fileWithExt = fileName + ext;
      const file = fs.createWriteStream('public/' + fileWithExt);
      const request = https.get(url, function (response) {
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
        const interval = setInterval(() => {
          if (body != '') {
            console.log(body);
          } else {
            clearInterval(interval);
            console.log('Interval Cleared');
          }
        }, 5000);

        // after download completed close filestream
        file.on('finish', () => {
          file.close();
          console.log('Download Completed');
          body = '';
        });
      });
    } catch (error) {
      console.log(error);
    }
  };
  public index = (req: Request, res: Response, next: NextFunction) => {
    this.upload({ folderFromApi: req.body.path, fileNameFromApi: req.body.filename, res: res, next: next });
  };
  public downloadUrl = (req: Request, res: Response, next: NextFunction) => {
    this.download({ res: res, next: next, url: req.body.url, fileName: req.body.filename });
    // try {
    //   res.send({
    //     status: status,
    //   });
    // } catch (error) {
    //   next(error);
    // }
    // const file = fs.createWriteStream('spacex');
  };
}

export default IndexController;
