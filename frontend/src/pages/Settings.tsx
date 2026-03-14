import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { getMXStatus, listInstitutions, connectInstitution, disconnectMember, syncMX } from '../api/mx';

interface Institution {
  guid: string;
  name: string;
  logo: string;
}

interface CredentialField {
  guid: string;
  label: string;
  type: string;
  required: boolean;
}

export default function Settings() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConnect, setShowConnect] = useState(false);
  const [selectedInstitution, setSelectedInstitution] = useState<Institution | null>(null);
  const [credentialFields, setCredentialFields] = useState<CredentialField[]>([]);
  const [credentials, setCredentials] = useState<Record<string, string>>({});

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const data = await getMXStatus();
      setStatus(data);
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  };

  const handleSearch = async () => {
    setLoading(true);
    try {
      const data = await listInstitutions(searchQuery || undefined);
      setInstitutions(data);
    } catch (error) {
      console.error('Failed to search institutions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async (institutionGuid: string) => {
    setLoading(true);
    try {
      const result = await connectInstitution(institutionGuid);

      if (result.status === 'credentials_required') {
        setCredentialFields(result.credentials || []);
        setCredentials({});
      } else if (result.status === 'connected') {
        toast.success('Connected successfully!');
        loadStatus();
        setShowConnect(false);
        setSelectedInstitution(null);
      } else {
        toast.error(result.message || 'Failed to connect');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || error.message || 'Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  const handleCredentialSubmit = async () => {
    if (!selectedInstitution) return;

    setLoading(true);
    try {
      const credsArray = Object.entries(credentials).map(([guid, value]) => ({
        guid,
        value
      }));

      const result = await connectInstitution(selectedInstitution.guid, credsArray);

      if (result.status === 'connected' || result.status === 'mfa_required') {
        toast.success('Connected successfully!');
        loadStatus();
        setShowConnect(false);
        setSelectedInstitution(null);
        setCredentialFields([]);
        setCredentials({});
      } else {
        toast.error(result.message || 'Failed to connect');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || error.message || 'Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (memberGuid: string) => {
    if (!confirm('Are you sure you want to disconnect this account?')) return;

    setLoading(true);
    try {
      await disconnectMember(memberGuid);
      toast.success('Disconnected successfully!');
      loadStatus();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || error.message || 'Failed to disconnect');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      await syncMX();
      toast.success('Sync started!');
      loadStatus();
    } catch (error: any) {
      toast.error(error.response?.data?.detail || error.message || 'Sync failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      <div className="card">
        <h2 className="text-xl font-semibold mb-6">Bank Account Connection</h2>

        {/* Connection Status */}
        <div className="mb-6">
          <p className="text-slate-600 dark:text-slate-300">
            <span className="font-medium">Status:</span>{' '}
            {status?.connected ? (
              <span className="text-emerald-500 font-medium">Connected</span>
            ) : (
              <span className="text-slate-500">Not Connected</span>
            )}
          </p>

          {status?.members && status.members.length > 0 && (
            <div className="mt-4 space-y-3">
              <h3 className="font-medium">Connected Accounts:</h3>
              {status.members.map((member: any) => (
                <div key={member.guid} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                  <div>
                    <p className="font-semibold">{member.institution_name}</p>
                    <p className="text-sm text-slate-500">
                      Status: {member.is_connected ? (
                        <span className="text-emerald-500">Connected</span>
                      ) : (
                        <span className="text-red-500">Disconnected</span>
                      )}
                      {member.last_sync && ` | Last sync: ${new Date(member.last_sync).toLocaleString()}`}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDisconnect(member.guid)}
                    className="btn btn-danger btn-sm"
                  >
                    Disconnect
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Credential Form */}
        {credentialFields.length > 0 ? (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <h3 className="font-medium mb-4">Enter your bank credentials</h3>
            <div className="space-y-4 max-w-md">
              {credentialFields.map((field) => (
                <div key={field.guid}>
                  <label className="form-label">{field.label}</label>
                  <input
                    type={field.type === 'PASSWORD' ? 'password' : 'text'}
                    className="form-input"
                    value={credentials[field.guid] || ''}
                    onChange={(e) => setCredentials({ ...credentials, [field.guid]: e.target.value })}
                    placeholder={`Enter ${field.label}`}
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <button className="btn btn-primary" onClick={handleCredentialSubmit} disabled={loading}>
                  Submit
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => { setCredentialFields([]); setSelectedInstitution(null); }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        ) : !showConnect && !status?.connected ? (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <button className="btn btn-primary" onClick={() => { setShowConnect(true); handleSearch(); }}>
              Connect Bank Account
            </button>
          </div>
        ) : showConnect && !selectedInstitution ? (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <h3 className="font-medium mb-4">Search for your bank</h3>
            <div className="flex gap-3 mb-4">
              <input
                type="text"
                className="form-input flex-1"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter bank name..."
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
                Search
              </button>
            </div>

            {institutions.length > 0 && (
              <div className="max-h-80 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg">
                {institutions.map((inst) => (
                  <div
                    key={inst.guid}
                    className="flex items-center gap-3 p-3 border-b border-slate-200 dark:border-slate-700 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    {inst.logo && (
                      <img src={inst.logo} alt={inst.name} className="w-8 h-8 rounded" />
                    )}
                    <span className="flex-1 font-medium">{inst.name}</span>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => { setSelectedInstitution(inst); handleConnect(inst.guid); }}
                      disabled={loading}
                    >
                      Connect
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              className="btn btn-secondary mt-4"
              onClick={() => setShowConnect(false)}
            >
              Cancel
            </button>
          </div>
        ) : null}

        {status?.connected && (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6 flex gap-3">
            <button className="btn btn-primary" onClick={handleSync} disabled={loading}>
              Sync Now
            </button>
            <button className="btn btn-secondary" onClick={() => { setShowConnect(true); handleSearch(); }} disabled={loading}>
              Add Another Account
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
