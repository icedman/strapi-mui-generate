'use strict';

const mongoose = require('mongoose');
const ObjectID = require('mongodb').ObjectID;
const models = {};

function getModel(m) {
  if (!models[m]) {
    models[m] = mongoose.model(
      m,
      new mongoose.Schema(
        {},
        {
          strict: false,
          timestamps: true
        }
      ),
      m
    );
  }

  let model = models[m];
  return model;
}

function initDB(configUri) {
  mongoose.Promise = global.Promise;

  return new mongoose.Promise(function(resolve, reject) {
    mongoose.connect('mongodb://' + configUri, { useNewUrlParser: true });

    var db = mongoose.connection;
    db.on('error', console.error.bind(console, 'connection error:'));
    db.once('open', function callback() {
      console.log('db connection open');
      resolve();
    });
  });
}

const find = async function(m, ctx) {
  let model = getModel(m);

  let $match = {};
  let id = ctx.query.id;

  if (id) {
    try {
      $match._id = new ObjectID(id);
    } catch (err) {
      //
    }
  }

  let filters = [
    '_eq',
    '_ne',
    '_lt',
    '_gt',
    '_lte',
    '_gte',
    '_regex',
    '_exists'
  ];

  Object.keys(ctx.query).forEach(k => {
    if (k.startsWith('_')) {
      return;
    }

    let isFilter = false;
    let value = ctx.query[k];

    if (!isNaN(value)) {
      if (value.indexOf('.') != -1) {
        value = parseFloat(value);
      } else {
        value = parseInt(value);
      }
    }
    if (value === 'true') {
      value = true;
    }
    if (value === 'false') {
      value = false;
    }

    if (k.startsWith('oid:')) {
      value = new ObjectID(ctx.query[k]); // back to being a string
      k = k.replace('oid:', '');
    } else if (k.startsWith('s:')) {
      value = ctx.query[k]; // back to being a string
      k = k.replace('s:', '');
    } else if (k.startsWith('d:')) {
      value = new Date(ctx.query[k]); // date
      k = k.replace('d:', '');
    }

    k = k.replace('_contains', '_regex');

    // else if (k.startsWith("f:")) {
    //     value = parseFloat(ctx.query[k]);
    //     k = k.replace("f:", "");
    // } else if (k.startsWith("i:")) {
    //     value = parseInt(ctx.query[k]);
    //     k = k.replace("i:", "");
    // }

    filters.forEach(f => {
      if (k.endsWith(f)) {
        let field = k.replace(f, '');
        let mf = f.replace('_', '$');

        $match[field] = {};
        if (f === '_regex') {
          $match[field]['$options'] = 'i';
          value = '' + value; // force string
        }
        $match[field][`${mf}`] = value;
        isFilter = true;
      }
    });

    if (!isFilter) {
      // assume _eq
      $match[k] = value;
    }
  });

  // extract or
  let $ors = [];
  let $ands = [];
  let $others = {};
  Object.keys($match).forEach(k => {
    let obj = {};
    if (k.startsWith('or:')) {
      obj[k.replace('or:', '')] = $match[k];
      $ors.push(obj);
    } else if (k.startsWith('and:')) {
      obj[k.replace('and:', '')] = $match[k];
      $ands.push(obj);
    } else {
      $others[k] = $match[k];
    }
  });

  $match = Object.assign({}, $others);
  if ($ors.length) {
    $match['$or'] = $ors;
  }
  if ($ands.length) {
    $match['$and'] = $ands;
  }

  if (ctx.query._count) {
    let count = await model.find($match).count();
    return { count: count };
  }

  // aggregate
  let $pipeline = [
    {
      $match: $match
    }
  ];
  if (ctx.query._limit) {
    $pipeline.push({
      $limit: parseInt(ctx.query._limit)
    });
  }
  if (ctx.query._skip) {
    $pipeline.push({
      $skip: parseInt(ctx.query._skip)
    });
  }

  let sort = ctx.query._sort;
  if (sort) {
    if (typeof sort !== 'object') {
      sort = [sort];
    }
    sort.forEach(k => {
      let n = k.split(':')[0];
      let sv = 1;
      if (k.toLowerCase().includes(':desc')) {
        sv = -1;
      }
      let obj = {};
      obj[n] = sv;
      $pipeline.push({
        $sort: obj
      });
    });
  }

  // add project

  if (ctx.query._project) {
    let p = ctx.query._project;
    if (typeof p == 'string') {
      p = [p];
    }
    let project = { $project: {} };
    p.forEach(i => {
      project['$project'][i] = 1;
    });

    $pipeline.push(project);
  }

  // ---------------
  // lookup
  // ---------------
  // {
  //    $lookup:
  //      {
  //        from: <collection to join>,
  //        localField: <field from the input documents>,
  //        foreignField: <field from the documents of the "from" collection>,
  //        as: <output array field>
  //      }
  // }

  // console.log(JSON.stringify($pipeline));

  if (ctx.query._lookup) {
    $pipeline.$lookup = [];
  }

  // console.log(JSON.stringify($pipeline, null, 4));

  if (ctx.query._pipeline) {
    return Promise.resolve($pipeline);
  }

  return model.aggregate($pipeline);
};

const remove = async function(m, ctx) {
  let model = getModel(m);
  return model.remove(ctx.query);
};

module.exports = {
  init: initDB,
  find: find,
  remove: remove
};
