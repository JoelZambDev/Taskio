// ==========================================
// TASKIO - LOGICA PRINCIPAL (main.js)
// ==========================================

// 1. REFERENCIAS AL DOM (Alineadas con index_2.html)
const titulo = document.getElementById("inputTitulo");
const nota = document.getElementById("inputDescripcion");
const fecha = document.getElementById("inputFecha");
const agregar = document.getElementById("btnAddTask");
const lista = document.getElementById("contenedorTareas");
const contenedorFiltros = document.querySelector(".filtros-estado");
const selectMes = document.getElementById("selectMes");
const listaDias = document.getElementById("listaDias");
const btnPrevDia = document.getElementById("btnPrevDia");
const btnNextDia = document.getElementById("btnNextDia");
const btnNotif = document.getElementById("btnNotif");
const badgeNotif = document.getElementById("badgeNotif");
const panelNotif = document.getElementById("panelNotif");
const listaNotif = document.getElementById("listaNotif");

// 2. ESTADO GLOBAL
let tareas = JSON.parse(localStorage.getItem("mis_tareas")) || [];
let filtroActual = "all"; // 'all', 'pending', 'completed'
let fechaFiltroSeleccionada = null; // Para filtrar por día clickeado
let fechaActual = new Date(); // Fecha base del calendario

// Guardar tareas en localStorage
function guardarEnStorage() {
  localStorage.setItem("mis_tareas", JSON.stringify(tareas));
}

// 3. REGISTRAR NUEVA TAREA
agregar.addEventListener("click", (e) => {
  e.preventDefault();
  const tituloTarea = titulo.value.trim();
  const notaTarea = nota.value.trim();
  const fechaTarea = fecha.value.trim();

  if (tituloTarea === "") return;

  const nuevaTarea = {
    id: Date.now(),
    titulo: tituloTarea,
    nota: notaTarea,
    fecha: fechaTarea || new Date().toISOString().split("T")[0],
    completada: false,
  };

  tareas.push(nuevaTarea);

  titulo.value = "";
  nota.value = "";
  fecha.value = "";

  guardarEnStorage();
  mostrarTareas();
  generarCalendario();
});

// 4. DESPLEGABLE DE MESES
function cargarOpcionesMeses() {
  selectMes.innerHTML = "";

  const año = fechaActual.getFullYear();
  const nombreMeses = [
    "Enero",
    "Febrero",
    "Marzo",
    "Abril",
    "Mayo",
    "Junio",
    "Julio",
    "Agosto",
    "Septiembre",
    "Octubre",
    "Noviembre",
    "Diciembre",
  ];

  nombreMeses.forEach((mes, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `${mes.toUpperCase()} ${año}`;

    if (index === fechaActual.getMonth()) {
      option.selected = true;
    }
    selectMes.appendChild(option);
  });
}

//Funcion para comprobar que tareas estan vacias o por vencer (proximos 2 dias)

// 1. RENDERIZADO Y EVALUACIÓN DE ALERTAS
function actualizarNotificacionesUI() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const tareasPendientes = tareas.filter((t) => !t.completada && t.fecha);
  const alertas = [];

  tareasPendientes.forEach((tarea) => {
    const partes = tarea.fecha.split("-");
    const fechaTarea = new Date(partes[0], partes[1] - 1, partes[2]);

    const diferenciaMs = fechaTarea - hoy;
    const diferenciaDias = Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));

    if (diferenciaDias <= 2) {
      alertas.push({
        ...tarea,
        diasRestantes: diferenciaDias,
      });

      // Se envía el correo solo una vez por tarea
      if (!tarea.correoEnviado) {
        tarea.correoEnviado = true;
        guardarEnStorage();
        enviarCorreoAlerta(tarea.titulo, tarea.nota, tarea.fecha);
      }
    }
  });

  // Punto neón: Encendido solo si hay alertas sin leer (leida !== true)
  const tieneNoLeidas = alertas.some((a) => !a.leida);
  if (tieneNoLeidas) {
    badgeNotif.classList.remove("hidden");
  } else {
    badgeNotif.classList.add("hidden");
  }

  // Dibujar panel flotante
  if (alertas.length === 0) {
    listaNotif.innerHTML = `<p style="font-size: 0.75rem; color: var(--texto-secundario); text-align: center; margin: 8px 0;">Sin tareas próximas a vencer.</p>`;
  } else {
    listaNotif.innerHTML = alertas
      .map((item) => {
        let textoFecha = "";
        if (item.diasRestantes < 0) textoFecha = "¡Vencida!";
        else if (item.diasRestantes === 0) textoFecha = "Vence hoy";
        else if (item.diasRestantes === 1) textoFecha = "Vence mañana";
        else textoFecha = `Vence en ${item.diasRestantes} días`;

        const claseLeida = item.leida ? "leida" : "";

        return `
          <div class="item-notif ${item.diasRestantes < 0 ? "vencida" : ""} ${claseLeida}" data-id="${item.id}" style="cursor: pointer;">
            <span class="notif-titulo">${item.titulo}</span>
            <span class="notif-fecha">${textoFecha} (${item.fecha})</span>
          </div>
        `;
      })
      .join("");
  }
}

