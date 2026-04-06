import { create } from 'zustand';
import serviceNowClient from '../api/serviceNowClient';

// ServiceNow Requested Item (RITM) states
// 1 = Pending Approval, 2 = Approved, 3 = Rejected, 4 = Work In Progress, 7 = Closed Complete, 4 = Closed Incomplete

export const useRequestedItemStore = create((set) => ({
  requestedItems: [],
  metrics: {
    total: 0,
    pending: 0,
    approved: 0,
    inProgress: 0,
    closed: 0,
  },
  isLoading: false,
  error: null,

  _recalculateMetrics: (requestedItems) => {
    const safeList = Array.isArray(requestedItems) ? requestedItems : [];
    const total = safeList.length;
    const pending = safeList.filter(r => r.state === '1').length;
    const approved = safeList.filter(r => r.state === '2').length;
    const inProgress = safeList.filter(r => r.state === '4' || r.state === '-5').length;
    const closed = safeList.filter(r => r.state === '7' || r.state === '8').length;
    return { total, pending, approved, inProgress, closed };
  },

  fetchRequestedItems: async (user) => {
    set({ isLoading: true, error: null });
    try {
      const roles = Array.isArray(user?.roles) ? user.roles : [];
      const isAdmin = roles.includes('admin') || user?.username === 'admin';
      const isItil = roles.includes('itil');

      // Admin sees all RITMs; ITIL sees their assigned ones; others see their own requests
      const query = isAdmin
        ? 'sys_id!=null^ORDERBYDESCsys_created_on'
        : isItil
          ? `assigned_to=${user?.sys_id}^ORDERBYDESCsys_created_on`
          : `requested_for=${user?.sys_id}^ORDERBYDESCsys_created_on`;

      const response = await serviceNowClient.get(
        `/table/sc_req_item?sysparm_query=${query}&sysparm_display_value=true&sysparm_fields=sys_id,number,short_description,description,state,stage,price,cat_item,sys_created_on,request,requested_for,assigned_to,quantity,approval`
      );
      const requestedItems = response.data.result || [];

      const total = requestedItems.length;
      const pending = requestedItems.filter(r => r.state === '1').length;    // Pending Approval
      const approved = requestedItems.filter(r => r.state === '2').length;   // Approved
      const inProgress = requestedItems.filter(r => r.state === '4' || r.state === '-5').length; // Work In Progress / Delivery
      const closed = requestedItems.filter(r => r.state === '7' || r.state === '8').length; // Closed Complete / Incomplete

      set({
        requestedItems,
        metrics: { total, pending, approved, inProgress, closed },
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch requested items:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  fetchMyRequestedItems: async (userSysId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await serviceNowClient.get(
        `/table/sc_req_item?sysparm_query=requested_for=${userSysId}^ORDERBYDESCsys_created_on&sysparm_display_value=true&sysparm_fields=sys_id,number,short_description,description,state,stage,price,cat_item,sys_created_on,request,requested_for,quantity,approval`
      );
      const requestedItems = response.data.result || [];

      const total = requestedItems.length;
      const pending = requestedItems.filter(r => r.state === '1').length;
      const approved = requestedItems.filter(r => r.state === '2').length;
      const inProgress = requestedItems.filter(r => r.state === '4' || r.state === '-5').length;
      const closed = requestedItems.filter(r => r.state === '7' || r.state === '8').length;

      set({
        requestedItems,
        metrics: { total, pending, approved, inProgress, closed },
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch requested items for user:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  cancelRequestedItem: async (sysId) => {
    try {
      await serviceNowClient.patch(`/table/sc_req_item/${sysId}`, { state: '8' }); // Closed Incomplete
      set((state) => ({
        requestedItems: state.requestedItems.map(r => (r.sys_id === sysId ? { ...r, state: '8' } : r)),
      }));

      set((state) => ({
        metrics: state._recalculateMetrics(state.requestedItems),
      }));
      return true;
    } catch (error) {
      console.error('Failed to cancel requested item:', error);
      return false;
    }
  },

  approveRequestedItem: async (sysId) => {
    try {
      await serviceNowClient.patch(`/table/sc_req_item/${sysId}`, { approval: 'approved' }); // Approved
      set((state) => ({
        requestedItems: state.requestedItems.map(r => (r.sys_id === sysId ? { ...r, approval: 'approved' } : r)),
      }));

      set((state) => ({
        metrics: state._recalculateMetrics(state.requestedItems),
      }));
      return true;
    } catch (error) {
      console.error('Failed to approve requested item:', error);
      return false;
    }
  },

  rejectRequestedItem: async (sysId) => {
    try {
      await serviceNowClient.patch(`/table/sc_req_item/${sysId}`, { approval: 'rejected' }); // Rejected
      set((state) => ({
        requestedItems: state.requestedItems.map(r => (r.sys_id === sysId ? { ...r, approval: 'approved' } : r)),
      }));

      set((state) => ({
        metrics: state._recalculateMetrics(state.requestedItems),
      }));
      return true;
    } catch (error) {
      console.error('Failed to reject requested item:', error);
      return false;
    }
  },

  fetchRequestDetails: async (sysId) => {
    try {
      const response = await serviceNowClient.get(
        `/table/sc_request/${sysId}?sysparm_display_value=true`
      );
      return response.data.result;
    } catch (error) {
      console.error('Failed to fetch request details:', error);
      return null;
    }
  },
}));
