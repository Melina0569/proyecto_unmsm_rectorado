/* =========================================================
   CONFIGURACIÓN DE LOS MÓDULOS
========================================================= */

const modules = {

    /* =====================================================
       ESTUDIANTES
    ====================================================== */

    estudiantes: {

        name: "Módulo Estudiantes",

        title: "Perfil del Estudiante",

        description:
            "Complete la siguiente información académica para adecuar el cuestionario a su perfil estudiantil.",

        icon: "school",

        color: "#003c90",

        darkColor: "#002d6d",

        lightColor: "rgba(0, 60, 144, 0.10)",

        shadowColor: "rgba(0, 60, 144, 0.20)",

        fields: [

            {
                id: "facultad",
                label: "Facultad",
                placeholder: "Seleccione su facultad",

                options: [

                    ["matematicas", "Facultad de Ciencias Matemáticas"],
                    ["fisi", "Facultad de Ingeniería de Sistemas e Informática"],
                    ["economia", "Facultad de Ciencias Económicas"],
                    ["administracion", "Facultad de Ciencias Administrativas"],
                    ["derecho", "Facultad de Derecho y Ciencia Política"],
                    ["sociales", "Facultad de Ciencias Sociales"]

                ]

            },

            {
                id: "escuela",
                label: "Escuela Profesional",
                placeholder: "Seleccione su escuela profesional",

                options: [

                    ["io", "Investigación Operativa"],
                    ["estadistica", "Estadística"],
                    ["matematica", "Matemática"],
                    ["computacion", "Ciencia de la Computación"],
                    ["ingenieria_sistemas", "Ingeniería de Sistemas"]

                ]

            },

            {
                id: "ciclo",
                label: "Ciclo Actual",
                placeholder: "Seleccione su ciclo",

                options: [

                    ["1", "I Ciclo"],
                    ["2", "II Ciclo"],
                    ["3", "III Ciclo"],
                    ["4", "IV Ciclo"],
                    ["5", "V Ciclo"],
                    ["6", "VI Ciclo"],
                    ["7", "VII Ciclo"],
                    ["8", "VIII Ciclo"],
                    ["9", "IX Ciclo"],
                    ["10", "X Ciclo"]

                ]

            },

            {
                id: "planEstudios",
                label: "Año del Plan de Estudios",
                placeholder: "Ingrese el año de su plan de estudios",
                type: "number"
            }

        ]

    },


    /* =====================================================
       EGRESADOS
    ====================================================== */

    egresados: {

        name: "Módulo Egresados",

        title: "Perfil del Egresado",

        description:
            "Complete la información correspondiente a su formación académica para adecuar el cuestionario.",

        icon: "workspace_premium",

        color: "#006970",

        darkColor: "#00545a",

        lightColor: "rgba(0, 105, 112, 0.10)",

        shadowColor: "rgba(0, 105, 112, 0.20)",

        fields: [

            {
                id: "facultad",
                label: "Facultad",
                placeholder: "Seleccione su facultad",

                options: [

                    ["matematicas", "Facultad de Ciencias Matemáticas"],
                    ["fisi", "Facultad de Ingeniería de Sistemas e Informática"],
                    ["economia", "Facultad de Ciencias Económicas"],
                    ["administracion", "Facultad de Ciencias Administrativas"]

                ]

            },

            {
                id: "escuela",
                label: "Escuela Profesional",
                placeholder: "Seleccione su escuela profesional",

                options: [

                    ["io", "Investigación Operativa"],
                    ["estadistica", "Estadística"],
                    ["matematica", "Matemática"],
                    ["computacion", "Ciencia de la Computación"],
                    ["ingenieria_sistemas", "Ingeniería de Sistemas"]

                ]

            }

        ]

    },


    /* =====================================================
       DOCENTES
    ====================================================== */

    docentes: {

        name: "Módulo Docentes",

        title: "Perfil Docente",

        description:
            "Complete la información relacionada con su formación, grado académico y especialización profesional.",

        icon: "groups",

        color: "#7d14d5",

        darkColor: "#5f00a6",

        lightColor: "rgba(125, 20, 213, 0.10)",

        shadowColor: "rgba(125, 20, 213, 0.20)",

        fields: [

            {
                id: "carrera",
                label: "Carrera / Profesión",
                placeholder: "Seleccione su carrera",

                options: [

                    ["matematica", "Matemática"],
                    ["estadistica", "Estadística"],
                    ["investigacion_operativa", "Investigación Operativa"],
                    ["ingenieria", "Ingeniería"],
                    ["economia", "Economía"],
                    ["administracion", "Administración"],
                    ["otro", "Otra"]

                ]

            },

            {
                id: "grado",
                label: "Grado de Estudios",
                placeholder: "Seleccione su grado",

                options: [

                    ["bachiller", "Bachiller"],
                    ["licenciatura", "Licenciatura"],
                    ["maestria", "Maestría"],
                    ["doctorado", "Doctorado"],
                    ["postdoctorado", "Postdoctorado"]

                ]

            },

            {
                id: "especializacion",
                label: "Especialización",
                placeholder: "Seleccione su especialización",

                options: [

                    ["gestion", "Gestión y Administración"],
                    ["investigacion", "Investigación"],
                    ["docencia", "Docencia Universitaria"],
                    ["tecnologia", "Tecnología"],
                    ["ciencias", "Ciencias"],
                    ["otra", "Otra"]

                ]

            }

        ]

    },


    /* =====================================================
       ADMINISTRATIVOS
    ====================================================== */

    administrativos: {

        name: "Módulo Administrativos",

        title: "Perfil del Personal Administrativo",

        description:
            "Complete la información relacionada con su formación profesional y oficina de labores.",

        icon: "badge",

        color: "#003c90",

        darkColor: "#002d6d",

        lightColor: "rgba(0, 60, 144, 0.10)",

        shadowColor: "rgba(0, 60, 144, 0.20)",

        fields: [

            {
                id: "carrera",
                label: "Carrera / Profesión",
                placeholder: "Seleccione su carrera",

                options: [

                    ["administracion", "Administración"],
                    ["contabilidad", "Contabilidad"],
                    ["economia", "Economía"],
                    ["ingenieria", "Ingeniería"],
                    ["derecho", "Derecho"],
                    ["informatica", "Informática"],
                    ["otra", "Otra"]

                ]

            },

            {
                id: "grado",
                label: "Grado de Estudios",
                placeholder: "Seleccione su grado",

                options: [

                    ["secundaria", "Educación Secundaria"],
                    ["tecnico", "Técnico"],
                    ["bachiller", "Bachiller"],
                    ["licenciado", "Licenciatura"],
                    ["maestria", "Maestría"],
                    ["doctorado", "Doctorado"]

                ]

            },

            {
                id: "oficina",
                label: "Oficina de Labores",
                placeholder: "Seleccione su oficina",

                options: [

                    ["administracion", "Oficina de Administración"],
                    ["recursos_humanos", "Recursos Humanos"],
                    ["tesoreria", "Tesorería"],
                    ["contabilidad", "Contabilidad"],
                    ["secretaria", "Secretaría"],
                    ["informatica", "Oficina de Informática"],
                    ["otra", "Otra"]

                ]

            }

        ]

    },


    /* =====================================================
       AUTORIDADES
    ====================================================== */

    autoridades: {

        name: "Módulo Autoridades",

        title: "Perfil y Trayectoria",

        description:
            "Complete la siguiente información inicial para adecuar el cuestionario a su perfil profesional.",

        icon: "gavel",

        color: "#006970",

        darkColor: "#00545a",

        lightColor: "rgba(0, 105, 112, 0.10)",

        shadowColor: "rgba(0, 105, 112, 0.20)",

        fields: [

            {
                id: "carrera",
                label: "Profesión / Carrera",
                placeholder: "Seleccione su profesión principal",

                options: [

                    ["derecho", "Derecho / Abogacía"],
                    ["economia", "Economía / Finanzas"],
                    ["administracion", "Administración Pública"],
                    ["ingenieria", "Ingeniería"],
                    ["ciencias_politicas", "Ciencias Políticas"],
                    ["otra", "Otra"]

                ]

            },

            {
                id: "grado",
                label: "Nivel de Estudios Alcanzado",
                placeholder: "Seleccione su nivel de estudios",

                options: [

                    ["licenciatura", "Licenciatura / Grado"],
                    ["especialidad", "Especialidad"],
                    ["maestria", "Maestría / Magíster"],
                    ["doctorado", "Doctorado"],
                    ["postdoctorado", "Postdoctorado"]

                ]

            },

            {
                id: "cargo",
                label: "Cargo o Posición Actual",
                placeholder: "Seleccione su cargo actual",

                options: [

                    ["rector", "Rector/a"],
                    ["vicerrector", "Vicerrector/a"],
                    ["decano", "Decano/a"],
                    ["director", "Director/a"],
                    ["jefe", "Jefe/a de Unidad"],
                    ["coordinador", "Coordinador/a"],
                    ["otro", "Otro cargo"]

                ]

            },

            {
                id: "trayectoria",
                label: "Años de Trayectoria Profesional",
                placeholder: "Seleccione sus años de trayectoria",

                options: [

                    ["1-5", "1 a 5 años"],
                    ["6-10", "6 a 10 años"],
                    ["11-15", "11 a 15 años"],
                    ["16-20", "16 a 20 años"],
                    ["21-30", "21 a 30 años"],
                    ["31+", "Más de 30 años"]

                ]

            }

        ]

    },


    /* =====================================================
       EMPLEADORES
    ====================================================== */

    empleadores: {

        name: "Módulo Empleadores",

        title: "Perfil del Empleador",

        description:
            "Complete la siguiente información profesional y empresarial para adecuar el cuestionario.",

        icon: "business_center",

        color: "#f59e0b",

        darkColor: "#d97706",

        lightColor: "rgba(245, 158, 11, 0.12)",

        shadowColor: "rgba(245, 158, 11, 0.20)",

        fields: [

            {
                id: "carrera",
                label: "Carrera / Área Profesional Relacionada",
                placeholder: "Seleccione el área",

                options: [

                    ["ingenieria", "Ingeniería"],
                    ["matematica", "Matemática"],
                    ["estadistica", "Estadística"],
                    ["investigacion_operativa", "Investigación Operativa"],
                    ["economia", "Economía"],
                    ["administracion", "Administración"],
                    ["otra", "Otra"]

                ]
            },

            {
                id: "grado",
                label: "Grado de Estudios",
                placeholder: "Seleccione el grado",

                options: [

                    ["tecnico", "Técnico"],
                    ["bachiller", "Bachiller"],
                    ["licenciatura", "Licenciatura"],
                    ["maestria", "Maestría"],
                    ["doctorado", "Doctorado"]

                ]
            },

            {
                id: "cargo",
                label: "Cargo o Posición Actual",
                placeholder: "Seleccione su cargo",

                options: [

                    ["gerente", "Gerente"],
                    ["jefe", "Jefe/a de Área"],
                    ["supervisor", "Supervisor/a"],
                    ["coordinador", "Coordinador/a"],
                    ["especialista", "Especialista"],
                    ["analista", "Analista"],
                    ["otro", "Otro"]

                ]
            },

            {
                id: "experiencia",
                label: "Años de Experiencia Profesional",
                placeholder: "Seleccione sus años de experiencia",

                options: [

                    ["1-5", "1 a 5 años"],
                    ["6-10", "6 a 10 años"],
                    ["11-15", "11 a 15 años"],
                    ["16-20", "16 a 20 años"],
                    ["21+", "Más de 20 años"]

                ]
            }

        ]

    }

};

