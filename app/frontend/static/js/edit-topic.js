const params  = new URLSearchParams(window.location.search)
const topicId = params.get('id')

if (!estConnecte() || !topicId) {
    window.location.href = '/'
}

document.getElementById('lien-retour').href = `/topic/${topicId}`
document.getElementById('btn-annuler').href  = `/topic/${topicId}`

let tagsSelectionnes = []
let topicTagNames    = []

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
    if (user.id !== topic.id_Users && !user.is_admin) {
        window.location.href = `/topic/${topicId}`
        return
    }

    document.getElementById('titre').value = topic.title
    document.getElementById('corps').value = topic.body
    document.getElementById('sous-titre-edit').textContent = `Topic #${topicId}`

    topicTagNames = topic.tags || []
}

async function chargerTags() {
    const res = await apiFetch('/tags')
    const conteneur = document.getElementById('tags-selection')
    if (!res || !res.ok) return

    const data = await res.json()
    const tags = data.tags || []
    conteneur.innerHTML = ''

    tags.forEach(tag => {
        const btn = document.createElement('button')
        btn.type        = 'button'
        btn.className   = 'tag-choix'
        btn.textContent = '# ' + tag.name
        btn.dataset.id  = tag.id_Tags

        if (topicTagNames.includes(tag.name)) {
            btn.classList.add('selectionne')
            tagsSelectionnes.push(tag.id_Tags)
        }

        btn.onclick = () => toggleTag(tag.id_Tags, btn)
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
        body: JSON.stringify({ title: titre, body: corps, tags: tagsSelectionnes })
    })

    btn.disabled = false
    btn.textContent = 'Sauvegarder'

    if (!res || !res.ok) {
        const data = res ? await res.json() : null
        document.getElementById('alerte-erreur').textContent = data?.message || 'Erreur lors de la sauvegarde.'
        document.getElementById('alerte-erreur').classList.add('visible')
        return
    }

    window.location.href = `/topic/${topicId}`
}