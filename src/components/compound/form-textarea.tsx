import type * as React from 'react'
import type { Control, FieldValues, Path } from 'react-hook-form'
import { Textarea } from '@/components/ui/textarea'
import { FormField } from './form-field'

export interface FormTextareaProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends Path<TFieldValues> = Path<TFieldValues>,
> extends Omit<React.ComponentProps<typeof Textarea>, 'name'> {
  name: TName
  control: Control<TFieldValues>
  label?: React.ReactNode
  description?: React.ReactNode
}

export function FormTextarea<
  TFieldValues extends FieldValues = FieldValues,
  TName extends Path<TFieldValues> = Path<TFieldValues>,
>({
  name,
  control,
  label,
  description,
  className,
  ...props
}: FormTextareaProps<TFieldValues, TName>) {
  return (
    <FormField
      name={name}
      control={control}
      label={label}
      description={description}
      className={className}
    >
      {(fieldProps) => <Textarea {...fieldProps} {...props} />}
    </FormField>
  )
}