const surveyBlocks = {

    ID01: {

        title: "Currículo y Plan de Estudios",

        target: {
            cycles: ["9", "10"]
        },

        intro:
            "A continuación, le presentamos una serie de enunciados sobre el currículo y plan de estudios de su programa. Por favor, califique cada ítem según su percepción y experiencia. Si algún punto no aplica a su caso, seleccione la opción \"No aplica\".",

        questions: [

            {
                number: 1,
                text: "Las asignaturas del plan curricular cubren los conocimientos necesarios para mi formación profesional.",

                options: [
                    ["1", "No los cubren"],
                    ["2", "Los cubren en poca medida"],
                    ["3", "Los cubren parcialmente"],
                    ["4", "Los cubren en gran medida"],
                    ["5", "Los cubren en su totalidad"],
                    ["0", "No aplica"]
                ]
            },

            {
                number: 2,
                text: "Los conocimientos adquiridos en las asignaturas de prerrequisito son suficientes para comprender los temas de las asignaturas posteriores.",

                options: [
                    ["1", "Totalmente insuficientes"],
                    ["2", "Insuficientes"],
                    ["3", "Medianamente suficientes"],
                    ["4", "Suficientes"],
                    ["5", "Totalmente suficientes"],
                    ["0", "No aplica"]
                ]
            },

            {
                number: 3,
                text: "Los contenidos de las asignaturas son pertinentes para las exigencias actuales del mercado laboral.",

                options: [
                    ["1", "Nada pertinentes"],
                    ["2", "Poco pertinentes"],
                    ["3", "Parcialmente pertinentes"],
                    ["4", "Pertinentes"],
                    ["5", "Totalmente pertinentes"],
                    ["0", "No aplica"]
                ]
            },

            {
                number: 4,
                text: "La distribución de las asignaturas planificadas por semestre en el plan de estudios es equilibrada.",

                options: [
                    ["1", "Totalmente desequilibrada"],
                    ["2", "Desequilibrada"],
                    ["3", "Medianamente equilibrada"],
                    ["4", "Equilibrada"],
                    ["5", "Totalmente equilibrada"],
                    ["0", "No aplica"]
                ]
            },

            {
                number: 5,
                text: "Los mecanismos que ofrece la facultad para expresar mi opinión sobre el plan curricular son suficientes.",

                options: [
                    ["1", "Totalmente insuficientes"],
                    ["2", "Insuficientes"],
                    ["3", "Medianamente suficientes"],
                    ["4", "Suficientes"],
                    ["5", "Totalmente suficientes"],
                    ["0", "No aplica"]
                ]
            },

            {
                number: 6,
                text: "La formación recibida con mi plan curricular me brinda las herramientas necesarias para ejercer el pensamiento crítico.",

                options: [
                    ["1", "Totalmente insuficientes"],
                    ["2", "Insuficientes"],
                    ["3", "Medianamente suficientes"],
                    ["4", "Suficientes"],
                    ["5", "Totalmente suficientes"],
                    ["0", "No aplica"]
                ]
            },

            {
                number: 7,
                text: "La formación recibida con mi plan curricular me brinda las herramientas necesarias para asumir mi responsabilidad social.",

                options: [
                    ["1", "Totalmente insuficientes"],
                    ["2", "Insuficientes"],
                    ["3", "Medianamente suficientes"],
                    ["4", "Suficientes"],
                    ["5", "Totalmente suficientes"],
                    ["0", "No aplica"]
                ]
            },

            {
                number: 8,
                text: "¿Qué aspectos se deberían mejorar con respecto al plan curricular?",

                type: "textarea"
            }

        ]

    },

    ID02: {

        title: "Desempeño Docente",

        intro:
            "A continuación, se le presentan diversos aspectos del desempeño pedagógico del cuerpo docente durante el presente semestre. Considerando su experiencia general con el conjunto de docentes que le dictaron clases este semestre, por favor califique cada enunciado seleccionando la alternativa que mejor describa su experiencia.",

        questions: [

            {
                number: 1,

                text:
                    "Los docentes demuestran dominio teórico de los contenidos de sus asignaturas.",

                options: [
                    ["1", "Ningún dominio"],
                    ["2", "Dominio bajo"],
                    ["3", "Dominio medio"],
                    ["4", "Dominio alto"],
                    ["5", "Dominio total"]
                ]
            },

            {
                number: 2,

                text:
                    "Los docentes están actualizados en sus conocimientos.",

                options: [
                    ["1", "Nada actualizados"],
                    ["2", "Poco actualizados"],
                    ["3", "Medianamente actualizados"],
                    ["4", "Actualizados"],
                    ["5", "Totalmente actualizados"]
                ]
            },

            {
                number: 3,

                text:
                    "Los docentes son capaces de transmitir y explicar adecuadamente sus conocimientos.",

                options: [
                    ["1", "Nada adecuada"],
                    ["2", "Poco adecuada"],
                    ["3", "Medianamente adecuada"],
                    ["4", "Adecuada"],
                    ["5", "Totalmente adecuada"]
                ]
            },

            {
                number: 4,

                text:
                    "Los docentes vinculan sus experiencias profesionales con la asignatura.",

                options: [
                    ["1", "Nunca"],
                    ["2", "Raramente"],
                    ["3", "Algunas veces"],
                    ["4", "Frecuentemente"],
                    ["5", "Siempre"]
                ]
            },

            {
                number: 5,

                text:
                    "El material (en clase o aula virtual) entregado por los docentes es útil para el desarrollo de la asignatura.",

                options: [
                    ["1", "Nada útil"],
                    ["2", "Poco útil"],
                    ["3", "Medianamente útil"],
                    ["4", "Útil"],
                    ["5", "Totalmente útil"]
                ]
            },

            {
                number: 6,

                text:
                    "Los docentes presentan con claridad las competencias de la asignatura al inicio del semestre.",

                options: [
                    ["1", "Nada claras"],
                    ["2", "Poco claras"],
                    ["3", "Medianamente claras"],
                    ["4", "Claras"],
                    ["5", "Totalmente claras"]
                ]
            },

            {
                number: 7,

                text:
                    "Los docentes fomentan mi participación en las clases.",

                options: [
                    ["1", "Nunca"],
                    ["2", "Raramente"],
                    ["3", "Algunas veces"],
                    ["4", "Frecuentemente"],
                    ["5", "Siempre"]
                ]
            },

            {
                number: 8,

                text:
                    "Los docentes respetan y cumplen los horarios establecidos para el inicio y fin de las clases.",

                options: [
                    ["1", "Nunca"],
                    ["2", "Raramente"],
                    ["3", "Algunas veces"],
                    ["4", "Frecuentemente"],
                    ["5", "Siempre"]
                ]
            },

            {
                number: 9,

                text:
                    "Los docentes están disponibles para orientarme dentro del horario de atención establecido.",

                options: [
                    ["1", "Nunca"],
                    ["2", "Raramente"],
                    ["3", "Algunas veces"],
                    ["4", "Frecuentemente"],
                    ["5", "Siempre"]
                ]
            },

            {
                number: 10,

                text:
                    "Los docentes orientan adecuadamente a los estudiantes en los trabajos, proyectos e investigaciones.",

                options: [
                    ["1", "Nada adecuada"],
                    ["2", "Poco adecuada"],
                    ["3", "Medianamente adecuada"],
                    ["4", "Adecuada"],
                    ["5", "Totalmente adecuada"]
                ]
            },

            {
                number: 11,

                text:
                    "Existen suficientes mecanismos para que yo, como estudiante, pueda manifestar mi opinión sobre el desempeño docente.",

                options: [
                    ["1", "Totalmente insuficientes"],
                    ["2", "Insuficientes"],
                    ["3", "Medianamente suficientes"],
                    ["4", "Suficientes"],
                    ["5", "Totalmente suficientes"]
                ]
            },

            {
                number: 12,

                text:
                    "¿Qué aspectos se deberían mejorar con respecto al desempeño docente?",

                type: "textarea"
            }

        ]

    },

    ID05: {

        title: "Actividades de Asesoría y/o Tutoría",

        target: {
            cycles: ["9", "10"]
        },

        intro:
            "A continuación, le presentamos una serie de enunciados sobre las actividades de asesoría y/o tutoría para la obtención del título profesional. Por favor, califique cada ítem según su percepción y experiencia. Si algún punto no aplica a su caso, seleccione la opción \"No aplica\".",

        questions: [

            {
                number: 1,

                text:
                    "El asesor (docente de la asignatura) y/o tutor tiene dominio del tema o área de conocimiento sobre mi trabajo de investigación o tesis.",

                options: [
                    ["1", "Ningún dominio"],
                    ["2", "Dominio bajo"],
                    ["3", "Dominio medio"],
                    ["4", "Dominio alto"],
                    ["5", "Dominio total"],
                    ["0", "No aplica"]
                ]
            },


            {
                number: 2,

                text:
                    "Las correcciones, observaciones y sugerencias realizadas por mi asesor/tutor son claras.",

                options: [
                    ["1", "Nada claras"],
                    ["2", "Poco claras"],
                    ["3", "Medianamente claras"],
                    ["4", "Claras"],
                    ["5", "Totalmente claras"],
                    ["0", "No aplica"]
                ]
            },


            {
                number: 3,

                text:
                    "Las actividades de asesoría y/o tutoría son útiles para el desarrollo de mi trabajo de investigación o tesis.",

                options: [
                    ["1", "Nada útiles"],
                    ["2", "Poco útiles"],
                    ["3", "Medianamente útiles"],
                    ["4", "Útiles"],
                    ["5", "Totalmente útiles"],
                    ["0", "No aplica"]
                ]
            },


            {
                number: 4,

                text:
                    "La orientación técnica y metodológica brindada por el asesor y/o tutor para estructurar y desarrollar mi trabajo de investigación o tesis es adecuada.",

                options: [
                    ["1", "Nada adecuada"],
                    ["2", "Poco adecuada"],
                    ["3", "Medianamente adecuada"],
                    ["4", "Adecuada"],
                    ["5", "Totalmente adecuada"],
                    ["0", "No aplica"]
                ]
            },


            {
                number: 5,

                text:
                    "La frecuencia de las reuniones de asesoría/tutoría es suficiente para el avance de mi trabajo de investigación o tesis.",

                options: [
                    ["1", "Totalmente insuficiente"],
                    ["2", "Insuficiente"],
                    ["3", "Medianamente suficiente"],
                    ["4", "Suficiente"],
                    ["5", "Totalmente suficiente"],
                    ["0", "No aplica"]
                ]
            },


            {
                number: 6,

                text:
                    "¿Qué aspectos se deberían mejorar con respecto a las actividades de asesoría y/o tutoría para la obtención del título profesional?",

                type: "textarea"
            }

        ]

    }



};


