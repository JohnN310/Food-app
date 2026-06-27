const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable } = require('firebase/functions');

const firebaseConfig = {
  projectId: "food-app-beced",
};

const app = initializeApp(firebaseConfig);
const functions = getFunctions(app);

const createSetupIntent = httpsCallable(functions, 'createSetupIntent');

createSetupIntent({ token: "fake-token" })
  .then(res => console.log("Success:", res.data))
  .catch(err => {
    console.log("Error Name:", err.name);
    console.log("Error Code:", err.code);
    console.log("Error Message:", err.message);
  });
