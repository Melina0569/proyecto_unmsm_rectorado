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

        formGroup.className =
            "form-group";


        /* LABEL */

        const label =
            document.createElement("label");

        label.setAttribute(
            "for",
            field.id
        );

        label.innerHTML =
            `${field.label} <span>*</span>`;


        /* SELECT WRAPPER */

        const selectWrapper =
            document.createElement("div");

        selectWrapper.className =
            "select-wrapper";


        /* SELECT */

        const select =
            document.createElement("select");

        select.className =
            "form-select";

        select.id =
            field.id;

        select.name =
            field.id;

        select.required = true;


        /* OPTION INICIAL */

        const defaultOption =
            document.createElement("option");

        defaultOption.value = "";

        defaultOption.textContent =
            field.placeholder;

        defaultOption.disabled = true;

        defaultOption.selected = true;

        select.appendChild(
            defaultOption
        );


        /* OPCIONES */

        field.options.forEach(option => {

            const optionElement =
                document.createElement("option");

            optionElement.value =
                option[0];

            optionElement.textContent =
                option[1];

            select.appendChild(
                optionElement
            );

        });


        /* ICONO */

        const arrow =
            document.createElement("span");

        arrow.className =
            "material-symbols-outlined select-arrow";

        arrow.textContent =
            "expand_more";


        selectWrapper.appendChild(select);

        selectWrapper.appendChild(arrow);

        formGroup.appendChild(label);

        formGroup.appendChild(selectWrapper);

        fieldsContainer.appendChild(formGroup);

    });

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
           IR A LAS PREGUNTAS
        ------------------------------------------------- */

        window.location.href =
            `preguntas.html?modulo=${moduleId}`;

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