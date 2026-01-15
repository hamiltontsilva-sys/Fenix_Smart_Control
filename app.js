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
let editandoConfig = false; // TRAVA DE EDIÇÃO
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

// Bloqueia atualizações externas enquanto o operador digita
function iniciarEdicao() {
    editandoConfig = true;
    clearTimeout(timeoutEdicao);
    timeoutEdicao = setTimeout(() => {
        editandoConfig = false;
    }, 15000); // 15 segundos de folga para configurar
}

// ==========================================================
// PROCESSAMENTO DE MENSAGENS (COM TRAVA)
// ==========================================================
function onMessage(msg) {
    const topic = msg.destinationName;
    const val = msg.payloadString;

    // Status da Central no Cabeçalho
    if (topic === "smart_level/central/sistema") {
        setText("sistema", val === "1" ? "LIGADO" : "DESLIGADO");
        const st = document.getElementById("central_status");
        if (st) {
            st.textContent = val === "1" ? "Central: Online" : "Central: Offline";
            st.className = val === "1" ? "status-on" : "status-off";
        }
    }

    switch (topic) {
        // SINCRONIZAÇÃO DE CONFIGURAÇÕES (Respeita a trava de edição)
        case "smart_level/central/rodizio_min": 
            if (!editandoConfig) {
                const total = parseInt(val);
                if (document.getElementById("cfg_rodizio_h")) document.getElementById("cfg_rodizio_h").value = Math.floor(total / 60);
                if (document.getElementById("cfg_rodizio_m")) document.getElementById("cfg_rodizio_m").value = total % 60;
            }
            setText("rodizio_min", val + " min");
            break;

        case "smart_level/central/retroA_status": 
            if (!editandoConfig && document.getElementById("cfg_retroA")) document.getElementById("cfg_retroA").value = val;
            setText("retroA_status", "Poço " + val);
            break;

        case "smart_level/central/retroB_status": 
            if (!editandoConfig && document.getElementById("cfg_retroB")) document.getElementById("cfg_retroB").value = val;
            setText("retroB_status", "Poço " + val);
            break;

        case "smart_level/central/manual_poco": 
            if (!editandoConfig && document.getElementById("cfg_manual_poco")) document.getElementById("cfg_manual_poco").value = val;
            setText("poco_manual_sel", val);
            break;

        // STATUS DOS POÇOS E TIMERS (Sempre atualizam)
        case "smart_level/central/p1_online": setText("p1_online", val === "1" ? "ONLINE" : "OFFLINE"); break;
        case "smart_level/central/p2_online": setText("p2_online", val === "1" ? "ONLINE" : "OFFLINE"); break;
        case "smart_level/central/p3_online": setText("p3_online", val === "1" ? "ONLINE" : "OFFLINE"); break;
        case "smart_level/central/p1_timer": setText("p1_timer", val); break;
        case "smart_level/central/p2_timer": setText("p2_timer", val); break;
        case "smart_level/central/p3_timer": setText("p3_timer", val); break;
        
        case "smart_level/central/p1_fluxo": 
            setText("p1_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO");
            document.getElementById("p1_motor")?.classList.toggle("spinning", val === "1");
            break;
        case "smart_level/central/p2_fluxo": 
            setText("p2_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO");
            document.getElementById("p2_motor")?.classList.toggle("spinning", val === "1");
            break;
        case "smart_level/central/p3_fluxo": 
            setText("p3_fluxo", val === "1" ? "COM FLUXO" : "SEM FLUXO");
            document.getElementById("p3_motor")?.classList.toggle("spinning", val === "1");
            break;

        // OUTROS
        case "smart_level/central/cloro_pct": updateCloroBar(val); break;
        case "smart_level/central/cloro_peso_kg": setText("cloro_peso", val + " kg"); break;
        case "smart_level/central/retro_history_json": renderHistory(val); break;
        case "smart_level/central/retrolavagem": setText("retrolavagem", val === "1" ? "RETROLAVAGEM" : "CTRL. NÍVEL"); break;
        case "smart_level/central/nivel": setText("nivel", val === "1" ? "ENCHIMENTO" : "CHEIO"); break;
        case "smart_level/central/manual": setText("manual", val === "1" ? "MANUAL" : "AUTO"); break;
        case "smart_level/central/poco_ativo": setText("poco_ativo", "Poço " + val); break;
    }
}

// ==========================================================
// HISTÓRICO E EVENTOS
// ==========================================================
function renderHistory(jsonStr) {
    const list = document.getElementById("history_list");
    if (!list) return;
    try {
        const data = JSON.parse(jsonStr);
        list.innerHTML = "";
        data.forEach(item => {
            const li = document.createElement("li");
            li.style.padding = "10px"; li.style.borderBottom = "1px solid #eee";
            li.innerHTML = `<strong>${item.data}</strong>: ${item.inicio} às ${item.fim}`;
            list.appendChild(li);
        });
    } catch (e) { console.error("Erro histórico:", e); }
}

function initMQTT() {
    const clientId = "Fenix_Web_" + Math.floor(Math.random() * 10000);
    client = new Paho.MQTT.Client(host, port, path, clientId);
    client.onMessageArrived = onMessage;
    client.onConnectionLost = () => setTimeout(initMQTT, 5000);
    client.connect({
        useSSL: useTLS, userName: username, password: password,
        onSuccess: () => {
            setText("mqtt_status", "MQTT: On");
            document.getElementById("mqtt_status").className = "status-on";
            client.subscribe("smart_level/central/#");
        }
    });
}

// ==========================================================
// INICIALIZAÇÃO E BOTÕES
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
    initMQTT();

    // Ativa trava ao interagir com campos de configuração
    const campos = ["cfg_rodizio_h", "cfg_rodizio_m", "cfg_retroA", "cfg_retroB", "cfg_manual_poco"];
    campos.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener("focus", iniciarEdicao);
            el.addEventListener("change", iniciarEdicao);
        }
    });

    // Botão Salvar
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
        editandoConfig = false; // Libera trava
        alert("Configurações enviadas com sucesso!");
    });

    // Botão Tara
    document.getElementById("btnResetTara")?.addEventListener("click", () => {
        if (!client || !confirm("Zerar balança remota?")) return;
        const msg = new Paho.MQTT.Message(JSON.stringify({ reset_tara: true }));
        msg.destinationName = "smart_level/central/cmd";
        client.send(msg);
    });
});
