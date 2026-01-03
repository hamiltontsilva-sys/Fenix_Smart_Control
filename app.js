<!doctype html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no, viewport-fit=cover" />
    <title>Fênix – Smart Control</title>
    <link rel="stylesheet" href="style.css" />
    <script src="https://unpkg.com/lucide@latest"></script>
    <style>
        .time-picker { display: flex; gap: 5px; align-items: center; width: 100%; }
        .time-picker select { flex: 1; }
    </style>
</head>
<body>

<header class="top-header">
    <img src="logo.jpg" class="app-logo">
    <div class="app-title">Fênix Smart Control</div>
    <div class="status-box">
        <div id="mqtt_status" class="status-off">MQTT: --</div>
        <div id="central_status" class="status-off">Central: --</div>
    </div>
</header>

<nav class="tabs">
    <button class="tab-btn active" data-tab="dashboard">Dashboard</button>
    <button class="tab-btn" data-tab="alarmes">Alarmes</button>
    <button class="tab-btn" data-tab="config">Configurações</button>
    <button class="tab-btn" data-tab="historico">Histórico</button>
</nav>

<section id="dashboard" class="tab-page visible">
    <div class="card">
        <div class="card-header"><i data-lucide="activity" class="icon"></i><span>Status Geral</span></div>
        <div class="status-grid">
            <div class="item"><label>Sistema:</label><div id="sistema" class="value">-</div></div>
            <div class="item"><label>Passo:</label><div id="retrolavagem" class="value">-</div></div>
            <div class="item"><label>Boia:</label><div id="nivel" class="value">-</div></div>
            <div class="item"><label>Operação:</label><div id="manual" class="value">-</div></div>
            <div class="item"><label>RetroA:</label><div id="retroA_status" class="value">-</div></div>
            <div class="item"><label>Poço da vez:</label><div id="poco_ativo" class="value">-</div></div>
            <div class="item"><label>RetroB:</label><div id="retroB_status" class="value">-</div></div>
            <div class="item"><label>Poço Manual Sel.:</label><div id="poco_manual_sel" class="value">-</div></div>
            <div class="item"><label>Rodízio (min):</label><div id="rodizio_min" class="value">-</div></div>
        </div>
    </div>

    <div class="pocos-grid">
        <div class="card">
            <div class="card-header"><span>Poço 01</span></div>
            <div class="item-row"><label>Status:</label><div id="p1_online" class="value">-</div></div>
            <div class="item-row"><label>Fluxo:</label><div id="p1_fluxo" class="value">-</div></div>
            <div class="item-row"><label>Timer:</label><div id="p1_timer" class="value">-</div></div>
        </div>
        <div class="card">
            <div class="card-header"><span>Poço 02</span></div>
            <div class="item-row"><label>Status:</label><div id="p2_online" class="value">-</div></div>
            <div class="item-row"><label>Fluxo:</label><div id="p2_fluxo" class="value">-</div></div>
            <div class="item-row"><label>Timer:</label><div id="p2_timer" class="value">-</div></div>
        </div>
        <div class="card">
            <div class="card-header"><span>Poço 03</span></div>
            <div class="item-row"><label>Status:</label><div id="p3_online" class="value">-</div></div>
            <div class="item-row"><label>Fluxo:</label><div id="p3_fluxo" class="value">-</div></div>
            <div class="item-row"><label>Timer:</label><div id="p3_timer" class="value">-</div></div>
        </div>
    </div>

    <div class="card">
        <div class="card-header"><i data-lucide="flask-conical" class="icon"></i><span>Cloro</span></div>
        <div class="item-row"><label>Peso:</label><div id="cloro_peso" class="value">-</div></div>
        <div class="cloro-bar-bg"><div id="cloro_bar" class="cloro-bar-fill"></div></div>
        <div id="cloro_pct_txt" style="text-align:right; font-size:12px">0%</div>
    </div>
</section>

<section id="alarmes" class="tab-page">
    <div class="card">
        <div class="card-header"><i data-lucide="alert-triangle" class="icon" style="color: var(--offline)"></i><span>Alertas</span></div>
        <div id="alarm_container">
            <p style="text-align:center; padding:20px; color:gray">Nenhum alarme detectado.</p>
        </div>
    </div>
</section>

<section id="config" class="tab-page">
    <div class="card">
        <div class="config-container">
            <div class="config-row">
                <label>Rodízio:</label>
                <div class="time-picker">
                    <select id="cfg_rodizio_h"><option value="0">0h</option><option value="1">1h</option><option value="2">2h</option></select>
                    <select id="cfg_rodizio_m"></select>
                </div>
            </div>
            <div class="config-row">
                <label>Retro A:</label>
                <select id="cfg_retroA"><option value="1">Poço 1</option><option value="2">Poço 2</option><option value="3">Poço 3</option></select>
            </div>
            <div class="config-row">
                <label>Retro B:</label>
                <select id="cfg_retroB"><option value="1">Poço 1</option><option value="2">Poço 2</option><option value="3">Poço 3</option></select>
            </div>
            <div class="config-row">
                <label>Manual:</label>
                <select id="cfg_manual_poco">
                    <option value="1">Poço 1</option><option value="2">Poço 2</option><option value="3">Poço 3</option>
                    <option value="12">P1 e P2</option><option value="123">Todos</option>
                </select>
            </div>
            <div class="config-actions">
                <button id="btnSalvarConfig" class="btn-save">SALVAR</button>
                <button id="btnToggle" class="btn-toggle-power">LIGAR/DESLIGAR</button>
            </div>
        </div>
    </div>
</section>

<section id="historico" class="tab-page">
    <div class="card"><ul id="history_list" class="history-list"></ul></div>
</section>

<script src="paho-mqtt.js"></script>
<script src="app.js"></script>
<script>
    const mSel = document.getElementById('cfg_rodizio_m');
    for (let i = 0; i < 60; i++) {
        let o = document.createElement('option'); o.value = i; o.text = i.toString().padStart(2, '0') + ' min';
        mSel.add(o);
    }
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('visible'));
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('visible');
        };
    });
    lucide.createIcons();
</script>
</body>
</html>
