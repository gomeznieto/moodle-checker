/* ==================================================
    PROCESO DE RECOLECCION DE DATOS
   ================================================== */

// Ingresa al aula y traemos cada uno de los foros
const processMoodle = async (id, name, section, url) => {
    try {
        // Traemos la información del aula
        const response = await fetch(url);
        const html = await response.text();

        // Tamaño de data
        const currentLentgth = html.length;
        let {moodle : moodleData} = await chrome.storage.local.get(["moodle"]) || {}; // Traemos los datos de localStorage, si no hay lo creamos vacío
        const {config: currenConfig} = await chrome.storage.local.get(["config"]) || {};
        const lastSize = moodleData?.classRoom?.[id]?.lastSize || 0; // Si no tenemos información lo inicializamos en cero

        // Verificar Login
        if(html.includes("login-form") || html.includes("login-container") || currentLentgth == 0){
            await chrome.runtime.sendMessage({target: "authenticate"});
            return;
        }

        // Solo leemos si hay cambios en el fetch de datos
        if(currentLentgth != lastSize){
            if (!moodleData) moodleData = {};
            if (!moodleData.classRoom) moodleData.classRoom = {}; // Si no hay aulas guardadas, se crea vacío
            if (!moodleData.classRoom[id]) moodleData.classRoom[id] = { forums: {}, name: name, section: section }; // Si el aula a leer no tiene datos guardados, se crea vacío

            // Guardamos el tamaño actual de los datos
            moodleData.classRoom[id].lastSize = currentLentgth; 
            await chrome.storage.local.set({ moodle: moodleData });

            // Si hay nuevos mensajes
            if (html.includes("rounded-pill") || html.includes("unread")) {

                const forums = await parserOffscreen({target: 'offscreen_forum', data: html}) || []; // Se parsea los datos en offscreen con métodos DOM

                // Recorremos los foros con mensajes nuevos
                // for (const forum of results){
                const promisesForum = forums.map( async (forum) => {

                    // Verificamos si el id está en la black list
                    if(Object.values(currenConfig.classRoom[id].blackList).includes(forum.id)){
                        return;
                    }

                    // Guardamos los foros del aula en el local storage
                    if (!moodleData.classRoom[id].forums) moodleData.classRoom[id].forums = {}; //Si aún no hay foros, lo creamos vacíos

                    const forumExist = moodleData.classRoom[id].forums[forum.id]; //Verificamos si existe el foro con mensajes nuevos

                    if (forumExist) {//SI tenemos mensajes del mismo foro, sumamos los mensajes nuevos
                        const previo = Number(forumExist.newMessages) || 0;
                        const nuevo = Number(forum.newMessages) || 0;
                        moodleData.classRoom[id].forums[forum.id].newMessages = previo + nuevo;
                    } else { // Si no lo tenemos, lo creamos, tanto sus mensajes como los datos del foro
                        forum.newMessages = Number(forum.newMessages) || 0;
                        moodleData.classRoom[id].forums[forum.id] = forum;
                    }

                    // Guardamso la información.
                    await chrome.storage.local.set({ moodle: moodleData });

                    // Pasamos los datos del aula y el foro antes de revisar los distintos "Hilos" del foro
                    const data = {
                        classRoomId: id,
                        forumId: forum.id,
                    }

                    // Provcesamos los "Hilos del foro"
                    await processThread(data, `${forum.url}`);

                    // Volvemos a cargar los datos que se hayan guardado de los procesos de los cuales volvemos
                    const refreshed = await chrome.storage.local.get(["moodle"]);
                    moodleData = refreshed.moodle || moodleData;
                });

                await Promise.all(promisesForum); }
        }

    } catch (error) {
        console.log(error)
    }
}

// Ingresa a cada Foro del aula y traermos los hilos
const processThread = async (data, url) => {
    try {

        // Traemos los datos del Foro que tiene mensajes nuevos
        const response = await fetch(url);
        const html = await response.text();

        // Traemos los datos del Local Storage
        let {moodle:moodleData} = await chrome.storage.local.get(["moodle"]) || {};

        // Si hay "Hilos con mensajes nuevos, los vamos a recorrer para buscar los mensajes"
        if (html.includes("rounded-pill") || html.includes("unread")) {
            const threads = await parserOffscreen({target: 'offscreen_discussion', data: html});

            // for(const discussion of threads){
            const promisesThread = threads.map(async (thread) => {

                const currentForum = moodleData.classRoom[data.classRoomId].forums[data.forumId]; // Buscamos los "Hilos" del foro

                if (!currentForum.discussions) { // Si no hay mensajes lo creamos vacío
                    currentForum.discussions = {};
                }

                const discussionExist = currentForum.discussions[thread.id];

                if (discussionExist) { // Si el "Hilo" existe, lo actualizamos
                    const previo = parseInt(discussionExist.newMessages) || 0;
                    const nuevo = parseInt(thread.newMessages) || 0;
                    moodleData.classRoom[data.classRoomId].forums[data.forumId].discussions[thread.id].newMessages = previo + nuevo;
                } else { // Si no exite, lo creamos
                    thread.newMessages = parseInt(thread.newMessages) || 0;
                    moodleData.classRoom[data.classRoomId].forums[data.forumId].discussions[thread.id] = thread;
                }

                // GUardamos la información en el LocalStorage
                await chrome.storage.local.set({ moodle: moodleData });

                // Pasamos a las discusiones el Aula y foro al que pertenece
                const nextData = {
                    ...data,
                    discussionId: thread.id
                };

                // Ingresamos a los post de la discusión
                await processDiscussion(nextData, thread.url);

                // Refrescamos los datos
                const refreshed = await chrome.storage.local.get(["moodle"]);
                moodleData = refreshed.moodle || moodleData;
            })

            await Promise.all(promisesThread);
        }

    } catch (error) {
        console.log(error)
    }
}