/* =========================================================
   OBTENER MÓDULO DESDE LA URL
========================================================= */

const params = new URLSearchParams(
    window.location.search
);

const moduleId = params.get("modulo") || "estudiantes";

const currentModule =
    modules[moduleId] || modules.estudiantes;

    
/* =========================================================
   DETERMINAR BLOQUES DE ENCUESTA
========================================================= */

const perfil =
    JSON.parse(localStorage.getItem("encuestaPerfil"));

const ciclo = perfil?.ciclo;

let bloques = [];

if (ciclo === "9" || ciclo === "10") {

    bloques.push("ID01");
    bloques.push("ID05");

} else {

    bloques.push("ID02");

}

/* =========================================================
   ELEMENTOS DEL DOM
========================================================= */

const moduleName =
    document.getElementById("moduleName");

const moduleIcon =
    document.getElementById("moduleIcon");

const surveyTitle =
    document.getElementById("surveyTitle");

const surveyDescription =
    document.getElementById("surveyDescription");

const fieldsContainer =
    document.getElementById("fieldsContainer");

const profileForm =
    document.getElementById("profileForm");

const cancelButton =
    document.getElementById("cancelButton");

const questionsContainer =
    document.getElementById("questionsContainer");


/* =========================================================
   APLICAR INFORMACIÓN DEL MÓDULO
========================================================= */

