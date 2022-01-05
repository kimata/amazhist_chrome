// ステータスメッセージ関係

function status_info(msg, nl = true) {
    if (nl) {
        msg += '\n'
    }

    var textarea = document.getElementById('status')
    textarea.value += msg
    textarea.scrollTop = textarea.scrollHeight
}

function status_error(msg) {
    status_info('[ERROR]' + msg, true)
    log.trace(msg)
}
