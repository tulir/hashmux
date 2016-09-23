# Hashmux
An URL hash to JavaScript function router

Hashmux is a bit like HTTP multiplexers such as [gorilla/mux](https://github.com/gorilla/mux), but it's client-side.
Instead of routing HTTP requests, Hashmux routes changes in the hash part of the URL to JavaScript functions.

## Examples
Once you've installed and included hashmux, you can create a Hashmux object and add some routes
```javascript
var router = new Hashmux()
router.handle("/", indexHandler)
router.handle("/products", listProductsHandler)
router.handle("/blog", blogHandler)
```

Hashmux supports more advanced routing too. The variables are given to the function as a map (well, actually an array with string keys).
```javascript
function getBlogPostHandler(params) {
	// params["name"]
	// params.name
}

router.handle("/products/{id:[0-9]+}", getProductHandler)
router.handle("/blog/post/{name}", getBlogPostHandler)
```

If you want to allow anything after a certain path, you can simply add a trailing slash. Everything after the trailing slash in requests is put in the params array with numeric indexes.

If you want to handle some specific paths separately, be sure to leave the more generic handler last.
```javascript
function helpHandler(params) {
	// Request path: example.com/#/help/foo/bar
	// params: {0: "foo", 1: "bar"}
}

function idHelpHandler(params) {
	// Request path: example.com/#/help/123/bar
	// params: {name: "123", 0: bar}
}

router.handle("/help/{id:[0-9]+}/", idHelpHandler)
router.handle("/help/", helpHandler)
```

If Hashmux doesn't find any suitable path handler for a specific request path, it calls the 404 error handler. You can change and add error handlers with `router.handleError(errorCode, handlerFunc)`.

The argument is an object. It will always contain the `page` variable if the error was triggered from within Hashmux.

You can also trigger errors from elsewhere using `router.error(errorCode, data)`
```javascript
router.handleError(404, function(data) {
	console.log("Oh noes!", data.page, "was not found")
})

...

router.error(404, {page: "/foo/bar"})
```
