"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { Controller, FormProvider, useFormContext } from "react-hook-form"

import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

const Form = FormProvider

// Carries the active field's name down to FormMessage so it can look up that
// field's validation error without each caller wiring it through by hand.
const FormFieldContext = React.createContext({ name: undefined })

const FormField = ({
    ...props
}) => {
    return (
        <FormFieldContext.Provider value={{ name: props.name }}>
            <Controller {...props} />
        </FormFieldContext.Provider>
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
    const { name } = React.useContext(FormFieldContext)
    const { getFieldState, formState } = useFormContext()

    // getFieldState needs formState read during render to subscribe to updates.
    const error = name ? getFieldState(name, formState).error : undefined
    const body = error ? String(error.message) : children

    // Render nothing when the field is valid, so the layout doesn't shift.
    if (!body) return null

    return (
        <p
            ref={ref}
            className={cn("text-sm font-medium text-red-500", className)}
            {...props}
        >
            {body}
        </p>
    )
})
FormMessage.displayName = "FormMessage"

export {
    Form,
    FormItem,
    FormLabel,
    FormControl,
    FormDescription,
    FormMessage,
    FormField,
}
