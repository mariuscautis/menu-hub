'use client'

import { useState, useEffect } from 'react'
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '@/lib/supabase'

// Draggable Table Component
function DraggableTable({ table, isSelected, onClick }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `table-${table.id}`,
    data: { type: 'table', table }
  })

  // Calculate position with transform applied
  const x = (table.x_position || 0) + (transform?.x || 0)
  const y = (table.y_position || 0) + (transform?.y || 0)

  const style = {
    position: 'absolute',
    left: x,
    top: y,
    width: table.width || 80,
    height: table.height || 80,
    transform: 'translate(0, 0)', // Override DnD transform
    zIndex: isDragging ? 1000 : isSelected ? 100 : 10,
    opacity: isDragging ? 0.5 : 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  }

  const shapeClass = table.shape === 'circle'
    ? 'rounded-full'
    : table.shape === 'square'
    ? 'rounded-lg'
    : 'rounded-xl'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`${shapeClass} bg-white dark:bg-slate-700 border-2 ${
        isSelected
          ? 'border-primary shadow-lg'
          : 'border-slate-300 dark:border-slate-400'
      } flex flex-col items-center justify-center transition-all hover:shadow-md select-none relative`}
    >
      <div className="text-center p-2 pointer-events-none">
        <div className="font-bold text-slate-800 dark:text-slate-200">T{table.table_number}</div>
        <div className="text-xs text-slate-600 dark:text-slate-400">{table.capacity} seats</div>
      </div>
    </div>
  )
}

// Decorative Element Component
function DecorativeElement({ element, isSelected, onClick }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `element-${element.id}`,
    data: { type: 'element', element }
  })

  // Calculate position with transform applied
  const x = (element.x_position || 0) + (transform?.x || 0)
  const y = (element.y_position || 0) + (transform?.y || 0)
  const rotation = element.rotation || 0

  const style = {
    position: 'absolute',
    left: x,
    top: y,
    width: element.width,
    height: element.height,
    transform: `rotate(${rotation}deg)`, // Only apply rotation, not drag transform
    zIndex: element.z_index || 0,
    opacity: isDragging ? 0.5 : 0.8,
    cursor: isDragging ? 'grabbing' : 'grab',
    backgroundColor: element.color || '#e2e8f0'
  }

  const getElementIcon = () => {
    switch (element.element_type) {
      case 'wall': return '▮'
      case 'door': return '⌂'
      case 'window': return '◫'
      case 'plant': return '☘'
      case 'counter': return '▬'
      case 'bar': return '🍷'
      case 'entrance': return '⬇'
      case 'exit': return '⬆'
      case 'stairs': return '⚏'
      case 'restroom': return '♿'
      default: return '◻'
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`rounded-lg border-2 ${
        isSelected
          ? 'border-amber-500 shadow-lg'
          : 'border-slate-400 dark:border-slate-500'
      } flex items-center justify-center text-3xl transition-all hover:shadow-md select-none text-slate-700 dark:text-slate-200`}
    >
      <span className="pointer-events-none">{getElementIcon()}</span>
      {element.label && (
        <span className="text-xs absolute bottom-0 left-0 right-0 bg-black/50 dark:bg-black/70 text-white text-center py-0.5 pointer-events-none">
          {element.label}
        </span>
      )}
    </div>
  )
}

