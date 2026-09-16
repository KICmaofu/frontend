import { createRouter, createWebHistory } from 'vue-router';
import { ROUTES, ROUTE_NAMES } from '../constants';

const HomeView = () => import('../views/Home.vue');
const DeviceManagementView = () => import('../views/DeviceManagement.vue');
const Login = () => import('../views/Login.vue');
const MessageCenterView = () => import('../views/MessageCenter.vue');
const DataManagementView = () => import('../views/DataManagement.vue');

const routes = [
  {
    path: ROUTES.ROOT,
    name: ROUTE_NAMES.ROOT,
    component: HomeView
  },
  {
    path: ROUTES.HOME,
    name: ROUTE_NAMES.HOME,
    component: HomeView
  },
  {
    path: ROUTES.DEVICE_MANAGEMENT,
    name: ROUTE_NAMES.DEVICE_MANAGEMENT,
    component: DeviceManagementView
  },
  {
    path: ROUTES.LOGIN,
    name: ROUTE_NAMES.LOGIN,
    component: Login
  },
  {
    path: ROUTES.MESSAGE_CENTER,
    name: ROUTE_NAMES.MESSAGE_CENTER,
    component: MessageCenterView
  },
  {
    path: ROUTES.DATA_MANAGEMENT,
    name: ROUTE_NAMES.DATA_MANAGEMENT,
    component: DataManagementView
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
