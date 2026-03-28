// VARIABLES DESDE EL CONTENT
// const URL_CLASS= `${URL_BASE}`
// const URL = `${URL_CLASS}${AULA}&section=${SECTION}#tabs-tree-start` //Aseguramos que empiece en la seccion que necesitamos
const BLACK_LIST=[]

chrome.runtime.onInstalled.addListener(async () => {
    console.log("Iniciando");
    const { config } = await chrome.storage.local.get(["config"]);

    const defaultConfig = {
        domain: "https://frgp.cvg.utn.edu.ar",
        checkInterval: 5,
        classRooms: {}
    };

    if (!config) {
        await chrome.storage.local.set({ config: defaultConfig });
    }

    const interval = config?.checkInterval || defaultConfig.checkInterval;
    await chrome.alarms.create("checkMoodle", { periodInMinutes: interval });
    
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
    if(alarm.name == "checkMoodle"){
        try {
            const { config } = await chrome.storage.local.get(["config"]);

            for (const [code, c] of Object.entries(config.classRoom || {})) {
                const name = c.name;
                const section = c.section;
                const domain = c.domainOptional;
                const url = `${domain}/course/view.php?id=${code}&section=${section}#tabs-tree-start`

                await processMoodle(code, name, section, url);
            }
        } catch (error) {
            console.log("Fallo: ", error)
        }
    }
})

// Traemos los posts y los guardamos en local storage
const processMoodleDiscussion = async (data, url) => {
    console.log("Procesando Moodle Disución", url);
    try {
        const response = await fetch(url);
        const html = await response.text();
        const result = await chrome.storage.local.get(["moodle"]);
        let moodleData = result.moodle || {};

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

        await chrome.storage.local.set({ moodle: moodleData });

    } catch (error) {
        console.error("Error al conectar con Moodle:", error);
    }
}

// Ingresa a cada Foro del aula y traermos los hilos
const processMoodleForum = async (data, url) => {
    console.log("Procesando Moodle Forum", url);
    try {
        const response = await fetch(url);
        const html = await response.text();
        const result = await chrome.storage.local.get(["moodle"]);
        let moodleData = result.moodle || {};

        if (html.includes("rounded-pill") || html.includes("unread")) {
            const results = await parserOffscreen({target: 'offscreen_discussion', data: html});
            console.log("Resultados de Hilos", results);

            for(const discussion of results){

                const currentForum = moodleData.classRoom[data.classRoomId].forums[data.forumId];

                if (!currentForum.discussions) {
                    currentForum.discussions = {};
                }

                const discussionExist = currentForum.discussions[discussion.id];

                if (discussionExist) {
                    const previo = Number(discussionExist.newMessages) || 0;
                    const nuevo = Number(discussion.newMessages) || 0;
                    moodleData.classRoom[data.classRoomId].forums[data.forumId].discussions[discussion.id].newMessages = previo + nuevo;
                } else {
                    discussion.newMessages = Number(discussion.newMessages) || 0;
                    moodleData.classRoom[data.classRoomId].forums[data.forumId].discussions[discussion.id] = discussion;
                }

                await chrome.storage.local.set({ moodle: moodleData });

                const nextData = {
                    ...data,
                    discussionId: discussion.id
                };

                // Ingresamos a los post de la discusión
                await processMoodleDiscussion(nextData, discussion.url);

                const refreshed = await chrome.storage.local.get(["moodle"]);
                moodleData = refreshed.moodle || moodleData;
            }

        }

    } catch (error) {
        console.error("Error al conectar con Moodle:", error);
    }
}

// Ingresa al aula y traemos cada uno de los foros
const processMoodle = async (id, name, section, url) => {
    console.log("Procesando Moodle", url);
    try {
        const response = await fetch(url);
        const html = await response.text();
        const currentLentgth = html.length;
        const result = await chrome.storage.local.get(["moodle"]);
        let moodleData = result.moodle || {};
        const lastSize = moodleData.classRoom?.[id]?.lastSize || 0;

        // Solo leemos si hay cambios
        if(currentLentgth != lastSize){

            if (!moodleData.classRoom) moodleData.classRoom = {};
            if (!moodleData.classRoom[id]) moodleData.classRoom[id] = { forums: {}, name: name, section: section };

            moodleData.classRoom[id].lastSize = currentLentgth;
            await chrome.storage.local.set({ moodle: moodleData });

            // Si hay nuevos mensajes
            if (html.includes("rounded-pill") || html.includes("unread")) {
                const results = await parserOffscreen({target: 'offscreen_forum', data: html});
                console.log("Resultados de Foros ", results);

                for (const forum of results){
                    // Verificamos si el id está en la black list
                    if(BLACK_LIST.includes(forum.id)){
                        continue;
                    }

                    // Guardamos los foros del aula en el local storage
                    if (!moodleData.classRoom[id].forums) moodleData.classRoom[id].forums = {};

                    const forumExist = moodleData.classRoom[id].forums[forum.id];

                    if (forumExist) {
                        const previo = Number(forumExist.newMessages) || 0;
                        const nuevo = Number(forum.newMessages) || 0;
                        moodleData.classRoom[id].forums[forum.id].newMessages = previo + nuevo;
                    } else {
                        forum.newMessages = Number(forum.newMessages) || 0;
                        moodleData.classRoom[id].forums[forum.id] = forum;
                    }

                    await chrome.storage.local.set({ moodle: moodleData });

                    // Ingresamos a los hilos del foro
                    const data = {
                        classRoomId: id,
                        forumId: forum.id,
                    }

                    console.log("Enviando data a processMoodleForum")
                    await processMoodleForum(data, `${forum.url}`);

                    const refreshed = await chrome.storage.local.get(["moodle"]);
                    moodleData = refreshed.moodle || moodleData;
                }
            }
        }

    } catch (error) {
        console.error("Error al conectar con Moodle:", error);
    }
}

// Nos aseguramos que exista el HTML
const setupOffscreen = async (path) => {
    const offscreenUrl = chrome.runtime.getURL(path);
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [offscreenUrl]
    });

    console.log("Existe el archivo?", existingContexts)

    if (existingContexts.length > 0) {
        console.log("Archivo creado");
        return;
    }

    console.log("Creando archivo");

    await chrome.offscreen.createDocument({
        url: 'offscreen.html',
        reasons: ['DOM_PARSER'],
        justification: 'Parsear el DOM de Moodle para extraer IDs de foros'
    });

    console.log(chrome.runtime.getURL(path))
}

// Mandamos a sendMessage el target y html de cada proceso
const parserOffscreen = async (object) => {
    console.log("Parse a HTML del Fetch");
    await setupOffscreen('offscreen.html');

    const result = await chrome.runtime.sendMessage(object);

    console.log("Mensaje enviado");
    await chrome.offscreen.closeDocument();

    return result;
}

chrome.runtime.onMessage.addListener( async (request, sender, sendResponse) => {
    console.log("Revisar ahora")
    if (request.action === "check_now") {

        const { config } = await chrome.storage.local.get(["config"]);
        for (const [code, c] of Object.entries(config.classRoom || {})) {
            const name = c.name;
            const section = c.section;
            const domain = c.domainOptional;
            const url = `${domain}/course/view.php?id=${code}&section=${c.section}#tabs-tree-start`

            console.log({name, section, url, code})
            await processMoodle(code, name, section, url);
        }
    }
    return true; // Necesario si vas a usar await o lógica asíncrona dentro del listener
});
