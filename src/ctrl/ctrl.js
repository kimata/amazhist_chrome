var start_time = null
var year_list = []
var year_done = 0
var item_list = []
var order_info = {
    total_count: 0,
    done_count: 0,
    total_price: 0
}

function init_status() {
    start_time = new Date()
    year_list = []
    year_done = 0
    item_list = []
    order_info = {
        total_count: 0,
        done_count: 0,
        total_price: 0
    }

    document.getElementById('log').value = ''
    notify_progress()
}

function notify_progress() {
    document.getElementById('order_count_done').innerText = order_info['done_count'].toLocaleString()
    document.getElementById('order_count_total').innerText = order_info['total_count'].toLocaleString()
    document.getElementById('order_price_total').innerText = order_info['total_price'].toLocaleString()

    var done_rate
    if (order_info['done_count'] == 0) {
        done_rate = 0
    } else {
        done_rate = (100 * order_info['done_count']) / order_info['total_count']
    }

    progress_bar = document.getElementById('progress_bar')
    progress_bar.innerText = Math.round(done_rate) + '%'
    progress_bar.style.width = Math.round(done_rate) + '%'

    if (done_rate > 0.1) {
        now = new Date()
        elapsed_sec = Math.round((now.getTime() - start_time.getTime()) / 1000)
        remaining_sec = (elapsed_sec / done_rate) * (100 - done_rate)

        var remaining_text
        if (remaining_sec < 300) {
            remaining_text = Math.round(remaining_sec) + '秒'
        } else {
            remaining_text = Math.round(remaining_sec / 60).toLocaleString() + '分'
        }

        document.getElementById('remaining_time').innerText = remaining_text
    } else {
        document.getElementById('remaining_time').innerText = '?'
    }
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

function async_loop(list, index, func, next) {
    return new Promise(function (resolve, reject) {
        if (index == list.length) {
            return resolve(false)
        }
        func(list[index], index, function () {
            return resolve(true)
        })
    }).then(function (is_continue) {
        if (is_continue) {
            return async_loop(list, index + 1, func, next)
        } else {
            next()
        }
    })
}

function get_detail_in_order(order, index, mode, callback) {
    chrome.runtime.sendMessage(
        {
            type: 'parse',
            target: 'detail',
            date: order['date'],
            index: index,
            mode: mode,
            url: order['url']
        },
        function (response) {
            order_info['done_count'] += 1
            for (item of response['list']) {
                item_list.push(item)
                order_info['total_price'] += item['price']
            }
            notify_progress()
            callback(response)
        }
    )
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
            return new Promise(function (resolve) {
                async_loop(
                    response['list'],
                    0,
                    function (order, index, order_callback) {
                        var mode
                        if (index == 0) {
                            mode = 0
                        } else if (index == response['list'].length - 1) {
                            mode = 1
                        } else {
                            mode = 2
                        }
                        get_detail_in_order(order, index, mode, order_callback)
                    },
                    function () {
                        if (response['is_last']) {
                            callback()
                        } else {
                            return get_item_in_year(year, page + 1, callback)
                        }
                    }
                )
            })
        }
    )
}

function get_order_count_in_year(year, callback) {
    chrome.runtime.sendMessage(
        {
            type: 'parse',
            target: 'order_count',
            year: year
        },
        function (response) {
            order_info['total_count'] += response['count']
            notify_progress()
            callback()
        }
    )
}

async function get_year_list() {
    new Promise((resolve) => {
        chrome.runtime.sendMessage(
            {
                type: 'parse',
                target: 'year_list'
            },
            function (response) {
                resolve(response['list'])
            }
        )
    })
        .then((year_list) => {
            return new Promise(function (resolve) {
                async_loop(
                    year_list,
                    0,
                    function (year, index, callback) {
                        get_order_count_in_year(year, callback)
                    },
                    function () {
                        resolve(year_list)
                    }
                )
            })
        })
        .then((year_list) => {
            return new Promise(function (resolve) {
                async_loop(
                    year_list,
                    0,
                    function (year, index, callback) {
                        get_item_in_year(year, 1, callback)
                    },
                    resolve
                )
            })
        })
        .then(() => {
            log_append('完了しました．\n')

            order_info['total_count'] = order_info['done_count']
            notify_progress()

            document.getElementById('start').disabled = false
        })
}

document.getElementById('start').onclick = function () {
    document.getElementById('start').disabled = true
    init_status()

    chrome.runtime.sendMessage({ type: 'port' }, function () {
        get_year_list()
    })
}

function log_append(msg) {
    var textarea = document.getElementById('log')
    textarea.value += msg
    textarea.scrollTop = textarea.scrollHeight
}

chrome.runtime.onConnect.addListener(function (port) {
    port.onMessage.addListener(log_append)
})
