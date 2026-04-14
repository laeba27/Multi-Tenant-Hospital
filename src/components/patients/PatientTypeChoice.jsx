'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { UserPlus, Search } from 'lucide-react'

export function PatientTypeChoice({ onSelectExisting, onSelectNew, isLoading }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Existing Patient Card */}
      <Card
        className="cursor-pointer transition-all hover:shadow-lg hover:border-blue-400"
        onClick={onSelectExisting}
      >
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-blue-100 rounded-full">
              <Search className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <CardTitle>Existing Patient</CardTitle>
          <CardDescription>Patient already registered with the hospital</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <p>✓ Search by ID, Email, Phone, or Name</p>
            <p>✓ Quickly recover existing records</p>
            <p>✓ Proceed to appointment booking</p>
          </div>
          <Button
            onClick={onSelectExisting}
            className="w-full mt-6 bg-blue-600 hover:bg-blue-700"
            disabled={isLoading}
          >
            Find Existing Patient
          </Button>
        </CardContent>
      </Card>

      {/* New Patient Card */}
      <Card
        className="cursor-pointer transition-all hover:shadow-lg hover:border-green-400"
        onClick={onSelectNew}
      >
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-green-100 rounded-full">
              <UserPlus className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle>New Patient</CardTitle>
          <CardDescription>First-time patient registration</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-gray-600">
            <p>✓ Register patient details</p>
            <p>✓ Create new patient profile</p>
            <p>✓ Proceed to appointment booking</p>
          </div>
          <Button
            onClick={onSelectNew}
            className="w-full mt-6 bg-green-600 hover:bg-green-700"
            disabled={isLoading}
          >
            Register New Patient
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
