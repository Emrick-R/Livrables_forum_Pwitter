const BASE_URL = 'http://localhost:8080/api'

async function apiFetch(route, options = {}) {
    const token = getToken()

    const headers = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    const config = {
        ...options,
        headers: { ...headers, ...(options.headers || {}) }
    }

    try {
        const res = await fetch(BASE_URL + route, config)

        // On redirige sur 401 uniquement si ce n'est PAS la connexion ou l'inscription
        // 401 sur /connexion = mauvais mot de passe, pas un token expiré
        if (res.status === 401 && route !== '/connexion' && route !== '/inscription') {
            deconnecter()
            return null
        }

        return res
    } catch (err) {
        console.error('Erreur réseau :', err)
        return null
    }
}