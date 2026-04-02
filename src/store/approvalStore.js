import { create } from 'zustand';
import serviceNowClient from '../api/serviceNowClient';

// ServiceNow Requested Item (RITM) states
// 1 = Pending Approval, 2 = Approved, 3 = Rejected, 4 = Work In Progress, 7 = Closed Complete, 4 = Closed Incomplete

export const useApprovalStore = create((set) => ({
  approvals: [],
  metrics: {
    total: 0,
    pending: 0,
    approved: 0,
    inProgress: 0,
    closed: 0,
  },
  isLoading: false,
  error: null,

  fetchApprovals: async (user) => {
    set({ isLoading: true, error: null });
    try {
      const isAdmin = user?.roles?.includes('admin');
      // Admin sees all RITMs; ITIL sees their assigned ones; others see their own requests
      const query = isAdmin
        ? 'ORDERBYDESCsys_created_on'
        : user?.roles?.includes('itil')
          ? `approver=${user?.sys_id}^ORDERBYDESCsys_created_on` : `approver=${user?.sys_id}^ORDERBYDESCsys_created_on`;

      const response = await serviceNowClient.get(
        `/table/sysapproval_approver?sysparm_query=${query}&sysparm_fields=sys_id,short_description,description,sysapproval,document_id,group,approver,state,sys_created_on&sysparm_display_value=true`
      );
      const approvals = response.data.result || [];

      const total = approvals.length;
      const pending = approvals.filter(r => r.state === '1').length;    // Pending Approval
      const approved = approvals.filter(r => r.state === '2').length;   // Approved
      const inProgress = approvals.filter(r => r.state === '4' || r.state === '-5').length; // Work In Progress / Delivery
      const closed = approvals.filter(r => r.state === '7' || r.state === '8').length; // Closed Complete / Incomplete

      set({
        approvals,
        metrics: { total, pending, approved, inProgress, closed },
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch requested items:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  fetchMyApprovals: async (userSysId) => {
    set({ isLoading: true, error: null });
    try {
      const response = await serviceNowClient.get(
        `/table/sysapproval_approver?sysparm_query=approver=${userSysId}^ORDERBYDESCsys_created_on&sysparm_fields=sys_id,short_description,description,sysapproval,document_id,group,approver,state,sys_created_on&sysparm_display_value=true`
      );
      const approvals = response.data.result || [];

      const total = approvals.length;
      const pending = approvals.filter(r => r.state === '1').length;
      const approved = approvals.filter(r => r.state === '2').length;
      const inProgress = approvals.filter(r => r.state === '4' || r.state === '-5').length;
      const closed = approvals.filter(r => r.state === '7' || r.state === '8').length;

      set({
        approvals,
        metrics: { total, pending, approved, inProgress, closed },
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch requested items for user:', error);
      set({ error: error.message, isLoading: false });
    }
  },

//   cancelRequestedItem: async (sysId) => {
//     try {
//       await serviceNowClient.patch(`/table/sysapproval_approver/${sysId}`, { state: '8' }); // Closed Incomplete
//       set((state) => ({
//         approvals: state.approvals.map(r =>
//           r.sys_id === sysId ? { ...r, state: '8' } : r
//         ),
//       }));
//       return true;
//     } catch (error) {
//       console.error('Failed to cancel requested item:', error);
//       return false;
//     }
//   },

  approveApproval: async (sysId) => {
    try {
      await serviceNowClient.patch(`/table/sysapproval_approver/${sysId}`, { state: 'approved' }); // Approved
      set((state) => ({
        approvals: state.approvals.map(r =>
          r.sys_id === sysId ? { ...r, state: 'approved' } : r
        ),
      }));
      return true;
    } catch (error) {
      console.error('Failed to approve:', error);
      return false;
    }
  },

  rejectApproval: async (sysId) => {
    try {
      await serviceNowClient.patch(`/table/sysapproval_approver/${sysId}`, { state: 'rejected' }); 
      set((state) => ({
        approvals: state.approvals.map(r =>
          r.sys_id === sysId ? { ...r, state: 'rejected' } : r
        ),
      }));
      return true;
    } catch (error) {
      console.error('Failed to reject:', error);
      return false;
    }
  },
}));
