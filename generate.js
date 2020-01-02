const fs = require('fs');
const hbs = require('handlebars');
const path = require('path');

const config = require('./config.js');
const dbModel = require('./model.js');
const database = config.database;

const generatedItemsPath = path.join(__dirname, './generated.json');
const schemaPath = path.join(__dirname, './schema.json');
const apiPath = path.join(__dirname, config.serverApi);

let generatedItems = {};
let schema = null;

const argv = require('yargs')
  .alias('m', 'model')
  .alias('p', 'plural')
  .alias('o', 'outdir')
  .alias('c', 'component')
  .argv;

// console.log(argv);

const capitalize = s => {
  if (typeof s !== 'string') return '';
  return (
    s
      .toLowerCase()
      .charAt(0)
      .toUpperCase() + s.slice(1)
  );
};

// yargs
let model = argv.model || argv.schema || process.argv[2];
let modelPlural = argv.plural || model + 's';
let component = argv.component || capitalize(model);
let outdir = argv.outdir || config.outputDir;

try {
  let s = fs.readFileSync(schemaPath, 'utf-8');
  schema = JSON.parse(s);
} catch (err) {
  // console.log(err);
}


try {
  let s = fs.readFileSync(generatedItemsPath, 'utf-8');
  generatedItems = JSON.parse(s);
} catch (err) {
  generatedItems = {};
  // console.log(err);
}

if (model === 'all') {

  let all = '';
  Object.keys(generatedItems).forEach(k => {
    let m = generatedItems[k];
    let cmd = `yarn generate --model ${m.model} --plural ${m.models}`;
    all += cmd + '\n';
  })

  fs.writeFileSync('./genAll.sh', all, { encoding: 'utf-8' });

  process.exit();
}

if (!schema || model === 'schema') {
  dbModel.init(`127.0.0.1/${database}`).then(async () => {
    let res = null;

    if (!res || !res.length) {
      res = await dbModel.find('core_store', {
        query: { key_regex: 'plugin_content_manager_configuration_content_types' }
      });

      if (res && res.length) {
        let sch = {}

        res.forEach(r => {
          let k = r.key.replace('plugin_content_manager_configuration_content_types::', '')
          sch[k] = JSON.parse(r.value);
        })

        // console.log(JSON.stringify(res, null, 4));

        fs.writeFileSync(
          schemaPath,
          JSON.stringify(sch, null, 4)
        );
      }
    }
  });

  setTimeout(() => {
    process.exit(0);
  }, 1500);
  return;
}

// model settings
let settingsPath = path.join(apiPath, `${model}/models/${capitalize(model)}.settings.json`);
if (!fs.existsSync(settingsPath)) {
  settingsPath = path.join(apiPath, `${modelPlural}/models/${capitalize(modelPlural)}.settings.json`);
}

let apiSettings = JSON.parse(fs.readFileSync(settingsPath, { encoding: 'utf-8' }));

console.log(apiSettings);

const templates = {
  config: hbs.compile(
    fs.readFileSync(path.join(__dirname, '/template/config.js'), {
      encoding: 'utf-8'
    })
  ),
  routes: hbs.compile(
    fs.readFileSync(path.join(__dirname, '/template/routes.js'), {
      encoding: 'utf-8'
    })
  ),
  list: hbs.compile(
    fs.readFileSync(path.join(__dirname, '/template/list.js'), {
      encoding: 'utf-8'
    })
  ),
  detail: hbs.compile(
    fs.readFileSync(path.join(__dirname, '/template/detail.js'), {
      encoding: 'utf-8'
    })
  ),
  custom: hbs.compile(
    fs.readFileSync(path.join(__dirname, '/template/custom.js'), {
      encoding: 'utf-8'
    })
  )
};

const context = {
  model: `${model}`,
  modelId: `${model}Id`,
  models: `${modelPlural}`,
  modelComponent: `${component}`,
};

console.log(JSON.stringify({
  model,
  modelPlural,
  component,
  outdir
}, null, 4));

// prep
let dirPath = path.join(__dirname, `../src/${outdir}/${component}/`);
fs.mkdirSync(dirPath, { recursive: true });

// settings path

let res;

// console.log(modelSettings);
let configPath = path.join(dirPath, 'config.js');
let modelConfig = {}

// config file
try {
  if (fs.existsSync(configPath)) {
    modelConfig = require(configPath);
  } else {
    console.log('generating config');
    res = templates.config(context);
    console.log(res);
    fs.writeFile(configPath, res, {
      encoding: 'utf-8'
    }, ()=>{});
    modelConfig.lock = { custom: false };
  }
} catch(err) {
  console.error(err)
}

let lock = modelConfig.lock || {}
let modelSettings = schema[model] || schema[modelPlural];

context.title = modelConfig.title || component;

// routes
if (!lock.routes) {
  console.log('generating routes');
  res = templates.routes(context);
  fs.writeFileSync(path.join(dirPath, 'routes.js'), res, { encoding: 'utf-8' });
}

// detail
if (!lock.detail) {
  console.log('generating detail');
  res = templates.detail(context);
  fs.writeFileSync(path.join(dirPath, `${component}.js`), res, {
    encoding: 'utf-8'
  });
}

// list
if (!lock.list) {
  console.log('generating list');
  res = templates.list(context);
  fs.writeFileSync(path.join(dirPath, `${component}List.js`), res, {
    encoding: 'utf-8'
  });
}

// custom
if (!lock.custom) {
  console.log('generating custom');
  res = templates.custom(context);
  fs.writeFileSync(path.join(dirPath, `custom.js`), res, {
    encoding: 'utf-8'
  });
}

// field settings
{
  console.log('generating schema');

  // balance sizes
  modelSettings.layouts.edit.forEach(row => {
    // check 12 col
    let cols = 0;
    let total = 0;
    row.forEach(col => {
      total += col.size;
      cols++;
    });

    if (cols > 1 && total != 12) {
      row.forEach(col => {
        col.size = 12/cols;
      });    
    }
  });

  res = `export default ${JSON.stringify({ ...modelSettings, ...apiSettings}, null, 4)}`;
  fs.writeFileSync(path.join(dirPath, `schema.js`), res, { encoding: 'utf-8' });
}

{
  console.log('update generated items list');

  // save generated items
  generatedItems[model] = context;
  fs.writeFileSync(generatedItemsPath,  JSON.stringify(generatedItems, null, 4), { encoding: 'utf-8' });
}