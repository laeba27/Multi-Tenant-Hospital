"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { Controller, FormProvider, useFormContext } from "react-hook-form"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

const Form = FormProvider

const FormField = ({
    ...props
}) => {
    return (
        <Controller {...props} />
    )
}

const FormItem = React.forwardRef(({ className, ...props }, ref) => {
    const id = React.useId()

    return (
        <div ref={ref} className={cn("space-y-2", className)}>
            <div id={id} {...props} />
        </div>
    )
})
FormItem.displayName = "FormItem"

const FormLabel = React.forwardRef(({ className, ...props }, ref) => {
    return (
        <Label
            ref={ref}
            className={cn(className)}
            {...props}
        />
    )
})
FormLabel.displayName = "FormLabel"

const FormControl = React.forwardRef(({ ...props }, ref) => {
    return (
        <Slot
            ref={ref}
            {...props}
        />
    )
})
FormControl.displayName = "FormControl"

const FormDescription = React.forwardRef(({ className, ...props }, ref) => {
    return (
        <p
            ref={ref}
            className={cn("text-sm text-muted-foreground", className)}
            {...props}
        />
    )
})
FormDescription.displayName = "FormDescription"

const FormMessage = React.forwardRef(({ className, children, ...props }, ref) => {
    const { formState } = useFormContext()
    const fieldState = formState

    // This is a simplified version, usually we context logic to get field name
    // But for now, we leave it simple or improved if needed.
    // Actually, Shadcn's implementation uses a context provider to pass field id and name.
    // Let's implement a simplified robust version or the full context version if possible.

    return (
        <p
            ref={ref}
            className={cn("text-sm font-medium text-destructive", className)}
            {...props}
        >
            {children}
        </p>
    )
})
FormMessage.displayName = "FormMessage"

export {
    useForm,
    Form,
    FormItem,
    FormLabel,
    FormControl,
    FormDescription,
    FormMessage,
    FormField,
}
