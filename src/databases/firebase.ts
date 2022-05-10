// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
// import { getAnalytics } from 'firebase/analytics';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: 'AIzaSyDbS0yH5CfFPlbBEHEJm_I_uA3BjzOv4ms',
  authDomain: 'gloader-349706.firebaseapp.com',
  projectId: 'gloader-349706',
  storageBucket: 'gloader-349706.appspot.com',
  messagingSenderId: '346457672075',
  appId: '1:346457672075:web:19cbfb0968b53e2673878e',
  measurementId: 'G-772XV6SRLC',
};

// Initialize Firebase
export const fireApp = initializeApp(firebaseConfig);
export const firedb = getFirestore(fireApp);
// const analytics = getAnalytics(fireApp);
