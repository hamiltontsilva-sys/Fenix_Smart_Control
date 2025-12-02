/* =======================================================
    CONFIGURAÇÃO MQTT
========================================================== */

let clientID = "dashboard_" + Math.floor(Math.random() * 999999);
let client = new Paho.MQTT.Client("test.mosquitto.org", 8081, clientID);

let ultimoRetrolavando = []; // para exibir quais poços estão fazendo retrolavagem

client.onConnectionLost = function () {
  document.getElementById("mqtt-status").innerHTML = "Desconectado";
  document.getElementById("mqtt-status").className = "red";

  console.warn("MQTT caiu — tentando reconectar em 3s...");
  setTimeout(connectMQTT, 3000);
};

client.onMessageArrived = function (msg) {
  tratarMensagem(msg.destinationName, msg.payloadString);
};

/* Conectar MQTT */
function connectMQTT() {
  client.connect({
    useSSL: true,
    onSuccess: () => {
      console.log("MQTT Conectado");
      document.getElementById("mqtt-status").innerHTML = "Conectado";
      document.getElementById("mqtt-status").className = "green";

      /* Assina todos os tópicos necessários */
      client.subscribe("central/status");
      client.subscribe("central/config");
      client.subscribe("poco/+/status");
    },
    onFailure: () => {
      console.error("Falha MQTT. Retentando em 3s...");
      setTimeout(connectMQTT, 3000);
    },
  });
}

connectMQTT();



/* =======================================================
    TRATAMENTO DAS MENSAGENS MQTT
========================================================== */

function tratarMensagem(topico, payload) {
  let data;

  try {
    data = JSON.parse(payload);
  } catch (e) {
    console.warn("Mensagem inválida:", payload);
    return;
  }

  /* ---------------------------------------------
      STATUS GERAL DA CENTRAL
  --------------------------------------------- */
  if (topico === "central/status") {
    atualizarCentral(data);
    return;
  }

  /* ---------------------------------------------
      STATUS DOS POÇOS
      Exemplo de tópico:
      poco/1/status
  --------------------------------------------- */
  const match = topico.match(/poco\/(\d+)\/status/);
  if (match) {
    let num = match[1];
    atualizarPoco(num, data);
  }
}



/* =======================================================
    ATUALIZAÇÃO DA CENTRAL NO DASHBOARD
========================================================== */

function atualizarCentral(d) {
  document.getElementById("central-status").innerHTML =
    d.sistema ? "Ligada" : "Desligada";
  document.getElementById("central-status").className = d.sistema
    ? "green"
    : "red";

  document.getElementById("sistema").innerHTML = d.sistema ? "Ligado" : "Desligado";
  document.getElementById("fase").innerHTML = d.fase;
  document.getElementById("modo").innerHTML =
    d.modo === "nivel" ? "Nível Controlado" : "Rodízio";
  document.getElementById("pocoAtivo").innerHTML = d.pocoAtivo;

  /* Detecta retrolavagem */
  if (Array.isArray(d.retrolavagem) && d.retrolavagem.length > 0) {
    ultimoRetrolavando = d.retrolavagem;
  } else {
    ultimoRetrolavando = [];
  }
}



/* =======================================================
    ATUALIZAÇÃO DOS POÇOS NO DASHBOARD
========================================================== */

function atualizarPoco(id, d) {
  // IDs de elementos usados no HTML
  let elOnline = document.getElementById(`p${id}_online`);
  let elTimer = document.getElementById(`p${id}_timer`);
  let elFluxo = document.getElementById(`p${id}_fluxo`);
  let elEstado = document.getElementById(`p${id}_estado`);

  /* Comunicação */
  if (d.online) {
    elOnline.innerHTML = "Online";
    elOnline.className = "green";
  } else {
    elOnline.innerHTML = "Offline";
    elOnline.className = "red";
  }

  /* Timer */
  elTimer.innerHTML = d.timer + " s";

  /* Fluxo */
  if (d.fluxo === 1) {
    elFluxo.innerHTML = "Fluxo Presente";
    elFluxo.className = "green";
  } else {
    elFluxo.innerHTML = "Fluxo Ausente";
    elFluxo.className = "red";
  }

  /* Estado */
  if (ultimoRetrolavando.includes(parseInt(id))) {
    elEstado.innerHTML = `Retrolavando (${ultimoRetrolavando.join(", ")})`;
    elEstado.style.color = "#c79300"; // amarelo
  } else if (d.modo === "nivel") {
    // Se estiver em nível controlado
    elEstado.style.color = "#1c3f94"; // azul
    elEstado.innerHTML = d.nivel === "cheio" ? "Cheio" : "Enchendo";
  } else {
    // Outro modo qualquer
    elEstado.style.color = "#333";
    elEstado.innerHTML = "Normal";
  }
}



/* =======================================================
    BOTÃO LIGAR / DESLIGAR A CENTRAL
========================================================== */

function toggleSistema() {
  let msg = new Paho.MQTT.Message("toggle");
  msg.destinationName = "central/cmd";
  client.send(msg);
}



/* =======================================================
    ENVIO DE CONFIGURAÇÕES
========================================================== */

function enviarConfig() {
  let config = {
    rodizio: parseInt(document.getElementById("rodizio").value),
    retroA: parseInt(document.getElementById("retroA").value),
    retroB: parseInt(document.getElementById("retroB").value),
    timeout: parseInt(document.getElementById("timeout").value),
  };

  let msg = new Paho.MQTT.Message(JSON.stringify(config));
  msg.destinationName = "central/config/set";
  client.send(msg);

  alert("Configurações enviadas!");
}



/* =======================================================
    HISTÓRICO DE RETROLAVAGEM
========================================================== */

function adicionarHistorico(texto) {
  let hist = document.getElementById("historico");
  let linha = document.createElement("div");
  linha.innerText = texto;

  hist.prepend(linha); // adiciona no topo
}
