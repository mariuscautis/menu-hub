# Staff Page Update - Add Edit Functionality & Dynamic Departments

## Changes Needed:

### 1. Add state for departments list
```javascript
const [departments, setDepartments] = useState(['kitchen', 'bar', 'universal'])
const [isEditing, setIsEditing] = useState(false)
```

### 2. Fetch departments from restaurant settings
```javascript
useEffect(() => {
  if (restaurant?.departments) {
    setDepartments(restaurant.departments)
  }
}, [restaurant])
```

### 3. Add Edit button to table actions
```javascript
<button
  onClick={() => openEditModal(member)}
  className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100"
>
  Edit
</button>
```

### 4. Add openEditModal function
```javascript
const openEditModal = (member) => {
  setSelectedStaff(member)
  setFormData({
    email: member.email,
    name: member.name,
    role: member.role,
    pin_code: member.pin_code,
    department: member.department
  })
  setIsEditing(true)
  setShowModal(true)
}
```

### 5. Add editStaff function
```javascript
const editStaff = async (e) => {
  e.preventDefault()
  setError(null)

  try {
    const { error } = await supabase
      .from('staff')
      .update({
        name: formData.name,
        email: formData.email,
        role: formData.role,
        department: formData.department
      })
      .eq('id', selectedStaff.id)

    if (error) throw error

    setFormData({ email: '', name: '', role: 'staff', pin_code: '', department: 'kitchen' })
    setShowModal(false)
    setIsEditing(false)
    setSelectedStaff(null)
    fetchData()
  } catch (err) {
    setError(err.message)
  }
}
```

### 6. Update modal to handle both add and edit
```javascript
<form onSubmit={isEditing ? editStaff : addStaff}>
  <h2 className="text-xl font-bold text-slate-800 mb-6">
    {isEditing ? 'Edit Staff Member' : 'Add Staff Member'}
  </h2>

  {/* PIN field - disabled when editing */}
  <input
    type="text"
    name="pin_code"
    value={formData.pin_code}
    onChange={handleChange}
    required={!isEditing}
    disabled={isEditing}
    // ...
  />
  {isEditing && (
    <p className="text-slate-400 text-sm mt-2">
      Use the "Change" button in the table to update PIN
    </p>
  )}
```

### 7. Update department dropdown to use dynamic list
```javascript
<select
  name="department"
  value={formData.department}
  onChange={handleChange}
  required
  className="..."
>
  {departments.map(dept => (
    <option key={dept} value={dept}>
      {dept.charAt(0).toUpperCase() + dept.slice(1)}
    </option>
  ))}
</select>
```

### 8. Update getDepartmentBadge to handle custom departments
```javascript
const getDepartmentBadge = (department) => {
  const colors = [
    'bg-orange-100 text-orange-700',
    'bg-green-100 text-green-700',
    'bg-blue-100 text-blue-700',
    'bg-purple-100 text-purple-700',
    'bg-pink-100 text-pink-700',
    'bg-yellow-100 text-yellow-700',
  ]

  const index = departments.indexOf(department) % colors.length
  return colors[index] || 'bg-slate-100 text-slate-600'
}
```

Would you like me to implement these changes now?
