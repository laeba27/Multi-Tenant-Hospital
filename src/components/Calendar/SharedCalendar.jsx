'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, Clock, MapPin, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const EVENT_COLORS = {
  appointment: 'bg-blue-100 border-blue-300 text-blue-900',
  meeting: 'bg-purple-100 border-purple-300 text-purple-900',
  deadline: 'bg-red-100 border-red-300 text-red-900',
  personal: 'bg-green-100 border-green-300 text-green-900',
  other: 'bg-gray-100 border-gray-300 text-gray-900',
}

/**
 * Reusable Calendar Component
 * Props:
 * - initialEvents: Array of event objects
 * - onEventAdd: Callback when event is added
 * - onEventUpdate: Callback when event is updated
 * - onEventDelete: Callback when event is deleted
 * - userRole: 'doctor', 'patient', 'receptionist', 'staff', 'hospital_admin'
 * - hospitalId: Hospital ID for filtering
 * - readOnly: Boolean to disable event creation
 */
export function SharedCalendar({
  initialEvents = [],
  onEventAdd = null,
  onEventUpdate = null,
  onEventDelete = null,
  userRole = 'patient',
  hospitalId = null,
  readOnly = false,
  maxHeight = 'h-auto'
}) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState('month')
  const [events, setEvents] = useState(initialEvents)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [formData, setFormData] = useState({
    title: '',
    startTime: '09:00',
    endTime: '10:00',
    type: 'appointment',
    description: '',
    location: '',
    attendees: ''
  })

  const getDaysInMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
  }

  const getEventsForDate = (date) => {
    return events.filter(event => {
      const eventDate = new Date(event.date)
      return eventDate.toDateString() === date.toDateString()
    })
  }

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  const handleAddEvent = () => {
    if (!formData.title.trim()) {
      toast.error('Event title is required')
      return
    }

    const newEvent = {
      id: Date.now().toString(),
      title: formData.title,
      date: selectedDate,
      startTime: formData.startTime,
      endTime: formData.endTime,
      type: formData.type,
      description: formData.description,
      location: formData.location,
      attendees: formData.attendees.split(',').map(a => a.trim()).filter(a => a),
      createdBy: userRole,
      hospitalId: hospitalId
    }

    setEvents([...events, newEvent])
    
    if (onEventAdd) {
      onEventAdd(newEvent)
    }

    toast.success('Event added successfully')
    setDialogOpen(false)
    setFormData({
      title: '',
      startTime: '09:00',
      endTime: '10:00',
      type: 'appointment',
      description: '',
      location: '',
      attendees: ''
    })
  }

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentDate)
    const firstDay = getFirstDayOfMonth(currentDate)
    const days = []

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-24 bg-gray-50 border border-gray-200"></div>)
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const dayEvents = getEventsForDate(date)
      const isToday = date.toDateString() === new Date().toDateString()

      days.push(
        <div
          key={day}
          onClick={() => {
            if (!readOnly) {
              setSelectedDate(date)
              setDialogOpen(true)
            }
          }}
          className={`h-24 border border-gray-200 p-2 ${!readOnly && 'cursor-pointer'} hover:bg-indigo-50 transition ${isToday ? 'bg-indigo-50' : 'bg-white'}`}
        >
          <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-indigo-600' : 'text-gray-900'}`}>
            {day}
          </div>
          <div className="space-y-0.5 overflow-y-auto max-h-16">
            {dayEvents.slice(0, 2).map(event => (
              <div
                key={event.id}
                className={`text-xs p-0.5 rounded border cursor-pointer hover:shadow-md transition ${EVENT_COLORS[event.type] || EVENT_COLORS.other}`}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="font-medium truncate">{event.title}</div>
              </div>
            ))}
            {dayEvents.length > 2 && (
              <div className="text-xs text-gray-600 px-0.5 font-medium">
                +{dayEvents.length - 2}
              </div>
            )}
          </div>
        </div>
      )
    }

    return days
  }

  return (
    <div className={`space-y-4 ${maxHeight}`}>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white p-3 rounded-lg border border-gray-200">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={previousMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center min-w-40">
            <h2 className="text-lg font-bold text-gray-900">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
          </div>
          <Button variant="outline" size="sm" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToToday}>
            Today
          </Button>
        </div>

        {!readOnly && (
          <Button
            onClick={() => {
              setSelectedDate(new Date())
              setDialogOpen(true)
            }}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add
          </Button>
        )}
      </div>

      {/* Calendar Grid */}
      {view === 'month' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
            {WEEKDAYS.map(day => (
              <div key={day} className="p-2 text-center font-semibold text-gray-900 border-r border-gray-200 last:border-r-0 text-sm">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {renderCalendar()}
          </div>
        </div>
      )}

      {/* Add Event Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Add Event - {selectedDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Title *
              </label>
              <Input
                placeholder="Event title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                size="sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Start
                </label>
                <Input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  size="sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  End
                </label>
                <Input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  size="sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Type
              </label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="appointment">Appointment</SelectItem>
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="deadline">Deadline</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Location
              </label>
              <Input
                placeholder="Location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                size="sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-900 mb-1">
                Notes
              </label>
              <Textarea
                placeholder="Add notes (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} size="sm">
              Cancel
            </Button>
            <Button onClick={handleAddEvent} size="sm">
              Add Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default SharedCalendar
