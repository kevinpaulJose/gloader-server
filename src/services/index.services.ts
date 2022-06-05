import fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { google } from 'googleapis';
import axios from 'axios';
import { url } from 'inspector';
import { FireService } from './firebase.services';
import { addDoc, collection, getDocs, Timestamp, where, query, updateDoc, doc } from 'firebase/firestore';
import { firedb } from '@/databases/firebase';

/**
 * Browse the link below to see the complete object returned for folder/file creation and search
 *
 * @link https://developers.google.com/drive/api/v3/reference/files#resource
 */
type PartialDriveFile = {
  id: string;
  name: string;
};

type SearchResultResponse = {
  kind: 'drive#fileList';
  nextPageToken: string;
  incompleteSearch: boolean;
  files: PartialDriveFile[];
};

export class GoogleDriveService {
  private driveClient;

  public constructor(clientId: string, clientSecret: string, redirectUri: string, refreshToken: string) {
    try {
      this.driveClient = this.createDriveClient(clientId, clientSecret, redirectUri, refreshToken);
    } catch (err) {
      console.log(err);
    }
  }

  createDriveClient(clientId: string, clientSecret: string, redirectUri: string, refreshToken: string) {
    try {
      const client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);

      client.setCredentials({ refresh_token: refreshToken });

      return google.drive({
        version: 'v3',
        auth: client,
      });
    } catch (error) {
      console.log(error);
    }
  }

  createFolder(folderName: string): Promise<PartialDriveFile> {
    let a;
    try {
      console.log('Created Folder');
      a = this.driveClient.files.create({
        resource: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
        },
        fields: 'id, name',
      });
    } catch (error) {
      console.log(error);
    }
    return a;
  }

  searchFolder(folderName: string): Promise<PartialDriveFile | null> {
    try {
      return new Promise((resolve, reject) => {
        this.driveClient.files.list(
          {
            q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}'`,
            fields: 'files(id, name)',
          },
          (err, res: { data: SearchResultResponse }) => {
            if (err) {
              return reject(err);
            }
            console.log(res.data.files ? res.data.files[0] : 'No files Found');
            return resolve(res.data.files ? res.data.files[0] : null);
          },
        );
      });
    } catch (error) {
      console.log(error);
    }
  }

  async addDownloads(userId, id, fileName, folderName, token, img, total, url) {
    // const fireService = new FireService();
    // let ongoingDownloads = await fireService.getAllDownloads(userId);
    // let ongoingUploads = await fireService.getAllUploads(userId);
    // ongoingUploads = ongoingUploads.filter(v => {
    //   return v.status == 'Uploading';
    // });
    // ongoingDownloads = ongoingDownloads.filter(v => {
    //   return v.status == 'Downloading' || v.status == 'Pending';
    // });
    // console.log(ongoingDownloads.length);
    // if (ongoingDownloads.length >= 1 || ongoingUploads.length >= 1) {
    // console.log('Executing this');
    await addDoc(collection(firedb, 'downloads'), {
      id: id,
      userId: userId,
      url: url,
      completed: '0',
      fileName: fileName,
      percentage: '0',
      status: 'Pending',
      total: total,
      added: Timestamp.fromDate(new Date()),
      stopped: false,
      folderName: folderName,
      token: token,
      img: img,
    });
    // }
    // else {
    //   await addDoc(collection(firedb, 'downloads'), {
    //     id: id,
    //     userId: userId,
    //     url: url,
    //     completed: '0',
    //     fileName: fileName,
    //     percentage: '0',
    //     status: 'Downloading',
    //     total: total,
    //     added: Timestamp.fromDate(new Date()),
    //     stopped: false,
    //     folderName: folderName,
    //     token: token,
    //     img: img,
    //   });
    //   // console.log('Executing thisone');
    // }
  }
  async updateDownloads(completed, status, total, id) {
    const downloadRef = collection(firedb, 'downloads');
    const q = query(downloadRef, where('id', '==', id));
    const querySnapshot = await getDocs(q);
    let docId = '';
    querySnapshot.forEach(doc => {
      docId = doc.id;
    });
    const docRef = doc(firedb, 'downloads', docId);
    await updateDoc(docRef, {
      completed: completed,
      status: status,
      total: total,
      stopped: false,
    });
  }

  async saveFile(
    fileName: string,
    filePath: string,
    fileMimeType: string,
    img: string,
    fileSize: string,
    id: string,
    userId: string,
    folderName: string,
    token: string,
    folderId?: string,
  ) {
    try {
      const response = await axios({
        method: 'get',
        url: filePath,
        responseType: 'stream',
      });
      let mb = 0;
      this.addDownloads(userId, id, fileName, folderName, token, img, fileSize, filePath);
      await this.driveClient.files.create(
        {
          requestBody: {
            name: fileName,
            mimeType: fileMimeType,
            parents: folderId ? [folderId] : [],
          },
          media: {
            mimeType: fileMimeType,
            body: response.data,
          },
        },
        {
          onUploadProgress: e => {
            if (e.bytesRead / 1000000 > mb + 10) {
              // this.addDownloads(userId, id, fileName, folderName, token, img, fileSize, (e.bytesRead / 1000000).toString(), 'Downloading');
              console.log((e.bytesRead / 1000000).toString());
              mb += e.bytesRead / 1000000;
              this.updateDownloads((e.bytesRead / 1000000).toString(), 'Downloading', fileSize, id);
            }
          },
        },
      );
      // this.addDownloads(userId, id, fileName, folderName, token, img, fileSize, mb.toString(), 'Completed');
      const fireService = new FireService();
      await this.updateDownloads(fileSize, 'Completed', fileSize, id);
      await fireService.addUploads(id, userId, fileName, id, folderName);
      await fireService.updateUploads(id, 'Completed', folderId);
      console.log('Completed');
      // return true;
    } catch (error) {
      console.log(error);
    }
  }
}
