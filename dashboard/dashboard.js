/* ================================
   RENDER SECTIONS
   ================================ */

// Messages
const renderMainSection = async (moodleData) => {

    const dataContent = document.getElementById('moodle-data');
    dataContent.innerHTML = "";

    if (!moodleData.classRoom) {
        dataContent.innerHTML = "Aún no hay datos guardados";
        return;
    }

    // Verificamos si hay mensajes guardados
    let messages = false;

    for(const classroom of Object.values(moodleData["classRoom"])){
        for(const forum of Object.values(classroom.forums)){
            if(forum.newMessages > 0) messages = true;
        }
    }

    if(!messages){
        dataContent.innerHTML ="<div class='img-main'><img src='../assets/img/blank_space.png' /></div>" 
    }


    // Contenedor principal
    const mainContainer = document.createElement("div");
    mainContainer.id = "main-container";
    mainContainer.classList.add("main-container")

    for (const [classroomId, classRoom] of Object.entries(moodleData.classRoom)) {
        if (!classRoom.forums) continue;

        // Creamos el contenedor del aula
        const divClassRoom = document.createElement("div");
        divClassRoom.classList.add("classroom-container")

        // Nombre del aula
        const titleSection = document.createElement("div");
        titleSection.classList.add("classroom-header");
        titleSection.innerHTML = `
<h2>
    <span class="title-classroom">${classRoom.name || "Sin Nonbre"}</span>
</h2>
`;
        divClassRoom.appendChild(titleSection);

        // Recorremos las aulas
        for (const [forumId, forum] of Object.entries(classRoom.forums || {})) {
            const threadDiv = document.createElement("div");
            threadDiv.classList.add("forum-container");
            threadDiv.innerHTML = `<h3 class="forum-title">
                <span>
                    <i class="nf nf-fa-comments"></i>
                    ${forum.name}
                </span>
                <span class="badge bg-silent"
                    data-classroom="${classroomId}" 
                    data-forum="${forumId}"> 
                    <i class="nf nf-fa-bell_slash"></i>
                </span>

            </h3>`;

            for (const [discussionId, thread] of Object.entries(forum.discussions || {})){
                // Details
                const threadDetail = document.createElement("details");
                threadDetail.classList.add("thread-container");

                // Summary
                threadDetail.innerHTML = `
<summary class="summary-posts">
    <span>
        <span>${thread.name}</span>
        <span class="badge bg-new-message">${thread.newMessages || -1}</span>
    </span>
    <span class="forum-actions">
        <span class="badge fc-delete" 
            id="btn-delete"
            data-classroom="${classroomId}" 
            data-forum="${forumId}" 
            data-discussion="${discussionId}">
            <i class="nf nf-fa-trash"></i
        </span>
        <span 
            id="btn-fav"
            class="badge fc-favorite"
            data-classroom="${classroomId}" 
            data-forum="${forumId}" 
            data-discussion="${discussionId}">
            <i class="nf nf-fa-star"></i>
        </span>
    </span>
</summary>
<div class="post-principal">
    <div class="post-head">
        <span class="author">${thread.post?.author || 'Desconocido'}</span>
        <span class="separator"> • </span>
        <span class="time">${thread.post?.time || 'Sin hora' }</span>
        <span class="separator"> • </span>
        <span class="post-link"><a href="${thread?.post?.link}" target="_blank"> Responder <i class="nf nf-fa-external_link"></i></a></span>

    </div>
    <div class="post-body">${thread.post?.contentHTML || ''}</div>
</div>
`;

                if (thread?.replies && thread?.replies?.length > 0) {
                    const repliesContainer = document.createElement("div");
                    repliesContainer.classList.add("replies-container")

                    for (const reply of thread.replies) {

                        const replyDiv = document.createElement("div");
                        replyDiv.classList.add("reply-content");

                        replyDiv.innerHTML = `
<div class="post-container">
    <div class="post-head ${reply?.isUnread ? 'is-unread' : ''}">
        <span class="author">${reply.author}</span> 
        <span class="separator"> • </span>
        <span class="time">${reply?.time || 'Sin hora'}</span>
        <span class="separator"> • </span>
        <span class="post-link"><a href="${reply?.link}" target="_blank"> Responder <i class="nf nf-fa-external_link"></i></a></span>
    </div>
    <div class="post-body">
        ${reply.contentHTML}
    </div>
</div>
`;
                        repliesContainer.appendChild(replyDiv);
                    }
                    threadDetail.appendChild(repliesContainer);
                }

                threadDiv.appendChild(threadDetail);
            }

            divClassRoom.appendChild(threadDiv);
            mainContainer.appendChild(divClassRoom);
        }
    }

    dataContent.appendChild(mainContainer);
}

