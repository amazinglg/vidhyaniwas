import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const useResidents = () => {
  return useQuery({
    queryKey: ['residents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('residents').select('*').order('house_no');
      if (error) throw error;
      return data;
    },
  });
};

export const useMaintenanceCollections = () => {
  return useQuery({
    queryKey: ['maintenance_collections'],
    queryFn: async () => {
      const { data, error } = await supabase.from('maintenance_collections').select('*, residents(name, house_no)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useExpenses = () => {
  return useQuery({
    queryKey: ['expenses'],
    queryFn: async () => {
      const { data, error } = await supabase.from('expenses').select('*').order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useNotices = () => {
  return useQuery({
    queryKey: ['notices'],
    queryFn: async () => {
      const { data, error } = await supabase.from('notices').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useComplaints = () => {
  return useQuery({
    queryKey: ['complaints'],
    queryFn: async () => {
      const { data, error } = await supabase.from('complaints').select('*, residents(name, house_no)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};
