/* =========================================================
   ANALISIS.JS
   DataInsight
========================================================= */


/* =========================================================
   CONFIGURACIÓN DE INDICADORES
========================================================= */

const indicadores = {

    ID01: {

        titulo:
            "Porcentaje de estudiantes satisfechos con el currículo",

        descripcion:
            "Mide el nivel de satisfacción de los estudiantes con el currículo y plan de estudios.",

        preguntas: 7

    },


    ID02: {

        titulo:
            "Porcentaje de estudiantes satisfechos con el desempeño docente",

        descripcion:
            "Mide el nivel de satisfacción de los estudiantes con el desempeño pedagógico del cuerpo docente.",

        preguntas: 11

    },


    ID05: {

        titulo:
            "Porcentaje de estudiantes satisfechos con las actividades de asesoría y/o tutoría",

        descripcion:
            "Mide el nivel de satisfacción con las actividades de asesoría y/o tutoría para la obtención del título profesional.",

        preguntas: 5

    }

};



/* =========================================================
   DATOS DE FACULTADES
   -----------------------------------------------
   POR AHORA SON DATOS DE DEMOSTRACIÓN.
========================================================= */

const datosFacultades = {

    "Ciencias Matemáticas": {

        "Matemática": 72.40,

        "Estadística": 68.20,

        "Investigación Operativa": 64.80

    },


    "Ingeniería de Sistemas": {

        "Ingeniería de Sistemas": 78.40,

        "Ingeniería de Software": 74.10

    },


    "Educación": {

        "Educación Inicial": 81.20,

        "Educación Primaria": 76.80,

        "Educación Secundaria": 73.50

    },


    "Farmacia y Bioquímica": {

        "Farmacia y Bioquímica": 82.40

    },


    "Ciencias Contables": {

        "Contabilidad": 75.30

    }

};



/* =========================================================
   VARIABLES
========================================================= */

let distributionChart = null;

let facultyChart = null;

let schoolChart = null;

let fechaChart = null;



/* =========================================================
   ELEMENTOS HTML
========================================================= */

const indicadorSelect =
    document.getElementById("indicadorSelect");

const facultadSelect =
    document.getElementById("facultadSelect");

const escuelaSelect =
    document.getElementById("escuelaSelect");



/* =========================================================
   INICIALIZACIÓN
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        cargarFacultades();

        cargarAnalisis();

    }
);

function crearGraficoFecha() {

    const encuestas =
        obtenerRespuestas();

    const fechas = {};

    encuestas.forEach(encuesta => {

        if (!encuesta.fecha) {
            return;
        }

        const fecha =
            new Date(encuesta.fecha);

        const fechaFormateada =
            fecha.toLocaleDateString(
                "es-PE",
                {
                    day: "2-digit",
                    month: "short"
                }
            );

        fechas[fechaFormateada] =
            (fechas[fechaFormateada] || 0) + 1;

    });

    const labels =
        Object.keys(fechas);

    const valores =
        labels.map(
            fecha => fechas[fecha]
        );

    const ctx =
        document.getElementById(
            "fechaChart"
        );

    if (!ctx) {
        return;
    }

    if (fechaChart) {
        fechaChart.destroy();
    }

    fechaChart =
        new Chart(
            ctx,
            {

                type: "line",

                data: {

                    labels: labels,

                    datasets: [{

                        label:
                            "Respuestas",

                        data:
                            valores,

                        fill:
                            true,

                        tension:
                            0.4,

                        pointRadius:
                            5,

                        pointHoverRadius:
                            7,

                        backgroundColor:
                            "rgba(66, 183, 245, 0.25)",

                        borderColor:
                            "#42b7f5",

                        pointBackgroundColor:
                            "#68e86b",

                        pointBorderColor:
                            "#68e86b",

                        borderWidth:
                            3

                    }]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    animation: {

                        duration: 900,

                        easing:
                            "easeOutQuart"

                    },

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {

                            callbacks: {

                                label:
                                    context =>
                                        `${context.raw} respuestas`

                            }

                        }

                    },

                    scales: {

                        y: {

                            beginAtZero: true,

                            ticks: {
                                precision: 0
                            }

                        },

                        x: {

                            grid: {
                                display: false
                            }

                        }

                    }

                }

            }
        );
}

/* =========================================================
   CARGAR FACULTADES
========================================================= */

