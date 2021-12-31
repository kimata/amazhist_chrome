log.setLevel("trace");

function hist_page_url(year, page) {
    return "https://www.amazon.co.jp/gp/css/order-history?" +
        "digitalOrders=1&unifiedOrders=1&orderFilter=year-" + year + "&startIndex=" + page
}

event_map = {
    onload: null,
}

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (tab.status === 'complete') {
        log.trace(event_map['onload']);
        if (event_map['onload'] != null) {
            // event_map['onload']();

            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'parse',
                    target: 'list'
                }, function(result) {
                    log.trace("background callback");
                    log.info(result);
                });
            });

        }
    }
});



chrome.runtime.onMessage.addListener(function (cmd, sender, sendResponse) {
    log.trace(cmd);

    if (cmd['type'] === 'parse') {
        event_map['onload'] = function() {
            chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {
                    type: 'parse',
                    target: 'list'
                }, function(result) {
                    log.trace("background callback");
                    result.then(log.trace);
                });
            });
        };
        chrome.tabs.update({url: hist_page_url(cmd["year"], cmd["page"])});
    } else {
        log.warn({
            msg: 'Unknown cmd type',
            cmd: cmd
        });
    }
    sendResponse({ test: "AA"});
});

