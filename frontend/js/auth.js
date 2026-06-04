function getToken() {
    return localStorage.getItem('token')
}

function getUser() {
    const data = localStorage.getItem('user')
    return data ? JSON.parse(data) : null
}

function estConnecte() {
    return !!getToken()
}

const _dansPagesFolder = window.location.pathname.includes('/pages/')
const _versPages  = _dansPagesFolder ? '' : 'pages/'
const _versRacine = _dansPagesFolder ? '../' : ''

function deconnecter() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = _versRacine + 'index.html'
}

function majNavbarAuth() {
    const zone = document.getElementById('nav-auth')
    const btnNouveauTopic = document.getElementById('btn-nouveau-topic')
    if (!zone) return

    const user = getUser()

    if (estConnecte() && user) {
        let lienAdmin = ''
        if (user.role === 'admin') {
            lienAdmin = `<a href="${_versPages}admin.html" class="btn-outline">Dashboard</a>`
        }

        zone.innerHTML = `
            <span style="font-size:0.88rem;color:var(--texte-doux)">
                Bonjour, <strong>${user.pseudo}</strong>
            </span>
            ${lienAdmin}
            <button class="btn-outline" onclick="deconnecter()">Déconnexion</button>
        `
        if (btnNouveauTopic) btnNouveauTopic.style.display = 'inline-block'
    } else {
        zone.innerHTML = `
            <a href="${_versPages}login.html" class="btn-outline">Connexion</a>
            <a href="${_versPages}register.html" class="btn-gradient">S'inscrire</a>
        `
        if (btnNouveauTopic) btnNouveauTopic.style.display = 'none'
    }
}

majNavbarAuth()
