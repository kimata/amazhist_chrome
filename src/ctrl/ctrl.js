var start_time = null
var item_list = null
var order_info = null
var chart_price = null

function init_status() {
    start_time = new Date()
    item_list = []
    order_info = {
        year_list: [],
        count_total: 0,
        count_done: 0,
        price_total: 0,
        by_year: {}
    }

    document.getElementById('log').value = ''
    notify_progress()
}

function year_index(year) {
    index = 0
    for (y of order_info['year_list']) {
        if (y == year) {
            return index
        }
        index++
    }
}

function notify_progress() {
    document.getElementById('order_count_done').innerText = order_info['count_done'].toLocaleString()
    document.getElementById('order_count_total').innerText = order_info['count_total'].toLocaleString()
    document.getElementById('order_price_total').innerText = order_info['price_total'].toLocaleString()

    var done_rate
    if (order_info['count_done'] == 0) {
        done_rate = 0
    } else {
        done_rate = (100 * order_info['count_done']) / order_info['count_total']
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
    if (chart_price != null) {
        chart_price.update()
    }
}

function chart_init() {
    chart_price = new Chart(document.getElementById('chart_price'), {
        type: 'bar',
        data: {
            labels: order_info['year_list'].reverse(),
            datasets: [
                {
                    label: '注文件数',
                    yAxisID: 'count',
                    data: order_info['by_year']['count'].reverse(),
                    backgroundColor: '#ffc107'
                },
                {
                    label: '注文金額',
                    yAxisID: 'price',
                    data: order_info['by_year']['price'].reverse(),
                    backgroundColor: '#fd7e14'
                }
            ]
        },
        options: {
            responsive: true,
            title: {
                display: true,
                text: '合計購入金額'
            },
            scales: {
                count: {
                    title: {
                        text: '件数',
                        display: true
                    },
                    type: 'linear',
                    position: 'right',
                    suggestedMin: 0,
                    suggestedMax: 10,
                    grid: {
                        display: false
                    },
                    ticks: {
                        align: 'end',
                        callback: function (value, index, values) {
                            return value.toLocaleString() + '件'
                        }
                    }
                },
                price: {
                    title: {
                        text: '金額',
                        display: true
                    },
                    type: 'linear',
                    position: 'left',
                    suggestedMin: 0,
                    suggestedMax: 10000,
                    ticks: {
                        callback: function (value, index, values) {
                            return value.toLocaleString() + '円'
                        }
                    }
                }
            }
        }
    })
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

// 実行順序を保ちながら非同期でリストに対して処理を実行
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

function get_detail_in_order(order, index, mode, year, callback) {
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
            order_info['count_done'] += 1
            for (item of response['list']) {
                item_list.push(item)
                order_info['price_total'] += item['price']
                order_info['by_year']['count'][year_index(year)] += item['price']
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
            page: page,
            page_total: Math.ceil(order_info['by_year']['count'][year_index(year)] / 10)
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
                        get_detail_in_order(order, index, mode, year, order_callback)
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
            order_info['count_total'] += response['count']
            order_info['by_year']['count'][year_index(year)] = response['count']

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
                order_info['year_list'] = response['list']

                order_info['by_year']['count'] = new Array(order_info['year_list'].length)
                order_info['by_year']['price'] = new Array(order_info['year_list'].length)

                chart_init()
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
                        year_list = resolve(year_list)
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

            order_info['count_total'] = order_info['count_done']
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
