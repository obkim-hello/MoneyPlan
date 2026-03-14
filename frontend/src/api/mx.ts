import { api } from './auth';

export const getMXStatus = async () => {
  const response = await api.get('/mx/status');
  return response.data;
};

export const listInstitutions = async (name?: string) => {
  const params = name ? { name } : {};
  const response = await api.get('/mx/institutions', { params });
  return response.data;
};

export const connectInstitution = async (institutionGuid: string, credentials?: any) => {
  const response = await api.post('/mx/connect', {
    institution_guid: institutionGuid,
    credentials
  });
  return response.data;
};

export const resumeMember = async (memberGuid: string, credentials: Record<string, string>) => {
  const response = await api.post(`/mx/members/${memberGuid}/resume`, credentials);
  return response.data;
};

export const disconnectMember = async (memberGuid: string) => {
  const response = await api.delete(`/mx/members/${memberGuid}`);
  return response.data;
};

export const syncMX = async () => {
  const response = await api.post('/mx/sync');
  return response.data;
};

export const getMXAccounts = async () => {
  const response = await api.get('/mx/accounts');
  return response.data;
};
