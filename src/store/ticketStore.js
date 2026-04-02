import { create } from 'zustand';
import serviceNowClient from '../api/serviceNowClient';

export const useTicketStore = create((set) => ({
  incidents: [],
  metrics: {
    total: 0,
    critical: 0,
    active: 0,
    resolved: 0,
    closed: 0,
    canceled: 0
  },
  isLoading: false,
  error: null,

  fetchIncidents: async (user) => {
    set({ isLoading: true, error: null });
    try {
      const isAdmin = user?.roles?.includes('admin');
      // Admin sees all active incidents; ITIL sees only those assigned to them
      const query = isAdmin
        ? 'active=true^ORDERBYDESCsys_created_on'
        : `active=true^assigned_to=${user?.sys_id}^ORDERBYDESCsys_created_on`;

      const response = await serviceNowClient.get(`/table/incident?sysparm_query=${query}`);
      const incidents = response.data.result || [];

      const total = incidents.length;
      const critical = incidents.filter(inc => inc.priority === '1').length;
      const resolved = incidents.filter(inc => inc.state === '6').length;
      const canceled = incidents.filter(inc => inc.state === '7').length;

      set({
        incidents,
        metrics: { total, critical, active: total, resolved, canceled },
        isLoading: false
      });
    } catch (error) {
      console.error('Failed to fetch incidents', error);
      set({ error: error.message, isLoading: false });
    }
  },

  createIncident: async (incidentData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await serviceNowClient.post('/table/incident', incidentData);
      const newIncident = response.data.result;
      
      set((state) => {
        const newIncidents = [newIncident, ...state.incidents];
        const newTotal = newIncidents.length;
        const newCritical = newIncidents.filter(inc => inc.priority === '1').length;
        
        return { 
          incidents: newIncidents,
          metrics: { 
            total: newTotal, 
            critical: newCritical, 
            active: newTotal 
          },
          isLoading: false
        };
      });
      return true;
    } catch (error) {
      console.error('Failed to create incident', error);
      set({ error: error.message, isLoading: false });
      return false;
    }
  }
}));