// Traemos los posts y los guardamos en local storage
const processDiscussion = async (data, url) => {
    try {
        const response = await fetch(url);
        const html = await response.text();
        const {moodle:moodleData} = await chrome.storage.local.get(["moodle"]) || {};

        const discussionData = await parserOffscreen({target: 'offscreen_discussion_content', data: html});
        const currentDiscussion = moodleData.classRoom[data.classRoomId].forums[data.forumId].discussions[data.discussionId];
        currentDiscussion.post = discussionData.post;

        if (!currentDiscussion.replies) {
            currentDiscussion.replies = [];
        }

        let nuevasRespuestas = [];
        if (currentDiscussion.replies.length === 0) {
            nuevasRespuestas = discussionData.replies;
        } else {
            nuevasRespuestas = discussionData.replies.filter(reply => reply.isUnread === true);
        }

        currentDiscussion.replies = [...currentDiscussion.replies, ...nuevasRespuestas];

        // Guardamos información
        await chrome.storage.local.set({ moodle: moodleData });

    } catch (error) {
        console.log(error)
    }
}

/* ===================================
   OFFSCREEN
   =================================== */

// Nos aseguramos que exista el HTML
const setupOffscreen = async (path) => {

    // Creamos el archivo para utilizar métodos DOM
    const offscreenUrl = chrome.runtime.getURL(path);
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [offscreenUrl]
    });

    if (existingContexts.length > 0) {
        return;
    }

    await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['DOM_PARSER'],
        justification: 'Parsear el DOM de Moodle para extraer IDs de foros'
    });
}

// Mandamos a sendMessage el target y html de cada proceso
const parserOffscreen = async (object) => {
    await setupOffscreen('offscreen.html');
    const result = await chrome.runtime.sendMessage(object);
    await chrome.offscreen.closeDocument();
    return result;
}

const launchAlert = async (error) => {
    await chrome.runtime.sendMessage({target: "catchError", datos: error});
}

/* ===================================
   LISTENERS
   =================================== */

const alarmConfig = {
    timeDefault: 30,
    name: "checkMoodle"
}

// INSTALAMOS LA ALARMA
chrome.runtime.onInstalled.addListener(async () => {
    let { config } = await chrome.storage.local.get(["config"]);

    const urlBaseDefault = "https://frgp.cvg.utn.edu.ar";

    //Datos default
    const defaultConfig = {
        domain: urlBaseDefault,
        checkInterval: alarmConfig.timeDefault,
        classRoom: {}
    };

    if (!config) { // Si aún no hay configuración, guardamos datos por default
        config = defaultConfig;
        await chrome.storage.local.set({ config: defaultConfig });
    }

    const interval = parseInt(config?.checkInterval) || alarmConfig.timeDefault;

    await chrome.alarms.create(alarmConfig.name, { 
        periodInMinutes: interval,
        delayInMinutes: 1 
    });
});

// MODIFICAMOS LA ALARMA
chrome.storage.onChanged.addListener(async (changes, namespace) => {
    if (namespace === 'local' && changes.config) {

        let { config: configData } = await chrome.storage.local.get(["config"]);
        const alarm = await chrome.alarms.get(alarmConfig.name);

        const currentPeriodInMinutes = parseInt(configData.checkInterval);

        if (!alarm || alarm.periodInMinutes !== currentPeriodInMinutes) {
            await chrome.alarms.clear(alarmConfig.name);
            chrome.alarms.create(alarmConfig.name, { 
                periodInMinutes: currentPeriodInMinutes,
                delayInMinutes: 1 
            });
        }
    }
});

// ALARMA
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if(alarm.name == alarm.name){
        try {
            const { config } = await chrome.storage.local.get(["config"]);
            const classrooms = Object.entries(config.classRoom || {})

            const promises = classrooms.map(([code, data]) => {
                const url = `${data.domainOptional}/course/view.php?id=${code}&section=${data.section}#tabs-tree-start`
                return processMoodle(code, data.name, data.section, url);
            })

            await Promise.all(promises);
        } catch (error) {
            console.log(error)
        }
    }
})

// Escuchamos mensajes
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {

    if (request.action === "check_now") {
        (async () => {
            try {
                const { config } = await chrome.storage.local.get(["config"]);
                for (const [code, classroomData] of Object.entries(config.classRoom || {})) {
                    const name = classroomData.name;
                    const section = classroomData.section;
                    const domain = classroomData.domainOptional;
                    const url = `${domain}/course/view.php?id=${code}&section=${section}#tabs-tree-start`

                    // Iniciamos fetch
                    await processMoodle(code, name, section, url);
                }
            } catch (errorObj) {
                launchAlert({ element:"alert-container", error: true, message: "Ocurrió un error mientra se intentaba actualizar la información."})
            }
            // Se responde una sola vez, fuera del bucle y al finalizar todo
            sendResponse({ status: "terminado" });
        })();
    }

    return true;
});
