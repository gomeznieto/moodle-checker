/* ================================
   RENDER SECTIONS
   ================================ */

// Messages
const renderMainSection = async (moodleData) => {
    launchSpinner(true);

    const configData = await getConfig();
    const dataContent = document.getElementById('moodle-data');
    dataContent.innerHTML = "";

    if (!moodleData.classRoom) {
        dataContent.innerHTML = "Aún no hay datos guardados";
        launchSpinner(false);
        return;
    }

    // No hay mensajes.
    if(Object.values(moodleData["classRoom"]).length == 0){
        dataContent.innerHTML ="<div class='img-main'><img src='../assets/img/blank_space.png' /></div>" 
    }

    // Contenedor principal
    const mainContainer = document.createElement("div");
    mainContainer.id = "main-container";
    mainContainer.classList.add("main-container")
    

    for (const [classroomId, classRoom] of Object.entries(moodleData.classRoom)) {
        const blackList = configData.classRoom[classroomId].blackList;
        if (!classRoom.forums) continue;

        // Creamos el contenedor del aula
        const divClassRoom = document.createElement("div");
        divClassRoom.classList.add("classroom-container")

        // Nombre del aula
        const titleSection = document.createElement("div");
        titleSection.classList.add("classroom-header");
        titleSection.innerHTML = `
<h2>
    <span class="title-classroom">${configData.classRoom[classroomId].name || "Sin Nonbre"}</span>
</h2>
`;
        divClassRoom.appendChild(titleSection);

        // Recorremos las aulas
        for (const [forumId, forum] of Object.entries(classRoom.forums || {})) {
            if(Object.keys(blackList).includes(forumId)){
               continue; // No guardamos los foros que se encuentran en el blackList
            }

            const threadDiv = document.createElement("div");
            threadDiv.classList.add("forum-container");
            threadDiv.innerHTML = `<h3 class="forum-title">
                <span>
                    <i class="nf nf-fa-comments"></i>
                    ${forum.name}
                </span>
                <span
                    id="btn-silent"
                    class="badge fc-silent"
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
<summary 
    id="summary-posts"
    class="summary-posts"
    data-classroom="${classroomId}" 
    data-forum="${forumId}" 
    data-discussion="${discussionId}"
>
    <span>
        <span>${thread.name}</span>
        <span class="${ thread.newMessages <= 0 ? 'hide' : 'badge bg-new-message'}">${thread.newMessages > 0 ? thread.newMessages : ''}</span>
        <i class="read-message nf nf-md-arrow_down_right"></i>
    </span>
    <span class="forum-actions">
        <span 
            id="btn-read"
            class="badge fc-read"
            data-classroom="${classroomId}" 
            data-forum="${forumId}" 
            data-discussion="${discussionId}">
            <i class="nf nf-md-comment_eye_outline"></i>
        </span>
        <span class="badge fc-delete" 
            id="btn-delete"
            data-classroom="${classroomId}" 
            data-forum="${forumId}" 
            data-discussion="${discussionId}"
        >
            <i class="nf nf-fa-trash"></i>
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
    launchSpinner(false);

}

// ClassRooms
const renderClassRoomSection = async (configData) => {

    if (Object.values(configData?.classRoom).length == 0) {
        sectionDiv.innerHTML = "<p>No hay aulas guardas.</p>";
        return;
    }

    const sectionDiv = document.getElementById("classRooms-Data"); 
    sectionDiv.innerHTML = '';

    for(const [classroomId, classroom] of Object.entries(configData?.classRoom)){
        const classroomdiv = document.createElement("div");

        classroomdiv.innerHTML = `
<div class="classroom-item">
    <span>
        <span 
            class="badge fc-circle" 
        >
            <i class="nf nf-fa-circle"></i>
        </span>

        <span>${classroom?.name}</span>
    </span>
    <span>
        <span 
            class="badge fc-pen" 
            id="btn-edit-classroom"
            data-classroom="${classroomId}" 
        >
            <i class="nf nf-fa-pen"></i>
        </span>

        <span 
            class="badge fc-delete" 
            data-classroom="${classroomId}" 
        >
            <i class="nf nf-fa-trash"></i>
        </span>
    </span>

</div>
`
        sectionDiv.append(classroomdiv);
    }

}

// Silent ClassRooms
const renderSilentClassRoomSection = async (configData) => {

    if (Object.values(configData?.classRoom).length == 0) {
        sectionDiv.innerHTML = "<p>No hay foros bloqueados.</p>";
        return;
    }

    const sectionDiv = document.getElementById("silent-classRooms-Data");
    sectionDiv.classList.add("silent-container");
    sectionDiv.innerHTML = '';

    for(const [classroomId, classroom] of Object.entries(configData.classRoom)){

        if(Object.values(configData.classRoom[classroomId].blackList).length == 0) continue;

        const silentContainerClassroom = document.createElement("div");
        silentContainerClassroom.classList.add("silent-classroom");

        const titleClassRoom = document.createElement("h3");
        titleClassRoom.innerText = classroom.name;
        titleClassRoom.classList.add("title-silent-classroom");

        silentContainerClassroom.append(titleClassRoom);

        for(const [forumId, forumName] of Object.entries(configData.classRoom[classroomId].blackList)){
            const forumdiv = document.createElement("div");
            forumdiv.classList.add("silent-forum");

            forumdiv.innerHTML = `
<div class="silent-classroom-item">
    <span>
        <span class="badge fc-circle">
            <i class="nf nf-fa-circle"></i>
        </span>
        <span>${forumName?.name}</span>
    </span>
    <span 
        id="btn-unblock"
        class="badge fc-delete" 
        data-classroom="${classroomId}" 
        data-forum="${forumId}"
    >
        <i class="nf nf-fa-eye"></i>
    </span>
</div>
`
            silentContainerClassroom.append(forumdiv);
        }

        sectionDiv.append(silentContainerClassroom);
    }

}


/* ========================================
   FORMS 
   ======================================== */

// Add classrooms 
document.getElementById('form-classroom').addEventListener('submit', async e => {
    e.preventDefault();
    const {mode} = document.getElementById('btn_classRoom').dataset;

    let alertMessage = {
        element: "alert-classroom",
        error: false,
        message: ""
    };

    // Datos formulario
    const formData = new FormData(e.target);
    const configData = await getConfig();

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
    // Verificamos el modo
    const classrooms = configData.classRoom || {};

    if (Object.values(classrooms).includes(parseInt(code))) {

        // Error al intentar gaurdar un código existente
        if(mode == 'save'){
            alertMessage.error = true;
            alertMessage.message = "El código del aula ya existe en su base de datos";
        }

        launchAlert(alertMessage);
        return;
    }

    if (isInvalid(section) && isNaN(parseInt(section))) {
        alertMessage.error = true;
        alertMessage.message = "El código no fue completado o no tiene el estilo correcto: solo números"; 
    } 

    const updatedConfig = {
        ...configData,
        classRoom: {
            ...(configData.classRoom || {}),
            [code]: {
                domainOptional: domainOptional || configData.classRoom[code].OprionalDomain || configData.domain || "Sin Dominio", 
                name: name || configData.classRoom[code].name || "Sin Nombre",
                section: section || configData.classRoom[code].section || 0,
                blackList: configData.blackList || configData.classRoom[code].blackList || {} 
            }
        }
    };

    if (!alertMessage.error) {
        await saveSettings(updatedConfig);
        resetForm(e);
    }

    // Lanzamos alerta de éxito o error
    alertMessage.message = `El aula se ${mode == 'save' ? 'guardó' :  'editó'} correctamente`;
    launchAlert(alertMessage);

});

// Settings 
document.getElementById('form_setting').addEventListener('submit', async (e) => {
    e.preventDefault();

    // Recuperamos datos de setting de LocalStorage
    const configData = await getConfig();

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
        ...configData,
        domain: domain || configData.domain,
        checkInterval: parseInt(timeInterval) || configData?.checkInterval || 30,
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
        messageDisplay = `<div class="message-container">
<i class="icon-alert nf nf-cod-check"></i>
<span>${message}</span>
</div>
`

    } else {
        alert.classList.add("alert-error");
        messageDisplay = `
<div class="message-container">
<i class="icon-alert nf nf-cod-error"></i>
<span>${message}</span>
</div>
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

    Promise.all([mainSection]);
});

// INIT SETTING SECTION
chrome.storage.local.get(["config"], async result => {
    const intervaleTimeMinutes = document.getElementById('intervaleTimeMinutes');
    const configData = result.config || {};

    intervaleTimeMinutes.innerText = `${configData.checkInterval || '5'} ${result.config.checkInterval > 1 ? ' minutos' : 'minuto'}`;
    const silenClassroom =  renderSilentClassRoomSection(configData);
    const classRooms = renderClassRoomSection(configData);

    Promise.all([silenClassroom, classRooms]);
});

// RENDERIZA SI MODIFICAMOS EL LOCAL STORAGE
chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'local' && changes.moodle) {
        const moodleData = await getMoodle();

        await renderMainSection(moodleData);
    } else if (namespace === 'local' && changes.config) {
        const  configData = await getConfig();

        await renderClassRoomSection(configData);
        await renderSilentClassRoomSection(configData);
    }
});