// 2. TOGGLE PARA ABRIR Y CERRAR EL PANEL
btnNotif.addEventListener("click", (e) => {
  e.stopPropagation(); // Evita que el clic suba al document
  panelNotif.classList.toggle("hidden");
});

// 3. MARCAR COMO LEÍDA AL HACER CLIC EN UN ITEM
listaNotif.addEventListener("click", (e) => {
  const itemClickeado = e.target.closest(".item-notif");
  if (!itemClickeado) return;

  const idTarea = Number(itemClickeado.dataset.id);
  const tareaEncontrada = tareas.find((t) => t.id === idTarea);

  if (tareaEncontrada) {
    tareaEncontrada.leida = true; // Solo cambia el estado de lectura
    guardarEnStorage();
    actualizarNotificacionesUI();
  }
});

// 4. CIERRE INTELIGENTE AL HACER CLIC FUERA
document.addEventListener("click", (e) => {
  if (!panelNotif.contains(e.target) && !e.target.closest("#btnNotif")) {
    panelNotif.classList.add("hidden");
  }
});

// 5. RENDERIZAR CALENDARIO DINÁMICO
function generarCalendario() {
  const año = fechaActual.getFullYear();
  const mes = fechaActual.getMonth();
  const hoy = new Date();

  const totalDiasMes = new Date(año, mes + 1, 0).getDate();
  let htmlDias = "";

  for (let i = 1; i <= totalDiasMes; i++) {
    const fechaDia = new Date(año, mes, i);

    const nombreDia = fechaDia
      .toLocaleDateString("es-ES", { weekday: "short" })
      .toUpperCase()
      .replace(".", "");
    const numeroDia = String(i).padStart(2, "0");
    const fechaFormateada = `${año}-${String(mes + 1).padStart(2, "0")}-${numeroDia}`;

    const esHoy = fechaDia.toDateString() === hoy.toDateString();
    const esSeleccionado = fechaFiltroSeleccionada === fechaFormateada;
    const claseActiva =
      esSeleccionado || (!fechaFiltroSeleccionada && esHoy) ? "active" : "";

    const tienePendientes = tareas.some(
      (tarea) => tarea.fecha === fechaFormateada && !tarea.completada,
    );

    htmlDias += `
      <div class="card-dia ${claseActiva}" data-fecha="${fechaFormateada}">
        <span class="nombre-dia">${nombreDia}</span>
        <span class="numero-dia">${numeroDia}</span>
        ${tienePendientes ? '<span class="dot-pendiente"></span>' : ""}
      </div>
    `;
  }

  listaDias.innerHTML = htmlDias;

  // Esperamos 50ms a que el navegador termine de pintar el HTML antes de medir
  setTimeout(() => {
    centrarDiaActivo();
  }, 50);
}

// Funcion para que el dia aparezca de primero

function centrarDiaActivo() {
  const cardActiva = listaDias.querySelector(".card-dia.active");

  if (!cardActiva) return;
  // calculamos la posicion de la tarjeta activa dentro del contenedor

  const posicionTarjeta = cardActiva.offsetLeft;
  const anchoContenedor = listaDias.clientWidth;
  const anchoTarjeta = cardActiva.clientWidth;

  //calculamos el scroll para que quede alineada al inicio o centrada

  const scrollTarget = posicionTarjeta - anchoContenedor / 2 + anchoTarjeta / 2;

  listaDias.scrollTo({
    left: Math.max(0, scrollTarget),
    behavior: "smooth",
  });
}

// 6. RENDERIZAR LISTA DE TAREAS (ESTILOS NEÓN APLICADOS)
function mostrarTareas() {
  lista.innerHTML = "";

  let tareasFiltradas = [...tareas];

  // Filtro por fecha del calendario
  if (fechaFiltroSeleccionada) {
    tareasFiltradas = tareasFiltradas.filter(
      (tarea) => tarea.fecha === fechaFiltroSeleccionada,
    );
  }

  // Filtro por botones de estado
  if (filtroActual === "pending") {
    tareasFiltradas = tareasFiltradas.filter((tarea) => !tarea.completada);
  } else if (filtroActual === "completed") {
    tareasFiltradas = tareasFiltradas.filter((tarea) => tarea.completada);
  }

  if (tareasFiltradas.length === 0) {
    lista.innerHTML = `<p style="color: var(--texto-secundario); font-size: 0.85rem; text-align: center; margin-top: 20px;">No hay tareas para mostrar.</p>`;
    return;
  }

  tareasFiltradas.forEach((tarea) => {
    lista.innerHTML += `
      <div class="card-tarea" style="${tarea.completada ? "opacity: 0.5;" : ""}">
        <div class="header-card-tarea">
          <h3 class="titulo-tarea" style="${tarea.completada ? "text-decoration: line-through;" : ""}">${tarea.titulo}</h3>
          <span class="fecha-tarea">${tarea.fecha}</span>
        </div>
        ${tarea.nota ? `<p class="desc-tarea">${tarea.nota}</p>` : ""}
        <div class="footer-card-tarea">
          <button data-id="${tarea.id}" class="btn-accion-tarea btn-completar">
            ${tarea.completada ? "DESMARCAR" : "COMPLETAR"}
          </button>
          <button data-id="${tarea.id}" class="btn-accion-tarea btn-eliminar">ELIMINAR</button>
        </div>
      </div>
    `;
  });
}

