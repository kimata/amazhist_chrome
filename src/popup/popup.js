document.getElementById("start").onclick = function() {
    chrome.runtime.sendMessage({
        type: "parse",
        target: "list",
        year: 2018,
        page: 1
    }, function(response) {
        console.log(response);
    });
};

