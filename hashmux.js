// hashmux - An URL hash -> JavaScript function router
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

var regexEscape = /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g
var anythingRegex = "([^/]+?)"
var intRegex = "([0-9]+)"
var floatRegex = "([0-9\\.]+)"

function PageSystem(notfound) {
	"use strict"
	this.handlers = []
	this.notfound = notfound
}

function Handler(args, regex, func) {
	"use strict"
	if (args === undefined) {
		args = []
	}
	this.args = args
	this.regex = new RegExp(regex, "")
	this.func = func
}

PageSystem.prototype.addHandler = function(path, func) {
	"use strict"
	if (path === undefined || path.length === 0) {
		path = "/"
	} else if (typeof(path) === "function") {
		func = path
		path = "/"
	}
	var pieces = path.split("/").slice(1)
	var regex = []
	var args = []
	pieces.forEach(function(obj, i) {
		if (obj.charAt(0) === '{' && obj.charAt(obj.length - 1) === '}') {
			obj = obj.slice(1, obj.length - 1)
			var parts = obj.split(",")
			if (parts.length > 1) {
				args[args.length] = parts[0]
				switch(parts[1]) {
				case "int":
					regex[i] = intRegex
					break
				case "float":
					regex[i] = floatRegex
					break
				case "string":
					regex[i] = anythingRegex
					break
				}
			} else {
				regex[i] = anythingRegex
				args[args.length] = obj
			}
		} else {
			regex[i] = obj.replace(regexEscape, "\\$&");
		}
	})
	this.handlers[this.handlers.length] = new Handler(args, "^\\/" + regex.join("\\/") + "\\/?$", func)
}

PageSystem.prototype.update = function() {
	"use strict"
	var hash = window.location.hash
	if (hash.length === 0) {
		hash = "#/"
	}

	hash = hash.substr(1)
	for(var i = 0; i < this.handlers.length; i++) {
		var handler = this.handlers[i]
		if (handler === undefined) {
			continue
		}
		var match = handler.regex.exec(hash)
		if (match !== null && match.length !== 0) {
			var map = {}
			match = match.slice(1)
			for(var i = 0; i < handler.args.length; i++) {
				map[handler.args[i]] = match[i]
			}
			handler.func(map)
			return
		}
	}
	if (this.notfound !== undefined) {
		this.notfound(hash)
	}
}

PageSystem.prototype.listen = function() {
	"use strict"
	var pages = this
	window.onhashchange = function() {
		pages.update()
	}
	this.update()
}
