type Tab = 'queue' | 'add' | 'guests' | 'settings' | 'approval';

interface TabBarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  isHost: boolean;
  pendingCount?: number;
}

interface TabConfig {
  id: Tab;
  label: string;
  icon: string;
  hostOnly?: boolean;
}

const TABS: TabConfig[] = [
  { id: 'queue', label: 'Queue', icon: '🎵' },
  { id: 'add', label: 'Add', icon: '+' },
  { id: 'guests', label: 'Guests', icon: '👥' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
  { id: 'approval', label: 'Approve', icon: '✓', hostOnly: true },
];

export function TabBar({ activeTab, onTabChange, isHost, pendingCount = 0 }: TabBarProps) {
  const visibleTabs = TABS.filter((t) => !t.hostOnly || isHost);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20 bg-bg/90 backdrop-blur-md border-t border-border pb-safe">
      <div className="flex items-stretch max-w-lg mx-auto">
        {visibleTabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const badge = tab.id === 'approval' && pendingCount > 0;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={[
                'flex-1 flex flex-col items-center gap-1 py-3 px-1 text-xs font-medium transition-colors relative',
                isActive ? 'text-white' : 'text-white/40 hover:text-white/60',
              ].join(' ')}
            >
              <span className="text-lg leading-none relative">
                {tab.icon}
                {badge && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-error text-white text-xs flex items-center justify-center font-bold leading-none">
                    {pendingCount > 9 ? '9+' : pendingCount}
                  </span>
                )}
              </span>
              <span className="leading-none">{tab.label}</span>
              {isActive && (
                <span className="absolute bottom-0 left-1/4 right-1/4 h-0.5 bg-gradient-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
