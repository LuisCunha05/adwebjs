import { Button, type ButtonProps } from '@compound/button'
import type * as React from 'react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface ModalProps extends React.ComponentProps<typeof Dialog> {
  title?: React.ReactNode
  description?: React.ReactNode
  children?: React.ReactNode
  footer?: React.ReactNode
  showCloseButton?: boolean
  className?: string
  handleConfirm?: () => void
  confirmButtonProps?: Omit<ButtonProps, 'onClick'>
  cancelButtonProps?: Omit<ButtonProps, 'onClick' | 'variant'>
}

export function Modal({
  title,
  description,
  children,
  footer,
  showCloseButton = true,
  className,
  handleConfirm,
  cancelButtonProps,
  confirmButtonProps,
  ...props
}: ModalProps) {
  return (
    <Dialog {...props}>
      <DialogContent showCloseButton={showCloseButton} className={className}>
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
        )}
        {children}
        <DialogFooter>
          <DialogClose asChild>
            <Button
              variant="outline"
              {...cancelButtonProps}
              text={cancelButtonProps?.text ?? 'Cancelar'}
            />
          </DialogClose>
          {handleConfirm && (
            <Button
              onClick={handleConfirm}
              {...confirmButtonProps}
              text={cancelButtonProps?.text ?? 'Confirmar'}
            />
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