// Main Floor Plan Editor
export default function FloorPlanPage() {
  const [restaurant, setRestaurant] = useState(null)
  const [floors, setFloors] = useState([])
  const [currentFloor, setCurrentFloor] = useState(null)
  const [tables, setTables] = useState([])
  const [elements, setElements] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [availableTables, setAvailableTables] = useState([])
  const [showAddTableModal, setShowAddTableModal] = useState(false)
  const [showFloorModal, setShowFloorModal] = useState(false)
  const [editingFloor, setEditingFloor] = useState(null)
  const [floorForm, setFloorForm] = useState({
    name: '',
    level: 0,
    width: 1200,
    height: 800,
    background_color: '#ffffff'
  })

  // Canvas settings
  const canvasWidth = currentFloor?.width || 1200
  const canvasHeight = currentFloor?.height || 800

  // Detect dark mode for canvas background
  const [isDarkMode, setIsDarkMode] = useState(false)

  useEffect(() => {
    // Check if dark mode is active
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'))
    }

    checkDarkMode()

    // Watch for dark mode changes
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [])

  // Configure drag sensors - require 5px movement to start dragging
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px of movement required before drag starts
      },
    })
  )

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: rest } = await supabase
        .from('restaurants')
        .select('*')
        .eq('owner_id', user.id)
        .single()

      if (!rest) return

      setRestaurant(rest)

      const { data: floorsData } = await supabase
        .from('floors')
        .select('*')
        .eq('restaurant_id', rest.id)
        .order('level')

      setFloors(floorsData || [])
      if (floorsData && floorsData.length > 0) {
        setCurrentFloor(floorsData[0])
        await loadFloorData(floorsData[0].id, rest.id)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFloorData = async (floorId, restaurantId) => {
    const { data: tablesData } = await supabase
      .from('tables')
      .select('*')
      .eq('floor_id', floorId)
      .order('table_number')

    const { data: elementsData } = await supabase
      .from('floor_elements')
      .select('*')
      .eq('floor_id', floorId)

    setTables(tablesData || [])
    setElements(elementsData || [])

    // Load tables without a floor (deleted tables)
    if (restaurantId) {
      const { data: unassignedTables } = await supabase
        .from('tables')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .is('floor_id', null)
        .order('table_number')

      setAvailableTables(unassignedTables || [])

      // Trigger initial fetch of operational status
      setRefreshTrigger(prev => prev + 1)
    }
  }


  const handleDragEnd = async (event) => {
    const { active, delta } = event
    const activeId = active.id.toString()

    // Extract type and id properly (handles UUIDs with dashes)
    let type, id
    if (activeId.startsWith('table-')) {
      type = 'table'
      id = activeId.substring(6) // Remove 'table-' prefix
    } else if (activeId.startsWith('element-')) {
      type = 'element'
      id = activeId.substring(8) // Remove 'element-' prefix
    } else {
      return
    }

    // If delta is very small (less than 8px), treat it as a click/selection
    // This accounts for the 5px activation threshold
    const distance = Math.sqrt(delta.x ** 2 + delta.y ** 2)

    if (distance < 8) {
      // This was a click, not a drag - select the item
      if (type === 'table') {
        const table = tables.find(t => t.id === id)
        if (table) setSelectedItem({ ...table, type: 'table' })
      } else if (type === 'element') {
        const element = elements.find(e => e.id === id)
        if (element) setSelectedItem({ ...element, type: 'element' })
      }
      return
    }

    // Otherwise, this was a drag - update position
    if (type === 'table') {
      const tableIndex = tables.findIndex(t => t.id === id)
      if (tableIndex === -1) return

      const table = tables[tableIndex]
      const newX = Math.round((table.x_position || 0) + delta.x)
      const newY = Math.round((table.y_position || 0) + delta.y)

      // Constrain to canvas boundaries
      const constrainedX = Math.max(0, Math.min(newX, canvasWidth - (table.width || 80)))
      const constrainedY = Math.max(0, Math.min(newY, canvasHeight - (table.height || 80)))

      const updatedTable = {
        ...table,
        x_position: constrainedX,
        y_position: constrainedY
      }

      const newTables = [...tables]
      newTables[tableIndex] = updatedTable
      setTables(newTables)

      // Also select the item that was dragged
      setSelectedItem({ ...updatedTable, type: 'table' })

      await supabase
        .from('tables')
        .update({
          x_position: updatedTable.x_position,
          y_position: updatedTable.y_position
        })
        .eq('id', id)
    } else if (type === 'element') {
      const elementIndex = elements.findIndex(e => e.id === id)
      if (elementIndex === -1) return

      const element = elements[elementIndex]
      const newX = Math.round((element.x_position || 0) + delta.x)
      const newY = Math.round((element.y_position || 0) + delta.y)

      // Constrain to canvas boundaries
      const constrainedX = Math.max(0, Math.min(newX, canvasWidth - (element.width || 100)))
      const constrainedY = Math.max(0, Math.min(newY, canvasHeight - (element.height || 100)))

      const updatedElement = {
        ...element,
        x_position: constrainedX,
        y_position: constrainedY
      }

      const newElements = [...elements]
      newElements[elementIndex] = updatedElement
      setElements(newElements)

      // Also select the item that was dragged
      setSelectedItem({ ...updatedElement, type: 'element' })

      await supabase
        .from('floor_elements')
        .update({
          x_position: updatedElement.x_position,
          y_position: updatedElement.y_position
        })
        .eq('id', id)
    }
  }

  const addDecorativeElement = async (elementType) => {
    if (!currentFloor) return

    const newElement = {
      floor_id: currentFloor.id,
      element_type: elementType,
      x_position: 100,
      y_position: 100,
      width: elementType === 'wall' ? 200 : 80,
      height: elementType === 'wall' ? 20 : 80,
      z_index: 0
    }

    const { data, error } = await supabase
      .from('floor_elements')
      .insert([newElement])
      .select()
      .single()

    if (!error && data) {
      setElements([...elements, data])
    }
  }

  const deleteSelected = async () => {
    if (!selectedItem) return

    const confirmDelete = window.confirm(
      selectedItem.type === 'table'
        ? `Remove Table ${selectedItem.table_number} from this floor? (You can add it back later)`
        : 'Delete this element permanently?'
    )

    if (!confirmDelete) return

    if (selectedItem.type === 'table') {
      await supabase.from('tables').update({ floor_id: null }).eq('id', selectedItem.id)
      setTables(tables.filter(t => t.id !== selectedItem.id))
      // Reload available tables
      await loadFloorData(currentFloor.id, restaurant.id)
    } else {
      await supabase.from('floor_elements').delete().eq('id', selectedItem.id)
      setElements(elements.filter(e => e.id !== selectedItem.id))
    }
    setSelectedItem(null)
  }

  const addTableToFloor = async (tableId) => {
    if (!currentFloor) return

    await supabase
      .from('tables')
      .update({
        floor_id: currentFloor.id,
        x_position: 100,
        y_position: 100
      })
      .eq('id', tableId)

    // Reload floor data to show the new table
    await loadFloorData(currentFloor.id, restaurant.id)
    setShowAddTableModal(false)
  }

  const updateElementProperty = async (property, value) => {
    if (!selectedItem || selectedItem.type !== 'element') return

    const elementIndex = elements.findIndex(e => e.id === selectedItem.id)
    if (elementIndex === -1) return

    const updatedElement = {
      ...elements[elementIndex],
      [property]: value
    }

    const newElements = [...elements]
    newElements[elementIndex] = updatedElement
    setElements(newElements)
    setSelectedItem({ ...updatedElement, type: 'element' })

    await supabase
      .from('floor_elements')
      .update({ [property]: value })
      .eq('id', selectedItem.id)
  }

  const updateTableProperty = async (property, value) => {
    if (!selectedItem || selectedItem.type !== 'table') return

    const tableIndex = tables.findIndex(t => t.id === selectedItem.id)
    if (tableIndex === -1) return

    const updatedTable = {
      ...tables[tableIndex],
      [property]: value
    }

    const newTables = [...tables]
    newTables[tableIndex] = updatedTable
    setTables(newTables)
    setSelectedItem({ ...updatedTable, type: 'table' })

    await supabase
      .from('tables')
      .update({ [property]: value })
      .eq('id', selectedItem.id)
  }

  const openEditFloorModal = (floor) => {
    setEditingFloor(floor)
    setFloorForm({
      name: floor.name,
      level: floor.level,
      width: floor.width,
      height: floor.height,
      background_color: floor.background_color
    })
    setShowFloorModal(true)
  }

  const saveFloor = async () => {
    if (!floorForm.name.trim()) {
      alert('Please enter a floor name')
      return
    }

    if (!restaurant) return

    // Check for level conflicts when creating or editing
    const levelConflict = floors.find(f =>
      f.level === floorForm.level &&
      (!editingFloor || f.id !== editingFloor.id)
    )

    if (levelConflict) {
      alert(`Level ${floorForm.level} is already used by "${levelConflict.name}". Please choose a different level number.`)
      return
    }

    try {
      if (editingFloor) {
        // Update existing floor
        const { error } = await supabase
          .from('floors')
          .update({
            name: floorForm.name,
            level: floorForm.level,
            width: floorForm.width,
            height: floorForm.height,
            background_color: floorForm.background_color
          })
          .eq('id', editingFloor.id)

        if (error) throw error

        // Update local state
        const updatedFloors = floors.map(f =>
          f.id === editingFloor.id
            ? { ...f, ...floorForm }
            : f
        ).sort((a, b) => a.level - b.level)
        setFloors(updatedFloors)

        // Update current floor if it's the one being edited
        if (currentFloor?.id === editingFloor.id) {
          setCurrentFloor({ ...currentFloor, ...floorForm })
        }
      } else {
        // Create new floor
        const { data, error } = await supabase
          .from('floors')
          .insert([{
            restaurant_id: restaurant.id,
            name: floorForm.name,
            level: floorForm.level,
            width: floorForm.width,
            height: floorForm.height,
            background_color: floorForm.background_color
          }])
          .select()
          .single()

        if (error) throw error

        // Add to local state
        const updatedFloors = [...floors, data].sort((a, b) => a.level - b.level)
        setFloors(updatedFloors)

        // Switch to the new floor
        setCurrentFloor(data)
        await loadFloorData(data.id, restaurant.id)
      }

      setShowFloorModal(false)
    } catch (error) {
      console.error('Error saving floor:', error)

      // Provide user-friendly error messages
      if (error.message.includes('duplicate key')) {
        alert('This floor level is already in use. Please choose a different level number.')
      } else {
        alert('Failed to save floor: ' + error.message)
      }
    }
  }

  const deleteFloor = async (floor) => {
    if (floors.length <= 1) {
      alert('You must have at least one floor')
      return
    }

    const confirmDelete = window.confirm(
      `Delete ${floor.name}? All tables and elements on this floor will be removed from it.`
    )

    if (!confirmDelete) return

    try {
      // Remove all tables from this floor (don't delete them, just unassign)
      await supabase
        .from('tables')
        .update({ floor_id: null })
        .eq('floor_id', floor.id)

      // Delete all floor elements
      await supabase
        .from('floor_elements')
        .delete()
        .eq('floor_id', floor.id)

      // Delete the floor
      const { error } = await supabase
        .from('floors')
        .delete()
        .eq('id', floor.id)

      if (error) throw error

      // Update local state
      const updatedFloors = floors.filter(f => f.id !== floor.id)
      setFloors(updatedFloors)

      // Switch to another floor if we deleted the current one
      if (currentFloor?.id === floor.id && updatedFloors.length > 0) {
        setCurrentFloor(updatedFloors[0])
        await loadFloorData(updatedFloors[0].id, restaurant.id)
      }
    } catch (error) {
      console.error('Error deleting floor:', error)
      alert('Failed to delete floor: ' + error.message)
    }
  }

  const openCreateFloorModal = () => {
    setEditingFloor(null)
    // Find the next available level number
    const existingLevels = floors.map(f => f.level).sort((a, b) => a - b)
    let nextLevel = 0
    for (let i = 0; i <= existingLevels.length; i++) {
      if (!existingLevels.includes(i)) {
        nextLevel = i
        break
      }
    }
    setFloorForm({
      name: `Floor ${floors.length + 1}`,
      level: nextLevel,
      width: 1200,
      height: 800,
      background_color: '#ffffff'
    })
    setShowFloorModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-slate-600 dark:text-slate-400">Loading floor plan...</div>
      </div>
    )
  }

  if (!currentFloor) {
    return (
      <>
        <div className="p-8 max-w-2xl">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">Floor Plan Designer</h1>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
            <p className="text-slate-700 dark:text-slate-300 mb-4">
              No floors found for your restaurant. Create your first floor to start designing your floor plan.
            </p>
            <button
              onClick={openCreateFloorModal}
              className="px-6 py-3 bg-primary hover:bg-primary-hover text-white rounded-xl font-medium transition-colors"
            >
              + Create First Floor
            </button>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
              Note: If you see a database error, the floor plan tables may not be set up yet. Contact your administrator to run the ADD_FLOOR_PLAN_TABLES.sql migration.
            </p>
          </div>
        </div>

        {/* Floor Management Modal - available even in empty state */}
        {showFloorModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowFloorModal(false)}>
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">
                {editingFloor ? 'Edit Floor' : 'Create New Floor'}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Floor Name
                  </label>
                  <input
                    type="text"
                    value={floorForm.name}
                    onChange={(e) => setFloorForm({ ...floorForm, name: e.target.value })}
                    placeholder="e.g., Ground Floor, First Floor, Terrace"
                    className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Level (for sorting)
                  </label>
                  <input
                    type="number"
                    value={floorForm.level}
                    onChange={(e) => setFloorForm({ ...floorForm, level: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-primary"
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Lower numbers appear first in the list
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Width (px)
                    </label>
                    <input
                      type="number"
                      value={floorForm.width}
                      onChange={(e) => setFloorForm({ ...floorForm, width: parseInt(e.target.value) || 1200 })}
                      min="400"
                      max="3000"
                      className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Height (px)
                    </label>
                    <input
                      type="number"
                      value={floorForm.height}
                      onChange={(e) => setFloorForm({ ...floorForm, height: parseInt(e.target.value) || 800 })}
                      min="400"
                      max="3000"
                      className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Background Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={floorForm.background_color}
                      onChange={(e) => setFloorForm({ ...floorForm, background_color: e.target.value })}
                      className="w-20 h-10 rounded-xl cursor-pointer border-2 border-slate-200 dark:border-slate-700"
                    />
                    <input
                      type="text"
                      value={floorForm.background_color}
                      onChange={(e) => setFloorForm({ ...floorForm, background_color: e.target.value })}
                      placeholder="#ffffff"
                      className="flex-1 px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                {editingFloor && (
                  <button
                    onClick={() => {
                      setShowFloorModal(false)
                      deleteFloor(editingFloor)
                    }}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
                  >
                    Delete Floor
                  </button>
                )}
                <button
                  onClick={() => setShowFloorModal(false)}
                  className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={saveFloor}
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl font-medium transition-colors"
                >
                  {editingFloor ? 'Save Changes' : 'Create Floor'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b-2 border-slate-100 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Floor Plan Designer</h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">{restaurant?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={currentFloor?.id || ''}
              onChange={(e) => {
                const floor = floors.find(f => f.id === e.target.value)
                setCurrentFloor(floor)
                loadFloorData(floor.id, restaurant.id)
              }}
              className="px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
            >
              {floors.map(floor => (
                <option key={floor.id} value={floor.id}>{floor.name}</option>
              ))}
            </select>
            <button
              onClick={() => openEditFloorModal(currentFloor)}
              className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-medium transition-colors"
            >
              Edit Floor
            </button>
            <button
              onClick={openCreateFloorModal}
              className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl font-medium transition-colors"
            >
              + New Floor
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="w-64 bg-white dark:bg-slate-900 border-r-2 border-slate-100 dark:border-slate-800 p-4 overflow-y-auto">
          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-3">Add to Floor</h3>

          <div className="space-y-2">
            {availableTables.length > 0 && (
              <button
                onClick={() => setShowAddTableModal(true)}
                className="w-full px-3 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg text-sm font-medium mb-4"
              >
                + Add Table ({availableTables.length})
              </button>
            )}
          </div>

          <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-3 mt-6">Decorative Elements</h3>

          <div className="space-y-2">
            <button
              onClick={() => addDecorativeElement('wall')}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm"
            >
              ▮ Wall
            </button>
            <button
              onClick={() => addDecorativeElement('door')}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm"
            >
              ⌂ Door
            </button>
            <button
              onClick={() => addDecorativeElement('plant')}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm"
            >
              ☘ Plant
            </button>
            <button
              onClick={() => addDecorativeElement('counter')}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm"
            >
              ▬ Counter
            </button>
            <button
              onClick={() => addDecorativeElement('bar')}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm"
            >
              🍷 Bar
            </button>
            <button
              onClick={() => addDecorativeElement('entrance')}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm"
            >
              ⬇ Entrance
            </button>
            <button
              onClick={() => addDecorativeElement('stairs')}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm"
            >
              ⚏ Stairs
            </button>
            <button
              onClick={() => addDecorativeElement('restroom')}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm"
            >
              ♿ Restroom
            </button>
          </div>

          {selectedItem && (
            <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
              <h3 className="font-bold text-slate-800 dark:text-slate-200 mb-3">
                {selectedItem.type === 'table' ? `Table ${selectedItem.table_number}` : 'Element Properties'}
              </h3>

              {selectedItem.type === 'element' && (
                <div className="space-y-4 mb-4">
                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                      Width: {selectedItem.width}px
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="600"
                      value={selectedItem.width || 100}
                      onChange={(e) => updateElementProperty('width', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                      Height: {selectedItem.height}px
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="600"
                      value={selectedItem.height || 100}
                      onChange={(e) => updateElementProperty('height', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                      Rotation: {selectedItem.rotation || 0}°
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={selectedItem.rotation || 0}
                      onChange={(e) => updateElementProperty('rotation', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                      Label (optional)
                    </label>
                    <input
                      type="text"
                      value={selectedItem.label || ''}
                      onChange={(e) => updateElementProperty('label', e.target.value)}
                      placeholder="e.g., Main Entrance"
                      className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                      Color
                    </label>
                    <input
                      type="color"
                      value={selectedItem.color || '#e2e8f0'}
                      onChange={(e) => updateElementProperty('color', e.target.value)}
                      className="w-full h-8 rounded cursor-pointer"
                    />
                  </div>
                </div>
              )}

              {selectedItem.type === 'table' && (
                <div className="space-y-4 mb-4">
                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                      Width: {selectedItem.width || 80}px
                    </label>
                    <input
                      type="range"
                      min="40"
                      max="200"
                      value={selectedItem.width || 80}
                      onChange={(e) => updateTableProperty('width', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                      Height: {selectedItem.height || 80}px
                    </label>
                    <input
                      type="range"
                      min="40"
                      max="200"
                      value={selectedItem.height || 80}
                      onChange={(e) => updateTableProperty('height', parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-600 dark:text-slate-400 block mb-1">
                      Shape
                    </label>
                    <select
                      value={selectedItem.shape || 'rectangle'}
                      onChange={(e) => updateTableProperty('shape', e.target.value)}
                      className="w-full px-2 py-1 text-sm border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      <option value="rectangle">Rectangle</option>
                      <option value="square">Square</option>
                      <option value="circle">Circle</option>
                    </select>
                  </div>
                </div>
              )}

              <button
                onClick={deleteSelected}
                className="w-full px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm"
              >
                Delete
              </button>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-auto p-8 bg-slate-100 dark:bg-slate-950">
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div
              onClick={() => setSelectedItem(null)}
              style={{
                width: canvasWidth,
                height: canvasHeight,
                position: 'relative',
                backgroundColor: isDarkMode ? '#1e293b' : (currentFloor?.background_color || '#ffffff'),
              }}
              className="mx-auto shadow-2xl border-2 border-slate-300 dark:border-slate-700 rounded-lg"
            >
              {/* Grid background */}
              <div
                className="absolute inset-0 opacity-10 dark:opacity-20"
                style={{
                  backgroundImage: isDarkMode
                    ? 'linear-gradient(#64748b 1px, transparent 1px), linear-gradient(90deg, #64748b 1px, transparent 1px)'
                    : 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
                  backgroundSize: '50px 50px'
                }}
              />

              {/* Decorative elements */}
              {elements.map(element => (
                <DecorativeElement
                  key={element.id}
                  element={element}
                  isSelected={selectedItem?.id === element.id}
                  onClick={(e) => setSelectedItem({ ...e, type: 'element' })}
                />
              ))}

              {/* Tables */}
              {tables.map(table => (
                <DraggableTable
                  key={table.id}
                  table={table}
                  isSelected={selectedItem?.id === table.id}
                  onClick={(t) => setSelectedItem({ ...t, type: 'table' })}
                />
              ))}
            </div>
          </DndContext>
        </div>
      </div>

      {/* Add Table Modal */}
      {showAddTableModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddTableModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">Add Table to Floor</h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              Select a table to add back to this floor:
            </p>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {availableTables.map((table) => (
                <button
                  key={table.id}
                  onClick={() => addTableToFloor(table.id)}
                  className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-left transition-colors"
                >
                  <div className="font-medium">Table {table.table_number}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {table.capacity} seats
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowAddTableModal(false)}
              className="mt-4 w-full px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Floor Management Modal */}
      {showFloorModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowFloorModal(false)}>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-lg w-full mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-4">
              {editingFloor ? 'Edit Floor' : 'Create New Floor'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Floor Name
                </label>
                <input
                  type="text"
                  value={floorForm.name}
                  onChange={(e) => setFloorForm({ ...floorForm, name: e.target.value })}
                  placeholder="e.g., Ground Floor, First Floor, Terrace"
                  className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Level (for sorting)
                </label>
                <input
                  type="number"
                  value={floorForm.level}
                  onChange={(e) => setFloorForm({ ...floorForm, level: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-primary"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Lower numbers appear first in the list
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Width (px)
                  </label>
                  <input
                    type="number"
                    value={floorForm.width}
                    onChange={(e) => setFloorForm({ ...floorForm, width: parseInt(e.target.value) || 1200 })}
                    min="400"
                    max="3000"
                    className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Height (px)
                  </label>
                  <input
                    type="number"
                    value={floorForm.height}
                    onChange={(e) => setFloorForm({ ...floorForm, height: parseInt(e.target.value) || 800 })}
                    min="400"
                    max="3000"
                    className="w-full px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Background Color
                </label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={floorForm.background_color}
                    onChange={(e) => setFloorForm({ ...floorForm, background_color: e.target.value })}
                    className="w-20 h-10 rounded-xl cursor-pointer border-2 border-slate-200 dark:border-slate-700"
                  />
                  <input
                    type="text"
                    value={floorForm.background_color}
                    onChange={(e) => setFloorForm({ ...floorForm, background_color: e.target.value })}
                    placeholder="#ffffff"
                    className="flex-1 px-4 py-2 border-2 border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              {editingFloor && (
                <button
                  onClick={() => {
                    setShowFloorModal(false)
                    deleteFloor(editingFloor)
                  }}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
                >
                  Delete Floor
                </button>
              )}
              <button
                onClick={() => setShowFloorModal(false)}
                className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveFloor}
                className="flex-1 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl font-medium transition-colors"
              >
                {editingFloor ? 'Save Changes' : 'Create Floor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
