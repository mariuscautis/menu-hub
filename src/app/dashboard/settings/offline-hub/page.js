'use client'

import PageTabs from '@/components/PageTabs'
import { settingsTabs } from '@/components/PageTabsConfig'
import OfflinePageGuard from '@/components/OfflinePageGuard'
import { useRestaurant } from '@/lib/RestaurantContext'

export default function OfflineHubSettings() {
  const restaurantCtx = useRestaurant()
  const isOwnerOrAdmin = restaurantCtx?.userType === 'owner' || restaurantCtx?.userType === 'staff-admin'

  return (
    <OfflinePageGuard>
      <div>
        {isOwnerOrAdmin && <PageTabs tabs={settingsTabs} />}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
            <svg className="w-7 h-7 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
            </svg>
            Offline Mode
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Menu Hub works without internet. Orders placed offline are saved on each device and synced automatically when the connection returns.
          </p>
        </div>

        <div className="space-y-6">
          {/* How it works */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-4">How offline mode works</h2>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400 font-bold text-sm">1</div>
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-200 text-sm">Orders saved locally</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">When internet is unavailable, orders are saved directly on the device in a local queue. Staff can continue taking orders without interruption.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400 font-bold text-sm">2</div>
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-200 text-sm">Automatic sync on reconnect</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">As soon as internet returns, all queued orders and payments are pushed to the cloud automatically — no manual action needed.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400 font-bold text-sm">3</div>
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-200 text-sm">Each device syncs independently</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Every device maintains its own local queue. When multiple devices come back online, each syncs its own orders. No device needs to wait for another.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center flex-shrink-0 text-indigo-600 dark:text-indigo-400 font-bold text-sm">4</div>
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-200 text-sm">Cash payments queued too</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Cash and external terminal payments made while offline are queued and recorded in the system once the connection is restored.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Status indicators */}
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-3">Status indicators</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                <p className="text-sm text-slate-600 dark:text-slate-400"><span className="font-medium text-slate-700 dark:text-slate-200">Green dot</span> — connected to the internet, orders sync in real time.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                <p className="text-sm text-slate-600 dark:text-slate-400"><span className="font-medium text-slate-700 dark:text-slate-200">Red dot</span> — no internet. Orders are being saved locally on this device.</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400"><span className="font-medium text-slate-700 dark:text-slate-200">Orange number</span> — orders pending sync. Will clear automatically once internet returns.</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300">
            <strong>Note:</strong> The app must have been opened on the device at least once while online for offline mode to be active. Make sure staff open the app before going to areas with no signal.
          </div>
        </div>
      </div>
    </OfflinePageGuard>
  )
}
