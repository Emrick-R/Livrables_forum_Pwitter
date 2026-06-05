let page = 1
let limite = 10
let tri = 'date'
let tagActif = null
let recherche = ''

document.addEventListener('DOMContentLoaded', () => {
    chargerTags()
    chargerTopics()

    const searchInput = document.getElementById('search-input')
    if (searchInput) {
        searchInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') rechercherTopics()
        })
    }
})

async function chargerTags() {
    const res = await apiFetch('/tags')
    const conteneur = document.getElementById('liste-tags')
    if (!res || !res.ok || !conteneur) return

    const tags = await res.json()
    conteneur.innerHTML = ''

    const btnTous = document.createElement('div')
    btnTous.className = 'tag-item actif'
    btnTous.textContent = '# Tous'
    btnTous.onclick = () => filtrerParTag(null, btnTous)
    conteneur.appendChild(btnTous)

    tags.forEach(tag => {
        const el = document.createElement('div')
        el.className = 'tag-item'
        el.textContent = '# ' + tag.nom
        el.onclick = () => filtrerParTag(tag.id, el)
        conteneur.appendChild(el)
    })
}

function filtrerParTag(id, el) {
    tagActif = id
    page = 1
    document.querySelectorAll('.tag-item').forEach(t => t.classList.remove('actif'))
    el.classList.add('actif')
    chargerTopics()
}

async function chargerTopics() {
    let url = `/topics?page=${page}&limite=${limite}&tri=${tri}`
    if (tagActif) url += `&tag=${tagActif}`
    if (recherche) url += `&recherche=${encodeURIComponent(recherche)}`

    const conteneur = document.getElementById('topics-container')

    const res = await apiFetch(url)
    if (!res || !res.ok) {
        conteneur.innerHTML = '<div class="message-vide">Impossible de charger les topics.</div>'
        return
    }

    const data = await res.json()
    const topics = Array.isArray(data) ? data : (data.topics || [])
    const total = data.total || topics.length

    conteneur.innerHTML = ''

    if (topics.length === 0) {
        conteneur.innerHTML = '<div class="message-vide">Aucun topic à afficher.</div>'
        afficherPagination(0)
        return
    }

    topics.forEach(topic => conteneur.appendChild(creerCarteTopic(topic)))
    afficherPagination(total)
}

function creerCarteTopic(topic) {
    const card = document.createElement('div')
    card.className = 'topic-card'
    card.onclick = () => window.location.href = `pages/topic.html?id=${topic.id}`

    const score = (topic.likes || 0) - (topic.dislikes || 0)
    const tags = (topic.tags || []).map(t => `<span class="tag">${t.nom}</span>`).join('')

    let badgeStatut = ''
    if (topic.statut === 'ferme') {
        badgeStatut = '<span class="topic-statut statut-ferme">Fermé</span>'
    }

    const date = new Date(topic.date_creation).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short'
    })

    card.innerHTML = `
        <div class="topic-votes">
            <button class="vote-btn up" title="Liker" onclick="event.stopPropagation()">▲</button>
            <span class="vote-score">${score}</span>
            <button class="vote-btn down" title="Disliker" onclick="event.stopPropagation()">▼</button>
        </div>
        <div class="topic-body">
            <div class="topic-tags-row">${tags}</div>
            <h3 class="topic-titre">${topic.titre}</h3>
            <div class="topic-meta">
                <span>par <strong>${topic.pseudo || topic.auteur || 'Inconnu'}</strong></span>
                <span>${date}</span>
                <span>💬 ${topic.nb_messages || 0} réponses</span>
                ${badgeStatut}
            </div>
        </div>
    `

    return card
}

function changerTri(nouveauTri, btn) {
    tri = nouveauTri
    page = 1
    document.querySelectorAll('.btn-tri').forEach(b => b.classList.remove('actif'))
    btn.classList.add('actif')
    chargerTopics()
}

function rechercherTopics() {
    recherche = document.getElementById('search-input')?.value.trim() || ''
    page = 1
    chargerTopics()
}

function changerLimite(val) {
    limite = parseInt(val)
    page = 1
    chargerTopics()
}

function afficherPagination(total) {
    const conteneur = document.getElementById('pagination')
    if (!conteneur) return

    const totalPages = Math.ceil(total / limite)
    conteneur.innerHTML = ''

    const select = document.createElement('select')
    select.className = 'page-size'
    select.onchange = () => changerLimite(select.value)
    ;[10, 20, 30].forEach(n => {
        const opt = document.createElement('option')
        opt.value = n
        opt.textContent = `${n} par page`
        opt.selected = n === limite
        select.appendChild(opt)
    })
    conteneur.appendChild(select)

    if (totalPages <= 1) return

    if (page > 1) {
        const prev = document.createElement('button')
        prev.className = 'page-btn'
        prev.textContent = '←'
        prev.onclick = () => { page--; chargerTopics() }
        conteneur.appendChild(prev)
    }

    for (let i = 1; i <= totalPages; i++) {
        const btn = document.createElement('button')
        btn.className = 'page-btn' + (i === page ? ' actif' : '')
        btn.textContent = i
        btn.onclick = () => { page = i; chargerTopics() }
        conteneur.appendChild(btn)
    }

    if (page < totalPages) {
        const next = document.createElement('button')
        next.className = 'page-btn'
        next.textContent = '→'
        next.onclick = () => { page++; chargerTopics() }
        conteneur.appendChild(next)
    }
}
