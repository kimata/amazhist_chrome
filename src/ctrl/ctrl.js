var year_list = []
var year_done = 0
var item_list = []

function iniit_status() {
    year_list = []
    year_done = 0
    item_list = []

    document.getElementById('log').value = ''
    document.getElementById('item_count').innerText = item_list.length.toLocaleString()
}

function getNewFileHandle() {
    const options = {
        types: [
            {
                description: 'JSON Files',
                accept: {
                    'text/json': ['.json']
                }
            }
        ]
    }
    return window.showSaveFilePicker(options)
}

async function write(data) {
    const handle = await getNewFileHandle()

    const writable = await handle.createWritable()
    await writable.write(JSON.stringify(data))
    await writable.close()
}

document.getElementById('save').onclick = function () {
    write(item_list)
}

function get_item_in_year(year, page, callback) {
    chrome.runtime.sendMessage(
        {
            type: 'parse',
            target: 'list',
            year: year,
            page: page
        },
        function (response) {
            for (item of response['list']) {
                item_list.push(item)
            }
            document.getElementById('item_count').innerText = item_list.length.toLocaleString()
            if (response['is_last']) {
                callback()
            } else {
                get_item_in_year(year, page + 1, callback)
            }
        }
    )
}

document.getElementById('start').onclick = function () {
    document.getElementById('start').disabled = true
    iniit_status()

    chrome.runtime.sendMessage({ type: 'port' }, function () {
        get_item_in_year(2001, 1, function () {
            console.log(JSON.stringify(item_list))
        })
    })
}

function log_append(msg) {
    var textarea = document.getElementById('log')
    textarea.value += msg + '\n'
    textarea.scrollTop = textarea.scrollHeight
}

chrome.runtime.onConnect.addListener(function (port) {
    port.onMessage.addListener(log_append)
})
