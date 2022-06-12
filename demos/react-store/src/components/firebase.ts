// Import the functions you need from the SDKs you need
import { getAnalytics } from "firebase/analytics";
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCll8CqDCWAj0agvD650z5sE_gf2iztHbM",
  authDomain: "wycats.firebaseapp.com",
  projectId: "wycats",
  storageBucket: "wycats.appspot.com",
  messagingSenderId: "841128248701",
  appId: "1:841128248701:web:71c3319f2a53e393b3f814",
  measurementId: "G-3M6YZP667Q",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
