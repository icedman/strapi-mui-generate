import React from 'react';

export default {
  prefix: '/',
  routes: [
    {
      path: '/{{models}}',
      component: React.lazy(() => import('./{{modelComponent}}List'))
    },
    {
      path: '/{{model}}/:id',
      component: React.lazy(() => import('./{{modelComponent}}'))
    },
    {
      path: '/{{model}}',
      component: React.lazy(() => import('./{{modelComponent}}'))
    }
  ]
};
