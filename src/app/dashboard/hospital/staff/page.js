'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search as SearchIcon, Mail, Phone, User, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

import { useUserDetails } from '@/hooks/use-user-details'
import { getStaff, updateStaffStatus } from '@/actions/staff'
import { getDepartments } from '@/actions/departments'
import { AddStaffDialog } from './add-staff-dialog'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

// Helper function to capitalize first letter of each word
const capitalizeWords = (str) => {
    if (!str) return ''
    return str.toLowerCase().split(' ').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')
}

export default function StaffPage() {
    const router = useRouter()
    const { hospital, isLoading: isUserLoading } = useUserDetails()
    const [staff, setStaff] = useState([])
    const [departments, setDepartments] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [updatingStaffId, setUpdatingStaffId] = useState(null)

    const fetchStaff = useCallback(async () => {
        if (!hospital || !hospital.id) return

        setIsLoading(true)
        try {
            const { data, error } = await getStaff(hospital.registration_no) // Using registration_no as hospital_id in staff table
            if (error) throw new Error(error)
            setStaff(data || [])
        } catch (error) {
            toast.error('Failed to load staff')
            console.error(error)
        } finally {
            setIsLoading(false)
        }
    }, [hospital])

    const fetchDepartments = useCallback(async () => {
        if (!hospital || !hospital.id) return
        try {
            const { data } = await getDepartments(hospital.id) // This uses UUID
            setDepartments(data || [])
        } catch (error) {
            console.error(error)
        }
    }, [hospital])

    useEffect(() => {
        if (hospital?.id) {
            fetchStaff()
            fetchDepartments()
        } else if (!isUserLoading && !hospital) {
            setIsLoading(false)
        }
    }, [hospital, isUserLoading, fetchStaff, fetchDepartments])

    const filteredStaff = staff.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.profiles?.mobile?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.role?.toLowerCase().includes(searchTerm.toLowerCase())
    )

    const getStaffByRole = (role) => {
        return filteredStaff.filter(s => s.role === role)
    }

    const handleStatusChange = async (staffId, newStatus) => {
        setUpdatingStaffId(staffId)
        try {
            const result = await updateStaffStatus(staffId, newStatus)
            if (result.error) {
                toast.error(result.error)
                return
            }
            // Update local state
            setStaff(prev => prev.map(s => 
                s.id === staffId ? { ...s, is_active: newStatus } : s
            ))
            toast.success(`Staff status updated to ${newStatus ? 'Active' : 'Inactive'}`)
        } catch (error) {
            toast.error('Failed to update status')
            console.error(error)
        } finally {
            setUpdatingStaffId(null)
        }
    }

    const StaffTable = ({ data }) => (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={6} className="h-24 text-center">
                                No staff found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        data.map((member) => (
                            <TableRow
                                key={member.id}
                                className="cursor-pointer hover:bg-muted/50"
                                onClick={() => router.push(`/dashboard/hospital/staff/${member.id}`)}
                            >
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Avatar className="h-8 w-8">
                                            <AvatarImage src={member.avatar_url} />
                                            <AvatarFallback>{member.name.charAt(0).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex flex-col">
                                            <span className="font-medium">{capitalizeWords(member.name)}</span>
                                            <span className="text-xs text-muted-foreground">{member.employee_registration_no}</span>
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className="capitalize">
                                        {member.role.replace('_', ' ')}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    {member.departments?.name || '-'}
                                </TableCell>
                                <TableCell>
                                    <a 
                                        href={`mailto:${member.profiles?.email}`}
                                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Mail className="h-4 w-4" />
                                        {member.profiles?.email || 'N/A'}
                                    </a>
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                    <Select 
                                        value={member.is_active ? 'active' : 'inactive'}
                                        onValueChange={(value) => handleStatusChange(member.id, value === 'active')}
                                        disabled={updatingStaffId === member.id}
                                    >
                                        <SelectTrigger className="w-32">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">Active</SelectItem>
                                            <SelectItem value="inactive">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    {member.created_at ? format(new Date(member.created_at), 'MMM d, yyyy') : '-'}
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )

    if (!hospital) return null

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Staff Management</h2>
                    <p className="text-muted-foreground">
                        Manage your hospital staff, doctors, and employees.
                    </p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Add Staff
                </Button>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Staff Directory</CardTitle>
                    <CardDescription>
                        You have {staff.length} total staff members.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2 mb-4">
                        <SearchIcon className="h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or role..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="max-w-sm"
                        />
                    </div>

                    <Tabs defaultValue="all" className="w-full">
                        <TabsList className="mb-4">
                            <TabsTrigger value="all">All Staff</TabsTrigger>
                            <TabsTrigger value="doctors">Doctors</TabsTrigger>
                            <TabsTrigger value="nurses">Nurses</TabsTrigger>
                            <TabsTrigger value="receptionists">Receptionists</TabsTrigger>
                            <TabsTrigger value="others">Others</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="all">
                            <StaffTable data={filteredStaff} />
                        </TabsContent>
                        <TabsContent value="doctors">
                            <StaffTable data={getStaffByRole('doctor')} />
                        </TabsContent>
                        <TabsContent value="nurses">
                            <StaffTable data={getStaffByRole('nurse')} />
                        </TabsContent>
                        <TabsContent value="receptionists">
                            <StaffTable data={getStaffByRole('receptionist')} />
                        </TabsContent>
                        <TabsContent value="others">
                            <StaffTable data={filteredStaff.filter(s => !['doctor', 'nurse', 'receptionist'].includes(s.role))} />
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>

            <AddStaffDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                hospitalName={hospital.name}
                hospitalId={hospital.registration_no} 
                departments={departments}
                onSuccess={fetchStaff}
            />
        </div>
    )
}
