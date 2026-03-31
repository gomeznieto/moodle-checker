// SECTION MENSAJES
const renderMainSection = async (moodleData) => {

    const dataContent = document.getElementById('moodle-data');
    dataContent.innerHTML = "";

    if (!moodleData.classRoom) {
        dataContent.innerHTML = "<p>No hay datos guardados.</p>";
        return;
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
            threadDiv.innerHTML = `<h3>
                <i class="nf nf-fa-comments"></i>
                <span>${forum.name}</span>
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
                    ${thread.name}
                    <span class="badge bg-new-message">${thread.newMessages || -1}</span>
                    <span class="badge fc-delete" 
                        data-classroom="${classroomId}" 
                        data-forum="${forumId}" 
                        data-discussion="${discussionId}">
                    <i class="nf nf-fa-trash"></i>
                    </span>
                    <span class="badge fc-favorite"
                        data-classroom="${classroomId}" 
                        data-forum="${forumId}" 
                        data-discussion="${discussionId}">
                    <i class="nf nf-fa-star"></i>
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

const renderSilentClassRoomSection = async (moodleData) => {

}


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

// FORMULARIO ADD CLASES
document.getElementById('form-classroom').addEventListener('submit', async e => {
    e.preventDefault();

    let error = {
        error: false,
        message: ""
    };

    const formData = new FormData(e.target);
    const {config} = await chrome.storage.local.get(["config"]);
    const currentConfig = config || {};

    const domainOptional = formData.get('domain');
    const name = formData.get('name');
    const code = formData.get('code');

    // Verificamos que se haya completado y sea un número válido
    if (!code || isNaN(parseInt(code))) {
        error.error = true;
        error.message = "El código no fue completado o no tiene el estilo correcto: solo números"; 
    } 

    // Verificamos si el código existe evitando crash si classRoom es undefined
    const classrooms = currentConfig.classRoom || {};
    if (Object.values(classrooms).includes(parseInt(code))) {
        error.error = true;
        error.message = "El código ya existe";
    }

    const section = formData.get('section');

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

    if (!error.error) {
        await chrome.storage.local.set({ config: updatedConfig });
        e.target.reset();
    }

    // Lanzamos alerta de éxito o error
    launchAlert(error);
});

// FORMULARIO SETTINGS
document.getElementById('form_setting').addEventListener('submit', async (e) => {
    e.preventDefault();

    let error = {
        error: false,
        message: ""
    };

    const formData = new FormData(e.target);

    const {config} = await chrome.storage.local.get(["config"]);
    const currentConfig = config || {};

    // Datos de formulario
    const domain = formData.get('domain');
    const timeInterval = formData.get('timeInterval');

    // Nuevo objeto para guardar
    const updatedConfig = {
        ...currentConfig,
        domain: domain || currentConfig.domain,
        checkInterval: parseInt(timeInterval) || currentConfig.checkInterval,
    };

    await chrome.storage.local.set({ config: updatedConfig });

    e.target.reset();

    // Refrescamos el tiempo en el HTML
    const refreshTime = document.getElementById('intervaleTimeMinutes');
    refreshTime.innerText = String(timeInterval);

    // Lanzamos alerta de éxito o error
    launchAlert(error);

});

// ALERT
const launchAlert = (error) => {
    const alert = document.getElementById("alert");
    alert.style.opacity = "1";
    setTimeout(() => {
        if(!error.error){
            alert.style.color = "#a6e3a1";
            alert.innerText = "Guardado Correctamente";
        } else {
            alert.style.color = "#f38ba8";
            alert.innerText = error.message;
        }
        alert.style.opacity = "2";
    }, 3000);
}

// TABS
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(s => s.style.display = 'none');
        btn.classList.add('active');
        const target = btn.getAttribute('data-target');
        document.getElementById(target).style.display = 'block';
    });
});

// OBJETOI VACIO
const isEmpty = (obj) => {
    return Object.keys(obj).length === 0;
}


// CHECK NOW
document.getElementById('check-now-btn').addEventListener('click', async () => {
    await chrome.runtime.sendMessage({ action: "check_now" });
    // const result = await chrome.runtime.sendMessage({ action: "check_now" });
    // console.log(result.status)
    // if(result && result.status === "terminado"){
    //     const result = await chrome.storage.local.get(["moodle"]);
    //     const moodleData = result.moodle || {};
    //     await renderMainSection(moodleData);
    // }
});

// RENDERIZA SI MODIFICAMOS EL LOCAL STORAGE
chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'local' && changes.moodle) {
        const { moodle: moodleData } = await chrome.storage.local.get(["moodle"]);
        await renderMainSection(moodleData);
    }
});

document.getElementById('moodle-data').addEventListener('click', async(e) => {
    const boton = e.target.closest('.btn_delete');

    if (boton) {
        e.preventDefault(); 
        const dataDiscussion = boton.dataset;
        await deleteThreads(dataDiscussion)
    }
});

// DELETE THREADS
const deleteThreads = async (dataDiscussion) => {
    const { moodle: moodleData } = await chrome.storage.local.get(["moodle"]);
    const { classroom, forum, discussion } = dataDiscussion;
    const classroomObj = moodleData["classRoom"]?.[classroom];
    const forumObj = classroomObj?.forums?.[forum];

    if (forumObj?.discussions?.[discussion]) {
        delete forumObj.discussions[discussion];

        if (Object.keys(forumObj.discussions).length === 0) {
            delete classroomObj.forums[forum];
        }

        if (Object.keys(classroomObj.forums).length === 0) {
            delete moodleData["classRoom"][classroom];
        }

        await chrome.storage.local.set({ moodle: moodleData });
    }
}


