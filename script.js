var state = {
    numerosSeleccionados: [],
    reintegroSeleccionado: null,
    sorteos: [],
    sincronizando: false
};

var syncInterval = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    crearGridNumeros();
    crearSelectorReintegro();
    establecerFechaActual();
    cargarSorteos();
    configurarEventos();
}

function crearGridNumeros() {
    var grid = document.getElementById('gridNumeros');
    grid.innerHTML = '';

    for (var i = 1; i <= 49; i++) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-numero';
        btn.textContent = i;
        btn.dataset.numero = i;

        btn.addEventListener('click', function(e) {
            var numero = parseInt(e.target.dataset.numero);
            toggleNumero(numero, e.target);
        });

        grid.appendChild(btn);
    }
}

function crearSelectorReintegro() {
    var selector = document.getElementById('reintegroSelector');
    selector.innerHTML = '';

    for (var i = 0; i <= 9; i++) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-reintegro';
        btn.textContent = i;
        btn.dataset.reintegro = i;

        btn.addEventListener('click', function(e) {
            var numero = parseInt(e.target.dataset.reintegro);
            toggleReintegro(numero, e.target);
        });

        selector.appendChild(btn);
    }
}

function toggleNumero(numero, btn) {
    var index = state.numerosSeleccionados.indexOf(numero);

    if (index > -1) {
        state.numerosSeleccionados.splice(index, 1);
        btn.classList.remove('selected');
    } else {
        if (state.numerosSeleccionados.length < 7) {
            state.numerosSeleccionados.push(numero);
            btn.classList.add('selected');
        } else {
            mostrarMensaje('Maximo 7 numeros seleccionados', 'warning');
        }
    }

    actualizarNumerosSeleccionados();
}

function toggleReintegro(numero, btn) {
    if (state.reintegroSeleccionado === numero) {
        state.reintegroSeleccionado = null;
        btn.classList.remove('selected');
    } else {
        var selected = document.querySelectorAll('.btn-reintegro.selected');
        for (var i = 0; i < selected.length; i++) {
            selected[i].classList.remove('selected');
        }

        state.reintegroSeleccionado = numero;
        btn.classList.add('selected');
    }
}

function actualizarNumerosSeleccionados() {
    var container = document.getElementById('numerosSeleccionados');
    container.innerHTML = '';

    for (var i = 0; i < state.numerosSeleccionados.length; i++) {
        var num = state.numerosSeleccionados[i];
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'numero-seleccionado';
        btn.textContent = num;

        btn.addEventListener('click', function(e) {
            var numero = parseInt(e.target.textContent);
            var btnGrid = document.querySelector('[data-numero="' + numero + '"]');
            toggleNumero(numero, btnGrid);
        });

        container.appendChild(btn);
    }

    if (state.numerosSeleccionados.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary);">Selecciona 7 numeros</p>';
    }
}

function establecerFechaActual() {
    var hoy = new Date();
    var fecha = hoy.toISOString().split('T')[0];
    document.getElementById('fechaSorteo').value = fecha;
}

function configurarEventos() {
    document.getElementById('btnAgregar').addEventListener('click', agregarSorteo);
    document.getElementById('btnSincronizar').addEventListener('click', sincronizarDatos);
}

async function agregarSorteo() {
    if (state.numerosSeleccionados.length !== 7) {
        mostrarMensaje('Debes seleccionar exactamente 7 numeros', 'warning');
        return;
    }

    if (state.reintegroSeleccionado === null) {
        mostrarMensaje('Debes seleccionar un reintegro', 'warning');
        return;
    }

    var fechaInput = document.getElementById('fechaSorteo').value;
    
    if (!fechaInput) {
        mostrarMensaje('Debes seleccionar una fecha', 'warning');
        return;
    }

    var fecha = fechaInput;

    var formData = new FormData();
    formData.append('action', 'agregar');
    formData.append('reintegro', String(state.reintegroSeleccionado));
    formData.append('fecha', String(fecha));

    for (var i = 0; i < state.numerosSeleccionados.length; i++) {
        formData.append('numeros[' + i + ']', String(state.numerosSeleccionados[i]));
    }

    try {
        var response = await fetch('api.php', {
            method: 'POST',
            body: formData
        });

        var text = await response.text();
        var data = JSON.parse(text);

        if (data.success) {
            mostrarMensaje(data.message, 'success');
            limpiarFormulario();
            cargarSorteos();
        } else {
            mostrarMensaje(data.message || 'Error desconocido', 'danger');
        }
    } catch (error) {
        mostrarMensaje('Error al agregar sorteo: ' + error.message, 'danger');
    }
}

