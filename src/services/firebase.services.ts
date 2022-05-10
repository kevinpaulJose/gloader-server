import IndexController from '@/controllers/index.controller';
import { firedb } from '@/databases/firebase';
import { collection, addDoc, query, where, getDocs, Timestamp, doc, updateDoc } from 'firebase/firestore';

export class FireService {
  downloadRef = collection(firedb, 'downloads');
  uploadRef = collection(firedb, 'uploads');
  async addDownloads(id: String, userId: String, url: String, fileName: String) {
    try {
      const docRef = await addDoc(collection(firedb, 'downloads'), {
        id: id,
        userId: userId,
        url: url,
        completed: '0',
        fileName: fileName,
        percentage: '0',
        status: 'pending',
        total: '0',
        added: Timestamp.fromDate(new Date()),
      });
      console.log('Download Document written with ID: ', docRef.id);
    } catch (e) {
      console.error('Error adding Download document: ', e);
    }
  }
  async getDownloads(id: String) {
    const q = query(this.downloadRef, where('id', '==', id));
    const querySnapshot = await getDocs(q);
    const retData = [];
    querySnapshot.forEach(doc => {
      retData.push(doc.data());
    });
    return retData;
  }

  async updateDownloads(id, completed: String, percentage: String, status: String, total: String, folderName, fileName, token, userId) {
    const q = query(this.downloadRef, where('id', '==', id));
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
      });
      if (status == 'Completed') {
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
  async updateUploads(id: String, status: String) {
    const q = query(this.uploadRef, where('id', '==', id));
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
