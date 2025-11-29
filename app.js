let client = null;

// ---------------------------
// 1) CONECTAR
// ---------------------------
function connectMQTT() {
  const brokerURL = document.getElementById("brokerUrl").value;
  const username  = document.getElementById("mqttUser").value;
  const password  = document.getElementById("mqttPass").value;

  try {
    client = mqtt.connect(brokerURL, {
      username,
      password,
      reconnectPeriod: 2000,
    });
  } catch (e) {
    console.error("ERRO MQTT:", e);
    return;
  }

  client.on("connect", () => {
    document.getElementById("status").innerText = "Conectado ✓";
    console.log("MQTT conectado!");
    subscribeAll();
  });

  client.on("error", (err) => {
    console.error("Erro MQTT:", err);
    document.getElementById("status").innerText = "Erro ao conectar";
  });

  client.on("close", () => {
    document.getElementById("status").innerText = "Desconectado";
  });

  client.on("message", (topic, message) => {
    updateUI(topic, message.toString());
  });
}


// ---------------------------
// 2) ASSINAR TÓPICOS EM BLOCOS
// ---------------------------
function subscribeAll() {

  const blocos = [
    [
      "central/sistema",
      "central/nivel",
      "central/poco_ativo",
      "central/retrolavagem",
      "central/retropocos"
    ],
    [
      "central/p1_online",
      "central/p2_online",
      "central/p3_online",
      "pocos/fluxo1",
      "pocos/fluxo2",
      "pocos/fluxo3"
    ]
  ];

  blocos.forEach((grupo, i) => {
    setTimeout(() => {
      grupo.forEach(t => {
        client.subscribe(t, {}, (err) => {
          if (err) console.error("Falhou subscribe:", t);
          else console.log("Subscreveu:", t);
        });
      });
    }, i * 500); // pequeno atraso para não ativar limite
  });

}


// ---------------------------
// 3) ATUALIZAR A TELA
// ---------------------------
function updateUI(topic, value) {

  switch (topic) {

    case "central/sistema":
      document.getElementById("sistema").innerText = value;
      break;

    case "central/nivel":
      document.getElementById("nivel").innerText = value;
      break;

    case "central/poco_ativo":
      document.getElementById("pocoAtivo").innerText = value;
      break;

    case "central/retrolavagem":
      document.getElementById("retro").innerText = value;
      break;

    case "central/retropocos":
      document.getElementById("retropocos").innerText = value;
      break;

    case "central/p1_online":
      document.getElementById("p1_online").innerText = value;
      break;

    case "central/p2_online":
      document.getElementById("p2_online").innerText = value;
      break;

    case "central/p3_online":
      document.getElementById("p3_online").innerText = value;
      break;

    case "pocos/fluxo1":
      document.getElementById("fluxo1").innerText = value;
      break;

    case "pocos/fluxo2":
      document.getElementById("fluxo2").innerText = value;
      break;

    case "pocos/fluxo3":
      document.getElementById("fluxo3").innerText = value;
      break;
  }
}
