// ==============================
//   CLIENTE A  (CENTRAL + FLUXO1 + FLUXO2)
// ==============================

let clientA = null;
let clientB = null;

function connectMQTT() {
  const broker = document.getElementById("brokerUrl").value.trim();
  const user = document.getElementById("mqttUser").value.trim();
  const pass = document.getElementById("mqttPass").value.trim();

  if (!broker || !user || !pass) {
    alert("Preencha todos os campos!");
    return;
  }

  // -------- CLIENTE A --------
  clientA = mqtt.connect(broker, {
    username: user,
    password: pass,
    reconnectPeriod: 3000
  });

  clientA.on("connect", () => {
    console.log("MQTT A conectado!");
    document.getElementById("status").innerText = "Conectado ✓ (A + B)";
    subscribeA();
  });

  clientA.on("message", (topic, msg) => {
    processMessage(topic, msg.toString());
  });

  clientA.on("error", (e) => console.error("Erro A:", e));


  // -------- CLIENTE B --------
  clientB = mqtt.connect(broker, {
    username: user,
    password: pass,
    reconnectPeriod: 3000
  });

  clientB.on("connect", () => {
    console.log("MQTT B conectado!");
    subscribeB();
  });

  clientB.on("message", (topic, msg) => {
    processMessage(topic, msg.toString());
  });

  clientB.on("error", (e) => console.error("Erro B:", e));
}



// ======================================================================
//   SUBSCRIÇÕES DO CLIENTE A
// ======================================================================

function subscribeA() {
  const topicsA = [
    "central/sistema",
    "central/nivel",
    "central/poco_ativo",
    "central/retrolavagem",
    "central/retropocos",
    "central/p1_online",
    "central/p2_online",
    "central/p3_online",
    "pocos/fluxo1",
    "pocos/fluxo2"
  ];

  topicsA.forEach(t => {
    clientA.subscribe(t, {}, err => {
      if (err) console.error("Falha A:", t);
      else console.log("Sub A:", t);
    });
  });
}



// ======================================================================
//   SUBSCRIÇÃO DO CLIENTE B (APENAS UM TÓPICO)
// ======================================================================

function subscribeB() {
  clientB.subscribe("pocos/fluxo3", {}, err => {
    if (err) console.error("Falha B:", "pocos/fluxo3");
    else console.log("Sub B:", "pocos/fluxo3");
  });
}



// ======================================================================
//   PROCESSA TODAS MENSAGENS
// ======================================================================

function processMessage(topic, value) {
  console.log("MQTT RECEBIDO →", topic, value);

  switch (topic) {
    case "central/sistema":
      document.getElementById("sistema").innerText = value; break;

    case "central/nivel":
      document.getElementById("nivel").innerText = value; break;

    case "central/poco_ativo":
      document.getElementById("pocoAtivo").innerText = value; break;

    case "central/retrolavagem":
      document.getElementById("retro").innerText = value; break;

    case "central/retropocos":
      document.getElementById("retropocos").innerText = value; break;

    case "central/p1_online":
      document.getElementById("p1_online").innerText = value; break;

    case "central/p2_online":
      document.getElementById("p2_online").innerText = value; break;

    case "central/p3_online":
      document.getElementById("p3_online").innerText = value; break;

    case "pocos/fluxo1":
      document.getElementById("fluxo1").innerText = value; break;

    case "pocos/fluxo2":
      document.getElementById("fluxo2").innerText = value; break;

    case "pocos/fluxo3":
      document.getElementById("fluxo3").innerText = value; break;
  }
}
