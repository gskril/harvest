import * as React from 'react'

import { cn } from '@/lib/utils'

export interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
> {
  indeterminate?: boolean
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, indeterminate, ...props }, ref) => {
    const internalRef = React.useRef<HTMLInputElement>(null)

    React.useImperativeHandle(ref, () => internalRef.current!)

    React.useEffect(() => {
      if (internalRef.current) {
        internalRef.current.indeterminate = indeterminate ?? false
      }
    }, [indeterminate])

    return (
      <input
        type="checkbox"
        ref={internalRef}
        className={cn(
          'h-4 w-4 shrink-0 cursor-pointer rounded border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
          'accent-primary',
          className
        )}
        {...props}
      />
    )
  }
)
Checkbox.displayName = 'Checkbox'

export { Checkbox }