// MENSAJES RECIBIDOS
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    const  configData = await getConfig();

    if (message.target === 'authenticate') {
        launchAlert({
            element: "alert-main",
            error: true,
            message: `<p>Necesita iniciar sesión en <a href="${configData.domain}/login" class="link" target="_blank">Moodle<a/></p>`
        });
    }

    if (message.target === 'catchError') {
        launchAlert(message.datos);
    }
})

/* ======================================
   ACTIONS BUTTONS
   ====================================== */

// Botones Sección Mensajes
document.getElementById('moodle-data').addEventListener('click', async(e) => {
    const btnDelete = e.target.closest('#btn-delete'); //TODO: especificar que es de discussion
    const btnUpdate = e.target.closest('#btn-update'); 
    const unreaMessage = e.target.closest('#btn-read');
    const silentDiscussion = e.target.closest('#btn-silent');

    if (btnDelete) {
        const dataDiscussion = btnDelete.dataset;
        await deleteThreads(dataDiscussion)
    } else if (btnUpdate){
        const dataClassroom = btnUpdate.dataset;
        await updateClassroom(dataClassroom);
    } else if(unreaMessage){
        const dataSummaryPost = unreaMessage.dataset;
        e.preventDefault()
        cleanMessages(dataSummaryPost);
    } else if(silentDiscussion){
        silentForum(silentDiscussion.dataset);
    } 
});