// 7. LISTENERS DE INTERACCIÓN

// Acciones en tarjetas (Completar / Eliminar)
lista.addEventListener("click", (e) => {
  if (e.target.classList.contains("btn-eliminar")) {
    const idTarea = Number(e.target.dataset.id);
    tareas = tareas.filter((tarea) => tarea.id !== idTarea);
    guardarEnStorage();
    mostrarTareas();
    generarCalendario();
  }

  if (e.target.classList.contains("btn-completar")) {
    const idTarea = Number(e.target.dataset.id);
    const tareaEncontrada = tareas.find((tarea) => tarea.id === idTarea);

    if (tareaEncontrada) {
      tareaEncontrada.completada = !tareaEncontrada.completada;
      guardarEnStorage();
      mostrarTareas();
      generarCalendario();
    }
  }
});

// Filtros ALL / PENDING / COMPLETED
contenedorFiltros.addEventListener("click", (e) => {
  if (e.target.classList.contains("btn-filtro")) {
    document
      .querySelectorAll(".btn-filtro")
      .forEach((btn) => btn.classList.remove("active"));
    e.target.classList.add("active");

    filtroActual = e.target.dataset.filtro;
    mostrarTareas();
  }
});

// Navegación con Flechas
btnPrevDia.addEventListener("click", () => {
  listaDias.scrollBy({ left: -250, behavior: "smooth" });
});

btnNextDia.addEventListener("click", () => {
  listaDias.scrollBy({ left: 250, behavior: "smooth" }); // Corregido a valor positivo
});

// Cambiar Mes
selectMes.addEventListener("change", (e) => {
  fechaActual.setMonth(parseInt(e.target.value));
  generarCalendario();
});

// Seleccionar tarjeta de día
listaDias.addEventListener("click", (e) => {
  const tarjetaClick = e.target.closest(".card-dia");
  if (!tarjetaClick) return;

  const fechaClick = tarjetaClick.dataset.fecha;

  if (fechaFiltroSeleccionada === fechaClick) {
    fechaFiltroSeleccionada = null; // Desmarca si vuelve a hacer clic en el mismo
  } else {
    fechaFiltroSeleccionada = fechaClick;
  }

  generarCalendario();
  mostrarTareas();
});

// INICIALIZACIÓN
cargarOpcionesMeses();
generarCalendario();
mostrarTareas();
actualizarNotificacionesUI();

// Retorno automatico por inactividad

let temporizadorInactividad;

function reiniciarTemporizadorInactividad() {
  // cancelamos el temporizador anterior si existia alguno en marcha

  clearTimeout(temporizadorInactividad);

  //iniciamos una cuenta regresiva de 20s
  temporizadorInactividad = setTimeout(() => {
    // verificamos si el usuario tiene activado un filtro de fecha diferente al dia de hoy
    if (fechaFiltroSeleccionada !== null) {
      console.log("inactividad detectada: volviendo al dia de hoy jeje");

      // limpiamos la fecha seleccionada para volver a la fecha actual por defecto
      fechaFiltroSeleccionada = null;

      // Volvemos a pintar el calendario y la lista de tareas
      generarCalendario();
      mostrarTareas();
    }
  }, 20000);
}

//escuchar cualquier evento del usuario
const eventosInteraccion = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
];

eventosInteraccion.forEach((evento) => {
  window.addEventListener(evento, reiniciarTemporizadorInactividad);
});

reiniciarTemporizadorInactividad();

// ==========================================
// MÓDULO DE ENVÍO DE CORREOS (EMAILJS)
// ==========================================

function enviarCorreoAlerta(tituloTarea, notaTarea, fechaTarea) {
  const parametros = {
    to_email: "zambranojoeldavid@gmail.com",
    titulo_tarea: tituloTarea,
    nota_tarea: notaTarea || "Sin descripción adicional.",
    fecha_tarea: fechaTarea || "Sin fecha asignada",
    url_app: window.location.href,
  };

  // Pasamos los 4 parámetros: Service ID, Template ID, Parámetros y la PUBLIC KEY de forma explícita
  emailjs
    .send(
      "service_l2ymc2r",
      "template_2mqn99u",
      parametros,
      "68fXVMYgdL00VVsey", // <-- Añadir tu Public Key aquí directamente
    )
    .then((respuesta) => {
      console.log(
        "¡Correo enviado con éxito a Gmail!",
        respuesta.status,
        respuesta.text,
      );
    })
    .catch((error) => {
      console.error("Error al enviar el correo con EmailJS:", error);
    });
}
