if (!estConnecte()) {
    window.location.href = '/connexion'
}

let tagsSelectionnes = []

document.addEventListener('DOMContentLoaded', () => {
    chargerTags()
})

async function chargerTags() {
    const res = await apiFetch('/tags')
    const conteneur = document.getElementById('tags-selection')

    if (!res || !res.ok) {
        conteneur.innerHTML = '<p style="color:var(--texte-doux);font-size:0.88rem">Impossible de charger les tags.</p>'
        return
    }

    const data = await res.json()
    const tags = data.tags || []
    conteneur.innerHTML = ''

    if (tags.length === 0) {
        conteneur.innerHTML = '<p style="color:var(--texte-doux);font-size:0.88rem">Aucun tag disponible. Crée-en un ci-dessous.</p>'
        return
    }

    tags.forEach(tag => conteneur.appendChild(creerBoutonTag(tag)))
}

function creerBoutonTag(tag) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'tag-choix'
    btn.textContent = '# ' + tag.name
    btn.dataset.id = tag.id_Tags
    btn.onclick = () => toggleTag(tag.id_Tags, btn)
    return btn
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

async function ajouterNouveauTag() {
    const input = document.getElementById('nouveau-tag-input')
    const nom = input.value.trim()

    if (!nom) return

    const dejaPresent = [...document.querySelectorAll('.tag-choix')]
        .some(btn => btn.textContent.toLowerCase() === '# ' + nom.toLowerCase())

    if (dejaPresent) {
        input.value = ''
        return
    }

    const res = await apiFetch('/tags', {
        method: 'POST',
        body: JSON.stringify({ name: nom })
    })

    if (!res || !res.ok) {
        alert('Impossible de créer ce tag.')
        return
    }

    const data = await res.json()
    const tag = { id_Tags: data.idTag, name: nom }
    const conteneur = document.getElementById('tags-selection')
    const btn = creerBoutonTag(tag)
    conteneur.appendChild(btn)

    toggleTag(tag.id_Tags, btn)
    input.value = ''
}

function mettreAJourCompteur() {
    const corps = document.getElementById('corps').value
    document.getElementById('compteur').textContent = corps.length
}

async function creerTopic(e) {
    e.preventDefault()

    const titre = document.getElementById('titre').value.trim()
    const corps = document.getElementById('corps').value.trim()

    reinitialiserErreurs()

    if (!valider(titre, corps)) return

    const btnSubmit = document.getElementById('btn-submit')
    btnSubmit.disabled = true
    btnSubmit.textContent = 'Publication...'

    const res = await apiFetch('/topic', {
        method: 'POST',
        body: JSON.stringify({ title: titre, body: corps, tags: tagsSelectionnes })
    })

    btnSubmit.disabled = false
    btnSubmit.textContent = 'Publier le topic'

    if (!res || !res.ok) {
        const data = res ? await res.json() : null
        afficherAlerteErreur(data?.message || 'Erreur lors de la création du topic.')
        return
    }

    const data = await res.json()
    window.location.href = `/topic/${data.idTopic}`
}

function valider(titre, corps) {
    let ok = true

    if (titre.length < 3) {
        document.getElementById('err-titre').textContent = 'Le titre doit faire au moins 3 caractères.'
        document.getElementById('err-titre').classList.add('visible')
        ok = false
    }

    if (corps.length < 10) {
        document.getElementById('err-corps').textContent = 'Le contenu doit faire au moins 10 caractères.'
        document.getElementById('err-corps').classList.add('visible')
        ok = false
    }

    if (tagsSelectionnes.length === 0) {
        document.getElementById('err-tags').textContent = 'Sélectionne au moins un tag.'
        document.getElementById('err-tags').classList.add('visible')
        ok = false
    }

    return ok
}

function afficherAlerteErreur(message) {
    const el = document.getElementById('alerte-erreur')
    el.textContent = message
    el.classList.add('visible')
}

function reinitialiserErreurs() {
    document.querySelectorAll('.form-erreur').forEach(el => el.classList.remove('visible'))
    document.getElementById('alerte-erreur').classList.remove('visible')
}