// Botones Sección Lista de Aulas
document.getElementById('classRooms-Data').addEventListener('click', async e => {

    const btnEditClassroom = e.target.closest('#btn-edit-classroom');

    if(btnEditClassroom){
        const dataClassroom = btnEditClassroom.dataset;
        await editClassRoom(dataClassroom);
    }

})

//
document.getElementById('silent-classRooms-Data').addEventListener('click', async e => {

    const btnunblockClassroom = e.target.closest('#btn-unblock');

    if(btnunblockClassroom){
        const dataUnblock = btnunblockClassroom.dataset;
        await unblockForum(dataUnblock);
    }
})

// Unblock Forum
const unblockForum = async dataUnblock => {
    const {classroom, forum} = dataUnblock;

    const configData = await getConfig();
    const moodleData = await getMoodle();

    if (configData?.classRoom?.[classroom]?.blackList) {

        delete configData.classRoom[classroom].blackList[forum];

        await saveSettings(configData);
        await renderMainSection(moodleData);
    }

}

// Edit ClassRoom
const editClassRoom = async (dataClassroom) => {
    // Traemos los datos del aula
    const configData = await getConfig();

    // Classroom Id
    const {classroom} = dataClassroom;

    const classroomName = configData.classRoom[classroom].name;
    const classroomCode = classroom;
    const classroomSection = configData.classRoom[classroom].section;
    const classroomDomain = configData.classRoom[classroom].domainOptional;

    document.getElementById('classRoomName').value = classroomName;
    document.getElementById('classRoomCode').value = classroomCode;
    document.getElementById('classRoomCode').readOnly = true;
    document.getElementById('classRoomSection').value = classroomSection;
    document.getElementById('classRoomDomain').value = classroomDomain;

    // Mostramos el formulario
    document.getElementById('view-addClassRooms').style.display = 'block';

    // Cerramos el listado de aulas:
    document.getElementById('view-classRooms').style.display = 'none';

    // cambiamos el mode en Formlario de agregado a Edit
    document.getElementById('btn_classRoom').dataset.mode = 'edit';
}

// Delete Disussion
const deleteThreads = async (dataDiscussion) => {
    const moodleData = await getMoodle();

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

// Messages readed
const cleanMessages = async (dataSummaryPost) => {
    const moodleData = await getMoodle();
    const { classroom, forum, discussion } = dataSummaryPost;
    const classroomObj = moodleData["classRoom"]?.[classroom];
    const discussionObj = classroomObj?.forums?.[forum]?.discussions[discussion];

    if(discussionObj.newMessages == 0)
        return;

    discussionObj.newMessages = 0;
    saveMoodle(moodleData);
}

// Bloquear foros
const silentForum = async (dataForum) => {
    const configData = await getConfig();
    const moodleData = await getMoodle();

    const { classroom, forum } = dataForum;
    const forumName = moodleData["classRoom"]?.[classroom]?.forums[forum]?.name;

    configData.classRoom[classroom].blackList = {
        ...configData.classRoom[classroom].blackList,
        [forum]:{
            name:forumName 
        }
    }

    // borrar los mensajes que estén guardados con este code
    delete moodleData["classRoom"]?.[classroom]?.forums[forum];

    saveSettings(configData);
    saveMoodle(moodleData);
    await renderMainSection(moodleData);
}

// Check messages listener button
document.getElementById('check-now-btn').addEventListener('click', async () => {
    launchSpinner(true)
    await chrome.runtime.sendMessage({ action: "check_now" });
    launchSpinner(false)
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

const getMoodle = async () => {
    const  {moodle: moodleData} = await chrome.storage.local.get("moodle") || {};
    return moodleData;
}

const getConfig = async () => {
    const  {config: configData} = await chrome.storage.local.get("config") || {};
    return configData;
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

const launchSpinner = (turn) => {
    const container = document.getElementById('loader');
    turn ? container.style.display = 'block' : container.style.display = 'none';
}