function limpiarFormulario() {
    state.numerosSeleccionados = [];
    state.reintegroSeleccionado = null;

    var btnNumeros = document.querySelectorAll('.btn-numero');
    for (var i = 0; i < btnNumeros.length; i++) {
        btnNumeros[i].classList.remove('selected');
    }

    var btnReintegros = document.querySelectorAll('.btn-reintegro');
    for (var i = 0; i < btnReintegros.length; i++) {
        btnReintegros[i].classList.remove('selected');
    }

    actualizarNumerosSeleccionados();
    establecerFechaActual();
}

async function cargarSorteos() {
    try {
        var response = await fetch('api.php?action=obtener');
        var sorteos = await response.json();

        state.sorteos = sorteos;
        actualizarTablaSorteos();
        actualizarEstadisticas();
    } catch (error) {
        mostrarMensaje('Error al cargar sorteos: ' + error.message, 'danger');
    }
}

function actualizarTablaSorteos() {
    var tbody = document.getElementById('tablaSorteosBody');
    tbody.innerHTML = '';

    if (state.sorteos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-secondary);">No hay sorteos registrados</td></tr>';
        return;
    }

    for (var i = 0; i < state.sorteos.length; i++) {
        var sorteo = state.sorteos[i];
        var tr = document.createElement('tr');

        var numeros = '';
        for (var n = 1; n <= 7; n++) {
            numeros += '<span class="numero-badge">' + sorteo['numero' + n] + '</span>';
        }

        tr.innerHTML = '<td>' + formatearFecha(sorteo.fecha_sorteo) + '</td>' +
                       '<td><div class="numeros-celda">' + numeros + '</div></td>' +
                       '<td><span class="reintegro-badge">' + sorteo.reintegro + '</span></td>' +
                       '<td><button class="btn btn-danger" onclick="eliminarSorteo(' + sorteo.id + ')">Eliminar</button></td>';

        tbody.appendChild(tr);
    }
}

async function eliminarSorteo(id) {
    if (!confirm('Estas seguro de que deseas eliminar este sorteo?')) {
        return;
    }

    var formData = new FormData();
    formData.append('action', 'eliminar');
    formData.append('id', id);

    try {
        var response = await fetch('api.php', {
            method: 'POST',
            body: formData
        });

        var data = await response.json();

        if (data.success) {
            mostrarMensaje(data.message, 'success');
            cargarSorteos();
        } else {
            mostrarMensaje(data.message, 'danger');
        }
    } catch (error) {
        mostrarMensaje('Error al eliminar sorteo: ' + error.message, 'danger');
    }
}

async function actualizarEstadisticas() {
    if (state.sorteos.length === 0) {
        return;
    }

    cargarFrecuenciaAbsoluta();
    cargarFrecuenciaRelativa();
    cargarParejas();
    cargarDistribucionDecenas();
    cargarParesImpares();
    cargarPredicciones();
}

async function cargarPredicciones() {
    try {
        // Combinación Básica
        var responseBasica = await fetch('api.php?action=combinacion-basica');
        var dataBasica = await responseBasica.json();
        mostrarPrediccion(dataBasica, 'prediccionBasicaContent');

        // Combinación Optimizada
        var responseOptimizada = await fetch('api.php?action=combinacion-optimizada');
        var dataOptimizada = await responseOptimizada.json();
        mostrarPrediccion(dataOptimizada, 'prediccionOptimizadaContent');

        // Combinación Avanzada
        var responseAvanzada = await fetch('api.php?action=combinacion-avanzada');
        var dataAvanzada = await responseAvanzada.json();
        mostrarPrediccion(dataAvanzada, 'prediccionAvanzadaContent');
    } catch (error) {
        console.error('Error al cargar predicciones:', error);
    }
}

function mostrarPrediccion(data, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    if (data.error) {
        container.innerHTML = '<p style="color: var(--text-secondary);">Error: ' + data.error + '</p>';
        return;
    }

    var numerosHTML = '';
    for (var i = 0; i < data.numeros.length; i++) {
        numerosHTML += '<span class="numero-prediccion">' + data.numeros[i] + '</span>';
    }

    var html = '<div class="prediction-numeros">' + numerosHTML + '</div>';
    html += '<div class="prediction-reintegro">🎰 Reintegro: <strong>' + data.reintegro + '</strong></div>';
    html += '<div class="prediction-info" style="font-size: 0.85em; color: var(--text-secondary); margin-top: 10px;">' + data.confianza + '</div>';

    container.innerHTML = html;
}

