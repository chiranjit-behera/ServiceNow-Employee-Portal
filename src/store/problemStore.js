import { create } from 'zustand';
import serviceNowClient from '../api/serviceNowClient';

export const useProblemStore = create((set) => ({
  problems: [],
  metrics: {
    total: 0,
    open: 0,
    inAnalysis: 0,
    resolved: 0,
    closed: 0,
  },
  isLoading: false,
  error: null,

  fetchProblems: async (user) => {
    set({ isLoading: true, error: null });
    try {
      const roles = Array.isArray(user?.roles) ? user.roles : [];
      const isAdmin = roles.includes('admin') || user?.username === 'admin';
      const isItil = roles.includes('itil');

      const baseQuery = isAdmin
        ? 'sys_id!=null^ORDERBYDESCsys_created_on'
        : isItil
          ? `assigned_to=${user?.sys_id}^ORDERBYDESCsys_created_on`
          : `assigned_to=${user?.sys_id}^ORDERBYDESCsys_created_on`; // Problems are typically ITIL only, but fallback just in case

      const response = await serviceNowClient.get(
        `/table/problem?sysparm_query=${baseQuery}&sysparm_fields=sys_id,number,short_description,description,priority,state,sys_created_on,assigned_to,category`
      );
      const problems = response.data.result || [];

      const total = problems.length;
      const open = problems.filter(p => p.state === '1').length;       // Open
      const inAnalysis = problems.filter(p => p.state === '2').length; // Root Cause Analysis
      const resolved = problems.filter(p => p.state === '4').length;   // Resolved
      const closed = problems.filter(p => p.state === '3').length;     // Closed

      set({
        problems,
        metrics: { total, open, inAnalysis, resolved, closed },
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch problems:', error);
      set({ error: error.message, isLoading: false });
    }
  },

  createProblem: async (problemData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await serviceNowClient.post('/table/problem', problemData);
      const newProblem = response.data.result;

      set((state) => {
        const newProblems = [newProblem, ...state.problems];
        return {
          problems: newProblems,
          metrics: {
            ...state.metrics,
            total: newProblems.length,
            open: newProblems.filter(p => p.state === '1').length,
          },
          isLoading: false,
        };
      });
      return true;
    } catch (error) {
      console.error('Failed to create problem:', error);
      set({ error: error.message, isLoading: false });
      return false;
    }
  },

  updateProblem: async (sysId, updateData) => {
    try {
      const response = await serviceNowClient.patch(`/table/problem/${sysId}`, updateData);
      const updatedProblem = response.data.result;

      set((state) => ({
        problems: state.problems.map(p => p.sys_id === sysId ? { ...p, ...updatedProblem } : p),
      }));
      return true;
    } catch (error) {
      console.error('Failed to update problem:', error);
      return false;
    }
  },
}));
