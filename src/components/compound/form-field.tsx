import * as React from 'react'
import {
    type Control,
    type FieldValues,
    type Path,
    type UseFormRegisterReturn,
    useController,
    type ControllerRenderProps,
} from 'react-hook-form'
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldLabel,
} from '@/components/ui/field'

export interface FormFieldProps<
    TFieldValues extends FieldValues = FieldValues,
    TName extends Path<TFieldValues> = Path<TFieldValues>,
> {
    name: TName
    control: Control<TFieldValues>
    label?: React.ReactNode
    description?: React.ReactNode
    children:
    | React.ReactElement
    | ((
        props: UseFormRegisterReturn<TName> & {
            id: string
            'aria-invalid': boolean
            'aria-describedby'?: string
        },
        field: ControllerRenderProps<TFieldValues, TName>
    ) => React.ReactNode)
    className?: string
}

export function FormField<
    TFieldValues extends FieldValues = FieldValues,
    TName extends Path<TFieldValues> = Path<TFieldValues>,
>({ name, label, description, control, children, className }: FormFieldProps<TFieldValues, TName>) {
    const register = control.register
    const { field, fieldState } = useController({
        name,
        control,
    })

    const registerProps = register(name)
    const isInvalid = !!fieldState.error
    const descriptionId = description ? `${name}-description` : undefined
    const errorId = isInvalid ? `${name}-error` : undefined

    // Combine IDs for ARIA describedby
    const ariaDescribedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined

    const fieldProps = {
        ...registerProps,
        id: name,
        'aria-invalid': isInvalid,
        'aria-describedby': ariaDescribedBy,
    }

    return (
        <Field className={className} data-invalid={isInvalid ? 'true' : undefined}>
            {label && <FieldLabel htmlFor={name}>{label}</FieldLabel>}
            <FieldContent>
                {typeof children === 'function'
                    ? children(fieldProps, field)
                    : React.cloneElement(children as React.ReactElement, fieldProps)}
                {description && <FieldDescription id={descriptionId}>{description}</FieldDescription>}
                <FieldError id={errorId} errors={[fieldState.error]} />
            </FieldContent>
        </Field>
    )
}
