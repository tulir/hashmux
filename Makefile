minify:
	mkdir -p dist
	./node_modules/.bin/uglifyjs *.js -o dist/hashmux.min.js

publish: minify
	npm publish