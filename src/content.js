document.xpath = function (expression) {
    ret = document.evaluate(expression, document)

    switch (ret.resultType) {
        case 1:
            return ret.numberValue
        case 2:
            return ret.stringValue
        case 3:
            return ret.booleanValue
        case 4:
        case 5:
            var v = []
            while ((e = ret.iterateNext())) {
                v.push(e)
            }
            return v
        default:
            return ret
    }
}

function order_list_page_parse() {
    const order_count = document.xpath('count(//div[contains(@class, " order ")])')
    log.info({ order_count: order_count })

    detail_page_list = []
    for (var i = 0; i < order_count; i++) {
        const parent_xpath = '//div[contains(@class, " order ")][' + (i + 1) + ']'
        const date = document
            .xpath(parent_xpath + '//div[contains(@class, "order-info")] // span[contains(@class, "value")]')[0]
            .innerText.trim()
        const url = document.xpath(parent_xpath + '//a[contains(text(), "注文内容を表示")]')[0].href

        detail_page_list.push({
            date: date,
            url: url
        })
    }
    return detail_page_list
}

function order_item_page_parse(parent_xpath) {
    const link = document.xpath(
        parent_xpath + '//div[contains(@class, "a-col-right")]//a[contains(@class, "a-link-normal")]'
    )[0]

    const name = link.innerText
    const url = link.href
    const asin = url.match(new RegExp('/gp/product/([^/]+)/'))[1]

    const price_str = document.xpath(
        parent_xpath + '//div[contains(@class, "a-row")]/span[contains(@class, "a-color-price")]'
    )[0].innerText
    const price = parseInt(price_str.replace(',', '').match(new RegExp('[\\d,]+'))[0], 10)

    const seller_str = document.xpath(
        parent_xpath +
            '//div[contains(@class, "a-row")]/span[contains(@class, "a-size-small") and contains(text(), "販売:")]'
    )[0].innerText
    const seller = seller_str.match(new RegExp('販売:\\s+(.+)$'))[1]

    const img_url = document.xpath(parent_xpath + '//div[contains(@class, "item-view-left-col-inner")]//img')[0]
        .currentSrc

    const count_num = document.xpath(
        parent_xpath + '//div[contains(@class, "item-view-left-col-inner")]//span[contains(@class, "item-view-qty")]'
    )[0]

    var count = 1
    if (count_num != undefined) {
        count = parseInt(count_num.innerText, 10)
    }

    return {
        name: name,
        url: url,
        asin: asin,
        count: count,
        price: price,
        seller: seller,
        img_url
    }
}

function order_detail_page_parse_normal() {
    log.info('通常注文')

    const item_total_count = document.xpath(
        'count(//div[contains(@class, "a-box shipment")]//div[contains(@class, "a-fixed-left-grid a-spacing-")])'
    )
    log.info({ item_total_count: item_total_count })

    var item_list = []

    const ship_count = document.xpath('count(//div[contains(@class, "a-box shipment")])')
    for (var i = 0; i < ship_count; i++) {
        const item_count = document.xpath(
            'count(//div[contains(@class, "a-box shipment")][' +
                (i + 1) +
                ']' +
                '//div[contains(@class, "a-fixed-left-grid a-spacing-")])'
        )
        for (var j = 0; j < item_count; j++) {
            const parent_xpath =
                '//div[contains(@class, "a-box shipment")][' +
                (i + 1) +
                ']' +
                '//div[contains(@class, "a-fixed-left-grid a-spacing-")][' +
                (j + 1) +
                ']'
            item = order_item_page_parse(parent_xpath)
            log.info({ item: item })

            item_list.push(item)
        }
    }

    log.info({ item_list: item_list })

    return item_list
}

function order_detail_page_parse_digital() {
    log.info('デジタル注文')

    const item_total_count = document.xpath(
        'count(//div[contains(@class, "a-box")]//div[contains(@class, "a-fixed-left-grid a-spacing-")])'
    )
    log.info({ item_total_count: item_total_count })

    var item_list = []

    const item_count = document.xpath(
        'count(//div[contains(@class, "a-box")]//div[contains(@class, "a-fixed-left-grid a-spacing-")])'
    )
    for (var i = 0; i < item_count; i++) {
        const parent_xpath =
            '//div[contains(@class, "a-box")]' +
            '//div[contains(@class, "a-fixed-left-grid a-spacing-")][' +
            (i + 1) +
            ']'
        item = order_item_page_parse(parent_xpath)
        log.info({ item: item })

        item_list.push(item)
    }

    log.info({ item_list: item_list })

    return item_list
}

function order_detail_page_parse() {
    if (document.xpath('count(//div[contains(@class, "a-box shipment")])') != 0) {
        return order_detail_page_parse_normal()
    } else {
        return order_detail_page_parse_digital()
    }
}

window.onload = function () {}

chrome.runtime.onMessage.addListener(function (cmd, sender, send_response) {
    log.trace(cmd)

    if (cmd['type'] === 'parse') {
        if (cmd['target'] === 'list') {
            send_response(order_list_page_parse())
        } else if (cmd['target'] === 'detail') {
            send_response(order_detail_page_parse())
        } else {
            log.error({
                msg: 'Unknown cmd target',
                cmd: cmd
            })
            send_response('ERROR: Unknown cmd target')
        }
    } else {
        log.error({
            msg: 'Unknown cmd type',
            cmd: cmd
        })
        send_response('ERROR: Unknown cmd type')
    }
    return true
})
