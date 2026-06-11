const user = getUser()

if (!estConnecte() || !user || !user.is_admin) {
    window.location.href = '/'
}

document.addEventListener('DOMContentLoaded', () => {
    chargerTopicsAdmin()
})

function afficherSection(nom, btn) {
    document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('visible'))
    document.querySelectorAll('.admin-nav-btn').forEach(b => b.classList.remove('actif'))

    document.getElementById('section-' + nom).classList.add('visible')
    btn.classList.add('actif')

    if (nom === 'topics')       chargerTopicsAdmin()
    if (nom === 'utilisateurs') chargerUtilisateurs()
}

async function chargerTopicsAdmin() {
    const res = await apiFetch('/admin/topics')
    const tbody = document.getElementById('tbody-topics')

    if (!res || !res.ok) {
        tbody.innerHTML = celluleVide(4, 'Impossible de charger les topics.')
        return
    }

    const data = await res.json()
    const liste = Array.isArray(data) ? data : (data.topics || [])

    if (liste.length === 0) {
        tbody.innerHTML = celluleVide(4, 'Aucun topic.')
        return
    }

    tbody.innerHTML = ''
    liste.forEach(topic => tbody.appendChild(creerLigneTopic(topic)))
}

function creerLigneTopic(topic) {
    const tr = document.createElement('tr')

    const titre = document.createElement('td')
    titre.innerHTML = `<a href="/topic/${topic.id_Topics}" style="color:var(--bleu);font-weight:600">${topic.title}</a>`

    const auteur = document.createElement('td')
    auteur.textContent = topic.username || '—'

    const statut = document.createElement('td')
    statut.innerHTML = `
        <select onchange="changerStatutTopic(${topic.id_Topics}, this.value)">
            <option value="ouvert"  ${topic.status === 'ouvert'  ? 'selected' : ''}>Ouvert</option>
            <option value="fermé"   ${topic.status === 'fermé'   ? 'selected' : ''}>Fermé</option>
            <option value="archivé" ${topic.status === 'archivé' ? 'selected' : ''}>Archivé</option>
        </select>
    `

    const actions = document.createElement('td')
    actions.innerHTML = `
        <div class="admin-actions">
            <button class="btn-danger" onclick="supprimerTopicAdmin(${topic.id_Topics}, this)">Supprimer</button>
        </div>
    `

    tr.appendChild(titre)
    tr.appendChild(auteur)
    tr.appendChild(statut)
    tr.appendChild(actions)
    return tr
}

async function changerStatutTopic(id, nouveauStatut) {
    const res = await apiFetch(`/admin/topic/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nouveauStatut })
    })

    if (!res || !res.ok) {
        alert('Erreur lors du changement de statut.')
        chargerTopicsAdmin()
    }
}

async function supprimerTopicAdmin(id, btn) {
    if (!confirm('Supprimer ce topic et tous ses messages ?')) return

    btn.disabled = true
    btn.textContent = '...'

    const res = await apiFetch(`/admin/topic/${id}`, { method: 'DELETE' })

    if (!res || !res.ok) {
        alert('Erreur lors de la suppression.')
        btn.disabled = false
        btn.textContent = 'Supprimer'
        return
    }

    btn.closest('tr').remove()
}

async function chargerUtilisateurs() {
    const res = await apiFetch('/admin/users')
    const tbody = document.getElementById('tbody-utilisateurs')

    if (!res || !res.ok) {
        tbody.innerHTML = celluleVide(5, 'Impossible de charger les utilisateurs.')
        return
    }

    const data = await res.json()
    const liste = Array.isArray(data) ? data : (data.users || [])

    if (liste.length === 0) {
        tbody.innerHTML = celluleVide(5, 'Aucun utilisateur.')
        return
    }

    tbody.innerHTML = ''
    liste.forEach(u => tbody.appendChild(creerLigneUtilisateur(u)))
}

function creerLigneUtilisateur(u) {
    const tr = document.createElement('tr')
    tr.id = `user-row-${u.id_Users}`

    const estBanni = !!u.banned_at

    tr.innerHTML = `
        <td><strong>${u.username}</strong></td>
        <td style="color:var(--texte-doux)">${u.email}</td>
        <td style="color:var(--texte-doux)">${u.is_admin ? 'admin' : 'utilisateur'}</td>
        <td>
            <span class="${estBanni ? 'badge-banni' : 'badge-actif'}">
                ${estBanni ? 'Banni' : 'Actif'}
            </span>
        </td>
        <td>
            <div class="admin-actions">
                ${!u.is_admin ? `
                    <button
                        class="${estBanni ? 'btn-outline' : 'btn-danger'}"
                        style="font-size:0.82rem"
                        onclick="toggleBan(${u.id_Users}, ${estBanni}, this)"
                    >
                        ${estBanni ? 'Débannir' : 'Bannir'}
                    </button>
                ` : '<span style="color:var(--texte-doux);font-size:0.82rem">—</span>'}
            </div>
        </td>
    `

    return tr
}

async function toggleBan(id, estBanni, btn) {
    if (!confirm(`Voulez-vous ${estBanni ? 'débannir' : 'bannir'} cet utilisateur ?`)) return

    btn.disabled = true

    const res = await apiFetch(`/admin/user/${id}/ban`, { method: estBanni ? 'DELETE' : 'POST' })

    if (!res || !res.ok) {
        alert('Erreur lors de l\'opération.')
        btn.disabled = false
        return
    }

    const nouveauEtat = !estBanni
    const tr = document.getElementById(`user-row-${id}`)
    if (!tr) return

    const badge = tr.querySelector('span[class^="badge"]')
    if (badge) {
        badge.className   = nouveauEtat ? 'badge-banni' : 'badge-actif'
        badge.textContent = nouveauEtat ? 'Banni' : 'Actif'
    }

    btn.textContent    = nouveauEtat ? 'Débannir' : 'Bannir'
    btn.className      = nouveauEtat ? 'btn-outline' : 'btn-danger'
    btn.style.fontSize = '0.82rem'
    btn.disabled       = false
    btn.onclick        = () => toggleBan(id, nouveauEtat, btn)
}

function celluleVide(colspan, message) {
    return `<tr><td colspan="${colspan}" style="text-align:center;color:var(--texte-doux);padding:30px">${message}</td></tr>`
}