function configureModule() {

    moduleName.textContent =
        currentModule.name;

    moduleIcon.textContent =
        currentModule.icon;

    surveyTitle.textContent =
        currentModule.title;

    surveyDescription.textContent =
        currentModule.description;


    /* -----------------------------------------------------
       Colores dinámicos
    ----------------------------------------------------- */

    document.documentElement.style.setProperty(
        "--module-color",
        currentModule.color
    );

    document.documentElement.style.setProperty(
        "--module-color-dark",
        currentModule.darkColor
    );

    document.documentElement.style.setProperty(
        "--module-color-light",
        currentModule.lightColor
    );

    document.documentElement.style.setProperty(
        "--module-shadow",
        currentModule.shadowColor
    );


    /* -----------------------------------------------------
       Título del navegador
    ----------------------------------------------------- */

    document.title =
        `${currentModule.name} - Encuesta`;


    /* -----------------------------------------------------
       Generar campos
    ----------------------------------------------------- */

    renderFields();

}


/* =========================================================
   GENERAR CAMPOS
========================================================= */

function renderFields() {

    fieldsContainer.innerHTML = "";

    currentModule.fields.forEach(field => {

        const formGroup =
            document.createElement("div");

        formGroup.className = "form-group";


        /* LABEL */

        const label =
            document.createElement("label");

        label.setAttribute("for", field.id);

        label.innerHTML =
            `${field.label} <span>*</span>`;


        /* CONTENEDOR */

        const inputWrapper =
            document.createElement("div");

        inputWrapper.className =
            "select-wrapper";


        /* =========================================
           CAMPO NUMÉRICO
        ========================================= */

        if (field.type === "number") {

            const input =
                document.createElement("input");

            input.type = "number";

            input.className = "form-select";

            input.id = field.id;

            input.name = field.id;

            input.placeholder =
                field.placeholder;

            input.required = true;

            input.min = "2000";

            input.max = "2100";

            inputWrapper.appendChild(input);

        }


        /* =========================================
           SELECT
        ========================================= */

        else {

            const select =
                document.createElement("select");

            select.className = "form-select";

            select.id = field.id;

            select.name = field.id;

            select.required = true;


            /* OPCIÓN INICIAL */

            const defaultOption =
                document.createElement("option");

            defaultOption.value = "";

            defaultOption.textContent =
                field.placeholder;

            defaultOption.disabled = true;

            defaultOption.selected = true;

            select.appendChild(defaultOption);


            /* OPCIONES */

            field.options.forEach(option => {

                const optionElement =
                    document.createElement("option");

                optionElement.value =
                    option[0];

                optionElement.textContent =
                    option[1];

                select.appendChild(optionElement);

            });


            /* AGREGAR SELECT */

            inputWrapper.appendChild(select);


            /* FLECHA */

            const arrow =
                document.createElement("span");

            arrow.className =
                "material-symbols-outlined select-arrow";

            arrow.textContent =
                "expand_more";

            inputWrapper.appendChild(arrow);
        }

        /* =========================================
           AGREGAR AL FORMULARIO
        ========================================= */

        formGroup.appendChild(label);

        formGroup.appendChild(inputWrapper);

        fieldsContainer.appendChild(formGroup);

    });

}

