import { LogOut, LogIn, Calendar, Menu, Eye } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSchoolYearStore } from '../store/schoolYearStore';
import { useSidebarStore } from '../store/sidebarStore';
import { ConfirmModal } from './ConfirmModal';
import { LoginModal } from './LoginModal';

interface HeaderProps {
  userName?: string;
  userRole?: string;
  userAvatar?: string;
}

export default function Header({ 
  userRole = "LCS Office",
}: HeaderProps) {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const isViewMode = useAuthStore(state => state.isViewMode);
  const toggleSidebar = useSidebarStore(state => state.toggle);
  const navigate = useNavigate();
  const schoolYear = useSchoolYearStore(state => state.schoolYear);
  const setSchoolYear = useSchoolYearStore(state => state.setSchoolYear);
  const [showYearMenu, setShowYearMenu] = useState(false);
  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Generate school years dynamically (from 2006-2007 to 2046-2047)
  const generateSchoolYears = () => {
    const years = [];
    const startYear = 2026;
    const endYear = 2090;
    
    for (let year = startYear; year <= endYear; year++) {
      years.push(`${year}-${year + 1}`);
    }
    
    return years; // 2026-2027 will be in the middle, scrolling down shows future years
  };

  const schoolYearOptions = generateSchoolYears();

  const displayName = isViewMode ? 'View Only' : (user?.full_name || user?.username || 'Admin');
  const displayRole = isViewMode ? 'Public View' : userRole;

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/dashboard');
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-3.5 flex justify-between items-center shrink-0">
      <div className="flex items-center flex-1 mr-4">
        <button 
          onClick={toggleSidebar}
          className="mr-3 p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* User actions */}
      <div className="flex items-center space-x-2 md:space-x-5">
        {/* School Year Button */}
        <button 
          onClick={() => setShowYearMenu(true)}
          className="flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-[#006B4D] to-[#00523b] text-white rounded-lg shadow-sm border border-[#004d38] hover:from-[#00523b] hover:to-[#004238] transition-all text-xs font-semibold whitespace-nowrap"
        >
          <Calendar className="h-4 w-4" />
          <span>{schoolYear}</span>
        </button>

        {/* School Year Modal */}
        {showYearMenu && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
              <div className="flex justify-between items-center">
                <h2 className="text-sm font-bold text-gray-900">Select School Year</h2>
                <button 
                  onClick={() => setShowYearMenu(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Scrollable School Years */}
              <div className="overflow-y-auto max-h-72 space-y-2 pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {schoolYearOptions.map(year => (
                  <button
                    key={year}
                    onClick={() => {
                      setSchoolYear(year);
                      setShowYearMenu(false);
                    }}
                    className={`w-full px-4 py-3 rounded-lg text-sm font-semibold transition-all ${
                      schoolYear === year 
                        ? 'bg-[#006B4D] text-white shadow-md' 
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Logout / Login */}
        {isViewMode ? (
          <button
            onClick={() => setShowLoginModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#006B4D] hover:bg-[#005a3e] text-white text-xs font-semibold rounded-lg transition-colors"
            title="Log in to your account"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Login</span>
          </button>
        ) : (
          <button
            onClick={() => setLogoutModalOpen(true)}
            className="text-gray-400 hover:text-red-500 transition-colors"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}

        {/* Profile */}
        <div className="flex items-center space-x-3 border-l border-gray-200 pl-3 md:pl-5">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-gray-900 leading-none">{displayName}</p>
            <span className="text-[9px] text-gray-500 font-semibold block mt-0.5">{displayRole}</span>
          </div>
          {isViewMode ? (
            <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
              <Eye className="h-4 w-4 text-gray-400" />
            </div>
          ) : (
            <img
              src={user?.avatar || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100"}
              alt="Profile"
              className="w-8 h-8 rounded-full object-cover border border-gray-200"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100";
              }}
            />
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleLogout}
        title="Log Out"
        message="Are you sure you want to log out?"
        isProcessing={isLoggingOut}
        icon="logout"
      />

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </header>
  );
}
