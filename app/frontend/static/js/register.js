if (estConnecte()) {
    window.location.href = '/'
}

async function sInscrire(e) {
    e.preventDefault()

    const pseudo       = document.getElementById('pseudo').value.trim()
    const email        = document.getElementById('email').value.trim()
    const motDePasse   = document.getElementById('motDePasse').value
    const confirmation = document.getElementById('motDePasseConfirm').value

    reinitialiserErreurs()

    if (!validerFormulaire(pseudo, email, motDePasse, confirmation)) return

    const btnSubmit    = document.getElementById('btn-submit')
    const alerteErreur = document.getElementById('alerte-erreur')
    const alerteSucces = document.getElementById('alerte-succes')

    btnSubmit.disabled = true
    btnSubmit.textContent = 'Création...'

    const res = await apiFetch('/inscription', {
        method: 'POST',
        body: JSON.stringify({ username: pseudo, email, password_hash: motDePasse })
    })

    btnSubmit.disabled = false
    btnSubmit.textContent = 'Créer mon compte'

    if (!res) {
        afficherAlerteErreur('Impossible de contacter le serveur.')
        return
    }

    const data = await res.json()

    if (!res.ok) {
        afficherAlerteErreur(data.message || 'Une erreur est survenue lors de l\'inscription.')
        return
    }

    alerteSucces.textContent = 'Compte créé avec succès ! Redirection...'
    alerteSucces.classList.add('visible')

    setTimeout(() => {
        window.location.href = '/connexion'
    }, 1800)
}

function validerFormulaire(pseudo, email, motDePasse, confirmation) {
    let valide = true

    if (!/^[a-zA-Z0-9]+$/.test(pseudo)) {
        afficherErreur('err-pseudo', 'Le pseudo ne doit contenir que des lettres et des chiffres.')
        valide = false
    }

    if (!email.includes('@') || !email.includes('.')) {
        afficherErreur('err-email', 'Adresse mail invalide.')
        valide = false
    }

    if (motDePasse.length < 8) {
        afficherErreur('err-mdp', 'Le mot de passe doit faire au moins 8 caractères.')
        valide = false
    } else if (!/[A-Z]/.test(motDePasse)) {
        afficherErreur('err-mdp', 'Le mot de passe doit contenir au moins une majuscule.')
        valide = false
    } else if (!/[^a-zA-Z0-9]/.test(motDePasse)) {
        afficherErreur('err-mdp', 'Le mot de passe doit contenir au moins un caractère spécial.')
        valide = false
    }

    if (motDePasse !== confirmation) {
        afficherErreur('err-confirm', 'Les mots de passe ne correspondent pas.')
        valide = false
    }

    return valide
}

function afficherErreur(id, message) {
    const el = document.getElementById(id)
    if (!el) return
    el.textContent = message
    el.classList.add('visible')
}

function afficherAlerteErreur(message) {
    const el = document.getElementById('alerte-erreur')
    el.textContent = message
    el.classList.add('visible')
}

function reinitialiserErreurs() {
    document.querySelectorAll('.form-erreur').forEach(el => el.classList.remove('visible'))
    document.getElementById('alerte-erreur').classList.remove('visible')
    document.getElementById('alerte-succes').classList.remove('visible')
}