let bloquesActuales = [];
let bloqueActual = 0;
let preguntaActual = 0;
let respuestasEncuesta = {};

/* =========================================================
   MOSTRAR ENCUESTA
========================================================= */

function mostrarEncuesta() {

    const perfil =
        JSON.parse(
            localStorage.getItem("encuestaPerfil")
        );

    const ciclo =
        perfil?.ciclo;


    /* =========================================
       DETERMINAR BLOQUES
    ========================================= */

    bloquesActuales = [];

    if (
        ciclo === "9" ||
        ciclo === "10"
    ) {

        bloquesActuales.push("ID01");
        bloquesActuales.push("ID05");

    } else {

        bloquesActuales.push("ID02");

    }


    /* =========================================
       INICIAR ENCUESTA
    ========================================= */

    bloqueActual = 0;

    preguntaActual = 0;

    respuestasEncuesta = {};


    /* =========================================
       CAMBIAR VISTA
    ========================================= */

    profileForm.style.display =
        "none";

    questionsContainer.style.display =
        "block";


    surveyTitle.textContent =
        "Encuesta";

    surveyDescription.textContent =
        "Responda las siguientes preguntas según su experiencia y percepción.";


    mostrarPreguntaActual();

}

function mostrarPreguntaActual() {

    const blockId =
        bloquesActuales[bloqueActual];

    const block =
        surveyBlocks[blockId];

    if (!block) return;


    const question =
        block.questions[preguntaActual];


    if (!question) {

        siguienteBloque();

        return;

    }


    /* =========================================
       CONTENEDOR
    ========================================= */

    questionsContainer.innerHTML = "";


    /* =========================================
       PROGRESO
    ========================================= */

    const totalPreguntas =
        block.questions.length;

    const numeroPregunta =
        preguntaActual + 1;


    const progressContainer =
        document.createElement("div");

    progressContainer.className =
        "survey-progress";


    const progressInfo =
        document.createElement("div");

    progressInfo.className =
        "progress-info";


    progressInfo.innerHTML = `
        <span>
            Pregunta ${numeroPregunta} de ${totalPreguntas}
        </span>

        <span>
            ${Math.round(
                (numeroPregunta / totalPreguntas) * 100
            )}%
        </span>
    `;


    const progressBar =
        document.createElement("div");

    progressBar.className =
        "progress-bar";


    const progressFill =
        document.createElement("div");

    progressFill.className =
        "progress-fill";


    progressFill.style.width =
        `${(numeroPregunta / totalPreguntas) * 100}%`;


    progressBar.appendChild(
        progressFill
    );

    progressContainer.appendChild(
        progressInfo
    );

    progressContainer.appendChild(
        progressBar
    );


    questionsContainer.appendChild(
        progressContainer
    );


    /* =========================================
       TÍTULO DEL BLOQUE
    ========================================= */

    const blockTitle =
        document.createElement("div");

    blockTitle.className =
        "current-block-title";

    blockTitle.textContent =
        block.title;


    questionsContainer.appendChild(
        blockTitle
    );


    /* =========================================
       TARJETA DE PREGUNTA
    ========================================= */

    const questionCard =
        document.createElement("div");

    questionCard.className =
        "question-slide";


    const questionNumber =
        document.createElement("div");

    questionNumber.className =
        "question-number";

    questionNumber.textContent =
        `Pregunta ${numeroPregunta}`;


    const questionText =
        document.createElement("h2");

    questionText.className =
        "question-slide-text";

    questionText.textContent =
        question.text;


    questionCard.appendChild(
        questionNumber
    );

    questionCard.appendChild(
        questionText
    );


    /* =========================================
       OPCIONES
    ========================================= */

    if (
        question.type === "textarea"
    ) {

        const textarea =
            document.createElement("textarea");

        textarea.className =
            "survey-textarea";

        textarea.name =
            `${blockId}_${question.number}`;

        textarea.placeholder =
            "Escriba su respuesta aquí...";

        textarea.rows = 6;


        /* Recuperar respuesta */

        if (
            respuestasEncuesta[
                `${blockId}_${question.number}`
            ]
        ) {

            textarea.value =
                respuestasEncuesta[
                    `${blockId}_${question.number}`
                ];

        }


        questionCard.appendChild(
            textarea
        );

    }

    else {

        const options =
            document.createElement("div");

        options.className =
            "slide-options";


        question.options.forEach(
            option => {

                const label =
                    document.createElement("label");

                label.className =
                    "slide-option";


                const radio =
                    document.createElement("input");

                radio.type =
                    "radio";

                radio.name =
                    `${blockId}_${question.number}`;

                radio.value =
                    option[0];


                /* Recuperar respuesta */

                if (
                    respuestasEncuesta[
                        `${blockId}_${question.number}`
                    ] === option[0]
                ) {

                    radio.checked =
                        true;

                }


                const text =
                    document.createElement("span");

                text.textContent =
                    option[1];


                label.appendChild(
                    radio
                );

                label.appendChild(
                    text
                );


                options.appendChild(
                    label
                );

            }
        );


        questionCard.appendChild(
            options
        );

    }


    questionsContainer.appendChild(
        questionCard
    );


    /* =========================================
       NAVEGACIÓN
    ========================================= */

    const navigation =
        document.createElement("div");

    navigation.className =
        "question-navigation";


    /* ANTERIOR */

    const previousButton =
        document.createElement("button");

    previousButton.type =
        "button";

    previousButton.className =
        "btn btn-secondary";

    previousButton.innerHTML = `
        <span class="material-symbols-outlined">
            arrow_back
        </span>

        <span>Anterior</span>
    `;


    previousButton.addEventListener(
        "click",
        preguntaAnterior
    );


    /*
       Deshabilitar si estamos
       en la primera pregunta
    */

    if (
        bloqueActual === 0 &&
        preguntaActual === 0
    ) {

        previousButton.disabled =
            true;

    }


    navigation.appendChild(
        previousButton
    );


    /* =========================================
       SIGUIENTE / FINALIZAR
    ========================================= */

    const nextButton =
        document.createElement("button");

    nextButton.type =
        "button";

    nextButton.className =
        "btn btn-primary";


    const ultimaPregunta =
        preguntaActual ===
        block.questions.length - 1;


    const ultimoBloque =
        bloqueActual ===
        bloquesActuales.length - 1;


    if (
        ultimaPregunta &&
        ultimoBloque
    ) {

        nextButton.innerHTML = `
            <span>Finalizar encuesta</span>

            <span class="material-symbols-outlined">
                check
            </span>
        `;

        nextButton.addEventListener(
            "click",
            finalizarEncuesta
        );

    }

    else {

        nextButton.innerHTML = `
            <span>Siguiente</span>

            <span class="material-symbols-outlined">
                arrow_forward
            </span>
        `;

        nextButton.addEventListener(
            "click",
            siguientePregunta
        );

    }


    navigation.appendChild(
        nextButton
    );


    questionsContainer.appendChild(
        navigation
    );


    /* =========================================
       ANIMACIÓN
    ========================================= */

    requestAnimationFrame(
        () => {

            questionCard.classList.add(
                "question-visible"
            );

        }
    );

}

