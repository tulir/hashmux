babel = ./node_modules/.bin/babel
uglify = ./node_modules/.bin/uglifyjs

minify:
	mkdir -p dist
	$(babel) hashmux.js | $(uglify) -mco dist/hashmux.js

publish: minify
	git push && npm publish
