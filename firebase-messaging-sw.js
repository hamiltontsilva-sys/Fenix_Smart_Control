// Importa as bibliotecas compatíveis para o Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Inicializa o Firebase com as SUAS chaves reais
firebase.initializeApp({
  apiKey: "AIzaSyBL2dc2TEwY2Zcj0J-h5unYi2JnWB2kYak",
  authDomain: "fenix-smart-control.firebaseapp.com",
  databaseURL: "https://fenix-smart-control-default-rtdb.firebaseio.com",
  projectId: "fenix-smart-control",
  storageBucket: "fenix-smart-control.firebasestorage.app",
  messagingSenderId: "968097808460",
  appId: "1:968097808460:web:3a7e316536fa384b4bb4e9",
  measurementId: "G-7Q6DZZZ9NL"
});

const messaging = firebase.messaging();

// Configura o que fazer quando a notificação chega com o navegador fechado (Android)
messaging.onBackgroundMessage((payload) => {
  console.log('🔔 Alerta recebido em segundo plano:', payload);
  
  const notificationTitle = payload.notification.title || "🚨 ALERTA FÊNIX";
  const notificationOptions = {
    body: payload.notification.body || "Verificar sistema agora!",
    icon: 'logo.jpg', 
    badge: 'logo.jpg',
    vibrate: [500, 110, 500, 110, 450, 110, 200, 110, 170, 40, 450, 110, 200, 110, 170, 40],
    data: {
      url: 'https://hamiltontsilva-sys.github.io/Fenix_Smart_Control/'
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Abre o site quando o usuário clica na notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
