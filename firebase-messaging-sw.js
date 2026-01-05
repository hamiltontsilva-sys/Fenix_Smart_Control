importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

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

// Variável para evitar processar a mesma mensagem duas vezes seguidas
let lastMessageId = null;

messaging.onBackgroundMessage((payload) => {
  // 1. TRAVA DE DUPLICIDADE: Se o ID da mensagem for igual ao anterior, ignora.
  if (lastMessageId === payload.messageId) {
    return;
  }
  lastMessageId = payload.messageId;

  console.log('🔔 Alerta recebido em segundo plano:', payload);
  
  const notificationTitle = payload.notification.title || "🚨 ALERTA FÊNIX";
  const notificationOptions = {
    body: payload.notification.body || "Verificar sistema agora!",
    icon: 'logo.jpg', 
    badge: 'logo.jpg',
    // 2. TAG DE AGRUPAMENTO: Isso impede que apareçam vários ícones. 
    // Se chegar uma nova notificação, ela substitui a anterior no painel.
    tag: 'fenix-status-alerta', 
    renotify: true, // Faz o celular vibrar novamente mesmo se a notificação for substituída
    vibrate: [500, 110, 500],
    data: {
      url: 'https://hamiltontsilva-sys.github.io/Fenix_Smart_Control/'
    }
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
