import React from 'react';
import { withRouter } from 'react-router-dom';
import crud from 'common/crud';
import cache from 'common/cache';
import StateHelper from 'common/stateHelper';
import { schema, registry as CustomComponentRegistry } from './custom';

import Toolbar from 'components/Toolbar';

import clsx from 'clsx';
// import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/styles';

import DateFnsUtils from '@date-io/date-fns';
import {
  MuiPickersUtilsProvider,
  // KeyboardTimePicker,
  // KeyboardDatePicker,
} from '@material-ui/pickers';

import { useModal } from 'components/Modal/Modal';
import { useSnackbar } from 'notistack';

import { Store as UIStore } from 'stores/UIStore';

import {
  Card,
  CardHeader,
  CardContent,
  Divider
} from '@material-ui/core';

import { Layout } from 'components/Form';
import FormInputRegistry from 'components/Form/registry';

const useStyles = makeStyles(theme => ({
  page: {
    padding: theme.spacing(4)
  },
  content: {
    marginTop: theme.spacing(2)
  }
}));

const fs = new StateHelper();

const Detail = withRouter(props => {
  const { className, ...rest } = props;
  const uiStore = React.useContext(UIStore);

  const classes = useStyles();
  const { enqueueSnackbar } = useSnackbar();
  const { showModal } = useModal();

  const ${{model}} = crud('{{models}}');

  const {{model}}Id = props.match.params.id || '';

  const [state, setState] = React.useState({
    {{model}}: {}
  });

  fs.useState(state, setState);

  const fetchDetail = async () => {
    if (!{{model}}Id) {
      return;

    }
    let res = null;
    try {
      res = await ${{model}}.findOne({{model}}Id);
    } catch (err) {
      console.log(err);
    }

    if (res) {
      setState({
        ...state,
        {{model}}: res.data
      });
    }
  };

  const save = () => {
    let {{model}} = fs.state().{{model}};
    ${{model}}
      .save({{model}})
      .then(res => {
        cache.clear('{{model}}');
        enqueueSnackbar('Saved', { variant: 'success' });

        if (!{{model}}Id) {
          setTimeout(() => {
            // props.history.replace('/{{model}}/' + (res.data.id || res.data._id));
            props.history.goBack();
          }, 250);
        }

      })
      .catch(err => {
        enqueueSnackbar('Error saving', { variant: 'error' });
      });
  };

  const confirmErase = () => {
    showModal({
      title: 'Confirm',
      message: 'Delete this {{modelComponent}}?',
      actions: [{ title: 'yes', action: erase }, { title: 'cancel' }]
    });
  };

  const erase = async () => {
    let {{model}} = fs.state().{{model}};
    ${{model}}
      .erase({{model}}._id)
      .then(res => {
        cache.clear('{{model}}');
        enqueueSnackbar('Deleted', { variant: 'success' });
        setTimeout(() => {
          props.history.goBack();
        }, 250);
      })
      .catch(err => {
        enqueueSnackbar('Error deleting', { variant: 'error' });
      });
  };

  React.useEffect(() => {
    fetchDetail();
  }, []);

  React.useEffect(() => {
    //----------------
    // on mount
    //----------------
    
    const originalItems = [...uiStore.state.topbar.items];

    uiStore.dispatch(
      uiStore.setState({
        'topbar.items': [
          ...uiStore.state.topbar.items,
          {
            label: '',
            icon: 'muiArrowBack',
            action: () => {
              setTimeout(() => {
                props.history.goBack();
              }, 150);
            }
          },
          {
            label: 'Save',
            icon: '',
            action: () => {
              save();
            }
          },
          // {
          //   label: 'Delete',
          //   icon: 'trash',
          //   action: confirmErase
          // }
        ]
      })
    );

    return () => {
      //----------------
      // on unmount
      //----------------

      uiStore.dispatch(
        uiStore.setState({
          'topbar.items': originalItems
        })
      );
    };
  }, []);

  schema.attributes = schema.attributes || {};
  const editFields = [ ...schema.layouts.edit, [...(schema.layouts.editRelations || []).map(r => ({ name: r}))] ];
  const fieldsRendered = editFields.map(row => {
    return row.map(field => {
      let meta = schema.metadatas[field.name].edit;
      let attributes = schema.attributes[field.name] || { type: 'string' };
      let Component = FormInputRegistry[attributes.type];

      // console.log(attributes);

      if (meta.component) {
        Component = CustomComponentRegistry[meta.component];
      }
      if (attributes.model && !attributes.plugin) {
        Component = FormInputRegistry['model'];
      } 
      if (attributes.plugin) {
        Component = FormInputRegistry[attributes.plugin];
      }
      if (!Component) {
        Component = FormInputRegistry['string'];
      }

      return {
        name: field,
        label: meta.label || field,
        size: field.size,
        rendered: <Component
              label={meta.label}
              description={meta.description}
              context={fs}
              basepath={attributes.basePath || '{{model}}'}
              source={attributes.model}
              options={attributes.enum}
              model={`{{model}}.${field.name}`}/>
      };
    });
  });

  const page = {
    title: '{{modelComponent}}',
    subheader: ''
  }

  const toolbarActions = [
    {
      title: 'Save',
      color: 'primary',
      variant: 'contained',
      onClick: save
    }
  ]

  if ({{model}}Id) {
    toolbarActions.push(
      {
        title: 'Delete',
        color: 'primary',
        variant: 'contained',
        onClick: confirmErase
      }
    )
  }

  return (
    <div className={classes.page}>

    <Toolbar actions={toolbarActions}/>

    <div className={classes.content}>
    <Card className={clsx(classes.root, className)}>
     <MuiPickersUtilsProvider utils={DateFnsUtils}>
      <form autoComplete="off" noValidate>
        <CardHeader subheader={page.subheader} title={page.title}/>
        <Divider />
        <CardContent>
        <Layout items={fieldsRendered}/>
        </CardContent>
      <pre>{JSON.stringify(state, null, 4)}</pre>
      </form>
    </MuiPickersUtilsProvider>
    </Card>
    </div>

    </div>
  );
});

export default withRouter(Detail);
