import * as React from 'react'
import { Control, FieldValues, Path } from 'react-hook-form'
import { FormField } from './form-field'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'

export interface FormSelectProps<
    TFieldValues extends FieldValues = FieldValues,
    TName extends Path<TFieldValues> = Path<TFieldValues>,
> extends Omit<React.ComponentProps<typeof Select>, 'name' | 'value' | 'onValueChange'> {
    name: TName
    control: Control<TFieldValues>
    label?: React.ReactNode
    description?: React.ReactNode
    placeholder?: string
    options: { label: string; value: string }[]
    className?: string
    triggerClassName?: string
}

export function FormSelect<
    TFieldValues extends FieldValues = FieldValues,
    TName extends Path<TFieldValues> = Path<TFieldValues>,
>({
    name,
    control,
    label,
    description,
    options,
    placeholder,
    className,
    triggerClassName,
    ...props
}: FormSelectProps<TFieldValues, TName>) {
    return (
        <FormField name={name} control={control} label={label} description={description} className={className}>
            {(fieldProps) => (
                <Select
                    {...props}
                    value={fieldProps.value}
                    onValueChange={fieldProps.onChange}
                >
                    <SelectTrigger
                        id={fieldProps.id}
                        aria-invalid={fieldProps['aria-invalid']}
                        aria-describedby={fieldProps['aria-describedby']}
                        className={triggerClassName}
                    >
                        <SelectValue placeholder={placeholder} />
                    </SelectTrigger>
                    <SelectContent>
                        {options.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            )}
        </FormField>
    )
}
