'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useTranslations } from '@/lib/i18n/LanguageContext';
import { useAdminSupabase } from '@/hooks/useAdminSupabase';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const DAY_ABBR = { monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun' };

export default function TemplatesModal({ restaurant, staff, onClose, onApplyTemplate }) {
  const t = useTranslations('rota.templatesModal');
  const supabase = useAdminSupabase();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'create' | 'apply'
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);

  const [templateName, setTemplateName] = useState('');
  const [templateShifts, setTemplateShifts] = useState([]);
  const [newShift, setNewShift] = useState({ day_of_week: 'monday', shift_start: '09:00', shift_end: '17:00', role_required: '', department: '', break_duration: 30 });

  const [applyStartDate, setApplyStartDate] = useState('');
  const [applyWeeks, setApplyWeeks] = useState(1);

  useEffect(() => { if (restaurant) fetchTemplates(); }, [restaurant]);

  useEffect(() => {
    if (!restaurant) return;
    const ch = supabase.channel(`templates-${restaurant.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shift_templates', filter: `restaurant_id=eq.${restaurant.id}` }, fetchTemplates)
      .subscribe();
    return () => ch.unsubscribe();
  }, [restaurant]);

  const fetchTemplates = async () => {
    if (!restaurant) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.from('shift_templates').select('*').eq('restaurant_id', restaurant.id).order('name');
      if (error) throw error;
      setTemplates(data || []);
    } catch (error) { console.error(error); }
    setLoading(false);
  };

  const handleAddShift = () => {
    if (!newShift.role_required.trim()) { alert(t('enterRole')); return; }
    setTemplateShifts([...templateShifts, { ...newShift }]);
    setNewShift({ day_of_week: 'monday', shift_start: '09:00', shift_end: '17:00', role_required: '', department: '', break_duration: 30 });
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) { setMessage({ type: 'error', text: t('enterTemplateName') }); return; }
    if (templateShifts.length === 0) { setMessage({ type: 'error', text: t('addAtLeastOneShift') }); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from('shift_templates').insert({ restaurant_id: restaurant.id, name: templateName, shifts: templateShifts }).select().single();
      if (error) {
        if (error.code === '23505' && error.message.includes('unique_template_name')) {
          setMessage({ type: 'error', text: t('templateNameExists').replace('{name}', templateName) });
          setSaving(false); return;
        }
        throw error;
      }
      setMessage({ type: 'success', text: t('templateSavedSuccess') });
      setTimeout(() => { setMessage(null); setViewMode('list'); setTemplateName(''); setTemplateShifts([]); }, 1500);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || t('failedToSaveTemplate') });
    }
    setSaving(false);
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm(t('confirmDelete'))) return;
    try {
      const { error } = await supabase.from('shift_templates').delete().eq('id', templateId);
      if (error) throw error;
      setMessage({ type: 'success', text: t('templateDeletedSuccess') });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) { alert(error.message); }
  };

  const getDayOffset = (d) => ({ monday: 0, tuesday: 1, wednesday: 2, thursday: 3, friday: 4, saturday: 5, sunday: 6 }[d] || 0);

  const handleApplyTemplate = async () => {
    if (!selectedTemplate || !applyStartDate) { alert(t('selectTemplateAndDate')); return; }
    const confirmMsg = t('confirmApply').replace('{name}', selectedTemplate.name).replace('{weeks}', applyWeeks).replace('{date}', applyStartDate);
    if (!confirm(confirmMsg)) return;
    try {
      const startDate = new Date(applyStartDate);
      const shiftsToCreate = [];
      for (let week = 0; week < applyWeeks; week++) {
        selectedTemplate.shifts.forEach(ts => {
          const d = new Date(startDate);
          d.setDate(startDate.getDate() + week * 7 + getDayOffset(ts.day_of_week));
          shiftsToCreate.push({ restaurant_id: restaurant.id, date: d.toISOString().split('T')[0], shift_start: ts.shift_start, shift_end: ts.shift_end, role_required: ts.role_required, department: ts.department || null, break_duration: ts.break_duration || 30, status: 'draft' });
        });
      }
      const { error } = await supabase.from('shifts').insert(shiftsToCreate);
      if (error) throw error;
      setMessage({ type: 'success', text: t('createdShiftsSuccess').replace('{count}', shiftsToCreate.length) });
      if (onApplyTemplate) onApplyTemplate();
      setTimeout(() => { setMessage(null); onClose(); }, 1500);
    } catch (error) { alert(error.message); }
  };

  const getDayLabel = (d) => t(`days.${d}`);

  // Group template shifts by day for nicer display
  const groupByDay = (shifts) => {
    const grouped = {};
    DAYS.forEach(d => { grouped[d] = []; });
    shifts.forEach(s => { if (grouped[s.day_of_week]) grouped[s.day_of_week].push(s); });
    return grouped;
  };

  const TABS = [
    { key: 'list', label: t('tabTemplates') },
    { key: 'create', label: t('tabCreateNew') },
    ...(selectedTemplate ? [{ key: 'apply', label: t('tabApplyTemplate') }] : [])
  ];

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-zinc-50 dark:bg-zinc-900 rounded-sm w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200">{t('title')}</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 dark:text-zinc-400 mt-0.5">Reusable weekly shift patterns</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-sm text-zinc-400 dark:text-zinc-500 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xl font-bold transition-colors">×</button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 flex gap-1 flex-shrink-0">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setViewMode(tab.key)}
              className={`px-4 py-2 rounded-sm text-sm font-semibold transition-colors ${viewMode === tab.key ? 'bg-[#6262bd] text-white' : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-800 dark:text-zinc-400'}`}>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Message banner */}
        {message && (
          <div className={`mx-6 mt-4 p-3 rounded-sm text-sm font-medium flex-shrink-0 ${message.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
            {message.type === 'success' ? '✅' : '⚠️'} {message.text}
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-4">

          {/* ─── LIST ─── */}
          {viewMode === 'list' && (
            loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-zinc-200 dark:border-zinc-200 dark:border-zinc-800 border-t-[#6262bd] rounded-full animate-spin mb-4"></div>
                <p className="text-zinc-500 dark:text-zinc-400">{t('loadingTemplates')}</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-zinc-400 dark:text-zinc-500">
                <div className="text-5xl mb-4">📋</div>
                <p className="font-medium text-zinc-600 dark:text-zinc-400 mb-4">{t('noTemplatesYet')}</p>
                <button onClick={() => setViewMode('create')} className="px-5 py-2.5 bg-[#6262bd] text-white rounded-sm hover:bg-[#5252a5] transition-colors font-medium">
                  {t('createFirstTemplate')}
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map(template => {
                  const grouped = groupByDay(template.shifts || []);
                  const activeDays = DAYS.filter(d => grouped[d].length > 0);
                  return (
                    <div key={template.id} className={`border-2 rounded-sm overflow-hidden transition-colors ${selectedTemplate?.id === template.id ? 'border-[#6262bd]' : 'border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 hover:border-zinc-200 dark:border-zinc-700 dark:hover:border-zinc-600'}`}>
                      <div className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-sm bg-[#6262bd]/10 flex-shrink-0 flex items-center justify-center">
                            <span className="text-sm font-bold text-[#6262bd]">{template.shifts?.length || 0}</span>
                          </div>
                          <div>
                            <p className="font-semibold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200">{template.name}</p>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400 dark:text-zinc-400">
                              {template.shifts?.length || 0} shifts/week · {activeDays.length} days
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 flex-shrink-0 ml-3">
                          <button
                            onClick={() => { setSelectedTemplate(template); setViewMode('apply'); }}
                            className="px-3 py-1.5 bg-[#6262bd] text-white rounded-sm hover:bg-[#5252a5] transition-colors text-xs font-semibold"
                          >▶ {t('apply')}</button>
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="px-3 py-1.5 text-red-600 border border-red-200 hover:bg-red-50 rounded-sm transition-colors text-xs font-semibold"
                          >🗑</button>
                        </div>
                      </div>

                      {/* Day grid preview */}
                      <div className="px-5 pb-4">
                        <div className="grid grid-cols-7 gap-1">
                          {DAYS.map(day => (
                            <div key={day} className={`rounded-sm p-1.5 text-center ${grouped[day].length > 0 ? 'bg-[#6262bd]/10' : 'bg-zinc-50 dark:bg-zinc-900'}`}>
                              <p className={`text-xs font-semibold ${grouped[day].length > 0 ? 'text-[#6262bd]' : 'text-zinc-400 dark:text-zinc-500 dark:text-zinc-600 dark:text-zinc-400'}`}>{DAY_ABBR[day]}</p>
                              {grouped[day].length > 0 && (
                                <p className="text-xs text-[#6262bd] font-bold">{grouped[day].length}</p>
                              )}
                            </div>
                          ))}
                        </div>
                        {activeDays.length > 0 && (
                          <div className="mt-2 space-y-0.5">
                            {activeDays.map(day =>
                              grouped[day].map((s, i) => (
                                <p key={`${day}-${i}`} className="text-xs text-zinc-600 dark:text-zinc-400 dark:text-zinc-400">
                                  <span className="font-medium">{DAY_ABBR[day]}:</span> {s.shift_start}–{s.shift_end} · {s.role_required}{s.department ? ` (${s.department})` : ''}
                                </p>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* ─── CREATE ─── */}
          {viewMode === 'create' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-1.5">{t('templateNameRequired')}</label>
                <input
                  type="text"
                  value={templateName}
                  onChange={e => setTemplateName(e.target.value)}
                  placeholder={t('templateNamePlaceholder')}
                  className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 transition-colors"
                />
              </div>

              {/* Add shift form */}
              <div className="bg-zinc-50 dark:bg-zinc-50 dark:bg-zinc-900/50 rounded-sm p-4 border-2 border-dashed border-zinc-200 dark:border-zinc-700">
                <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-3">➕ {t('addShiftsToTemplate')}</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 mb-1">{t('dayOfWeek')}</label>
                    <select value={newShift.day_of_week} onChange={e => setNewShift({ ...newShift, day_of_week: e.target.value })}
                      className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700 dark:border-zinc-600 rounded-sm focus:outline-none focus:border-[#6262bd] text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-700 text-sm transition-colors">
                      {DAYS.map(d => <option key={d} value={d}>{getDayLabel(d)}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 mb-1">{t('roleRequired')}</label>
                    <input type="text" value={newShift.role_required} onChange={e => setNewShift({ ...newShift, role_required: e.target.value })} placeholder={t('roleRequiredPlaceholder')}
                      className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700 dark:border-zinc-600 rounded-sm focus:outline-none focus:border-[#6262bd] text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-700 text-sm placeholder:text-zinc-400 dark:text-zinc-500 transition-colors" />
                  </div>
                  <div className="col-span-2 grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 mb-1">{t('startTime')}</label>
                      <input type="time" value={newShift.shift_start} onChange={e => setNewShift({ ...newShift, shift_start: e.target.value })}
                        className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700 dark:border-zinc-600 rounded-sm focus:outline-none focus:border-[#6262bd] text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-700 text-sm transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 mb-1">{t('endTime')}</label>
                      <input type="time" value={newShift.shift_end} onChange={e => setNewShift({ ...newShift, shift_end: e.target.value })}
                        className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700 dark:border-zinc-600 rounded-sm focus:outline-none focus:border-[#6262bd] text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-700 text-sm transition-colors" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-600 dark:text-zinc-400 dark:text-zinc-400 mb-1">Break (min)</label>
                      <input type="number" value={newShift.break_duration} onChange={e => setNewShift({ ...newShift, break_duration: parseInt(e.target.value) })} min="0" max="180"
                        className="w-full px-3 py-2.5 border border-zinc-200 dark:border-zinc-700 dark:border-zinc-600 rounded-sm focus:outline-none focus:border-[#6262bd] text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-700 text-sm transition-colors" />
                    </div>
                  </div>
                </div>
                <button onClick={handleAddShift} className="w-full py-2.5 bg-[#6262bd] text-white rounded-sm hover:bg-[#5252a5] transition-colors font-semibold text-sm">
                  ➕ {t('addShiftToTemplate')}
                </button>
              </div>

              {/* Shifts list */}
              {templateShifts.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-2">{t('shiftsInTemplate')} ({templateShifts.length})</p>
                  <div className="space-y-1.5">
                    {templateShifts.map((s, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 rounded-sm">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-[#6262bd] bg-[#6262bd]/10 px-2 py-1 rounded-sm">{DAY_ABBR[s.day_of_week]}</span>
                          <span className="text-sm text-zinc-700 dark:text-zinc-300 dark:text-zinc-300">
                            {s.shift_start}–{s.shift_end} · {s.role_required}{s.department ? ` · ${s.department}` : ''}
                          </span>
                        </div>
                        <button onClick={() => setTemplateShifts(templateShifts.filter((_, j) => j !== i))}
                          className="text-red-500 hover:text-red-600 text-sm font-bold px-2 py-1 rounded-sm hover:bg-red-50 transition-colors">
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─── APPLY ─── */}
          {viewMode === 'apply' && selectedTemplate && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 p-4 bg-[#6262bd]/5 border-2 border-[#6262bd]/20 rounded-sm">
                <div className="w-10 h-10 rounded-sm bg-[#6262bd] flex-shrink-0 flex items-center justify-center text-zinc-900 dark:text-white font-bold">
                  {selectedTemplate.shifts?.length || 0}
                </div>
                <div>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200 dark:text-zinc-200">{selectedTemplate.name}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{selectedTemplate.shifts?.length || 0} shifts per week</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-1.5">{t('startDateLabel')}</label>
                  <input type="date" value={applyStartDate} onChange={e => setApplyStartDate(e.target.value)}
                    className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 transition-colors" />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t('startDateHelper')}</p>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300 dark:text-zinc-300 mb-1.5">{t('numberOfWeeks')}</label>
                  <input type="number" value={applyWeeks} onChange={e => setApplyWeeks(parseInt(e.target.value) || 1)} min="1" max="12"
                    className="w-full px-4 py-3 border border-zinc-200 dark:border-zinc-700 rounded-sm focus:outline-none focus:border-[#6262bd] text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 transition-colors" />
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{t('numberOfWeeksHelper')}</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-sm">
                <p className="text-sm text-blue-800 dark:text-blue-300">
                  <strong>{t('noteLabel')}</strong> {t('noteText').replace('{count}', (selectedTemplate.shifts?.length || 0) * applyWeeks)} draft shifts will be created.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 dark:border-zinc-700 flex gap-3 flex-shrink-0">
          {viewMode === 'list' && (
            <>
              <button onClick={onClose} className="flex-1 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 py-3 rounded-sm font-medium hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors">{t('cancel')}</button>
              <button onClick={() => setViewMode('create')} className="flex-1 bg-[#6262bd] text-white py-3 rounded-sm font-semibold hover:bg-[#5252a5] transition-colors">
                ➕ {t('tabCreateNew')}
              </button>
            </>
          )}
          {viewMode === 'create' && (
            <>
              <button onClick={() => setViewMode('list')} className="flex-1 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 py-3 rounded-sm font-medium hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors">{t('cancel')}</button>
              <button onClick={handleSaveTemplate} disabled={saving} className="flex-1 bg-[#6262bd] text-white py-3 rounded-sm font-semibold hover:bg-[#5252a5] transition-colors disabled:opacity-50">
                {saving ? '...' : t('saveTemplate')}
              </button>
            </>
          )}
          {viewMode === 'apply' && (
            <>
              <button onClick={() => setViewMode('list')} className="flex-1 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 py-3 rounded-sm font-medium hover:bg-zinc-50 dark:bg-zinc-900 dark:hover:bg-zinc-800 transition-colors">{t('cancel')}</button>
              <button onClick={handleApplyTemplate} className="flex-1 bg-[#6262bd] text-white py-3 rounded-sm font-semibold hover:bg-[#5252a5] transition-colors">
                ▶ {t('applyTemplate')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
