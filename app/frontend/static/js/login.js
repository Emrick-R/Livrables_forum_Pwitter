if (estConnecte()) {
    window.location.href = '/'
}

async function seConnecter(e) {
    e.preventDefault()

    const identifiant  = document.getElementById('identifiant').value.trim()
    const motDePasse   = document.getElementById('motDePasse').value
    const alerteErreur = document.getElementById('alerte-erreur')
    const btnSubmit    = document.getElementById('btn-submit')

    alerteErreur.classList.remove('visible')
    btnSubmit.disabled = true
    btnSubmit.textContent = 'Connexion...'

    const res = await apiFetch('/connexion', {
        method: 'POST',
        body: JSON.stringify({ email: identifiant, mdp: motDePasse })
    })

    btnSubmit.disabled = false
    btnSubmit.textContent = 'Se connecter'

    if (!res) {
        alerteErreur.textContent = 'Impossible de contacter le serveur.'
        alerteErreur.classList.add('visible')
        return
    }

    const data = await res.json()

    if (!res.ok) {
        alerteErreur.textContent = data.message || 'Identifiant ou mot de passe incorrect.'
        alerteErreur.classList.add('visible')
        return
    }

    localStorage.setItem('token', data.token)
    localStorage.setItem('user', JSON.stringify(decodeJWT(data.token)))

    window.location.href = '/'
}