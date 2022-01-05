importScripts('loglevel.min.js')

log.setLevel('trace')

const RETRY_COUNT = 2

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
        chrome.tabs.update(tab_id_map[type] , {autoDiscardable: false});
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

chrome.action.onClicked.addListener(function (tab) {
    tab_open('ctrl', 'ctrl/index.htm')
    tab_open('worker', 'https://www.amazon.co.jp/', false)

    chrome.tabs.onRemoved.addListener(function (tabid, removed) {
        if (tabid == tab_id_map['ctrl']) {
            chrome.tabs.remove(tab_id_map['worker'])
        }
    })
})

function send_status(message, nl = true) {
    if (nl) {
        message += '\n'
    }
    port_to_ctrl.postMessage(message)
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
            event_map['onload'] = null
        }
    }
})

function sleep(sec) {
    return new Promise((resolve) => setTimeout(resolve, sec * 1000))
}

async function cmd_request_parse(cmd, url, message, post_exec, fail_count = 0) {
    if (fail_count != 0) {
        await sleep(2)
    }

    if (message !== '') {
        send_status(message, false)
    }

    return new Promise(function (resolve, reject) {
        event_map['onload'] = function () {
            chrome.tabs.sendMessage(tab_id_map['worker'], cmd, function (response) {
                event_map['onload'] = null
                if (typeof response === 'string' || typeof response === 'undefined') {
                    error(response)
                    reject()
                }
                resolve(post_exec(response))
            })
        }
        chrome.tabs.update(tab_id_map['worker'], { url: url })
    }).catch(function (error) {
        fail_count += 1

        if (fail_count < RETRY_COUNT) {
            send_status('エラーが発生したのでリトライします．')
            return cmd_request_parse(cmd, url, message, post_exec, fail_count)
        }
    })
}

async function cmd_handle_parse(cmd, send_response) {
    if (cmd['target'] === 'year_list') {
        message = '注文がある年を解析します．\n'
        url = hist_page_url(2020, 1) // ダミー
        post_exec = function (response) {
            send_status('　　' + response['list'].length + '年分の注文リストが見つかりました．')
            send_response(response)
        }
    } else if (cmd['target'] === 'order_count') {
        message = cmd['year'] + '年の注文件数を解析します．\n'
        url = hist_page_url(cmd['year'], 1)
        post_exec = function (response) {
            send_status('　　' + response['count'] + '件の注文が見つかりました．')
            response['year'] = cmd['year']
            send_response(response)
        }
    } else if (cmd['target'] === 'list') {
        message = cmd['year'] + '年の注文リストを解析します．(p.' + cmd['page'] + ' / ' + cmd['page_total'] + ')\n'
        url = hist_page_url(cmd['year'], cmd['page'])
        post_exec = function (response) {
            response['year'] = cmd['year']
            send_response(response)
        }
    } else if (cmd['target'] === 'detail') {
        message = cmd['index'] + 1 + '件目． '
        if ((cmd['mode'] & 0x01) != 0) {
            message = '　　' + message
        }
        if ((cmd['mode'] & 0x10) != 0) {
            message += '\n'
        }
        url = cmd['url']
        post_exec = function (response) {
            response['date'] = cmd['date']
            send_response(response)
        }
        await sleep(1)
    } else {
        error('未知のコマンドです．\n')
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
