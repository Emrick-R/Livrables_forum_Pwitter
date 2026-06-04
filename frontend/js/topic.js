const params   = new URLSearchParams(window.location.search)
const topicId  = params.get('id')

if (!topicId) window.location.href = '../index.html'

let pageMsgs    = 1
let limiteMsgs  = 10
let triMessages = 'date'
let topicData   = null

document.addEventListener('DOMContentLoaded', async () => {
    await chargerTopic()
    chargerMessages()
})

async function chargerTopic() {
    const res = await apiFetch(`/topic/${topicId}`)
    if (!res || !res.ok) {
        document.getElementById('topic-header').innerHTML =
            '<div class="message-vide">Topic introuvable.</div>'
        return
    }

    topicData = await res.json()
    if (topicData.topic) topicData = topicData.topic

    afficherEnteteTopic(topicData)
    afficherComposer(topicData)

    document.title = `Pwitter - ${topicData.titre}`
}

function afficherEnteteTopic(topic) {
    const user = getUser()
    const estProprietaire = user && topic.id_utilisateur === user.id
    const estAdmin        = user && user.role === 'admin'

    const score = (topic.likes || 0) - (topic.dislikes || 0)
    const tags  = (topic.tags || []).map(t => `<span class="tag">${t.nom}</span>`).join('')
    const date  = new Date(topic.date_creation).toLocaleDateString('fr-FR', {
        day: 'numeric', month: 'long', year: 'numeric'
    })

    let badgeStatut = ''
    if (topic.statut === 'ferme') {
        badgeStatut = '<span class="topic-statut statut-ferme">Fermé</span>'
    } else if (topic.statut === 'ouvert') {
        badgeStatut = '<span class="topic-statut statut-ouvert">Ouvert</span>'
    }

    let actionsHTML = ''
    if (estProprietaire || estAdmin) {
        actionsHTML = `
            <a href="edit-topic.html?id=${topic.id}" class="btn-outline" style="font-size:0.85rem">Modifier</a>
            <button class="btn-danger" onclick="supprimerTopic()" style="font-size:0.85rem">Supprimer</button>
        `
        if (estProprietaire) {
            const labelStatut = topic.statut === 'ferme' ? 'Rouvrir' : 'Fermer'
            actionsHTML += `
                <button class="btn-outline" onclick="changerStatutTopic('${topic.statut === 'ferme' ? 'ouvert' : 'ferme'}')" style="font-size:0.85rem">
                    ${labelStatut}
                </button>
            `
        }
    }

    document.getElementById('topic-header').innerHTML = `
        <div class="topic-detail-card">
            <div class="topic-votes">
                <button class="vote-btn up" id="vote-up-topic" onclick="voterTopic('like')" title="Liker">▲</button>
                <span class="vote-score" id="score-topic">${score}</span>
                <button class="vote-btn down" id="vote-down-topic" onclick="voterTopic('dislike')" title="Disliker">▼</button>
            </div>
            <div class="topic-detail-body">
                <div class="topic-tags-row">${tags} ${badgeStatut}</div>
                <h1 class="topic-detail-titre">${topic.titre}</h1>
                <div class="topic-meta">
                    <span>par <strong>${topic.pseudo || topic.auteur || 'Inconnu'}</strong></span>
                    <span>${date}</span>
                </div>
                <div class="topic-corps">${topic.corps}</div>
                <div class="topic-actions">${actionsHTML}</div>
            </div>
        </div>
    `
}

async function chargerMessages() {
    const url = `/topic/${topicId}/message?page=${pageMsgs}&limite=${limiteMsgs}&tri=${triMessages}`
    const res = await apiFetch(url)
    const conteneur = document.getElementById('messages-container')

    if (!res || !res.ok) {
        conteneur.innerHTML = '<div class="message-vide">Impossible de charger les messages.</div>'
        return
    }

    const data = await res.json()
    const messages = Array.isArray(data) ? data : (data.messages || [])
    const total    = data.total || messages.length

    document.getElementById('nb-messages').textContent =
        `${total} réponse${total > 1 ? 's' : ''}`

    conteneur.innerHTML = ''

    if (messages.length === 0) {
        conteneur.innerHTML = '<div class="message-vide">Aucune réponse pour le moment. Sois le premier !</div>'
        afficherPaginationMessages(0)
        return
    }

    messages.forEach(msg => conteneur.appendChild(creerCarteMessage(msg)))
    afficherPaginationMessages(total)
}

