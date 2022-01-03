all:
	./node_modules/.bin/prettier --write src/background.js
	./node_modules/.bin/prettier --write src/content.js
	./node_modules/.bin/prettier --write src/ctrl/ctrl.css
	./node_modules/.bin/prettier --write src/ctrl/ctrl.js
	./node_modules/.bin/prettier --write src/ctrl/index.htm

archive:
	git archive HEAD:src --output=amazhist_chrome.zip --prefix=amazhist_chrome/

