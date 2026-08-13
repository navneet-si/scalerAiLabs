export default function SettingsPage() {
  return (
    <div className="flex h-full">
      {/* Settings sidebar placeholder */}
      <div className="w-[235px] border-r border-[var(--color-gray-200)] flex-shrink-0 p-4">
        <div className="text-[14px] font-medium text-[var(--color-purple-700)] bg-[var(--color-purple-50)] px-3 py-2 rounded">
          General
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 p-8 bg-[var(--color-gray-50)]">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-[18px] font-medium text-[var(--color-gray-900)] mb-6">Settings</h1>
          
          <div className="bg-white border border-[var(--color-gray-200)] rounded-lg p-4 flex items-center justify-between">
            <div>
              <div className="text-[14px] font-medium text-[var(--color-gray-900)]">Coming Soon</div>
              <div className="text-[14px] text-[var(--color-gray-500)] mt-1">This page is a placeholder as per the specs.</div>
            </div>
            <div className="w-10 h-6 bg-[var(--color-purple-600)] rounded-full relative">
              <div className="w-4 h-4 bg-white rounded-full absolute right-1 top-1"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
