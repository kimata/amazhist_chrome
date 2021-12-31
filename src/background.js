log.setLevel('trace')

var port_to_ctrl = null

var tab_id_map = {
    ctrl: null,
    worker: null
}

function tab_open_impl(type, url, active = true) {
    chrome.tabs.create({ url: url, active: active }, function (tab) {
        tab_id_map[type] = tab.id
    })
}

function tab_open(type, url, active = true) {
    if (tab_id_map[type] == null) {
        tab_open_impl(type, url, active)
    } else {
        chrome.tabs.get(tab_id_map[type], function (tab) {
            if (typeof tab === 'undefined') {
                tab_open_impl(type, url, active)
            }
        })
        return
    }
}

chrome.browserAction.onClicked.addListener(function () {
    tab_open('ctrl', 'ctrl/index.htm')
    tab_open('worker', 'https://www.amazon.co.jp/', false)

    chrome.tabs.onRemoved.addListener(function(tabid, removed) {
        if (tabid == tab_id_map['ctrl']) {
            chrome.tabs.remove(tab_id_map['worker']);
        }
    })
})

function send_status(message) {
    port_to_ctrl.postMessage(message + '\n')
}

function hist_page_url(year, page) {
    return (
        'https://www.amazon.co.jp/gp/css/order-history?' +
        'digitalOrders=1&unifiedOrders=1&orderFilter=year-' +
        year +
        '&startIndex=' +
        page
    )
}

event_map = {
    onload: null
}

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (tab.status === 'complete') {
        if (event_map['onload'] != null) {
            event_map['onload']()
        }
    }
})

function sleep(sec) {
    return new Promise((resolve) => setTimeout(resolve, sec * 1000))
}

function detail_page_parse(order) {
    return new Promise(function (resolve, reject) {
        event_map['onload'] = function () {
            chrome.tabs.sendMessage(
                tab_id_map['worker'],
                {
                    type: 'parse',
                    target: 'detail'
                },
                function (response) {
                    event_map['onload'] = null
                    if (typeof response === 'string') {
                        log.error(response)
                        reject()
                    }
                    resolve(response)
                }
            )
        }
        chrome.tabs.update(tab_id_map['worker'], { url: order['url'] })
    })
}

async function detail_page_list_parse(detail_page_list, send_response) {
    send_status('　　' + detail_page_list.length + '件の注文があります．')

    order_list = []

    var done = 0
    for (detail_page of detail_page_list) {
        for (order of await detail_page_parse(detail_page)) {
            order_list.push(order)
        }
        done++
        send_status('　　　　' + done + '件目の注文を解析しました．')

        await sleep(2)
        break
    }

    if (done != detail_page_list.length) {
        log.warn('Lost some detail page(s): expect=' + detail_page_list.length + ', actual=' + done)
    }
    send_status('　　注文リストの解析を完了しました．');
    send_response(order_list);
}

function cmd_handle_parse(cmd, send_response) {
    send_status('注文リストを解析します．(' + cmd['year'] + '年, page ' + cmd['page'] + ')')
    event_map['onload'] = function () {
        chrome.tabs.sendMessage(
            tab_id_map['worker'],
            {
                type: 'parse',
                target: 'list'
            },
            function (response) {
                event_map['onload'] = null
                if (typeof response === 'string') {
                    log.error(response)
                    return
                }
                detail_page_list_parse(response, send_response)
            }
        )
    }
    chrome.tabs.update(tab_id_map['worker'], { url: hist_page_url(cmd['year'], cmd['page']) })
}

function cmd_handle_port(cmd, send_response) {
    name = 'port to ctrl'
    port_to_ctrl = chrome.runtime.connect({ name: name })
    send_response()
}

chrome.runtime.onMessage.addListener(function (cmd, sender, send_response) {
    if (cmd['type'] === 'port') {
        cmd_handle_port(cmd, send_response)
    } else if (cmd['type'] === 'parse') {
        cmd_handle_parse(cmd, send_response)
    } else {
        log.warn({
            msg: 'Unknown cmd type',
            cmd: cmd
        })
        send_response('Unknown cmd type')
    }

    return true // NOTE: enable send_response
})
