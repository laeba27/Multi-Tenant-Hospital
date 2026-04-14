'use client'

import { useState } from 'react'
import { searchPatientForHospital } from '@/actions/patients'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Search, User, AlertCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function PatientLookup({ hospitalId, onSelectPatient, onCreateNew, isLoading: externalLoading }) {
  const [searchType, setSearchType] = useState('id') // 'id' | 'email' | 'phone' | 'name'
  const [searchValue, setSearchValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [searchResults, setSearchResults] = useState(null)
  const [searched, setSearched] = useState(false)

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      toast.error('Please enter a search value')
      return
    }

    setIsLoading(true)
    try {
      const result = await searchPatientForHospital(hospitalId, searchType, searchValue)
      setSearchResults(result)
      setSearched(true)

      if (!result) {
        toast.info('Patient not found for this hospital')
      }
    } catch (error) {
      console.error('Search error:', error)
      toast.error('Error searching for patient')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectPatient = (patient) => {
    onSelectPatient(patient)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Search for Existing Patient</h3>
        <Tabs value={searchType} onValueChange={setSearchType} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="id">Patient ID</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="phone">Phone</TabsTrigger>
            <TabsTrigger value="name">Name</TabsTrigger>
          </TabsList>

          <TabsContent value="id" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="patient-id">Patient Registration ID</Label>
              <Input
                id="patient-id"
                placeholder="Enter patient ID (e.g., PAT-12345)"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </TabsContent>

          <TabsContent value="email" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="patient-email">Email Address</Label>
              <Input
                id="patient-email"
                type="email"
                placeholder="Enter patient email"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </TabsContent>

          <TabsContent value="phone" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="patient-phone">Phone Number</Label>
              <Input
                id="patient-phone"
                placeholder="Enter patient phone number"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </TabsContent>

          <TabsContent value="name" className="space-y-4 mt-4">
            <div>
              <Label htmlFor="patient-name">Patient Name</Label>
              <Input
                id="patient-name"
                placeholder="Enter patient name"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
          </TabsContent>
        </Tabs>

        <Button
          onClick={handleSearch}
          disabled={isLoading || externalLoading || !searchValue.trim()}
          className="w-full mt-4"
        >
          {isLoading || externalLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Search Patient
            </>
          )}
        </Button>
      </div>

      {/* Search Results */}
      {searched && (
        <div className="border-t pt-6">
          {searchResults ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <User className="h-5 w-5 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-green-900">Patient Found</h4>
                  <div className="text-sm text-green-700 mt-2 space-y-1">
                    <p>
                      <span className="font-medium">Name:</span> {searchResults.profile?.name}
                    </p>
                    <p>
                      <span className="font-medium">Email:</span> {searchResults.profile?.email}
                    </p>
                    <p>
                      <span className="font-medium">Phone:</span> {searchResults.profile?.mobile}
                    </p>
                    <p>
                      <span className="font-medium">Reg. No:</span> {searchResults.registration_no}
                    </p>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => handleSelectPatient(searchResults)}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                Select This Patient
              </Button>
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No patient found with this {searchType}. Click "Register New Patient" to create a new patient record.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Create New Patient Option */}
      <div className="border-t pt-6">
        <p className="text-sm text-gray-600 mb-3">
          Don't have an existing patient record?
        </p>
        <Button
          onClick={onCreateNew}
          variant="outline"
          className="w-full"
          disabled={externalLoading}
        >
          + Register New Patient
        </Button>
      </div>
    </div>
  )
}
