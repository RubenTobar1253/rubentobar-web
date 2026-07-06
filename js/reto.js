// =========================================================
// EL RETO E×C×T=R — bitácora de ejecución de 30 días
// R diario = E (0–10) × C (0–10) × T (horas)
// Todo se guarda en el navegador del lector (localStorage).
// =========================================================

(function () {
  'use strict';

  var CLAVE = 'reto-ectr-v1';
  var DIAS_RETO = 30;

  // ---------------------------------------------------------
  // Almacenamiento con red de seguridad: si localStorage no
  // está disponible (modo privado estricto, navegador raro),
  // usamos memoria y avisamos con suavidad en consola.
  // ---------------------------------------------------------
  var memoria = null;

  function cargar() {
    try {
      var crudo = localStorage.getItem(CLAVE);
      return crudo ? JSON.parse(crudo) : null;
    } catch (e) {
      return memoria;
    }
  }

  function guardar(datos) {
    memoria = datos;
    try {
      localStorage.setItem(CLAVE, JSON.stringify(datos));
    } catch (e) {
      console.warn('No se pudo persistir la bitácora; se mantiene en memoria durante esta sesión.');
    }
  }

  function borrar() {
    memoria = null;
    try { localStorage.removeItem(CLAVE); } catch (e) { /* sin drama */ }
  }

  // ---------------------------------------------------------
  // Utilidades de fecha (siempre en hora local del lector)
  // ---------------------------------------------------------
  function hoyISO() {
    var d = new Date();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dia = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dia;
  }

  function fechaLegible(iso) {
    var partes = iso.split('-');
    var d = new Date(partes[0], partes[1] - 1, partes[2]);
    return d.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  function diasEntre(isoA, isoB) {
    var a = new Date(isoA + 'T00:00:00');
    var b = new Date(isoB + 'T00:00:00');
    return Math.round((b - a) / 86400000);
  }

  // ---------------------------------------------------------
  // Cálculo del resultado
  // ---------------------------------------------------------
  function calcularR(e, c, minutos) {
    return e * c * (minutos / 60);
  }

  // Lectura humana del registro: qué dice la fórmula hoy.
  function leerRegistro(e, c, minutos, minutosMeta) {
    if (e === 0 || c === 0 || minutos === 0) {
      return 'La fórmula es una multiplicación: un cero apaga todo lo demás. Mañana ese factor entra primero.';
    }
    // Factor limitante: el más bajo en proporción a su tope.
    var props = [
      { nombre: 'el esfuerzo', valor: e / 10 },
      { nombre: 'la concentración', valor: c / 10 },
      { nombre: 'el tiempo', valor: Math.min(minutos / minutosMeta, 1) }
    ];
    props.sort(function (a, b) { return a.valor - b.valor; });
    var limitante = props[0];

    if (limitante.valor >= 0.8) {
      return 'Un turno completo: los tres factores trabajando juntos. Así se ve la ejecución cuando nadie la mira.';
    }
    return 'Tu factor limitante hoy fue ' + limitante.nombre + '. Súbelo un punto mañana y R crece en cadena: eso es la multiplicación a tu favor.';
  }

  // ---------------------------------------------------------
  // Punto de quiebre: comparamos el promedio de los primeros
  // 7 registros con el promedio de los últimos 7. Si el
  // reciente supera al inicial en un 50 % o más, la curva
  // cambió de naturaleza.
  // ---------------------------------------------------------
  function detectarQuiebre(registros) {
    var lista = Object.keys(registros).sort().map(function (k) { return registros[k]; });
    if (lista.length < 10) return null;

    var primeros = lista.slice(0, 7);
    var ultimos = lista.slice(-7);
    var prom = function (arr) {
      return arr.reduce(function (s, r) { return s + r.r; }, 0) / arr.length;
    };
    var pIni = prom(primeros);
    var pFin = prom(ultimos);

    if (pIni > 0 && pFin >= pIni * 1.5) {
      var pct = Math.round(((pFin - pIni) / pIni) * 100);
      return 'Tu promedio de los últimos siete días supera en un ' + pct + ' % al de tu primera semana. La curva ya no es una línea: es una pendiente.';
    }
    return null;
  }

  // ---------------------------------------------------------
  // Referencias del DOM
  // ---------------------------------------------------------
  var $ = function (id) { return document.getElementById(id); };

  var panelMeta = $('panel-meta');
  var panelRegistro = $('panel-registro');
  var panelCurva = $('panel-curva');

  var inputE = $('input-e');
  var inputC = $('input-c');
  var inputT = $('input-t');
  var inputNota = $('input-nota');

  // ---------------------------------------------------------
  // Estado
  // ---------------------------------------------------------
  var datos = cargar();

  function hayMeta() {
    return datos && datos.meta && datos.meta.nombre;
  }

  // ---------------------------------------------------------
  // Vista: qué paneles se muestran
  // ---------------------------------------------------------
  function pintarVista() {
    if (!hayMeta()) {
      panelMeta.hidden = false;
      panelRegistro.hidden = true;
      panelCurva.hidden = true;
      return;
    }

    panelMeta.hidden = true;
    panelRegistro.hidden = false;
    panelCurva.hidden = false;

    pintarRegistro();
    pintarCurva();
  }

  // ---------------------------------------------------------
  // Panel de registro del día
  // ---------------------------------------------------------
  function numeroDeDia() {
    return Math.min(diasEntre(datos.meta.inicio, hoyISO()) + 1, DIAS_RETO);
  }

  function pintarRegistro() {
    $('registro-titulo-meta').textContent = datos.meta.nombre;
    $('registro-motivo').textContent = datos.meta.motivo ? '«' + datos.meta.motivo + '»' : '';
    $('registro-dia-num').textContent = 'Día ' + numeroDeDia() + ' / ' + DIAS_RETO;
    $('registro-fecha').textContent = fechaLegible(hoyISO());

    // Si hoy ya está firmado, precargamos sus valores.
    var deHoy = datos.registros[hoyISO()];
    if (deHoy) {
      inputE.value = deHoy.e;
      inputC.value = deHoy.c;
      inputT.value = deHoy.t;
      inputNota.value = deHoy.nota || '';
      $('mensaje-guardado').hidden = false;
      $('btn-guardar-dia').textContent = 'Actualizar el parte de hoy';
    }
    actualizarEcuacion();
  }

  function actualizarEcuacion() {
    var e = Number(inputE.value);
    var c = Number(inputC.value);
    var t = Number(inputT.value);
    var r = calcularR(e, c, t);

    $('valor-e').textContent = e;
    $('valor-c').textContent = c;
    $('valor-t').textContent = t;

    $('re-e').textContent = e;
    $('re-c').textContent = c;
    $('re-t').innerHTML = (t / 60).toFixed(1) + '<small>h</small>';

    var nodoR = $('resultado-r');
    nodoR.textContent = r.toFixed(1);
    nodoR.classList.toggle('es-cero', r === 0);
    nodoR.classList.toggle('es-alto', r >= 60);

    $('resultado-lectura').textContent = leerRegistro(e, c, t, datos.meta.minutos || 15);
  }

  function firmarDia() {
    var e = Number(inputE.value);
    var c = Number(inputC.value);
    var t = Number(inputT.value);

    datos.registros[hoyISO()] = {
      e: e,
      c: c,
      t: t,
      r: Number(calcularR(e, c, t).toFixed(1)),
      nota: inputNota.value.trim()
    };
    guardar(datos);

    $('mensaje-guardado').hidden = false;
    $('btn-guardar-dia').textContent = 'Actualizar el parte de hoy';
    pintarCurva();
  }

  // ---------------------------------------------------------
  // Panel de la curva: estadísticas, gráfica y lista
  // ---------------------------------------------------------
  function pintarCurva() {
    var claves = Object.keys(datos.registros).sort();
    var lista = claves.map(function (k) { return { fecha: k, reg: datos.registros[k] }; });

    // Estadísticas
    $('stat-dias').textContent = lista.length;
    $('stat-racha').textContent = calcularRacha(claves);
    var acumulado = lista.reduce(function (s, x) { return s + x.reg.r; }, 0);
    $('stat-acumulado').textContent = acumulado.toFixed(0);

    if (lista.length) {
      var mejor = lista.reduce(function (a, b) { return b.reg.r > a.reg.r ? b : a; });
      $('stat-mejor').textContent = mejor.reg.r.toFixed(1);
    }

    // Punto de quiebre
    var quiebre = detectarQuiebre(datos.registros);
    $('quiebre-banner').hidden = !quiebre;
    if (quiebre) $('quiebre-texto').textContent = quiebre;

    dibujarGrafica(lista);
    pintarLista(lista);
  }

  function calcularRacha(clavesOrdenadas) {
    if (!clavesOrdenadas.length) return 0;
    var racha = 0;
    var cursor = hoyISO();
    // Si hoy no está firmado, la racha puede seguir viva desde ayer.
    if (!datos.registros[cursor]) {
      cursor = restarDia(cursor);
    }
    while (datos.registros[cursor]) {
      racha++;
      cursor = restarDia(cursor);
    }
    return racha;
  }

  function restarDia(iso) {
    var d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() - 1);
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var dia = String(d.getDate()).padStart(2, '0');
    return d.getFullYear() + '-' + m + '-' + dia;
  }

  // ---------------------------------------------------------
  // Gráfica en canvas: barras (R diario) + línea (R acumulado)
  // ---------------------------------------------------------
  function dibujarGrafica(lista) {
    var canvas = $('curva-canvas');
    var ctx = canvas.getContext('2d');

    // Nitidez en pantallas de alta densidad
    var ancho = canvas.clientWidth || canvas.parentElement.clientWidth - 40;
    var alto = 320;
    var escala = window.devicePixelRatio || 1;
    canvas.width = ancho * escala;
    canvas.height = alto * escala;
    ctx.scale(escala, escala);
    ctx.clearRect(0, 0, ancho, alto);

    if (!lista.length) {
      ctx.fillStyle = 'rgba(27,31,38,0.5)';
      ctx.font = '14px "IBM Plex Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Firma tu primer parte y la curva empieza aquí.', ancho / 2, alto / 2);
      return;
    }

    var margen = { sup: 20, inf: 34, izq: 44, der: 44 };
    var zonaW = ancho - margen.izq - margen.der;
    var zonaH = alto - margen.sup - margen.inf;

    var n = Math.max(lista.length, 7); // que la gráfica respire al inicio
    var maxR = Math.max.apply(null, lista.map(function (x) { return x.reg.r; }).concat([10]));

    var acum = [];
    lista.reduce(function (s, x) { var t = s + x.reg.r; acum.push(t); return t; }, 0);
    var maxAcum = acum[acum.length - 1] || 1;

    var pasoX = zonaW / n;

    // Barras de R diario (color steel del sitio)
    ctx.fillStyle = '#5C86A6';
    lista.forEach(function (x, i) {
      var h = (x.reg.r / maxR) * zonaH;
      var bx = margen.izq + i * pasoX + pasoX * 0.18;
      ctx.fillRect(bx, margen.sup + zonaH - h, pasoX * 0.64, h);
    });

    // Línea de R acumulado (color ember)
    ctx.strokeStyle = '#C1622D';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    acum.forEach(function (v, i) {
      var px = margen.izq + i * pasoX + pasoX * 0.5;
      var py = margen.sup + zonaH - (v / maxAcum) * zonaH;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    });
    ctx.stroke();

    // Punto final de la línea
    var ux = margen.izq + (acum.length - 1) * pasoX + pasoX * 0.5;
    var uy = margen.sup + zonaH - (acum[acum.length - 1] / maxAcum) * zonaH;
    ctx.fillStyle = '#C1622D';
    ctx.beginPath();
    ctx.arc(ux, uy, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Etiquetas de eje X: día 1 y último día
    ctx.fillStyle = 'rgba(27,31,38,0.6)';
    ctx.font = '11px "IBM Plex Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('día 1', margen.izq, alto - 12);
    ctx.textAlign = 'right';
    ctx.fillText('día ' + lista.length, margen.izq + (lista.length - 1) * pasoX + pasoX, alto - 12);
  }

  // ---------------------------------------------------------
  // Lista de la bitácora (los últimos 10 partes, recientes primero)
  // ---------------------------------------------------------
  function pintarLista(lista) {
    var cont = $('bitacora-lista');
    cont.innerHTML = '';

    lista.slice(-10).reverse().forEach(function (x) {
      var dia = diasEntre(datos.meta.inicio, x.fecha) + 1;
      var fila = document.createElement('div');
      fila.className = 'bitacora-fila';

      var detalle = 'E ' + x.reg.e + ' · C ' + x.reg.c + ' · ' + x.reg.t + ' min';

      fila.innerHTML =
        '<span class="bf-dia">Día ' + dia + '</span>' +
        '<span class="bf-detalle">' + detalle +
        (x.reg.nota ? '<span class="bf-nota"></span>' : '') +
        '</span>' +
        '<span class="bf-r">R ' + x.reg.r.toFixed(1) + '</span>';

      // La nota va como texto plano para evitar inyección de HTML.
      if (x.reg.nota) {
        fila.querySelector('.bf-nota').textContent = '«' + x.reg.nota + '»';
      }
      cont.appendChild(fila);
    });
  }

  // ---------------------------------------------------------
  // Exportar y reiniciar
  // ---------------------------------------------------------
  function exportar() {
    var blob = new Blob([JSON.stringify(datos, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'mi-reto-ectr.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function reiniciar() {
    var seguro = confirm('¿Reiniciar el reto? Se borran la meta y todos los partes firmados. Esta acción no se puede deshacer.');
    if (!seguro) return;
    borrar();
    datos = null;
    // Limpiamos el formulario de la meta para empezar de cero.
    $('meta-nombre').value = '';
    $('meta-motivo').value = '';
    $('meta-minutos').value = 15;
    pintarVista();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ---------------------------------------------------------
  // Eventos
  // ---------------------------------------------------------
  $('btn-iniciar-reto').addEventListener('click', function () {
    var nombre = $('meta-nombre').value.trim();
    if (!nombre) {
      $('meta-nombre').focus();
      $('meta-nombre').placeholder = 'La meta necesita un nombre. Concreto.';
      return;
    }
    datos = {
      meta: {
        nombre: nombre,
        motivo: $('meta-motivo').value.trim(),
        minutos: Math.max(10, Number($('meta-minutos').value) || 15),
        inicio: hoyISO()
      },
      registros: {}
    };
    guardar(datos);
    pintarVista();
  });

  [inputE, inputC, inputT].forEach(function (inp) {
    inp.addEventListener('input', actualizarEcuacion);
  });

  $('btn-guardar-dia').addEventListener('click', firmarDia);
  $('btn-exportar').addEventListener('click', exportar);
  $('btn-reiniciar').addEventListener('click', reiniciar);

  // Redibujar la gráfica cuando cambia el tamaño de la ventana
  var temporizador;
  window.addEventListener('resize', function () {
    clearTimeout(temporizador);
    temporizador = setTimeout(function () {
      if (hayMeta()) pintarCurva();
    }, 200);
  });

  // ---------------------------------------------------------
  // Arranque
  // ---------------------------------------------------------
  pintarVista();
})();
