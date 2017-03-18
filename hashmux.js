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
const pieceMatcher = /\{([a-zA-Z]+?)(:[^}]+?)?\}/
const regexEscape = /[-[]\/\{\}\(\)\*\+\?\.\\\^\$\|]/

/**
 * An URL hash to JavaScript function router.
 */
class Hashmux {
	/**
	 * Create an instance of Hashmux.
	 */
	constructor() {
		this.oldHash = window.location.hash
		this.ignoreUpdate = false
		this.handlers = []
		this.specialHandlers = {
			prehandle: () => {},
			posthandle: () => {},
		}
		this.errors = {
			404: (data) => console.error("Page", data.page, "not found!"),
		}
	}

	/**
	 * Run handlers for a certain error. If the error has no handlers, the
	 * handler for error 520 will be run instead.
	 *
	 * @param {number} err  The error code.
	 * @param {Object} data The data of the error.
	 */
	error(err, data) {
		if (this.errors.hasOwnProperty(err)) {
			this.errors[err](data)
		} else {
			this.errors[520](data)
		}
	}

	/**
	 * Register an error handler.
	 *
	 * @param {number} errCode The error code.
	 * @param {func}   func    The handler function.
	 */
	handleError(errCode, func) {
		this.errors[errCode] = func
	}

	/**
	 * Register a path handler.
	 *
	 * @param {string} path            The path in Hashmux format.
	 * @param {func}   func            The handler function.
	 * @param {bool}   [caseSensitive] Whether or not the path should be case-
	 *                                 sensitive.
	 */
	handle(path, func, caseSensitive) {
		if (path === undefined || path.length === 0) {
			path = "/"
		} else if (typeof (path) === "function") {
			func = path
			path = "/"
		}
		if (typeof (func) !== "function") {
			func = function() {
				console.error("No handler function provided for", path)
			}
		}

		let pieces = path.split("/").slice(1)
		const regex = []
		const args = []
		const flags = caseSensitive ? "i" : ""

		let trailingAnything = false
		if (pieces.length > 1 && pieces[pieces.length - 1].length === 0) {
			pieces = pieces.slice(0, pieces.length - 1)
			trailingAnything = true
		}

		pieces.forEach((piece, index) => {
			let match = pieceMatcher.exec(piece)
			if (match !== null && match.length > 1) {
				match = match.slice(1)
				args[index] = match[0]
				if (match[index] !== undefined && match[1].length > 0) {
					regex[index] = new RegExp(`^${match[1].substr(1)}$`, flags)
				} else {
					regex[index] = new RegExp("^.+$", flags)
				}
			} else {
				regex[index] = new RegExp(
						`^${piece.replace(regexEscape, "\\$&")}$`, flags)
			}
		})
		this.handlers.push(new Handler(args, regex, func, trailingAnything))
	}

	/**
	 * Register a Hashmux handler.
	 *
	 * @param {Handler} handler The handler object to register.
	 */
	handleRaw(handler) {
		this.handlers.push(handler)
	}

	/**
	 * Call the handler for the current path.
	 *
	 * This is automatically called from window.onhashchange if
	 * {@link Hashmux#listen} has been called.
	 */
	update() {
		if (this.ignoreUpdate) {
			this.ignoreUpdate = false
			return
		}

		let hash = window.location.hash
		if (hash.length === 0) {
			hash = "#/"
		}

		const parts = hash.split("/").slice(1)
		for (const handler of this.handlers) {
			const val = handler.handle(parts)
			if (val === undefined) {
				continue
			}
			if (this.specialHandlers.prehandle(hash, val)) {
				this.ignoreUpdate = true
				window.location.hash = this.oldHash
				return
			}
			const output = handler.func(val)
			this.oldHash = hash
			if (this.specialHandlers.posthandle(hash, val, output)) {
				return
			}
			if (output !== undefined && typeof (output) === "object") {
				output.page = hash.substr(1)
				if (output.status !== undefined && output.status !== 200) {
					this.error(output.status, output)
				}
			}
			return
		}
		this.error(404, { page: hash.substr(1) })
	}

	/**
	 * Register {@link Hashmux#update} as the hash change function and then call
	 * {@link Hashmux#update}.
	 */
	listen() {
		window.onhashchange = () => this.update()
		this.update()
	}
}

/**
 * A Hashmux path handler.
 */
class Handler {
	/**
	 * Create a new Hashmux page handler.
	 *
	 * @param {string[]} args  The arguments in the path.
	 * @param {Regex}   regex The regex to match paths.
	 * @param {func}     func  The handler function.
	 * @param {bool}     trailingAnything If false, only exact matches will
	 *                                    pass. If true, it's enough that the
	 *                                    beginning of the path matches the
	 *                                    given regex.
	 */
	constructor(args, regex, func, trailingAnything) {
		if (args === undefined) {
			args = []
		}
		this.args = args
		this.regex = regex
		this.func = func
		this.trailingAnything = !!trailingAnything
	}

	/**
	 * Try to match the regex of this Handler with the given parts and return
	 * the values if matched.
	 *
	 * @param   {string[]} parts The parts of the path.
	 * @returns {Object}         The arguments.
	 */
	handle(parts) {
		if (this.regex.length > parts.length) {
			return undefined
		} else if (this.regex.length < parts.length && !this.trailingAnything) {
			return undefined
		}
		const values = []
		let i = 0
		for (; i < this.regex.length; i++) {
			const match = this.regex[i].exec(parts[i])
			if (match === null || match.length === 0) {
				return undefined
			}

			let key = values.length
			if (this.args.length > i && this.args[i] !== undefined) {
				key = this.args[i]
			}

			values[key] = decodeURIComponent(match[0])
		}
		if (this.trailingAnything) {
			for (; i < parts.length; i++) {
				values[i] = decodeURIComponent(parts[i])
			}
		}
		return values
	}
}

if (typeof module !== "undefined" && module.exports) {
	module.exports = { Hashmux, Handler }
}
