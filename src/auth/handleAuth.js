const { ipcRenderer } = require("electron")
const submitBtn = document.querySelector('button')
const lisenceKey = document.getElementById('lisence_key')
const helper = document.getElementById('lisence_help')

document.addEventListener('DOMContentLoaded', () => lisenceKey.focus())

submitBtn.addEventListener('click', CheckLisence)

lisenceKey.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        CheckLisence()
    }
})

function CheckLisence() {
    ipcRenderer.send('lisence-filled', data = lisenceKey.value)
}

ipcRenderer.on('loading', (event, loading) => {
    submitBtn.innerHTML = loading ? `<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
    <span role="status">Loading...</span>` : 'Submit'
    lisenceKey.disabled = loading ? true : false
})

ipcRenderer.on('error-found', (event, msg) => {
    helper.style.color = 'red';
    helper.textContent = msg
})
