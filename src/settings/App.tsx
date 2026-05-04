import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { SettingsLayout } from './components/layout/SettingsLayout';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Lazy load sections for better performance
const BasicSettings = React.lazy(() => import('./sections/general/BasicSettings'));
const ModeSettings = React.lazy(() => import('./sections/general/ModeSettings'));
const ActivitySettings = React.lazy(() => import('./sections/general/ActivitySettings'));
const ShortcutSettings = React.lazy(() => import('./sections/general/ShortcutSettings'));
const IdleAutoStart = React.lazy(() => import('./sections/general/IdleAutoStart'));
const NotificationSettings = React.lazy(() => import('./sections/general/NotificationSettings'));
const PerTabDelays = React.lazy(() => import('./sections/general/PerTabDelays'));
const KioskSettings = React.lazy(() => import('./sections/general/KioskSettings'));
const UrlListSettings = React.lazy(() => import('./sections/general/UrlListSettings'));
const StatisticsSettings = React.lazy(() => import('./sections/general/StatisticsSettings'));
const SessionManagement = React.lazy(() => import('./sections/premium/SessionManagement'));
const RefreshSettings = React.lazy(() => import('./sections/premium/RefreshSettings'));
const SkipRules = React.lazy(() => import('./sections/premium/SkipRules'));
const WindowIntervals = React.lazy(() => import('./sections/premium/WindowIntervals'));
const RotationPatterns = React.lazy(() => import('./sections/premium/RotationPatterns'));
const BackupSettings = React.lazy(() => import('./sections/premium/BackupSettings'));
const PremiumActivation = React.lazy(() => import('./sections/premium/PremiumActivation'));
const RemoteConfigSettings = React.lazy(() => import('./sections/premium/RemoteConfigSettings'));
const Diagnostics = React.lazy(() => import('./sections/system/Diagnostics'));
const About = React.lazy(() => import('./sections/system/About'));

function App() {
  return (
    <SettingsLayout>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Default redirect to basic settings */}
          <Route path="/" element={<Navigate to="/basic" replace />} />

          {/* General Settings */}
          <Route path="/basic" element={<BasicSettings />} />
          <Route path="/mode" element={<ModeSettings />} />
          <Route path="/activity" element={<ActivitySettings />} />
          <Route path="/shortcuts" element={<ShortcutSettings />} />
          <Route path="/idle" element={<IdleAutoStart />} />
          <Route path="/notifications" element={<NotificationSettings />} />
          <Route path="/statistics" element={<StatisticsSettings />} />
          <Route path="/general/per-tab-delays" element={<PerTabDelays />} />
          <Route path="/per-tab-delays" element={<PerTabDelays />} />
          <Route path="/kiosk" element={<KioskSettings />} />
          <Route path="/general/kiosk" element={<KioskSettings />} />
          <Route path="/url-list" element={<UrlListSettings />} />

          {/* Premium Settings */}
          <Route path="/premium/activate" element={<PremiumActivation />} />
          <Route path="/sessions" element={<SessionManagement />} />
          <Route path="/refresh" element={<RefreshSettings />} />
          <Route path="/skip" element={<SkipRules />} />
          <Route path="/intervals" element={<WindowIntervals />} />
          <Route path="/patterns" element={<RotationPatterns />} />
          <Route path="/backup" element={<BackupSettings />} />
          <Route path="/remote-config" element={<RemoteConfigSettings />} />

          {/* System */}
          <Route path="/diagnostics" element={<Diagnostics />} />
          <Route path="/about" element={<About />} />

          {/* Fallback for unknown routes */}
          <Route path="*" element={<Navigate to="/basic" replace />} />
        </Routes>
      </Suspense>
    </SettingsLayout>
  );
}

export default App;
