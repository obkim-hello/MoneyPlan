import { api } from './auth';

export const getMonarchStatus = async () => {
  const response = await api.get('/monarch/status');
  return response.data;
};

export const connectMonarch = async (mfaCode?: string) => {
  const data: any = {};
  if (mfaCode) {
    data.mfa_code = mfaCode;
  }
  const response = await api.post('/monarch/connect', data);
  return response.data;
};

export const connectMonarchWithToken = async (monarchToken: string) => {
  const response = await api.post('/monarch/connect', { monarch_token: monarchToken });
  return response.data;
};

export const syncMonarch = async () => {
  const response = await api.post('/monarch/sync');
  return response.data;
};
