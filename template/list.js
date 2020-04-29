import React, { useState } from 'react';
import clsx from 'clsx';

import { Table as SimpleTable, Header, Body } from 'components/Table/Table';
import { withRouter } from 'react-router-dom';
import crud from 'common/crud';

import Toolbar from 'components/Toolbar';

import { makeStyles } from '@material-ui/styles';
// import EditIcon from '@material-ui/icons/Edit';

import { schema, registry } from './custom';

import debounce from 'debounce';

import PerfectScrollbar from 'react-perfect-scrollbar';
import {
  Card,
  CardActions,
  CardContent,
  // Typography,
  TablePagination
} from '@material-ui/core';


const useTableStyles = makeStyles(theme => ({
  root: {},
  content: {
    padding: 0
  },
  inner: {
    minWidth: 1050
  },
  nameContainer: {
    display: 'flex',
    alignItems: 'center'
  },
  avatar: {
    marginRight: theme.spacing(2)
  },
  actions: {
    justifyContent: 'flex-end'
  }
}));

const useStyles = makeStyles(theme => ({
  root: {
    padding: theme.spacing(3)
  },
  content: {
    marginTop: theme.spacing(2)
  }
}));

const DataList = withRouter(props => {
  const [filter, setFilter] = useState('')
  const [state, setState] = useState({
    data: [],
    length: 0,
    page: 0,
    rowsPerPage: 15
  });

  const classes = useStyles();
  const tableClasses = useTableStyles();
  const fields = schema.layouts.list;

  const fetchData = async () => {
    let res = null;
    let params = {}

    const $crud = crud('{{models}}');

    if (filter.length > 1) {
      fields.forEach(field => {
        let meta = schema.metadatas[field].list;
        let attributes = schema.attributes[field] || {};
        if (field === 'id') {
          return;
        }
        if (attributes.type === 'date' || field === 'updatedAt' || field === 'createdAt') {
          return;
        }
        if (meta.searchable) {
          params[`or:${field}_regex`] = filter;
        }
      });
    }

    let length = 0;

    // count
    try {
      res = await $crud.find({ ...params, _count: 1});
      length =  res.data.count;
    } catch (err) {
      // console.log(err);
    }

    // console.log(length);

    params._limit = state.rowsPerPage;
    params._page = state.page;

    try {
      res = await $crud.find(params);
    } catch (err) {
      console.log(err);
    }

    if (res) {
      setState({
        ...state,
        length: length,
        data: res.data.map(d => {
          d.id = d._id;
          return d;
        })
      });
    }
  };

  React.useEffect(() => {
    fetchData();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ filter, state.page, state.rowsPerPage ]);

  /*
  const actions = [
    {
      icon: <EditIcon />,
      action: item => {
        props.history.push(`/{{model}}/${item.id}`);
      }
    }
  ];
  */

  let listFields = [];
  fields.forEach(field => {
    let meta = schema.metadatas[field].list;
    listFields.push({
      name: field,
      label: meta.label || field
    })
  })

  // listFields.push({
  //   name: '$actions',
  //   label: 'Actions'
  // })

  const onAddClick = (evt, p) => {
    props.history.push(`/{{model}}`);
  }

  const onRowClick = (evt, p) => {
    props.history.push(`/{{model}}/${p.data.id}`);
  }

  const toolbarActions = [
    {
      title: 'Add {{model}}',
      color: 'primary',
      variant: 'contained',
      onClick: onAddClick
    }
  ];

  const onSearch = debounce((v) => {
    setFilter(v);
  }, 250);

  const handlePageChange = (evt, p) => {
    setState({
      ...state,
      page: p
    })
  }

  const handleRowsPerPageChange = (evt) => {
    setState({
      ...state,
      rowsPerPage: evt.target.value
    })    
  }

  return (
    <div className={classes.root}>
      <Toolbar actions={toolbarActions} onSearch={onSearch}/>

      <div className={classes.content}>
      <Card className={clsx(tableClasses.root)}>
      <CardContent className={tableClasses.content}>
        <PerfectScrollbar>
          <div className={tableClasses.inner}>

        <SimpleTable columns={listFields} data={state.data}>
          <Header/>
          <Body onClick={onRowClick} hover={true}/>
        </SimpleTable>

          </div>
        </PerfectScrollbar>
      </CardContent>

      {state.length > state.rowsPerPage &&
      <CardActions className={classes.actions}>
        <TablePagination
          component="div"
          count={state.length}
          onChangePage={handlePageChange}
          onChangeRowsPerPage={handleRowsPerPageChange}
          page={state.page}
          rowsPerPage={state.rowsPerPage}
          rowsPerPageOptions={[15, 25, 50, 100]}
        />
      </CardActions>
      }

      </Card>
      </div>
    </div>
  );
});

export default DataList;