// ClassRooms
const renderClassRoomSection = async (moodleData) => {
    const sectionDiv = document.getElementById("classRooms-Data"); 

    if (!moodleData.classRoom) {
        sectionDiv.innerHTML = "<p>No hay datos guardados.</p>";
        return;
    }

    for(const [classroomId, classroom] of Object.entries(moodleData.classRoom)){
        const classroomdiv = document.createElement("div");

        classroomdiv.innerHTML = `
<div class="silent-classroom-item">
    <span>${classroom?.name}</span>
    <span class="badge fc-delete" 
        data-classroom="${classroomId}" 
        <i class="nf nf-fa-trash"></i>
    </span>
</div>
`
        sectionDiv.append(classroomdiv);
    }

}

// Silent ClassRooms
const renderSilentClassRoomSection = async (moodleData) => {

}


/* ========================================
   FORMS 
   ======================================== */

// Add classrooms 
document.getElementById('form-classroom').addEventListener('submit', async e => {
    e.preventDefault();

    let alertMessage = {
        element: "alert-classroom",
        error: false,
        message: ""
    };

    // Datos formulario
    const formData = new FormData(e.target);
    const {config : currentConfig} = await chrome.storage.local.get(["config"]) || {};

    const domainOptional = formData.get('domain');
    const name = formData.get('name');
    const code = formData.get('code');
    const section = formData.get('section');

    // Verificamos que se haya completado y sea un número válido
    if (!code || isNaN(parseInt(code))) {
        alertMessage.error = true;
        alertMessage.message = "El código no fue completado o no tiene el estilo correcto: solo números"; 
    } 

    // Verificamos si el código existe evitando crash si classRoom es undefined
    const classrooms = currentConfig.classRoom || {};
    if (Object.values(classrooms).includes(parseInt(code))) {
        alertMessage.error = true;
        alertMessage.message = "El código del aula ya existe en su base de datos";
    }

    //TODO: Probar
    if (isInvalid(section) && isNaN(parseInt(section))) {
        alertMessage.error = true;
        alertMessage.message = "El código no fue completado o no tiene el estilo correcto: solo números"; 
    } 

    const updatedConfig = {
        ...currentConfig,
        classRoom: {
            ...(currentConfig.classRoom || {}),
            [code]: {
                domainOptional: domainOptional || currentConfig.domain || "Sin Dominio", 
                name: name || "Sin Nombre",
                section: section || 0,
                blackList: {} 
            }
        }
    };

    if (!alertMessage.error) {
        await saveSettings(updatedConfig);
        resetForm(e);
    }

    // Lanzamos alerta de éxito o error
    launchAlert(alertMessage);
});

// Settings 
document.getElementById('form_setting').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Recuperamos datos de setting de LocalStorage
    const {config: currentConfig} = await chrome.storage.local.get(["config"]) || {};

    // Onjeto de mensaje
    let alertMessage = {
        element:"alert-setting",
        error: false,
        message: ""
    };

    // Datos de formulario
    const formData = new FormData(e.target);
    const domain = formData.get('domain');
    const timeInterval = formData.get('timeInterval');

    if(isInvalid(timeInterval) && isInvalid(domain)){
        launchAlert({ ...alertMessage, error: true, message:"Debe completar al menos uno de los campos para poder actualizar la información"})
        return;
    }

    // Nuevo objeto para guardar
    const updatedConfig = {
        ...currentConfig,
        domain: domain || currentConfig.domain,
        checkInterval: parseInt(timeInterval) || currentConfig?.checkInterval || 30,
    };

    // Guardamos información en Local Storage
    await saveSettings(updatedConfig);

    // reiniciamos el formularios
    resetForm(e);

    // Refrescamos el tiempo en el HTML
    refreshIntervaleTIme(timeInterval);

    // Lanzamos alerta de éxito o error
    launchAlert({...alertMessage, error: false, message: "La información se guardó correctamente."});

});

