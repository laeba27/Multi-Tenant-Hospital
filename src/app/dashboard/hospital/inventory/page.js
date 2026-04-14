'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search as SearchIcon, Trash2, Loader2, AlertCircle, MoreVertical, ArrowUpDown } from 'lucide-react'
import { toast } from 'sonner'

import { useUserDetails } from '@/hooks/use-user-details'
import { getDepartments } from '@/actions/departments'
import { createClient } from '@/lib/supabase/client'
import { AddInventoryDialog } from './add-inventory-dialog'

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
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const capitalizeWords = (str) => {
  if (!str) return ''
  return str.toLowerCase().split(' ').map(word =>
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ')
}

// Helper function to determine stock status
const getStockStatus = (quantity, minimumQuantity) => {
  if (quantity < minimumQuantity) return 'low'
  if (quantity <= minimumQuantity * 1.5) return 'medium'
  return 'high'
}

// Helper function to get color for quantity
const getQuantityColor = (status) => {
  switch (status) {
    case 'low':
      return 'text-red-600 font-semibold'
    case 'medium':
      return 'text-yellow-600 font-semibold'
    case 'high':
      return 'text-green-600 font-semibold'
    default:
      return ''
  }
}

export default function InventoryPage() {
  const router = useRouter()
  const { hospital, isLoading: isUserLoading } = useUserDetails()
  const supabase = createClient()

  const [inventory, setInventory] = useState([])
  const [departments, setDepartments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [deleteId, setDeleteId] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [stockFilter, setStockFilter] = useState('all')
  const [sortConfig, setSortConfig] = useState({ key: 'item_name', direction: 'asc' })

  // Fetch inventory items
  const fetchInventory = useCallback(async () => {
    if (!hospital?.id) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*, departments(id, name)')
        .eq('hospital_id', hospital.id)
        .order('created_at', { ascending: false })

      if (error) throw new Error(error.message)
      setInventory(data || [])
    } catch (error) {
      toast.error('Failed to load inventory')
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }, [hospital, supabase])

  // Fetch departments
  const fetchDepartments = useCallback(async () => {
    if (!hospital?.id) return
    try {
      const { data } = await getDepartments(hospital.id)
      setDepartments(data || [])
    } catch (error) {
      console.error(error)
    }
  }, [hospital])

  useEffect(() => {
    if (hospital?.id) {
      fetchInventory()
      fetchDepartments()
    } else if (!isUserLoading && !hospital) {
      setIsLoading(false)
    }
  }, [hospital, isUserLoading, fetchInventory, fetchDepartments])

  // Delete inventory
  const handleDelete = async () => {
    if (!deleteId) return

    setIsDeleting(true)
    try {
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', deleteId)

      if (error) throw new Error(error.message)

      setInventory(prev => prev.filter(item => item.id !== deleteId))
      toast.success('Inventory item deleted successfully')
    } catch (error) {
      toast.error('Failed to delete inventory item')
      console.error(error)
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  // Toggle active status
  const handleToggleStatus = async (id, currentStatus) => {
    try {
      const { error } = await supabase
        .from('inventory')
        .update({ is_active: !currentStatus })
        .eq('id', id)

      if (error) throw new Error(error.message)

      setInventory(prev =>
        prev.map(item =>
          item.id === id ? { ...item, is_active: !currentStatus } : item
        )
      )
      toast.success(`Inventory item ${!currentStatus ? 'activated' : 'deactivated'}`)
    } catch (error) {
      toast.error('Failed to update inventory status')
      console.error(error)
    }
  }

  // Filter and sort inventory
  const processedInventory = inventory
    .filter(item => {
      // Search filter
      const matchesSearch =
        item.item_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.item_code?.toLowerCase().includes(searchTerm.toLowerCase())

      // Stock status filter
      if (stockFilter === 'all') return matchesSearch
      const status = getStockStatus(item.quantity, item.minimum_quantity)
      return matchesSearch && status === stockFilter
    })
    .sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]

      if (typeof aValue === 'string') {
        return sortConfig.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue
    })

  // Count low stock items
  const lowStockCount = inventory.filter(
    item => item.quantity < item.minimum_quantity
  ).length

  // Handle sorting
  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  // Sortable header helper
  const SortableHeader = ({ children, sortKey }) => (
    <div className="flex items-center gap-1 cursor-pointer hover:text-foreground" onClick={() => handleSort(sortKey)}>
      {children}
      {sortConfig.key === sortKey && (
        <ArrowUpDown className="h-3 w-3" />
      )}
    </div>
  )

  if (!hospital) return null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Inventory Management</h2>
          <p className="text-muted-foreground">
            Manage hospital inventory and stock levels
          </p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Item
        </Button>
      </div>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-orange-600" />
            <div>
              <p className="font-semibold text-orange-900">
                {lowStockCount} item{lowStockCount !== 1 ? 's' : ''} with low stock
              </p>
              <p className="text-sm text-orange-700">
                Check items below minimum quantity threshold
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Inventory Items</CardTitle>
          <CardDescription>
            You have {inventory.length} total inventory items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-4">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <div className="flex items-center space-x-2 flex-1">
                <SearchIcon className="h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-sm"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge
                  variant={stockFilter === 'all' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setStockFilter('all')}
                >
                  All Items
                </Badge>
                <Badge
                  variant={stockFilter === 'high' ? 'default' : 'outline'}
                  className="cursor-pointer bg-green-100 text-green-800 hover:bg-green-200"
                  onClick={() => setStockFilter('high')}
                >
                  ✓ High Stock
                </Badge>
                <Badge
                  variant={stockFilter === 'medium' ? 'default' : 'outline'}
                  className="cursor-pointer bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                  onClick={() => setStockFilter('medium')}
                >
                  ⚠ Medium Stock
                </Badge>
                <Badge
                  variant={stockFilter === 'low' ? 'default' : 'outline'}
                  className="cursor-pointer bg-red-100 text-red-800 hover:bg-red-200"
                  onClick={() => setStockFilter('low')}
                >
                  ✕ Low Stock
                </Badge>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <SortableHeader sortKey="item_name">Item Name</SortableHeader>
                    </TableHead>
                    <TableHead>
                      <SortableHeader sortKey="departments">Department</SortableHeader>
                    </TableHead>
                    <TableHead className="text-center">
                      <SortableHeader sortKey="quantity">Quantity</SortableHeader>
                    </TableHead>
                    <TableHead className="text-center">Min Qty</TableHead>
                    <TableHead>
                      <SortableHeader sortKey="unit">Unit</SortableHeader>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {processedInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No inventory items found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    processedInventory.map((item) => {
                      const stockStatus = getStockStatus(item.quantity, item.minimum_quantity)
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {capitalizeWords(item.item_name)}
                          </TableCell>
                          <TableCell>
                            {item.departments?.name || '-'}
                          </TableCell>
                          <TableCell className={`text-center ${getQuantityColor(stockStatus)}`}>
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {item.minimum_quantity}
                          </TableCell>
                          <TableCell>
                            {item.unit || '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {stockStatus === 'low' && (
                                <Badge variant="destructive">Low Stock</Badge>
                              )}
                              {stockStatus === 'medium' && (
                                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                  Medium Stock
                                </Badge>
                              )}
                              {stockStatus === 'high' && (
                                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                                  Healthy
                                </Badge>
                              )}
                              <Badge variant={item.is_active ? 'default' : 'secondary'}>
                                {item.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleToggleStatus(item.id, item.is_active)}
                                >
                                  {item.is_active ? 'Deactivate' : 'Activate'}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => setDeleteId(item.id)}
                                  className="text-red-600"
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      )
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Inventory Dialog */}
      <AddInventoryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        hospitalId={hospital?.id}
        departments={departments}
        onSuccess={fetchInventory}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Item?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogDescription>
            This action cannot be undone. The inventory item will be permanently deleted.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end pt-4">
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