function cargarFacultades() {

    facultadSelect.innerHTML = `
        <option value="todas">
            Todas las facultades
        </option>
    `;


    Object.keys(datosFacultades)
        .forEach(facultad => {

            const option =
                document.createElement("option");

            option.value = facultad;

            option.textContent = facultad;

            facultadSelect.appendChild(option);

        });


    cargarEscuelas();

}



/* =========================================================
   CARGAR ESCUELAS
========================================================= */

function cargarEscuelas() {

    escuelaSelect.innerHTML = `
        <option value="todas">
            Todas las escuelas
        </option>
    `;


    const facultad =
        facultadSelect.value;


    if (facultad === "todas") {

        Object.values(datosFacultades)
            .forEach(escuelas => {

                Object.keys(escuelas)
                    .forEach(escuela => {

                        agregarEscuela(
                            escuela
                        );

                    });

            });

    } else {

        const escuelas =
            datosFacultades[facultad];


        Object.keys(escuelas)
            .forEach(escuela => {

                agregarEscuela(
                    escuela
                );

            });

    }

}



/* =========================================================
   AGREGAR ESCUELA SIN DUPLICADOS
========================================================= */

function agregarEscuela(nombre) {

    const existe =
        [...escuelaSelect.options]
            .some(option =>
                option.value === nombre
            );


    if (existe) {
        return;
    }


    const option =
        document.createElement("option");

    option.value = nombre;

    option.textContent = nombre;

    escuelaSelect.appendChild(option);

}



/* =========================================================
   EVENTOS
========================================================= */

indicadorSelect.addEventListener(
    "change",
    cargarAnalisis
);


facultadSelect.addEventListener(
    "change",
    () => {

        cargarEscuelas();

        cargarAnalisis();

    }
);


escuelaSelect.addEventListener(
    "change",
    cargarAnalisis
);



/* =========================================================
   CARGAR ANÁLISIS COMPLETO
========================================================= */

function cargarAnalisis() {

    const indicador =
        indicadorSelect.value;

    actualizarInformacionIndicador(indicador);

    const respuestas =
        obtenerRespuestas();

    const resultado =
        calcularIndicador(
            respuestas,
            indicador
        );

    mostrarResultado(resultado);

    crearGraficoDistribucion(
        respuestas,
        indicador
    );

    crearGraficoFecha();

    crearGraficoFacultades(
        indicador
    );

    crearGraficoEscuelas(
        indicador
    );

    mostrarPreguntas(
        respuestas,
        indicador
    );
}

/* =========================================================
   OBTENER RESPUESTAS DESDE LOCALSTORAGE
========================================================= */

function obtenerRespuestas() {

    const almacen =
        localStorage.getItem(
            "encuestasEstudiantes"
        );

    if (!almacen) {
        return [];
    }

    try {

        const datos =
            JSON.parse(almacen);

        return Array.isArray(datos)
            ? datos
            : [];

    } catch (error) {

        console.error(
            "Error leyendo encuestas:",
            error
        );

        return [];

    }

}

/* =========================================================
   CALCULAR INDICADOR
========================================================= */

function calcularIndicador(
    encuestas,
    indicador
) {

    const totalPreguntas =
        indicadores[indicador].preguntas;

    let denominador = 0;
    let numerador = 0;

    /* -----------------------------------------------------
       RECORRER CADA ENCUESTA
    ----------------------------------------------------- */

    encuestas.forEach(encuesta => {

        const respuestas =
            encuesta.respuestas || {};

        let respuestasPersona = [];
        let encuestaValida = true;

        /* ---------------------------------------------
           OBTENER TODAS LAS RESPUESTAS DEL INDICADOR
        --------------------------------------------- */

        for (
            let i = 1;
            i <= totalPreguntas;
            i++
        ) {

            const clave =
                `${indicador}_${i}`;

            const valor =
                Number(respuestas[clave]);

            /*
               0 = No aplica
               1 - 5 = escala válida
            */

            if (
                valor >= 1 &&
                valor <= 5
            ) {

                respuestasPersona.push(
                    valor
                );

            } else {

                /*
                   Si falta una respuesta o es
                   "No aplica", la persona no
                   entra al cálculo del indicador.
                */

                encuestaValida = false;

                break;
            }
        }


        /* ---------------------------------------------
           SOLO ENCUESTAS COMPLETAS
        --------------------------------------------- */

        if (!encuestaValida) {
            return;
        }


        /*
           Esta persona entra al DENOMINADOR
        */

        denominador++;


        /* ---------------------------------------------
           VERIFICAR SATISFACCIÓN
        --------------------------------------------- */

        const satisfecha =
            respuestasPersona.every(
                valor =>
                    valor === 4 ||
                    valor === 5
            );


        /*
           Si TODOS los ítems son 4 o 5,
           entra al NUMERADOR.
        */

        if (satisfecha) {
            numerador++;
        }

    });


    /* -----------------------------------------------------
       CALCULAR PORCENTAJE
    ----------------------------------------------------- */

    const porcentaje =
        denominador > 0
            ? (
                numerador /
                denominador
            ) * 100
            : 0;


    return {

        numerador,

        denominador,

        porcentaje,

        total:
            denominador

    };

}

