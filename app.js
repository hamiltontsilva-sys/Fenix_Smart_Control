// =========================
// app.js — carregador resiliente Paho + app
// =========================

// TENTAR CARREGAR PAHO (local -> cdnjs -> jsdelivr -> unpkg)
// retorna Promise que resolve quando Paho estiver disponível
function loadPahoLibrary() {
  const sources = [
    "/mqttws31.min.js", // local (favor subir no repo)
    "https://cdnjs.cloudflare.com/ajax/libs/paho-mqtt/1.1.0/mqttws31.min.js",
    "https://cdn.jsdelivr.net/npm/paho-mqtt@1.1.0/mqttws31.min.js",
    "https://unpkg.com/paho-mqtt@1.1.0/mqttws31.min.js"
  ];

  return new Promise((resolve, reject) => {
    let idx = 0;

    function tryNext() {
      if (idx >= sources.length) {
        reject(new Error("Todas as fontes Paho falharam"));
        return;
      }
      const src = sources[idx++];
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => {
        // checar se o objeto global Paho existe
        if (typeof window.Paho !== "undefined" && window.Paho.MQTT && window.Paho.MQTT.Client) {
          console.log("[PAHO] carregado via", src);
          resolve(src);
        } else {
          console.warn("[PAHO] script carregado mas Paho não definido:", src);
          // tenta próxima fonte
          tryNext();
        }
      };
      s.onerror = (e) => {
        console.warn("[PAHO] falha ao carregar", src);
        // remover tag (limpeza)
        s.remove();
        setTimeout(tryNext, 50);
      };
      document.head.appendChild(s);
    }

    tryNext();
  });
}

// chamada inicial: primeiro carrega paho, depois inicia app
loadPahoLibrary()
  .then(src => {
    console.log("Paho disponível a partir de:", src);
    startApp(); // inicia o restante do app
  })
  .catch(err => {
    console.error("Erro: não foi possível carregar Paho MQTT:", err);
    // mostra mensagem clara ao usuário na página
    const el = document.getElementById('mqtt-status');
    if (el) {
      el.className = 'red';
      el.innerText = 'Paho não carregou';
    }
    alert("Falha ao carregar biblioteca MQTT (Paho). Verifique bloqueadores ou faça upload do arquivo mqttws31.min.js na raiz do repositório.");
  });

/* ============================================================
   A PARTIR DAQUI: aplicação MQTT — permanece igual à versão anterior
   (função startApp é executada só após Paho estar disponível)
   ============================================================ */

function startApp(){
  // =========================
  // CONFIG MQTT (EMQX CLOUD)
  // =========================

  const host = "y1184ab7.ala.us-east-1.emqxsl.com";
  const port = 8084;                 // WebSocket seguro (TLS)
  const path = "/mqtt";              // OBRIGATÓRIO para EMQX Cloud
  const topicBase = "smart_level/central/";

  // Cliente MQTT Paho — com PATH correto
  let client = new Paho.MQTT.Client(
    host,
    Number(port),
    path,
    "web_" + parseInt(Math.random() * 100000)
  );

  // =========================
  // EVENTOS MQTT
  // =========================

  client.onConnectionLost = () => {
    const s = document.getElementById("mqtt-status");
    if(s){ s.className = "red"; s.innerText = "Desconectado"; }
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
      if(s){ s.className = "green"; s.innerText = "Conectado"; }
      subscribeAll();
    },

    onFailure: (e) => {
      console.log("ERRO MQTT: ", e && e.errorMessage ? e.errorMessage : e);
      const s = document.getElementById("mqtt-status");
      if(s) s.innerText = "Falhou";
    }
  });

  // =========================
  // ASSINAR TÓPICOS
  // =========================

  function subscribeAll() {
    const topics = [
      "sistema",
      "retrolavagem",
      "manual",
      "poco_ativo",
      "retro_history",
      "p1_online","p2_online","p3_online",
      "p1_timer","p2_timer","p3_timer",
      "rodizio_min","retroA_status","retroB_status","timeout"
    ];

    topics.forEach(t => {
      try { client.subscribe(topicBase + t); }
      catch(e){ console.warn("subscribe falhou:", e, topicBase + t); }
    });
  }

  // =========================
  // TRATAR MENSAGENS
  // =========================

  function onMessage(msg) {
    const t = msg.destinationName.replace(topicBase, "");
    const v = msg.payloadString;

    switch(t) {

      case "sistema":
        updateText("central-status", v==="1" ? "Ligada" : "Desligada");
        updateText("sistema", v==="1" ? "Ligado" : "Desligado");
        break;

      case "retrolavagem":
        updateText("fase", v==="1" ? "Retrolavando" : "Nivel_Control");
        break;

      case "manual":
        updateText("modo", v==="1" ? "Manual" : "Auto");
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
  // Funções auxílio
  // =========================

  function updateText(id, txt){
    const el = document.getElementById(id);
    if(el) el.innerText = txt;
  }

  function updateStatus(id, val){
    const el = document.getElementById(id);
    if(!el) return;

    el.innerText = val==="1" ? "Online" : "Offline";
    el.className = val==="1" ? "green" : "red";
  }

  function formatTimer(sec){
    sec = Number(sec);
    let h = Math.floor(sec/3600);
    let m = Math.floor((sec%3600)/60);
    return `${h}h ${m}min`;
  }

  function updateHistory(json){
    let arr = [];
    try { arr = JSON.parse(json); } catch(e){ console.warn("retro_history JSON invalido", e); return; }
    let html = "";

    arr.forEach(r=>{
      let inicio = `${r.hi}:${String(r.mi).padStart(2,"0")}`;
      let fim = `${r.hf}:${String(r.mf).padStart(2,"0")}`;
      html += `[${r.d}/${r.m}/${r.a}] ${inicio} → ${fim}<br>`;
    });

    const el = document.getElementById("historico");
    if(el) el.innerHTML = html;
  }

  // =========================
  // Enviar comandos
  // =========================

  function sendCmd(payload){
    try{
      const msg = new Paho.MQTT.Message(payload);
      msg.destinationName = topicBase + "cmd";
      client.send(msg);
    }catch(e){
      console.error("Falha ao enviar cmd:", e);
      alert("Falha ao enviar comando MQTT. Verifique console.");
    }
  }

  // expõe funções para o HTML (buttons)
  window.toggleSistema = function(){ sendCmd('{"toggle":1}'); };
  window.enviarConfig = function(){
    const rod = document.getElementById("rodizio").value || 60;
    const A = document.getElementById("retroA").value || 1;
    const B = document.getElementById("retroB").value || 2;
    const tout = document.getElementById("timeout").value || 15;
    const payload = `{"rodizio":${rod},"retroA":${A},"retroB":${B},"timeout":${tout}}`;
    sendCmd(payload);
    alert("Configurações enviadas!");
  };
}
