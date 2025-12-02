/* dashboard.js
   Dashboard Fênix Industrial - Cliente MQTT (Paho) para o HTML fornecido.
   - Insira este script APÓS a biblioteca Paho MQTT no HTML.
   - Ajuste as configurações MQTT (HOST, PORT, PATH, USER, PASS) conforme seu broker WebSocket.
*/

(function(){
  // ---------- CONFIGURAÇÃO ----------
  const MQTT_HOST = "y1184ab7.ala.us-east-1.emqxsl.com"; // do seu ESP (ajuste se necessário)
  const MQTT_WS_PORT_WSS = 8084;  // porta típica wss (ajuste conforme broker)
  const MQTT_WS_PORT_WS  = 8080;  // porta típica ws (ajuste conforme broker)
  const MQTT_PATH = "/mqtt";      // path websocket (alguns brokers usam /mqtt)
  const MQTT_USER = "Admin";
  const MQTT_PASS = "Admin";
  const CLIENT_ID = "dash-" + Math.floor(Math.random() * 10000);

  // Tópicos relevantes (convenção usada no firmware)
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

  // ---------- DOM QUERIES (cria elementos se não existirem) ----------
  function $(sel){ return document.querySelector(sel); }
  function ensureId(id, tag='div', parent=document.body){
    let el = document.getElementById(id);
    if(!el){
      el = document.createElement(tag);
      el.id = id;
      parent.appendChild(el);
    }
    return el;
  }

  // Adaptar para sua estrutura HTML: cria bindings com ids esperados
  // Recomenda-se inserir esses ids no HTML original; caso não existam, criamos elementos auxiliares invisíveis.
  const idMap = {
    statusBox:   ensureId("fx-status-box", "div"),
    centralState: ensureId("fx-central-state", "span"),
    mqttState:    ensureId("fx-mqtt-state", "span"),
    phaseState:   ensureId("fx-phase-state", "span"),
    modeState:    ensureId("fx-mode-state", "span"),
    rodizioState: ensureId("fx-rodizio-state", "span"),
    retroHistory: document.querySelector(".history") || ensureId("fx-retro-history","div"),
    p1Card:       document.querySelectorAll(".well-card")[0] || ensureId("fx-p1","div"),
    p2Card:       document.querySelectorAll(".well-card")[1] || ensureId("fx-p2","div"),
    p3Card:       document.querySelectorAll(".well-card")[2] || ensureId("fx-p3","div")
  };

  // Se a .history é a área de histórico, usamos ela; senão, usamos o elemento criado.
  if(!document.querySelector(".history") && idMap.retroHistory){
    idMap.retroHistory.classList.add("history");
  }

  // ---------- UTILITÁRIOS ----------
  function safeText(v){ return v === undefined || v === null ? "" : String(v); }

  function formatSecondsToHMS(s){
    s = Number(s) || 0;
    const h = Math.floor(s/3600);
    const m = Math.floor((s%3600)/60);
    const sec = s % 60;
    if(h>0) return `${h}h ${m}m ${sec}s`;
    if(m>0) return `${m}m ${sec}s`;
    return `${sec}s`;
  }

  function tryParseJSON(str){
    try{ return JSON.parse(str); } catch(e){ return null; }
  }

  // ---------- MQTT CLIENT ----------
  let client = null;
  let connected = false;
  let backoff = 1000;

  function buildUrl(wss=true, host=MQTT_HOST, port=(wss?MQTT_WS_PORT_WSS:MQTT_WS_PORT_WS), path=MQTT_PATH){
    const proto = wss ? "wss" : "ws";
    // Alguns brokers exigem host:port/path, outros só host/path; mantemos host:port
    return `${proto}://${host}:${port}${path}`;
  }

  function connectOnce(useWss=true){
    const url = buildUrl(useWss);
    // Paho JavaScript client constructor: host, port, path OR full uri depending on build.
    // We'll try to build via host/port/path split if Paho supports; fallback to full path via new Client(uri, clientId)
    try {
      // Some Paho versions accept (host, port, path, clientId). We use URI constructor for broader compatibility.
      client = new Paho.MQTT.Client(buildUrl(useWss), CLIENT_ID);
    } catch(e){
      // fallback to split constructor (host, port, path)
      try {
        client = new Paho.MQTT.Client(MQTT_HOST, useWss?MQTT_WS_PORT_WSS:MQTT_WS_PORT_WS, MQTT_PATH, CLIENT_ID);
      } catch(err){
        console.error("Não foi possível criar Paho.Client:", err);
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
        setTimeout(function(){ backoff = Math.min(60000, backoff * 1.5); attemptReconnect(); }, backoff);
      }
    };

    try {
      client.connect(options);
      console.info("Tentando conectar MQTT em", buildUrl(useWss));
    } catch(err){
      console.error("Erro connect MQTT:", err);
      setTimeout(attemptReconnect, backoff);
    }
  }

  function attemptReconnect(){
    if(connected) return;
    // alterna entre wss e ws para tentar se um não estiver disponível
    const useWss = (Math.random() > 0.5);
    connectOnce(useWss);
  }

  function onConnect(){
    console.info("MQTT conectado");
    connected = true;
    backoff = 1000;
    // Assinar tópicos
    TOPICS.forEach(t => {
      try { client.subscribe(t, { qos: 0 }); } catch(err){ console.warn("Subscribe erro:", t, err); }
    });
    setMqttState(true);
  }

  function onConnectionLost(responseObject){
    console.warn("MQTT conexão perdida", responseObject);
    connected = false;
    setMqttState(false);
    setTimeout(attemptReconnect, backoff);
    backoff = Math.min(60000, backoff * 1.5);
  }

  function onMessageArrived(message){
    const topic = message.destinationName;
    const payload = message.payloadString;
    // Tratamento por tópico
    // console.debug("MSG", topic, payload);

    switch(topic){
      case "pocos/p1_alive":
      case "pocos/p2_alive":
      case "pocos/p3_alive":
        // marca online (apenas recebe heartbeat; a central também publica p#_online)
        // nada específico aqui — dependeremos de smart_level/.../p#_online
        break;

      case "smart_level/central/status":
        // payload é JSON com central_on, rodizio_min, pocos_online
        const st = tryParseJSON(payload);
        if(st){
          setCentralState(Boolean(st.central_on));
          setRodizioState(st.rodizio_min !== undefined ? st.rodizio_min : null);
          if(st.pocos_online){
            updatePocosOnlineFromArray(st.pocos_online);
          }
        } else {
          // string fallback
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
        // payload é um JSON array com objetos {d,m,a,hi,mi,hf,mf}
        const rh = tryParseJSON(payload);
        if(Array.isArray(rh)){
          renderRetroHistoryFromArray(rh);
        } else {
          // se for string-format, tenta exibir cru
          appendRetroEntry(String(payload));
        }
        break;

      case "smart_level/central/retro_log":
        // pequenas notificações 'retro_inicio' / 'retro_fim'
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

  // ---------- UI Atualizações ----------
  function setMqttState(isConnected){
    idMap.mqttState.textContent = isConnected ? "Conectado" : "Desconectado";
    idMap.mqttState.className = isConnected ? "green" : "red";
  }

  function setCentralState(isOn){
    idMap.centralState.textContent = isOn ? "Ligado" : "Desligado";
    idMap.centralState.className = isOn ? "green" : "red";
  }

  function setPhaseState(text){
    idMap.phaseState.textContent = safeText(text);
  }

  function setModeState(text){
    idMap.modeState.textContent = safeText(text);
  }

  function setRodizioState(mins){
    idMap.rodizioState.textContent = mins ? `${mins} min` : "-";
  }

  function setRodizioActive(val){
    // atualiza label de "P: N" na página (se existir)
    // procura span ou texto em .card que contenha "P:"
    const el = document.querySelector(".card .row .label") || null;
    // também expõe no statusBox
    // para simplicidade, atualizamos rodizioState
    idMap.rodizioState.textContent = "Ativo: " + val;
  }

  // Representação dos poços
  const pocos = {
    1: { online: false, timerS: 0, el: idMap.p1Card },
    2: { online: false, timerS: 0, el: idMap.p2Card },
    3: { online: false, timerS: 0, el: idMap.p3Card }
  };

  function updatePocosOnlineFromArray(arr){
    // arr esperado ex: ["1","0","1"]
    for(let i=0;i<3;i++){
      const on = (String(arr[i]) === "1" || arr[i] === 1 || arr[i] === "true");
      setPocoOnline(i+1, on);
    }
  }

  function setPocoOnline(idx, on){
    if(!pocos[idx]) return;
    pocos[idx].online = !!on;
    // Conteúdo do card - procurar linhas e atualizar ou criar
    let container = pocos[idx].el;
    if(!container) return;
    // garantir estrutura interna
    container.innerHTML = ""; // render fresh
    const title = document.createElement("div");
    title.className = "well-title";
    title.textContent = `Poço ${String(idx).padStart(2,'0')}`;
    container.appendChild(title);

    const row1 = document.createElement("div");
    row1.className = "row";
    row1.innerHTML = `<span class="label">Comuni:</span> <span class="${on ? 'green':'red'}">${on ? 'Online' : 'Offline'}</span>`;
    container.appendChild(row1);

    const row2 = document.createElement("div");
    row2.className = "row";
    row2.innerHTML = `<span class="label">Fluxo:</span> <span class="blue">—</span>`;
    container.appendChild(row2);

    const row3 = document.createElement("div");
    row3.className = "row";
    row3.innerHTML = `<span class="label">Acumuli:</span> <span class="blue">${formatSecondsToHMS(pocos[idx].timerS)}</span>`;
    container.appendChild(row3);

    // botão de comando manual (liga/desliga)
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
    // Atualiza card se já renderizado
    setPocoOnline(idx, pocos[idx].online);
  }

  // Histórico
  function renderRetroHistoryFromArray(arr){
    // arr é lista de objetos {d,m,a,hi,mi,hf,mf}
    const node = idMap.retroHistory;
    if(!node) return;
    node.innerHTML = ""; // limpa
    // ordenar por data e hora se precisar (assumimos já em ordem)
    arr.forEach(item => {
      const d = item.d || 0;
      const m = item.m || 0;
      const a = item.a || 0;
      const hi = (item.hi === 255 ? "--" : String(item.hi).padStart(2,'0'));
      const mi = (item.mi === 255 ? "--" : String(item.mi).padStart(2,'0'));
      const hf = (item.hf === 255 ? "--" : String(item.hf).padStart(2,'0'));
      const mf = (item.mf === 255 ? "--" : String(item.mf).padStart(2,'0'));
      const line = `[${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${String(a).padStart(2,'0')}] início ${hi}:${mi} → fim ${hf}:${mf}`;
      const el = document.createElement("div");
      el.innerHTML = line;
      node.appendChild(el);
    });
  }

  function appendRetroEntry(text){
    const node = idMap.retroHistory;
    if(!node) return;
    const el = document.createElement("div");
    el.innerHTML = safeText(text);
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
    // aceita objeto ou string
    let payload;
    if(typeof obj === "object") payload = JSON.stringify(obj);
    else payload = String(obj);
    publish("smart_level/central/cmd", payload);
  }

  function publishPocoCmd(pocoNumber){
    // envia comando para acionar poço específico — tópico usado pelo firmware: "pocos/cmd"
    // valores: "0" para desligar, "1"/"2"/"3" para poços
    publish("pocos/cmd", String(pocoNumber));
  }

  // ---------- Controles UI (cria painel de controle rápido) ----------
  function createControlPanel(){
    // procura uma área para inserir controles (header)
    const header = document.querySelector("header") || document.body;
    const panel = document.createElement("div");
    panel.style.display = "flex";
    panel.style.gap = "8px";
    panel.style.alignItems = "center";

    // BOTÃO Toggle central
    const btnToggle = document.createElement("button");
    btnToggle.textContent = "Toggle Central";
    btnToggle.onclick = function(){
      publishCmdToCentral({ "toggle": 1 });
    };
    panel.appendChild(btnToggle);

    // INPUT rodízio minutos
    const rodInput = document.createElement("input");
    rodInput.type = "number";
    rodInput.min = 1;
    rodInput.max = 240;
    rodInput.placeholder = "Rodízio (min)";
    rodInput.style.width = "120px";
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
    tout.type = "number";
    tout.min = 5;
    tout.max = 300;
    tout.placeholder = "Timeout(s)";
    tout.style.width = "100px";
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
    // Conecta MQTT
    attemptReconnect();
    // cria painel de controles
    createControlPanel();
    // marca estados iniciais
    setMqttState(false);
    setCentralState(false);
    setPhaseState("-");
    // renderiza poços inicialmente
    setPocoOnline(1, false); setPocoOnline(2, false); setPocoOnline(3, false);
  }

  // start
  window.addEventListener("load", init);
  // Expor utilidades para debug via console
  window.fxDashboard = {
    publish, publishCmdToCentral, publishPocoCmd, clientRef: ()=>client
  };

})();
