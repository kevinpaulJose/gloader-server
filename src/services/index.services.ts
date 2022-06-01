import fs from 'fs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
import { google } from 'googleapis';
import { FireService } from './firebase.services';

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

  async saveFile(fileName: string, filePath: string, fileMimeType: string, folderId: string, id: string) {
    try {
      console.log(folderId + ' - From back');
      const fireService = new FireService();
      await fireService.updateUploads(id, 'pending', folderId);
      return this.driveClient.files.create({
        requestBody: {
          name: fileName,
          mimeType: fileMimeType,
          parents: folderId ? [folderId] : [],
        },
        media: {
          mimeType: fileMimeType,
          body: fs.createReadStream(filePath),
        },
      });
    } catch (error) {
      console.log(error);
    }
  }
}
