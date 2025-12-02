// =========================
// app.js — versão corrigida
// =========================

// Verifica se Paho carregou
if (typeof window.Paho === "undefined") {
  alert("ERRO: Biblioteca MQTT (Paho) não carregou! Verifique o arquivo mqttws31.min.js.");
  throw new Error("Paho MQTT não carregou");
}

// Iniciar aplicação
startApp();

function startApp() {

  // =========================
  // CONFIG MQTT (EMQX CLOUD)
  // =========================
  const host = "y1184ab7.ala.us-east-1.emqxsl.com";
  const port = 8084;                 // WebSocket seguro (TLS)
  const path = "/mqtt";              // Caminho obrigatório
  const topicBase = "smart_level/central/";

  // =========================
  // CLIENT MQTT CORRIGIDO
  // =========================
  let client = new Paho.MQTT.Client(
    host,                            // host
    Number(port),                    // porta
    path,                            // path CORRETO
    "web_" + parseInt(Math.random() * 100000) // clientId
  );

  // =========================
  // EVENTOS MQTT
  // =========================

  client.onConnectionLost = () => {
    const s = document.getElementById("mqtt-status");
    if (s) {
      s.className = "red";
      s.innerText = "Desconectado";
    }
  };

  client.onMessageArrived = onMessage;

  // =========================
  // CONECTAR
  // =========================

  client.connect({
    useSSL: true,
    userName: "Admin",
    password: "Admin",
    timeout: 5,
    onSuccess: () => {
      const s = document.getElementById("mqtt-status");
      if (s) {
        s.className = "green";
        s.innerText = "Conectado";
      }
      subscribeAll();
    },

    onFailure: (e) => {
      console.log("ERRO MQTT: ", e);
      const s = document.getElementById("mqtt-status");
      if (s) s.innerText = "Falhou";
    }
  });

  // =========================
  // ASSINAR TÓPICOS
  // =========================

  function subscribeAll() {
    const topics = [
      "sistema","retrolavagem","manual","poco_ativo","retro_history",
      "p1_online","p2_online","p3_online",
      "p1_timer","p2_timer","p3_timer",
      "rodizio_min","retroA_status","retroB_status","timeout"
    ];

    topics.forEach(t => {
      try { client.subscribe(topicBase + t); }
      catch (e) { console.warn("subscribe falhou:", e); }
    });
  }

  // =========================
  // RECEBER MENSAGENS
  // =========================

  function onMessage(msg) {
    const t = msg.destinationName.replace(topicBase, "");
    const v = msg.payloadString;

    switch (t) {

      case "sistema":
        updateText("central-status", v === "1" ? "Ligada" : "Desligada");
        updateText("sistema", v === "1" ? "Ligado" : "Desligado");
        break;

      case "retrolavagem":
        updateText("fase", v === "1" ? "Retrolavando" : "Nivel_Control");
        break;

      case "manual":
        updateText("modo", v === "1" ? "Manual" : "Auto");
        break;

      case "poco_ativo":
        updateText("pocoAtivo", "P" + v);
        break;

      case "retro_history":
        updateHistory(v);
        break;

      case "p1_online": updateStatus("p1_online", v); break;
      case "p2_online": updateStatus("p2_online", v); break;
      case "p3_online": updateStatus("p3_online", v); break;

      case "p1_timer": updateText("p1_timer", formatTimer(v)); break;
      case "p2_timer": updateText("p2_timer", formatTimer(v)); break;
      case "p3_timer": updateText("p3_timer", formatTimer(v)); break;

      case "rodizio_min": document.getElementById("rodizio").value = v; break;
      case "retroA_status": document.getElementById("retroA").value = v; break;
      case "retroB_status": document.getElementById("retroB").value = v; break;
      case "timeout": document.getElementById("timeout").value = v; break;
    }
  }

  // =========================
  // FUNÇÕES DE INTERFACE
  // =========================

  function updateText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.innerText = txt;
  }

  function updateStatus(id, val) {
    const el = document.getElementById(id);
    if (!el) return;

    el.innerText = val === "1" ? "Online" : "Offline";
    el.className = val === "1" ? "green" : "red";
  }

  function formatTimer(sec) {
    sec = Number(sec);
    let h = Math.floor(sec / 3600);
    let m = Math.floor((sec % 3600) / 60);
    return `${h}h ${m}min`;
  }

  function updateHistory(json) {
    let arr = [];
    try { arr = JSON.parse(json); }
    catch (e) {
      console.warn("retro_history JSON invalido", e);
      return;
    }
    let html = "";

    arr.forEach(r => {
      let inicio = `${r.hi}:${String(r.mi).padStart(2, "0")}`;
      let fim = `${r.hf}:${String(r.mf).padStart(2, "0")}`;
      html += `[${r.d}/${r.m}/${r.a}] ${inicio} → ${fim}<br>`;
    });

    const el = document.getElementById("historico");
    if (el) el.innerHTML = html;
  }

  // =========================
  // ENVIAR COMANDOS
  // =========================

  function sendCmd(payload) {
    try {
      const msg = new Paho.MQTT.Message(payload);
      msg.destinationName = topicBase + "cmd";
      client.send(msg);
    } catch (e) {
      console.error("Falha ao enviar cmd:", e);
      alert("Falha ao enviar comando MQTT.");
    }
  }

  window.toggleSistema = function () {
    sendCmd('{"toggle":1}');
  };

  window.enviarConfig = function () {
    const rod = document.getElementById("rodizio").value || 60;
    const A = document.getElementById("retroA").value || 1;
    const B = document.getElementById("retroB").value || 2;
    const tout = document.getElementById("timeout").value || 15;

    const payload = `{"rodizio":${rod},"retroA":${A},"retroB":${B},"timeout":${tout}}`;
    sendCmd(payload);
    alert("Configurações enviadas!");
  };
}
