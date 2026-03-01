import * as React from 'react'
import { Control, FieldValues, Path } from 'react-hook-form'
import { FormField } from './form-field'
import { cn } from '@/lib/utils'

export interface FormRadioGroupProps<
    TFieldValues extends FieldValues = FieldValues,
    TName extends Path<TFieldValues> = Path<TFieldValues>,
> {
    name: TName
    control: Control<TFieldValues>
    label?: React.ReactNode
    description?: React.ReactNode
    options: { label: React.ReactNode; value: string }[]
    className?: string
    orientation?: 'horizontal' | 'vertical'
}

export function FormRadioGroup<
    TFieldValues extends FieldValues = FieldValues,
    TName extends Path<TFieldValues> = Path<TFieldValues>,
>({
    name,
    control,
    label,
    description,
    options,
    className,
    orientation = 'vertical',
}: FormRadioGroupProps<TFieldValues, TName>) {
    return (
        <FormField name={name} control={control} label={label} description={description} className={className}>
            {(fieldProps, field) => (
                <div
                    className={cn(
                        'flex gap-x-4 gap-y-2',
                        orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap items-center mt-2',
                    )}
                    role="radiogroup"
                    aria-invalid={fieldProps['aria-invalid']}
                    aria-describedby={fieldProps['aria-describedby']}
                >
                    {options.map((option, index) => {
                        const radioId = `${fieldProps.id}-${index}`
                        return (
                            <div key={option.value} className="flex items-center gap-2">
                                <input
                                    type="radio"
                                    id={radioId}
                                    value={option.value}
                                    checked={field.value === option.value}
                                    onChange={() => field.onChange(option.value)}
                                    onBlur={field.onBlur}
                                    className="size-4 text-primary focus:ring-ring border-input bg-transparent shadow-sm dark:bg-input/30"
                                />
                                <label
                                    htmlFor={radioId}
                                    className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                    {option.label}
                                </label>
                            </div>
                        )
                    })}
                </div>
            )}
        </FormField>
    )
}
