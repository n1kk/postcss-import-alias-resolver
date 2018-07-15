const fse = require('fs-extra')
const path = require('path')

let logLevel = {
	none: 0,
	fail: 1,
	match: 2,
	all: 3,
}

let arrayUnique = (...args) => {
	let res = []
	args.forEach(arr => {
		if (Array.isArray(arr))
			arr.forEach(el => {
				if (!res.includes(el))
					res.push(el)
			})
	})
	return res
}

module.exports = function (config = {}) {
	
	let {
		alias,
    extensions,// = ['.css'],
    modules,// = ['node_modules'],
		
    onResolve,
    onFail,
    
		webpackConfig,
		mergeAlias = 'extend',
		mergeModules = 'extend',
		mergeExtensions = 'replace',
		
		dontPrefix,
		logging = 'none'
	} = config
	
	logging = typeof logging === 'string'
		? logLevel[logging]
		: typeof logging === 'number'
			? logging
			: logLevel.fail
	
  if (webpackConfig && webpackConfig.resolve) {
    alias = !alias
      ? webpackConfig.resolve.alias
      : mergeAlias === 'extend'
        ? {...webpackConfig.resolve.alias, ...alias}
        : alias
    
    extensions = !extensions
      ? webpackConfig.resolve.extensions
      : mergeExtensions === 'extend'
        ? arrayUnique(extensions,  webpackConfig.resolve.extensions)
        : extensions
    
    modules = !modules
      ? webpackConfig.resolve.modules
      : mergeModules === 'extend'
        ? arrayUnique(modules, webpackConfig.resolve.modules)
        : modules
  }
  
  extensions = extensions || ['.css']
  modules = modules || ['node_modules']
	
	if (!dontPrefix) {
		alias = Object.entries(alias).reduce((acc, [alias, _path]) => {
			if (!alias.startsWith('~') && alias !== '~')
				acc['~' + alias] = _path
			else
				acc[alias] = _path
			return acc
		}, {})
	}
  
  extensions = [''].concat(extensions)
	
	let aliases = Object.keys(alias)
	
	let log = {}
	Object.keys(logLevel).forEach(level => {
		log[level] = (logging >= logLevel[level])
			? (id, ...args) => console[level==='fail'?'warn':'log'](`[Import Resolver] ${id}:`, ...args)
			: () => {}
	})
	
	return function resolve(id, basedir) {
		return new Promise(async (resolve, rej) => {
		  let res = (path) => {
		    if (onResolve) {
          let res = onResolve(id, basedir, path)
          if (typeof res === "string")
            path = res
        }
        resolve(path)
      }
		  
			log.all(id)
   
			log.all(id, 'looking in aliases')
			for (let [aliasName, aliasPath] of Object.entries(alias)) {
				log.all(id, 'looking in aliases', aliasName)
				if (id.startsWith(aliasName + path.sep)) {
					log.match(id, 'matched alias', aliasName, aliasPath)
          for (let ext of extensions) {
            let importPath = path.resolve(path.join(aliasPath, id.substring(aliasName.length) + ext))
            if (await fse.pathExists(importPath)) {
              log.match(id, 'found file', importPath)
              return res(importPath)
            }
            log.fail(id, 'file not found', importPath)
          }
				}
			}
			log.all(id, 'no matches with aliases')
			
			if (id.startsWith('~')) {
				log.all(id, 'looking in modules')
				for (let modulePah of modules) {
          for (let ext of extensions) {
            let importPath = path.resolve('./' + modulePah, id.substring(1) + ext)
            log.all(id, 'looking in', './' + modulePah)
            if (await fse.pathExists(importPath)) {
              log.match(id, 'found file', importPath)
              return res(importPath)
            }
          }
				}
				log.fail(id, 'no matches in modules')
			}
			
			let defPath = path.resolve(basedir, id)
      if (await fse.pathExists(defPath)) {
        log.match(id, 'found default', defPath)
        return res(defPath)
      } else {
        log.fail(id, 'no match for default')
        if (onFail) {
          let res = onFail(id, basedir)
          if (typeof res === "string")
            defPath = res
        }
        return resolve(defPath)
      }
		})
	}
}
