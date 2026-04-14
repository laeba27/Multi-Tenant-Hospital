"use client"

import * as React from "react"
import { Button } from "./button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog"

const AlertDialog = ({ open, onOpenChange, children, ...props }) => (
  <Dialog open={open} onOpenChange={onOpenChange} {...props}>
    {children}
  </Dialog>
)

const AlertDialogTrigger = React.forwardRef(({ ...props }, ref) => (
  <Dialog.Trigger ref={ref} {...props} />
))
AlertDialogTrigger.displayName = "AlertDialogTrigger"

const AlertDialogContent = React.forwardRef(({ className, ...props }, ref) => (
  <DialogContent ref={ref} className={className} {...props} />
))
AlertDialogContent.displayName = "AlertDialogContent"

const AlertDialogHeader = DialogHeader

const AlertDialogFooter = DialogFooter

const AlertDialogTitle = DialogTitle

const AlertDialogDescription = DialogDescription

const AlertDialogAction = React.forwardRef(({ onClick, ...props }, ref) => (
  <Button ref={ref} onClick={onClick} {...props} />
))
AlertDialogAction.displayName = "AlertDialogAction"

const AlertDialogCancel = React.forwardRef(({ onClick, ...props }, ref) => (
  <Button ref={ref} variant="outline" onClick={onClick} {...props} />
))
AlertDialogCancel.displayName = "AlertDialogCancel"

export {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
}
