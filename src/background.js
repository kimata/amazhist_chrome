log.setLevel('trace')

var port_to_ctrl = null

var tab_id_map = {
    ctrl: null,
    worker: null
}

var event_map = {
    onload: null
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

    chrome.tabs.onRemoved.addListener(function (tabid, removed) {
        if (tabid == tab_id_map['ctrl']) {
            chrome.tabs.remove(tab_id_map['worker'])
        }
    })
})

function send_status(message) {
    port_to_ctrl.postMessage(message + '\n')
}

function error(message) {
    send_status('エラーが発生しました．')
    send_status(message)

    log.error('エラーが発生しました．')
    log.trace(message)
}

function hist_page_url(year, page) {
    return (
        'https://www.amazon.co.jp/gp/your-account/order-history/?orderFilter=year-' +
        year +
        '&startIndex=' +
        (page - 1) * 10
    )
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
    return cmd_request_parse(
        {
            type: 'parse',
            target: 'detail'
        },
        order['url'],
        '',
        function (response) {
            return response
        }
    )
}

async function detail_page_list_parse(detail_page_list, send_response) {
    send_status('　　' + detail_page_list['list'].length + '件の注文があります．')

    order_list = []

    var done = 0
    for (detail_page of detail_page_list['list']) {
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
    send_status('　　注文リストの解析を完了しました．')

    send_response({
        list: order_list,
        is_last: detail_page_list['is_last']
    })

    if (detail_page_list['is_last']) {
        send_status(detail_page_list['year'] + '年の注文の解析を完了しました．')
    }
}

function cmd_request_parse(cmd, url, message, post_exec) {
    if (message !== '') {
        send_status(message)
    }

    return new Promise(function (resolve, reject) {
        event_map['onload'] = function () {
            chrome.tabs.sendMessage(tab_id_map['worker'], cmd, function (response) {
                event_map['onload'] = null
                if (typeof response === 'string') {
                    error(response)
                    reject()
                }
                resolve(post_exec(response))
            })
        }
        chrome.tabs.update(tab_id_map['worker'], { url: url })
    })
}

function cmd_handle_parse(cmd, send_response) {
    if (cmd['target'] === 'year_list') {
        message = '注文がある年を解析します．'
        url = hist_page_url(2020, 1) // ダミー
        post_exec = function (response) {
            send_status('　　' + response['list'].length + '年分の注文リストが見つかりました．')
            send_response(response)
        }
    } else if (cmd['target'] === 'list') {
        message = '注文リストを解析します．(' + cmd['year'] + '年, page ' + cmd['page'] + ')'
        url = hist_page_url(cmd['year'], cmd['page'])
        post_exec = function (response) {
            response['year'] = cmd['year']
            detail_page_list_parse(response, send_response)
        }
    } else {
        error('未知のコマンドです．')
        return
    }

    cmd_request_parse(cmd, url, message, post_exec)
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