async function cargarFrecuenciaAbsoluta() {
    try {
        var response = await fetch('api.php?action=frecuencia-absoluta');
        var data = await response.json();

        var principales = document.getElementById('frecuenciaAbsolutaPrincipales');
        if (principales) {
            principales.innerHTML = '';

            var entries = Object.entries(data.principales || {})
                .sort(function(a, b) {
                    return b[1] - a[1];
                });

            for (var i = 0; i < entries.length; i++) {
                var num = entries[i][0];
                var freq = entries[i][1];

                var div = document.createElement('div');
                div.className = 'stat-item';
                div.innerHTML =
                    '<span class="stat-label">' + num + '</span>' +
                    '<span class="stat-value">' + freq + ' veces</span>';

                principales.appendChild(div);
            }
        }

        var reintegros = document.getElementById('frecuenciaAbsolutaReintegros');
        if (reintegros) {
            reintegros.innerHTML = '';

            var entries = Object.entries(data.reintegros || {})
                .sort(function(a, b) {
                    return b[1] - a[1];
                });

            for (var i = 0; i < entries.length; i++) {
                var num = entries[i][0];
                var freq = entries[i][1];

                var div = document.createElement('div');
                div.className = 'stat-item';
                div.innerHTML =
                    '<span class="stat-label">' + num + '</span>' +
                    '<span class="stat-value">' + freq + ' veces</span>';

                reintegros.appendChild(div);
            }
        }

    } catch (error) {
        console.error('Error cargar frecuencia absoluta:', error);
    }
}


async function cargarFrecuenciaRelativa() {
    try {
        var response = await fetch('api.php?action=frecuencia-relativa');
        var data = await response.json();

        var principales = document.getElementById('frecuenciaRelativaPrincipales');
        if (principales) {
            principales.innerHTML = '';

            var entries = Object.entries(data.principales || {})
                .sort(function(a, b) {
                    return a[1] - b[1];
                });

            for (var i = 0; i < entries.length; i++) {
                var num = entries[i][0];
                var freq = entries[i][1];

                var div = document.createElement('div');
                div.className = 'stat-item';
                div.innerHTML =
                    '<span class="stat-label">' + num + '</span>' +
                    '<span class="stat-value">Cada ' + freq + ' juegos</span>';

                principales.appendChild(div);
            }
        }

        var reintegros = document.getElementById('frecuenciaRelativaReintegros');
        if (reintegros) {
            reintegros.innerHTML = '';

            var entries = Object.entries(data.reintegros || {})
                .sort(function(a, b) {
                    return a[1] - b[1];
                });

            for (var i = 0; i < entries.length; i++) {
                var num = entries[i][0];
                var freq = entries[i][1];

                var div = document.createElement('div');
                div.className = 'stat-item';
                div.innerHTML =
                    '<span class="stat-label">' + num + '</span>' +
                    '<span class="stat-value">Cada ' + freq + ' juegos</span>';

                reintegros.appendChild(div);
            }
        }

    } catch (error) {
        console.error('Error cargar frecuencia relativa:', error);
    }
}

async function cargarParejas() {
    try {
        var response = await fetch('api.php?action=parejas');
        var data = await response.json();

        var container = document.getElementById('parejasContent');
        if (container) {
            container.innerHTML = '';

            if (Object.keys(data).length === 0) {
                container.innerHTML = '<p style="color: var(--text-secondary);">Sin parejas</p>';
                return;
            }

            var entries = Object.entries(data);
            for (var i = 0; i < entries.length; i++) {
                var pareja = entries[i][0];
                var freq = entries[i][1];
                var div = document.createElement('div');
                div.className = 'stat-item';
                div.innerHTML = '<span class="stat-label">' + pareja + '</span>' +
                                '<span class="stat-value">' + freq + ' veces</span>';
                container.appendChild(div);
            }
        }
    } catch (error) {
        console.error('Error cargar parejas:', error);
    }
}

async function cargarDistribucionDecenas() {
    try {
        var response = await fetch('api.php?action=decenas');
        var data = await response.json();

        var container = document.getElementById('decenasContent');
        if (container) {
            container.innerHTML = '';

            var total = 0;
            for (var key in data) {
                total += data[key];
            }

            var entries = Object.entries(data);
            for (var i = 0; i < entries.length; i++) {
                var decena = entries[i][0];
                var count = entries[i][1];
                var porcentaje = total > 0 ? (count / total * 100).toFixed(1) : 0;

                var div = document.createElement('div');
                div.className = 'stat-card';
                div.innerHTML = '<div class="stat-card-label">' + decena + '</div>' +
                                '<div class="stat-card-value">' + count + '</div>' +
                                '<div style="color: var(--text-secondary); font-size: 0.9em; margin-top: 5px;">' + porcentaje + '%</div>';
                container.appendChild(div);
            }
        }
    } catch (error) {
        console.error('Error cargar decenas:', error);
    }
}