function siguientePregunta() {

    guardarRespuestaActual();


    const blockId =
        bloquesActuales[bloqueActual];

    const block =
        surveyBlocks[blockId];


    if (
        preguntaActual <
        block.questions.length - 1
    ) {

        preguntaActual++;

        mostrarPreguntaActual();

        return;

    }


    /* Terminó el bloque */

    if (
        bloqueActual <
        bloquesActuales.length - 1
    ) {

        bloqueActual++;

        preguntaActual = 0;

        mostrarPreguntaActual();

    }

}

function preguntaAnterior() {

    guardarRespuestaActual();


    if (
        preguntaActual > 0
    ) {

        preguntaActual--;

        mostrarPreguntaActual();

        return;

    }


    /* Si estamos al inicio de un bloque,
       regresar al bloque anterior */

    if (
        bloqueActual > 0
    ) {

        bloqueActual--;

        const previousBlock =
            surveyBlocks[
                bloquesActuales[bloqueActual]
            ];


        preguntaActual =
            previousBlock.questions.length - 1;


        mostrarPreguntaActual();

    }

}

function guardarRespuestaActual() {

    const blockId =
        bloquesActuales[bloqueActual];

    const block =
        surveyBlocks[blockId];

    const question =
        block.questions[preguntaActual];


    const key =
        `${blockId}_${question.number}`;


    /* Pregunta abierta */

    if (
        question.type === "textarea"
    ) {

        const textarea =
            document.querySelector(
                `textarea[name="${key}"]`
            );


        if (textarea) {

            respuestasEncuesta[key] =
                textarea.value;

        }

        return;

    }


    /* Pregunta con alternativas */

    const selected =
        document.querySelector(
            `input[name="${key}"]:checked`
        );


    if (selected) {

        respuestasEncuesta[key] =
            selected.value;

    }

}

