import IndexController from '@/controllers/index.controller';
import { firedb } from '@/databases/firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, doc, updateDoc } from 'firebase/firestore';

export class FireService {
  async addDownloads(id: String, userId: String, url: String, fileName: String, status: String, folderName: String, token: String, img: String) {
    const downloadItem = await this.getDownloads(id);
    if (downloadItem.length > 0) {
      this.updateDownloads(id, '0', '0', 'Downloading', '0', folderName, fileName, token, userId, false, false);
    } else {
      try {
        const docRef = await addDoc(collection(firedb, 'downloads'), {
          id: id,
          userId: userId,
          url: url,
          completed: '0',
          fileName: fileName,
          percentage: '0',
          status: status,
          total: '0',
          added: Timestamp.fromDate(new Date()),
          stopped: false,
          folderName: folderName,
          token: token,
          img: img,
        });
        console.log('Download Document written with ID: ', docRef.id);
      } catch (e) {
        console.error('Error adding Download document: ', e);
      }
    }
  }
  async getDownloads(id: String) {
    const downloadRef = collection(firedb, 'downloads');
    const q = query(downloadRef, where('id', '==', id));
    const querySnapshot = await getDocs(q);
    const retData = [];
    querySnapshot.forEach(doc => {
      retData.push(doc.data());
    });
    return retData;
  }
  async getAllDownloads(userId: String) {
    const downloadRef = collection(firedb, 'downloads');
    const q = query(downloadRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const retData = [];
    querySnapshot.forEach(doc => {
      retData.push(doc.data());
    });
    return retData;
  }

  async updateDownloads(
    id,
    completed: String,
    percentage: String,
    status: String,
    total: String,
    folderName,
    fileName,
    token,
    userId,
    stopped,
    error,
  ) {
    const downloadRef = collection(firedb, 'downloads');
    const q = query(downloadRef, where('id', '==', id));
    const querySnapshot = await getDocs(q);
    let docId = '';
    querySnapshot.forEach(doc => {
      docId = doc.id;
    });

    if (status == 'Completed' && !stopped) {
      const indexController = new IndexController();
      const docRef = doc(firedb, 'downloads', docId);
      await updateDoc(docRef, {
        completed: completed,
        percentage: percentage,
        status: status,
        total: total,
        stopped: stopped,
        error: error,
      });
      try {
        indexController.upload({ folderFromApi: folderName, downloadId: id, fileNameFromApi: fileName, id: id, token: token, userId: userId });
      } catch (err) {
        console.log(err);
      }
    } else if (status == 'Completed' && stopped) {
      const indexController = new IndexController();
      const docRef = doc(firedb, 'downloads', docId);
      await updateDoc(docRef, {
        completed: completed,
        percentage: percentage,
        status: status,
        total: total,
        stopped: stopped,
        error: error,
      });
      indexController.checkPendingAndUpdate(userId);
    } else {
      const docRef = doc(firedb, 'downloads', docId);
      await updateDoc(docRef, {
        completed: completed,
        percentage: percentage,
        status: status,
        total: total,
        stopped: stopped,
        error: error,
      });
    }
  }
  async addUploads(id: String, userId: String, fileName: String, downloadId: String, path: String) {
    try {
      const docRef = await addDoc(collection(firedb, 'uploads'), {
        id: id,
        userId: userId,
        fileName: fileName,
        status: 'pending',
        downloadId: downloadId,
        path: path,
        folderId: 'null',
      });
      console.log('Upload Document written with ID: ', docRef.id);
    } catch (e) {
      console.error('Error adding Upload document: ', e);
    }
  }
  async getAllUploads(userId: String) {
    const downloadRef = collection(firedb, 'uploads');
    const q = query(downloadRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const retData = [];
    querySnapshot.forEach(doc => {
      retData.push(doc.data());
    });
    return retData;
  }
  async updateUploads(id: String, status: String, folderId) {
    const uploadRef = collection(firedb, 'uploads');
    const q = query(uploadRef, where('id', '==', id));
    const querySnapshot = await getDocs(q);
    let docId = '';
    querySnapshot.forEach(doc => {
      docId = doc.id;
    });
    if (docId != undefined) {
      const docRef = doc(firedb, 'uploads', docId);
      if (folderId != 'null') {
        await updateDoc(docRef, {
          status: status,
          folderId: folderId,
        });
      } else {
        await updateDoc(docRef, {
          status: status,
          folderId_null: 'null',
        });
      }
    }
  }
}
