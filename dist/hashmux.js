/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports) {

	// hashmux - An URL hash to JavaScript function router
	// Copyright (C) 2016 Tulir Asokan
	//
	// This program is free software: you can redistribute it and/or modify
	// it under the terms of the GNU General Public License as published by
	// the Free Software Foundation, either version 3 of the License, or
	// (at your option) any later version.
	//
	// This program is distributed in the hope that it will be useful,
	// but WITHOUT ANY WARRANTY; without even the implied warranty of
	// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	// GNU General Public License for more details.
	//
	// You should have received a copy of the GNU General Public License
	// along with this program.  If not, see <http://www.gnu.org/licenses/>.
	"use strict"

	const pieceMatcher = /\{([a-zA-Z]+?)(\:[^}]+?)?\}/
	const regexEscape = /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/

	class Hashmux {
		constructor() {
			this.handlers = []
			this.errors = {
				404: function(data){
					console.error("Page", data.page, "not found!")
				}
			}
		}

		error(err, data) {
			if (this.errors.hasOwnProperty(err)) {
				this.errors[err](data)
			} else {
				this.errors[520](data)
			}
		}

		handleError(errCode, func) {
			this.errors[errCode] = func
		}

		handle(path, func, caseSensitive) {
			if (path === undefined || path.length === 0) {
				path = "/"
			} else if (typeof(path) === "function") {
				func = path
				path = "/"
			}
			if (typeof(func) !== "function") {
				func = function() {
					console.error("No handler function provided for", path)
				}
			}

			var pieces = path.split("/").slice(1)
			var regex = []
			var args = []
			var flags = caseSensitive ? "i" : ""

			var trailingAnything = false
			if (pieces.length > 1 && pieces[pieces.length - 1].length === 0) {
				pieces = pieces.slice(0, pieces.length - 1)
				trailingAnything = true
			}

			pieces.forEach(function(piece, i) {
				var match = pieceMatcher.exec(piece)
				if (match !== null && match.length > 1) {
					match = match.slice(1)
					args[i] = match[0]
					if (match[1] !== undefined && match[1].length > 0) {
						regex[i] = new RegExp("^" + match[1].substr(1) + "$", flags)
					} else {
						regex[i] = new RegExp("^.+$", flags)
					}
				} else {
					regex[i] = new RegExp("^" + piece.replace(regexEscape, "\\$&") + "$", flags)
				}
			})
			this.handlers[this.handlers.length] = new Handler(args, regex, func, trailingAnything)
		}

		handleRaw(handler) {
			this.handlers[this.handlers.length] = handler
		}

		update() {
			var hash = window.location.hash
			if (hash.length === 0) {
				hash = "#/"
			}

			var parts = hash.split("/").slice(1)
			for(var i = 0; i < this.handlers.length; i++) {
				var handler = this.handlers[i]
				if (handler === undefined) {
					continue
				}
				var val = handler.handle(parts)
				if (val === undefined) {
					continue
				}
				var output = handler.func(val)
				if (output !== undefined && typeof(output) === "object") {
					output.page = hash.substr(1)
					if (output.status !== undefined && output.status !== 200) {
						this.error(output.status, output)
					}
				}
				return
			}
			this.error(404, {page: hash.substr(1)})
		}

		listen() {
			var mux = this
			window.onhashchange = function() {
				mux.update()
			}
			mux.update()
		}
	}

	class Handler {
		constructor(args, regex, func, trailingAnything) {
			if (args === undefined) {
				args = []
			}
			this.args = args
			this.regex = regex
			this.func = func
			this.trailingAnything = trailingAnything ? true : false
		}

		handle(parts) {
			if (this.regex.length > parts.length) {
				return undefined
			} else if (this.regex.length < parts.length && !this.trailingAnything) {
				return undefined
			}
			var values = []
			var i = 0
			for (; i < this.regex.length; i++) {
				var match = this.regex[i].exec(parts[i])
				if (match === null || match.length === 0) {
					return undefined
				}

				var key = values.length
				if (this.args.length > i && this.args[i] !== undefined) {
					key = this.args[i]
				}

				values[key] = match[0]
			}
			if (this.trailingAnything) {
				for(; i < parts.length; i++) {
					values[i] = parts[i]
				}
			}
			return values
		}
	}

	if (typeof module !== "undefined" && module.exports) {
		module.exports.Hashmux = Hashmux
		module.exports.Handler = Handler
	}


/***/ }
/******/ ]);