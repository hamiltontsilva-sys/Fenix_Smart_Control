importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js');

firebase.initializeApp({
  apiKey: "SUA_API_KEY",
  projectId: "fenix-smart-control",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
});

const messaging = firebase.messaging();

// Isso permite receber a notificação com o app fechado
messaging.onBackgroundMessage((payload) => {
  console.log('Mensagem recebida em segundo plano: ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: './logo.jpg' 
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});