/* =========================================================
   ACTUALIZAR INFORMACIÓN DEL INDICADOR
========================================================= */

function actualizarInformacionIndicador(
    indicador
) {

    const datos =
        indicadores[indicador];


    document.getElementById(
        "indicatorCode"
    ).textContent =
        indicador;


    document.getElementById(
        "indicatorTitle"
    ).textContent =
        datos.titulo;


    document.getElementById(
        "indicatorDescription"
    ).textContent =
        datos.descripcion;

}



/* =========================================================
   MOSTRAR RESULTADO
========================================================= */

function mostrarResultado(
    resultado
) {

    document.getElementById(
        "indicatorPercentage"
    ).textContent =
        `${resultado.porcentaje.toFixed(2)}%`;


    document.getElementById(
        "numerador"
    ).textContent =
        resultado.numerador;


    document.getElementById(
        "denominador"
    ).textContent =
        resultado.denominador;


    document.getElementById(
        "totalRespuestas"
    ).textContent =
        resultado.total;


    const status =
        document.getElementById(
            "indicatorStatus"
        );


    if (resultado.denominador === 0) {

        status.textContent =
            "Sin respuestas registradas";

    } else if (
        resultado.porcentaje >= 70
    ) {

        status.textContent =
            "Nivel satisfactorio alto";

    } else if (
        resultado.porcentaje >= 50
    ) {

        status.textContent =
            "Nivel satisfactorio medio";

    } else {

        status.textContent =
            "Nivel satisfactorio bajo";

    }

}



/* =========================================================
   GRÁFICO CIRCULAR
========================================================= */

function crearGraficoDistribucion(
    encuestas,
    indicador
) {

    const cantidad = {

        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0

    };

    const totalPreguntas =
        indicadores[indicador].preguntas;

    encuestas.forEach(encuesta => {

        if (!encuesta.respuestas) {
            return;
        }

        for (
            let i = 1;
            i <= totalPreguntas;
            i++
        ) {

            const valor =
                Number(
                    encuesta.respuestas[
                        `${indicador}_${i}`
                    ]
                );

            if (
                valor >= 1 &&
                valor <= 5
            ) {

                cantidad[valor]++;

            }

        }

    });

    const ctx =
        document.getElementById(
            "distributionChart"
        );

    if (!ctx) {
        return;
    }

    if (distributionChart) {
        distributionChart.destroy();
    }

    distributionChart =
        new Chart(
            ctx,
            {

                type: "doughnut",

                data: {

                    labels: [

                        "1 - Muy insatisfecho",
                        "2 - Insatisfecho",
                        "3 - Neutral",
                        "4 - Satisfecho",
                        "5 - Muy satisfecho"

                    ],

                    datasets: [{

                        data: [

                            cantidad[1],
                            cantidad[2],
                            cantidad[3],
                            cantidad[4],
                            cantidad[5]

                        ],

                        backgroundColor: [

                            "#d93636",
                            "#ff6570",
                            "#eef45b",
                            "#91ef7b",
                            "#21b957"

                        ],

                        borderWidth: 2,

                        borderColor:
                            "#ffffff"

                    }]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    cutout: "58%",

                    plugins: {

                        legend: {

                            position: "bottom",

                            labels: {

                                usePointStyle:
                                    true,

                                padding: 15,

                                font: {
                                    size: 11
                                }

                            }

                        }

                    }

                }

            }
        );
}

/* =========================================================
   GRÁFICO POR FACULTAD
========================================================= */