function siguienteBloque() {

    /*
       Aquí posteriormente podemos validar
       que todas las preguntas del bloque
       estén respondidas.
    */

    bloqueActual++;

    mostrarBloqueActual();

}

function finalizarEncuesta() {

    // Guardar la última respuesta
    guardarRespuestaActual();


    // =========================================
    // OBTENER PERFIL DEL ESTUDIANTE
    // =========================================

    const perfil =
        JSON.parse(
            localStorage.getItem("encuestaPerfil")
        ) || {};


    // =========================================
    // CREAR REGISTRO DE LA ENCUESTA
    // =========================================

    const encuesta = {

        id:
            `ENC-${Date.now()}`,

        modulo:
            moduleId,

        fecha:
            new Date().toISOString(),

        perfil:
            perfil,

        bloques:
            [...bloquesActuales],

        respuestas:
            {...respuestasEncuesta}

    };


    // =========================================
    // OBTENER ENCUESTAS ANTERIORES
    // =========================================

    const encuestasGuardadas =
        JSON.parse(
            localStorage.getItem("encuestasEstudiantes")
        ) || [];


    // =========================================
    // AGREGAR LA NUEVA ENCUESTA
    // =========================================

    encuestasGuardadas.push(encuesta);


    // =========================================
    // GUARDAR TODAS LAS ENCUESTAS
    // =========================================

    localStorage.setItem(
        "encuestasEstudiantes",
        JSON.stringify(encuestasGuardadas)
    );


    // =========================================
    // TAMBIÉN CONSERVAMOS LAS RESPUESTAS
    // ACTUALES
    // =========================================

    localStorage.setItem(
        "encuestaRespuestas",
        JSON.stringify(respuestasEncuesta)
    );


    // =========================================
    // MOSTRAR RESULTADO EN CONSOLA
    // =========================================

    console.log(
        "Encuesta registrada:",
        encuesta
    );

    console.log(
        "Todas las encuestas:",
        encuestasGuardadas
    );


    // =========================================
    // MENSAJE
    // =========================================

    alert(
        "La encuesta ha sido completada correctamente."
    );

}

