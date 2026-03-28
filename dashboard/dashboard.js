chrome.storage.local.get(["moodle"], (result) => {
    const moodleData = result.moodle || {};
    const dataContent = document.getElementById('moodle-data');

    if (!moodleData.classRoom) {
        dataContent.innerHTML = "<p>No hay datos guardados.</p>";
        return;
    }

    const mainContainer = document.createElement("div");

    for (const classRoom of Object.values(moodleData.classRoom)) {
        if (!classRoom.forums) continue;
            const classDiv = document.createElement("div");
            classDiv.innerHTML = `<h2>Aula: ${classRoom.name || "Sin Nonbre"}</h2>`;

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

document.getElementById('form_setting').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const data = await chrome.storage.local.get(["config"]);
    const currentConfig = data.config || { config: {} };
    const domain = formData.get('domain');
    const timeInterval = formData.get('timeInterval');
    
    const updatedConfig = {
        domain: domain || currentConfig.domain,
        checkInterval: parseInt(timeInterval) || currentConfig.checkInterval,
    };

    await chrome.storage.local.set({ config: updatedConfig });
    
    e.target.reset();
});
