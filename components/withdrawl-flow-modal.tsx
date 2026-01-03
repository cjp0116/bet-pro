"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Loader2, ArrowRight, AlertTriangle, Clock } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface WithdrawalFlowModalProps {
  isOpen: boolean
  onClose: () => void
  amount: string
  account: string
  method: string
  fee: string
  netAmount: string
  onSuccess: () => void
}

type FlowStep = "confirm" | "verify" | "processing" | "success" | "error"

export function WithdrawalFlowModal({
  isOpen,
  onClose,
  amount,
  account,
  method,
  fee,
  netAmount,
  onSuccess,
}: WithdrawalFlowModalProps) {
  const [step, setStep] = useState<FlowStep>("confirm")
  const [errorMessage, setErrorMessage] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const correctCode = "123456" // In real app, this would be sent to user's email/phone

  const handleConfirm = () => {
    setStep("verify")
  }

  const handleVerify = async () => {
    if (verificationCode !== correctCode) {
      setErrorMessage("Invalid verification code. Please try again.")
      return
    }

    setStep("processing")
    setErrorMessage("")

    // Simulate API call
    try {
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // Simulate 5% chance of failure for demo
          Math.random() > 0.05 ? resolve(true) : reject(new Error("Insufficient funds available for withdrawal"))
        }, 2500)
      })

      setStep("success")
      setTimeout(() => {
        onSuccess()
        handleClose()
      }, 3000)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Withdrawal failed. Please try again.")
      setStep("error")
    }
  }

  const handleClose = () => {
    if (step !== "processing") {
      setStep("confirm")
      setErrorMessage("")
      setVerificationCode("")
      onClose()
    }
  }

  const handleRetry = () => {
    setStep("confirm")
    setErrorMessage("")
    setVerificationCode("")
  }

  const estimatedTime =
    method === "Credit/Debit Card"
      ? "1-3 business days"
      : method === "PayPal"
        ? "1-2 business days"
        : "3-5 business days"

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle>Confirm Withdrawal</DialogTitle>
              <DialogDescription>Review your withdrawal details before proceeding</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <Alert>
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  Estimated processing time: <span className="font-semibold">{estimatedTime}</span>
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <span className="text-sm text-muted-foreground">Withdrawal Amount</span>
                  <span className="text-lg font-bold">${amount}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <span className="text-sm text-muted-foreground">To Account</span>
                  <span className="font-semibold text-sm">{account}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <span className="text-sm text-muted-foreground">Processing Fee</span>
                  <span className="font-semibold">{fee}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-base font-semibold">You'll Receive</span>
                  <span className="text-xl font-bold text-primary">${netAmount}</span>
                </div>
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Withdrawals are typically processed within the timeframe shown. You'll receive a confirmation email
                  once processed.
                </AlertDescription>
              </Alert>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1 bg-transparent">
                Cancel
              </Button>
              <Button onClick={handleConfirm} className="flex-1">
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </>
        )}

        {step === "verify" && (
          <>
            <DialogHeader>
              <DialogTitle>Verify Withdrawal</DialogTitle>
              <DialogDescription>Enter the verification code sent to your email</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground mb-2">For demo purposes, use code:</p>
                <p className="text-2xl font-mono font-bold">123456</p>
              </div>

              <div className="space-y-2">
                <input
                  type="text"
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full px-4 py-3 text-center text-2xl font-mono tracking-widest border-2 border-border rounded-lg focus:border-primary focus:outline-none"
                />
              </div>

              {errorMessage && (
                <Alert variant="destructive">
                  <AlertDescription className="text-sm">{errorMessage}</AlertDescription>
                </Alert>
              )}

              <Button variant="link" size="sm" className="w-full" onClick={() => alert("Code resent! (In real app)")}>
                Didn't receive code? Resend
              </Button>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("confirm")} className="flex-1">
                Back
              </Button>
              <Button onClick={handleVerify} disabled={verificationCode.length !== 6} className="flex-1">
                Verify & Withdraw
              </Button>
            </div>
          </>
        )}

        {step === "processing" && (
          <div className="py-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-8 w-8 rounded-full bg-primary/20" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Processing Withdrawal...</h3>
                <p className="text-sm text-muted-foreground">Securely processing your request</p>
                <p className="text-xs text-muted-foreground">Please do not close this window</p>
              </div>
            </div>
          </div>
        )}

        {step === "success" && (
          <div className="py-8">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="h-10 w-10 text-green-600" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Withdrawal Requested!</h3>
                <p className="text-sm text-muted-foreground">${netAmount} will be sent to your account</p>
                <p className="text-xs text-muted-foreground mt-2">Expected arrival: {estimatedTime}</p>
              </div>
            </div>
          </div>
        )}

        {step === "error" && (
          <>
            <div className="py-6">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
                    <XCircle className="h-10 w-10 text-red-600" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-lg font-semibold">Withdrawal Failed</h3>
                  <p className="text-sm text-muted-foreground">{errorMessage}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1 bg-transparent">
                Close
              </Button>
              <Button onClick={handleRetry} className="flex-1">
                Try Again
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
