/* dashboard.js - versão final, compatível com Paho MQTT
   Ajuste as configurações de broker (HOST/PORT/PATH/USER/PASS) no topo.
*/
(function(){
  // CONFIGURAÇÃO MQTT — ajuste conforme seu broker
  const MQTT_HOST = "y1184ab7.ala.us-east-1.emqxsl.com"; // substitua pelo seu host
  const MQTT_WS_PORT_WSS = 8084;
  const MQTT_WS_PORT_WS = 8080;
  const MQTT_PATH = "/mqtt";
  const MQTT_USER = "Admin";
  const MQTT_PASS = "Admin";
  const CLIENT_ID = "dash-"+Math.floor(Math.random()*10000);

  // Tópicos que o dashboard irá assinar
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
    "smart_level/central/retro_history",
    "pocos/p1_alive",
    "pocos/p2_alive",
    "pocos/p3_alive"
  ];

  // Mapeamento de elementos DOM (IDs devem existir no HTML)
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
    p1online: el('p1-online'), p1fluxo: el('p1-fluxo'), p1acum: el('p1-acumulado'),
    p2online: el('p2-online'), p2fluxo: el('p2-fluxo'), p2acum: el('p2-acumulado'),
    p3online: el('p3-online'), p3fluxo: el('p3-fluxo'), p3acum: el('p3-acumulado')
  };

  // Segurança simples
  function safe(v){ return v === undefined || v === null ? '' : String(v); }

  // Cliente MQTT
  let client = null;
  let connected = false;
  let backoff = 1000;

  function buildUrl(wss=true){
    const proto = wss ? 'wss' : 'ws';
    const port = wss ? MQTT_WS_PORT_WSS : MQTT_WS_PORT_WS;
    return `${proto}://${MQTT_HOST}:${port}${MQTT_PATH}`;
  }

  // Cria e conecta o cliente (tenta URI ou construtor split)
  function connectOnce(useWss=true){
    try {
      client = new Paho.MQTT.Client(buildUrl(useWss), CLIENT_ID);
    } catch(e) {
      try {
        client = new Paho.MQTT.Client(MQTT_HOST, useWss?MQTT_WS_PORT_WSS:MQTT_WS_PORT_WS, MQTT_PATH, CLIENT_ID);
      } catch(err) {
        console.error('Não foi possível criar Paho.Client', err);
        scheduleReconnect();
        return;
      }
    }

    client.onConnectionLost = onConnectionLost;
    client.onMessageArrived = onMessageArrived;

    const options = {
      userName: MQTT_USER,
      password: MQTT_PASS,
      useSSL: useWss,
      timeout: 10,
      keepAliveInterval: 30,
      onSuccess: onConnect,
      onFailure: function(err){
        console.warn('MQTT onFailure', err);
        scheduleReconnect();
      }
    };

    try {
      client.connect(options);
      console.info('Tentando conectar MQTT em', buildUrl(useWss));
    } catch(err) {
      console.error('Erro ao conectar MQTT', err);
      scheduleReconnect();
    }
  }

  function scheduleReconnect(){
    setTimeout(()=>{ backoff = Math.min(60000, backoff * 1.5); attemptReconnect(); }, backoff);
  }
  function attemptReconnect(){ if(connected) return; connectOnce(Math.random()>0.5); }

  function onConnect(){
    connected = true;
    backoff = 1000;
    TOPICS.forEach(t => {
      try { client.subscribe(t, { qos: 0 }); } catch(e){ console.warn('Erro subscribe', t, e); }
    });
    setMqttState(true);
    console.info('MQTT conectado e tópicos assinados');
  }

  function onConnectionLost(responseObject){
    connected = false;
    setMqttState(false);
    scheduleReconnect();
    console.warn('Conexão MQTT perdida', responseObject);
  }

  // Mensagens recebidas
  function onMessageArrived(message){
    const topic = message.destinationName;
    const payload = message.payloadString;
    // console.debug('MSG', topic, payload);

    switch(topic){
      case 'smart_level/central/sistema':
        setCentralState(payload === '1' || payload.toLowerCase() === 'true');
        break;

      case 'smart_level/central/retrolavagem':
        setPhaseState(payload === '1' ? 'Retrolavando' : 'Normal');
        break;

      case 'smart_level/central/poco_ativo':
        setRodizioState(payload);
        break;

      case 'smart_level/central/status':
        try {
          const st = JSON.parse(payload);
          if(st){
            if(st.central_on !== undefined) setCentralState(Boolean(st.central_on));
            if(st.rodizio_min !== undefined) setRodizioIntervalVal(st.rodizio_min);
            if(st.retroA !== undefined) setRetroA(st.retroA);
            if(st.retroB !== undefined) setRetroB(st.retroB);
            if(st.timeout !== undefined) setTimeoutVal(st.timeout);
            if(st.pocos_online) updatePocosOnlineFromArray(st.pocos_online);
          }
        } catch(e){
          console.warn('Erro parse smart_level/central/status', e);
        }
        break;

      case 'smart_level/central/timers_json':
        try {
          const tj = JSON.parse(payload);
          if(tj){
            if(tj.p1 !== undefined) setPocoTimer(1, Number(tj.p1));
            if(tj.p2 !== undefined) setPocoTimer(2, Number(tj.p2));
            if(tj.p3 !== undefined) setPocoTimer(3, Number(tj.p3));
          }
        } catch(e){}
        break;

      case 'smart_level/central/p1_timer':
        setPocoTimer(1, parseInt(payload,10) || 0);
        break;
      case 'smart_level/central/p2_timer':
        setPocoTimer(2, parseInt(payload,10) || 0);
        break;
      case 'smart_level/central/p3_timer':
        setPocoTimer(3, parseInt(payload,10) || 0);
        break;

      case 'smart_level/central/p1_online':
        setPocoOnline(1, payload === '1' || payload.toLowerCase() === 'true');
        break;
      case 'smart_level/central/p2_online':
        setPocoOnline(2, payload === '1' || payload.toLowerCase() === 'true');
        break;
      case 'smart_level/central/p3_online':
        setPocoOnline(3, payload === '1' || payload.toLowerCase() === 'true');
        break;

      case 'smart_level/central/retro_history':
        try {
          const rh = JSON.parse(payload);
          if(Array.isArray(rh)) renderRetroHistoryFromArray(rh);
          else appendRetroEntry(payload);
        } catch(e){
          appendRetroEntry(payload);
        }
        break;

      case 'pocos/p1_alive':
      case 'pocos/p2_alive':
      case 'pocos/p3_alive':
        // heartbeats (opcional)
        break;

      default:
        // tópico não tratado
        break;
    }
  }

  // ---------- Atualizações UI ----------
  function setMqttState(isConnected){
    if(idMap.mqttState) idMap.mqttState.textContent = isConnected ? 'MQTT: Conectado' : 'MQTT: Desconectado';
    if(idMap.mqttState) idMap.mqttState.className = isConnected ? 'green' : 'red';
  }

  function setCentralState(isOn){
    if(idMap.centralState) idMap.centralState.textContent = isOn ? 'CENTRAL: Ligado' : 'CENTRAL: Desligado';
    if(idMap.centralState) idMap.centralState.className = isOn ? 'green' : 'red';
    if(idMap.centralStateRight) idMap.centralStateRight.textContent = isOn ? 'Ligado' : 'Desligado';
    if(idMap.centralStateRight) idMap.centralStateRight.className = isOn ? 'green' : 'red';
  }

  function setPhaseState(text){ if(idMap.phaseState) idMap.phaseState.textContent = safe(text); }
  function setRodizioState(val){ if(idMap.rodizioState) idMap.rodizioState.textContent = safe(val); }
  function setRetroA(v){ if(idMap.retroA) idMap.retroA.textContent = safe(v); }
  function setRetroB(v){ if(idMap.retroB) idMap.retroB.textContent = safe(v); }
  function setRodizioIntervalVal(v){ if(idMap.rodizioIntervalVal) idMap.rodizioIntervalVal.textContent = safe(v) + (v? ' min':''); }
  function setTimeoutVal(v){ if(idMap.timeoutVal) idMap.timeoutVal.textContent = safe(v) + (v? ' s':''); }

  // ---------- Poços ----------
  const pocos = {1:{online:false,timer:0},2:{online:false,timer:0},3:{online:false,timer:0}};

  function updatePocosOnlineFromArray(arr){
    for(let i=0;i<3;i++){
      const on = String(arr[i]) === '1' || arr[i] === 1 || String(arr[i]).toLowerCase() === 'true';
      setPocoOnline(i+1, on);
    }
  }

  function setPocoOnline(idx, on){
    if(!pocos[idx]) return;
    pocos[idx].online = !!on;
    const mapping = {
      1: {elOnline: idMap.p1online, elFlux: idMap.p1fluxo, elAcum: idMap.p1acum},
      2: {elOnline: idMap.p2online, elFlux: idMap.p2fluxo, elAcum: idMap.p2acum},
      3: {elOnline: idMap.p3online, elFlux: idMap.p3fluxo, elAcum: idMap.p3acum}
    }[idx];
    if(!mapping) return;
    if(mapping.elOnline) {
      mapping.elOnline.textContent = on ? 'Online' : 'Offline';
      mapping.elOnline.className = on ? 'green' : 'red';
    }
  }

  function setPocoTimer(idx, seconds){
    if(!pocos[idx]) return;
    pocos[idx].timer = Number(seconds) || 0;
    const text = formatSecondsToHMS(pocos[idx].timer);
    const el = ({1: idMap.p1acum, 2: idMap.p2acum, 3: idMap.p3acum}[idx]);
    if(el) el.textContent = text;
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

  // ---------- Histórico ----------
  function renderRetroHistoryFromArray(arr){
    if(!idMap.retroHistory) return;
    idMap.retroHistory.innerHTML = '';
    arr.forEach(item=>{
      const d = item.d || 0;
      const m = item.m || 0;
      const a = item.a || 0;
      const hi = (item.hi === 255 ? '--' : String(item.hi).padStart(2,'0'));
      const mi = (item.mi === 255 ? '--' : String(item.mi).padStart(2,'0'));
      const hf = (item.hf === 255 ? '--' : String(item.hf).padStart(2,'0'));
      const mf = (item.mf === 255 ? '--' : String(item.mf).padStart(2,'0'));
      const line = `[${String(d).padStart(2,'0')}/${String(m).padStart(2,'0')}/${String(a).padStart(2,'0')}] início ${hi}:${mi} → fim ${hf}:${mf}`;
      const el = document.createElement('div');
      el.textContent = line;
      idMap.retroHistory.appendChild(el);
    });
  }

  function appendRetroEntry(text){
    if(!idMap.retroHistory) return;
    const el = document.createElement('div');
    el.textContent = text;
    idMap.retroHistory.insertBefore(el, idMap.retroHistory.firstChild);
  }

  // ---------- Publish ----------
  function publish(topic, payload, retained=false){
    if(client && connected){
      try{
        const msg = new Paho.MQTT.Message(typeof payload === 'string' ? payload : JSON.stringify(payload));
        msg.destinationName = topic;
        msg.retained = retained;
        client.send(msg);
        console.info('[PUB]', topic, payload);
      } catch(e){
        console.warn('Erro ao publicar', e);
      }
    } else {
      console.warn('MQTT não conectado — mensagem descartada', topic, payload);
    }
  }

  // Envia comando ligar/desligar (sistema: 1 = liga, 0 = desliga)
  function sendSystem(on){
    publish('smart_level/central/cmd', { sistema: on ? 1 : 0 });
  }

  // Envia configurações (retroA, retroB, rodizio, timeout)
  function sendConfig(){
    const retroA = document.getElementById('select-retroA').value;
    const retroB = document.getElementById('select-retroB').value;
    const rod = Number(document.getElementById('select-rodizio').value);
    const tout = Number(document.getElementById('select-timeout').value);
    const payload = { retroA: Number(retroA), retroB: Number(retroB), rodizio: Number(rod), timeout: Number(tout) };
    publish('smart_level/central/cmd', payload);
  }

  // ---------- Eventos UI ----------
  function attachEvents(){
    const bOn = document.getElementById('btn-ligar');
    const bOff = document.getElementById('btn-desligar');
    const bSend = document.getElementById('btn-send-config');
    if(bOn) bOn.addEventListener('click', ()=> sendSystem(true));
    if(bOff) bOff.addEventListener('click', ()=> sendSystem(false));
    if(bSend) bSend.addEventListener('click', sendConfig);
  }

  // ---------- Inicialização ----------
  function init(){
    attemptReconnect();
    attachEvents();
    setMqttState(false);
    setCentralState(false);
    setPhaseState('-');
    // preenche valores iniciais a partir dos selects, se existirem
    const r = document.getElementById('select-retroA'); if(r) setRetroA(r.value);
    const rb = document.getElementById('select-retroB'); if(rb) setRetroB(rb.value);
    const rod = document.getElementById('select-rodizio'); if(rod) setRodizioIntervalVal(rod.value);
    const t = document.getElementById('select-timeout'); if(t) setTimeoutVal(t.value);
  }

  window.addEventListener('load', init);
  window.fxDashboard = { publish, clientRef: ()=>client };

})();