const refreshIntervaleTIme = (newTime) => {
    const refreshTime = document.getElementById('intervaleTimeMinutes');
    refreshTime.innerText = String(newTime);
}

/* ============================================
   ALERT
   ============================================ */

const launchAlert = ({element, error, message}) => {
    const alert = document.getElementById(element);
    alert.classList.remove("alert-success", "alert-error");
    let messageDisplay = '';
    if(!error){
        alert.classList.add("alert-success");
        messageDisplay = `
<i class="icon-alert nf nf-cod-check"></i>
<span>${message}</span>
`

    } else {
        alert.classList.add("alert-error");
        messageDisplay = `
<i class="icon-alert nf nf-cod-error"></i>
<span>${message}</span>
`
    }

    alert.innerHTML = messageDisplay;
    alert.style.display = "block";

    setTimeout(() => {
        alert.style.display = "none";
    }, 3000);
}

/* ============================================
   NAV 
   ============================================ */

// Select sections
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(s => s.style.display = 'none');
        btn.classList.add('active');
        const target = btn.getAttribute('data-target');
        document.getElementById(target).style.display = 'block';
    });
});


/* ======================================
   CHROME API 
   ====================================== */

// INIT MAIN SECTION
chrome.storage.local.get(["moodle"], async (result) => {
    const moodleData = result.moodle || {};
    const mainSection = renderMainSection(moodleData);
    const classRooms = renderClassRoomSection(moodleData);

    Promise.all([mainSection, classRooms]);
});

// INIT SETTING SECTION
chrome.storage.local.get(["config"], result => {
    const intervaleTimeMinutes = document.getElementById('intervaleTimeMinutes');
    intervaleTimeMinutes.innerText = `${result.config.checkInterval || '5'} ${result.config.checkInterval > 1 ? ' minutos' : 'minuto'}`;
});

// RENDERIZA SI MODIFICAMOS EL LOCAL STORAGE
chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'local' && changes.moodle) {
        const { moodle: moodleData } = await chrome.storage.local.get(["moodle"]);
        await renderMainSection(moodleData);
    }
});

// MENSAJES RECIBIDOS
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.target === 'authenticate') {
        launchAlert({
            element: "alert-main",
            error: true,
            message: "Necesita iniciar sesión en Moodle", 
        });
    }

    if (message.target === 'catchError') {
        launchAlert(message.datos);
    }
})

/* ======================================
   ACTIONS BUTTONS
   ====================================== */

// Listener buttons
document.getElementById('moodle-data').addEventListener('click', async(e) => {
    const boton = e.target.closest('#btn-delete'); //TODO: especificar que es de discussion

    if (boton) {
        const dataDiscussion = boton.dataset;
        await deleteThreads(dataDiscussion)
    }
});

// Delete Disussion
const deleteThreads = async (dataDiscussion) => {
    const { moodle: moodleData } = await chrome.storage.local.get(["moodle"]);
    const { classroom, forum, discussion } = dataDiscussion;
    const classroomObj = moodleData["classRoom"]?.[classroom];
    const forumObj = classroomObj?.forums?.[forum];

    let alertMessage = {
        element: "alert-container",
        error: false,
        message: ""
    };

    if (forumObj?.discussions?.[discussion]) {
        delete forumObj.discussions[discussion];

        if (Object.keys(forumObj.discussions).length === 0) {
            delete classroomObj.forums[forum];
        }

        if (Object.keys(classroomObj.forums).length === 0) {
            delete moodleData["classRoom"][classroom];
        }

        await saveMoodle(moodleData);

        launchAlert({...alertMessage, error: false, message:"Foro borrado exitósamente"})
    }
}

// Check messages listener button
document.getElementById('check-now-btn').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ action: "check_now" });
});

/* ======================================
   LOCAL STORAGE METHODS
   ====================================== */

// Moodle
const saveMoodle = async (newMoodle) => {
    await chrome.storage.local.set({ moodle: newMoodle });
}

// Settings
const saveSettings = async (newSetting) => {
    await chrome.storage.local.set({ config: newSetting });
}

/* ======================================
   HELPERS
   ====================================== */

// Check empty object
const isEmptyObject = (obj) => {
    return Object.keys(obj).length === 0;
}

const resetForm = (e) => {
    e.target.reset();
}

const isInvalid = (value) => {
    return !value || value.toString().trim().length === 0;
};