function crearGraficoFacultades(
    indicador
) {

    const facultades =
        Object.keys(
            datosFacultades
        );


    const valores =
        facultades.map(
            facultad => {

                const escuelas =
                    datosFacultades[
                        facultad
                    ];


                const resultados =
                    Object.values(
                        escuelas
                    );


                return resultados.length
                    ? resultados.reduce(
                        (a, b) =>
                            a + b,
                        0
                    ) /
                    resultados.length
                    : 0;

            }
        );



    const ctx =
        document.getElementById(
            "facultyChart"
        );


    if (facultyChart) {

        facultyChart.destroy();

    }


    facultyChart =
        new Chart(
            ctx,
            {

                type: "bar",

                data: {

                    labels: facultades,

                    datasets: [{

                        label:
                            "Satisfacción (%)",

                        data: valores,

                        backgroundColor:
                            "#6ee66c",

                        borderRadius: 5

                    }]

                },


                options: {

                    indexAxis: "y",

                    responsive: true,

                    maintainAspectRatio: false,

                    animation: {

                        duration: 900,

                        easing: "easeOutQuart"

                    },

                    scales: {

                        x: {

                            beginAtZero: true,

                            max: 100,

                            ticks: {

                                callback:
                                    value =>
                                        value + "%"

                            }

                        },

                        y: {

                            ticks: {

                                font: {

                                    size: 10

                                }

                            }

                        }

                    },

                    plugins: {

                        legend: {

                            display: false

                        }

                    }

                }

            }

        );

}



/* =========================================================
   GRÁFICO POR ESCUELA
========================================================= */

function crearGraficoEscuelas(
    indicador
) {

    const facultad =
        facultadSelect.value;


    let escuelas = {};



    if (facultad === "todas") {

        Object.values(
            datosFacultades
        )
        .forEach(
            grupo => {

                Object.assign(
                    escuelas,
                    grupo
                );

            }
        );

    } else {

        escuelas =
            datosFacultades[
                facultad
            ];

    }


    const nombres =
        Object.keys(
            escuelas
        );


    const valores =
        Object.values(
            escuelas
        );


    const ctx =
        document.getElementById(
            "schoolChart"
        );


    if (schoolChart) {

        schoolChart.destroy();

    }


    schoolChart =
        new Chart(
            ctx,
            {

                type: "bar",

                data: {

                    labels: nombres,

                    datasets: [{

                        label:
                            "Satisfacción (%)",

                        data: valores,

                        backgroundColor:
                            "#8fe875",

                        borderRadius: 5

                    }]

                },


                options: {

                    indexAxis: "y",

                    responsive: true,

                    maintainAspectRatio: false,

                    animation: {

                        duration: 900,

                        easing: "easeOutQuart"

                    },

                    scales: {

                        x: {

                            beginAtZero: true,

                            max: 100,

                            ticks: {

                                callback:
                                    value =>
                                        value + "%"

                            }

                        }

                    },

                    plugins: {

                        legend: {

                            display: false

                        }

                    }

                }

            }

        );


    document.getElementById(
        "schoolChartTitle"
    ).textContent =

        facultad === "todas"

            ? "Satisfacción por escuela profesional"

            : `Escuelas profesionales - ${facultad}`;

}



/* =========================================================
   ANÁLISIS POR PREGUNTA
========================================================= */

function mostrarPreguntas(
    respuestas,
    indicador
) {

    const container =
        document.getElementById(
            "questionsAnalysis"
        );


    container.innerHTML = "";


    const totalPreguntas =
        indicadores[indicador].preguntas;


    for (
        let i = 1;
        i <= totalPreguntas;
        i++
    ) {

        const clave =
            `${indicador}_${i}`;


        const valor =
            Number(
                respuestas[clave]
            );


        let porcentaje;


        /*
            Para visualizar el diseño
            si todavía no hay respuesta.
        */

        if (
            valor >= 1 &&
            valor <= 5
        ) {

            porcentaje =
                valor / 5 * 100;

        } else {

            porcentaje =
                60 + (i * 3);

            if (porcentaje > 95) {
                porcentaje = 95;
            }

        }


        const row =
            document.createElement(
                "div"
            );


        row.className =
            "question-row";


        row.innerHTML = `

            <div class="question-top">

                <span class="question-text">

                    Pregunta ${i}

                </span>

                <span class="question-value">

                    ${porcentaje.toFixed(1)}%

                </span>

            </div>

            <div class="progress">

                <div
                    class="progress-bar"
                    style="width: ${porcentaje}%">
                </div>

            </div>

        `;


        container.appendChild(
            row
        );

    }

}