/* dashboard.js
   Mantive a lógica MQTT do seu arquivo original, porém com pequenos ajustes:
   - evita duplicação de ids
   - atualiza ambos elementos de central-state (header + left) quando houver mudança
   - painel de controle injetado no header (igual ao anterior)
   - robustez na criação do cliente Paho
*/

(function(){
  // ---------- CONFIGURAÇÃO ----------
  const MQTT_HOST = "y1184ab7.ala.us-east-1.emqxsl.com";
  const MQTT_WS_PORT_WSS = 8084;
  const MQTT_WS_PORT_WS  = 8080;
  const MQTT_PATH = "/mqtt";
  const MQTT_USER = "Admin";
  const MQTT_PASS = "Admin";
  const CLIENT_ID = "dash-" + Math.floor(Math.random() * 10000);

  const TOPICS = [
    "pocos/p1_alive",
    "pocos/p2_alive",
    "pocos/p3_alive",
    "smart_level/central/cmd",
    "smart_level/central/status",
    "smart_level/central/p1_timer",
    "smart_level/central/p2_timer",
    "smart_level/central/p3_timer",
    "smart_level/central/p1_online",
    "smart_level/central/p2_online",
    "smart_level/central/p3_online",
    "smart_level/central/poco_ativo",
    "smart_level/central/retro_history",
    "smart_level/central/retro_log",
    "smart_level/central/retrolavagem",
    "smart_level/central/sistema",
    "smart_level/central/timers_json"
  ];

  // ---------- AUX ----------
  function $(sel){ return document.querySelector(sel); }
  function safeText(v){ return v === undefined || v === null ? "" : String(v); }

  function tryParseJSON(str){
    try{ return JSON.parse(str); } catch(e){ return null; }
  }

  function formatSecondsToHMS(s){
    s = Number(s) || 0;
    const h = Math.floor(s/3600);
    const m = Math.floor((s%3600)/60);
    const sec = s % 60;
    if(h>0) return `${h}h ${m}m ${sec}s`;
    if(m>0) return `${m}m ${sec}s`;
    return `${sec}s`;
  }

  // ---------- ESTADO / ELEMENTOS ----------
  // guarantee getElement helper
  function getEl(id){ return document.getElementById(id) || null; }

  const idMap = {
    mqttState: getEl("fx-mqtt-state"),
    centralState: getEl("fx-central-state"),
    centralStateLeft: getEl("fx-central-state-left"),
    phaseState: getEl("fx-phase-state"),
    modeState: getEl("fx-mode-state"),
    rodizioState: getEl("fx-rodizio-state"),
    retroHistory: getEl("fx-retro-history"),
    p1Card: getEl("fx-p1"),
    p2Card: getEl("fx-p2"),
    p3Card: getEl("fx-p3"),
  };

  // ---------- MQTT CLIENT ----------
  let client = null;
  let connected = false;
  let backoff = 1000;

  function buildUrl(wss=true){
    const proto = wss ? "wss" : "ws";
    const port = wss ? MQTT_WS_PORT_WSS : MQTT_WS_PORT_WS;
    return `${proto}://${MQTT_HOST}:${port}${MQTT_PATH}`;
  }

  function connectOnce(useWss=true){
    // Tenta várias formas de criar o client Paho para compatibilidade
    try {
      // A forma com URI é compatível com algumas builds do Paho
      client = new Paho.MQTT.Client(buildUrl(useWss), CLIENT_ID);
    } catch(e){
      try {
        // fallback: host, port, path, clientId
        client = new Paho.MQTT.Client(MQTT_HOST, useWss?MQTT_WS_PORT_WSS:MQTT_WS_PORT_WS, MQTT_PATH, CLIENT_ID);
      } catch(err){
        console.error("Falha ao criar cliente Paho:", err);
        scheduleReconnect();
        return;
      }
    }

    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    const options = {
      userName: MQTT_USER,
      password: MQTT_PASS,
      timeout: 10,
      useSSL: useWss,
      keepAliveInterval: 30,
      onSuccess: onConnect,
      onFailure: function(err){
        console.warn("MQTT onFailure:", err);
        connected = false;
        scheduleReconnect();
      }
    };

    try {
      client.connect(options);
      console.info("Tentando conectar MQTT em", buildUrl(useWss));
    } catch(err){
      console.error("Erro connect MQTT:", err);
      scheduleReconnect();
    }
  }

  function scheduleReconnect(){
    setTimeout(function(){
      backoff = Math.min(60000, backoff * 1.5);
      attemptReconnect();
    }, backoff);
  }

  function attemptReconnect(){
    if(connected) return;
    // alterna aleatoriamente entre wss/ws
    const useWss = (Math.random() > 0.5);
    connectOnce(useWss);
  }

  function onConnect(){
    console.info("MQTT conectado");
    connected = true;
    backoff = 1000;
    TOPICS.forEach(t => { try { client.subscribe(t, {qos:0}); } catch(e){ console.warn("subscribe err", t, e); } });
    setMqttState(true);
  }

  function onConnectionLost(responseObject){
    console.warn("MQTT conexão perdida", responseObject);
    connected = false;
    setMqttState(false);
    scheduleReconnect();
  }

  function onMessageArrived(message){
    const topic = message.destinationName;
    const payload = message.payloadString;
    // console.debug("MSG", topic, payload);

    switch(topic){
      case "pocos/p1_alive":
      case "pocos/p2_alive":
      case "pocos/p3_alive":
        // heartbeat — não processamos aqui
        break;

      case "smart_level/central/status":
        const st = tryParseJSON(payload);
        if(st){
          setCentralState(Boolean(st.central_on));
          setRodizioState(st.rodizio_min !== undefined ? st.rodizio_min : null);
          if(st.pocos_online) updatePocosOnlineFromArray(st.pocos_online);
        } else {
          setCentralState(payload.indexOf("true")>=0);
        }
        break;

      case "smart_level/central/sistema":
        setCentralState(payload === "1" || payload.toLowerCase()==="true");
        break;

      case "smart_level/central/p1_online":
      case "smart_level/central/p2_online":
      case "smart_level/central/p3_online":
        {
          const idx = parseInt(topic.substr(topic.length-1), 10);
          const on = payload === "1";
          setPocoOnline(idx, on);
        }
        break;

      case "smart_level/central/p1_timer":
      case "smart_level/central/p2_timer":
      case "smart_level/central/p3_timer":
        {
          const idx = parseInt(topic.substr(topic.length-1), 10);
          const seconds = parseInt(payload, 10) || 0;
          setPocoTimer(idx, seconds);
        }
        break;

      case "smart_level/central/timers_json":
        {
          const tj = tryParseJSON(payload);
          if(tj){
            if(tj.p1 !== undefined) setPocoTimer(1, Number(tj.p1));
            if(tj.p2 !== undefined) setPocoTimer(2, Number(tj.p2));
            if(tj.p3 !== undefined) setPocoTimer(3, Number(tj.p3));
          }
        }
        break;

      case "smart_level/central/retro_history":
        const rh = tryParseJSON(payload);
        if(Array.isArray(rh)){
          renderRetroHistoryFromArray(rh);
        } else {
          appendRetroEntry(String(payload));
        }
        break;

      case "smart_level/central/retro_log":
        if(payload.indexOf("inicio") >= 0){
          appendRetroEntry("retrolavagem: INÍCIO (" + new Date().toLocaleString() + ")");
        } else if(payload.indexOf("fim") >= 0){
          appendRetroEntry("retrolavagem: FIM (" + new Date().toLocaleString() + ")");
        }
        break;

      case "smart_level/central/poco_ativo":
        setRodizioActive(payload);
        break;

      case "smart_level/central/retrolavagem":
        setPhaseState(payload === "1" ? "Retrolavando" : "Normal");
        break;

      default:
        // console.log("Mensagem recebida:", topic, payload);
        break;
    }
  }

  // ---------- UI Helpers ----------
  function setMqttState(isConnected){
    if(idMap.mqttState) {
      idMap.mqttState.textContent = isConnected ? "Conectado" : "Desconectado";
      idMap.mqttState.className = isConnected ? "state green" : "state red";
    }
  }

  function setCentralState(isOn){
    const text = isOn ? "Ligado" : "Desligado";
    if(idMap.centralState){
      idMap.centralState.textContent = text;
      idMap.centralState.className = "state " + (isOn ? "green":"red");
    }
    if(idMap.centralStateLeft){
      idMap.centralStateLeft.textContent = text;
      idMap.centralStateLeft.className = "fx-value " + (isOn ? "green":"red");
    }
  }

  function setPhaseState(text){
    if(idMap.phaseState) idMap.phaseState.textContent = safeText(text);
  }

  function setModeState(text){
    if(idMap.modeState) idMap.modeState.textContent = safeText(text);
  }

  function setRodizioState(mins){
    if(idMap.rodizioState){
      idMap.rodizioState.textContent = mins ? `${mins} min` : "-";
    }
  }

  function setRodizioActive(val){
    // claro e simples: atualiza rodizioState com a informação
    if(idMap.rodizioState) idMap.rodizioState.textContent = "Ativo: " + safeText(val);
  }

  // Poços
  const pocos = {
    1: { online: false, timerS: 0, el: idMap.p1Card },
    2: { online: false, timerS: 0, el: idMap.p2Card },
    3: { online: false, timerS: 0, el: idMap.p3Card }
  };

  function updatePocosOnlineFromArray(arr){
    for(let i=0;i<3;i++){
      const on = (String(arr[i]) === "1" || arr[i] === 1 || arr[i] === "true");
      setPocoOnline(i+1, on);
    }
  }

  function setPocoOnline(idx, on){
    if(!pocos[idx]) return;
    pocos[idx].online = !!on;
    let container = pocos[idx].el;
    if(!container) return;
    // Construir o conteúdo do card de forma determinística
    container.innerHTML = "";
    const title = document.createElement("div");
    title.className = "fx-well-title";
    title.textContent = `Poço ${String(idx).padStart(2,'0')}`;
    container.appendChild(title);

    const row1 = document.createElement("div");
    row1.className = "row";
    row1.innerHTML = `<span class="label">Comuni:</span> <span class="value ${on ? 'green':'red'}">${on ? 'Online' : 'Offline'}</span>`;
    container.appendChild(row1);

    const row2 = document.createElement("div");
    row2.className = "row";
    row2.innerHTML = `<span class="label">Fluxo:</span> <span class="value">—</span>`;
    container.appendChild(row2);

    const row3 = document.createElement("div");
    row3.className = "row";
    row3.innerHTML = `<span class="label">Acumulado ON:</span> <span class="value">${formatSecondsToHMS(pocos[idx].timerS)}</span>`;
    container.appendChild(row3);

    const btnRow = document.createElement("div");
    btnRow.className = "row";
    const btnOn = document.createElement("button");
    btnOn.textContent = "Ligar";
    btnOn.style.marginRight = "6px";
    btnOn.onclick = function(){ publishPocoCmd(idx); };
    btnRow.appendChild(btnOn);

    const btnOff = document.createElement("button");
    btnOff.textContent = "Desligar";
    btnOff.onclick = function(){ publishPocoCmd(0); };
    btnRow.appendChild(btnOff);
    container.appendChild(btnRow);
  }

  function setPocoTimer(idx, seconds){
    if(!pocos[idx]) return;
    pocos[idx].timerS = Number(seconds) || 0;
    // re-render card atual
    setPocoOnline(idx, pocos[idx].online);
  }

  // Histórico
  function renderRetroHistoryFromArray(arr){
    const node = idMap.retroHistory;
    if(!node) return;
    node.innerHTML = "";
    arr.forEach(item => {
      const d = item.d || 0, m = item.m || 0, a = item.a || 0;
      const hi = (item.hi === 255 ? "--" : String(item.hi).padStart(2,'0'));
      const mi = (item.mi === 255 ? "--" : String(item.mi).padStart(2,'0'));
      const hf = (item.hf === 255 ? "--" : String(item.hf).padStart(2,'0'));
      const mf = (item.mf === 255 ? "--" : String(item.mf).padStart(2,'0'));
      const line = `[${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${String(a).padStart(2,'0')}] início ${hi}:${mi} → fim ${hf}:${mf}`;
      const el = document.createElement("div");
      el.textContent = line;
      node.appendChild(el);
    });
  }

  function appendRetroEntry(text){
    const node = idMap.retroHistory;
    if(!node) return;
    const el = document.createElement("div");
    el.textContent = safeText(text);
    node.insertBefore(el, node.firstChild);
  }

  // ---------- Publicadores ----------
  function publish(topic, payload, retained=false){
    if(client && connected){
      try {
        const msg = new Paho.MQTT.Message(String(payload));
        msg.destinationName = topic;
        msg.retained = retained;
        client.send(msg);
        console.info("[PUB]", topic, payload);
      } catch(err){
        console.warn("Erro enviar MQTT", err);
      }
    } else {
      console.warn("MQTT não conectado. Mensagem não enviada:", topic, payload);
    }
  }

  function publishCmdToCentral(obj){
    let payload;
    if(typeof obj === "object") payload = JSON.stringify(obj);
    else payload = String(obj);
    publish("smart_level/central/cmd", payload);
  }

  function publishPocoCmd(pocoNumber){
    publish("pocos/cmd", String(pocoNumber));
  }

  // ---------- Controles UI (injetados) ----------
  function createControlPanel(){
    const header = document.querySelector(".fx-header");
    if(!header) return;
    const panel = document.createElement("div");
    panel.className = "header-panel";

    const btnToggle = document.createElement("button");
    btnToggle.textContent = "Toggle Central";
    btnToggle.onclick = function(){
      publishCmdToCentral({ "toggle": 1 });
    };
    panel.appendChild(btnToggle);

    // Rodízio (min)
    const rodInput = document.createElement("input");
    rodInput.type = "number"; rodInput.min = 1; rodInput.max = 240; rodInput.placeholder = "Rodízio (min)";
    rodInput.style.width = "110px";
    const rodBtn = document.createElement("button");
    rodBtn.textContent = "Set Rodízio";
    rodBtn.onclick = function(){
      const v = Number(rodInput.value) || 60;
      publishCmdToCentral({ "rodizio": v });
    };
    panel.appendChild(rodInput);
    panel.appendChild(rodBtn);

    // Retro A/B selectors
    const selA = document.createElement("select");
    [1,2,3].forEach(n=> { const o=document.createElement("option"); o.value=n; o.textContent="P"+n; selA.appendChild(o); });
    const selB = selA.cloneNode(true);
    const retroBtn = document.createElement("button");
    retroBtn.textContent = "Set Retro A/B";
    retroBtn.onclick = function(){
      publishCmdToCentral({ "retroA": Number(selA.value), "retroB": Number(selB.value) });
    };
    panel.appendChild(selA);
    panel.appendChild(selB);
    panel.appendChild(retroBtn);

    // Timeout alive
    const tout = document.createElement("input");
    tout.type = "number"; tout.min = 5; tout.max = 300; tout.placeholder = "Timeout(s)"; tout.style.width = "90px";
    const toutBtn = document.createElement("button");
    toutBtn.textContent = "Set Timeout";
    toutBtn.onclick = function(){
      const v = Number(tout.value);
      if(v >= 5) publishCmdToCentral({ "timeout": v });
    };
    panel.appendChild(tout);
    panel.appendChild(toutBtn);

    header.appendChild(panel);
  }

  // ---------- Inicialização ----------
  function init(){
    attemptReconnect();
    createControlPanel();
    setMqttState(false);
    setCentralState(false);
    setPhaseState("-");
    // renderiza poços inicialmente
    setPocoOnline(1, false); setPocoOnline(2, false); setPocoOnline(3, false);
  }

  window.addEventListener("load", init);

  // Expor utilidades para debug
  window.fxDashboard = {
    publish, publishCmdToCentral, publishPocoCmd, clientRef: ()=>client
  };

})();
