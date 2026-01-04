importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBL2dc2TEwY2Zcj0J-h5unYi2JnWB2kYak",
  authDomain: "fenix-smart-control.firebaseapp.com",
  projectId: "fenix-smart-control",
  storageBucket: "fenix-smart-control.firebasestorage.app",
  messagingSenderId: "968097808460",
  appId: "1:968097808460:web:3a7e316536fa384b4bb4e9",
  measurementId: "G-7Q6DZZZ9NL"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Intercepta a notificação quando o app está fechado ou em segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('Alerta Fênix recebido:', payload);
  
  const notificationTitle = payload.data.title || "Alerta Fênix";
  const notificationOptions = {
    body: payload.data.body || "Verifique o painel de controle.",
    icon: 'logo.jpg',
    badge: 'logo.jpg', // Ícone pequeno para a barra de status
    vibrate: [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 450, 110, 200, 110],
    tag: 'alarme-central',
    renotify: true,
    data: {
      url: window.location.origin // Abre o app ao clicar
    }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
