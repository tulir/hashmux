minify:
	mkdir -p dist
	./node_modules/.bin/webpack

publish: minify
	git push && npm publish
