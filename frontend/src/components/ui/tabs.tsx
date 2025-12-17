import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsContextValue {
  value: string
  onValueChange: (value: string) => void
}

const TabsContext = React.createContext<TabsContextValue | undefined>(undefined)

interface TabsProps {
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  children: React.ReactNode
  className?: string
}

export function Tabs({ defaultValue, value: controlledValue, onValueChange, children, className }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || "")
  const value = controlledValue !== undefined ? controlledValue : internalValue
  const handleValueChange = React.useCallback((newValue: string) => {
    if (controlledValue === undefined) {
      setInternalValue(newValue)
    }
    onValueChange?.(newValue)
  }, [controlledValue, onValueChange])

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleValueChange }}>
      <div className={cn("w-full", className)}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  children: React.ReactNode
  className?: string
  onTouchStart?: (e: React.TouchEvent) => void
  onTouchMove?: (e: React.TouchEvent) => void
  onTouchEnd?: (e: React.TouchEvent) => void
}

export const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
  ({ children, className, onTouchStart, onTouchMove, onTouchEnd }, ref) => {
    const context = React.useContext(TabsContext)
    const listRef = React.useRef<HTMLDivElement>(null)
    const combinedRef = React.useCallback(
      (node: HTMLDivElement | null) => {
        listRef.current = node;
        if (typeof ref === 'function') {
          ref(node);
        } else if (ref) {
          ref.current = node;
        }
      },
      [ref]
    )
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!listRef.current || !context) return
    
    // Handle arrow key navigation at the list level
    const tabs = Array.from(
      listRef.current.querySelectorAll('[role="tab"]:not([disabled])')
    ) as HTMLButtonElement[]
    
    const currentTab = document.activeElement as HTMLButtonElement
    if (!currentTab || !tabs.includes(currentTab)) return
    
    const currentIndex = tabs.indexOf(currentTab)
    if (currentIndex === -1) return
    
    let nextIndex: number
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      nextIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1
      const nextTab = tabs[nextIndex]
      if (nextTab) {
        nextTab.focus()
        const nextValue = nextTab.getAttribute('data-value')
        if (nextValue) {
          context.onValueChange(nextValue)
        }
      }
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      nextIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0
      const nextTab = tabs[nextIndex]
      if (nextTab) {
        nextTab.focus()
        const nextValue = nextTab.getAttribute('data-value')
        if (nextValue) {
          context.onValueChange(nextValue)
        }
      }
    } else if (e.key === 'Home') {
      e.preventDefault()
      tabs[0]?.focus()
      const firstValue = tabs[0]?.getAttribute('data-value')
      if (firstValue) {
        context.onValueChange(firstValue)
      }
    } else if (e.key === 'End') {
      e.preventDefault()
      const lastTab = tabs[tabs.length - 1]
      lastTab?.focus()
      const lastValue = lastTab?.getAttribute('data-value')
      if (lastValue) {
        context.onValueChange(lastValue)
      }
    }
  }

    return (
      <div
        ref={combinedRef}
        className={cn(
          "inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground",
          className
        )}
        role="tablist"
        onKeyDown={handleKeyDown}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        aria-orientation="horizontal"
      >
        {children}
      </div>
    )
  }
)

TabsList.displayName = "TabsList"

interface TabsTriggerProps {
  value: string
  children: React.ReactNode
  className?: string
  disabled?: boolean
}

export function TabsTrigger({ value, children, className, disabled }: TabsTriggerProps) {
  const context = React.useContext(TabsContext)
  if (!context) {
    throw new Error("TabsTrigger must be used within Tabs")
  }

  const isActive = context.value === value
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    
    // Enter or Space activates the tab
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      context.onValueChange(value)
    }
  }

  React.useEffect(() => {
    // Update tabIndex when active state changes
    if (buttonRef.current) {
      buttonRef.current.tabIndex = isActive ? 0 : -1
    }
  }, [isActive])

  return (
    <button
      ref={buttonRef}
      type="button"
      role="tab"
      aria-selected={isActive}
      disabled={disabled}
      onClick={() => !disabled && context.onValueChange(value)}
      onKeyDown={handleKeyDown}
      tabIndex={isActive ? 0 : -1}
      id={`${value}-tab`}
      aria-controls={`${value}-panel`}
      data-value={value}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        isActive
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-background/50",
        className
      )}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  value: string
  children: React.ReactNode
  className?: string
  onTouchStart?: (e: React.TouchEvent) => void
  onTouchMove?: (e: React.TouchEvent) => void
  onTouchEnd?: (e: React.TouchEvent) => void
}

export const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, children, className, onTouchStart, onTouchMove, onTouchEnd }, ref) => {
    const context = React.useContext(TabsContext)
    if (!context) {
      throw new Error("TabsContent must be used within Tabs")
    }

    if (context.value !== value) {
      return null
    }

    return (
      <div
        ref={ref}
        role="tabpanel"
        id={`${value}-panel`}
        aria-labelledby={`${value}-tab`}
        tabIndex={0}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={cn(
          "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          className
        )}
      >
        {children}
      </div>
    )
  }
)

TabsContent.displayName = "TabsContent"