function creerCarteMessage(msg) {
    const user       = getUser()
    const estAuteur  = user && msg.id_utilisateur === user.id
    const estAdmin   = user && user.role === 'admin'
    const estProprio = topicData && user && topicData.id_utilisateur === user.id

    const score  = (msg.likes || 0) - (msg.dislikes || 0)
    const pseudo = msg.pseudo || msg.auteur || 'Inconnu'
    const date   = formaterDate(msg.date_envoi || msg.date_creation)
    const couleurAvatar = couleurDepseudo(pseudo)

    let actionsHTML = ''
    if (estAuteur) {
        actionsHTML += `<button class="btn-outline" style="font-size:0.8rem" onclick="toggleEditMessage(${msg.id})">Modifier</button>`
    }
    if (estAuteur || estAdmin || estProprio) {
        actionsHTML += `<button class="btn-danger" style="font-size:0.8rem" onclick="supprimerMessage(${msg.id})">Supprimer</button>`
    }

    const card = document.createElement('div')
    card.className = 'message-card'
    card.id = `msg-${msg.id}`

    card.innerHTML = `
        <div class="topic-votes">
            <button class="vote-btn up" onclick="voterMessage(${msg.id}, 'like')" title="Liker">▲</button>
            <span class="vote-score" id="score-msg-${msg.id}">${score}</span>
            <button class="vote-btn down" onclick="voterMessage(${msg.id}, 'dislike')" title="Disliker">▼</button>
        </div>
        <div class="msg-content">
            <div class="msg-header">
                <div class="avatar" style="background:${couleurAvatar}">${pseudo[0].toUpperCase()}</div>
                <span class="msg-auteur">${pseudo}</span>
                <span class="msg-date">${date}</span>
            </div>
            <div class="msg-corps" id="corps-msg-${msg.id}">${msg.corps}</div>
            <div class="edit-form" id="edit-${msg.id}">
                <textarea id="textarea-edit-${msg.id}">${msg.corps}</textarea>
                <div class="edit-form-actions">
                    <button class="btn-gradient" onclick="sauvegarderMessage(${msg.id})" style="font-size:0.85rem">Sauvegarder</button>
                    <button class="btn-outline" onclick="toggleEditMessage(${msg.id})" style="font-size:0.85rem">Annuler</button>
                </div>
            </div>
            <div class="msg-actions">${actionsHTML}</div>
        </div>
    `

    return card
}

function afficherComposer(topic) {
    const zone = document.getElementById('zone-composer')

    if (!estConnecte()) {
        zone.innerHTML = `
            <div class="composer">
                <div class="composer-connecte">
                    <a href="login.html">Connecte-toi</a> pour répondre à ce topic.
                </div>
            </div>
        `
        return
    }

    if (topic.statut === 'ferme') {
        zone.innerHTML = `
            <div class="composer">
                <div class="composer-connecte">Ce topic est fermé, les réponses ne sont plus acceptées.</div>
            </div>
        `
        return
    }

    zone.innerHTML = `
        <div class="composer">
            <h4>Écrire une réponse</h4>
            <textarea id="nouveau-message" placeholder="Ta réponse..."></textarea>
            <div class="composer-footer">
                <button class="btn-gradient" onclick="envoyerMessage()">Envoyer</button>
            </div>
        </div>
    `
}

async function envoyerMessage() {
    const textarea = document.getElementById('nouveau-message')
    const corps = textarea?.value.trim()

    if (!corps) return

    const res = await apiFetch('/message', {
        method: 'POST',
        body: JSON.stringify({ corps, id_topic: parseInt(topicId) })
    })

    if (!res || !res.ok) {
        alert('Erreur lors de l\'envoi du message.')
        return
    }

    textarea.value = ''
    pageMsgs = 1
    chargerMessages()
}

async function voterMessage(id, type) {
    if (!estConnecte()) {
        window.location.href = 'login.html'
        return
    }

    const res = await apiFetch(`/message/${id}/like`, {
        method: 'POST',
        body: JSON.stringify({ type })
    })

    if (res && res.status === 409) {
        await apiFetch(`/message/${id}/like`, { method: 'DELETE' })
    }

    chargerMessages()
}

