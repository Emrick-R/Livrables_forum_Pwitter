function toggleTheme() {
    const html = document.documentElement
    const actuel = html.getAttribute('data-theme')
    const nouveau = actuel === 'dark' ? 'light' : 'dark'

    html.setAttribute('data-theme', nouveau)
    localStorage.setItem('theme', nouveau)
    mettreAJourIconeTheme(nouveau)
}

function mettreAJourIconeTheme(theme) {
    const btn = document.getElementById('btn-theme')
    if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙'
}

const themeSauvegarde = localStorage.getItem('theme') || 'light'
document.documentElement.setAttribute('data-theme', themeSauvegarde)
mettreAJourIconeTheme(themeSauvegarde)