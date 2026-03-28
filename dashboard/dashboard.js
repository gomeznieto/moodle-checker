chrome.storage.local.get(["moodle"], async (result) => {
    const moodleData = result.moodle || {};
    const dataContent = document.getElementById('moodle-data');

    // @ts-ignore
    if (!moodleData.classRoom) {
        dataContent.innerHTML = "<p>No hay datos guardados.</p>";
        return;
    }

    const mainContainer = document.createElement("div");

    // @ts-ignore
    for (const classRoom of Object.values(moodleData.classRoom)) {
        if (!classRoom.forums) continue;
            const classDiv = document.createElement("div");

            // NOMBRE DEL AULA
            classDiv.innerHTML = `<h2>Aula: ${classRoom.name || "Sin Nonbre"}</h2>`;
            //TODO: Agregar un contador de mensajes totales sin leer.

        for (const forum of Object.values(classRoom.forums)) {
            const forumDiv = document.createElement("div");
            forumDiv.innerHTML = `<h3>Foro: ${forum.name}</h3>`;

            if (!forum.discussions) continue;

            for (const thread of Object.values(forum.discussions)) {
                const threadDiv = document.createElement("details"); // Usamos details para que sea colapsable
                threadDiv.style.margin = "10px 0";
                
                // Título del hilo y contador de mensajes
                threadDiv.innerHTML = `
                    <summary style="font-size: 1.2em; cursor: pointer; font-weight: bold;">
                        ${thread.name} <span style="color: red;">(${thread.newMessages || 0} nuevos)</span>
                    </summary>
                    <div class="post-principal" style="background: #eee; padding: 10px; margin-top: 5px;">
                        <strong>${thread.post?.author || 'Desconocido'}</strong> dijo a las: <strong>${thread.post?.time || 'Sin hora' }</strong>
                        <div>${thread.post?.contentHTML || ''}</div>
                    </div>
                `;

                // Renderizado de respuestas si existen
                if (thread?.replies && thread?.replies?.length > 0) {
                    const repliesContainer = document.createElement("div");
                    repliesContainer.style.paddingLeft = "20px";
                    
                    for (const reply of thread.replies) {
                        const replyDiv = document.createElement("div");
                        replyDiv.style.borderLeft = "2px solid #ccc";
                        replyDiv.style.paddingLeft = "10px";
                        replyDiv.style.marginTop = "10px";

                        // Si el mensaje no está leído le ponemos un fondo distinto
                        if(reply?.isUnread){
                            replyDiv.style.background = "#ccc";
                        }
                        replyDiv.innerHTML = `
                            <strong>${reply.author}</strong> respondió a las <strong>${reply?.time || 'Sin hora'}</strong>:
                            <div>${reply.contentHTML}</div>
                        `;
                        repliesContainer.appendChild(replyDiv);
                    }
                    threadDiv.appendChild(repliesContainer);
                }

                forumDiv.appendChild(threadDiv);
            }
            mainContainer.appendChild(classDiv);
            mainContainer.appendChild(forumDiv);
        }
    }
    
    dataContent.appendChild(mainContainer);
});

// INTERVALE TIME
chrome.storage.local.get(["config"], result => {
    const intervaleTimeMinutes = document.getElementById('intervaleTimeMinutes');
    intervaleTimeMinutes.innerText = `${result.config.checkInterval || '5'}`;

});

// FORMULARIO ADD CLASES
/* global chrome */

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
document.getElementById('check-now-btn').addEventListener('click', () => {
    console.log("click")
    chrome.runtime.sendMessage({ action: "check_now" });
});