async function voterTopic(type) {
    if (!estConnecte()) {
        window.location.href = 'login.html'
        return
    }

    const res = await apiFetch(`/topic/${topicId}/like`, {
        method: 'POST',
        body: JSON.stringify({ type })
    })

    if (res && res.status === 409) {
        await apiFetch(`/topic/${topicId}/like`, { method: 'DELETE' })
    }

    chargerTopic()
}

function toggleEditMessage(id) {
    document.getElementById(`edit-${id}`).classList.toggle('visible')
}

async function sauvegarderMessage(id) {
    const corps = document.getElementById(`textarea-edit-${id}`)?.value.trim()
    if (!corps) return

    const res = await apiFetch(`/message/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ corps })
    })

    if (!res || !res.ok) {
        alert('Erreur lors de la modification.')
        return
    }

    toggleEditMessage(id)
    chargerMessages()
}

async function supprimerMessage(id) {
    if (!confirm('Supprimer ce message ?')) return

    const res = await apiFetch(`/message/${id}`, { method: 'DELETE' })

    if (!res || !res.ok) {
        alert('Erreur lors de la suppression.')
        return
    }

    chargerMessages()
}

async function supprimerTopic() {
    if (!confirm('Supprimer ce topic et tous ses messages ?')) return

    const res = await apiFetch(`/topic/${topicId}`, { method: 'DELETE' })

    if (!res || !res.ok) {
        alert('Erreur lors de la suppression.')
        return
    }

    window.location.href = '../index.html'
}

async function changerStatutTopic(nouveauStatut) {
    const res = await apiFetch(`/topic/${topicId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ statut: nouveauStatut })
    })

    if (!res || !res.ok) {
        alert('Erreur lors du changement de statut.')
        return
    }

    chargerTopic()
}

function changerTriMessages(nouveauTri, btn) {
    triMessages = nouveauTri
    pageMsgs = 1
    document.querySelectorAll('.btn-tri').forEach(b => b.classList.remove('actif'))
    btn.classList.add('actif')
    chargerMessages()
}

function afficherPaginationMessages(total) {
    const conteneur = document.getElementById('pagination-messages')
    if (!conteneur) return

    const totalPages = Math.ceil(total / limiteMsgs)
    conteneur.innerHTML = ''

    const select = document.createElement('select')
    select.className = 'page-size'
    select.onchange = () => { limiteMsgs = parseInt(select.value); pageMsgs = 1; chargerMessages() }
    ;[10, 20, 30].forEach(n => {
        const opt = document.createElement('option')
        opt.value = n
        opt.textContent = `${n} par page`
        opt.selected = n === limiteMsgs
        select.appendChild(opt)
    })
    conteneur.appendChild(select)

    if (totalPages <= 1) return

    if (pageMsgs > 1) {
        const prev = document.createElement('button')
        prev.className = 'page-btn'
        prev.textContent = '←'
        prev.onclick = () => { pageMsgs--; chargerMessages() }
        conteneur.appendChild(prev)
    }

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button')
        btn.className = 'page-btn' + (i === pageMsgs ? ' actif' : '')
        btn.textContent = i
        btn.onclick = () => { pageMsgs = i; chargerMessages() }
        conteneur.appendChild(btn)
    }

    if (pageMsgs < totalPages) {
        const next = document.createElement('button')
        next.className = 'page-btn'
        next.textContent = '→'
        next.onclick = () => { pageMsgs++; chargerMessages() }
        conteneur.appendChild(next)
    }
}

function formaterDate(dateStr) {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    const maintenant = new Date()
    const diff = Math.floor((maintenant - date) / 1000)

    if (diff < 60)    return 'À l\'instant'
    if (diff < 3600)  return `Il y a ${Math.floor(diff / 60)} min`
    if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`

    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function couleurDepseudo(pseudo) {
    const couleurs = ['#7B68EE', '#60C8F0', '#72E484', '#D478E8', '#F0A060', '#E87272', '#60D4B8']
    let total = 0
    for (let i = 0; i < pseudo.length; i++) total += pseudo.charCodeAt(i)
    return couleurs[total % couleurs.length]
}
