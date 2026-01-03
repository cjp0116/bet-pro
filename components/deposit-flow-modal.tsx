"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle, Loader2, ArrowRight, ShieldCheck } from "lucide-react"

interface DepositFlowModalProps {
  isOpen: boolean
  onClose: () => void
  amount: string
  method: string
  onSuccess: () => void
}

type FlowStep = "confirm" | "processing" | "success" | "error"

export function DepositFlowModal({ isOpen, onClose, amount, method, onSuccess }: DepositFlowModalProps) {
  const [step, setStep] = useState<FlowStep>("confirm")
  const [errorMessage, setErrorMessage] = useState("")

  const handleConfirm = async () => {
    setStep("processing")
    setErrorMessage("")

    // Simulate API call
    try {
      await new Promise((resolve, reject) => {
        setTimeout(() => {
          // Simulate 10% chance of failure for demo
          Math.random() > 0.1 ? resolve(true) : reject(new Error("Payment declined by bank"))
        }, 2500)
      })

      setStep("success")
      setTimeout(() => {
        onSuccess()
        handleClose()
      }, 2000)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Transaction failed. Please try again.")
      setStep("error")
    }
  }

  const handleClose = () => {
    if (step !== "processing") {
      setStep("confirm")
      setErrorMessage("")
      onClose()
    }
  }

  const handleRetry = () => {
    setStep("confirm")
    setErrorMessage("")
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === "confirm" && (
          <>
            <DialogHeader>
              <DialogTitle>Confirm Deposit</DialogTitle>
              <DialogDescription>Review your deposit details before proceeding</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <span className="text-sm text-muted-foreground">Deposit Amount</span>
                  <span className="text-lg font-bold">${amount}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <span className="text-sm text-muted-foreground">Payment Method</span>
                  <span className="font-semibold">{method}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-border">
                  <span className="text-sm text-muted-foreground">Processing Fee</span>
                  <span className="font-semibold text-green-600">Free</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-base font-semibold">You'll Receive</span>
                  <span className="text-xl font-bold text-primary">${amount}</span>
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3">
                <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Your payment information is encrypted and secure. This transaction will appear on your statement.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleClose} className="flex-1 bg-transparent">
                Cancel
              </Button>
              <Button onClick={handleConfirm} className="flex-1">
                Confirm Deposit
                <ArrowRight className="ml-2 h-4 w-4" />
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
                <h3 className="text-lg font-semibold">Processing Deposit...</h3>
                <p className="text-sm text-muted-foreground">Please wait while we process your payment</p>
                <p className="text-xs text-muted-foreground">This may take a few seconds</p>
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
                <h3 className="text-lg font-semibold">Deposit Successful!</h3>
                <p className="text-sm text-muted-foreground">${amount} has been added to your account</p>
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
                  <h3 className="text-lg font-semibold">Deposit Failed</h3>
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
