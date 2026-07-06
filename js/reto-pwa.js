// =========================================================
// EL RETO E×C×T=R — módulo de app (PWA)
// Frase del día · recordatorio diario · compartir la curva
// como imagen · instalación en el teléfono.
// Lee la misma bitácora que js/reto.js (clave reto-ectr-v1).
// =========================================================

(function () {
  'use strict';

  var CLAVE_DATOS = 'reto-ectr-v1';
  var CLAVE_AJUSTES = 'reto-ectr-ajustes';

  var $ = function (id) { return document.getElementById(id); };

  // ---------------------------------------------------------
  // Acceso a los datos (con la misma red de seguridad)
  // ---------------------------------------------------------
  function leerJSON(clave) {
    try {
      var crudo = localStorage.getItem(clave);
      return crudo ? JSON.parse(crudo) : null;
    } catch (e) { return null; }
  }

  function guardarJSON(clave, valor) {
    try { localStorage.setItem(clave, JSON.stringify(valor)); } catch (e) { /* memoria */ }
  }

  function hoyISO() {
    var d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function ayerISO() {
    var d = new Date();
    d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function diasDesdeInicio(datos) {
    if (!datos || !datos.meta) return 1;
    var a = new Date(datos.meta.inicio + 'T00:00:00');
    var b = new Date(hoyISO() + 'T00:00:00');
    return Math.min(Math.round((b - a) / 86400000) + 1, 30);
  }

  // =========================================================
  // 1 · FRASE DEL DÍA — una por cada día del reto
  // =========================================================
  var FRASES = [
    ['Una idea sin ejecución es solo una intención. Hoy toca ejecutar.', 'Ejecuta'],
    ['«Los pensamientos del solícito ciertamente van a abundancia.»', 'Proverbios 21:5 (RVA)'],
    ['El esfuerzo de hoy es invisible. El resultado de mañana no.', 'E×C×T=R'],
    ['La concentración es proteger una idea el tiempo suficiente para que crezca.', 'Ejecuta'],
    ['Nadie ve los turnos que firmas. Todos verán la curva que dejan.', 'Bitácora'],
    ['La fórmula multiplica: no dejes que un cero apague tu día.', 'E×C×T=R'],
    ['«Todo lo que te viniere a la mano para hacer, hazlo según tus fuerzas.»', 'Eclesiastés 9:10 (RVA)'],
    ['El talento abre la puerta; la constancia amuebla la casa.', 'Bitácora'],
    ['Un día sencillo y firmado vale más que un día perfecto imaginado.', 'Bitácora'],
    ['La disciplina no se siente. Se decide.', 'Dominio Propio'],
    ['La meseta no es el final de la curva: es su parte más honesta.', 'La Ley del Avance'],
    ['«No nos cansemos de hacer el bien, que a su tiempo segaremos.»', 'Gálatas 6:9 (RVA)'],
    ['Hoy no necesitas motivación. Necesitas sesenta minutos.', 'Bitácora'],
    ['El punto de quiebre no avisa. Llega mientras trabajas.', 'Ejecuta'],
    ['Las rachas no se construyen con fuerza: se construyen con presencia.', 'Bitácora'],
    ['Ajusta la meta del día si hace falta, pero firma el parte.', 'Bitácora'],
    ['La física no negocia: sin fuerza aplicada no hay trabajo realizado.', 'E×C×T=R'],
    ['«Encomienda a Jehová tus obras, y tus pensamientos serán afirmados.»', 'Proverbios 16:3 (RVA)'],
    ['El tiempo que no registras también cuenta. Cuenta en contra.', 'Bitácora'],
    ['Una hora entera vale más que tres horas partidas.', 'La Mente Afilada'],
    ['La curva de otro no es tu vara de medir. Tu día uno tampoco.', 'Bitácora'],
    ['Ejecutar es la forma más corta de aprender.', 'Ejecuta'],
    ['El cansancio es información, no una sentencia. Ajusta y firma.', 'Bitácora'],
    ['«La mano de los diligentes se enseñoreará.»', 'Proverbios 12:24 (RVA)'],
    ['Sube un punto tu factor más bajo y todo el resultado crece.', 'E×C×T=R'],
    ['Los grandes resultados son pequeños resultados que no se rindieron.', 'La Ley del Avance'],
    ['Tu meta no necesita testigos. Necesita turnos.', 'Bitácora'],
    ['La voluntad es una arquitectura: se construye viga por viga.', 'La Arquitectura de la Voluntad'],
    ['No eres lo que planeas. Eres lo que ejecutas.', 'Ejecuta'],
    ['Día treinta: la fórmula ya no está en el papel. Está en ti.', 'E×C×T=R']
  ];

  function pintarFrase() {
    var datos = leerJSON(CLAVE_DATOS);
    if (!datos || !datos.meta) return;
    var dia = diasDesdeInicio(datos);
    var f = FRASES[(dia - 1) % FRASES.length];
    if ($('frase-dia-texto')) {
      $('frase-dia-texto').textContent = f[0];
      $('frase-dia-fuente').textContent = f[1];
    }
  }

  // =========================================================
  // 2 · AVISO DE RACHA — si ayer quedó sin firmar
  // =========================================================
  function pintarAvisoRacha() {
    var datos = leerJSON(CLAVE_DATOS);
    var aviso = $('aviso-racha');
    if (!datos || !datos.meta || !aviso) return;

    var yaEmpezoAntesDeHoy = datos.meta.inicio < hoyISO();
    var ayerSinFirmar = yaEmpezoAntesDeHoy && !datos.registros[ayerISO()];
    var hoySinFirmar = !datos.registros[hoyISO()];

    aviso.hidden = !(ayerSinFirmar && hoySinFirmar);
  }

  // =========================================================
  // 3 · RECORDATORIO DIARIO
  // Con la app abierta (o instalada y abierta), revisamos cada
  // minuto: si pasó la hora elegida y el parte del día sigue
  // sin firmar, mostramos una notificación. Una sola por día.
  // =========================================================
  var toggle = $('ajuste-recordatorio');
  var horaInput = $('ajuste-hora');
  var estado = $('recordatorio-estado');

  function ajustes() {
    return leerJSON(CLAVE_AJUSTES) || { recordatorio: false, hora: '20:00', avisado: '' };
  }

  function pintarAjustes() {
    if (!toggle) return;
    var a = ajustes();
    toggle.checked = a.recordatorio && (typeof Notification !== 'undefined' && Notification.permission === 'granted');
    horaInput.value = a.hora || '20:00';
    pintarEstado();
  }

  function pintarEstado() {
    if (!estado) return;
    if (typeof Notification === 'undefined') {
      estado.textContent = 'Tu navegador no permite notificaciones; el aviso aparecerá dentro de la app.';
      return;
    }
    var a = ajustes();
    if (a.recordatorio && Notification.permission === 'granted') {
      estado.textContent = 'Activo · te avisamos a las ' + a.hora + ' si el turno sigue sin firmar.';
    } else if (Notification.permission === 'denied') {
      estado.textContent = 'Las notificaciones están bloqueadas en tu navegador. Puedes activarlas desde sus ajustes.';
    } else {
      estado.textContent = '';
    }
  }

  function activarRecordatorio() {
    if (typeof Notification === 'undefined') {
      guardarJSON(CLAVE_AJUSTES, { recordatorio: true, hora: horaInput.value, avisado: '' });
      pintarEstado();
      return;
    }
    Notification.requestPermission().then(function (permiso) {
      var a = ajustes();
      a.recordatorio = permiso === 'granted';
      a.hora = horaInput.value;
      guardarJSON(CLAVE_AJUSTES, a);
      toggle.checked = a.recordatorio;
      pintarEstado();
    });
  }

  function revisarRecordatorio() {
    var a = ajustes();
    if (!a.recordatorio) return;

    var datos = leerJSON(CLAVE_DATOS);
    if (!datos || !datos.meta) return;
    if (datos.registros[hoyISO()]) return;        // hoy ya está firmado
    if (a.avisado === hoyISO()) return;           // ya avisamos hoy

    var ahora = new Date();
    var partes = (a.hora || '20:00').split(':');
    var objetivo = new Date();
    objetivo.setHours(Number(partes[0]), Number(partes[1]), 0, 0);
    if (ahora < objetivo) return;                 // aún no es la hora

    mostrarNotificacion(datos);
    a.avisado = hoyISO();
    guardarJSON(CLAVE_AJUSTES, a);
  }

  function mostrarNotificacion(datos) {
    var titulo = 'Tu turno no se ha firmado';
    var cuerpo = 'Día ' + diasDesdeInicio(datos) + ' de 30 · «' + datos.meta.nombre + '». La racha se defiende hoy.';

    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      if (navigator.serviceWorker && navigator.serviceWorker.ready) {
        navigator.serviceWorker.ready.then(function (reg) {
          reg.showNotification(titulo, {
            body: cuerpo,
            icon: 'images/app/icon-192.png',
            badge: 'images/app/icon-192.png',
            tag: 'reto-diario'
          });
        }).catch(function () {
          new Notification(titulo, { body: cuerpo, icon: 'images/app/icon-192.png' });
        });
      } else {
        new Notification(titulo, { body: cuerpo, icon: 'images/app/icon-192.png' });
      }
    }
  }

  if (toggle) {
    toggle.addEventListener('change', function () {
      if (toggle.checked) {
        activarRecordatorio();
      } else {
        var a = ajustes();
        a.recordatorio = false;
        guardarJSON(CLAVE_AJUSTES, a);
        pintarEstado();
      }
    });

    horaInput.addEventListener('change', function () {
      var a = ajustes();
      a.hora = horaInput.value;
      a.avisado = ''; // si cambia la hora, el aviso de hoy vuelve a estar disponible
      guardarJSON(CLAVE_AJUSTES, a);
      pintarEstado();
    });
  }

  // Revisión al cargar, al volver a la pestaña, y cada minuto
  setInterval(revisarRecordatorio, 60000);
  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) {
      revisarRecordatorio();
      pintarAvisoRacha();
      pintarFrase();
    }
  });

  // =========================================================
  // 4 · COMPARTIR LA CURVA — una tarjeta cuadrada (1080×1080)
  // lista para redes, con la curva real del lector.
  // =========================================================
  var COLORES = {
    graphite: '#12181F', graphite2: '#1B232D', kraft: '#D9C4A0',
    ember: '#C1622D', steel: '#5C86A6', paper: '#F3EBDA'
  };

  function construirTarjeta(datos) {
    var lado = 1080;
    var c = document.createElement('canvas');
    c.width = lado; c.height = lado;
    var ctx = c.getContext('2d');

    // Fondo planta
    ctx.fillStyle = COLORES.graphite;
    ctx.fillRect(0, 0, lado, lado);

    // Línea de plano técnico superior
    ctx.fillStyle = COLORES.steel;
    ctx.fillRect(90, 96, lado - 180, 4);

    // Cabecera
    ctx.fillStyle = COLORES.kraft;
    ctx.font = '600 34px "IBM Plex Mono", monospace';
    ctx.fillText('BITÁCORA DE EJECUCIÓN', 90, 170);

    // Nombre de la meta (con corte de línea sencillo)
    ctx.fillStyle = COLORES.paper;
    ctx.font = 'italic 600 58px "Fraunces", Georgia, serif';
    var nombre = '«' + datos.meta.nombre + '»';
    var palabras = nombre.split(' ');
    var linea = '', y = 260, maxW = lado - 180;
    palabras.forEach(function (p) {
      var prueba = linea ? linea + ' ' + p : p;
      if (ctx.measureText(prueba).width > maxW) {
        ctx.fillText(linea, 90, y);
        linea = p; y += 70;
      } else { linea = prueba; }
    });
    ctx.fillText(linea, 90, y);

    // Números grandes
    var claves = Object.keys(datos.registros).sort();
    var valores = claves.map(function (k) { return datos.registros[k].r; });
    var acumulado = valores.reduce(function (s, v) { return s + v; }, 0);
    var dia = diasDesdeInicio(datos);

    ctx.fillStyle = COLORES.ember;
    ctx.font = '600 150px "IBM Plex Mono", monospace';
    ctx.fillText(acumulado.toFixed(0), 90, y + 200);

    ctx.fillStyle = COLORES.paper;
    ctx.font = '400 36px "IBM Plex Mono", monospace';
    ctx.fillText('R acumulado · día ' + dia + ' de 30 · ' + claves.length + ' turnos firmados', 90, y + 260);

    // Mini curva: barras + línea acumulada
    var gx = 90, gy = y + 330, gw = lado - 180, gh = 300;
    ctx.fillStyle = COLORES.graphite2;
    ctx.fillRect(gx, gy, gw, gh);

    if (valores.length) {
      var maxR = Math.max.apply(null, valores.concat([1]));
      var n = Math.max(valores.length, 7);
      var paso = gw / n;

      ctx.fillStyle = COLORES.steel;
      valores.forEach(function (v, i) {
        var h = (v / maxR) * (gh - 30);
        ctx.fillRect(gx + i * paso + paso * 0.2, gy + gh - h - 10, paso * 0.6, h);
      });

      var acum = [];
      valores.reduce(function (s, v) { var t = s + v; acum.push(t); return t; }, 0);
      var maxA = acum[acum.length - 1] || 1;

      ctx.strokeStyle = COLORES.ember;
      ctx.lineWidth = 6;
      ctx.beginPath();
      acum.forEach(function (v, i) {
        var px = gx + i * paso + paso * 0.5;
        var py = gy + gh - 10 - (v / maxA) * (gh - 30);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      });
      ctx.stroke();
    }

    // Pie con la marca
    ctx.fillStyle = COLORES.kraft;
    ctx.font = '600 40px "IBM Plex Mono", monospace';
    ctx.fillText('E × C × T = R', 90, lado - 90);
    ctx.fillStyle = COLORES.paper;
    ctx.globalAlpha = 0.75;
    ctx.font = '400 32px "IBM Plex Mono", monospace';
    ctx.fillText('rubentobar.com/reto', 90, lado - 44);
    ctx.globalAlpha = 1;

    return c;
  }

  function compartirCurva() {
    var datos = leerJSON(CLAVE_DATOS);
    if (!datos || !datos.meta) return;

    var tarjeta = construirTarjeta(datos);
    tarjeta.toBlob(function (blob) {
      if (!blob) return;
      var archivo = new File([blob], 'mi-curva-ectr.png', { type: 'image/png' });

      // Web Share con archivos (Android / iOS modernos)
      if (navigator.canShare && navigator.canShare({ files: [archivo] })) {
        navigator.share({
          files: [archivo],
          title: 'Mi curva de ejecución',
          text: 'Día ' + diasDesdeInicio(datos) + ' de mi reto E×C×T=R.'
        }).catch(function () { /* el lector canceló: sin drama */ });
        return;
      }

      // Respaldo: descarga directa (escritorio)
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'mi-curva-ectr.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }, 'image/png');
  }

  if ($('btn-compartir')) {
    $('btn-compartir').addEventListener('click', compartirCurva);
  }

  // =========================================================
  // 5 · INSTALACIÓN — Android (evento nativo) e iOS (guía)
  // =========================================================
  var eventoInstalar = null;
  var panelInstalar = $('instalar-panel');
  var btnInstalar = $('btn-instalar');

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    eventoInstalar = e;
    if (panelInstalar) panelInstalar.hidden = false;
    if (btnInstalar) btnInstalar.hidden = false;
  });

  if (btnInstalar) {
    btnInstalar.addEventListener('click', function () {
      if (!eventoInstalar) return;
      eventoInstalar.prompt();
      eventoInstalar.userChoice.then(function () {
        eventoInstalar = null;
        panelInstalar.hidden = true;
      });
    });
  }

  // iOS no dispara beforeinstallprompt: mostramos la guía manual
  var esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  var yaInstalada = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  if (esIOS && !yaInstalada && panelInstalar) {
    panelInstalar.hidden = false;
    $('instalar-ios').hidden = false;
  }
  if (yaInstalada && panelInstalar) panelInstalar.hidden = true;

  // =========================================================
  // Arranque del módulo
  // =========================================================
  pintarFrase();
  pintarAvisoRacha();
  pintarAjustes();
  revisarRecordatorio();
})();
