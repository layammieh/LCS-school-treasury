import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { 
  User, 
  Lock, 
  LogOut, 
  Camera
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { profileApi } from '../lib/api';
import { ConfirmModal } from '../components/ConfirmModal';

export default function Settings() {
  const navigate = useNavigate();
  const logout = useAuthStore(state => state.logout);
  const user = useAuthStore(state => state.user);
  const updateUser = useAuthStore(state => state.updateUser);

  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  // Profile Form State
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [emailAddress, setEmailAddress] = useState(user?.email || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [avatar, setAvatar] = useState<File | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Security Form State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatar(e.target.files[0]);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const formData = new FormData();
      formData.append('full_name', fullName);
      formData.append('bio', bio);
      if (avatar) {
        formData.append('avatar', avatar);
      }
      const updatedData = await profileApi.updateProfile(formData);
      updateUser({
        full_name: updatedData.full_name,
        bio: updatedData.bio,
        avatar: updatedData.avatar
      });
      setAvatar(null);
      alert('Profile updated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    if (!newPassword || !confirmPassword) {
      alert('Please fill out both password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
    setSavingPassword(true);
    try {
      await profileApi.changePassword({
        new_password: newPassword,
        confirm_password: confirmPassword
      });
      alert('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      alert(err.message || 'Failed to update password');
    } finally {
      setSavingPassword(false);
    }
  };

  // Preview URL for the avatar before upload
  const avatarUrl = avatar ? URL.createObjectURL(avatar) : (user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100");

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex font-sans">
      <Sidebar activePage="settings" />

      <div className="flex-1 flex flex-col overflow-y-auto max-h-screen">
        <Header 
          searchPlaceholder="Search settings or tools..." 
          userName={user?.full_name}
        />

        <main className="p-8 space-y-6">
          {/* Header title */}
          <div>
            <h1 className="text-2xl font-bold text-gray-955 tracking-tight leading-none">Account Settings</h1>
            <p className="text-xs text-gray-500 mt-1">Manage your institutional credentials, preference and system configuration.</p>
          </div>

          {/* Settings grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            
            {/* Left settings card block */}
            <div className="space-y-6">
              
              {/* Profile Card */}
              <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center text-center space-y-4">
                <div className="relative">
                  <img 
                    src={avatarUrl} 
                    alt="Profile Avatar" 
                    className="w-20 h-20 rounded-full border border-gray-200 object-cover bg-gray-100"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100";
                    }}
                  />
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleAvatarChange}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-1.5 bg-[#006B4D] hover:bg-[#00523b] text-white rounded-full shadow border border-white"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 leading-none">{user?.full_name || user?.username}</h3>
                  <p className="text-[10px] text-gray-500 mt-1 font-semibold">LCS Office</p>
                  <span className="text-[10px] text-gray-400 mt-0.5 block">{user?.email}</span>
                </div>

                <div className="w-full space-y-1 pt-4 border-t border-gray-100 text-xs">
                  <button 
                    onClick={() => setActiveTab('profile')}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 font-bold rounded-lg transition-colors text-left ${
                      activeTab === 'profile' ? 'bg-[#4ADE80] text-[#003D29]' : 'text-gray-550 hover:bg-gray-50'
                    }`}
                  >
                    <User className="w-4 h-4 shrink-0" />
                    <span>Profile Information</span>
                  </button>
                  <button 
                    onClick={() => setActiveTab('security')}
                    className={`w-full flex items-center space-x-2.5 px-3 py-2 font-semibold rounded-lg transition-colors text-left ${
                      activeTab === 'security' ? 'bg-[#4ADE80] text-[#003D29]' : 'text-gray-550 hover:bg-gray-50'
                    }`}
                  >
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>Security & Privacy</span>
                  </button>
                </div>
              </div>

              {/* Account Management Card */}
              <div className="bg-white p-5 rounded-xl border border-gray-205 shadow-sm space-y-4">
                <div>
                  <p className="text-[10px] text-red-500 font-bold uppercase tracking-wider">Account Management</p>
                  <p className="text-[10px] text-gray-400 leading-relaxed mt-1">
                    Log out from this device.
                  </p>
                </div>
                <button
                  onClick={() => setLogoutModalOpen(true)}
                  className="w-full border border-red-200 hover:bg-red-50 text-red-650 font-bold text-xs py-2 rounded-lg transition-colors flex items-center justify-center space-x-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out of LCS Treasury</span>
                </button>
              </div>

            </div>

            {/* Right stack column */}
            <div className="lg:col-span-2 space-y-6">
              
              {activeTab === 'profile' && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
                  <h3 className="text-xs font-bold text-gray-905 tracking-tight uppercase">Personal Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-semibold text-gray-600">
                    {/* Full Name */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block" htmlFor="fullname">Full Name</label>
                      <input 
                        id="fullname"
                        type="text" 
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#006B4D]"
                      />
                    </div>

                    {/* Email Address */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block" htmlFor="email">Email Address</label>
                      <input 
                        id="email"
                        type="email" 
                        value={emailAddress}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-500 focus:outline-none cursor-not-allowed"
                      />
                    </div>

                    {/* Bio */}
                    <div className="md:col-span-2 space-y-1.5">
                      <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block" htmlFor="bio">Institutional Bio</label>
                      <textarea 
                        id="bio"
                        rows={3}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#006B4D] resize-none text-xs leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <button 
                      onClick={handleSaveProfile}
                      disabled={savingProfile}
                      className="bg-[#006B4D] hover:bg-[#00523b] text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                    >
                      {savingProfile ? 'Saving...' : 'Save Profile Changes'}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm space-y-6">
                  <h3 className="text-xs font-bold text-gray-905 tracking-tight uppercase">Security & Privacy</h3>
                  
                  <div className="space-y-4 text-xs font-semibold text-gray-600">
                    {/* New Password */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block" htmlFor="newpassword">New Password</label>
                      <input 
                        id="newpassword"
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full max-w-md px-3 py-2 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#006B4D]"
                      />
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block" htmlFor="confirmpassword">Confirm New Password</label>
                      <input 
                        id="confirmpassword"
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full max-w-md px-3 py-2 border border-gray-200 rounded-lg text-gray-800 focus:outline-none focus:ring-1 focus:ring-[#006B4D]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-start pt-4 border-t border-gray-100">
                    <button 
                      onClick={handleSavePassword}
                      disabled={savingPassword}
                      className="bg-[#006B4D] hover:bg-[#00523b] text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                    >
                      {savingPassword ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </div>
              )}

            </div>

          </div>

        </main>
      </div>

      <ConfirmModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={async () => {
          await logout();
          navigate('/login');
        }}
        title="Log Out"
        message="Are you sure you want to log out from this device?"
        icon="logout"
      />
    </div>
  );
}
