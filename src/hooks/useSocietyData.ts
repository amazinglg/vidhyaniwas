import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

const useRealtimeSync = (table: string, queryKey: string) => {
  const queryClient = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel(`realtime-${table}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => {
        queryClient.invalidateQueries({ queryKey: [queryKey] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [table, queryKey, queryClient]);
};

export const useResidents = () => {
  useRealtimeSync('residents', 'residents');
  return useQuery({
    queryKey: ['residents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('residents').select('*').eq('resident_type', 'owner').order('house_no');
      if (error) throw error;
      return data;
    },
  });
};

export const useAllResidents = () => {
  useRealtimeSync('residents', 'all_residents');
  return useQuery({
    queryKey: ['all_residents'],
    queryFn: async () => {
      const { data, error } = await supabase.from('residents').select('*').order('house_no');
      if (error) throw error;
      return data;
    },
  });
};

export const useMaintenanceCollections = () => {
  useRealtimeSync('maintenance_collections', 'maintenance_collections');
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
  useRealtimeSync('expenses', 'expenses');
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
  useRealtimeSync('notices', 'notices');
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
  useRealtimeSync('complaints', 'complaints');
  return useQuery({
    queryKey: ['complaints'],
    queryFn: async () => {
      const { data, error } = await supabase.from('complaints').select('*, residents(name, house_no)').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};
