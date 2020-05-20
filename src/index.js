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
    moduleFields,// = ['main'],
		
    onResolve,
    onFail,
    
    // TODO: add module filename option eg 'index' 'main' '$FOLDER_NAME'
    // TODO: add module info filename list eg 'package.json'
    
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
  moduleFields = moduleFields || ['main']
	
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
  
  async function findFile(_path) {
    if (await fse.pathExists(_path))
      return _path
    for (let ext of extensions)
      if (await fse.pathExists(_path + ext))
        return _path + ext
  }
  
  async function isDir(_path) {
    let stat = await fse.lstat(_path)
    return stat.isDirectory()
  }
  
  async function findModule(_path) {
    if (await fse.pathExists(_path) && await isDir(_path)) {
      let pkgPath = path.resolve(_path, 'package.json')
      if (await fse.pathExists(pkgPath)) {
        let pkg = await fse.readFile(pkgPath, 'utf8')
        let json = JSON.parse(pkg)
        for (let field of moduleFields) {
          if (json[field]) {
            let packageFile = path.resolve(_path, json[field])
            let filepath = await findFile(packageFile)
            if (filepath)
              return filepath
          }
        }
      } else {
        let indexPath = path.resolve(_path, 'index')
        let filepath = await findFile(indexPath)
        if (filepath)
          return filepath
      }
    } else {
      let filepath = await findFile(_path)
      if (filepath)
        return filepath
    }
  }
  
  
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
				  if (id.startsWith(aliasName + '/') || id.startsWith(aliasName + '\\')) {
					log.match(id, 'matched alias', aliasName, aliasPath)
          let importPath = path.resolve(path.join(aliasPath, id.substring(aliasName.length)))
          let filepath = await findFile(importPath)
          if (filepath) {
            log.match(id, 'found file', filepath)
            return res(filepath)
          }
          log.fail(id, 'file not found', importPath)
				}
			}
			log.all(id, 'no matches with aliases')
			
			if (id.startsWith('~')) {
				log.all(id, 'looking in modules')
				for (let modulePah of modules) {
          let importPath = path.resolve('./' + modulePah, id.substring(1))
          log.all(id, 'looking in', './' + modulePah)
          let filepath = await findModule(importPath)
          if (filepath) {
            log.match(id, 'found file', filepath)
            return res(filepath)
          }
				}
				log.fail(id, 'no matches in modules')
			}
			
			let defPath = path.resolve(basedir, id)
      let filepath = await findFile(defPath)
      if (filepath) {
        log.match(id, 'found default', filepath)
        return res(filepath)
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
