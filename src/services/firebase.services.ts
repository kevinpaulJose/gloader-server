import IndexController from '@/controllers/index.controller';
import { firedb } from '@/databases/firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, doc, updateDoc } from 'firebase/firestore';

export class FireService {
  async addDownloads(id: String, userId: String, url: String, fileName: String, status: String, folderName: String, token: String) {
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
      });
      console.log('Download Document written with ID: ', docRef.id);
    } catch (e) {
      console.error('Error adding Download document: ', e);
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

  async updateDownloads(id, completed: String, percentage: String, status: String, total: String, folderName, fileName, token, userId, stopped) {
    const downloadRef = collection(firedb, 'downloads');
    const q = query(downloadRef, where('id', '==', id));
    const querySnapshot = await getDocs(q);
    let docId = '';
    let count = 0;
    querySnapshot.forEach(doc => {
      docId = doc.id;
      count++;
    });
    if (count != 0) {
      const docRef = doc(firedb, 'downloads', docId);
      await updateDoc(docRef, {
        completed: completed,
        percentage: percentage,
        status: status,
        total: total,
        stopped: stopped,
      });
      if (status == 'Completed' && !stopped) {
        const indexController = new IndexController();
        indexController.upload({ folderFromApi: folderName, downloadId: id, fileNameFromApi: fileName, id: id, token: token, userId: userId });
      }
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
  async updateUploads(id: String, status: String) {
    const uploadRef = collection(firedb, 'uploads');
    const q = query(uploadRef, where('id', '==', id));
    const querySnapshot = await getDocs(q);
    let docId = '';
    querySnapshot.forEach(doc => {
      docId = doc.id;
    });
    if (docId != undefined) {
      const docRef = doc(firedb, 'uploads', docId);
      await updateDoc(docRef, {
        status: status,
      });
    }
  }
}
