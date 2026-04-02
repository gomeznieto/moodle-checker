chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

    if (message.target === 'offscreen_forum') { // Buscamos los foros con mensajes en la página inicial
        const parser = new DOMParser();
        const doc = parser.parseFromString(message.data, 'text/html'); // Convertimos el texto del fetch a html

        const forumLinks = doc.querySelectorAll('a[href*="mod/forum/view.php?id="]'); //Obtenemos todos los foros

        const forumWithMessages = Array.from(forumLinks).map( link => {
            const url = new URL(link.href);
            const container = link.closest('.activityname');
            const pill = container ? container.querySelector('.activitybadge') : null;
            const match = pill.innerText.match(/\d+/); // Busca una secuencia de números
            const newMessagesCount = match ? match[0] : "0";

            if(pill && pill.innerText.trim().length > 0){ // SI hay mensajes nuevos los guardamos en el array
                return {
                    id: url.searchParams.get('id'),
                    url: url,
                    name: link.innerText.trim(),
                    newMessages: newMessagesCount
                };
            } 
        }).filter(Boolean);

        sendResponse(forumWithMessages);

    } else if(message.target === 'offscreen_discussion'){ // Buscamos los "Hilos" de cada Foro que tenga mensajes nuevos
        const parser = new DOMParser();
        const doc = parser.parseFromString(message.data, 'text/html');

        const discussionRows = doc.querySelectorAll('tr.discussion.hasunread');

        const forumWithMessages = Array.from(discussionRows).map(row => {
            const titleLink = row.querySelector('th.topic a');
            const unreadBadge = row.querySelector('a[href*="#unread"].badge');

            if (titleLink && unreadBadge) {
                const url = new URL(titleLink.href);
                return {
                    id: url.searchParams.get('d'),
                    url: url,
                    name: titleLink.innerText.trim(),
                    newMessages: unreadBadge.innerText.trim()
                };
            }
        }).filter(Boolean);

        sendResponse(forumWithMessages);
    } else if(message.target === 'offscreen_discussion_content'){ // Bucamos los mensajes
        const parser = new DOMParser();
        const doc = parser.parseFromString(message.data, 'text/html');

        const extractPostData = (postNode) => {
            if (!postNode) return null;

            const authorNode = postNode.querySelector('.mb-3 a');
            const timeContent = postNode.querySelector('.mb-3 time');
            const contentNode = postNode.querySelector('.post-content-container');
            const isUnread = postNode.querySelector('a#unread') !== null || postNode.classList.contains('unread');
            const permanentLink = postNode.querySelector('.btn-link');

            return {
                author: authorNode ? authorNode.innerText.trim() : 'Desconocido',
                time: timeContent ? timeContent.innerText.trim() : 'Sin hora',
                link: permanentLink.getAttribute('href'),
                contentHTML: contentNode ? contentNode.innerHTML.trim() : '',
                isUnread: isUnread
            };
        };

        const mainPostNode = doc.querySelector('.forumpost.firstpost'); // Post principal
        const replyNodes = doc.querySelectorAll('.forumpost:not(.firstpost)'); // Repsuestas

        const discussionData = {
            titulo: mainPostNode ? mainPostNode.querySelector('h3').innerText.trim() : '', // Titulo del "Hilo"
            url: mainPostNode ? mainPostNode.querySelector('a[href*="discuss.php?d="]').getAttribute('href') : '', // Link del Hilo
            post: extractPostData(mainPostNode),
            replies: Array.from(replyNodes).map(extractPostData)
        };

        sendResponse(discussionData);
    }

    return true;
});
