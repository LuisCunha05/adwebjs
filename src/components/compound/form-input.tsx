import * as React from 'react'
import { Control, FieldValues, Path } from 'react-hook-form'
import { FormField } from './form-field'
import { Input } from '@/components/ui/input'

export interface FormInputProps<
    TFieldValues extends FieldValues = FieldValues,
    TName extends Path<TFieldValues> = Path<TFieldValues>,
> extends Omit<React.ComponentProps<typeof Input>, 'name'> {
    name: TName
    control: Control<TFieldValues>
    label?: React.ReactNode
    description?: React.ReactNode
}

export function FormInput<
    TFieldValues extends FieldValues = FieldValues,
    TName extends Path<TFieldValues> = Path<TFieldValues>,
>({ name, control, label, description, className, ...props }: FormInputProps<TFieldValues, TName>) {
    return (
        <FormField name={name} control={control} label={label} description={description} className={className}>
            {(fieldProps) => <Input {...fieldProps} {...props} />}
        </FormField>
    )
}
