'use client'

import { useState, useCallback, useRef, useEffect } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Shield } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { AlertTriangle } from "lucide-react"
// Types and constants for responsible gaming
interface DepositLimits {
  daily: string
  weekly: string
  monthly: string
  sessionTime: string
}

interface LimitErrors {
  daily?: string
  weekly?: string
  monthly?: string
  sessionTime?: string
  general?: string
}

const MIN_LIMIT = 0
const MAX_LIMIT = 100000
const MIN_SESSION = 1
const MAX_SESSION = 24

export const ResponsibleGamingSettingsCard = () => {
  // Form state
  const [limits, setLimits] = useState<DepositLimits>({
    daily: '',
    weekly: '',
    monthly: '',
    sessionTime: '',
  })
  const [errors, setErrors] = useState<LimitErrors>({})
  const [isSaving, setIsSaving] = useState(false)

  // Dialog states
  const [breakDialogOpen, setBreakDialogOpen] = useState(false)
  const [excludeDialogOpen, setExcludeDialogOpen] = useState(false)

  // Refs for focus management
  const breakConfirmRef = useRef<HTMLButtonElement>(null)
  const excludeConfirmRef = useRef<HTMLButtonElement>(null)

  // Focus confirm button when dialogs open
  useEffect(() => {
    if (breakDialogOpen) {
      setTimeout(() => breakConfirmRef.current?.focus(), 0)
    }
  }, [breakDialogOpen])

  useEffect(() => {
    if (excludeDialogOpen) {
      setTimeout(() => excludeConfirmRef.current?.focus(), 0)
    }
  }, [excludeDialogOpen])

  // Validation logic
  const validateLimits = useCallback((newLimits: DepositLimits): LimitErrors => {
    const newErrors: LimitErrors = {}
    const daily = newLimits.daily ? parseFloat(newLimits.daily) : null
    const weekly = newLimits.weekly ? parseFloat(newLimits.weekly) : null
    const monthly = newLimits.monthly ? parseFloat(newLimits.monthly) : null
    const session = newLimits.sessionTime ? parseFloat(newLimits.sessionTime) : null

    // Validate individual bounds
    if (daily !== null) {
      if (isNaN(daily) || daily < MIN_LIMIT) {
        newErrors.daily = `Must be at least $${MIN_LIMIT}`
      } else if (daily > MAX_LIMIT) {
        newErrors.daily = `Cannot exceed $${MAX_LIMIT.toLocaleString()}`
      }
    }

    if (weekly !== null) {
      if (isNaN(weekly) || weekly < MIN_LIMIT) {
        newErrors.weekly = `Must be at least $${MIN_LIMIT}`
      } else if (weekly > MAX_LIMIT) {
        newErrors.weekly = `Cannot exceed $${MAX_LIMIT.toLocaleString()}`
      }
    }

    if (monthly !== null) {
      if (isNaN(monthly) || monthly < MIN_LIMIT) {
        newErrors.monthly = `Must be at least $${MIN_LIMIT}`
      } else if (monthly > MAX_LIMIT) {
        newErrors.monthly = `Cannot exceed $${MAX_LIMIT.toLocaleString()}`
      }
    }

    if (session !== null) {
      if (isNaN(session) || session < MIN_SESSION) {
        newErrors.sessionTime = `Must be at least ${MIN_SESSION} hour${(MIN_SESSION as number) === 1 ? '' : 's'}`
      } else if (session > MAX_SESSION) {
        newErrors.sessionTime = `Cannot exceed ${MAX_SESSION} hours`
      }
    }

    // Validate relationships: daily ≤ weekly ≤ monthly
    if (daily !== null && weekly !== null && !isNaN(daily) && !isNaN(weekly)) {
      if (daily > weekly) {
        newErrors.daily = newErrors.daily || 'Daily limit cannot exceed weekly limit'
        newErrors.weekly = newErrors.weekly || 'Weekly limit must be ≥ daily limit'
      }
    }

    if (weekly !== null && monthly !== null && !isNaN(weekly) && !isNaN(monthly)) {
      if (weekly > monthly) {
        newErrors.weekly = newErrors.weekly || 'Weekly limit cannot exceed monthly limit'
        newErrors.monthly = newErrors.monthly || 'Monthly limit must be ≥ weekly limit'
      }
    }

    if (daily !== null && monthly !== null && !isNaN(daily) && !isNaN(monthly)) {
      if (daily > monthly) {
        newErrors.daily = newErrors.daily || 'Daily limit cannot exceed monthly limit'
      }
    }

    return newErrors
  }, [])

  // Handle input changes with validation
  const handleLimitChange = useCallback((field: keyof DepositLimits, value: string) => {
    const newLimits = { ...limits, [field]: value }
    setLimits(newLimits)
    setErrors(validateLimits(newLimits))
  }, [limits, validateLimits])

  // Check if form is valid
  const hasErrors = Object.keys(errors).length > 0

  // Save handler
  const handleSaveLimits = async () => {
    const validationErrors = validateLimits(limits)
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setIsSaving(true)
    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 500))
      // Success feedback would go here
    } finally {
      setIsSaving(false)
    }
  }

  // Break confirmation handler
  const handleConfirmBreak = async () => {
    setBreakDialogOpen(false)
    // API call to activate 24-hour break
    console.log('24-hour break activated')
  }

  // Self-exclusion confirmation handler
  const handleConfirmExclude = async () => {
    setExcludeDialogOpen(false)
    // API call to activate self-exclusion
    console.log('30-day self-exclusion activated')
  }

  // Error message component for accessibility
  const ErrorMessage = ({ id, message }: { id: string; message?: string }) => {
    if (!message) return null
    return (
      <p
        id={id}
        role="alert"
        aria-live="polite"
        className="text-sm text-destructive mt-1 flex items-center gap-1"
      >
        <AlertTriangle className="h-3 w-3" aria-hidden="true" />
        {message}
      </p>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>Responsible Gaming</CardTitle>
          </div>
          <CardDescription>Set limits to help manage your betting activity</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dailyLimit">Daily Deposit Limit</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">$</span>
              <Input
                id="dailyLimit"
                type="number"
                placeholder="1000"
                className={`pl-7 ${errors.daily ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                value={limits.daily}
                onChange={(e) => handleLimitChange('daily', e.target.value)}
                min={MIN_LIMIT}
                max={MAX_LIMIT}
                step={100}
                aria-describedby={errors.daily ? 'dailyLimit-error' : undefined}
                aria-invalid={!!errors.daily}
              />
            </div>
            <ErrorMessage id="dailyLimit-error" message={errors.daily} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="weeklyLimit">Weekly Deposit Limit</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">$</span>
              <Input
                id="weeklyLimit"
                type="number"
                placeholder="5000"
                className={`pl-7 ${errors.weekly ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                value={limits.weekly}
                onChange={(e) => handleLimitChange('weekly', e.target.value)}
                min={MIN_LIMIT}
                max={MAX_LIMIT}
                step={100}
                aria-describedby={errors.weekly ? 'weeklyLimit-error' : undefined}
                aria-invalid={!!errors.weekly}
              />
            </div>
            <ErrorMessage id="weeklyLimit-error" message={errors.weekly} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthlyLimit">Monthly Deposit Limit</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">$</span>
              <Input
                id="monthlyLimit"
                type="number"
                placeholder="10000"
                className={`pl-7 ${errors.monthly ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                value={limits.monthly}
                onChange={(e) => handleLimitChange('monthly', e.target.value)}
                min={MIN_LIMIT}
                max={MAX_LIMIT}
                step={100}
                aria-describedby={errors.monthly ? 'monthlyLimit-error' : undefined}
                aria-invalid={!!errors.monthly}
              />
            </div>
            <ErrorMessage id="monthlyLimit-error" message={errors.monthly} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sessionTime">Session Time Limit (hours)</Label>
            <Input
              id="sessionTime"
              type="number"
              placeholder="4"
              min={MIN_SESSION}
              max={MAX_SESSION}
              step={1}
              value={limits.sessionTime}
              onChange={(e) => handleLimitChange('sessionTime', e.target.value)}
              className={errors.sessionTime ? 'border-destructive focus-visible:ring-destructive' : ''}
              aria-describedby={errors.sessionTime ? 'sessionTime-error' : undefined}
              aria-invalid={!!errors.sessionTime}
            />
            <ErrorMessage id="sessionTime-error" message={errors.sessionTime} />
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={handleSaveLimits}
            disabled={hasErrors || isSaving}
            aria-disabled={hasErrors || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Limits'}
          </Button>

          <Separator />

          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full bg-transparent"
              onClick={() => setBreakDialogOpen(true)}
              aria-haspopup="dialog"
            >
              Take a Break (24 hours)
            </Button>
            <Button
              variant="outline"
              className="w-full bg-transparent text-destructive hover:text-destructive"
              onClick={() => setExcludeDialogOpen(true)}
              aria-haspopup="dialog"
            >
              Self-Exclude (30 days)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Take a Break Confirmation Dialog */}
      <Dialog open={breakDialogOpen} onOpenChange={setBreakDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Take a 24-Hour Break?</DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-2">
                <div>You are about to activate a 24-hour cooling-off period.</div>
                <div className="font-medium">During this time you will:</div>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Not be able to place any bets</li>
                  <li>Not be able to make deposits</li>
                  <li>Still have access to view your account and withdraw funds</li>
                </ul>
                <p className="text-sm mt-2">This break cannot be cancelled once activated.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setBreakDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              ref={breakConfirmRef}
              onClick={handleConfirmBreak}
              className="bg-primary"
            >
              Confirm 24-Hour Break
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Self-Exclusion Confirmation Dialog */}
      <Dialog open={excludeDialogOpen} onOpenChange={setExcludeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
              Self-Exclude for 30 Days?
            </DialogTitle>
            <DialogDescription asChild>
              <div className="space-y-3">
                <div className="font-semibold text-destructive">
                  ⚠️ This action is IRREVERSIBLE for the full 30-day period.
                </div>
                <div>You are about to activate a 30-day self-exclusion period.</div>
                <div
                  className="font-medium">During this time you will:</div>
                <ul className="list-disc list-inside text-sm space-y-1">
                  <li>Be completely locked out of your account</li>
                  <li>Not be able to place any bets</li>
                  <li>Not be able to make deposits or withdrawals</li>
                  <li>Not be able to create a new account</li>
                </ul>
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 mt-2">
                  <p className="text-sm font-medium text-destructive">
                    This exclusion cannot be reversed or shortened under any circumstances.
                    Please ensure you understand the consequences before proceeding.
                  </p>
                </div>
                <p className="text-sm">
                  If you need support, please contact our responsible gaming helpline or visit{' '}
                  <a href="https://www.ncpgambling.org" target="_blank" rel="noopener noreferrer" className="underline">
                    ncpgambling.org
                  </a>
                </p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setExcludeDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              ref={excludeConfirmRef}
              variant="destructive"
              onClick={handleConfirmExclude}
            >
              I Understand, Self-Exclude for 30 Days
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}