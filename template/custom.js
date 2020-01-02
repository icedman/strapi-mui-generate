import React from 'react';
import _schema from './schema.js';
import merge from 'merge';

export function CustomView(props) {
  return (
    <div>
    {/*
      Custom View
      <input className="form-control" {...props.fs.model('commitment.name')} />
    */}
    </div>
  );
}

const schema = merge.recursive(_schema, {
/*
  metadatas: {
    state: {
      edit: {
        component: 'SelectStates'
      },
      list: {
        component: 'ViewState'
      }
    }
  }
*/
});

const registry = {
  'custom': CustomView
}

export { schema, registry };