async function cargarParesImpares() {
    try {
        var response = await fetch('api.php?action=pares-impares');
        var data = await response.json();

        var container = document.getElementById('paresImparesContent');
        if (container) {
            var html = '<div class="analysis-item">' +
                '<h4>Numeros Pares</h4>' +
                '<div class="progress-label">' +
                '<span>Pares</span>' +
                '<span>' + data.pares + ' numeros</span>' +
                '</div>' +
                '<div class="progress-bar">' +
                '<div class="progress-fill" style="width: ' + data.porcentaje_pares + '%">' +
                data.porcentaje_pares + '%' +
                '</div>' +
                '</div>' +
                '</div>' +

                '<div class="analysis-item">' +
                '<h4>Numeros Impares</h4>' +
                '<div class="progress-label">' +
                '<span>Impares</span>' +
                '<span>' + data.impares + ' numeros</span>' +
                '</div>' +
                '<div class="progress-bar">' +
                '<div class="progress-fill" style="width: ' + data.porcentaje_impares + '%">' +
                data.porcentaje_impares + '%' +
                '</div>' +
                '</div>' +
                '</div>' +

                '<div class="analysis-item">' +
                '<h4>Resumen</h4>' +
                '<div style="padding: 10px; text-align: center;">' +
                '<div style="margin-bottom: 10px;">' +
                '<div style="color: var(--text-secondary); font-size: 0.9em;">Total de numeros</div>' +
                '<div style="font-size: 1.5em; font-weight: bold; color: var(--primary-color);">' + data.total + '</div>' +
                '</div>' +
                '<div>' +
                '<div style="color: var(--text-secondary); font-size: 0.9em;">Proporcion ideal</div>' +
                '<div style="font-size: 0.9em; color: var(--text-secondary);">~50% pares, ~50% impares</div>' +
                '</div>' +
                '</div>' +
                '</div>';

            container.innerHTML = html;
        }
    } catch (error) {
        console.error('Error cargar pares/impares:', error);
    }
}

async function sincronizarDatos() {
    if (state.sincronizando) {
        mostrarMensaje('Ya hay una sincronización en proceso...', 'warning');
        return;
    }

    state.sincronizando = true;
    var btnSync = document.getElementById('btnSincronizar');
    var statusSync = document.getElementById('statusSync');

    btnSync.disabled = true;
    btnSync.textContent = '⏳ Sincronizando...';
    statusSync.textContent = 'Estado: Descargando datos...';

    try {
        var response = await fetch('sync.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action: 'sincronizar' })
        });

        var data = await response.json();

        if (data.success) {
            mostrarMensaje('✅ Sincronización completada: ' + data.nuevos_sorteos + ' nuevos sorteos', 'success');
            statusSync.textContent = 'Estado: Sincronizado ✓';
            cargarSorteos();
        } else {
            mostrarMensaje('❌ Error en sincronización: ' + data.message, 'danger');
            statusSync.textContent = 'Estado: Error en sincronización';
        }
    } catch (error) {
        mostrarMensaje('Error al sincronizar: ' + error.message, 'danger');
        statusSync.textContent = 'Estado: Error de conexión';
    } finally {
        state.sincronizando = false;
        btnSync.disabled = false;
        btnSync.textContent = '🔄 Sincronizar desde Internet';
    }
}

function formatearFecha(fecha) {
    var date;
    
    if (fecha.includes('T')) {
        date = new Date(fecha);
    } else {
        var partes = fecha.split('-');
        date = new Date(partes[0], partes[1] - 1, partes[2]);
    }
    
    if (isNaN(date.getTime())) {
        return fecha;
    }
    
    return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function mostrarMensaje(mensaje, tipo) {
    var div = document.createElement('div');
    div.style.cssText = 'position: fixed; top: 20px; right: 20px; padding: 15px 25px; border-radius: 8px; color: white; font-weight: 600; z-index: 9999; animation: slideIn 0.3s ease; max-width: 400px; box-shadow: 0 5px 20px rgba(0,0,0,0.3);';

    var colores = {
        'success': 'linear-gradient(135deg, #10b981, #059669)',
        'danger': 'linear-gradient(135deg, #ef4444, #dc2626)',
        'warning': 'linear-gradient(135deg, #f59e0b, #d97706)',
        'info': 'linear-gradient(135deg, #6366f1, #4f46e5)'
    };

    div.style.background = colores[tipo] || colores['info'];
    div.textContent = mensaje;

    document.body.appendChild(div);

    setTimeout(function() {
        div.style.animation = 'slideOut 0.3s ease';
        setTimeout(function() {
            div.remove();
        }, 300);
    }, 4000);
}

var style = document.createElement('style');
style.textContent = '@keyframes slideIn { from { transform: translateX(400px); opacity: 0; } to { transform: translateX(0); opacity: 1; } } @keyframes slideOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(400px); opacity: 0; } }';
document.head.appendChild(style);