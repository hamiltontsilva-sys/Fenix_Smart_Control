/* =======================================================
      CONFIGURAÇÃO MQTT
========================================================== */

let clientID = "dashboard_" + Math.floor(Math.random() * 999999);

let client = new Paho.MQTT.Client(
  "y1184ab7.ala.us-east-1.emqxsl.com",
  8084,
  clientID
);

client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

function connectMQTT() {
  client.connect({
    useSSL: true,
    userName: "Admin",
    password: "Admin",
    onSuccess: () => {
      console.log("[MQTT] Conectado!");

      setStatus("mqtt", true);

      // -------- ASSINAR TODOS OS TÓPICOS NECESSÁRIOS --------
      client.subscribe("smart_level/central/sistema");
      client.subscribe("smart_level/central/poco_ativo");
      client.subscribe("smart_level/central/nivel");
      client.subscribe("smart_level/central/retrolavagem");

      client.subscribe("smart_level/central/rodizio_min");
      client.subscribe("smart_level/central/retroA_status");
      client.subscribe("smart_level/central/retroB_status");
      client.subscribe("smart_level/central/timeout");

      client.subscribe("smart_level/central/p1_online");
      client.subscribe("smart_level/central/p2_online");
      client.subscribe("smart_level/central/p3_online");

      client.subscribe("smart_level/central/p1_timer");
      client.subscribe("smart_level/central/p2_timer");
      client.subscribe("smart_level/central/p3_timer");

      client.subscribe("smart_level/central/retro_history");

      console.log("[MQTT] Assinaturas OK");
    },
    onFailure: () => {
      console.warn("[MQTT] Falha ao conectar. Tentando em 3s...");
      setTimeout(connectMQTT, 3000);
    }
  });
}

connectMQTT();


/* =======================================================
      GERENCIAMENTO DE CONEXÃO
========================================================== */

function onConnectionLost() {
  console.warn("[MQTT] Conexão perdida!");
  setStatus("mqtt", false);
  setTimeout(connectMQTT, 3000);
}

function onMessageArrived(msg) {
  let t = msg.destinationName;
  let v = msg.payloadString;

  console.log("[MQTT] MSG", t, v);

  // -------------- SISTEMA LIGADO/DESLIGADO --------------
  if (t === "smart_level/central/sistema") {
    setStatus("central", v === "1");
    return;
  }

  // -------------- POÇO ATIVO --------------
  if (t === "smart_level/central/poco_ativo") {
    setText("Rodízio", "P" + v);
    return;
  }

  // -------------- NIVEL (BOIA) --------------
  if (t === "smart_level/central/nivel") {
    // 1 = enchendo, 0 = cheio
    let estado = v === "1" ? "Enchendo" : "Cheio";
    setText("Fase", estado);
    return;
  }

  // -------------- RETROLAVAGEM --------------
  if (t === "smart_level/central/retrolavagem") {
    if (v === "1") setText("Fase", "Retrolavando");
    return;
  }

  // -------------- CONFIGURAÇÕES --------------
  if (t === "smart_level/central/rodizio_min") {
    setText("Intervalo Rodízio:", v + " min");
    return;
  }
  if (t === "smart_level/central/retroA_status") {
    setText("Retro A:", "P" + v);
    return;
  }
  if (t === "smart_level/central/retroB_status") {
    setText("Retro B:", "P" + v);
    return;
  }
  if (t === "smart_level/central/timeout") {
    setText("Timeout:", v + "s");
    return;
  }

  // -------------- ONLINE / OFFLINE DOS POÇOS --------------
  if (t === "smart_level/central/p1_online") {
    setWellOnline(1, v === "1");
    return;
  }
  if (t === "smart_level/central/p2_online") {
    setWellOnline(2, v === "1");
    return;
  }
  if (t === "smart_level/central/p3_online") {
    setWellOnline(3, v === "1");
    return;
  }

  // -------------- TIMERS --------------
  if (t === "smart_level/central/p1_timer") {
    setWellTimer(1, v);
    return;
  }
  if (t === "smart_level/central/p2_timer") {
    setWellTimer(2, v);
    return;
  }
  if (t === "smart_level/central/p3_timer") {
    setWellTimer(3, v);
    return;
  }

  // -------------- HISTÓRICO DE RETROLAVAGEM --------------
  if (t === "smart_level/central/retro_history") {
    try {
      let arr = JSON.parse(v);
      updateHistorico(arr);
    } catch (e) {
      console.error("JSON inválido em retro_history");
    }
  }
}


/* =======================================================
      FUNÇÕES DE ATUALIZAÇÃO DO HTML
========================================================== */

function setStatus(tipo, online) {
  let el = document.querySelector(
    tipo === "mqtt"
      ? "header .status-box span:nth-child(1)"
      : "header .status-box span:nth-child(2)"
  );

  el.innerHTML = online ? "Conectado" : "Desconectado";
  el.className = online ? "green" : "red";
}

function setText(label, texto) {
  let rows = document.querySelectorAll(".left-col .row");
  rows.forEach(r => {
    if (r.innerText.includes(label)) {
      r.querySelector("span:last-child").innerHTML = texto;
    }
  });
}

function setWellOnline(id, ok) {
  let card = document.querySelectorAll(".well-card")[id - 1];
  let row = card.querySelectorAll(".row")[0];
  row.innerHTML =
    `<span class="label">Comuni:</span> ` +
    (ok ? `<span class="green">Online</span>` : `<span class="red">Offline</span>`);
}

function setWellTimer(id, segundos) {
  let min = Math.floor(Number(segundos) / 60);
  let card = document.querySelectorAll(".well-card")[id - 1];
  let row = card.querySelectorAll(".row")[2];

  row.innerHTML = `<span class="label">Acumuli:</span> ${min} min`;
}

// Fluxo (a CENTRAL ainda não publica fluxos)
function setWellFluxo(id, status) {
  let card = document.querySelectorAll(".well-card")[id - 1];
  let row = card.querySelectorAll(".row")[1];

  row.innerHTML = `<span class="label">Fluxo:</span> ${status}`;
}

/* =======================================================
      HISTÓRICO DE RETROLAVAGEM (LISTA)
========================================================== */

function updateHistorico(arr) {
  let box = document.querySelector(".history");
  box.innerHTML = "";

  arr.forEach(e => {
    let linha =
      `[${String(e.d).padStart(2, "0")}/${String(e.m).padStart(2, "0")}/20${e.a}] ` +
      `inicio ${e.hi}:${String(e.mi).padStart(2, "0")} → ` +
      `${e.hf}:${String(e.mf).padStart(2, "0")}`;

    box.innerHTML += linha + "<br>";
  });
}
