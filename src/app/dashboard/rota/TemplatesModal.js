'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function TemplatesModal({ restaurant, staff, onClose, onApplyTemplate }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list', 'create', 'view', 'apply'
  const [message, setMessage] = useState(null);

  // Template creation state
  const [templateName, setTemplateName] = useState('');
  const [templateShifts, setTemplateShifts] = useState([]);
  const [newShift, setNewShift] = useState({
    day_of_week: 'monday',
    shift_start: '09:00',
    shift_end: '17:00',
    role_required: '',
    department: '',
    break_duration: 30
  });

  // Apply template state
  const [applyStartDate, setApplyStartDate] = useState('');
  const [applyWeeks, setApplyWeeks] = useState(1);

  useEffect(() => {
    if (restaurant) {
      fetchTemplates();
    }
  }, [restaurant]);

  // Real-time subscription
  useEffect(() => {
    if (!restaurant) return;

    const templatesChannel = supabase
      .channel(`templates-${restaurant.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'shift_templates',
        filter: `restaurant_id=eq.${restaurant.id}`
      }, () => {
        fetchTemplates();
      })
      .subscribe();

    return () => {
      templatesChannel.unsubscribe();
    };
  }, [restaurant]);

  const fetchTemplates = async () => {
    if (!restaurant) return;

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('shift_templates')
        .select('*')
        .eq('restaurant_id', restaurant.id)
        .order('name');

      if (error) throw error;

      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }

    setLoading(false);
  };

  const handleAddShift = () => {
    if (!newShift.role_required) {
      alert('Please enter a role');
      return;
    }

    setTemplateShifts([...templateShifts, { ...newShift }]);
    setNewShift({
      day_of_week: 'monday',
      shift_start: '09:00',
      shift_end: '17:00',
      role_required: '',
      department: '',
      break_duration: 30
    });
  };

  const handleRemoveShift = (index) => {
    setTemplateShifts(templateShifts.filter((_, i) => i !== index));
  };

  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      setMessage({ type: 'error', text: 'Please enter a template name' });
      return;
    }

    if (templateShifts.length === 0) {
      setMessage({ type: 'error', text: 'Please add at least one shift to the template' });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('shift_templates')
        .insert({
          restaurant_id: restaurant.id,
          name: templateName,
          shifts: templateShifts
        })
        .select()
        .single();

      if (error) {
        // Handle duplicate name error
        if (error.code === '23505' && error.message.includes('unique_template_name')) {
          setMessage({ type: 'error', text: `A template named "${templateName}" already exists. Please use a different name.` });
          return;
        }
        throw error;
      }

      setMessage({ type: 'success', text: 'Template saved successfully' });
      setTimeout(() => {
        setMessage(null);
        setViewMode('list');
        setTemplateName('');
        setTemplateShifts([]);
      }, 2000);
    } catch (error) {
      console.error('Error saving template:', error);
      setMessage({ type: 'error', text: error.message || 'Failed to save template' });
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!confirm('Are you sure you want to delete this template?')) return;

    try {
      const { error } = await supabase
        .from('shift_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Template deleted successfully' });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      console.error('Error deleting template:', error);
      alert(error.message);
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate || !applyStartDate) {
      alert('Please select a template and start date');
      return;
    }

    if (!confirm(`Apply "${selectedTemplate.name}" template for ${applyWeeks} week(s) starting ${applyStartDate}?`)) {
      return;
    }

    try {
      const startDate = new Date(applyStartDate);
      const shiftsToCreate = [];

      // For each week
      for (let week = 0; week < applyWeeks; week++) {
        // For each shift in template
        selectedTemplate.shifts.forEach(templateShift => {
          const dayOffset = getDayOffset(templateShift.day_of_week);
          const shiftDate = new Date(startDate);
          shiftDate.setDate(startDate.getDate() + (week * 7) + dayOffset);

          shiftsToCreate.push({
            restaurant_id: restaurant.id,
            date: shiftDate.toISOString().split('T')[0],
            shift_start: templateShift.shift_start,
            shift_end: templateShift.shift_end,
            role_required: templateShift.role_required,
            department: templateShift.department || null,
            break_duration: templateShift.break_duration || 30,
            status: 'draft'
          });
        });
      }

      // Create all shifts
      const { error } = await supabase
        .from('shifts')
        .insert(shiftsToCreate);

      if (error) throw error;

      setMessage({ type: 'success', text: `Created ${shiftsToCreate.length} shifts from template` });

      // Notify parent component to refresh
      if (onApplyTemplate) {
        onApplyTemplate();
      }

      setTimeout(() => {
        setMessage(null);
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error applying template:', error);
      alert(error.message);
    }
  };

  const getDayOffset = (dayOfWeek) => {
    const days = {
      monday: 0,
      tuesday: 1,
      wednesday: 2,
      thursday: 3,
      friday: 4,
      saturday: 5,
      sunday: 6
    };
    return days[dayOfWeek] || 0;
  };

  const getDayLabel = (day) => {
    return day.charAt(0).toUpperCase() + day.slice(1);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl p-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-800">Shift Templates</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-xl ${
              message.type === 'success'
                ? 'bg-green-50 border-2 border-green-200 text-green-700'
                : 'bg-red-50 border-2 border-red-200 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* View Mode Tabs */}
        <div className="flex gap-2 mb-6 border-b-2 border-slate-100">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 font-medium transition-colors ${
              viewMode === 'list'
                ? 'text-[#6262bd] border-b-2 border-[#6262bd] -mb-0.5'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setViewMode('create')}
            className={`px-4 py-2 font-medium transition-colors ${
              viewMode === 'create'
                ? 'text-[#6262bd] border-b-2 border-[#6262bd] -mb-0.5'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Create New
          </button>
          {selectedTemplate && (
            <button
              onClick={() => setViewMode('apply')}
              className={`px-4 py-2 font-medium transition-colors ${
                viewMode === 'apply'
                  ? 'text-[#6262bd] border-b-2 border-[#6262bd] -mb-0.5'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Apply Template
            </button>
          )}
        </div>

        {/* Template List View */}
        {viewMode === 'list' && (
          <div>
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#6262bd] mx-auto mb-4"></div>
                <p className="text-slate-600">Loading templates...</p>
              </div>
            ) : templates.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-600 mb-4">No templates created yet</p>
                <button
                  onClick={() => setViewMode('create')}
                  className="px-6 py-3 bg-[#6262bd] text-white rounded-xl hover:bg-[#5252a5] transition-colors font-medium"
                >
                  Create Your First Template
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {templates.map(template => (
                  <div
                    key={template.id}
                    className="border-2 border-slate-100 rounded-xl p-6 hover:border-slate-200 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">{template.name}</h3>
                        <p className="text-sm text-slate-600">
                          {template.shifts?.length || 0} shift{template.shifts?.length !== 1 ? 's' : ''} per week
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedTemplate(template);
                            setViewMode('apply');
                          }}
                          className="px-4 py-2 bg-[#6262bd] text-white rounded-lg hover:bg-[#5252a5] transition-colors text-sm font-medium"
                        >
                          Apply
                        </button>
                        <button
                          onClick={() => handleDeleteTemplate(template.id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Show template shifts */}
                    <div className="bg-slate-50 rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {template.shifts?.map((shift, index) => (
                          <div key={index} className="text-sm">
                            <span className="font-medium text-slate-700">{getDayLabel(shift.day_of_week)}:</span>{' '}
                            <span className="text-slate-600">
                              {shift.shift_start} - {shift.shift_end} • {shift.role_required}
                              {shift.department && ` (${shift.department})`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Template View */}
        {viewMode === 'create' && (
          <div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Template Name *
              </label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Standard Week, Weekend Schedule"
                className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
              />
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-800 mb-4">Add Shifts to Template</h3>

              <div className="bg-slate-50 rounded-xl p-6 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Day of Week</label>
                    <select
                      value={newShift.day_of_week}
                      onChange={(e) => setNewShift({ ...newShift, day_of_week: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                    >
                      <option value="monday">Monday</option>
                      <option value="tuesday">Tuesday</option>
                      <option value="wednesday">Wednesday</option>
                      <option value="thursday">Thursday</option>
                      <option value="friday">Friday</option>
                      <option value="saturday">Saturday</option>
                      <option value="sunday">Sunday</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Role Required</label>
                    <input
                      type="text"
                      value={newShift.role_required}
                      onChange={(e) => setNewShift({ ...newShift, role_required: e.target.value })}
                      placeholder="e.g., Server, Chef"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Start Time</label>
                    <input
                      type="time"
                      value={newShift.shift_start}
                      onChange={(e) => setNewShift({ ...newShift, shift_start: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">End Time</label>
                    <input
                      type="time"
                      value={newShift.shift_end}
                      onChange={(e) => setNewShift({ ...newShift, shift_end: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Department</label>
                    <select
                      value={newShift.department}
                      onChange={(e) => setNewShift({ ...newShift, department: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                    >
                      <option value="">None</option>
                      <option value="kitchen">Kitchen</option>
                      <option value="bar">Bar</option>
                      <option value="universal">Universal</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Break (minutes)</label>
                    <input
                      type="number"
                      value={newShift.break_duration}
                      onChange={(e) => setNewShift({ ...newShift, break_duration: parseInt(e.target.value) })}
                      min="0"
                      max="180"
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                    />
                  </div>
                </div>

                <button
                  onClick={handleAddShift}
                  className="w-full px-6 py-3 bg-[#6262bd] text-white rounded-xl hover:bg-[#5252a5] transition-colors font-medium"
                >
                  + Add Shift to Template
                </button>
              </div>

              {/* Template Shifts List */}
              {templateShifts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-slate-700 mb-2">Shifts in Template ({templateShifts.length})</h4>
                  {templateShifts.map((shift, index) => (
                    <div
                      key={index}
                      className="flex justify-between items-center p-4 bg-white border-2 border-slate-100 rounded-xl"
                    >
                      <div>
                        <span className="font-medium text-slate-800">{getDayLabel(shift.day_of_week)}</span>
                        <span className="text-slate-600 ml-3">
                          {shift.shift_start} - {shift.shift_end} • {shift.role_required}
                          {shift.department && ` (${shift.department})`}
                        </span>
                      </div>
                      <button
                        onClick={() => handleRemoveShift(index)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setViewMode('list')}
                className="px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl hover:border-[#6262bd] transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                className="px-6 py-3 bg-[#6262bd] text-white rounded-xl hover:bg-[#5252a5] transition-colors font-medium"
              >
                Save Template
              </button>
            </div>
          </div>
        )}

        {/* Apply Template View */}
        {viewMode === 'apply' && selectedTemplate && (
          <div>
            <h3 className="text-lg font-bold text-slate-800 mb-4">Apply: {selectedTemplate.name}</h3>

            <div className="bg-slate-50 rounded-xl p-6 mb-6">
              <p className="text-sm text-slate-600 mb-4">
                This template contains {selectedTemplate.shifts?.length || 0} shifts per week
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Start Date (Monday) *
                  </label>
                  <input
                    type="date"
                    value={applyStartDate}
                    onChange={(e) => setApplyStartDate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Select the Monday of the first week
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Number of Weeks
                  </label>
                  <input
                    type="number"
                    value={applyWeeks}
                    onChange={(e) => setApplyWeeks(parseInt(e.target.value) || 1)}
                    min="1"
                    max="12"
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:outline-none focus:border-[#6262bd]"
                  />
                  <p className="text-xs text-slate-500 mt-2">
                    Apply template for multiple weeks (max 12)
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This will create {(selectedTemplate.shifts?.length || 0) * applyWeeks} shifts
                as drafts. You can edit or delete them before publishing.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setViewMode('list')}
                className="px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl hover:border-[#6262bd] transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyTemplate}
                className="px-6 py-3 bg-[#6262bd] text-white rounded-xl hover:bg-[#5252a5] transition-colors font-medium"
              >
                Apply Template
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
