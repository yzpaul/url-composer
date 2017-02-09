/**
 * @module url-composer
 * @description Module to build dynamic URLs without a fuss
 */

//
// Path analysis regular expressions
//

/**
 * Trailing slash regular expression
 * @private
 */
const TRAILING_SLASH = /\/$/
/**
 * Leading slash regular expression
 * @private
 */
const LEADING_SLASH = /^\//
/**
 * Parentheses global regular expression
 * @private
 */
const PARENTHESES = /[\(\)]/g
/**
 * Optional parameters global regular expression
 * @private
 */
const OPTIONAL_PARAMS = /\((.*?)\)/g
/**
 * Splat parameters global regular expression
 * @private
 */
const SPLAT_PARAMS = /\*\w+/g
/**
 * Named parameter regular expression
 * @private
 */
const NAMED_PARAM = /(\(\?)?:\w+/
/**
 * Named parameters global regular expression
 * @private
 */
const NAMED_PARAMS = /(\(\?)?:\w+/g
/**
 * Some wierd escape regular expression
 * @private
 */
const ESCAPE = /[\-{}\[\]+?.,\\\^$|#\s]/g

//
// Helper functions
//

/**
 * Checks if a given object is an array
 *
 * @private
 *
 * @param  {mixed} obj The object to check
 * @return {boolean}   `true` if `obj` is an array else `false`
 */
function isArray (obj) {
  return Object.prototype.toString.call(obj) === '[object Array]'
}

/**
 * Check if a given object is empty
 *
 * @private
 *
 * @param  {object} obj The object to check
 * @return {boolean}    `true` if `obj` is empty else `false`
 */
function isEmpty (obj) {
  if (obj == null) return true
  if (obj.length > 0) return false
  if (obj.length === 0) return true
  if (typeof obj !== 'object') return true

  for (let key in obj) {
    if (hasOwnProperty.call(obj, key)) return false
  }

  return true
}

//
// ## Path parsing functions
//

/**
 * Inject arguments into a dynamic path definition and clean unused optional parts
 *
 * @private
 *
 * @param  {string} path The dynamic path definition
 * @param  {mixed}  args Object or array of arguments to inject.
 *                       If it is an array, arguments will be injected in sequential order.
 *                       For an object, the object keys will be used to map values to the dynamic parts of the path.
 * @return {string}      The parsed path with injected arguments
 */
function parse (path, args) {
  path = path || ''
  args = args || []

  if (isEmpty(args)) {
    return removeOptionalParams(path)
  }

  path = replaceArgs(path, args)

  return removeTrailingSlash(
    removeParentheses(path)
  )
}

/**
 * Replace dynamic parts of a path by given values
 *
 * @private
 *
 * @param  {string} path The dynamic path definition
 * @param  {mixed}  args Object or array of arguments to inject.
 *                       If it is an array, arguments will be injected in sequential order.
 *                       For an object, the object keys will be used to map values to the dynamic parts of the path.
 * @return {string}      Path with injected arguments
 */
function replaceArgs (path, args) {
  args = args || []

  if (!isArray(args)) {
    const paramNames = path.match(NAMED_PARAMS)
    args = paramNames.map(name => args[name.substr(1)])
  }

  args.forEach(arg => {
    path = replaceArg(path, arg)
  })

  const matches = path.match(OPTIONAL_PARAMS)

  if (matches) {
    matches.forEach(part => {
      if (isNamedOrSplatParam(part)) {
        path = path.replace(part, '')
      }
    })
  }

  return path
}

/**
 * Replace the first matching dynamic part of a path by the given argument
 *
 * @private
 *
 * @param  {string} path The dynamic path definition
 * @param  {mixed}  arg  The value to inject
 * @return {string}      The modified path
 */
function replaceArg (path, arg) {
  const hasNamedParam = path.indexOf(':') !== -1
  arg = encodeURIComponent(arg)

  if (hasNamedParam) {
    return path.replace(NAMED_PARAM, arg)
  }

  return path.replace(SPLAT_PARAMS, arg)
}

/**
 * Check if the next dynamic part in a path is a named or splat parameter definition
 *
 * @private
 *
 * @param  {string} param Dynamic part of a dynamic path definition
 * @return {boolean}      `true` if `param` is a named or splat parameter else `false`
 */
function isNamedOrSplatParam (param) {
  return NAMED_PARAM.test(param) || SPLAT_PARAMS.test(param)
}

/**
 * Strip the unfilled optional parameters from a dynamic path definition
 *
 * @private
 *
 * @param  {string} path The dynamic path to modify
 * @return {string}      The modified path
 */
function removeOptionalParams (path) {
  return path.replace(OPTIONAL_PARAMS, '')
}

/**
 * Remove the last character from a path if it is a slash
 *
 * @private
 *
 * @param  {string} path The path to modify
 * @return {string}      The modified path
 */
function removeTrailingSlash (path) {
  return path.replace(TRAILING_SLASH, '')
}

/**
 * Remove the first character from a path if it is a slash
 *
 * @private
 *
 * @param  {string} path The path to modify
 * @return {string}      The modified path
 */
function removeLeadingSlash (path) {
  return path.replace(LEADING_SLASH, '')
}

/**
 * Remove/clean remaining parentheses from a path after it has been parsed
 *
 * @private
 *
 * @param  {string} path The path to modify/clean
 * @return {string}      The modified path
 */
function removeParentheses (path) {
  return path.replace(PARENTHESES, '')
}

/**
 * Smart concatenation of host, path, query and hash. Will add the correct glue character when needed
 *
 * @private
 *
 * @param  {object} options Object describing the url
 * @return {string}         Concatenation of host, path, query and hash
 */
function smartConcat (options) {
  let { host, path, query, hash } = options

  // Normalize parts
  host = removeTrailingSlash(host)
  path = removeTrailingSlash(removeLeadingSlash(path))

  // Add specific glue characters
  path = path ? `/${path}` : ''
  query = query ? `?${query}` : ''
  hash = hash ? `#${hash}` : ''

  return `${host}${path}${query}${hash}`
}

/**
 * Test the existence of certain fields in the stats
 *
 * @private
 *
 * @param  {array}  params List of analyzed parameters
 * @param  {string} field  Name of the field to analyze
 * @return {array}         Filtered array
 */
function testParameter (params, field) {
  const result = []

  for (let i = 0; i < params.length; i++) {
    let p = params[i]
    if (p[field] && p.value === '') {
      result.push(p)
    }
  }

  return result
}

//
// ## Public API functions
//

/**
 * Retrieve matches for named and splat params for a dynamic path definition
 *
 * @name match
 * @function
 * @public
 *
 * @param  {string} path Dynamic path definition
 * @return {object}      Object with a `named` and `splat` array containing the extracted parameter names
 */
function getParamsMatch (path) {
  return {
    named: path.match(NAMED_PARAMS) || [],
    splat: path.match(SPLAT_PARAMS) || []
  }
}

/**
 * Transform a dynamic path definition to an executable regular expression
 *
 * @name regex
 * @function
 * @public
 *
 * @param  {string} route The route/path to transform
 * @return {RegExp}       The resulting regular expression instance
 */
function routeToRegex (route) {
  route = route.replace(ESCAPE, '\\$&')
    .replace(OPTIONAL_PARAMS, '(?:$1)?')
    .replace(NAMED_PARAMS, (match, optional) => optional ? match : '([^/?]+)')
    .replace(SPLAT_PARAMS, '([^?]*?)')

  return new RegExp('^' + route + '(?:\\?([\\s\\S]*))?$')
}

/**
 * Build the path part of a URL using dynamic path definitions
 *
 * @name path
 * @function
 * @public
 *
 * @param  {object} options An object containing `path` and `params` keys which will be used to build the resulting path.
 * @return {string}         The built path
 */
function buildPath (options) {
  options = options || {}

  return parse(options.path, options.params)
}

/**
 * Build the query part of a URL
 *
 * @name query
 * @function
 * @public
 *
 * @param  {object} options An object containing a `query` key. The `key` should be an object of key/value pairs that
 *                          will be converted to a URL query string.
 * @return {string}         Encoded URL query string
 */
function buildQuery (options) {
  const query = []
  options = options || {}

  for (let key in options.query) {
    const param = options.query[key]
    query.push(`${key}=${encodeURIComponent(param)}`)
  }

  return query.length ? query.join('&') : ''
}

/**
 * Test a URL against a dynamic path definition
 *
 * @public
 *
 * @param  {object} options An object with `path` and `url` keys.
 *                          The `path` is the dynamic path definition against which the `url` will be tested
 * @return {boolean}        `true` if `url` matches the `path` else `false`
 */
function test (options) {
  options = options || {}

  const re = routeToRegex(options.path)

  return re.test(options.url)
}

/**
 * Build a complete URL
 *
 * @public
 *
 * @param  {object} options An object containing `host`, `path`, `params`, `query` and `hash`.
 *                          Everything is optional, calling `build` without any parameters will just return an empty string.
 * @return {string}         The built URL
 *
 * @TODO Split host and protocol
 */
function build (options) {
  options = options || {}
  options.host = options.host || ''

  const path = buildPath(options)
  const query = buildQuery(options)

  return smartConcat({ host: options.host, path, query, hash: options.hash })
}

/**
 * Transform an arguments array into an object using the dynamic path definition
 *
 * @name params
 * @function
 * @public
 *
 * @param  {string} path The dynamic path definition
 * @param  {array}  args Arguments array
 * @return {object}      The resulting key/value pairs
 */
function paramsArray2Object (path, args) {
  const result = {}
  const params = getParamsMatch(path)

  let i = 0

  params.named.forEach(parse)
  params.splat.forEach(parse)

  return result

  // Helper

  function parse (name) {
    result[name.slice(1)] = args[i++]
  }
}

/**
 * Generate stats about a path
 *
 * @public
 *
 * @param  {string} path Dynamic path definition
 * @param  {object} args Object of arguments to analyze the state of path if it was injected with the given parameters
 * @return {object}      Object containing different stats about the path
 */
function stats (path, args) {
  const optional = path.match(OPTIONAL_PARAMS) || []
  const { named, splat } = getParamsMatch(path)

  let params = named.concat(splat)

  args = args || {}

  if (isArray(args)) {
    args = paramsArray2Object(path, args)
  }

  params = params.map((param) => {
    let isOptional = false

    for (let i = 0; i < optional.length; i++) {
      const p = optional[i]
      if (p.indexOf(param) !== -1) {
        isOptional = true
        break
      }
    }

    return {
      name: param,
      value: args[param.slice(1)] || '',
      optional: isOptional,
      required: !isOptional
    }
  })

  return {
    params,
    hasOptionalParams: OPTIONAL_PARAMS.test(path),
    missingOptionalParams: testParameter(params, 'optional'),
    missingRequiredParams: testParameter(params, 'required'),
    missingParams: testParameter(params, 'name')
  }
}

export default {
  build,
  test,
  stats,
  params: paramsArray2Object,
  path: buildPath,
  query: buildQuery,
  regex: routeToRegex,
  match: getParamsMatch
}
