import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-normal break-words text-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&>svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-white hover:bg-primary/90 hover:text-white',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline:
          'border border-input bg-background text-foreground hover:bg-accent hover:text-white',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 hover:text-white',
        ghost: 'hover:bg-accent hover:text-white',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'min-h-10 h-auto px-4 py-2',
        sm: 'min-h-9 h-auto rounded-md px-3 py-2',
        lg: 'min-h-11 h-auto rounded-md px-8 py-2',
        icon: 'h-10 w-10 shrink-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };

