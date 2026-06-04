const params  = new URLSearchParams(window.location.search)
const topicId = params.get('id')

if (!estConnecte() || !topicId) {
    window.location.href = '../index.html'
}

document.getElementById('lien-retour').href = `topic.html?id=${topicId}`
document.getElementById('btn-annuler').href  = `topic.html?id=${topicId}`

let tagsSelectionnes = []

document.addEventListener('DOMContentLoaded', async () => {
    await chargerTopic()
    await chargerTags()
})

async function chargerTopic() {
    const res = await apiFetch(`/topic/${topicId}`)
    if (!res || !res.ok) {
        document.getElementById('alerte-erreur').textContent = 'Topic introuvable.'
        document.getElementById('alerte-erreur').classList.add('visible')
        return
    }

    let topic = await res.json()
    if (topic.topic) topic = topic.topic

    const user = getUser()
    if (user.id !== topic.id_utilisateur && user.role !== 'admin') {
        window.location.href = `topic.html?id=${topicId}`
        return
    }

    document.getElementById('titre').value = topic.titre
    document.getElementById('corps').value = topic.corps
    document.getElementById('sous-titre-edit').textContent = `Topic #${topicId}`

    tagsSelectionnes = (topic.tags || []).map(t => t.id)
}

async function chargerTags() {
    const res = await apiFetch('/tags')
    const conteneur = document.getElementById('tags-selection')
    if (!res || !res.ok) return

    const tags = await res.json()
    conteneur.innerHTML = ''

    tags.forEach(tag => {
        const btn = document.createElement('button')
        btn.type        = 'button'
        btn.className   = 'tag-choix'
        btn.textContent = '# ' + tag.nom
        btn.dataset.id  = tag.id

        if (tagsSelectionnes.includes(tag.id)) btn.classList.add('selectionne')

        btn.onclick = () => toggleTag(tag.id, btn)
        conteneur.appendChild(btn)
    })
}

function toggleTag(id, btn) {
    const index = tagsSelectionnes.indexOf(id)
    if (index === -1) {
        tagsSelectionnes.push(id)
        btn.classList.add('selectionne')
    } else {
        tagsSelectionnes.splice(index, 1)
        btn.classList.remove('selectionne')
    }
}

async function sauvegarderTopic(e) {
    e.preventDefault()

    const titre = document.getElementById('titre').value.trim()
    const corps = document.getElementById('corps').value.trim()

    document.querySelectorAll('.form-erreur').forEach(el => el.classList.remove('visible'))
    document.getElementById('alerte-erreur').classList.remove('visible')

    let ok = true
    if (titre.length < 3) {
        document.getElementById('err-titre').textContent = 'Titre trop court.'
        document.getElementById('err-titre').classList.add('visible')
        ok = false
    }
    if (corps.length < 10) {
        document.getElementById('err-corps').textContent = 'Contenu trop court.'
        document.getElementById('err-corps').classList.add('visible')
        ok = false
    }
    if (!ok) return

    const btn = document.getElementById('btn-submit')
    btn.disabled = true
    btn.textContent = 'Sauvegarde...'

    const res = await apiFetch(`/topic/${topicId}`, {
        method: 'PUT',
        body: JSON.stringify({ titre, corps, tags: tagsSelectionnes })
    })

    btn.disabled = false
    btn.textContent = 'Sauvegarder'

    if (!res || !res.ok) {
        const data = res ? await res.json() : null
        document.getElementById('alerte-erreur').textContent = data?.message || 'Erreur lors de la sauvegarde.'
        document.getElementById('alerte-erreur').classList.add('visible')
        return
    }

    window.location.href = `topic.html?id=${topicId}`
}
