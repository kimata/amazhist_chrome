document.getElementById('start').onclick = function () {
    chrome.runtime.sendMessage({ type: 'port' }, function () {
        chrome.runtime.sendMessage(
            {
                type: 'parse',
                target: 'list',
                year: 2018,
                page: 1
            },
            function (response) {
                console.log(response)
            }
        )
    })
}

chrome.runtime.onConnect.addListener(function (port) {
    port.onMessage.addListener(function (msg) {
        document.getElementById('log').value += msg
    })
})
