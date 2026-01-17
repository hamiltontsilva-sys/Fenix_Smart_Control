// ==========================================================
// CONFIGURAÇÃO GLOBAL - MQTT
// ==========================================================
const host = "y1184ab7.ala.us-east-1.emqxsl.com"; 
const port = 8084;
const path = "/mqtt";
const useTLS = true;
const username = "Admin";
const password = "Admin";

let client = null;
let editandoConfig = false; 
let timeoutEdicao = null;

// ==========================================================
// FUNÇÕES DE INTERFACE
// ==========================================================
function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
}

function updateCloroBar(pct) {
    const bar = document.getElementById("cloro_bar");
    const txt = document.getElementById("cloro_pct_txt");
    if (!bar || !txt) return;
    const valor = Math.max(0, Math.min(100, parseInt(pct) || 0));
    bar.style.width = valor + "%";
    txt.textContent = valor + "%";
}

function iniciarEdicao() {
    editandoConfig = true;
    clearTimeout(timeoutEdicao);
    timeoutEdicao = setTimeout(() => { editandoConfig = false; }, 15000);
}

// ==========================================================
// PROCESSAMENTO DE MENSAGENS (REVISADO E COMPLETO)
// ==========================================================
function onMessage(msg) {
    const topic = msg.destinationName;
    const val = msg.payloadString;

    // Log para depuração no console (F12)
    console.log(`[MQTT] Tópico: ${topic} | Valor: ${val}`);

    // --- LÓGICA INDIVIDUAL DOS POÇOS ---
    for (let i = 1; i <= 3; i++) {
        const pStr = "p" + i;

        if (topic === `smart_level/central/${pStr}_online`) {
            const el = document.getElementById(`${pStr}_online`);
            if (el) {
                el.textContent = val === "1" ? "ONLINE" : "OFFLINE";
                el.className = "value " + (val === "1" ? "status-on" : "status-off");
            }
        }

        if (topic === `smart_level/central/${pStr}_fluxo`) {
            const icon = document.getElementById(`${pStr}_motor`);
            if (icon) {
                val === "1" ? icon.classList.add("spinning") : icon.classList.remove("spinning");
            }
            setText(`${pStr}_fluxo`, val === "1" ? "COM FLUXO" : "SEM FLUXO");
        }

        if (topic === `smart_level/central/${pStr}_timer`) setText(`${pStr}_timer`, val);
        if (topic === `smart_level/central/${pStr}_data`) { setText(`${pStr}_data_dash`, val); setText(`${pStr}_data`, val); }
        if (topic === `smart_level/central/${pStr}_timer_parcial`) { setText(`${pStr}_timer_total_dash`, val); setText(`${pStr}_timer_parcial`, val); }
        if (topic === `smart_level/central/${pStr}_kwh`) { setText(`${pStr}_kwh_dash`, val + " kWh"); setText(`${pStr}_kw_parcial`, val + " kWh"); }
        if (topic === `smart_level/central/${pStr}_valor`) { setText(`${pStr}_valor_dash`, val); setText(`${pStr}_valor`, val); }
        if (topic === `smart_level/central/${pStr}_timer_total`) setText(`${pStr}_timer_total`, val);
    }

    // --- CONFIGURAÇÕES DA CENTRAL (SINCRONIZAÇÃO E EXIBIÇÃO) ---
    if (topic === "smart_level/central/rodizio_min") {
        setText("rodizio_min", val + " min");
        if (!editandoConfig) {
            const total = parseInt(val) || 0;
            const h = Math.floor(total / 60);
            const m = total % 60;
            if (document.getElementById("cfg_rodizio_h")) document.getElementById("cfg_rodizio_h").value = h;
            if (document.getElementById("cfg_rodizio_m")) document.getElementById("cfg_rodizio_m").value = m;
        }
    }

    if (topic === "smart_level/central/retroA_status") {
        setText("retroA_status", "Poço " + val);
        if (!editandoConfig && document.getElementById("cfg_retroA")) document.getElementById("cfg_retroA").value = val;
    }

    if (topic === "smart_level/central/retroB_status") {
        setText("retroB_status", "Poço " + val);
        if (!editandoConfig && document.getElementById("cfg_retroB")) document.getElementById("cfg_retroB").value = val;
    }

    if (topic === "smart_level/central/manual_poco") {
        setText("poco_manual_sel", val);
        if (!editandoConfig && document.getElementById("cfg_manual_poco")) document.getElementById("cfg_manual_poco").value = val;
    }

    if (topic === "smart_level/central/poco_ativo") {
        setText("poco_ativo", "Poço " + val);
    }

    // --- STATUS GERAL ---
    if (topic === "smart_level/central/sistema") {
        const btn = document.getElementById("btnToggle");
        if (btn) {
            btn.textContent = val === "1" ? "DESLIGAR CENTRAL" : "LIGAR CENTRAL";
            btn.className = "btn-toggle-power " + (val === "1" ? "power-on" : "power-off");
        }
        setText("sistema", val === "1" ? "ATIVO" : "DESLIGADO");
        const st = document.getElementById("central_status");
        if (st) {
            st.textContent = val === "1" ? "Central: Online" : "Central: Offline";
            st.className = val === "1" ? "status-on" : "status-off";
        }
    }

    if (topic === "smart_level/central/cloro_pct") updateCloroBar(val);
    if (topic === "smart_level/central/cloro_peso_kg") setText("cloro_peso", val + " kg");
    if (topic === "smart_level/central/nivel") setText("nivel", val === "1" ? "ENCHENDO" : "CHEIO");
    if (topic === "smart_level/central/manual") setText("manual", val === "1" ? "MANUAL" : "AUTO");
    if (topic === "smart_level/central/retrolavagem") setText("retrolavagem", val === "1" ? "RETROLAVAGEM" : "NORMAL");

    // --- TRATAMENTO DO HISTÓRICO ---
    if (topic === "smart_level/central/retro_history_json") {
        renderHistory(val);
    }
}

