var chart_order = null

function chart_order_update() {
    if (chart_order == null) {
        return
    }
    chart_order.update()
}

function chart_order_create(order_info) {
    ctrl_elem = document.getElementById('chart_ctrl')
    ctrl_elem.onclick = function () {
        chart_order_update()
    }
    ctrl_elem.style.display = 'block'

    if (chart_order != null) {
        chart_order.destroy();
    }

    chart_order = new Chart(document.getElementById('chart_order'), {
        type: 'bar',
        data: {
            labels: order_info['year_list'].reverse().map((year) => {
                return year + '年'
            }),
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
                    position: 'left',
                    suggestedMin: 0,
                    suggestedMax: 10,
                    grid: {
                        display: false
                    },
                    ticks: {
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
                    position: 'right',
                    suggestedMin: 0,
                    suggestedMax: 10000,
                    ticks: {
                        callback: function (value, index, values) {
                            if (document.getElementById('chart_display_price').checked) {
                                return value.toLocaleString() + '円'
                            } else {
                                return ''
                            }
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            if (context.datasetIndex == 0) {
                                return context.parsed.y.toLocaleString() + '件'
                            } else {
                                return context.parsed.y.toLocaleString() + '円'
                            }
                        }
                    }
                }
            }
        }
    })
}
