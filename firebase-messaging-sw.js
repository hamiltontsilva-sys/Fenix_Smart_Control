// Importa as bibliotecas compatíveis com a versão que você usa no HTML
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Inicializa com as suas credenciais reais (substitua pelos seus dados do Firebase)
firebase.initializeApp({
  apiKey: "SUA_API_KEY",
  authDomain: "fenix-smart-control.firebaseapp.com",
  projectId: "fenix-smart-control",
  storageBucket: "fenix-smart-control.appspot.com",
  messagingSenderId: "SEU_SENDER_ID",
  appId: "SEU_APP_ID"
});

const messaging = firebase.messaging();

// Captura notificações quando o navegador/aba está fechado ou em segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('🔔 Mensagem em segundo plano:', payload);
  
  const notificationTitle = payload.notification.title || "Alerta Fênix";
  const notificationOptions = {
    body: payload.notification.body || "Verifique o painel de controle.",
    icon: 'logo.jpg', // Caminho sem o ponto inicial para garantir o carregamento
    badge: 'logo.jpg', // Ícone pequeno na barra de notificações do Android
    vibrate: [200, 100, 200]
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});
