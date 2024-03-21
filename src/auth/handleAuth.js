const { ipcRenderer } = require("electron")
const submitBtn = document.querySelector('button')
const lisenceKey = document.getElementById('lisence_key')
const helper = document.getElementById('lisence_help')

document.addEventListener('DOMContentLoaded', () => lisenceKey.focus())

submitBtn.addEventListener('click', checkValid)

lisenceKey.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        checkValid()
    }
})

// TODO: Beautify the ui for validated
function checkValid() {
    if (!lisenceKey.value.trim()) {
        helper.textContent = 'Lisence Key Field cannot be empty';
        helper.style.color = 'red';
    } else {
        helper.textContent = 'Enter the valid lisence key';
        helper.style.color = '';
        ipcRenderer.send('lisence-filled', data = lisenceKey.value)
    }
}

ipcRenderer.on('loading', (event, loading) => {
    submitBtn.innerHTML = loading ? `<span class="spinner-border spinner-border-sm" aria-hidden="true"></span>
    <span role="status">Loading...</span>` : 'Submit'
    lisenceKey.disabled = loading ? true : false
})

ipcRenderer.on('valid', (event, msg) => {
    helper.style.color = 'red';
    helper.textContent = msg
})