/* =========================================================
   GENERAR UNA PREGUNTA EN FORMATO MATRIZ
========================================================= */

function renderQuestion(
    question,
    blockId,
    tbody
) {

    const row =
        document.createElement("tr");

    row.className =
        "matrix-question-row";


    /* =====================================================
       PREGUNTA ABIERTA
    ===================================================== */

    if (question.type === "textarea") {

        const questionCell =
            document.createElement("td");

        questionCell.className =
            "matrix-question-text";

        questionCell.textContent =
            `${question.number}. ${question.text}`;


        const answerCell =
            document.createElement("td");

        answerCell.className =
            "matrix-textarea-cell";

        answerCell.colSpan = 6;


        const textarea =
            document.createElement("textarea");

        textarea.className =
            "survey-textarea";

        textarea.name =
            `${blockId}_${question.number}`;

        textarea.placeholder =
            "Escriba su respuesta aquí...";

        textarea.rows = 4;


        answerCell.appendChild(
            textarea
        );


        row.appendChild(
            questionCell
        );

        row.appendChild(
            answerCell
        );


        tbody.appendChild(
            row
        );

        return;
    }


    /* =====================================================
       TEXTO DEL ÍTEM
    ===================================================== */

    const questionCell =
        document.createElement("td");

    questionCell.className =
        "matrix-question-text";

    questionCell.textContent =
        `${question.number}. ${question.text}`;

    row.appendChild(
        questionCell
    );


    /* =====================================================
       OPCIONES PROPIAS DE ESTA PREGUNTA
    ===================================================== */

    question.options.forEach(
        option => {

            const cell =
                document.createElement("td");

            cell.className =
                "matrix-option";


            /* Número */

            const number =
                document.createElement("span");

            number.className =
                "matrix-option-number";

            number.textContent =
                `${option[0]}.`;


            /* Texto */

            const description =
                document.createElement("span");

            description.className =
                "matrix-option-description";

            description.textContent =
                option[1];


            /* Radio */

            const radio =
                document.createElement("input");

            radio.type =
                "radio";

            radio.name =
                `${blockId}_${question.number}`;

            radio.value =
                option[0];

            radio.required =
                true;


            cell.appendChild(
                number
            );

            cell.appendChild(
                description
            );

            cell.appendChild(
                radio
            );


            row.appendChild(
                cell
            );

        }
    );


    tbody.appendChild(
        row
    );

}


/* =========================================================
   VALIDACIÓN Y CONTINUAR
========================================================= */

profileForm.addEventListener(
    "submit",
    function(event) {

        event.preventDefault();


        /* Validación HTML */

        if (!profileForm.checkValidity()) {

            profileForm.reportValidity();

            return;

        }


        /* -------------------------------------------------
        GUARDAR PERFIL
        ------------------------------------------------- */

        const formData =
            new FormData(profileForm);

        const profileData = {};

        formData.forEach(
            (value, key) => {

                profileData[key] =
                    value;

            }
        );


        /* Guardamos temporalmente */

        localStorage.setItem(
            "encuestaModulo",
            moduleId
        );

        localStorage.setItem(
            "encuestaPerfil",
            JSON.stringify(profileData)
        );


        /* -------------------------------------------------
        MOSTRAR LAS PREGUNTAS EN EL MISMO PANEL
        ------------------------------------------------- */

        mostrarEncuesta();

    }
);


/* =========================================================
   BOTÓN CANCELAR
========================================================= */

cancelButton.addEventListener(
    "click",
    function() {

        window.location.href =
            "index.html";

    }
);

/* =========================================================
   INICIALIZAR
========================================================= */

configureModule();