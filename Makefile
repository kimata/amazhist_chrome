all:
	./node_modules/.bin/prettier --write src/background.js
	./node_modules/.bin/prettier --write src/content.js
	./node_modules/.bin/prettier --write src/ctrl/ctrl.css
	./node_modules/.bin/prettier --write src/ctrl/ctrl.js
	./node_modules/.bin/prettier --write src/ctrl/index.htm

archive:
	git archive HEAD:src --output=amazhist_chrome.zip --prefix=amazhist_chrome/

gif:
	ffmpeg -i input.mp4 -filter_complex "[0:v] fps=10,scale=1024:-1:flags=lanczos,split [a][b];[a] palettegen [p];[b][p] paletteuse" output.gif
