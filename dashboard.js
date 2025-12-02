/* ================================================================
   dashboard.js - COMPLETO - SUPORTE A FLUXO DOS POÇOS
   ============================================================== */

(function(){

  // CONFIG MQTT ---------------------------------------------------
  const MQTT_HOST = "y1184ab7.ala.us-east-1.emqxsl.com";
  const MQTT_WS_PORT_WSS = 8084;
  const MQTT_PATH = "/mqtt";
  const MQTT_USER = "Admin";
  const MQTT_PASS = "Admin";
  const CLIENT_ID = "dash-" + Math.floor(Math.random()*9999);

  const TOPICS = [
    "smart_level/central/sistema",
    "smart_level/central/retrolavagem",
    "smart_level/central/poco_ativo",
    "smart_level/central/status",
    "smart_level/central/timers_json",

    "smart_level/central/p1_timer",
    "smart_level/central/p2_timer",
    "smart_level/central/p3_timer",

    "smart_level/central/p1_online",
    "smart_level/central/p2_online",
    "smart_level/central/p3_online",

    "smart_level/central/p1_fluxo",
    "smart_level/central/p2_fluxo",
    "smart_level/central/p3_fluxo",

    "smart_level/central/retro_history",

    "pocos/p1_alive",
    "pocos/p2_alive",
    "pocos/p3_alive"
  ];

  const el = id => document.getElementById(id);

  const idMap = {
    mqttState: el('fx-mqtt-state'),
    centralState: el('fx-central-state'),
    centralStateRight: el('fx-central-state-right'),
    phaseState: el('fx-phase-state'),
    modeState: el('fx-mode-state'),
    rodizioState: el('fx-rodizio-state'),
    retroA: el('fx-retroA'),
    retroB: el('fx-retroB'),
    rodizioIntervalVal: el('fx-rodizio-interval-val'),
    timeoutVal: el('fx-timeout-val'),

    retroHistory: el('fx-retro-history'),

    p1online: el('p1-online'),
    p1fluxo: el('p1-fluxo'),
    p1acum: el('p1-acumulado'),

    p2online: el('p2-online'),
    p2fluxo: el('p2-fluxo'),
    p2acum: el('p2-acumulado'),

    p3online: el('p3-online'),
    p3fluxo: el('p3-fluxo'),
    p3acum: el('p3-acumulado'),
  };

  let client = null;
  let connected = false;

  function buildURL(){
    return `wss://${MQTT_HOST}:${MQTT_WS_PORT_WSS}${MQTT_PATH}`;
  }

  function connect(){
    client = new Paho.MQTT.Client(buildURL(), CLIENT_ID);
    client.onConnectionLost = () => {
      connected = false;
      setMqttState(false);
      setTimeout(connect, 2000);
    };
    client.onMessageArrived = onMessageArrived;

    client.connect({
      userName: MQTT_USER,
      password: MQTT_PASS,
      useSSL: true,
      timeout: 10,
      keepAliveInterval: 30,
      onSuccess: () => {
        connected = true;
        setMqttState(true);
        TOPICS.forEach(t=>client.subscribe(t));
      },
      onFailure: () => setTimeout(connect, 3000)
    });
  }

  // ---------------------------------------------------------------
  // RECEBIMENTO DOS TÓPICOS
  // ---------------------------------------------------------------

  function onMessageArrived(msg){
    const topic = msg.destinationName;
    const payload = msg.payloadString;

    switch(topic){

      case "smart_level/central/sistema":
        setCentralState(payload === "1" || payload === "true");
        break;

      case "smart_level/central/poco_ativo":
        idMap.rodizioState.textContent = payload;
        break;

      case "smart_level/central/p1_online":
        setOnline(1, payload);
        break;
      case "smart_level/central/p2_online":
        setOnline(2, payload);
        break;
      case "smart_level/central/p3_online":
        setOnline(3, payload);
        break;

      case "smart_level/central/p1_fluxo":
        setFluxo(1, payload);
        break;
      case "smart_level/central/p2_fluxo":
        setFluxo(2, payload);
        break;
      case "smart_level/central/p3_fluxo":
        setFluxo(3, payload);
        break;

      case "smart_level/central/p1_timer":
        idMap.p1acum.textContent = formatTime(payload);
        break;
      case "smart_level/central/p2_timer":
        idMap.p2acum.textContent = formatTime(payload);
        break;
      case "smart_level/central/p3_timer":
        idMap.p3acum.textContent = formatTime(payload);
        break;

      case "smart_level/central/retro_history":
        renderHistory(payload);
        break;
    }
  }

  // ---------------------------------------------------------------
  // FUNÇÕES DE ATUALIZAÇÃO DE UI
  // ---------------------------------------------------------------

  function setMqttState(ok){
    idMap.mqttState.textContent = ok ? "MQTT: Conectado" : "MQTT: Desconectado";
    idMap.mqttState.className = ok ? "green" : "red";
  }

  function setCentralState(on){
    idMap.centralState.textContent = on ? "CENTRAL: Ligado" : "CENTRAL: Desligado";
    idMap.centralStateRight.textContent = on ? "Ligado" : "Desligado";
    idMap.centralState.className = on ? "green" : "red";
    idMap.centralStateRight.className = on ? "green" : "red";
  }

  function setOnline(n, payload){
    const ok = (payload == "1" || payload == "true");
    const el = idMap[`p${n}online`];
    el.textContent = ok ? "Online" : "Offline";
    el.className = ok ? "green" : "red";
  }

  function setFluxo(n, text){
    const el = idMap[`p${n}fluxo`];
    el.textContent = text;
  }

  function formatTime(sec){
    sec = Number(sec);
    if(sec < 60) return `${sec}s`;
    if(sec < 3600) return `${Math.floor(sec/60)}m ${sec%60}s`;
    return `${Math.floor(sec/3600)}h ${Math.floor((sec%3600)/60)}m`;
  }

  function renderHistory(json){
    try {
      const arr = JSON.parse(json);
      idMap.retroHistory.innerHTML = "";
      arr.forEach(item => {
        const div = document.createElement("div");
        div.textContent = `[${item.d}/${item.m}/${item.a}] ${item.hi}:${item.mi} → ${item.hf}:${item.mf}`;
        idMap.retroHistory.appendChild(div);
      });
    } catch(e){
      console.warn("Histórico inválido:", json);
    }
  }

  // ---------------------------------------------------------------
  // INICIALIZAÇÃO
  // ---------------------------------------------------------------
  window.addEventListener("load", () => {
    connect();
  });

})();
