import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useShallow } from 'zustand/react/shallow';
import { Info, Settings, Loader2 } from 'lucide-react';
import { fetchUserProfile, updateUserProfile } from '../api/profile';

const TIME_ZONE_OPTIONS = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const getStoredPreferences = () => {
  try {
    return JSON.parse(localStorage.getItem('sn_profile_prefs') || '{}');
  } catch {
    return {};
  }
};

const getValue = (value) => {
  if (value == null) return '';
  if (typeof value === 'object') {
    return (
      value.display_value ??
      value.name ??
      value.label ??
      value.value ??
      ''
    );
  }
  return String(value);
};

const ProfilePage = () => {
  const navigate = useNavigate();
  const user = useAuthStore(useShallow((s) => s.user));

  const [formData, setFormData] = useState(() => {
    const prefs = getStoredPreferences();
    return {
      fullName: user?.name || user?.username || '',
      photo: user?.photo || '',
      company: user?.company || '',
      title: user?.title || '',
      department: user?.department || '',
      location: user?.location || '',
      bio: prefs.bio || '',
      email: user?.email || '',
      businessPhone: user?.phone || '',
      mobilePhone: user?.mobile_phone || user?.mobilePhone || '',
      timeZone: prefs.timeZone || 'America/Los_Angeles',
      accessibilityEnabled: prefs.accessibilityEnabled ?? false,
      enableAnalytics: prefs.enableAnalytics ?? true,
    };
  });

  const [avatarPreview, setAvatarPreview] = useState('');
  const [supportsBioSync, setSupportsBioSync] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const sysId = user?.sys_id;

  const initials = useMemo(() => {
    const name = formData.fullName || user?.username || '';
    if (!name) return 'U';
    const parts = name.trim().split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }, [formData.fullName, user?.username]);

  const avatarDisplaySrc = avatarPreview || formData.photo || '';

  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      if (!sysId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setErrorMsg('');

      try {
        const result = await fetchUserProfile(sysId);
        if (!isMounted) return;

        setSupportsBioSync(Object.prototype.hasOwnProperty.call(result || {}, 'bio'));
        const prefs = getStoredPreferences();

        setFormData({
          fullName: getValue(result?.name) || formData.fullName,
          photo: getValue(result?.photo) || '',
          company: getValue(result?.company) || '',
          title: getValue(result?.title) || '',
          department: getValue(result?.department) || '',
          location: getValue(result?.location) || '',
          bio: getValue(result?.bio) || prefs.bio || '',
          email: getValue(result?.email) || '',
          businessPhone: getValue(result?.phone) || '',
          mobilePhone: getValue(result?.mobile_phone) || '',
          timeZone: getValue(result?.time_zone) || prefs.timeZone || 'America/Los_Angeles',
          accessibilityEnabled: prefs.accessibilityEnabled ?? false,
          enableAnalytics: prefs.enableAnalytics ?? true,
        });
      } catch (e) {
        if (!isMounted) return;
        setErrorMsg('Could not load profile details.');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sysId]);

  useEffect(() => {
    return () => {
      if (avatarPreview.startsWith('blob:')) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleChange = (field) => (e) => {
    const { type, checked, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [field]: type === 'checkbox' ? checked : value,
    }));
  };

  const handlePhotoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (avatarPreview.startsWith('blob:')) {
      URL.revokeObjectURL(avatarPreview);
    }
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!sysId) return;

    setIsSaving(true);
    setErrorMsg('');

    try {
      // Preferences are stored locally (as in your snippet).
      const preferences = {
        accessibilityEnabled: formData.accessibilityEnabled,
        enableAnalytics: formData.enableAnalytics,
        timeZone: formData.timeZone,
        bio: formData.bio,
      };
      localStorage.setItem('sn_profile_prefs', JSON.stringify(preferences));

      const payload = {
        name: formData.fullName,
        company: formData.company || '',
        title: formData.title || '',
        department: formData.department || '',
        location: formData.location || '',
        email: formData.email || '',
        phone: formData.businessPhone || '',
        mobile_phone: formData.mobilePhone || '',
        time_zone: formData.timeZone,
        ...(supportsBioSync ? { bio: formData.bio || '' } : {}),
      };

      await updateUserProfile(sysId, payload);

      // navigate('/', { replace: false });
    } catch (e2) {
      setErrorMsg('Failed to update the sys_user record.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-slate-500">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span>Loading profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-5">
      {errorMsg ? (
        <div className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 p-3 rounded-lg">
          {errorMsg}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">
            My Profile
          </h1>
          {/* <p className="text-slate-600 dark:text-slate-400 text-sm">Update your ServiceNow sys_user details and preferences.</p> */}
        </div>
        {/* <button
          type="button"
          onClick={() => navigate('/')}
          className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm font-medium"
        >
          ← Back
        </button> */}
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {/* Main info card */}
        <section className="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
          <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6">
            {/* Left avatar/upload */}
            <div className="flex flex-col items-center">
              <div className="w-28 h-28 rounded-full bg-orange-600 flex items-center justify-center text-white text-4xl font-bold overflow-hidden border border-white/10">
                {avatarDisplaySrc ? (
                  <img src={avatarDisplaySrc} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>

              <label className="mt-4 cursor-pointer text-sm font-semibold text-primary hover:text-blue-600 transition-colors">
                Upload Picture
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 text-center">
                Image preview updates instantly
              </p>
            </div>

            {/* Right form */}
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Full name
                  </label>
                  <input
                    value={formData.fullName}
                    onChange={handleChange('fullName')}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Company
                  </label>
                  <input
                    value={formData.company}
                    onChange={handleChange('company')}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Title
                  </label>
                  <input
                    value={formData.title}
                    onChange={handleChange('title')}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Department
                  </label>
                  <input
                    value={formData.department}
                    onChange={handleChange('department')}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Location
                  </label>
                  <input
                    value={formData.location}
                    onChange={handleChange('location')}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                    Bio
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={handleChange('bio')}
                    rows={4}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About card */}
        <section className="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Info className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">About</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Business phone
              </label>
              <input
                value={formData.businessPhone}
                onChange={handleChange('businessPhone')}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Mobile phone
              </label>
              <input
                value={formData.mobilePhone}
                onChange={handleChange('mobilePhone')}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </section>

        {/* Preferences card */}
        <section className="bg-surface border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">User preferences</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-start justify-between gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-pointer">
              <div className="pr-2">
                <div className="font-semibold text-slate-700 dark:text-slate-200">Accessibility enabled</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Improve visibility and readable controls</div>
              </div>
              <span className="relative w-11 h-6 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={formData.accessibilityEnabled}
                  onChange={handleChange('accessibilityEnabled')}
                  className="sr-only peer"
                />
                <span className="absolute inset-0 rounded-full bg-slate-400 peer-checked:bg-primary transition-colors" />
                <span className="absolute top-1 left-1 h-4 w-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
              </span>
            </label>

            <label className="flex items-start justify-between gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 cursor-pointer">
              <div className="pr-2">
                <div className="font-semibold text-slate-700 dark:text-slate-200">Enable Analytics</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">Allow usage insights for this dashboard</div>
              </div>
              <span className="relative w-11 h-6 flex-shrink-0">
                <input
                  type="checkbox"
                  checked={formData.enableAnalytics}
                  onChange={handleChange('enableAnalytics')}
                  className="sr-only peer"
                />
                <span className="absolute inset-0 rounded-full bg-slate-400 peer-checked:bg-primary transition-colors" />
                <span className="absolute top-1 left-1 h-4 w-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
              </span>
            </label>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
                Time zone
              </label>
              <select
                value={formData.timeZone}
                onChange={handleChange('timeZone')}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:outline-none focus:border-primary cursor-pointer"
              >
                {TIME_ZONE_OPTIONS.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-5 py-2.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-transparent hover:border-slate-300 dark:hover:border-slate-700 transition-colors font-medium"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg bg-primary hover:bg-blue-600 text-white font-medium transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center gap-2 disabled:cursor-not-allowed"
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfilePage;