// ==========================================================
// FUNÇÃO DE RENDERIZAÇÃO DO HISTÓRICO
// ==========================================================
function renderHistory(jsonStr) {
    const list = document.getElementById("history_list");
    if (!list) return;
    try {
        const data = JSON.parse(jsonStr);
        list.innerHTML = "";
        data.forEach(item => {
            const li = document.createElement("li");
            li.style.padding = "10px";
            li.style.borderBottom = "1px solid rgba(255,255,255,0.1)";
            li.style.color = "white";
            li.innerHTML = `<strong>${item.data}</strong>: ${item.inicio} às ${item.fim}`;
            list.appendChild(li);
        });
        if (window.lucide) lucide.createIcons();
    } catch (e) {
        console.error("Erro ao processar histórico:", e);
    }
}

// ==========================================================
// CONEXÃO E ENVIO
// ==========================================================
window.resetTimer = function(poco) {
    if (!client || !confirm(`Deseja resetar o ciclo parcial do Poço 0${poco}?`)) return;
    const msg = new Paho.MQTT.Message(JSON.stringify({ "reset_parcial": poco }));
    msg.destinationName = "smart_level/central/cmd";
    client.send(msg);
}

function initMQTT() {
    const clientId = "Fenix_App_" + Math.floor(Math.random() * 10000);
    client = new Paho.MQTT.Client(host, port, path, clientId);
    client.onConnectionLost = () => {
        setText("mqtt_status", "MQTT: Off");
        document.getElementById("mqtt_status").className = "status-off";
        setTimeout(initMQTT, 5000);
    };
    client.onMessageArrived = onMessage;
    client.connect({
        useSSL: useTLS, userName: username, password: password,
        onSuccess: () => {
            setText("mqtt_status", "MQTT: On");
            document.getElementById("mqtt_status").className = "status-on";
            client.subscribe("smart_level/central/#");
        },
        onFailure: () => { setTimeout(initMQTT, 5000); }
    });
}

document.addEventListener("DOMContentLoaded", () => {
    initMQTT();

    const camposTravados = ["cfg_rodizio_h", "cfg_rodizio_m", "cfg_retroA", "cfg_retroB", "cfg_manual_poco"];
    camposTravados.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("focus", iniciarEdicao);
            el.addEventListener("change", iniciarEdicao);
        }
    });

    document.getElementById("btnSalvarConfig")?.addEventListener("click", () => {
        if (!client) return;
        const h = parseInt(document.getElementById("cfg_rodizio_h").value) || 0;
        const m = parseInt(document.getElementById("cfg_rodizio_m").value) || 0;
        const payload = JSON.stringify({
            rodizio: (h * 60) + m,
            retroA: parseInt(document.getElementById("cfg_retroA").value),
            retroB: parseInt(document.getElementById("cfg_retroB").value),
            manual_poco: document.getElementById("cfg_manual_poco").value
        });
        const msg = new Paho.MQTT.Message(payload);
        msg.destinationName = "smart_level/central/cmd";
        client.send(msg);
        editandoConfig = false;
        alert("Configurações enviadas!");
    });

    document.getElementById("btnSalvarKW")?.addEventListener("click", () => {
        if (!client) return;
        const payload = JSON.stringify({
            p1_kw: parseFloat(document.getElementById("cfg_p1_kw").value) || 0,
            p2_kw: parseFloat(document.getElementById("cfg_p2_kw").value) || 0,
            p3_kw: parseFloat(document.getElementById("cfg_p3_kw").value) || 0,
            preco: parseFloat(document.getElementById("cfg_preco_kwh").value) || 0
        });
        const msg = new Paho.MQTT.Message(payload);
        msg.destinationName = "smart_level/central/cmd_kw";
        client.send(msg);
        alert("Calibração de energia enviada!");
    });

    document.getElementById("btnToggle")?.addEventListener("click", () => {
        if (!client) return;
        const msg = new Paho.MQTT.Message(JSON.stringify({ toggle: true }));
        msg.destinationName = "smart_level/central/cmd";
        client.send(msg);
    });

    document.getElementById("btnResetTara")?.addEventListener("click", () => {
        if (!client || !confirm("Zerar balança remota?")) return;
        const msg = new Paho.MQTT.Message(JSON.stringify({ reset_cloro: true }));
        msg.destinationName = "smart_level/central/cmd";
        client.send(msg);
    });
});
